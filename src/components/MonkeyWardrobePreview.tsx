import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import * as THREE from 'three';
import { applyMonkeyCosmetics, createMonkeyModel, MonkeyRig } from '../game/models3d';
import { EquippedCosmetics } from '../game/types';

interface MonkeyWardrobePreviewProps {
  cosmetics: EquippedCosmetics;
  previewLabel?: string | null;
  onClearPreview?: () => void;
  lowDetail?: boolean;
}

type PresetAngle = {
  id: string;
  label: string;
  yaw: number;
  pitch: number;
};

const ANGLE_PRESETS: PresetAngle[] = [
  { id: 'front', label: 'Frente', yaw: 0, pitch: 0.14 },
  { id: 'three_quarter', label: '3/4', yaw: 0.62, pitch: 0.2 },
  { id: 'side', label: 'Lado', yaw: Math.PI / 2, pitch: 0.16 },
  { id: 'back', label: 'Costas', yaw: Math.PI, pitch: 0.18 },
];

export function MonkeyWardrobePreview({
  cosmetics,
  previewLabel,
  onClearPreview,
  lowDetail = false,
}: MonkeyWardrobePreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<MonkeyRig | null>(null);

  // Camera orbit state stored in refs for 60fps Three.js loop without React re-renders
  const targetYawRef = useRef(0.55);
  const targetPitchRef = useRef(0.2);
  const targetDistRef = useRef(4.15);
  const yawRef = useRef(0.55);
  const pitchRef = useRef(0.2);
  const distRef = useRef(4.15);
  const yawVelRef = useRef(0);
  const autoSpinRef = useRef(true);
  const draggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const [autoSpin, setAutoSpin] = useState(true);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  useEffect(() => {
    targetDistRef.current = zoomedIn ? 2.7 : 4.15;
  }, [zoomedIn]);

  // Update cosmetics immediately on existing rig whenever selection/preview changes
  useEffect(() => {
    if (rigRef.current) {
      applyMonkeyCosmetics(rigRef.current, cosmetics);
    }
  }, [cosmetics]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let rafId = 0;
    let resizeObs: ResizeObserver | null = null;
    let disposed = false;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !lowDetail,
        alpha: true,
        powerPreference: lowDetail ? 'low-power' : 'default',
      });
      const maxDpr = lowDetail ? 1.15 : 1.75;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;

      const w = Math.max(200, container.clientWidth);
      const h = Math.max(200, container.clientHeight);
      renderer.setSize(w, h);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 40);

      // Somber high-contrast studio lighting so dark fur & chalk accessories pop from every angle
      const hemi = new THREE.HemisphereLight(0xe4e4f0, 0x16161c, 1.35);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(3.5, 5.2, 4.2);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xd4d4e8, 1.65);
      rimLight.position.set(-4.0, 3.2, -3.8);
      scene.add(rimLight);

      const fillLight = new THREE.DirectionalLight(0xa1a1b5, 0.75);
      fillLight.position.set(0, -1.5, 3.0);
      scene.add(fillLight);

      // Turntable pedestal with subtle railway aesthetic
      const pedestalGroup = new THREE.Group();
      const baseDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.18, 1.32, 0.16, 24),
        new THREE.MeshStandardMaterial({
          color: 0x18181e,
          roughness: 0.72,
          metalness: 0.35,
          flatShading: true,
        })
      );
      baseDisc.position.y = -0.08;
      pedestalGroup.add(baseDisc);

      const chalkRing = new THREE.Mesh(
        new THREE.RingGeometry(1.06, 1.14, 28),
        new THREE.MeshBasicMaterial({
          color: 0xe4e4ec,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        })
      );
      chalkRing.rotation.x = -Math.PI / 2;
      chalkRing.position.y = 0.005;
      pedestalGroup.add(chalkRing);

      // Two miniature iron rail bars across pedestal
      const railGeo = new THREE.BoxGeometry(0.08, 0.05, 1.95);
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x454552,
        roughness: 0.4,
        metalness: 0.8,
      });
      const railL = new THREE.Mesh(railGeo, railMat);
      railL.position.set(-0.46, 0.02, 0);
      const railR = new THREE.Mesh(railGeo, railMat);
      railR.position.set(0.46, 0.02, 0);
      pedestalGroup.add(railL, railR);

      scene.add(pedestalGroup);

      // Monkey model
      const rig = createMonkeyModel('leader', cosmetics);
      rigRef.current = rig;
      scene.add(rig.group);

      const updateSize = () => {
        if (!renderer || !container) return;
        const cw = Math.max(160, container.clientWidth);
        const ch = Math.max(160, container.clientHeight);
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch);
      };

      if (typeof ResizeObserver !== 'undefined') {
        resizeObs = new ResizeObserver(updateSize);
        resizeObs.observe(container);
      }

      let lastTs = performance.now();
      let idleT = 0;

      const animate = () => {
        if (disposed || !renderer || !scene) return;
        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
        lastTs = now;
        idleT += dt;

        if (!draggingRef.current) {
          if (Math.abs(yawVelRef.current) > 0.001) {
            targetYawRef.current += yawVelRef.current * dt;
            yawVelRef.current *= Math.exp(-5.5 * dt);
          } else if (autoSpinRef.current) {
            targetYawRef.current += dt * 0.55;
          }
        }

        const lerpAlpha = 1 - Math.exp(-12 * dt);
        yawRef.current += (targetYawRef.current - yawRef.current) * lerpAlpha;
        pitchRef.current += (targetPitchRef.current - pitchRef.current) * lerpAlpha;
        distRef.current += (targetDistRef.current - distRef.current) * lerpAlpha;

        // Subtle breathing & arm posture animation
        rig.bodyGroup.position.y = Math.sin(idleT * 2.1) * 0.025;
        rig.headGroup.rotation.y = Math.sin(idleT * 1.05) * 0.06;
        rig.leftArmPivot.rotation.x = Math.sin(idleT * 1.8) * 0.05;
        rig.rightArmPivot.rotation.x = -Math.sin(idleT * 1.8) * 0.05;

        const lookY = distRef.current < 3.2 ? 1.28 : 1.05;
        const horiz = Math.cos(pitchRef.current) * distRef.current;
        const camY = lookY + Math.sin(pitchRef.current) * distRef.current;

        camera.position.set(
          Math.sin(yawRef.current) * horiz,
          camY,
          Math.cos(yawRef.current) * horiz
        );
        camera.lookAt(0, lookY, 0);

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(animate);
      };

      rafId = requestAnimationFrame(animate);
      setWebglUnavailable(false);
    } catch {
      setWebglUnavailable(true);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      resizeObs?.disconnect();
      rigRef.current = null;
      if (scene) {
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        });
      }
      if (renderer) {
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, [lowDetail]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = e.pointerId;
    draggingRef.current = true;
    yawVelRef.current = 0;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    if (autoSpin) setAutoSpin(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || activePointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    const deltaYaw = -dx * 0.012;
    targetYawRef.current += deltaYaw;
    yawVelRef.current = deltaYaw * 42;
    targetPitchRef.current = Math.max(-0.36, Math.min(0.85, targetPitchRef.current + dy * 0.009));
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    draggingRef.current = false;
    activePointerIdRef.current = null;
  };

  const selectPreset = (preset: PresetAngle) => {
    setAutoSpin(false);
    yawVelRef.current = 0;
    // Normalize current yaw so shortest rotation to preset feels snappy
    const twoPi = Math.PI * 2;
    const currentMod = ((targetYawRef.current % twoPi) + twoPi) % twoPi;
    let diff = preset.yaw - currentMod;
    if (diff > Math.PI) diff -= twoPi;
    if (diff < -Math.PI) diff += twoPi;
    targetYawRef.current += diff;
    targetPitchRef.current = preset.pitch;
  };

  return (
    <div className="flex flex-col border border-zinc-800 bg-[#08080c] select-none">
      <div className="relative h-[235px] sm:h-[270px] w-full overflow-hidden bg-[radial-gradient(circle_at_center,#1b1b24_0%,#09090d_72%)]">
        <div
          ref={mountRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={(e) => {
            e.preventDefault();
            targetDistRef.current = Math.max(
              2.35,
              Math.min(5.2, targetDistRef.current + e.deltaY * 0.002)
            );
          }}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          aria-label="Visualização 3D do macaco — arraste para girar em qualquer ângulo"
        />

        {webglUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs font-mono-tabular text-zinc-400">
            Pré-visualização 3D indisponível neste dispositivo.
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 pointer-events-none">
          <span className="bg-[#08080a]/85 border border-zinc-800 px-2 py-1 text-[10px] font-mono-tabular uppercase tracking-wider text-zinc-300">
            Arraste para girar 360°
          </span>
          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={() => setZoomedIn((z) => !z)}
              title={zoomedIn ? 'Afastar câmera' : 'Aproximar câmera'}
              className={`p-1.5 border text-xs cursor-pointer transition-colors ${
                zoomedIn
                  ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                  : 'bg-[#0e0e14]/90 text-zinc-300 border-zinc-700 hover:border-zinc-400 hover:text-white'
              }`}
              aria-label={zoomedIn ? 'Afastar câmera' : 'Aproximar câmera'}
            >
              {zoomedIn ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                yawVelRef.current = 0;
                setAutoSpin((s) => !s);
              }}
              title={autoSpin ? 'Pausar rotação automática' : 'Girar automaticamente'}
              className={`p-1.5 border text-xs cursor-pointer transition-colors ${
                autoSpin
                  ? 'bg-[#f2f2f6] text-[#08080a] border-[#f2f2f6]'
                  : 'bg-[#0e0e14]/90 text-zinc-300 border-zinc-700 hover:border-zinc-400 hover:text-white'
              }`}
              aria-label={autoSpin ? 'Pausar rotação automática' : 'Girar automaticamente'}
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoSpin ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {previewLabel && (
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-2 bg-[#14141c]/95 border border-zinc-500 px-2.5 py-1.5">
            <span className="text-[11px] font-mono-tabular text-white truncate">
              Prévia: <strong>{previewLabel}</strong>
            </span>
            {onClearPreview && (
              <button
                type="button"
                onClick={onClearPreview}
                className="text-[10px] font-mono-tabular uppercase underline text-zinc-300 hover:text-white shrink-0 cursor-pointer"
              >
                Usar equipado
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick angle buttons */}
      <div className="grid grid-cols-4 border-t border-zinc-800 bg-[#0d0d12]">
        {ANGLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => selectPreset(preset)}
            className="py-2 text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-300 hover:bg-[#17171f] hover:text-white border-r last:border-r-0 border-zinc-800 cursor-pointer transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
