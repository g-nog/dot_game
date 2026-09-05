<script lang="ts">
  import { onMount } from 'svelte';
  import ConstellationIllustration from '../shared/ConstellationIllustration.svelte';
  import type { Match } from '../../domain/constellation/model';
  import { legalEndpoints } from '../../geometry/legal-lines';
  import { reserved } from '../../domain/constellation/selectors';
  import { PATTERNS } from '../../domain/constellation/patterns';
  import type { createStarScene } from './StarScene';
  export let match: Match;
  export let relocation: string | null = null;
  export let highlight: readonly string[] = [];
  export let onconnect: (a: string, b: string) => void;
  let canvas: HTMLCanvasElement;
  let svg: SVGSVGElement;
  let scene: ReturnType<typeof createStarScene> | undefined;
  let webgl = false;
  let selected: string | null = null;
  let pointer: { x: number; y: number } | null = null;
  let pointerStart: string | null = null;
  let downPoint: { x: number; y: number } | null = null;
  let moved = false;
  $: actionable = match.phase.kind === 'action';
  $: edges = match.edges.filter((e) => e.id !== relocation);
  $: endpoints =
    selected && actionable
      ? legalEndpoints(match.map, edges, selected).filter((id) => {
          const old = match.edges.find((e) => e.id === relocation);
          return (
            !old || !((old.a === selected && old.b === id) || (old.b === selected && old.a === id))
          );
        })
      : [];
  $: locked = reserved(match);
  $: stars = new Map(match.map.dots.map((s) => [s.id, s]));
  $: if (scene) scene.update(match, highlight);
  $: if (!actionable || relocation) {
    selected = null;
    pointer = null;
  }
  onMount(() => {
    let disposed = false;
    void import('./StarScene')
      .then(({ createStarScene }) => {
        if (disposed) return;
        try {
          scene = createStarScene(canvas, match);
          webgl = true;
        } catch {
          webgl = false;
        }
      })
      .catch(() => {
        webgl = false;
      });
    return () => {
      disposed = true;
      scene?.destroy();
    };
  });
  function activate(id: string) {
    if (!actionable) return;
    if (selected && endpoints.includes(id)) {
      const from = selected;
      selected = null;
      pointer = null;
      onconnect(from, id);
    } else selected = selected === id ? null : id;
  }
  function location(event: PointerEvent) {
    const box = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * match.map.width,
      y: ((event.clientY - box.top) / box.height) * match.map.height,
    };
  }
  function nearest(point: { x: number; y: number }) {
    const radius = (24 / svg.getBoundingClientRect().width) * match.map.width;
    return (
      [...match.map.dots]
        .sort(
          (a, b) =>
            Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y),
        )
        .find((s) => Math.hypot(s.x - point.x, s.y - point.y) <= radius)?.id ?? null
    );
  }
  function down(event: PointerEvent) {
    if (!actionable) return;
    const point = location(event);
    const id = nearest(point);
    if (!id) return;
    pointerStart = id;
    downPoint = point;
    moved = false;
    if (!selected || !endpoints.includes(id)) selected = id;
    pointer = point;
    svg.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    if (!downPoint) return;
    pointer = location(event);
    if (Math.hypot(pointer.x - downPoint.x, pointer.y - downPoint.y) > 8) moved = true;
  }
  function up(event: PointerEvent) {
    if (!downPoint) return;
    const id = nearest(location(event));
    if (id && selected && endpoints.includes(id)) {
      const from = selected;
      selected = null;
      onconnect(from, id);
    } else if (moved || id !== pointerStart) selected = null;
    pointer = null;
    pointerStart = null;
    downPoint = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  }
  function cancel() {
    selected = null;
    pointer = null;
    downPoint = null;
    pointerStart = null;
  }
</script>

<div class="star-map" data-renderer={webgl ? 'three' : 'svg'}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
  <svg
    bind:this={svg}
    viewBox={`0 0 ${match.map.width} ${match.map.height}`}
    role="group"
    aria-label="Meridian star map. Select two stars to connect them."
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={cancel}
  >
    {#each match.edges as edge (edge.id)}
      {@const a = stars.get(edge.a)!}
      {@const b = stars.get(edge.b)!}
      <g opacity={edge.id === relocation ? 0.3 : 1}>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={match.players[edge.owner].color}
          stroke-width={highlight.includes(edge.id) ? 6 : locked.has(edge.id) ? 3 : 2}
          opacity={webgl && !highlight.includes(edge.id) ? 0.24 : 0.9}
        />
        {#if locked.has(edge.id)}<path
            d={`M ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 4} l 4 4 -4 4 -4 -4 Z`}
            fill={match.players[edge.owner].color}
          />{/if}
      </g>
    {/each}
    {#each match.completions as completion (`${match.cycle}-${completion.owner}-${completion.pattern}`)}
      {@const points = completion.vertices.map((id) => stars.get(id)!)}
      <ConstellationIllustration
        {points}
        color={match.players[completion.owner].color}
        pattern={completion.pattern}
        label={`${PATTERNS[completion.pattern].name} completed`}
      />
    {/each}
    {#if selected && pointer}
      {@const from = stars.get(selected)!}
      <line
        x1={from.x}
        y1={from.y}
        x2={pointer.x}
        y2={pointer.y}
        stroke={match.players[match.active].color}
        stroke-width="2"
        stroke-dasharray="6 5"
      />
    {/if}
    {#each match.map.dots as star, i (star.id)}
      <g
        role="button"
        tabindex={actionable ? 0 : -1}
        aria-label={`Star ${i + 1}${selected === star.id ? ', selected' : ''}${endpoints.includes(star.id) ? ', legal endpoint' : ''}`}
        aria-disabled={!actionable}
        data-star={star.id}
        class:eligible={endpoints.includes(star.id)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate(star.id);
          }
          if (event.key === 'Escape') cancel();
        }}
      >
        <circle cx={star.x} cy={star.y} r="24" fill="transparent" class="star-hit" />
        {#if selected === star.id || endpoints.includes(star.id)}<circle
            cx={star.x}
            cy={star.y}
            r={selected === star.id ? 13 : 10}
            fill="none"
            stroke={selected === star.id ? '#fff1c1' : match.players[match.active].color}
            stroke-width="2"
          />{/if}
        <circle
          cx={star.x}
          cy={star.y}
          r="3.3"
          class="playable-star"
          fill="#f6f3e4"
          opacity={webgl ? 0.45 : 1}
        />
        <text
          x={star.x + 10}
          y={star.y + 18}
          fill="#a9b8cf"
          font-size="12"
          class="star-number"
          pointer-events="none">{String(i + 1).padStart(2, '0')}</text
        >
      </g>
    {/each}
  </svg>
  <div class="map-caption" aria-hidden="true">
    <span>MERIDIAN · PLATE I</span><span>24 SHARED STARS</span>
  </div>
</div>
