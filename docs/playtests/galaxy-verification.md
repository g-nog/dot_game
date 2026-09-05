# Galaxy Duel verification

Galaxy Duel is the only game and opens directly at `/`. The app retains its rules engine, Three.js star scene, SVG input and fallback, background selection, and existing saved-match format. The gallery and other game implementations have been removed.

## Automated coverage

- Unit tests cover geometry, generation, quotas, scoring, match transitions, persistence, and setup controls.
- Browser tests exercise the production build at `/`: setup, rules, drag/tap/keyboard controls, saved-match recovery, corrupt storage, final scoring, rematches, triangle claim illustrations, background selection, resizing, WebGL fallback, and context loss.
- Browser projects cover Chromium desktop/mobile and iPhone WebKit emulation.

Browser profiles do not replace physical-device performance measurements. Run the quality gates documented in the README for current results.
