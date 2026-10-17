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
  const arm = clamp(m.armBulk, 0.75, 1.45);
  const leg = clamp(m.legBulk, 0.75, 1.40);
  const torso = clamp(m.torsoWidth, 0.80, 1.40);
  const belly = clamp(m.bellyVolume, 0.70, 1.65);
  const waist = clamp(m.waistWidth, 0.70, 1.45);

  root.traverse((o) => {
    if (o instanceof THREE.Bone) {
      if (!o.userData.__baseScale) o.userData.__baseScale = o.scale.clone();
      const base: THREE.Vector3 = o.userData.__baseScale;
      const n = o.name.toLowerCase();
      let factorX = 1;
      let factorZ = 1;
      let factorY = 1;

      if (/upperarm|lowerarm/.test(n)) {
        factorX = arm; factorZ = arm;
      } else if (/thigh|calf/.test(n)) {
        factorX = leg; factorZ = leg;
      } else if (/spine_03|chest/.test(n)) {
        factorX = torso; factorZ = torso;
      } else if (/spine_02/.test(n)) {
        factorX = belly; factorZ = belly;
      } else if (/spine_01|pelvis/.test(n)) {
        factorX = waist; factorZ = waist;
      }
      o.scale.set(base.x * factorX, base.y * factorY, base.z * factorZ);
    } else if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      // Variações corporais contínuas por bioimpedância (Shape Keys / Morph Targets)
      if (o.morphTargetInfluences && o.morphTargetDictionary) {
        const dict = o.morphTargetDictionary;
        if ('Fat_Belly' in dict) {
          o.morphTargetInfluences[dict['Fat_Belly']] = clamp((m.bellyVolume - 0.95) / 0.45, 0, 1);
        }
        if ('Muscle_Bulk' in dict) {
          o.morphTargetInfluences[dict['Muscle_Bulk']] = clamp((m.armBulk - 0.95) / 0.35, 0, 1);
        }
        if ('Slim_Waist' in dict) {
          o.morphTargetInfluences[dict['Slim_Waist']] = clamp((1.05 - m.waistWidth) / 0.30, 0, 1);
        }
      }
    }
  });
}

let cachedFabricNormal: THREE.DataTexture | null = null;
function getFabricNormalTexture(): THREE.DataTexture {
  if (cachedFabricNormal) return cachedFabricNormal;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const waveX = Math.sin((x / size) * Math.PI * 12);
      const waveY = Math.cos((y / size) * Math.PI * 12);
      const bump = waveX * waveY * 0.35;
      data[idx] = Math.round(128 + bump * 60);
      data[idx + 1] = Math.round(128 + bump * 60);
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  tex.needsUpdate = true;
  cachedFabricNormal = tex;
  return tex;
}

let cachedSoleNormal: THREE.DataTexture | null = null;
function getSoleNormalTexture(): THREE.DataTexture {
  if (cachedSoleNormal) return cachedSoleNormal;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const d = ((x % 8) - 4) * ((y % 8) - 4);
      const bump = Math.sin(d * 0.5) * 0.45;
      data[idx] = Math.round(128 + bump * 70);
      data[idx + 1] = Math.round(128 + bump * 70);
      data[idx + 2] = 230;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.needsUpdate = true;
  cachedSoleNormal = tex;
  return tex;
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
        } else if (/gym_top/i.test(name)) {
          const topColor = custom.topColor || custom.suitColor;
          if (topColor) mat.color.setStyle(topColor);
        } else if (/sneaker_upper/i.test(name) && custom.sneakersColor) {
          mat.color.setStyle(custom.sneakersColor);
        } else if (/hair/i.test(name) && custom.hairColor) {
          mat.color.setStyle(custom.hairColor);
        } else if (/eyes/i.test(name) && custom.eyeColor) {
          mat.color.setStyle(custom.eyeColor);
        } else if (/superhero/i.test(name) && custom.skinTone && custom.skinTone !== '#fde68a') {
          mat.color.setStyle(custom.skinTone);
        }
        mat.needsUpdate = true;
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
    const viewHeight = Math.round(size * 1.38);
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

    // Enquadramento de Corpo Inteiro Perfeito (Head-to-Toe) com Respiro Superior Nobre
    // Modelo altura 1.85m com respiração, postura ereta e balança na base
    // Câmera Z=5.05 e FOV 34° com alvo em Y=0.92 centraliza perfeitamente o personagem dentro do círculo
    const aspect = viewWidth / viewHeight;
    const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 50);
    camera.position.set(0, 0.96, 5.05);
    camera.lookAt(0, 0.92, 0);

    // Rig Fotográfico 3-Pontos Estúdio Esportivo
    // 1. Hemisphere Light (Gradiente céu esportivo frio -> piso escuro)
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x052e16, 0.75);
    scene.add(hemi);

    // 2. Luz Principal Quente (Key Light) com sombras suaves
    const dir = new THREE.DirectionalLight(0xfffaed, 2.5);
    dir.position.set(2.4, 4.2, 3.4);
    dir.castShadow = true;
    dir.shadow.mapSize.set(512, 512);
    dir.shadow.camera.far = 10;
    dir.shadow.bias = -0.001;
    scene.add(dir);

    // 3. Luz de Preenchimento (Fill Light) para suavizar sombras do torso
    const dir2 = new THREE.DirectionalLight(0x93c5fd, 0.7);
    dir2.position.set(-2.6, 2.0, 1.8);
    scene.add(dir2);

    // 4. Luz de Contorno Atlética (Rim Backlight) destacando ombros, trapézio e silhueta
    const rim = new THREE.DirectionalLight(morphology.glowColor, 2.6);
    rim.position.set(0, 3.2, -3.2);
    scene.add(rim);

    // 5. Luz de Bioimpedância da Balança
    const point = new THREE.PointLight(morphology.glowColor, 5, 5);
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
      // Alinha os pés com precisão absoluta sobre o centro da balança circular
      model.position.set(0, 0, mascotId === 'gaia' ? 0.076 : 0.0875);
      applyMorphology(model, morphology);
      if (customization) {
        applyCustomization(model, customization, mascotId);
      }

      // Calibração PBR de Alta Fidelidade: Microtexturas de Compressão, Tênis e Especularidade
      const fabricNormal = getFabricNormalTexture();
      const soleNormal = getSoleNormalTexture();

      model.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material) {
          const isVisor = /visor/i.test(o.name);
          const materials = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of materials) {
            const mat = m as THREE.MeshStandardMaterial;
            const matName = (mat.name || o.name || '').toLowerCase();

            if (isVisor) {
              mat.color.setStyle(morphology.glowColor);
              mat.emissive.setStyle(morphology.glowColor);
              mat.emissiveIntensity = 0.6;
              mat.metalness = 0.8;
              mat.roughness = 0.2;
            } else if (/gym_shorts|gym_top/i.test(matName)) {
              // Tecido de compressão atlético tipo Lycra/Under Armour com micro-trama
              mat.normalMap = fabricNormal;
              mat.normalScale = new THREE.Vector2(0.4, 0.4);
              mat.roughness = 0.58;
              mat.metalness = 0.04;
            } else if (/sneaker_sole/i.test(matName)) {
              // Solado esportivo com piso de tração
              mat.normalMap = soleNormal;
              mat.normalScale = new THREE.Vector2(0.6, 0.6);
              mat.roughness = 0.85;
              mat.metalness = 0.02;
            } else if (/sneaker_upper/i.test(matName)) {
              mat.roughness = 0.45;
              mat.metalness = 0.08;
            } else if (/hair/i.test(matName)) {
              // Cabelo atlético com reflexo sedoso e disciplinado
              mat.roughness = 0.42;
              mat.metalness = 0.03;
            } else if (/eyes/i.test(matName)) {
              // Córnea vítrea com alto reflexo especular
              mat.roughness = 0.12;
              mat.metalness = 0.15;
            } else if (mat.map) {
              // Pele com normal maps anatômicos preservados
              mat.color.setHex(0xffffff);
              mat.metalness = 0.04;
              mat.roughness = 0.52;
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
        // Remove tracks de escala que sobrepõem e anulam a deformação de bioimpedância a 60 FPS
        idleClip.tracks = idleClip.tracks.filter((t) => !t.name.includes('.scale'));
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
  const viewHeight = Math.round(size * 1.38);

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
    bottom: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(4, 13, 9, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
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
