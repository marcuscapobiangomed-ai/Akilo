import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Share,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Share2, Flame, Trophy, TrendingDown, ShieldCheck, Sparkles, Activity } from 'lucide-react-native';
import { getMascotImage } from '../assets/avatars';
import { soundHaptics } from '../core/soundHaptics';

interface ShapeVictoryCardModalProps {
  visible: boolean;
  onClose: () => void;
  mascotName?: string;
  mascotAssetKey?: string;
  currentWeightKg: number;
  initialWeightKg?: number;
  weightDeltaKg?: number;
  bodyFatPct?: number | null;
  muscleMassPct?: number | null;
  waistCm?: number | null;
  streakDays?: number;
  userName?: string;
  milestoneLevel?: number;
  milestoneBadge?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 360);
const CARD_HEIGHT = CARD_WIDTH * 1.77; // Proporção 9:16 de Stories / Status

export default function ShapeVictoryCardModal({
  visible,
  onClose,
  mascotName = 'Titã',
  mascotAssetKey = 'tita_muscular',
  currentWeightKg,
  initialWeightKg,
  weightDeltaKg,
  bodyFatPct,
  muscleMassPct,
  waistCm,
  streakDays = 7,
  userName = 'Guerreiro(a)',
  milestoneLevel,
  milestoneBadge,
}: ShapeVictoryCardModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Cálculo da perda de peso total
  const calculatedLoss =
    weightDeltaKg !== undefined
      ? weightDeltaKg
      : initialWeightKg && initialWeightKg > currentWeightKg
      ? Number((initialWeightKg - currentWeightKg).toFixed(1))
      : 0;

  const isLoss = calculatedLoss > 0;
  const mascotAsset = getMascotImage(mascotAssetKey);

  useEffect(() => {
    if (visible) {
      soundHaptics.triggerCelebration();
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleShare = async () => {
    soundHaptics.triggerMediumTap();

    const lossText = isLoss ? `🔥 Menos ${calculatedLoss} kg de gordura corporal eliminados!` : `⚖️ ${currentWeightKg} kg firmes no foco!`;
    const milestoneText = milestoneBadge ? `🏆 Marco ${milestoneLevel || ''}/10: ${milestoneBadge}\n` : '';
    const streakText = streakDays > 1 ? `⚡ Sequência de ${streakDays} dias de foco inabalável.` : '';
    const waistText = waistCm ? `📏 Cintura: ${waistCm} cm (Proteção Cardiovascular ativa).` : '';
    const shareMessage = `🥊 Batalha da Balança | Minha Recomposição Corporal\n\n` +
      `${milestoneText}` +
      `${lossText}\n` +
      `🏆 Peso Atual: ${currentWeightKg} kg\n` +
      (bodyFatPct ? `🧬 Gordura: ${bodyFatPct}%\n` : '') +
      (muscleMassPct ? `💪 Massa Magra: ${muscleMassPct}%\n` : '') +
      `${waistText}\n` +
      `${streakText}\n\n` +
      `"A balança não define meu limite, define meu ponto de partida." 🚀\n` +
      `#BatalhaDaBalanca #SaudeCardiovascular #ABESO #RecomposicaoCorporal`;

    try {
      await Share.share({
        message: shareMessage,
        title: 'Minha Conquista no Batalha da Balança',
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Barra Superior de Ações */}
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              soundHaptics.triggerLightTap();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <X color="#ffffff" size={20} />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>Card de Vitória Social</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Formato 9:16 para Stories / WhatsApp */}
          <Animated.View
            style={[
              styles.cardContainer,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#061a12', '#0a2e20', '#030d09']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header do Card */}
              <View style={styles.cardHeader}>
                <View style={styles.brandRow}>
                  <Trophy color="#10b981" size={16} />
                  <Text style={styles.brandTitle}>BATALHA DA BALANÇA</Text>
                </View>
                <View style={styles.clinicalBadge}>
                  <ShieldCheck color="#10b981" size={11} />
                  <Text style={styles.clinicalBadgeText}>BIOIMPEDÂNCIA CLÍNICA</Text>
                </View>
              </View>

              {/* Destaque do Campeão (Avatar / Mascote) */}
              <View style={styles.mascotShowcase}>
                <View style={styles.mascotGlowCircle} />
                <Image
                  source={mascotAsset}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
                {milestoneBadge ? (
                  <View style={styles.milestonePillBadge}>
                    <Text style={styles.milestonePillBadgeText}>
                      {milestoneLevel ? `MARCO ${milestoneLevel}/10 • ` : ''}{milestoneBadge.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.speechPill}>
                  <Sparkles color="#eab308" size={13} />
                  <Text style={styles.speechPillText}>
                    "{isLoss ? 'Cada grama a menos é uma vitória imensa!' : 'Foco na recomposição muscular!'}"
                  </Text>
                </View>
              </View>

              {/* Placar Central de Transformação */}
              <View style={styles.statScoreboard}>
                <View style={styles.mainWeightRow}>
                  <View style={styles.mainWeightBox}>
                    <Text style={styles.mainWeightVal}>{currentWeightKg}</Text>
                    <Text style={styles.mainWeightUnit}>kg</Text>
                  </View>
                  {isLoss && (
                    <View style={styles.lossBadge}>
                      <TrendingDown color="#10b981" size={16} />
                      <Text style={styles.lossBadgeText}>-{calculatedLoss} kg</Text>
                    </View>
                  )}
                </View>

                {/* Grid de Métricas de Recomposição Corporal */}
                <View style={styles.metricsGrid}>
                  {bodyFatPct !== null && bodyFatPct !== undefined && (
                    <View style={styles.metricCell}>
                      <Text style={styles.metricCellVal}>{bodyFatPct}%</Text>
                      <Text style={styles.metricCellLabel}>Gordura</Text>
                    </View>
                  )}

                  {muscleMassPct !== null && muscleMassPct !== undefined && (
                    <View style={styles.metricCell}>
                      <Text style={styles.metricCellVal}>{muscleMassPct}%</Text>
                      <Text style={styles.metricCellLabel}>Massa Magra</Text>
                    </View>
                  )}

                  {waistCm !== null && waistCm !== undefined && (
                    <View style={styles.metricCell}>
                      <Text style={styles.metricCellVal}>{waistCm} cm</Text>
                      <Text style={styles.metricCellLabel}>Cintura</Text>
                    </View>
                  )}

                  {streakDays > 0 && (
                    <View style={styles.metricCell}>
                      <View style={styles.streakRow}>
                        <Flame color="#ef4444" size={13} />
                        <Text style={[styles.metricCellVal, { color: '#f87171' }]}>
                          {streakDays}d
                        </Text>
                      </View>
                      <Text style={styles.metricCellLabel}>Foco Direto</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Rodapé Inspiracional & Hashtag */}
              <View style={styles.cardFooter}>
                <Text style={styles.userNameText}>{userName}</Text>
                <Text style={styles.quoteText}>
                  "O hábito constrói o campeão."
                </Text>
                <View style={styles.hashtagRow}>
                  <Text style={styles.hashtagText}>#BatalhaDaBalanca</Text>
                  <Text style={styles.hashtagDot}>•</Text>
                  <Text style={styles.hashtagText}>Metodologia ABESO / SBC</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Botão de Compartilhar Nativo */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.shareActionBtn}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Share2 color="#041f12" size={18} />
              <Text style={styles.shareActionBtnText}>Compartilhar no Stories / Zap</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={() => {
                soundHaptics.triggerLightTap();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelActionBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 10, 8, 0.95)',
  },
  headerControls: {
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  clinicalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  clinicalBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mascotShowcase: {
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  mascotGlowCircle: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    top: 15,
  },
  mascotImage: {
    width: 170,
    height: 170,
  },
  speechPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  milestonePillBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 6,
  },
  milestonePillBadgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  speechPillText: {
    color: '#fef08a',
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  statScoreboard: {
    backgroundColor: 'rgba(10, 26, 21, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    padding: 14,
  },
  mainWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
    marginBottom: 10,
  },
  mainWeightBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  mainWeightVal: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  mainWeightUnit: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '700',
  },
  lossBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lossBadgeText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricCellVal: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  metricCellLabel: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  userNameText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  quoteText: {
    color: '#9ca3af',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  hashtagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  hashtagText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  hashtagDot: {
    color: '#4b5563',
    fontSize: 10,
  },
  actionsContainer: {
    width: CARD_WIDTH,
    marginTop: 16,
    gap: 10,
  },
  shareActionBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shareActionBtnText: {
    color: '#041f12',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelActionBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelActionBtnText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
});
