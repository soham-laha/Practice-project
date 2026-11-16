'use client';
import { useEffect, useRef } from 'react';
/** A decorative, tiny procedural scene; no external models or textures. */
export function Orbit() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false,
      frame = 0,
      cleanup = () => {};
    async function start() {
      const THREE = await import('three');
      if (disposed || !host.current) return;
      const container = host.current;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        });
      } catch {
        return;
      }
      // Keep the drawing buffer; let the responsive CSS size the canvas's slot.
      renderer.setSize(260, 260, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
      const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.z = 7;
      const group = new THREE.Group();
      scene.add(group);
      const material = new THREE.MeshStandardMaterial({
        color: 0x658348,
        roughness: 0.5,
        metalness: 0.15,
      });
      const geometry = new THREE.TorusGeometry(1.45, 0.018, 8, 100);
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.set(i * 0.85, 0.45 + i * 0.9, i * 0.7);
        group.add(ring);
      }
      const coreGeo = new THREE.IcosahedronGeometry(0.43, 2),
        core = new THREE.Mesh(
          coreGeo,
          new THREE.MeshStandardMaterial({ color: 0xa6ba7b, roughness: 0.35, metalness: 0.05 }),
        );
      group.add(core);
      const beadGeo = new THREE.SphereGeometry(0.1, 16, 16),
        beadMat = new THREE.MeshStandardMaterial({ color: 0xe7b68a, roughness: 0.4 });
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(beadGeo, beadMat);
        b.position.set(Math.cos(i * 2.1) * 1.45, Math.sin(i * 2.1) * 1.2, i * 0.4 - 0.4);
        group.add(b);
      }
      scene.add(new THREE.AmbientLight(0xffffff, 2));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(2, 3, 5);
      scene.add(light);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'),
        observer = new IntersectionObserver((entries) => {
          visible = entries[0]?.isIntersecting ?? false;
        });
      let visible = true;
      observer.observe(container);
      function draw() {
        if (disposed) return;
        if (visible) {
          if (!reduced.matches) {
            group.rotation.y += 0.002;
            group.rotation.z += 0.0007;
          }
          renderer.render(scene, camera);
        }
        frame = requestAnimationFrame(draw);
      }
      draw();
      cleanup = () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        renderer.dispose();
        geometry.dispose();
        coreGeo.dispose();
        beadGeo.dispose();
        material.dispose();
        (core.material as InstanceType<typeof THREE.MeshStandardMaterial>).dispose();
        beadMat.dispose();
        renderer.domElement.remove();
      };
    }
    void start();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div className="orbit-scene" aria-hidden="true">
      <div ref={host} />
      <span className="orbit-label">a fresh frame of mind.</span>
    </div>
  );
}
