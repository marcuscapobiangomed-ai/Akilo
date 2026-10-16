import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { MascotId, BodyMorphology, MascotCustomization } from '../core/domain/avatarEngine';
import { soundHaptics } from '../core/soundHaptics';

interface ScaleAvatar3DProps {
  mascotId: MascotId;
  weightKg: number;
  heightCm: number;
  bodyFatPct?: number | null;
  muscleMassPct?: number | null;
  morphology: BodyMorphology;
  customization?: Partial<MascotCustomization> | null;
  isInspecting?: boolean;
  onInspectionTrigger?: () => void;
  size?: number;
  simple?: boolean;
}

const MODEL_SRC: Record<MascotId, number> = {
  tita: require('../assets/models/Tita.glb'),
  gaia: require('../assets/models/Michelle.glb'),
};

const IDLE_CLIP: Record<MascotId, string> = { tita: 'Idle', gaia: 'Idle' };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

async function loadGLB(moduleId: number): Promise<ArrayBuffer> {
  const asset = Asset.fromModule(moduleId);

  // Na Web (PC, Safari, Chrome), faz o download direto via HTTP fetch
  if (Platform.OS === 'web') {
    const uri = asset.uri || (asset as any).localUri || (typeof moduleId === 'string' ? moduleId : '');
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`Falha ao baixar GLB na Web (HTTP ${res.status}): ${uri}`);
    }
    return await res.arrayBuffer();
  }

  // No Mobile (iOS / Android)
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return Buffer.from(base64, 'base64').buffer;
  } catch {
    const res = await fetch(uri);
    return await res.arrayBuffer();
  }
}

function buildPlatform(glowColor: string): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.13, 48),
    new THREE.MeshStandardMaterial({ color: '#1e3a2f', metalness: 0.35, roughness: 0.65 })
  );
  base.receiveShadow = true;
  group.add(base);

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.015, 48),
    new THREE.MeshStandardMaterial({ color: '#2d5a42', metalness: 0.6, roughness: 0.4 })
  );
  plate.position.y = 0.067;
  plate.receiveShadow = true;
  group.add(plate);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.012, 12, 72),
    new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.8 })
  );
  ring.position.y = 0.078;
  ring.rotation.x = -Math.PI / 2;
  ring.name = 'ledRing';
  group.add(ring);

  for (const x of [-0.36, 0.36]) {
    for (const z of [-0.3, 0.3]) {
      const electrode = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20),
        new THREE.MeshStandardMaterial({ color: '#9ca3af', metalness: 0.85, roughness: 0.2 })
      );
      electrode.position.set(x, 0.085, z);
      group.add(electrode);
    }
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.92, 48),
    new THREE.MeshBasicMaterial({ color: '#040d09', transparent: true, opacity: 0.65 })
  );
  shadow.position.y = -0.065;
  shadow.rotation.x = -Math.PI / 2;
  group.add(shadow);

  return group;
}

function applyMorphology(root: THREE.Object3D, m: BodyMorphology): void {
  const arm = clamp(m.armBulk, 0.8, 1.3);
  const leg = clamp(m.legBulk, 0.8, 1.25);
  const torso = clamp(m.torsoWidth, 0.85, 1.25);
  const belly = clamp(m.bellyVolume, 0.85, 1.2);
  const waist = clamp(m.waistWidth, 0.85, 1.25);

  root.traverse((o) => {
    if (o instanceof THREE.Bone) {
      if (!o.userData.__baseScale) o.userData.__baseScale = o.scale.clone();
      const base: THREE.Vector3 = o.userData.__baseScale;
      const n = o.name.toLowerCase();
      let factor = 1;
      if (/upperarm|lowerarm|hand|clavicle|leftarm|rightarm|leftforearm|rightforearm|lefthand|righthand|shoulder/.test(n)) {
        factor = arm;
      } else if (/thigh|calf|foot|ball|upleg|leftleg|rightleg|toebase|toeend/.test(n)) {
        factor = leg;
      } else if (/spine_03|spine2|chest|neck/.test(n)) {
        factor = torso;
      } else if (/spine_02|spine1/.test(n)) {
        factor = belly;
      } else if (/spine_01|spine$|pelvis/.test(n)) {
        factor = waist;
      }
      o.scale.copy(base).multiplyScalar(factor);
    } else if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      // Variações corporais contínuas por bioimpedância (Shape Keys / Morph Targets)
      if (o.morphTargetInfluences && o.morphTargetDictionary) {
        const dict = o.morphTargetDictionary;
        if ('Fat_Belly' in dict) {
          o.morphTargetInfluences[dict['Fat_Belly']] = clamp((m.bellyVolume - 0.9) / 0.3, 0, 1);
        }
        if ('Muscle_Bulk' in dict) {
          o.morphTargetInfluences[dict['Muscle_Bulk']] = clamp((m.armBulk - 0.9) / 0.35, 0, 1);
        }
        if ('Slim_Waist' in dict) {
          o.morphTargetInfluences[dict['Slim_Waist']] = clamp((1.1 - m.waistWidth) / 0.3, 0, 1);
        }
      }
    }
  });
}

function applyCustomization(root: THREE.Object3D, custom?: Partial<MascotCustomization> | null, mascotId?: MascotId): void {
  if (!custom) return;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material) {
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of materials) {
        const mat = m as THREE.MeshStandardMaterial;
        const name = (mat.name || o.name || '').toLowerCase();
        if (/gym_shorts/i.test(name) && custom.suitColor) {
          mat.color.setStyle(custom.suitColor);
          mat.needsUpdate = true;
        } else if (/gym_top/i.test(name)) {
          const topColor = custom.topColor || custom.suitColor;
          if (topColor) {
            mat.color.setStyle(topColor);
            mat.needsUpdate = true;
          }
        } else if (/sneaker_upper/i.test(name) && custom.sneakersColor) {
          mat.color.setStyle(custom.sneakersColor);
          mat.needsUpdate = true;
        } else if (/eyes/i.test(name) && custom.eyeColor) {
          mat.color.setStyle(custom.eyeColor);
          mat.needsUpdate = true;
        }
      }
    }
  });
}

function findBone(root: THREE.Object3D, pattern: RegExp): THREE.Bone | undefined {
  let found: THREE.Bone | undefined;
  root.traverse((o) => {
    if (!found && o instanceof THREE.Bone && pattern.test(o.name)) found = o;
  });
  return found;
}

export function ScaleAvatar3D({
  mascotId,
  weightKg,
  heightCm,
  bodyFatPct,
  muscleMassPct,
  morphology,
  customization,
  isInspecting = false,
  onInspectionTrigger,
  size = 260,
  simple = false,
}: ScaleAvatar3DProps) {
  const [loaded, setLoaded] = useState(false);
  const isMountedRef = useRef(true);
  const isInspectingRef = useRef(isInspecting);
  const onTriggerRef = useRef(onInspectionTrigger);
  const inspectP = useRef(0);
  const heightFactor = useRef(clamp(heightCm / 175, 0.9, 1.1));

  const modelRef = useRef<THREE.Group | null>(null);
  const ledRingRef = useRef<THREE.Mesh | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);
  const scanRingsRef = useRef<THREE.Mesh[]>([]);
  const charGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number>(0);

  // 360° Touch Drag Turntable
  const userRotationY = useRef(0);
  const rotationVelocity = useRef(0);
  const isDragging = useRef(false);
  const lastDragX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
      onPanResponderGrant: (_, g) => {
        isDragging.current = true;
        lastDragX.current = g.x0;
        rotationVelocity.current = 0;
      },
      onPanResponderMove: (_, g) => {
        const dx = g.moveX - lastDragX.current;
        lastDragX.current = g.moveX;
        userRotationY.current += dx * 0.018;
        rotationVelocity.current = dx * 0.018;
        if (Math.abs(dx) > 1.2) {
          soundHaptics.triggerRotationTick();
        }
      },
      onPanResponderRelease: (_, g) => {
        isDragging.current = false;
        if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
          soundHaptics.triggerMediumTap();
          onTriggerRef.current?.();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sceneRef.current) {
        sceneRef.current.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry?.dispose();
            if (Array.isArray(o.material)) {
              o.material.forEach((m) => m.dispose());
            } else if (o.material) {
              o.material.dispose();
            }
          }
        });
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => { isInspectingRef.current = isInspecting; }, [isInspecting]);
  useEffect(() => { onTriggerRef.current = onInspectionTrigger; }, [onInspectionTrigger]);
  useEffect(() => { heightFactor.current = clamp(heightCm / 175, 0.9, 1.1); }, [heightCm]);

  // Reatividade em tempo real: deforma o corpo no modelo 3D ao vivo
  useEffect(() => {
    if (modelRef.current) {
      applyMorphology(modelRef.current, morphology);
    }
    if (ledRingRef.current && morphology.glowColor) {
      (ledRingRef.current.material as THREE.MeshBasicMaterial).color.setStyle(morphology.glowColor);
    }
    if (pointLightRef.current && morphology.glowColor) {
      pointLightRef.current.color.setStyle(morphology.glowColor);
    }
    scanRingsRef.current.forEach((r) => {
      if (r.material && morphology.glowColor) {
        (r.material as THREE.MeshBasicMaterial).color.setStyle(morphology.glowColor);
      }
    });
  }, [morphology]);

  // Reatividade em tempo real: atualiza cores de personalização ao vivo
  useEffect(() => {
    if (modelRef.current && customization) {
      applyCustomization(modelRef.current, customization, mascotId);
    }
  }, [customization, mascotId]);

  const onContextCreate = async (gl: WebGLRenderingContext) => {
    const isWeb = Platform.OS === 'web';
    const viewWidth = size;
    const viewHeight = Math.round(size * 1.28);
    const pixelRatio = isWeb && typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, 2)
      : 1;

    const renderer = new Renderer({
      gl,
      antialias: true,
      alpha: true,
      width: viewWidth,
      height: viewHeight,
    });
    renderer.setSize(viewWidth, viewHeight, true);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0); // 100% transparente para fundir organicamente com o card
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    if (isWeb && (gl as any)?.canvas) {
      const canvas = (gl as any).canvas as HTMLCanvasElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.backgroundColor = 'transparent';
      canvas.style.display = 'block';
    }

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Enquadramento de Corpo Inteiro Perfeito (Head-to-Toe)
    // Modelo altura 1.85, base da balança em Y=0.
    // FOV 35° a Z=3.85 centraliza de -0.15 a 2.05 no eixo vertical com aspecto 1/1.28
    const aspect = viewWidth / viewHeight;
    const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 50);
    camera.position.set(0, 1.08, 3.85);
    camera.lookAt(0, 0.92, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 3.0);
    dir.position.set(2.5, 4.5, 3.5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(512, 512);
    dir.shadow.camera.far = 10;
    dir.shadow.bias = -0.001;
    scene.add(dir);

    const dir2 = new THREE.DirectionalLight(0xa7f3d0, 1.0);
    dir2.position.set(-2.5, 2.0, -1.5);
    scene.add(dir2);

    const rim = new THREE.DirectionalLight(morphology.glowColor, 1.5);
    rim.position.set(0, 3.0, -3.0);
    scene.add(rim);

    const point = new THREE.PointLight(morphology.glowColor, 6, 6);
    point.position.set(0, 2.2, 0);
    scene.add(point);
    pointLightRef.current = point;

    const platform = buildPlatform(morphology.glowColor);
    scene.add(platform);
    const ledRing = platform.getObjectByName('ledRing') as THREE.Mesh | undefined;
    if (ledRing) ledRingRef.current = ledRing;

    const scanGroup = new THREE.Group();
    scene.add(scanGroup);
    const scanRings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.012, 12, 64),
        new THREE.MeshBasicMaterial({ color: morphology.glowColor, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
      );
      r.rotation.x = -Math.PI / 2;
      r.visible = false;
      scanRings.push(r);
      scanGroup.add(r);
    }
    scanRingsRef.current = scanRings;

    const charGroup = new THREE.Group();
    charGroup.position.y = 0.065;
    scene.add(charGroup);
    charGroupRef.current = charGroup;

    const bodyGroup = new THREE.Group();
    bodyGroup.rotation.y = 0;
    charGroup.add(bodyGroup);

    try {
      // 1. Carrega modelo GLTF/GLB
      const arrayBuffer = await loadGLB(MODEL_SRC[mascotId]);
      if (!isMountedRef.current) return;

      const loader = new GLTFLoader();
      loader.setResourcePath('');
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.parse(arrayBuffer, '', resolve, (err) => {
          resolve(err);
        });
      });
      if (!isMountedRef.current) return;

      const model = gltf.scene as THREE.Group;
      modelRef.current = model;
      applyMorphology(model, morphology);
      if (customization) {
        applyCustomization(model, customization, mascotId);
      }

      // Preserva e otimiza os materiais PBR originais do GLB (roupas de academia, tênis, pele e cabelo)
      model.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material) {
          const isVisor = /visor/i.test(o.name);
          const materials = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of materials) {
            const mat = m as THREE.MeshStandardMaterial;
            if (isVisor) {
              mat.color.setStyle(morphology.glowColor);
              mat.emissive.setStyle(morphology.glowColor);
              mat.emissiveIntensity = 0.6;
              mat.metalness = 0.8;
              mat.roughness = 0.2;
            } else if (mat.map) {
              mat.color.setHex(0xffffff);
              mat.metalness = Math.min(0.1, mat.metalness ?? 0.05);
              mat.roughness = Math.max(0.4, mat.roughness ?? 0.5);
            }
            mat.needsUpdate = true;
          }
        }
      });
      bodyGroup.add(model);

      const clips = (gltf.animations || []) as THREE.AnimationClip[];
      const idleClip = clips.find((c) => c.name === IDLE_CLIP[mascotId]) || clips.find((c) => !/t-?pose/i.test(c.name));
      let mixer: THREE.AnimationMixer | null = null;
      if (idleClip) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(idleClip).play();
      }
      setLoaded(true);

      let scanT = 0;
      let lastTime = 0;
      const render = () => {
        if (!isMountedRef.current) return;
        rafRef.current = requestAnimationFrame(render);
        const now = performance.now() / 1000;
        const dt = lastTime ? Math.min(0.1, now - lastTime) : 0.016;
        lastTime = now;
        const t = now;

        if (mixer) mixer.update(dt);

        const inspecting = isInspectingRef.current;
        inspectP.current += ((inspecting ? 1 : 0) - inspectP.current) * Math.min(1, dt * 4);
        const p = inspectP.current;

        const breath = 1 + Math.sin(t * 2) * 0.015 * morphology.bellyVolume;
        bodyGroup.scale.setScalar(heightFactor.current * breath);

        // Inércia de rotação táctil e mesa giratória 360°
        if (!isDragging.current) {
          rotationVelocity.current *= 0.92;
          userRotationY.current += rotationVelocity.current;
          if (Math.abs(rotationVelocity.current) > 0.025) {
            soundHaptics.triggerRotationTick();
          }
        }

        if (inspecting) {
          charGroup.rotation.y += dt * 1.1;
          userRotationY.current = charGroup.rotation.y;
        } else {
          charGroup.rotation.y = userRotationY.current;
        }

        // Modificações nos ossos aplicadas exclusivamente durante inspeção (sem congelar a animação idle)
        if (p > 0.005) {
          const head = findBone(model, /head$/i);
          if (head) {
            head.rotation.x -= 0.35 * p;
          }
          if (mascotId === 'tita') {
            const la = findBone(model, /leftarm$/i);
            if (la) {
              la.rotation.x -= 0.7 * p;
              la.rotation.z += 0.4 * p;
            }
            const ra = findBone(model, /rightarm$/i);
            if (ra) {
              ra.rotation.x -= 0.7 * p;
              ra.rotation.z -= 0.4 * p;
            }
          }
        }

        if (ledRing) {
          ledRing.rotation.z = t * 0.4;
          const mat = ledRing.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.55 + Math.sin(t * 3) * 0.3;
        }

        if (inspecting && !simple) {
          scanT = (scanT + dt * 0.45) % 1;
          scanRings.forEach((r, i) => {
            const rp = (scanT + i / 3) % 1;
            r.visible = true;
            r.position.y = 0.1 + rp * 1.75;
            (r.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.sin(rp * Math.PI);
          });
        } else {
          scanRings.forEach((r) => { r.visible = false; });
        }

        renderer.render(scene, camera);
        if (typeof (gl as any)?.endFrameEXP === 'function') {
          (gl as any).endFrameEXP();
        }
      };
      render();
    } catch (err) {
      console.warn('[Scale3D] load error:', err);
    }
  };

  const showQuote = isInspecting && !simple;

  const viewWidth = size;
  const viewHeight = Math.round(size * 1.28);

  return (
    <View
      style={{
        width: viewWidth,
        height: viewHeight,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
      {...panResponder.panHandlers}
    >
      <GLView
        key={`${mascotId}-${size}`}
        style={StyleSheet.absoluteFillObject}
        onContextCreate={onContextCreate}
      />

      <View pointerEvents="none" style={styles.weightBadge}>
        <Text style={[styles.weightText, { color: morphology.glowColor }]}>
          {weightKg.toFixed(1)} kg
        </Text>
      </View>

      {showQuote && (
        <View pointerEvents="none" style={styles.quoteBubble}>
          <Text style={styles.quoteText}>{morphology.inspectionQuote}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  weightBadge: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: 'rgba(4, 13, 9, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  weightText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  quoteBubble: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    maxWidth: '92%',
    backgroundColor: 'rgba(3, 12, 9, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quoteText: {
    color: '#e5e7eb',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});
