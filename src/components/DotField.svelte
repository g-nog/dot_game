<script lang="ts">
  import type { Dot, DotId, TriangleDuelMatch } from '../domain/triangle-duel/model';

  import ConstellationIllustration from './shared/ConstellationIllustration.svelte';
  import GalaxyCanvas from './galaxy/GalaxyCanvas.svelte';
  export let galaxy = false;
  let ready = false;
  export let match: TriangleDuelMatch;
  export let oncommit: (a: DotId, b: DotId) => void;
  export let eligibleEndpoints: (from: DotId) => DotId[];

  const restoredClaims = new Set(match.claims.map((claim) => claim.key));
  let fieldWidth = 1000;
  let fieldHeight = 1000;
  // An affine display projection fills any screen while preserving line topology.
  // The controller always receives original dot IDs and validates original coordinates.
  $: displayMatch = galaxy
    ? {
        ...match,
        dotField: {
          ...match.dotField,
          width: fieldWidth,
          height: fieldHeight,
          dots: match.dotField.dots.map((dot) => ({
            ...dot,
            x: 24 + (dot.x / match.dotField.width) * Math.max(1, fieldWidth - 48),
            y: 24 + (dot.y / match.dotField.height) * Math.max(1, fieldHeight - 48),
          })),
        },
      }
    : match;
  let svg: SVGSVGElement;
  let origin: DotId | undefined;
  let eligible: DotId[] = [];
  let preview: { x: number; y: number } | undefined;

  $: points = new Map(displayMatch.dotField.dots.map((dot) => [dot.id, dot]));
  $: canDraw = match.phase.kind === 'drawing-lines';

  function logical(event: PointerEvent) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  }

  function select(dot: Dot) {
    if (!canDraw) return;
    if (origin && eligible.includes(dot.id)) {
      const from = origin;
      cancel();
      oncommit(from, dot.id);
      return;
    }
    origin = dot.id;
    eligible = eligibleEndpoints(dot.id);
    preview = dot;
  }

  function begin(event: PointerEvent, dot: Dot) {
    if (galaxy && origin && eligible.includes(dot.id)) {
      select(dot);
      return;
    }
    if (!canDraw) return;
    const targets = eligibleEndpoints(dot.id);
    if (targets.length === 0) return;
    origin = dot.id;
    eligible = targets;
    preview = dot;
    svg.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function move(event: PointerEvent) {
    if (!origin) return;
    preview = logical(event);
  }

  function finish(event: PointerEvent) {
    if (!origin) return;
    const location = logical(event);
    const nearest = eligible
      .map((id) => ({ id, dot: points.get(id)! }))
      .map(({ id, dot }) => ({
        id,
        distance: (dot.x - location.x) ** 2 + (dot.y - location.y) ** 2,
      }))
      .filter(({ distance }) => distance <= (galaxy ? 24 : 72) ** 2)
      .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0];
    if (
      galaxy &&
      !nearest &&
      Math.hypot(location.x - points.get(origin)!.x, location.y - points.get(origin)!.y) <
        (galaxy ? 24 : 72)
    ) {
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      return;
    }
    const from = origin;
    cancel(event);
    if (nearest) oncommit(from, nearest.id);
  }

  function cancel(event?: PointerEvent) {
    if (event && svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    origin = undefined;
    eligible = [];
    preview = undefined;
  }
</script>

<div
  class="field-shell"
  class:galaxy-field={galaxy}
  class:webgl-ready={ready}
  bind:clientWidth={fieldWidth}
  bind:clientHeight={fieldHeight}
>
  <div class="board-layer">
    {#if galaxy}<GalaxyCanvas match={displayMatch} bind:ready />{/if}
    <svg
      bind:this={svg}
      class="dot-field"
      viewBox={`0 0 ${displayMatch.dotField.width} ${displayMatch.dotField.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="application"
      aria-label={galaxy ? 'Galaxy Duel star field' : 'Triangle Duel dot field'}
      onpointermove={move}
      onpointerup={finish}
      onpointercancel={cancel}
    >
      <g class="claims">
        {#each match.claims as claim (claim.key)}
          {@const player = match.players.find((item) => item.id === claim.playerId)!}
          {@const vertices = claim.dots.map((id) => points.get(id)!)}
          <polygon
            points={vertices.map((dot) => `${dot.x},${dot.y}`).join(' ')}
            fill={player.color}
          />
        {/each}
      </g>
      <g class="lines">
        {#each match.lines as line, index (`${line.a}|${line.b}`)}
          {@const a = points.get(line.a)!}{@const b = points.get(line.b)!}
          {@const player = match.players.find((item) => item.id === line.playerId)!}
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={player.color}
            class="committed"
            style={`--delay:${Math.min(index, 1)}`}
          />
        {/each}
      </g>
      {#if galaxy}
        {#each match.claims.filter((claim) => !restoredClaims.has(claim.key)) as claim (claim.key)}
          <ConstellationIllustration
            points={claim.dots.map((id) => points.get(id)!)}
            color={match.players.find((player) => player.id === claim.playerId)!.color}
            label="Triangle claimed"
            trace
          />
        {/each}
      {/if}
      {#if origin && preview}
        {@const a = points.get(origin)!}
        <line class="preview" x1={a.x} y1={a.y} x2={preview.x} y2={preview.y} />
      {/if}
      <g class="dots">
        {#each displayMatch.dotField.dots as dot (dot.id)}
          <circle
            role="button"
            tabindex={galaxy && canDraw ? 0 : -1}
            onkeydown={(event) => {
              if (galaxy && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                select(dot);
              }
              if (event.key === 'Escape') cancel();
            }}
            aria-label={galaxy ? `Connect star ${dot.id}` : `Start line at ${dot.id}`}
            aria-pressed={galaxy ? origin === dot.id : undefined}
            class="touch-target"
            class:eligible={eligible.includes(dot.id)}
            cx={dot.x}
            cy={dot.y}
            r={galaxy ? 22 : 66}
            onpointerdown={(event) => begin(event, dot)}
          />
          {#if galaxy}
            <circle
              class="star-marker"
              class:eligible={eligible.includes(dot.id)}
              class:selected={origin === dot.id}
              cx={dot.x}
              cy={dot.y}
              r="10"
            />
          {/if}
          <circle
            class="visible-dot"
            class:eligible={eligible.includes(dot.id)}
            class:selected={origin === dot.id}
            cx={dot.x}
            cy={dot.y}
            r={galaxy ? 2.4 : 16}
          />
        {/each}
      </g>
    </svg>
  </div>
</div>

<style>
  .board-layer {
    display: contents;
  }
  .galaxy-field .board-layer {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
  }
  .galaxy-field .touch-target:focus-visible {
    outline: none;
    stroke: #e8d9ff;
    stroke-width: 3;
  }
  .galaxy-field .dot-field {
    position: absolute;
    inset: 0;
    max-width: none;
  }
  .webgl-ready .claims,
  .webgl-ready .lines {
    opacity: 0;
  }
  .webgl-ready .visible-dot.eligible,
  .webgl-ready .visible-dot.selected {
    opacity: 1;
    fill: transparent;
    stroke: #c5e9ff;
    stroke-width: 1;
  }

  .galaxy-field .visible-dot {
    r: 3.8;
    opacity: 1;
    stroke: #032133;
    stroke-width: 1.5;
    fill: #fff;
    filter: drop-shadow(0 0 4px #4fe5ff);
  }
  .star-marker {
    fill: #031322aa;
    stroke: #79e7ff;
    stroke-width: 1.5;
    filter: drop-shadow(0 0 2px #000);
    pointer-events: none;
    transition:
      r 140ms,
      stroke 140ms;
  }
  .star-marker.eligible {
    stroke: #b5f4ff;
    stroke-width: 2;
  }
  .star-marker.selected {
    r: 14;
    stroke: #fff2b3;
    stroke-width: 2.5;
  }
  .galaxy-field .touch-target:hover + .star-marker {
    r: 13;
    stroke: #fff;
  }

  .galaxy-field .visible-dot.eligible {
    r: 5;
  }
  .galaxy-field .visible-dot.selected {
    r: 8;
  }
  .galaxy-field .touch-target {
    cursor: pointer;
  }
  .galaxy-field .committed {
    stroke-width: 1.2;
  }
  .galaxy-field .preview {
    stroke-width: 1;
    stroke-dasharray: 5 6;
  }
  .galaxy-field .claims polygon {
    opacity: 0.12;
  }
  .field-shell {
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .dot-field {
    width: 100%;
    height: 100%;
    max-width: 34rem;
    touch-action: none;
    user-select: none;
  }
  .claims polygon {
    opacity: 0.3;
    animation: claim-in var(--motion-medium) ease-out;
  }
  .committed {
    stroke-width: 10;
    stroke-linecap: round;
    animation: line-in var(--motion-fast) ease-out;
  }
  .preview {
    stroke: var(--focus);
    stroke-width: 8;
    stroke-dasharray: 20 14;
    pointer-events: none;
  }
  .touch-target {
    fill: transparent;
    cursor: default;
  }
  .touch-target.eligible {
    cursor: crosshair;
  }
  .visible-dot {
    fill: var(--dot);
    stroke: var(--surface);
    stroke-width: 7;
    pointer-events: none;
    transition:
      r var(--motion-fast),
      fill var(--motion-fast);
  }
  .visible-dot.eligible {
    r: 23;
    fill: var(--focus);
  }
  .visible-dot.selected {
    r: 27;
    fill: var(--focus);
  }
  @keyframes line-in {
    from {
      opacity: 0.2;
      stroke-dasharray: 1 2000;
    }
  }
  @keyframes claim-in {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .claims polygon,
    .committed {
      animation: none;
    }
    .visible-dot {
      transition: none;
    }
  }
</style>
