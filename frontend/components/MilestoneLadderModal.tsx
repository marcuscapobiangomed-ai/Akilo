import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import {
  X,
  Trophy,
  Sparkles,
  Lock,
  CheckCircle2,
  Flame,
  Activity,
  Droplets,
  Dumbbell,
  Share2,
  ShieldAlert,
  ChevronRight,
  Crown,
} from 'lucide-react-native';
import { getMascotImage } from '../assets/avatars';
import {
  getDetailedMilestones,
  evaluateGainScenario,
  evaluateHypertrophyLadder,
  type MascotId,
  type DetailedMilestone,
  type HypertrophyMilestone,
  type GainScenarioEvaluation,
} from '../core/domain/avatarEngine';
import { soundHaptics } from '../core/soundHaptics';

interface MilestoneLadderModalProps {
  visible: boolean;
  onClose: () => void;
  mascotId: MascotId;
  currentMilestoneLevel: number;
  currentWeightKg: number;
  onShareMilestone?: (milestone: DetailedMilestone) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ActiveTab = 'emagrecimento' | 'ganho' | 'hipertrofia';

export default function MilestoneLadderModal({
  visible,
  onClose,
  mascotId,
  currentMilestoneLevel = 1,
  currentWeightKg = 70,
  onShareMilestone,
}: MilestoneLadderModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('emagrecimento');
  const [selectedMilestone, setSelectedMilestone] = useState<DetailedMilestone | null>(null);

  const isGaia = mascotId === 'gaia';
  const mascotDisplayName = isGaia ? 'Gaia' : 'Titã';
  const detailedMilestones = getDetailedMilestones(mascotId);

  // Cenários de Ganho pré-calculados para exibição didática
  const gainScenarios: GainScenarioEvaluation[] = [
    evaluateGainScenario(mascotId, isGaia ? 60.5 : 87.0, 1.5, 0.0, 0.0), // Retenção / TPM
    evaluateGainScenario(mascotId, isGaia ? 86.0 : 96.0, 4.0, 2.0, -0.5, 3.0), // Rebote
    evaluateGainScenario(mascotId, isGaia ? 64.0 : 86.0, 2.0, 0.0, 1.2), // Hipertrofia
  ];

  // Escada de Hipertrofia do Mascote
  const hypertrophyLadderWeights = isGaia
    ? [62, 66, 70, 75, 80, 85, 90, 95]
    : [75, 80, 85, 92, 100, 108, 114, 120];

  const hypertrophyMilestones: HypertrophyMilestone[] = hypertrophyLadderWeights.map((w) =>
    evaluateHypertrophyLadder(mascotId, w)
  );

  const handleTabChange = (tab: ActiveTab) => {
    soundHaptics.triggerLightTap();
    setActiveTab(tab);
  };

  const handleSelectMilestone = (m: DetailedMilestone) => {
    soundHaptics.triggerMediumTap();
    setSelectedMilestone(m);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header com Navegação e Fechar */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.mascotBadge, { borderColor: isGaia ? '#ec4899' : '#22c55e' }]}>
                <Trophy color={isGaia ? '#ec4899' : '#22c55e'} size={15} />
                <Text style={[styles.mascotBadgeText, { color: isGaia ? '#ec4899' : '#22c55e' }]}>
                  {mascotDisplayName.toUpperCase()} • ESCADA EVOLUTIVA
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  soundHaptics.triggerLightTap();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Marcos Oficiais de Recomposição</Text>
            <Text style={styles.modalSubtitle}>
              Progressão clínica granular com metas de Peso, Gordura, Músculo e Cintura ABESO.
            </Text>

            {/* Abas Superiores */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'emagrecimento' && styles.tabBtnActive]}
                onPress={() => handleTabChange('emagrecimento')}
                activeOpacity={0.8}
              >
                <Flame
                  color={activeTab === 'emagrecimento' ? '#22c55e' : '#64748b'}
                  size={14}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'emagrecimento' && styles.tabBtnTextActive,
                  ]}
                >
                  10 Marcos (Queima)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'ganho' && styles.tabBtnActive]}
                onPress={() => handleTabChange('ganho')}
                activeOpacity={0.8}
              >
                <Droplets
                  color={activeTab === 'ganho' ? '#38bdf8' : '#64748b'}
                  size={14}
                />
                <Text
                  style={[styles.tabBtnText, activeTab === 'ganho' && styles.tabBtnTextActive]}
                >
                  Cenários & TPM
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'hipertrofia' && styles.tabBtnActive]}
                onPress={() => handleTabChange('hipertrofia')}
                activeOpacity={0.8}
              >
                <Dumbbell
                  color={activeTab === 'hipertrofia' ? '#eab308' : '#64748b'}
                  size={14}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'hipertrofia' && styles.tabBtnTextActive,
                  ]}
                >
                  Hipertrofia
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Conteúdo das Abas */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'emagrecimento' && (
              <View style={styles.milestonesList}>
                {detailedMilestones.map((m) => {
                  const isConquered = currentMilestoneLevel >= m.level;
                  const isCurrent = currentMilestoneLevel === m.level;

                  return (
                    <TouchableOpacity
                      key={`milestone-${m.level}`}
                      style={[
                        styles.milestoneCard,
                        isCurrent && styles.milestoneCardCurrent,
                        isConquered && !isCurrent && styles.milestoneCardConquered,
                      ]}
                      onPress={() => handleSelectMilestone(m)}
                      activeOpacity={0.85}
                    >
                      {/* Topo do Card: Nível, Imagem 2D e Status */}
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.avatarThumbnailWrapper}>
                          <Image
                            source={getMascotImage(m.assetKey)}
                            style={styles.avatarThumbnail}
                            resizeMode="contain"
                          />
                        </View>

                        <View style={styles.cardHeaderInfo}>
                          <View style={styles.levelRow}>
                            <View
                              style={[
                                styles.levelTag,
                                {
                                  backgroundColor: isCurrent
                                    ? 'rgba(234, 179, 8, 0.25)'
                                    : isConquered
                                    ? 'rgba(34, 197, 94, 0.2)'
                                    : 'rgba(100, 116, 139, 0.2)',
                                  borderColor: isCurrent
                                    ? '#eab308'
                                    : isConquered
                                    ? '#22c55e'
                                    : '#475569',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.levelTagText,
                                  {
                                    color: isCurrent
                                      ? '#facc15'
                                      : isConquered
                                      ? '#4ade80'
                                      : '#94a3b8',
                                  },
                                ]}
                              >
                                MARCO {m.level}/10
                              </Text>
                            </View>

                            {isCurrent && (
                              <View style={styles.currentBadge}>
                                <Sparkles color="#facc15" size={11} />
                                <Text style={styles.currentBadgeText}>VOCÊ ESTÁ AQUI</Text>
                              </View>
                            )}

                            {isConquered && !isCurrent && (
                              <View style={styles.conqueredBadge}>
                                <CheckCircle2 color="#22c55e" size={12} />
                                <Text style={styles.conqueredBadgeText}>CONQUISTADO</Text>
                              </View>
                            )}

                            {!isConquered && (
                              <View style={styles.lockedBadge}>
                                <Lock color="#64748b" size={11} />
                                <Text style={styles.lockedBadgeText}>BLOQUEADO</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.cardTitle}>{m.name}</Text>
                          <Text style={styles.cardBadgeSubtext}>
                            {m.badge} • Meta: {m.hudDisplay}
                          </Text>
                        </View>
                      </View>

                      {/* Grade de Metas Biométricas Clínicas */}
                      <View style={styles.biometricsGrid}>
                        <View style={styles.bioCell}>
                          <Text style={styles.bioCellLabel}>Peso Alvo</Text>
                          <Text style={styles.bioCellValue}>{m.weightKg.toFixed(1)} kg</Text>
                        </View>
                        <View style={styles.bioCell}>
                          <Text style={styles.bioCellLabel}>Gordura Alvo</Text>
                          <Text style={styles.bioCellValue}>{m.bodyFatPct}%</Text>
                        </View>
                        <View style={styles.bioCell}>
                          <Text style={styles.bioCellLabel}>Massa Magra</Text>
                          <Text style={styles.bioCellValue}>{m.muscleMassPct}%</Text>
                        </View>
                        <View style={styles.bioCell}>
                          <Text style={styles.bioCellLabel}>Cintura ABESO</Text>
                          <Text
                            style={[
                              styles.bioCellValue,
                              m.waistCm < (isGaia ? 80 : 90) && { color: '#22c55e' },
                            ]}
                          >
                            {m.waistCm} cm
                          </Text>
                        </View>
                      </View>

                      {/* Fala Motivacional do Mascote */}
                      <View style={styles.quoteBubble}>
                        <Sparkles color="#eab308" size={12} style={{ marginTop: 2 }} />
                        <Text style={styles.quoteText}>"{m.quote}"</Text>
                      </View>

                      {/* Desbloqueios Cosméticos & Botão Compartilhar */}
                      <View style={styles.cardFooterRow}>
                        <View style={styles.cosmeticWrapper}>
                          <Text style={styles.cosmeticLabel}>🎁 Recompensas:</Text>
                          <Text style={styles.cosmeticList} numberOfLines={1}>
                            {m.unlockedCosmetics.join(' • ')}
                          </Text>
                        </View>

                        {onShareMilestone && (
                          <TouchableOpacity
                            style={[
                              styles.cardShareBtn,
                              !isConquered && styles.cardShareBtnDisabled,
                            ]}
                            onPress={() => {
                              if (isConquered) {
                                soundHaptics.triggerLightTap();
                                onShareMilestone(m);
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <Share2
                              color={isConquered ? '#22c55e' : '#64748b'}
                              size={13}
                            />
                            <Text
                              style={[
                                styles.cardShareBtnText,
                                !isConquered && styles.cardShareBtnTextDisabled,
                              ]}
                            >
                              Card
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {activeTab === 'ganho' && (
              <View style={styles.gainList}>
                <View style={styles.sectionInfoBanner}>
                  <Activity color="#38bdf8" size={16} />
                  <Text style={styles.sectionInfoText}>
                    A balança subiu? Nem todo ganho é gordura! Diferencie oscilações de água,
                    período menstrual/TPM e ganho de massa magra.
                  </Text>
                </View>

                {gainScenarios.map((scenario, idx) => (
                  <View key={`scenario-${idx}`} style={styles.scenarioCard}>
                    <View style={styles.scenarioCardHeader}>
                      <View
                        style={[
                          styles.scenarioIconWrap,
                          { backgroundColor: `${scenario.badgeColor}25` },
                        ]}
                      >
                        <Droplets color={scenario.badgeColor} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scenarioCardTitle}>{scenario.title}</Text>
                        <Text
                          style={[styles.scenarioCardBadge, { color: scenario.badgeColor }]}
                        >
                          {scenario.hudSubtext}
                        </Text>
                      </View>
                      <Image
                        source={getMascotImage(scenario.assetKey)}
                        style={styles.scenarioAvatarThumb}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.scenarioBody}>
                      <Text style={styles.scenarioCauseLabel}>Causa Fisiológica:</Text>
                      <Text style={styles.scenarioCauseText}>{scenario.cause}</Text>

                      <View style={styles.scenarioQuoteBubble}>
                        <Text style={styles.scenarioQuoteText}>"{scenario.quote}"</Text>
                      </View>

                      <Text style={styles.scenarioRecLabel}>Conduta Recomendada:</Text>
                      <Text style={styles.scenarioRecText}>{scenario.recommendation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'hipertrofia' && (
              <View style={styles.hypertrophyList}>
                <View style={styles.sectionInfoBanner}>
                  <Crown color="#eab308" size={16} />
                  <Text style={styles.sectionInfoText}>
                    {isGaia
                      ? 'Esteira de hipertrofia feminina: tônus, pernas esculpidas, glúteos de rocha até a Valquíria Suprema (95kg).'
                      : 'Esteira de hipertrofia masculina: densidade muscular, classic physique até o Colosso Lendário (120kg).'}
                  </Text>
                </View>

                {hypertrophyMilestones.map((h, idx) => (
                  <View key={`hypertrophy-${idx}`} style={styles.hyperCard}>
                    <View style={styles.hyperHeader}>
                      <View style={styles.hyperAvatarWrapper}>
                        <Image
                          source={getMascotImage(h.assetKey)}
                          style={styles.hyperAvatarThumb}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.hyperTagRow}>
                          <View
                            style={[
                              styles.hyperTag,
                              {
                                backgroundColor: `${h.badgeColor}25`,
                                borderColor: h.badgeColor,
                              },
                            ]}
                          >
                            <Text style={[styles.hyperTagText, { color: h.badgeColor }]}>
                              {h.levelCode} • {h.badge}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.hyperTitle}>{h.name}</Text>
                        <Text style={styles.hyperSubtitle}>
                          {h.hudDisplay} • BF: {h.bodyFatPct}% • MM: {h.muscleMassPct}%
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.hyperQuote}>"{h.quote}"</Text>
                    <View style={styles.hyperCosmeticRow}>
                      <Text style={styles.hyperCosmeticLabel}>Desbloqueio:</Text>
                      <Text style={styles.hyperCosmeticValue}>
                        {h.unlockedCosmetics.join(' • ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#090d16',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: '92%',
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mascotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  mascotBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  tabBtnText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  milestonesList: {
    gap: 12,
  },
  milestoneCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 14,
  },
  milestoneCardCurrent: {
    borderColor: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    shadowColor: '#eab308',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  milestoneCardConquered: {
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarThumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarThumbnail: {
    width: '100%',
    height: '100%',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  levelTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  levelTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: '#facc15',
    fontSize: 9,
    fontWeight: '800',
  },
  conqueredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  conqueredBadgeText: {
    color: '#4ade80',
    fontSize: 9,
    fontWeight: '800',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedBadgeText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  cardBadgeSubtext: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  biometricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  bioCell: {
    alignItems: 'center',
    flex: 1,
  },
  bioCellLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bioCellValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  quoteBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#eab308',
  },
  quoteText: {
    color: '#fef08a',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
    flex: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  cosmeticWrapper: {
    flex: 1,
    marginRight: 8,
  },
  cosmeticLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  cosmeticList: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 1,
  },
  cardShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardShareBtnDisabled: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderColor: '#475569',
  },
  cardShareBtnText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
  },
  cardShareBtnTextDisabled: {
    color: '#64748b',
  },
  gainList: {
    gap: 14,
  },
  sectionInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  sectionInfoText: {
    color: '#bae6fd',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  scenarioCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 14,
  },
  scenarioCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scenarioIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  scenarioCardBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  scenarioAvatarThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  scenarioBody: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  scenarioCauseLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scenarioCauseText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  scenarioQuoteBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#38bdf8',
  },
  scenarioQuoteText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontStyle: 'italic',
  },
  scenarioRecLabel: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scenarioRecText: {
    color: '#86efac',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  hypertrophyList: {
    gap: 12,
  },
  hyperCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
  },
  hyperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hyperAvatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hyperAvatarThumb: {
    width: '100%',
    height: '100%',
  },
  hyperTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hyperTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  hyperTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  hyperTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  hyperSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  hyperQuote: {
    color: '#fef08a',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    padding: 8,
    borderRadius: 8,
  },
  hyperCosmeticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  hyperCosmeticLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  hyperCosmeticValue: {
    color: '#cbd5e1',
    fontSize: 11,
    flex: 1,
  },
});
