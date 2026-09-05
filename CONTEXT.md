# Dot Game

A collection of approachable tactical games played by connecting dots, beginning with the untimed two-player Triangle Duel mode and its brief moments of dice-and-claim suspense.

## Language

**Triangle Duel**:
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
- A **Forfeited turn** passes only after the active player acknowledges **End turn**
- A turn may begin only when the dot field offers a **Compatible line sequence** satisfying the full **Line quota**
- A player may end an **Incomplete turn** only after their committed choices make the remaining quota impossible
- The game detects an **Incomplete turn**, explains that no compatible continuation remains, and requires **End turn** acknowledgment
- Completing a **Line quota** also requires **End turn** acknowledgment before control passes
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

## Game selection

### Language

**Game menu**:
The opening screen where players choose which game to play.

### Relationships

- The app opens on the **Game menu**, initially offering Triangle Duel and the constellation game as separate choices.
- Additional games may be added to the **Game menu** for experimentation and comparison.
- The **Game menu** is a gallery whose game cards show a name, short description, visual preview, and Play button.
- Each game keeps its own visual identity: Triangle Duel has a geometric preview, while the constellation game has a star-map preview and its own space theme.
- The constellation game is a separate game derived from Triangle Duel, not a replacement or alternate ruleset inside the original match.
- The **Game menu** may link to separate game pages; the games do not require a shared session lifecycle.
- The constellation game does not store sessions or offer saved-match continuation; its match lives only in the open page.
- Gallery cards offer Play without inspecting saved matches. Triangle Duel's existing recovery behavior remains specific to its own page.
- A future decision may retain only the user's preferred game; no existing game is selected for removal now.

### Example dialogue

> **Dev:** "Does the constellation game replace Triangle Duel as the default?"
> **Domain expert:** "No. Start with a menu so players can choose either game, and we can add more before deciding what to keep."

## Constellation mode

This section records the constellation rules implemented alongside Triangle Duel. Verification and exploratory balance findings are in `docs/playtests/constellation-verification.md`.

### Language

**Star map**:
The shared play area of stars that both players connect while competing to complete constellations.

**Constellation pattern**:
A predefined structure of connections between stars that serves as a visible building target, independent of angles, lengths, or orientation.
_Avoid_: Freeform scoring shape

**Target sequence**:
A player's ordered set of three constellation patterns, visible to both players from the start of the match.

**Prevention**:
Interference with an opponent's unfinished constellation that obstructs its completion.
_Avoid_: Stealing, destroying completed constellations

**Blocking connection**:
A drawn connection that prevents a desired later connection because the two would cross.

**Owned connection**:
A connection belonging exclusively to the player who drew it and usable only toward that player's constellations.

**Relocation**:
A player's full-turn action that replaces one of their own unfinished connections with a legal connection anywhere on the star map.

### Relationships

- Both players build toward constellations on one **Star map**.
- All playable stars and connections lie on one flat plane; the surrounding space scene may convey visual depth.
- Visual depth does not allow connections to pass above or below one another or change the noncrossing rule.
- Different **Star maps** provide distinct layouts and blocking opportunities while retaining the same PvP rules.
- The initial version starts with one **Star map** for playtesting; additional layouts follow once the core rules have been evaluated.
- The first **Star map** uses a fixed, deliberately designed star arrangement so repeated matches can test blocking and fairness consistently; randomly generated maps are deferred.
- A solo campaign is deferred beyond the initial constellation version.
- The first playable constellation version supports two players alternating turns on one shared device; online play is deferred.
- Players pursue predefined **Constellation patterns**, with target patterns visible to both players so opponents can anticipate completion.
- Each player pursues a different **Constellation pattern**; both players can see both targets.
- The two assigned **Constellation patterns** should have comparable completion difficulty.
- **Prevention** targets unfinished constellations; completed constellations remain secure.
- Building one's own constellation and obstructing an opponent should compete for turn actions.
- Drawn connections cannot cross; a **Blocking connection** can advance one player's target while obstructing the other's intended route.
- **Prevention** uses ordinary connection drawing, without a dedicated sabotage action in the initial design.
- A player may draw any legal connection solely to block an opponent, even when it advances none of their targets; it consumes their normal turn action.
- Connections drawn solely for blocking remain owned by their drawer and may later contribute to a target or be relocated while unfinished.
- A player may spend an entire turn on **Relocation** to seek another arrangement of stars for their **Constellation pattern**.
- **Relocation** must respect the noncrossing rule and cannot move an opponent's connection or a connection belonging to a completed constellation.
- **Relocation** may change both endpoints; all other connections stay in place, and replacement legality is evaluated with the original connection removed.
- Players alternate turns, taking exactly one action: draw one connection or perform one **Relocation**.
- After a draw or **Relocation** is committed and any completion choice is resolved, the player explicitly acknowledges End turn before control passes to the opponent.
- End turn confirms the shared-device handoff; the action is already committed and the acknowledgment is not an undo opportunity.
- Constellation mode uses no die roll or **Line quota**.
- A drawing matches a **Constellation pattern** by how its stars connect, with flexible angles, lengths, and orientation.
- Patterns with the same connection structure count as the same **Constellation pattern**, even when their illustrated silhouettes differ.
- Every drawn connection is an **Owned connection**; only a player's own connections count toward their constellation.
- Stars are shared: both players may draw connections from the same star.
- A connection between a given pair of stars can be drawn only once, so taking it denies that connection to the opponent.
- Each player has one active **Constellation pattern** at a time.
- Each player receives a **Target sequence** at the start; the two sequences should have comparable difficulty and preserve different active targets between opponents.
- The prototype uses two fixed **Target sequences** designed for the first **Star map**, rather than random target assignments.
- Both **Target sequences** progress through patterns requiring three, four, and five connections, respectively.
- Sequence A contains, in order: a three-connection chain through four stars, a four-star loop, and a five-star loop.
- Sequence B contains, in order: three spokes joining one central star to three other stars, a triangle with one additional connection from a triangle star to a fourth star, and a four-star loop with one additional connection from a loop star to a fifth star.
- These six pattern structures are the initial prototype roster; their names and balance remain subject to playtesting.
- Completing a sequence requires at least 12 drawing actions; equal connection counts are a starting constraint, not proof of equal placement difficulty.
- Constellation rematches automatically cycle through four matchups on the fixed map so each player tries each **Target sequence** both starting and going second.
- Relative to an opening matchup where the first player has sequence A and starts, the cycle is: first player A and starts; first player B and goes second; first player B and starts; first player A and goes second, then repeat.
- Only the current target in a **Target sequence** can score; later targets are visible for planning.
- Completing a constellation preserves it on the **Star map** and activates the next target in the player's **Target sequence**, unless that completion wins the match.
- The first player to complete three constellations wins; three is the initial threshold to evaluate through playtesting.
- If neither player completes three constellations, the match ends after both players have taken 20 turns; the player with more completed constellations wins, with equal totals producing a draw.
- The 20-turn allowance per player is an initial playtesting value; reaching three completions still ends the match immediately.
- A player with no legal draw or **Relocation** automatically passes, consuming one of their turns.
- If neither player has a legal action, continue forced passes in normal turn order, allowing at most one prepared active-target completion per turn.
- On a blocked board, stop when a player reaches three completions, the turn limit is reached, or neither player has a prepared active target left; reaching three wins immediately, otherwise compare completed totals and draw on equality.
- An obstructed target does not allow passing while a legal draw or **Relocation** remains available.
- Each **Owned connection** may count toward only one completed constellation; completion reserves its participating connections permanently.
- Stars in completed constellations remain available for new connections and later constellations.
- A player's unfinished connections elsewhere remain available toward later targets.
- A **Constellation pattern** may match within a larger drawing; extra connections at its stars do not invalidate the match.
- Completion reserves only the connections selected for the matching pattern; extra unfinished connections remain available.
- Loops may enclose other stars and connections without invalidating a **Constellation pattern**.
- Completing a loop does not claim its enclosed territory or freeze its contents; enclosed stars and unfinished connections remain playable under the ordinary ownership and noncrossing rules.
- A completed loop remains a crossing barrier: a connection cannot cross a boundary edge, but shared boundary stars may be used to connect onward through legal connections.
- When several valid matches for the active **Constellation pattern** are available, the game highlights them and the player chooses which match to claim as part of the current action, without spending another turn.
- A single valid match for the active **Constellation pattern** is completed automatically.
- A player may complete at most one constellation per turn, after their draw, **Relocation**, or forced pass.
- A forced pass permits an already-built active target to score, subject to the same matching, selection, and reservation rules.
- If activating the next target reveals an already-built match among unfinished connections, it cannot score until that player's next turn after their draw, **Relocation**, or forced pass; the opponent takes a turn first.

### Example dialogue

> **Dev:** "My opponent is one connection away from completing a constellation. Can I interfere?"
> **Domain expert:** "Yes, prevention is the intended rivalry. Once it is completed, I cannot destroy or steal it."

> **Dev:** "My intended final connection is blocked. Can I reposition an earlier connection?"
> **Domain expert:** "Yes, relocating one of my unfinished connections costs my entire turn; completed constellations stay fixed."

### Visual direction

- The constellation game uses a celestial-atlas style: deep navy space, luminous stars, faint nebulae, and crisp connections in each player's color.
- Completing a constellation briefly reveals an illustration adapted to its connected stars, then settles into a subtle glow that preserves board readability.
- Completion illustrations are decorative and impose no additional shape requirements on **Constellation pattern** matching.

### Flagged ambiguities

- "Get in the way" is resolved as **Prevention** through **Blocking connections**, rather than attacking completed constellations or disabling stars.
- "Constellation" uses a predefined **Constellation pattern**, rather than an arbitrary drawing awarded points after creation.
- Targets use the fixed prototype roster and two publicly visible **Target sequences** rotated across four rematch matchups; initial sequence assignment and starting player are randomized independently.
- Swapping both sequences and starter every rematch would always give the same sequence the first move; resolved with a four-matchup rotation covering both starting positions for each player and sequence.
- An already-built later target must wait until the player's next turn to score after an action or forced pass; completion never cascades through multiple targets in one turn.
- Extra branches and other connections around a matching pattern are allowed and are not reserved by that completion.
- Unlike Triangle Duel's empty **Scoring triangles** and **Closed triangles**, constellation loops may enclose playable stars and connections; only the completed pattern's connections are reserved.
- Completed constellations cannot share connections, but may share stars; when several matches exist, the player chooses which match's connections to reserve.
- The match is a race to three completions with a fallback of 20 turns per player, decided by completed-constellation totals with ties drawn; Meridian v1 has 24 fixed stars; scripted examples establish feasibility, while human balance review remains open.
- Constellation mode uses exclusive **Owned connections** and shared stars, unlike Triangle Duel's neutral **Attributed lines**.
- Recovery allows **Relocation** of both endpoints anywhere on the map at the cost of a full turn, leaving all other connections untouched.
- Normal turns allow one connection draw or one **Relocation**, without dice; no legal action causes an automatic pass that may score one prepared active target. A blocked board resolves in normal turn order until three completions, the turn limit, or neither player having a prepared active target ends the match.
- The initial constellation design uses a flat playfield with visual depth, rather than true three-dimensional play; the requested Three.js renderer adds visual depth above exact integer coordinates, with an accessible SVG input layer and fallback.
- "Levels" means different PvP **Star map** layouts for now; a solo campaign is deferred.

## Galaxy Duel

Galaxy Duel is a separately selectable visual edition of Triangle Duel at `/galaxy-duel/index.html`. The same match controller, state machine, field generator, scoring, quotas, and rematch rules apply. A dot is rendered as a star; visual animation never changes logical coordinates or legality.

Three.js draws the procedural galaxy, star sprites, glowing lines, and translucent triangle claims. SVG supplies aligned input, legal endpoint highlights, and fallback rendering when WebGL is unavailable or lost. Players can drag, tap two stars, or focus stars and use Enter/Space (Escape cancels). Reduced-motion preferences stop continuous animation; hidden pages suspend rendering. GPU resources are disposed when the view unmounts. Three.js loads lazily.

Galaxy saves use `galaxy:triangle-duel:resumable-match`, separate from the original game's saved match. The gallery card uses a screenshot of actual gameplay at `public/images/galaxy-duel.png`.
