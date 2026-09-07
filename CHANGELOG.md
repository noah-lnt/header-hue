# Changelog

## 0.3.0 — 2026-09-07

### Added

- `headerHue.intensity` setting (0–100, default 50) to control how strong the
  title bar color is. Set it in your user settings and it applies everywhere.
  Changes apply immediately, without reloading the window.

### Fixed

- Saturation and lightness are clamped before conversion, and channels are
  clamped to 0–255. At the extremes of the intensity range the accumulated
  jitter and tier offsets could otherwise push a channel past 255 and emit a
  malformed value such as `#106107104`.

## 0.2.0 — 2026-09-07

### Changed

- Title bar colors are now soft pastels instead of fully saturated ones. Colors
  are generated in HSL with a high, hue-compensated lightness, so the bar reads
  as a background rather than an accent.
- Colors are spread evenly around the hue circle. The previous version derived
  RGB straight from the hash, which over-represented magenta and rose and made
  many projects look alike.
- Project identity now uses hue *and* one of three lightness tiers. Hue alone
  collides often once you have many projects open.

### Fixed

- Title bar text is guaranteed to meet WCAG AA (4.5:1) against its own
  background, for both the active and inactive states. Text lightness is
  derived per color instead of being a fixed value that failed on light hues.
- The inactive title bar fades toward white instead of being darkened, which
  previously turned pastels muddy.
