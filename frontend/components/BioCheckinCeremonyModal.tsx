import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import {
  Sparkles,
  Zap,
  TrendingDown,
  TrendingUp,
  Flame,
  Shield,
  Activity,
  CheckCircle2,
  X,
  Award,
  Crown,
  Scale,
  Share2,
} from 'lucide-react-native';
import { BioReactionResult, BioDeltaBadge } from '../core/domain/bioReactionEngine';
import { getMascotImage } from '../assets/avatars';
import { ScaleAvatar3D } from './ScaleAvatar3D';
import { soundHaptics } from '../core/soundHaptics';
import ShapeVictoryCardModal from './ShapeVictoryCardModal';

interface BioCheckinCeremonyModalProps {
  visible: boolean;
  onClose: () => void;
  reactionResult: BioReactionResult | null;
  onContinue?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function BioCheckinCeremonyModal({
  visible,
  onClose,
  reactionResult,
  onContinue,
}: BioCheckinCeremonyModalProps) {
  if (!reactionResult) return null;

  // Animações Sequenciais da Cerimônia
  const ceremonyStep = useRef(new Animated.Value(0)).current; // 0: entrada, 1: odometro, 2: scan, 3: badges, 4: speech
  const scalePulseAnim = useRef(new Animated.Value(1)).current;
  const laserY = useRef(new Animated.Value(0)).current;
  const laserOpacity = useRef(new Animated.Value(0)).current;
  const badgeOpacities = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const badgeTranslates = useRef([
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
  ]).current;
  const speechCardAnim = useRef(new Animated.Value(0)).current;
  const speechCardY = useRef(new Animated.Value(30)).current;
  const levelUpFlash = useRef(new Animated.Value(0)).current;
  const mascotBounce = useRef(new Animated.Value(0)).current;

  // Estado do odômetro numérico
  const [odometerWeight, setOdometerWeight] = useState<number>(
    reactionResult.weightDeltaKg !== 0
      ? reactionResult.currentWeightKg - reactionResult.weightDeltaKg
      : reactionResult.currentWeightKg
  );
  const [animationFinished, setAnimationFinished] = useState(false);
  const [showVictoryCard, setShowVictoryCard] = useState(false);

  useEffect(() => {
    if (!visible || !reactionResult) return;

    setAnimationFinished(false);
    ceremonyStep.setValue(0);
    laserOpacity.setValue(0);
    laserY.setValue(0);
    speechCardAnim.setValue(0);
    speechCardY.setValue(30);
    levelUpFlash.setValue(0);
    badgeOpacities.forEach((o) => o.setValue(0));
    badgeTranslates.forEach((t) => t.setValue(20));

    const targetWeight = reactionResult.currentWeightKg;
    const startWeight = reactionResult.weightDeltaKg !== 0
      ? targetWeight - reactionResult.weightDeltaKg
      : targetWeight;

    setOdometerWeight(startWeight);

    // Loop de pulso do eletrodo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scalePulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scalePulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 1. Etapa: Odômetro girando (duração 1.2s)
    let currentStep = 0;
    const totalSteps = 24;
    const intervalTime = 1200 / totalSteps;
    const weightStep = (targetWeight - startWeight) / totalSteps;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= totalSteps) {
        setOdometerWeight((prev) => +(prev + weightStep).toFixed(1));
        if (currentStep % 4 === 0) {
          soundHaptics.triggerScaleScanTick();
        }
      } else {
        clearInterval(timer);
        setOdometerWeight(targetWeight);
        soundHaptics.triggerScaleLock();

        // Salto do mascote ao travar o peso
        Animated.sequence([
          Animated.timing(mascotBounce, {
            toValue: -16,
            duration: 180,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(mascotBounce, {
            toValue: 0,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();

        // 2. Etapa: Laser de Bioimpedância (duração 1.0s)
        Animated.sequence([
          Animated.timing(laserOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(laserY, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(laserOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // 3. Etapa: Badges Flutuantes em Cascata
          const badgeAnims = reactionResult.badges.slice(0, 4).map((_, i) =>
            Animated.parallel([
              Animated.timing(badgeOpacities[i], {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
              }),
              Animated.spring(badgeTranslates[i], {
                toValue: 0,
                friction: 6,
                tension: 70,
                useNativeDriver: true,
              }),
            ])
          );

          Animated.stagger(120, badgeAnims).start(() => {
            soundHaptics.triggerCelebration();

            // 4. Etapa: Flash de Level Up de Shape (se evoluiu)
            if (reactionResult.evolution.evolved) {
              Animated.sequence([
                Animated.timing(levelUpFlash, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(levelUpFlash, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: true,
                }),
              ]).start();
            }

            // 5. Etapa: Balão de Fala e Próxima Ação
            Animated.parallel([
              Animated.timing(speechCardAnim, {
                toValue: 1,
                duration: 350,
                useNativeDriver: true,
              }),
              Animated.spring(speechCardY, {
                toValue: 0,
                friction: 7,
                tension: 60,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setAnimationFinished(true);
            });
          });
        });
      }
    }, intervalTime);

    return () => {
      clearInterval(timer);
      pulseLoop.stop();
    };
  }, [visible, reactionResult]);

  const handleSkipOrFinish = () => {
    soundHaptics.triggerLightTap(false);
    setOdometerWeight(reactionResult.currentWeightKg);
    speechCardAnim.setValue(1);
    speechCardY.setValue(0);
    badgeOpacities.forEach((o) => o.setValue(1));
    badgeTranslates.forEach((t) => t.setValue(0));
    setAnimationFinished(true);
  };

  const handleDismiss = () => {
    soundHaptics.triggerMediumTap();
    onClose();
    if (onContinue) onContinue();
  };

  const laserTranslateY = laserY.interpolate({
    inputRange: [0, 1],
    outputRange: [180, -20],
  });

  const mascotAsset = getMascotImage(reactionResult.evolution.morphologyAssetKey);
  const flameBadge = reactionResult.badges.find((b) => b.icon === 'flame');
  const fatBadge = reactionResult.badges.find((b) => b.label.includes('Gordura'));
  const muscleBadge = reactionResult.badges.find((b) => b.label.includes('Massa'));
  const tapeBadge = reactionResult.badges.find((b) => b.icon === 'tape');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        {/* Flash de Metamorfose de Shape */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashOverlay,
            {
              opacity: levelUpFlash,
              backgroundColor: reactionResult.accentColor,
            },
          ]}
        />

        {/* Header com Botão Fechar / Pular */}
        <View style={styles.headerRow}>
          <View style={styles.ceremonyBadge}>
            <Sparkles color={reactionResult.accentColor} size={14} />
            <Text style={[styles.ceremonyBadgeText, { color: reactionResult.accentColor }]}>
              BIOIMPEDÂNCIA AO VIVO
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={animationFinished ? handleDismiss : handleSkipOrFinish}
            activeOpacity={0.7}
          >
            {animationFinished ? (
              <X color="#94a3b8" size={20} />
            ) : (
              <Text style={styles.skipText}>Pular ⏩</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Título do Cenário */}
          <View style={styles.titleContainer}>
            <Text style={styles.scenarioTitle}>{reactionResult.scenarioTitle}</Text>
            <Text style={styles.scenarioSubtitle}>{reactionResult.scenarioSubtitle}</Text>
          </View>

          {/* PALCO CENTRAL: O Mascote 3D Vivo na Balança */}
          <View style={styles.stageContainer}>
            {/* Anéis Holográficos de Fundo */}
            <View style={[styles.holoPortalBg, { borderColor: `${reactionResult.accentColor}30` }]} />

            {/* O Mascote 3D Vivo com Física de Salto */}
            <Animated.View
              style={[
                styles.mascotWrapper,
                { transform: [{ translateY: mascotBounce }] },
              ]}
            >
              <ScaleAvatar3D
                mascotId={reactionResult.mascotId}
                weightKg={odometerWeight}
                heightCm={175}
                morphology={reactionResult.mascotEval.morphology}
                isInspecting={true}
                size={230}
              />
            </Animated.View>

            {/* Badge de Level-Up de Shape */}
            {reactionResult.evolution.evolved && (
              <View style={[styles.levelUpBadge, { backgroundColor: `${reactionResult.accentColor}25`, borderColor: reactionResult.accentColor }]}>
                <Crown color={reactionResult.accentColor} size={15} />
                <Text style={[styles.levelUpText, { color: reactionResult.accentColor }]}>
                  SHAPE LEVEL UP: FASE {reactionResult.evolution.newStageLevel}!
                </Text>
              </View>
            )}
          </View>

          {/* BADGES FLUTUANTES DE COMPOSIÇÃO CORPORAL */}
          <View style={styles.badgesGrid}>
            {reactionResult.badges.map((badge, idx) => {
              const op = badgeOpacities[idx] || 1;
              const tr = badgeTranslates[idx] || 0;
              const isPositive = badge.tone === 'positive';
              const isAlert = badge.tone === 'alert';
              const badgeColor = isPositive ? '#22c55e' : isAlert ? '#ef4444' : '#f59e0b';

              return (
                <Animated.View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    {
                      opacity: op,
                      transform: [{ translateY: tr }],
                      borderColor: `${badgeColor}40`,
                    },
                  ]}
                >
                  <View style={styles.badgeHeader}>
                    {badge.icon === 'flame' && <Flame color={badgeColor} size={14} />}
                    {badge.icon === 'shield' && <Shield color={badgeColor} size={14} />}
                    {badge.icon === 'scale' && <Scale color={badgeColor} size={14} />}
                    {badge.icon === 'tape' && <Activity color={badgeColor} size={14} />}
                    <Text style={styles.badgeLabelText}>{badge.label}</Text>
                  </View>

                  <View style={styles.badgeValueRow}>
                    <Text style={[styles.badgeValueText, { color: badgeColor }]}>
                      {badge.valueStr}
                    </Text>
                    {badge.direction === 'down' && <TrendingDown color={badgeColor} size={16} />}
                    {badge.direction === 'up' && <TrendingUp color={badgeColor} size={16} />}
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* BALÃO DE FALA DINÂMICA DA PERSONA */}
          <Animated.View
            style={[
              styles.speechBubbleCard,
              {
                opacity: speechCardAnim,
                transform: [{ translateY: speechCardY }],
                borderColor: `${reactionResult.accentColor}40`,
              },
            ]}
          >
            <View style={styles.speechCardHeader}>
              <View style={[styles.personaAvatarMini, { borderColor: reactionResult.accentColor }]}>
                <Image source={mascotAsset} style={styles.personaMiniImg} resizeMode="contain" />
              </View>
              <View style={styles.personaInfo}>
                <Text style={styles.personaName}>{reactionResult.mascotName} (Seu Técnico)</Text>
                <Text style={styles.personaSubtitle}>{reactionResult.shortReaction}</Text>
              </View>
            </View>

            <Text style={styles.speechBodyText}>"{reactionResult.speechText}"</Text>

            {/* Card de Próxima Ação Clínica */}
            <View style={styles.nextActionBox}>
              <Zap color="#eab308" size={15} style={styles.nextActionIcon} />
              <View style={styles.nextActionContent}>
                <Text style={styles.nextActionTitle}>Próximo Passo Recomendado:</Text>
                <Text style={styles.nextActionDesc}>{reactionResult.nextStepAction}</Text>
              </View>
            </View>
          </Animated.View>

          {/* BOTÃO COMPARTILHAR VITÓRIA SOCIAL */}
          <TouchableOpacity
            style={styles.shareVictoryBtn}
            onPress={() => {
              soundHaptics.triggerMediumTap();
              setShowVictoryCard(true);
            }}
            activeOpacity={0.85}
          >
            <Share2 color="#10b981" size={17} />
            <Text style={styles.shareVictoryBtnText}>Compartilhar Conquista (Stories / Zap)</Text>
          </TouchableOpacity>

          {/* BOTÃO PRINCIPAL DE CONTINUAR */}
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: reactionResult.accentColor }]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <CheckCircle2 color="#041f12" size={18} />
            <Text style={styles.continueBtnText}>Continuar Batalha da Balança</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Modal Card de Vitória Social */}
      <ShapeVictoryCardModal
        visible={showVictoryCard}
        onClose={() => setShowVictoryCard(false)}
        mascotName={reactionResult.mascotName}
        mascotAssetKey={reactionResult.evolution.morphologyAssetKey}
        currentWeightKg={reactionResult.currentWeightKg}
        weightDeltaKg={flameBadge?.deltaNum ? Math.abs(flameBadge.deltaNum) : undefined}
        bodyFatPct={fatBadge?.deltaNum}
        muscleMassPct={muscleBadge?.deltaNum}
        waistCm={tapeBadge?.deltaNum}
        streakDays={reactionResult.evolution.evolved ? 7 : 3}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#050d0a',
    paddingTop: 50,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  ceremonyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a2219',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  ceremonyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#0e1f18',
  },
  skipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Títulos
  titleContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  scenarioTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  scenarioSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },

  // Palco
  stageContainer: {
    width: 260,
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  holoPortalBg: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    backgroundColor: '#071610',
  },
  mascotWrapper: {
    width: 240,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mascotImage: {
    width: 195,
    height: 195,
  },

  // HUD LED Digital no Peitoral
  chestLedHud: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(5, 18, 13, 0.94)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 105,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  hudDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  hudLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  hudWeight: {
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  hudUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },

  // Scanner Laser
  scannerLaser: {
    position: 'absolute',
    width: 220,
    height: 2,
    borderTopWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  laserCore: {
    width: '100%',
    height: 2,
    opacity: 0.8,
  },

  // Plataforma da Balança
  scalePlatform: {
    position: 'absolute',
    bottom: 8,
    width: 220,
    height: 38,
    borderRadius: 110,
    backgroundColor: '#091c14',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1,
  },
  platformInnerRing: {
    width: 190,
    height: 26,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  electrode: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ca3af',
  },
  electrodeLeft: {},
  electrodeRight: {},

  levelUpBadge: {
    position: 'absolute',
    top: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 20,
  },
  levelUpText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Grid de Badges Flutuantes
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginVertical: 12,
    justifyContent: 'space-between',
  },
  badgeCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 50) / 2,
    backgroundColor: '#0a1d15',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeLabelText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeValueText: {
    fontSize: 18,
    fontWeight: '900',
  },

  // Balão de Fala da Persona
  speechBubbleCard: {
    width: '100%',
    backgroundColor: '#081711',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  speechCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  personaAvatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#0f291e',
    overflow: 'hidden',
  },
  personaMiniImg: {
    width: '100%',
    height: '100%',
  },
  personaInfo: {
    flex: 1,
  },
  personaName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  personaSubtitle: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
  },
  speechBodyText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  nextActionBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#eab308',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  nextActionIcon: {
    marginTop: 2,
  },
  nextActionContent: {
    flex: 1,
  },
  nextActionTitle: {
    color: '#eab308',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  nextActionDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
  },

  // Botão Compartilhar Vitória Social
  shareVictoryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: '#0f2920',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  shareVictoryBtnText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },

  // Botão Continuar
  continueBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  continueBtnText: {
    color: '#041f12',
    fontSize: 16,
    fontWeight: '900',
  },
});
