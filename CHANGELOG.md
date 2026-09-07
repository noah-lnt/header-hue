# Changelog

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
