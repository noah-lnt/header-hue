import * as vscode from "vscode";
import * as path from "path";

// Two families. "pale" stays a light background across its whole range;
// "bright" is the deep, saturated bar the extension shipped originally.
// Intensity moves within the chosen family, it does not cross between them.
//
// The pale anchor at 50 is the 0.2.0 envelope and must stay exactly where it
// is: changing it would repaint every existing project on upgrade.
type Mode = "pale" | "bright";

const PALE_ANCHORS: Anchor[] = [
  { at: 0, saturation: 0.25, lightness: 0.86, tierSpread: 0.05 },
  { at: 50, saturation: 0.62, lightness: 0.79, tierSpread: 0.09 },
  { at: 100, saturation: 0.9, lightness: 0.72, tierSpread: 0.12 },
];

// Luminance targets for bright mode. White text needs the background below
// ~0.183 relative luminance to clear AA; the highest reachable value here is
// 0.128 * 1.24 = 0.159, leaving margin above the AA floor.
const BRIGHT_ANCHORS: BrightAnchor[] = [
  { at: 0, saturation: 0.5, luminance: 0.128 },
  { at: 50, saturation: 0.75, luminance: 0.105 },
  { at: 100, saturation: 0.95, luminance: 0.07 },
];

// Tiers shift the target luminance instead of the lightness, keeping the
// second identity axis without breaking the white-text guarantee.
const BRIGHT_TIER_FACTORS = [0.78, 1.0, 1.24];

const DEFAULT_MODE: Mode = "pale";
const DEFAULT_INTENSITY = 50;

// Lightness tiers add a second axis of identity. Hue alone gives 360 slots, and
// at ~100 projects that collides constantly; hue x tier makes near-misses rare.
const TIERS = 3;

const AA_CONTRAST = 4.6;

type Anchor = { at: number; saturation: number; lightness: number; tierSpread: number };
type BrightAnchor = { at: number; saturation: number; luminance: number };
type Envelope = { saturation: number; lightness: number; tierSpread: number };
type Palette = {
  background: string;
  foreground: string;
  inactiveBackground: string;
  inactiveForeground: string;
};

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

function spanFor<T extends { at: number }>(anchors: T[], intensity: number) {
  const t = Math.min(100, Math.max(0, intensity));
  const upperIndex = Math.max(
    1,
    anchors.findIndex((anchor) => anchor.at >= t)
  );
  const upper = anchors[upperIndex];
  const lower = anchors[upperIndex - 1];
  return { lower, upper, k: (t - lower.at) / (upper.at - lower.at) };
}

function envelopeFor(intensity: number): Envelope {
  const { lower, upper, k } = spanFor(PALE_ANCHORS, intensity);
  return {
    saturation: lerp(lower.saturation, upper.saturation, k),
    lightness: lerp(lower.lightness, upper.lightness, k),
    tierSpread: lerp(lower.tierSpread, upper.tierSpread, k),
  };
}

function hash32(str: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash >>> 0;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function hslToHex(hue: number, sat: number, light: number): string {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp01(sat);
  const l = clamp01(light);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] :
    [c, 0, x];
  const channel = (v: number) =>
    Math.min(255, Math.max(0, Math.round((v + m) * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  );
  return (lighter + 0.05) / (darker + 0.05);
}

// Darken the tinted text until it clears AA against its own background. At high
// intensity the background itself goes dark and no dark text can clear it, so
// fall back to searching upward for light text.
function readableText(hue: number, saturation: number, background: string): string {
  for (let l = 0.42; l >= 0.02; l -= 0.02) {
    const candidate = hslToHex(hue, saturation, l);
    if (contrastRatio(background, candidate) >= AA_CONTRAST) {
      return candidate;
    }
  }
  for (let l = 0.58; l <= 0.98; l += 0.02) {
    const candidate = hslToHex(hue, saturation * 0.25, l);
    if (contrastRatio(background, candidate) >= AA_CONTRAST) {
      return candidate;
    }
  }
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#000000")
    ? "#ffffff"
    : "#000000";
}

// Perceived lightness is not flat across the hue circle: yellows (~60deg) read
// almost white while blues/violets (~260deg) read heavier at the same L.
function hueLightnessOffset(hue: number): number {
  return Math.cos(((hue - 260) * Math.PI) / 180) * 0.045;
}

// Find the HSL lightness whose rendered color hits a target relative
// luminance for this hue. A green and a blue at the same lightness differ
// hugely in perceived brightness; matching luminance instead is what keeps
// every bright bar equally dark and readable under white text.
function lightnessForLuminance(hue: number, saturation: number, target: number): number {
  let best = 0.5;
  let bestError = Infinity;
  for (let l = 0.02; l <= 0.98; l += 0.005) {
    const error = Math.abs(relativeLuminance(hslToHex(hue, saturation, l)) - target);
    if (error < bestError) {
      bestError = error;
      best = l;
    }
  }
  return best;
}

function identityOf(name: string) {
  return {
    hue: hash32(name, 5381) % 360,
    jitter: hash32(name, 52711) % 100,
    tier: hash32(name, 99991) % TIERS,
  };
}

function palePalette(name: string, intensity: number): Palette {
  const envelope = envelopeFor(intensity);
  const { hue, jitter, tier } = identityOf(name);

  const saturation = envelope.saturation + (jitter / 100) * 0.12 - 0.06;
  const lightness =
    envelope.lightness +
    hueLightnessOffset(hue) +
    (tier - (TIERS - 1) / 2) * envelope.tierSpread;

  const background = hslToHex(hue, saturation, lightness);
  // Inactive fades toward white rather than darkening - dimming a pastel
  // turns it muddy.
  const inactiveBackground = hslToHex(
    hue,
    saturation * 0.5,
    Math.min(lightness + 0.06, 0.95)
  );

  return {
    background,
    inactiveBackground,
    foreground: readableText(hue, Math.min(saturation + 0.2, 0.6), background),
    inactiveForeground: readableText(
      hue,
      Math.min(saturation + 0.1, 0.5),
      inactiveBackground
    ),
  };
}

function brightPalette(name: string, intensity: number): Palette {
  const { lower, upper, k } = spanFor(BRIGHT_ANCHORS, intensity);
  const { hue, jitter, tier } = identityOf(name);

  const saturation = clamp01(
    lerp(lower.saturation, upper.saturation, k) + (jitter / 100) * 0.12 - 0.06
  );
  const luminance =
    lerp(lower.luminance, upper.luminance, k) * BRIGHT_TIER_FACTORS[tier];

  const background = hslToHex(
    hue,
    saturation,
    lightnessForLuminance(hue, saturation, luminance)
  );
  // Inactive recedes by going darker still; lightening a deep color would make
  // the unfocused window louder than the focused one.
  const inactiveBackground = hslToHex(
    hue,
    saturation * 0.5,
    lightnessForLuminance(hue, saturation * 0.5, luminance * 0.55)
  );

  return {
    background,
    inactiveBackground,
    foreground: "#ffffff",
    inactiveForeground: hslToHex(hue, 0.15, 0.82),
  };
}

function paletteFor(name: string, mode: Mode, intensity: number): Palette {
  return mode === "bright"
    ? brightPalette(name, intensity)
    : palePalette(name, intensity);
}

function applyColors() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return;
  }

  const settings = vscode.workspace.getConfiguration("headerHue");
  const mode = settings.get<Mode>("mode", DEFAULT_MODE);
  const intensity = settings.get<number>("intensity", DEFAULT_INTENSITY);

  const folderName = path.basename(folders[0].uri.fsPath);
  const palette = paletteFor(folderName, mode, intensity);

  const config = vscode.workspace.getConfiguration("workbench");
  const existing = config.get<Record<string, string>>("colorCustomizations") ?? {};

  config.update(
    "colorCustomizations",
    {
      ...existing,
      "titleBar.activeBackground": palette.background,
      "titleBar.activeForeground": palette.foreground,
      "titleBar.inactiveBackground": palette.inactiveBackground,
      "titleBar.inactiveForeground": palette.inactiveForeground,
    },
    vscode.ConfigurationTarget.Workspace
  );
}

export function activate(context: vscode.ExtensionContext) {
  applyColors();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("headerHue")) {
        applyColors();
      }
    })
  );
}

export function deactivate() {}
