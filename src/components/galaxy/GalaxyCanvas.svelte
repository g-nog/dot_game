<script lang="ts">
  import { onMount } from 'svelte';
  import type { TriangleDuelMatch } from '../../domain/triangle-duel/model';
  import type { createGalaxyScene } from './scene';
  export let match: TriangleDuelMatch | undefined = undefined;
  export let ready = false;
  let canvas: HTMLCanvasElement;
  let scene: ReturnType<typeof createGalaxyScene> | undefined;
  $: if (scene && match) scene.update(match);
  onMount(() => {
    let disposed = false;
    void import('./scene')
      .then(({ createGalaxyScene }) => {
        if (disposed) return;
        try {
          scene = createGalaxyScene(canvas);
          if (match) scene.update(match);
          ready = true;
        } catch {
          ready = false;
        }
      })
      .catch(() => {
        ready = false;
      });
    const lost = (event: Event) => {
      event.preventDefault();
      ready = false;
    };
    const restored = () => {
      ready = true;
    };
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      disposed = true;
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      scene?.destroy();
    };
  });
</script>

<canvas bind:this={canvas} aria-hidden="true" data-ready={ready}></canvas>

<style>
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
