<script lang="ts">
  import type { Dot, DotId, TriangleDuelMatch } from '../domain/triangle-duel/model';

  export let match: TriangleDuelMatch;
  export let oncommit: (a: DotId, b: DotId) => void;
  export let eligibleEndpoints: (from: DotId) => DotId[];

  let svg: SVGSVGElement;
  let origin: DotId | undefined;
  let eligible: DotId[] = [];
  let preview: { x: number; y: number } | undefined;

  $: points = new Map(match.dotField.dots.map((dot) => [dot.id, dot]));
  $: canDraw = match.phase.kind === 'drawing-lines';

  function logical(event: PointerEvent) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  }

  function begin(event: PointerEvent, dot: Dot) {
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
      .filter(({ distance }) => distance <= 72 ** 2)
      .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0];
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

<div class="field-shell">
  <svg
    bind:this={svg}
    class="dot-field"
    viewBox={`0 0 ${match.dotField.width} ${match.dotField.height}`}
    preserveAspectRatio="xMidYMid meet"
    role="application"
    aria-label="Triangle Duel dot field"
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
    {#if origin && preview}
      {@const a = points.get(origin)!}
      <line class="preview" x1={a.x} y1={a.y} x2={preview.x} y2={preview.y} />
    {/if}
    <g class="dots">
      {#each match.dotField.dots as dot (dot.id)}
        <circle
          role="button"
          tabindex="-1"
          aria-label={`Start line at ${dot.id}`}
          class="touch-target"
          class:eligible={eligible.includes(dot.id)}
          cx={dot.x}
          cy={dot.y}
          r="66"
          onpointerdown={(event) => begin(event, dot)}
        />
        <circle
          class="visible-dot"
          class:eligible={eligible.includes(dot.id)}
          class:selected={origin === dot.id}
          cx={dot.x}
          cy={dot.y}
          r="16"
        />
      {/each}
    </g>
  </svg>
</div>

<style>
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
