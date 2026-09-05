<script lang="ts">
  export let points: readonly { id: string; x: number; y: number }[];
  export let color: string;
  export let label = 'Triangle claimed';
  export let trace = false;
  $: cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  $: cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
</script>

<g class="completion-illustration" class:trace style:--motif-color={color}>
  <title>{label}</title>
  {#each points as p, j (p.id)}
    <path
      d={`M ${p.x} ${p.y} Q ${cx + (j % 2 ? 24 : -24)} ${cy - 26} ${cx} ${cy}`}
      pathLength={trace ? 1 : undefined}
      fill="none"
      stroke="currentColor"
      stroke-width="1"
    />
    <circle
      cx={p.x}
      cy={p.y}
      r={12}
      pathLength={trace ? 1 : undefined}
      fill="none"
      stroke="currentColor"
      stroke-width="1"
    />
  {/each}
  <path
    d={`M ${cx} ${cy - 28} L ${cx + 8} ${cy - 8} ${cx + 28} ${cy} ${cx + 8} ${cy + 8} ${cx} ${cy + 28} ${cx - 8} ${cy + 8} ${cx - 28} ${cy} ${cx - 8} ${cy - 8} Z`}
    pathLength={trace ? 1 : undefined}
    fill="none"
    stroke="currentColor"
  />
</g>

<style>
  .completion-illustration {
    color: var(--motif-color);
    pointer-events: none;
    animation: reveal-constellation 3.5s ease-out forwards;
  }
  .trace {
    filter: drop-shadow(0 0 3px currentColor);
  }
  .trace path,
  .trace circle {
    stroke-width: 1.5;
    stroke-dasharray: 1;
    animation: trace-illustration 1.2s ease-out both;
  }
  @keyframes trace-illustration {
    from {
      stroke-dashoffset: 1;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes reveal-constellation {
    0% {
      opacity: 0;
    }
    15%,
    65% {
      opacity: 0.95;
    }
    100% {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .completion-illustration {
      animation: none;
      opacity: 0.3;
    }
    .trace path,
    .trace circle {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
