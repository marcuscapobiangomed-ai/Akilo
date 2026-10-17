import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { Sparkles, Activity, Dumbbell, Flame } from 'lucide-react-native';
import {
  MascotId,
  BodyMorphology,
  MascotCustomization,
  DEFAULT_TITA_CUSTOMIZATION,
  DEFAULT_GAIA_CUSTOMIZATION,
} from '../core/domain/avatarEngine';
import { ScaleAvatar3D } from './ScaleAvatar3D';

interface LivingAvatar3DProps {
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
  hideBubble?: boolean;
  initialSpeech?: string;
}

export const LivingAvatar3D: React.FC<LivingAvatar3DProps> = ({
  mascotId,
  weightKg,
  heightCm,
  bodyFatPct,
  muscleMassPct,
  morphology,
  customization,
  isInspecting = false,
  onInspectionTrigger,
  size = 230,
  simple = false,
  hideBubble = false,
  initialSpeech,
}) => {
  const isTita = mascotId === 'tita';
  const defaultCustom = isTita ? DEFAULT_TITA_CUSTOMIZATION : DEFAULT_GAIA_CUSTOMIZATION;
  const activeCustom: MascotCustomization = {
    eyeColor: customization?.eyeColor || defaultCustom.eyeColor,
    suitColor: customization?.suitColor || defaultCustom.suitColor,
    topColor: customization?.topColor || defaultCustom.topColor,
    sneakersColor: customization?.sneakersColor || defaultCustom.sneakersColor,
    hairColor: customization?.hairColor || defaultCustom.hairColor,
    skinTone: customization?.skinTone || defaultCustom.skinTone,
  };

  const speechBubbleAnim = useRef(new Animated.Value(initialSpeech ? 1 : 0)).current;
  const [activeSpeech, setActiveSpeech] = useState<string>(initialSpeech || '');
  const speechTimerRef = useRef<any>(null);

  useEffect(() => {
    if (initialSpeech) {
      setActiveSpeech(initialSpeech);
      speechBubbleAnim.setValue(1);
    }
  }, [initialSpeech]);

  const handlePress = () => {
    // Frase do Mascote com foco em academia e saúde
    const quotes = isTita
      ? [
          `Bora vencer a balança! Já estamos em ${weightKg.toFixed(1)}kg! 🏋️‍♂️`,
          'Sentiu essa força? Cada treino queima gordura e constrói armadura!',
          'A balança é a nossa arena. Disciplina hoje, shape de campeão amanhã!',
          'Ajustou a alimentação? Água e proteína pra manter a máquina acelerada!',
        ]
      : [
          `Cada vitória na balança conta! Peso atual: ${weightKg.toFixed(1)}kg! ✨`,
          'Meu shape é esculpido com treino limpo e constância diária!',
          'Leveza, postura e foco total nas nossas metas de hoje!',
          'A definição dos músculos nasce na constância de cada dia!',
        ];
    const pickedQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setActiveSpeech(pickedQuote);

    // Revela balão
    speechBubbleAnim.setValue(0);
    Animated.spring(speechBubbleAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Fecha após 4.5s
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => {
      Animated.timing(speechBubbleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setActiveSpeech(''));
    }, 4500);

    onInspectionTrigger?.();
  };

  const glowColor = morphology?.glowColor || (isTita ? '#22c55e' : '#10b981');

  return (
    <View style={[styles.outerContainer, { width: size, height: Math.round(size * 1.38) }]}>
      {/* 1. BALÃO DE FALA INTERATIVO */}
      {!hideBubble && activeSpeech ? (
        <Animated.View
          style={[
            styles.speechBubbleContainer,
            {
              opacity: speechBubbleAnim,
              transform: [
                {
                  scale: speechBubbleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  translateY: speechBubbleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.speechBubble, { borderColor: glowColor }]}>
            <View style={styles.bubbleHeader}>
              <Sparkles color="#facc15" size={13} />
              <Text style={[styles.bubbleSpeaker, { color: glowColor }]}>
                {isTita ? 'Titã 🏋️‍♂️' : 'Gaia ✨'}
              </Text>
            </View>
            <Text style={styles.bubbleText}>{activeSpeech}</Text>
          </View>
          <View style={[styles.bubbleTail, { borderTopColor: glowColor }]} />
        </Animated.View>
      ) : null}

      {/* 2. PALCO 3D REAL DA BALANÇA INTELIGENTE */}
      <ScaleAvatar3D
        mascotId={mascotId}
        weightKg={weightKg}
        heightCm={heightCm}
        bodyFatPct={bodyFatPct}
        muscleMassPct={muscleMassPct}
        morphology={morphology}
        customization={activeCustom}
        isInspecting={isInspecting}
        onInspectionTrigger={handlePress}
        size={size}
        simple={simple}
      />

      {/* 3. OVERLAY DE INSPEÇÃO COM MÉTRICAS FLUTUANTES QUANDO ATIVO */}
      {isInspecting && (
        <View style={styles.inspectMetricsOverlay} pointerEvents="none">
          <View style={[styles.inspectMetricPill, { borderColor: '#22c55e' }]}>
            <Dumbbell color="#22c55e" size={11} />
            <Text style={styles.inspectMetricPillText}>
              Massa Magra: {muscleMassPct ? `${muscleMassPct}%` : 'Em evolução'}
            </Text>
          </View>

          <View style={[styles.inspectMetricPill, { borderColor: '#eab308' }]}>
            <Flame color="#eab308" size={11} />
            <Text style={styles.inspectMetricPillText}>
              Gordura: {bodyFatPct ? `${bodyFatPct}%` : 'Queimando'}
            </Text>
          </View>

          <View style={[styles.inspectMetricPill, { borderColor: '#38bdf8' }]}>
            <Activity color="#38bdf8" size={11} />
            <Text style={styles.inspectMetricPillText}>
              Balança: {weightKg.toFixed(1)} kg
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  speechBubbleContainer: {
    position: 'absolute',
    top: -46,
    left: 8,
    right: 8,
    alignItems: 'center',
    zIndex: 40,
  },
  speechBubble: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  bubbleSpeaker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bubbleText: {
    fontSize: 11,
    color: '#f8fafc',
    fontWeight: '600',
    lineHeight: 15,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  inspectMetricsOverlay: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    zIndex: 35,
    paddingHorizontal: 8,
  },
  inspectMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  inspectMetricPillText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '700',
  },
});
