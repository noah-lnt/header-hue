# Changelog

## 0.4.0 — 2026-09-07

First release since 0.1.0. Consolidates the 0.2.0 and 0.3.0 work, neither of
which was published.

### Added

- `headerHue.mode` setting: `pale` (default) for a soft, light title bar, or
  `bright` for a deep saturated bar with white text — close to the 0.1.0 look.
- `headerHue.intensity` setting (0–100, default 50) for how strong the color is
  within the chosen mode.

Both apply immediately, without reloading the window.

### Changed

- Title bar colors are generated in HSL and are soft pastels by default,
  reading as a background rather than an accent. 0.1.0 derived RGB straight
  from the folder-name hash, which produced dark, saturated colors clustered in
  magenta and rose.
- Colors are spread evenly around the hue circle, and project identity uses the
  hue *and* one of three brightness tiers. Hue alone collides often once you
  have many projects open.
- The inactive title bar now recedes in the direction of its own mode: pale
  fades toward white, bright darkens further.

### Fixed

- Title bar text is guaranteed to meet WCAG AA (4.5:1) against its own
  background, in both the active and inactive states, at every mode and
  intensity.
- In `bright` mode the background is pinned to a constant perceived brightness
  per hue, so white text stays readable on every color. Matching HSL lightness
  instead left luminous hues too bright and forced dark text on roughly half of
  projects.
- Saturation, lightness and the output channels are clamped, so extreme
  settings can no longer emit a malformed value such as `#106107104`.
