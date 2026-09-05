# Galaxy Duel

An untimed local two-player strategy game played by connecting stars, with brief moments of dice-and-claim suspense.

## Language

**Galaxy Duel**:
The v1 local two-player mode in which die rolls set exact line quotas and completed triangular faces score points.

**Turn**:
A player's opportunity to roll the die and satisfy the resulting line quota.

**Line quota**:
The exact number of legal lines a player must draw during a turn.
_Avoid_: Moves, chances

**Compatible line sequence**:
A sequence of lines that can all be committed legally in order from the current dot field.

**Forfeited turn**:
A turn in which the player draws no lines because the full line quota cannot be satisfied.
_Avoid_: Lost turn

**Incomplete turn**:
A turn ended after committed lines make the remaining line quota impossible to satisfy.
_Avoid_: Early finish

**Dot field**:
The shared play area containing an irregular arrangement of dots separated from one another and the playfield edges.
_Avoid_: Grid, square board

**Legal line**:
A new straight connection between two endpoint dots whose interior neither intersects an existing line nor passes through another dot.

**Attributed line**:
A neutral line displayed in the color of the player who drew it.
_Avoid_: Owned line

**Player color**:
A distinct color chosen from a curated, colorblind-friendly palette to identify one player's lines and claims.
_Avoid_: Custom color

**Player name**:
An optional short display name that defaults to Player 1 or Player 2.

**Committed line**:
A line that becomes a permanent part of the dot field as soon as it is drawn.
_Avoid_: Draft line, candidate line

**Scoring triangle**:
A region bounded by exactly three lines between exactly three dots and containing no other lines or dots.
_Avoid_: Composite triangle, enclosing triangle

**Claimed triangle**:
A scoring triangle worth one point and awarded to the player who draws its final side.
_Avoid_: Owned triangle

**Closed triangle**:
A claimed triangle whose interior cannot receive any later line.

**Multi-claim**:
Two or more scoring triangles claimed by drawing one shared final side.

**Board exhaustion**:
The end of a match when no legal lines remain.
_Avoid_: Early victory, guaranteed win

**Draw**:
A match result in which both players have claimed the same number of triangles at board exhaustion.
_Avoid_: Tiebreak

**Starting player**:
The player randomly selected to take the first turn of an initial match.

**Head-to-head match**:
A match contested by exactly two players on one shared dot field.
_Avoid_: Multiplayer match

**Local match**:
A head-to-head match in which both players alternate turns on the same device.
_Avoid_: Online match

**Resumable match**:
An unfinished local match preserved on the device and offered for continuation after an interruption.
_Avoid_: Saved game

**Rematch**:
A new independent match with a fresh dot field and the previous match's other player starting.
_Avoid_: Series game

**Match size**:
A preset controlling the dot count and expected match duration.
_Avoid_: Difficulty

## Relationships

- A **Turn** produces exactly one **Line quota**
- The active player explicitly rolls, and the revealed die result begins the **Turn**
- An independent uniform roll of a standard six-sided die produces a **Line quota** from one through six
- Unequal cumulative roll totals are accepted in the first version and must be evaluated through playtesting
- A player must satisfy the entire **Line quota** or take a **Forfeited turn**
- A **Forfeited turn** passes after a three-second **End turn** countdown; the active player can finish sooner by pressing the button
- A turn may begin only when the dot field offers a **Compatible line sequence** satisfying the full **Line quota**
- A player may end an **Incomplete turn** only after their committed choices make the remaining quota impossible
- The game detects an **Incomplete turn**, explains that no compatible continuation remains, and starts the same **End turn** countdown
- Completing a **Line quota** starts the **End turn** countdown before control passes
- The countdown runs only while the active player can act; an online pause cancels it and resuming starts a fresh three seconds
- A match is played on one **Dot field** shared by both players
- A **Dot field** preserves the same dot positions and line geometry when the play area is resized or reoriented
- A **Head-to-head match** has exactly two players
- The first game version supports **Local matches** only
- **Local matches** are untimed in the first version
- An active **Local match** is preserved as a **Resumable match** after every revealed die result, committed line, and turn transition
- Returning players may continue a **Resumable match** after a refresh, tab closure, or browser interruption
- A device retains at most one **Resumable match**
- Starting a new match while a **Resumable match** exists requires confirmation and replaces the unfinished match
- The first version starts with real matches and has no guided practice turn
- Players may open a concise visual rules view from setup or during an active match instead of completing guided onboarding
- **Match size** offers initial presets of Quick (20 dots), Standard (30 dots), and Extended (40 dots)
- **Legal lines** may intersect only at shared endpoint dots; their interiors may not cross, touch, or overlap
- A dot may be the endpoint of any number of **Legal lines**
- A line passing through a third dot is not a **Legal line**
- After a player selects one endpoint, every currently legal second endpoint is revealed
- A player draws by dragging from one dot to a revealed endpoint; releasing on it commits a straight line
- Releasing anywhere else cancels the line preview without penalty or quota progress
- Endpoint guidance reflects current legality only and may include choices that prevent completion of the remaining **Line quota**
- The rolled **Line quota** and the number of committed lines toward it remain visible throughout the **Turn**
- An **Attributed line** records who drew it visually but is neutral for scoring
- The two players choose distinct **Player colors** before a match
- Each player may replace their default **Player name** during match setup
- Every drawn line is immediately a **Committed line** and cannot be undone
- Later lines in the same **Turn** may use earlier committed lines from that turn to complete a **Scoring triangle**
- A **Claimed triangle** belongs to the player who completes it, regardless of who drew its earlier sides
- A **Claimed triangle** is filled translucently with its claimant's color while its attributed sides retain their original colors
- Every **Claimed triangle** becomes a **Closed triangle** and cannot later be subdivided
- A **Closed triangle** may share boundary sides and corner dots with later scoring triangles outside its interior
- Every **Claimed triangle**, including each triangle in a **Multi-claim**, is detected and awarded automatically
- Only a **Scoring triangle** counts; a larger triangle composed of smaller enclosed regions does not
- A triangle containing any interior dot is not a **Scoring triangle**
- A triangle-shaped region with a multi-segment side is not a **Scoring triangle**
- Every **Scoring triangle** completed by a line is claimed, allowing a **Multi-claim**
- Every **Claimed triangle** is worth exactly one point regardless of size or shape
- Claiming triangles does not grant another **Turn**; play passes after the current **Line quota** is completed
- Both players' scores and the active player remain visible throughout the match
- A match ends at **Board exhaustion**, and the player with more **Claimed triangles** wins
- If a committed line causes **Board exhaustion**, resolve its claims and show the result without an **End turn** handoff
- Equal claimed-triangle totals at **Board exhaustion** produce a **Draw**
- The **Starting player** is selected randomly for an initial match and alternates on rematches
- A **Rematch** generates a fresh **Dot field** and does not contribute to a persistent series score
- At the result, **Rematch** preserves names, colors, and match size; **New setup** returns to editable options

## Example dialogue

> **Dev:** "If the player rolls four but only three legal lines remain, may they draw three?"
> **Domain expert:** "No. The line quota is exact, so the player takes a forfeited turn."
>
> **Dev:** "What if their third committed line makes a required fourth line impossible?"
> **Domain expert:** "The three lines remain and the incomplete turn ends."
>
> **Dev:** "Who claims a triangle whose first two sides were drawn by the opponent?"
> **Domain expert:** "The player who draws the final side claims it."

## Flagged ambiguities

- "The die result lets the player draw lines" was ambiguous about whether the result was a maximum or an exact requirement; resolved as an exact **Line quota**.
- "Random dots" does not mean unrestricted placement; resolved as an irregular **Dot field** with minimum dot spacing and an edge margin.
- Whether lines may cross was unresolved; any interior intersection, touch, or overlap is forbidden, while shared endpoints are allowed.
- "A line crosses a dot" means its segment passes through a non-endpoint dot; such a line is illegal.
- "Neutral line" does not mean visually anonymous; an **Attributed line** retains its drawer's color but either player may use it for scoring.
- "Triangle" was ambiguous when smaller regions form a larger triangle; only an unsubdivided **Scoring triangle** counts.
- A geometrically closed triangle containing an interior dot does not score and does not close that interior.
- A region that only appears triangular through collinear boundary segments does not score; a **Scoring triangle** has exactly three sides.
- Claimed regions cannot later become composite; a **Closed triangle** permanently excludes new interior lines.
- A line that completes multiple scoring triangles awards all of them as a **Multi-claim**.
- Claiming a triangle does not change turn order or grant an extra turn.
- "End the turn early" was ambiguous; it is allowed only for an **Incomplete turn**, not as a voluntary bypass of the exact line quota.
- Individually legal lines that cannot coexist do not satisfy a quota; turn eligibility requires a **Compatible line sequence**.
- "No chance for the other player to win" does not trigger an early result; the match continues until **Board exhaustion**.
- "Difficulty" was being used for dot count; resolved as **Match size**, because it primarily controls density and duration.
- Large differences in cumulative roll totals may dominate tactical play; accepted for the first prototype, with equal per-round rolls as the first balancing alternative to test.

## Presentation and persistence

Galaxy Duel opens directly at `/`. Three.js renders stars, connections, and triangle claims; SVG provides tap, drag, keyboard controls, and a playable fallback when WebGL is unavailable. Visual projection never changes logical coordinates or legality.

Existing saves retain the `galaxy:triangle-duel:resumable-match` storage key and schema. Background selection remains under `galaxy:background`.

## Online head-to-head matches

An **Online match** is a head-to-head match played by two guests on separate devices while both are connected. Local matches remain available.

- The host creates a private **Room** and shares its **Invite link**. The host chooses match size; each guest chooses their own name and a distinct curated color.
- A room reserves exactly two **Player seats**. A private browser-stored seat key allows a guest to reconnect without an account; the invite link never includes this key. Opening the same seat in another tab replaces its previous connection.
- The match starts when both guests have joined and are connected. Dice roll automatically at the start of a turn, matching the current local interface; the server generates the result.
- The server validates the active seat, board version, line legality, and all rule transitions. Browsers display confirmed state and cannot choose dice results or overwrite the board.
- A **Paused match** retains its board and accepts no gameplay actions while either guest is disconnected. The UI offers a two-minute reconnect grace period after detecting a disconnection. Afterward, the remaining guest may keep waiting or leave without a penalty; the server does not award a win or expire the match at the two-minute mark.
- Heartbeats detect a silently lost connection within approximately 45 seconds. Reconnecting guests receive the latest saved match rather than replaying unconfirmed actions.
- Leaving an online room while connected ends it for both guests. Leaving the page while disconnected stops reconnect attempts; the other guest can leave the paused room.
- A rematch requires both guests to agree, preserves their profiles and match size, creates a fresh dot field, and alternates the starting player.
- Rooms expire after 24 hours without an accepted gameplay transition (or 24 hours after creation for an unused lobby). This is cleanup, not asynchronous play support.
- Guest seats are recoverable only in the browser that retains their key. There are no accounts, public matchmaking, spectators, rankings, or persistent player history in this version.
