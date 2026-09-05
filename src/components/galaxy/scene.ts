import * as T from 'three';
import type { GalaxyDuelMatch } from '../../domain/galaxy-duel/model';

/** Rendering only: all picking and legality remain in the exact logical board. */
export function createGalaxyScene(canvas: HTMLCanvasElement) {
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 10;
  const resources: (T.BufferGeometry | T.Material | T.Texture)[] = [];
  const own = <V extends T.BufferGeometry | T.Material | T.Texture>(v: V): V => {
    resources.push(v);
    return v;
  };
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = 128;
  const ctx = textureCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(0.08, '#fff');
  gradient.addColorStop(0.2, '#b6dfff99');
  gradient.addColorStop(0.45, '#80baff28');
  gradient.addColorStop(1, '#80baff00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const flare = ctx.createLinearGradient(0, 0, 128, 0);
  flare.addColorStop(0, '#cce8ff00');
  flare.addColorStop(0.5, '#eaf7ffbb');
  flare.addColorStop(1, '#cce8ff00');
  ctx.fillStyle = flare;
  ctx.fillRect(12, 63, 104, 2);
  ctx.translate(64, 64);
  ctx.rotate(Math.PI / 2);
  ctx.translate(-64, -64);
  ctx.fillRect(12, 63, 104, 2);
  const texture = own(new T.CanvasTexture(textureCanvas));
  const graph = new T.Group();
  scene.add(graph);
  let boardResources: (T.BufferGeometry | T.Material)[] = [];
  let born = 0;
  let previousLines = 0;
  let previousClaims = 0;
  function update(match: GalaxyDuelMatch) {
    graph.clear();
    boardResources.forEach((r) => r.dispose());
    boardResources = [];
    const keep = <V extends T.BufferGeometry | T.Material>(v: V): V => {
      boardResources.push(v);
      return v;
    };
    camera.left = 0;
    camera.right = match.dotField.width;
    camera.top = 0;
    camera.bottom = match.dotField.height;
    camera.updateProjectionMatrix();
    const dots = new Map(match.dotField.dots.map((d) => [d.id, d]));
    for (const claim of match.claims) {
      const geometry = keep(new T.BufferGeometry());
      geometry.setAttribute(
        'position',
        new T.Float32BufferAttribute(
          claim.dots.flatMap((id) => {
            const d = dots.get(id)!;
            return [d.x, d.y, 0];
          }),
          3,
        ),
      );
      const material = keep(
        new T.MeshBasicMaterial({
          color: match.players.find((p) => p.id === claim.playerId)!.color,
          transparent: true,
          opacity: 0.12,
          side: T.DoubleSide,
          depthTest: false,
        }),
      );
      const mesh = new T.Mesh(geometry, material);
      mesh.userData.claimReveal = match.claims.indexOf(claim) >= previousClaims;
      graph.add(mesh);
    }
    for (const line of match.lines) {
      const a = dots.get(line.a)!,
        b = dots.get(line.b)!;
      for (const [width, opacity] of [
        [7, 0.045],
        [3, 0.1],
        [1, 0.85],
      ]) {
        const mesh = new T.Mesh(
          keep(new T.PlaneGeometry(Math.hypot(b.x - a.x, b.y - a.y), width)),
          keep(
            new T.MeshBasicMaterial({
              color: match.players.find((p) => p.id === line.playerId)!.color,
              transparent: true,
              opacity,
              side: T.DoubleSide,
              depthTest: false,
            }),
          ),
        );
        mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 1);
        mesh.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
        graph.add(mesh);
        if (match.lines.indexOf(line) >= previousLines) mesh.userData.reveal = true;
      }
    }
    const material = keep(
      new T.SpriteMaterial({
        map: texture,
        side: T.DoubleSide,
        transparent: true,
        blending: T.AdditiveBlending,
        depthTest: false,
      }),
    );
    for (const dot of match.dotField.dots) {
      const star = new T.Sprite(material);
      star.position.set(dot.x, dot.y, 2);
      star.scale.set(48, 48, 1);
      graph.add(star);
    }
    previousLines = match.lines.length;
    previousClaims = match.claims.length;
    born = performance.now();
    render();
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  function render() {
    renderer.render(scene, camera);
  }
  function animate(now: number) {
    for (const [index, child] of graph.children.entries()) {
      if (child.userData.reveal) child.scale.x = Math.min(1, (now - born) / 450);
      if (child instanceof T.Sprite)
        child.scale.setScalar(48 + Math.sin(now / 2400 + index * 2) * 2);
      if (child instanceof T.Mesh && child.userData.claimReveal)
        (child.material as T.MeshBasicMaterial).opacity = 0.12 * Math.min(1, (now - born) / 700);
    }
    render();
    frame = requestAnimationFrame(animate);
  }
  function motion() {
    cancelAnimationFrame(frame);
    if (!reduced.matches && !document.hidden) frame = requestAnimationFrame(animate);
    else {
      for (const child of graph.children) {
        if (child instanceof T.Sprite) child.scale.set(48, 48, 1);
        else child.scale.x = 1;
        if (child instanceof T.Mesh && child.userData.claimReveal)
          (child.material as T.MeshBasicMaterial).opacity = 0.12;
      }
      render();
    }
  }
  const resize = new ResizeObserver(() => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    render();
  });
  resize.observe(canvas);
  reduced.addEventListener('change', motion);
  document.addEventListener('visibilitychange', motion);
  motion();
  return {
    update,
    destroy() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      reduced.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', motion);
      boardResources.forEach((r) => r.dispose());
      resources.forEach((r) => r.dispose());
      renderer.dispose();
    },
  };
}
