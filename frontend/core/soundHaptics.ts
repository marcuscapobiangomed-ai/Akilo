/**
 * soundHaptics.ts
 * Motor sensorial unificado de áudio (SFX) e resposta tátil (Haptics)
 * para a balança inteligente 3D, gestos 360°, cerimônia de bioimpedância e interface.
 * 
 * - 100% Autônomo: Não depende de downloads de MP3s externos ou rede.
 * - Suporta iOS, Android e Web com fallbacks automáticos e fail-safe.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

// Gera dados WAV mono 16-bit PCM em base64 diretamente em memória
function generateToneWavUri(
  frequencies: number | number[],
  durationSec: number = 0.12,
  sampleRate: number = 22050,
  arpeggio: boolean = false
): string {
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF Chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, 1, true);  // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const freqArray = Array.isArray(frequencies) ? frequencies : [frequencies];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Envelope suave de ataque e decaimento exponencial
    const progress = i / numSamples;
    const envelope = Math.max(0, 1 - progress);

    if (arpeggio && freqArray.length > 1) {
      // Arpejo sequencial de vitória
      const segment = Math.min(
        freqArray.length - 1,
        Math.floor(progress * freqArray.length)
      );
      const currentFreq = freqArray[segment];
      const segProgress = (progress * freqArray.length) % 1;
      const segEnvelope = Math.sin(Math.PI * Math.min(1, segProgress * 1.5));
      sample = Math.sin(2 * Math.PI * currentFreq * t) * segEnvelope;
    } else {
      for (const f of freqArray) {
        sample += Math.sin(2 * Math.PI * f * t) * (1 / freqArray.length);
      }
    }

    const val = Math.floor(sample * envelope * 0.7 * 32767);
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, val)), true);
  }

  // Converte buffer para base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// URIs pré-computadas para latência zero
const SOUND_URIS = {
  // Bip sutil de varredura do odômetro da balança (880Hz, 40ms)
  scanTick: generateToneWavUri(880, 0.04),
  // Tom duplo de trava da balança inteligente (C6 1046Hz + E6 1318Hz, 180ms)
  scaleLock: generateToneWavUri([1046.5, 1318.5], 0.22),
  // Arpejo ascendente de vitória e revelação de badges (C5, E5, G5, C6, 420ms)
  victoryChime: generateToneWavUri([523.25, 659.25, 783.99, 1046.5], 0.45, 22050, true),
  // Clique leve de botão e seleção de customização (600Hz, 30ms)
  tap: generateToneWavUri(600, 0.03),
};

// Cache de instâncias de áudio no Expo AV
let soundsLoaded = false;
const loadedSounds: Record<string, Audio.Sound | null> = {
  scanTick: null,
  scaleLock: null,
  victoryChime: null,
  tap: null,
};

// Inicialização segura de áudio
async function ensureSoundsInitialized() {
  if (soundsLoaded) return;
  try {
    if (Platform.OS !== 'web') {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    }

    const entries = Object.entries(SOUND_URIS) as [keyof typeof SOUND_URIS, string][];
    for (const [key, uri] of entries) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { volume: key === 'scanTick' ? 0.35 : 0.85, shouldPlay: false }
        );
        loadedSounds[key] = sound;
      } catch (err) {
        // Fallback silencioso se o dispositivo rejeitar
      }
    }
    soundsLoaded = true;
  } catch (e) {
    // Falha silenciosa de áudio
  }
}

// Toca som pelo Expo AV ou Web Audio API
async function playSound(key: keyof typeof SOUND_URIS, volume: number = 1.0) {
  try {
    // 1. No Web, podemos usar Audio elemento ou Web Audio
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      try {
        const audio = new (window as any).Audio(SOUND_URIS[key]);
        audio.volume = Math.min(1, Math.max(0, (key === 'scanTick' ? 0.25 : 0.75) * volume));
        audio.play().catch(() => {});
        return;
      } catch {
        // Fallback para expo-av
      }
    }

    // 2. Em dispositivos nativos (iOS / Android)
    if (!soundsLoaded) {
      await ensureSoundsInitialized();
    }

    const sound = loadedSounds[key];
    if (sound) {
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(Math.min(1, Math.max(0, (key === 'scanTick' ? 0.35 : 0.85) * volume)));
      await sound.playAsync();
    } else {
      // Criação sob demanda se não estava no cache
      const { sound: freshSound } = await Audio.Sound.createAsync(
        { uri: SOUND_URIS[key] },
        { volume: key === 'scanTick' ? 0.35 : 0.85, shouldPlay: true }
      );
      loadedSounds[key] = freshSound;
    }
  } catch {
    // Proteção total contra quebra de runtime
  }
}

// Controle de Throttling para Haptics de rotação contínua
let lastTickTime = 0;
const TICK_THROTTLE_MS = 55; // Limita disparos hápticos para sensação suave sem congestionar o sistema

export const soundHaptics = {
  // Inicialização prévia opcional (ex: ao montar a tela ou abrir a cerimônia)
  preload: async () => {
    await ensureSoundsInitialized();
  },

  // 1. Haptics de Rotação Tátil 360° da Balança
  triggerRotationTick: async () => {
    const now = performance.now();
    if (now - lastTickTime < TICK_THROTTLE_MS) return;
    lastTickTime = now;

    try {
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignora erro se não suportado
    }
  },

  // 2. Toque Leve em Botões de Troca de Roupa / Categoria
  triggerLightTap: async (withSound = true) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (withSound) {
        playSound('tap', 0.5);
      }
    } catch {}
  },

  // 3. Toque Médio em Botão de Inspeção Corporal / Confirmação
  triggerMediumTap: async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      playSound('tap', 0.8);
    } catch {}
  },

  // 4. Balança Inteligente: Bip Digital da Varredura / Odômetro
  triggerScaleScanTick: async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
      playSound('scanTick', 0.3);
    } catch {}
  },

  // 5. Balança Inteligente: Trava de Peso Cravado ("Weight Lock")
  triggerScaleLock: async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
      playSound('scaleLock', 1.0);
    } catch {}
  },

  // 6. Cerimônia de Bioimpedância: Celebração, Badges e Salto
  triggerCelebration: async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Pulso secundário
        setTimeout(async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } catch {}
        }, 220);
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 80, 50, 80, 100]);
      }
      playSound('victoryChime', 1.0);
    } catch {}
  },
};
