<script lang="ts">
  import { PATTERNS } from '../../domain/constellation/patterns';
  import type { PatternId } from '../../domain/constellation/model';
  export let id: PatternId;
  $: pattern = PATTERNS[id];
</script>

<svg
  viewBox="0 0 100 100"
  class="pattern-diagram"
  role="img"
  aria-label={`${pattern.name}: ${pattern.description}`}
>
  {#each pattern.edges as [a, b] (`${a}-${b}`)}
    <line
      x1={pattern.vertices[a][0]}
      y1={pattern.vertices[a][1]}
      x2={pattern.vertices[b][0]}
      y2={pattern.vertices[b][1]}
      stroke="currentColor"
      stroke-width="1.8"
    />
  {/each}
  {#each pattern.vertices as [x, y], i (i)}
    <circle cx={x} cy={y} r="7" fill="currentColor" opacity=".12" />
    <circle cx={x} cy={y} r="3" fill="currentColor" />
  {/each}
</svg>
