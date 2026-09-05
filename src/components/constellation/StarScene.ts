import * as THREE from 'three';
import type { Match } from '../../domain/constellation/model';
import { reserved } from '../../domain/constellation/selectors';
/** Visual-only orthographic scene. Input and exact legality stay in logical map coordinates. */
export function createStarScene(canvas: HTMLCanvasElement, initial: Match) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    0,
    initial.map.width,
    0,
    initial.map.height,
    0.1,
    100,
  );
  camera.position.z = 20;
  let graph = new THREE.Group();
  scene.add(graph);
  const dust = new THREE.Group();
  scene.add(dust);
  const dustGeometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 130; i++)
    positions.push((i * 197 + 37) % 719, (i * 331 + 91) % 719, -5 - (i % 9));
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0xb6cae9,
    size: 1.2,
    transparent: true,
    opacity: 0.34,
    sizeAttenuation: false,
  });
  dust.add(new THREE.Points(dustGeometry, dustMaterial));
  function disposeGroup(group: THREE.Group) {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((m) => m.dispose());
      }
    });
  }
  function disc(
    x: number,
    y: number,
    radius: number,
    color: string,
    opacity: number,
    ring = false,
  ) {
    const geometry = ring
      ? new THREE.RingGeometry(radius - 0.65, radius, 32)
      : new THREE.CircleGeometry(radius, 32);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.set(x, y, 0);
    graph.add(mesh);
  }
  function update(match: Match, highlight: readonly string[] = []) {
    scene.remove(graph);
    disposeGroup(graph);
    graph = new THREE.Group();
    scene.add(graph);
    const stars = new Map(match.map.dots.map((s) => [s.id, s]));
    const locked = reserved(match);
    for (const edge of match.edges) {
      const a = stars.get(edge.a)!,
        b = stars.get(edge.b)!;
      const color = highlight.includes(edge.id) ? '#fff4cb' : match.players[edge.owner].color;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      for (const [width, opacity] of [
        [9, 0.045],
        [4, 0.13],
        [locked.has(edge.id) ? 2.6 : 1.6, 0.85],
      ]) {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(length, width),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthTest: false,
            side: THREE.DoubleSide,
          }),
        );
        mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
        mesh.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
        graph.add(mesh);
      }
      if (locked.has(edge.id)) disc((a.x + b.x) / 2, (a.y + b.y) / 2, 4, color, 0.9, true);
    }
    for (const star of match.map.dots) {
      disc(star.x, star.y, 16, '#8fc6ff', 0.025);
      disc(star.x, star.y, 10, '#a8d6ff', 0.065);
      disc(star.x, star.y, 5.4, '#c6e5ff', 0.2);
      disc(star.x, star.y, 2.8, '#f5f6ef', 1);
    }
    renderer.render(scene, camera);
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  function animate(time: number) {
    dustMaterial.opacity = 0.28 + Math.sin(time / 3000) * 0.06;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }
  function motion() {
    cancelAnimationFrame(frame);
    if (!reduced.matches) frame = requestAnimationFrame(animate);
    else renderer.render(scene, camera);
  }
  reduced.addEventListener('change', motion);
  const observer = new ResizeObserver(() => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.render(scene, camera);
  });
  observer.observe(canvas);
  update(initial);
  motion();
  return {
    update,
    destroy() {
      observer.disconnect();
      reduced.removeEventListener('change', motion);
      cancelAnimationFrame(frame);
      disposeGroup(graph);
      dustGeometry.dispose();
      dustMaterial.dispose();
      renderer.dispose();
    },
  };
}
