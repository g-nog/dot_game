# Constellations implementation and verification

2026-09-05. Implements the [accepted plan](../plans/2026-09-05-constellation-pvp.md) and the requested Three.js presentation. This is an implementation and exploratory verification record, not a claim of statistically established balance or physical-device testing.

## Delivered pages and boundaries

| Page | Behavior |
| --- | --- |
| `/index.html` | Static two-card gallery, generated previews, descriptions, ordinary Play links. No game controller or save inspection. |
| `/triangle-duel/index.html` | Existing Triangle Duel screen, rules, dice, recovery envelope and `triangle-duel:resumable-match` key, results, rematches and diagnostics; adds a menu link. |
| `/constellations/index.html` | Independent in-memory controller, setup, full local match, targets, relocation, claim selection, handoff, results and four-matchup rematches. Reload returns to setup. |

Vite emits all three HTML files. Browser journeys exercise production output and direct page refresh. No router, cross-game session manager, constellation storage, deployment or publishing was added. Minimal shared geometry types were extracted into `src/geometry/model.ts`; exact predicates and legality behavior remain unchanged.

## Requirement audit

| Requirement | Current implementation and evidence |
| --- | --- |
| Exact six-pattern roster, distinct vertices, non-induced matching | `src/domain/constellation/patterns.ts` and `matching.ts`; all six match unit fixtures, extra branches are accepted, vertex reuse is rejected. Matching takes graph edges only, so angles, orientation, length and enclosed stars cannot affect it. |
| Ownership, reservations, every alternative in stable order | `selectors.ts` filters owned unreserved edges; `matching.ts` deduplicates sorted edge-ID sets and returns all choices. Unit tests cover exclusions, symmetry and alternatives; browser test selects the second of two choices. |
| Versioned, feasible fixed map | Meridian v1, 24 safe integer stars with minimum logical separation 100, in `src/maps/constellation.ts`. Exhaustive map tests reject collinear triples and verify spacing. Both entire sequences are interleaved legally, with disjoint claimed edges. |
| Authoritative match state and atomic commands | `model.ts` stores map, coordinates, players, immutable connection IDs, ownership, completion mappings, turns, sequence assignment, anchor, cycle and phase. Current indices are derived from authoritative completion records. `state-machine.ts` returns the original object for invalid commands. |
| Draw, relocate both endpoints, cancel for free | Domain and browser tests check identity-preserving invalid/no-op relocation, opponent rejection, completed-edge immutability, both-endpoint relocation, and cancellation. The removed edge is excluded only during validation; commitment produces a fresh immutable ID. |
| Turn entry, forced passes and prepared targets | Deterministic saturated line and planar K4 fixtures prove forced-pass turn consumption, explicit handoff, automatic completion, ambiguous selection and blocked-board comparison order. |
| One completion per turn, no cascade | A prepared next-target fixture scores only on the next owner turn after an action. Selection is explicit domain state, independent of visual timers. |
| Three wins, 20 turns each, draws, terminal precedence | Full-match fixtures and browser journeys; final-turn ambiguous claim resolves before totals; first-to-three wins even when the action is the last allowed turn. |
| Four anchored rematches | Unit and browser runs cover all four assignments, with names/colors retained and scores reset. Both opening random choices are independent. |
| Invariants across command sequences | Seeded bounded properties verify every connection's geometry, uniqueness, reservation ownership and immutability, score bounds and turn limits. |
| Board input and endpoint guidance | Pointer capture, drag preview, two-tap/keyboard input, legal endpoint rings, invalid release and cancellation. Mobile touch taps tested in Chromium and WebKit. Hit selection uses a 24 CSS-pixel radius and nearest star; logical coordinates remain unchanged. |
| Public sequences, scores, player identities, turns | Both full sequences show current/completed/later states, totals and turns. Mobile also displays both current targets and scores directly above the board. |
| Completion selection and explicit handoff | Every candidate can be previewed with Previous/Next and claimed. Highlighted connections correspond to the selected edge IDs. End turn is unavailable during selection. The action notice remains until acknowledged. |
| Rules, result and state isolation | Rules include actual pattern diagrams and structural matching, blocking, shared stars, relocation, limits and rematches. Browser storage journey preserves a real Triangle Duel save while starting/reloading Constellations. |
| Three.js celestial presentation | `StarScene.ts`: orthographic luminous stars, crisp colored ribbons, reserved rings, layered starlight and restrained animation. Three.js loads only after a match opens. SVG remains the input and fallback layer. |
| All six completion motifs | `StarMap.svelte` uses each actual injective matched-star mapping for adaptive rays and star ornaments, with coherent Thread, Crown, Halo, Beacon, Kite and Lantern emblems. Brief reveal fades away; reserved edges keep thicker strokes, glow and midpoint diamonds. |
| Reduced motion, readability and graceful fallback | Decorative animation stops under reduced motion. A no-WebGL browser test still draws successfully. Desktop and 360-pixel mobile screenshots reviewed; small-screen labels enlarged and future targets retain readable contrast. Physical devices remain outstanding. |
| Preserve Triangle Duel | Existing unit/component checks and all original browser journeys pass on the separate page. Its persistence, recovery and rematch tests remain intact. The zero-duration assertion now accepts `0s` as well as `0ms`, which production CSS minification normalizes. |

## Fixed-map example routes

Star labels are the on-board numbers (`s1` in source is 01 in the atlas). Alternate one edge from A and one from B in the following order; the starting sequence gets the first action. Claim and End turn normally.

| Stage | A | B |
| --- | --- | --- |
| 3 edges | 01–02, 02–03, 03–09 | 05–04, 05–06, 05–11 |
| 4 edges | 07–08, 08–14, 14–13, 13–07 | 10–11, 11–17, 17–10, 17–16 |
| 5 edges | 14–15, 15–21, 21–20, 20–19, 19–14 | 17–18, 18–24, 24–23, 23–17, 23–22 |

These routes coexist on one occupied board, and their claimed edges are disjoint. Stars may be reused. Both complete their targets on turns 3, 7 and 12 if allowed to continue; the starting player wins on turn 12 before the opponent's final action. Four browser rematches exercise this race for every starter/assignment combination. This result establishes feasibility, not first-player balance across real strategies.

## Blocking and recovery review

**A provable one-turn delay:** Run the first six A edges above. Run the first five B edges, then let B take 13–07 on its sixth turn instead of advancing its own target. A's missing Crown edge is now owned by B. The test enumerates every legal A draw and verifies none completes the Crown. A can relocate its unfinished 14–13 to 14–19, let B draw 17–10, then draw 19–07. A completes the Crown on turn 8 instead of turn 7. The blocking edge remains inside the completed loop and is not frozen or stolen. This demonstrates a paid blocking action with a measurable delay and a legal recovery path.

**Crossing-based route interference:** B's 02–07 blocks a planned 01–08 connection geometrically. Early path targets can often use another branch immediately, so this is not a proof of a forced scoring delay. The four-matchup exploratory traces deliberately exercise relocation after that block; they should not be mistaken for optimal play.

[Complete local traces](constellation-traces.json) record sequence, action, endpoint pair, blocking-only flag, running total, completion turn and outcome for each action. They are reproduced by:

```sh
CONSTELLATION_TRACE_PATH=docs/playtests/constellation-traces.json npx vitest run tests/constellation-playtest.test.ts
```

| Matchup relative to opening player | Starting sequence | Sequence A completion turns | Sequence B completion turns | Outcome |
| --- | --- | --- | --- | --- |
| A / starts | A | 4, 8, 13 | 4, 8 | Opening player wins 3–2 |
| B / second | A | 4, 8, 13 | 4, 8 | Other player wins 3–2 |
| B / starts | B | 4, 8 | 4, 8, 13 | Opening player wins 3–2 |
| A / second | B | 4, 8 | 4, 8, 13 | Other player wins 3–2 |

Each exploratory match contains one blocking-only action and one relocation, with zero forced passes; saturated-board tests cover forced passes separately. These are scripted local playthroughs, not observations from two independent human players. The policies deliberately spend equal extra actions, so their starter wins cannot estimate first-move advantage. No rule ambiguity appeared in these traces. No rule or roster change was made on the strength of these limited observations.

Tactical reading: public structures expose loop threats clearly, and the forced-delay example shows why a blocker may be worth a turn. Relocation preserves options but requires reconsidering the whole graph. Shared boundary stars and playable loop interiors prevent territorial lockout. Whether this feels intuitive or enjoyable, whether early blocking is worthwhile, and whether either sequence dominates still need unscripted human matches. Additional players and physical iPhone/Android checks were unavailable in this environment; no such evidence is claimed.

## Verification results

Node **24.20.0** was installed in `/tmp/constellation-toolchain` for this run because the shell default was Node 25. The standard package engine constraint remains Node 24.

| Command | Result |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass |
| `npm run check` | Pass, zero Svelte errors/warnings |
| `npm test` | Pass, 54 tests across 11 files |
| `npm run build` | Pass; all three HTML entries emitted |
| `npm run test:e2e -- --workers=2` | Pass, 36 journeys across Chromium desktop, Chromium 360 × 640, and WebKit iPhone emulation |
| `npx vitest bench --run tests/performance/constellation.bench.ts` | Pass, 52-connection crowded legal fixture |

The browser suite uses the production preview. A development-server reload interrupted an early exploratory run; the completed production run is the result above. WebKit initially could not launch because Linux dependencies were missing and sudo requires a password. Downloaded Ubuntu libraries were extracted into `/tmp`, and `PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH=/tmp/constellation-webkit/run-webkit.sh` selected a wrapper that loads those libraries and the existing Playwright WebKit binary. System libraries were not modified. A normal machine/CI runner can use `npx playwright install --with-deps chromium webkit`.

Crowded fixture measurements (desktop execution, not phone timings): all six patterns on one owner's edges averaged **0.7333 ms**, max **1.2543 ms**. Complete draw and genuine-relocation enumeration for both players averaged **32.6085 ms**, max **43.0320 ms**. The fixture has 52 mutually legal connections with alternating owners. This benchmark is independent of Triangle Duel's quota search. No speculative optimization was applied.

The lazy Three.js scene chunk is about 520 kB minified / 130 kB gzip and triggers Vite's advisory 500 kB chunk warning. Gallery and setup do not instantiate it; opening a constellation match loads it. This is a performance follow-up for real mobile profiling, not a failed build.

## Visual artifacts

Generated backgrounds and exact built-in imagegen prompts are recorded in [imagegen-assets.md](imagegen-assets.md).

- [Gallery](screenshots/gallery.png)
- [Constellation setup](screenshots/setup.png)
- [Occupied Three.js board, desktop](screenshots/match-desktop.png)
- [Occupied board and public targets, 360-pixel mobile](screenshots/match-mobile.png)

Remaining review limits are human balance assessment, physical-device touch/performance, and longer-term map tuning. Automated feasibility and browser emulation do not replace those observations. Deployment and publishing remain separate tasks.
