# HeaderHue

Automatically assigns a unique, consistent color to your VS Code title bar based on your project folder name. Instantly distinguish between workspaces at a glance, with zero configuration.

## How it works

1. Reads your workspace folder name
2. Generates a deterministic color from it (same folder = same color, always)
3. Applies it to the title bar — active and inactive states

Colors are soft pastels, spread evenly around the hue circle so neighbouring
projects stay easy to tell apart. Title bar text is always derived to meet
WCAG AA contrast against its own background.

## Settings

| Setting | Default | Description |
|---|---|---|
| `headerHue.intensity` | `50` | How strong the title bar color is, from `0` (barely tinted) to `100` (fully saturated). |

Set it once in your user settings and it applies to every project. Changes take
effect immediately — no reload.

Title bar text always meets WCAG AA contrast, whatever the intensity. Note that
very low values make projects harder to tell apart, since near-white tints leave
little room for colors to differ.

## Installation

Search for **HeaderHue** in the VS Code Extensions panel, or install from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=NOLANSARL.headerhue).

## License

MIT
