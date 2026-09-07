import * as vscode from "vscode";
import * as path from "path";

// Pale envelope: high lightness keeps the title bar a background, not an accent.
// Chroma stays around half the original saturated palette — enough separation
// between projects without the bar competing with the editor.
const SATURATION = 0.62;
const LIGHTNESS = 0.79;

// Lightness tiers add a second axis of identity. Hue alone gives 360 slots, and
// at ~100 projects that collides constantly; hue x tier makes near-misses rare.
const TIERS = 3;
const TIER_SPREAD = 0.09;

const AA_CONTRAST = 4.6;

function hash32(str: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
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
    Math.round((v + m) * 255).toString(16).padStart(2, "0");
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

// Darken the tinted text until it clears AA against its own background, so
// readability holds for every hue instead of relying on one hand-picked value.
function readableText(hue: number, saturation: number, background: string): string {
  for (let l = 0.42; l >= 0.02; l -= 0.02) {
    const candidate = hslToHex(hue, saturation, l);
    if (contrastRatio(background, candidate) >= AA_CONTRAST) {
      return candidate;
    }
  }
  return "#000000";
}

// Perceived lightness is not flat across the hue circle: yellows (~60deg) read
// almost white while blues/violets (~260deg) read heavier at the same L.
function hueLightnessOffset(hue: number): number {
  return Math.cos(((hue - 260) * Math.PI) / 180) * 0.045;
}

function paletteFor(name: string) {
  const hue = hash32(name, 5381) % 360;
  const jitter = hash32(name, 52711) % 100;
  const tier = hash32(name, 99991) % TIERS;

  const saturation = SATURATION + (jitter / 100) * 0.12 - 0.06;
  const lightness =
    LIGHTNESS +
    hueLightnessOffset(hue) +
    (tier - (TIERS - 1) / 2) * TIER_SPREAD;

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

export function activate(context: vscode.ExtensionContext) {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return;
  }

  const folderName = path.basename(folders[0].uri.fsPath);
  const palette = paletteFor(folderName);

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

export function deactivate() {}
