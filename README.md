# HeaderHue

Automatically assigns a unique, consistent color to your VS Code title bar based on your project folder name. Instantly distinguish between workspaces at a glance, with no configuration required.

## How it works

1. Reads your workspace folder name
2. Generates a deterministic color from it (same folder = same color, always)
3. Applies it to the title bar — active and inactive states

Colors are spread evenly around the hue circle so neighboring projects stay
easy to tell apart, and identity uses both the hue and one of three brightness
tiers. By default the bar is a soft pastel; see Settings to make it bolder.

## Settings

| Setting | Default | Description |
|---|---|---|
| `headerHue.mode` | `pale` | `pale` for a soft, light title bar; `bright` for a deep saturated bar with white text. |
| `headerHue.intensity` | `50` | How strong the color is *within* the chosen mode, from `0` (softest) to `100` (strongest). |

Set them once in your user settings and they apply to every project. Changes
take effect immediately — no reload.

Title bar text always meets WCAG AA contrast. In `pale` mode the text is a deep
tint of the bar's own hue; in `bright` mode it is white, and backgrounds are
pinned to a constant perceived brightness so white stays readable on every hue.

Note that very low intensity in `pale` mode makes projects harder to tell apart,
since near-white tints leave little room for colors to differ.

## Installation

Search for **HeaderHue** in the VS Code Extensions panel, or install from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=NOLANSARL.headerhue).

## License

MIT
