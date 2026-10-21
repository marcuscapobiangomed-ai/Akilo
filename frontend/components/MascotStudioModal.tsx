import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Sparkles,
  Check,
  RotateCcw,
  X,
  Palette,
  Shield,
  Eye,
  Flame,
  Zap,
} from 'lucide-react-native';
import { LivingAvatar3D } from './LivingAvatar3D';
import {
  MascotId,
  MascotCustomization,
  CUSTOMIZATION_PALETTES,
  DEFAULT_TITA_CUSTOMIZATION,
  DEFAULT_GAIA_CUSTOMIZATION,
  evaluateMascot,
} from '../core/domain/avatarEngine';
import { soundHaptics } from '../core/soundHaptics';

const { width } = Dimensions.get('window');

interface MascotStudioModalProps {
  visible: boolean;
  onClose: () => void;
  mascotId: MascotId;
  customization?: Partial<MascotCustomization> | null;
  weightKg: number;
  heightCm: number;
  bodyFatPct?: number | null;
  muscleMassPct?: number | null;
  onSave: (mascotId: MascotId, custom: MascotCustomization) => Promise<void> | void;
}

type CustomCategory = 'suit' | 'top' | 'sneakers' | 'eyes' | 'skin';

interface CategoryTab {
  key: CustomCategory;
  label: string;
  icon: any;
  hint: string;
}

export const MascotStudioModal: React.FC<MascotStudioModalProps> = ({
  visible,
  onClose,
  mascotId,
  customization,
  weightKg,
  heightCm,
  bodyFatPct,
  muscleMassPct,
  onSave,
}) => {
  const [selectedMascot, setSelectedMascot] = useState<MascotId>(mascotId);
  const [activeTab, setActiveTab] = useState<CustomCategory>('suit');
  const [custom, setCustom] = useState<MascotCustomization>(() => {
    const defaultForId = mascotId === 'gaia' ? DEFAULT_GAIA_CUSTOMIZATION : DEFAULT_TITA_CUSTOMIZATION;
    return {
      eyeColor: customization?.eyeColor || defaultForId.eyeColor,
      suitColor: customization?.suitColor || defaultForId.suitColor,
      topColor: customization?.topColor || defaultForId.topColor,
      sneakersColor: customization?.sneakersColor || defaultForId.sneakersColor,
      skinTone: customization?.skinTone || defaultForId.skinTone,
    };
  });
  const [saving, setSaving] = useState(false);
  const [inspecting, setInspecting] = useState(false);

  // Sincroniza sempre que o modal abre ou os dados externos mudam
  useEffect(() => {
    if (visible) {
      setSelectedMascot(mascotId);
      const defaultForId = mascotId === 'gaia' ? DEFAULT_GAIA_CUSTOMIZATION : DEFAULT_TITA_CUSTOMIZATION;
      setCustom({
        eyeColor: customization?.eyeColor || defaultForId.eyeColor,
        suitColor: customization?.suitColor || defaultForId.suitColor,
        topColor: customization?.topColor || defaultForId.topColor,
        sneakersColor: customization?.sneakersColor || defaultForId.sneakersColor,
        skinTone: customization?.skinTone || defaultForId.skinTone,
      });
    }
  }, [visible, mascotId, customization]);

  // Recalcula a morfologia em tempo real para o mascote atualizado
  const previewEval = evaluateMascot({
    mascotId: selectedMascot,
    sex: selectedMascot === 'gaia' ? 'female' : 'male',
    weightKg: weightKg || 70,
    heightCm: heightCm || 170,
    bodyFatPct,
    muscleMassPct,
    customization: custom,
  });

  const categories: CategoryTab[] = [
    {
      key: 'suit',
      label: selectedMascot === 'tita' ? 'Bermuda' : 'Leg Short',
      icon: Shield,
      hint: selectedMascot === 'tita' ? 'Bermuda esportiva de academia' : 'Biker shorts de alta compressão',
    },
    ...(selectedMascot === 'gaia'
      ? [
          {
            key: 'top' as CustomCategory,
            label: 'Top de Treino',
            icon: Zap,
            hint: 'Top esportivo com sustentação e alças',
          },
        ]
      : []),
    {
      key: 'sneakers',
      label: 'Tênis',
      icon: Flame,
      hint: 'Tênis esportivo de performance',
    },
    { key: 'eyes', label: 'Olhos', icon: Eye, hint: 'Íris e profundidade dos olhos' },
    { key: 'skin', label: 'Pele', icon: Palette, hint: 'Tom de pele anatômico' },
  ];

  const handleMascotSwitch = (newMascot: MascotId) => {
    soundHaptics.triggerMediumTap();
    setSelectedMascot(newMascot);
    if (newMascot === 'tita' && activeTab === 'top') {
      setActiveTab('suit');
    }
    const defaultForId = newMascot === 'gaia' ? DEFAULT_GAIA_CUSTOMIZATION : DEFAULT_TITA_CUSTOMIZATION;
    setCustom(prev => ({
      ...prev,
      suitColor: prev.suitColor || defaultForId.suitColor,
      topColor: prev.topColor || defaultForId.topColor,
      sneakersColor: prev.sneakersColor || defaultForId.sneakersColor,
    }));
  };

  const handleColorSelect = (category: CustomCategory, colorHex: string) => {
    soundHaptics.triggerLightTap();
    setCustom(prev => {
      switch (category) {
        case 'eyes':
          return { ...prev, eyeColor: colorHex };
        case 'suit':
          return { ...prev, suitColor: colorHex };
        case 'top':
          return { ...prev, topColor: colorHex };
        case 'sneakers':
          return { ...prev, sneakersColor: colorHex };
        case 'skin':
          return { ...prev, skinTone: colorHex };
      }
    });
  };

  const handleResetDefaults = () => {
    soundHaptics.triggerLightTap();
    const defaultPreset = selectedMascot === 'gaia' ? DEFAULT_GAIA_CUSTOMIZATION : DEFAULT_TITA_CUSTOMIZATION;
    setCustom({ ...defaultPreset });
  };

  // Presets fitness temáticos
  const handleApplyThemePreset = (theme: 'dark' | 'emerald' | 'gold' | 'royal') => {
    soundHaptics.triggerMediumTap();
    if (theme === 'dark') {
      setCustom({
        eyeColor: '#38bdf8',
        suitColor: '#18181b',
        topColor: '#18181b',
        sneakersColor: '#18181b',
        skinTone: '#fde68a',
      });
    } else if (theme === 'emerald') {
      setCustom({
        eyeColor: '#10b981',
        suitColor: '#166534',
        topColor: '#10b981',
        sneakersColor: '#22c55e',
        skinTone: '#fde68a',
      });
    } else if (theme === 'gold') {
      setCustom({
        eyeColor: '#f59e0b',
        suitColor: '#334155',
        topColor: '#facc15',
        sneakersColor: '#eab308',
        skinTone: '#fed7aa',
      });
    } else if (theme === 'royal') {
      setCustom({
        eyeColor: '#38bdf8',
        suitColor: '#1e3a8a',
        topColor: '#38bdf8',
        sneakersColor: '#2563eb',
        skinTone: '#fde68a',
      });
    }
  };

  const handleSave = async () => {
    soundHaptics.triggerScaleLock();
    setSaving(true);
    try {
      await onSave(selectedMascot, custom);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const getCurrentColor = (cat: CustomCategory) => {
    switch (cat) {
      case 'eyes':
        return custom.eyeColor;
      case 'suit':
        return custom.suitColor;
      case 'top':
        return custom.topColor || (selectedMascot === 'gaia' ? '#10b981' : '#18181b');
      case 'sneakers':
        return custom.sneakersColor || '#18181b';
      case 'skin':
        return custom.skinTone;
    }
  };

  const currentPalette = (CUSTOMIZATION_PALETTES as any)[activeTab] || [];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Header Superior */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton} activeOpacity={0.8}>
            <X color="#9ca3af" size={22} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Estúdio 3D de Academia</Text>
            <Text style={styles.headerSubtitle}>Personalize o visual esportivo de Titã & Gaia</Text>
          </View>

          <TouchableOpacity
            onPress={handleResetDefaults}
            style={styles.iconButton}
            activeOpacity={0.8}
            accessibilityLabel="Restaurar Padrão"
          >
            <RotateCcw color="#eab308" size={19} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Seletor de Mascote (Titã 🏋️‍♂️ vs Gaia ✨) */}
          <View style={styles.mascotSwitchRow}>
            <TouchableOpacity
              style={[
                styles.mascotSwitchBtn,
                selectedMascot === 'tita' && styles.mascotSwitchBtnActive,
              ]}
              onPress={() => handleMascotSwitch('tita')}
              activeOpacity={0.85}
            >
              <Text style={styles.mascotSwitchEmoji}>🏋️‍♂️</Text>
              <View>
                <Text
                  style={[
                    styles.mascotSwitchName,
                    selectedMascot === 'tita' && styles.mascotSwitchNameActive,
                  ]}
                >
                  Titã
                </Text>
                <Text style={styles.mascotSwitchTag}>Topless & Bermuda de Treino</Text>
              </View>
              {selectedMascot === 'tita' && (
                <View style={styles.activeCheckBadge}>
                  <Check color="#fff" size={13} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mascotSwitchBtn,
                selectedMascot === 'gaia' && styles.mascotSwitchBtnActive,
              ]}
              onPress={() => handleMascotSwitch('gaia')}
              activeOpacity={0.85}
            >
              <Text style={styles.mascotSwitchEmoji}>✨</Text>
              <View>
                <Text
                  style={[
                    styles.mascotSwitchName,
                    selectedMascot === 'gaia' && styles.mascotSwitchNameActive,
                  ]}
                >
                  Gaia
                </Text>
                <Text style={styles.mascotSwitchTag}>Top & Leg Short Biker</Text>
              </View>
              {selectedMascot === 'gaia' && (
                <View style={styles.activeCheckBadge}>
                  <Check color="#fff" size={13} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* PALCO 3D COM PREVIEW EM TEMPO REAL */}
          <View style={styles.previewStageCard}>
            <View style={styles.previewBadgeRow}>
              <View style={[styles.statusBadge, { borderColor: previewEval.badgeColor }]}>
                <Text style={[styles.statusBadgeText, { color: previewEval.badgeColor }]}>
                  {previewEval.badgeLabel} • FASE {previewEval.stageLevel}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.inspectMiniBtn}
                onPress={() => {
                  soundHaptics.triggerMediumTap();
                  setInspecting(true);
                  setTimeout(() => setInspecting(false), 4500);
                }}
                activeOpacity={0.8}
              >
                <Sparkles color="#eab308" size={14} />
                <Text style={styles.inspectMiniBtnText}>Girar 360°</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.avatarHolder}>
              <LivingAvatar3D
                mascotId={selectedMascot}
                weightKg={weightKg}
                heightCm={heightCm}
                bodyFatPct={bodyFatPct}
                muscleMassPct={muscleMassPct}
                morphology={previewEval.morphology}
                customization={custom}
                isInspecting={inspecting}
                onInspectionTrigger={() => {
                  setInspecting(true);
                  setTimeout(() => setInspecting(false), 4500);
                }}
                size={230}
                hideBubble={false}
              />
            </View>

            <Text style={styles.stageQuote}>"{previewEval.flavorQuote}"</Text>
          </View>

          {/* Quick Presets de Estilo Fitness */}
          <View style={styles.presetsSection}>
            <Text style={styles.sectionTitle}>Combos Esportivos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              <TouchableOpacity
                style={[styles.presetChip, { borderColor: '#18181b' }]}
                onPress={() => handleApplyThemePreset('dark')}
                activeOpacity={0.8}
              >
                <Zap color="#38bdf8" size={14} />
                <Text style={styles.presetChipText}>Dark Carbono</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetChip, { borderColor: '#10b981' }]}
                onPress={() => handleApplyThemePreset('emerald')}
                activeOpacity={0.8}
              >
                <Shield color="#10b981" size={14} />
                <Text style={styles.presetChipText}>Esmeralda Pro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetChip, { borderColor: '#eab308' }]}
                onPress={() => handleApplyThemePreset('gold')}
                activeOpacity={0.8}
              >
                <Flame color="#eab308" size={14} />
                <Text style={styles.presetChipText}>Ouro Campeão</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetChip, { borderColor: '#2563eb' }]}
                onPress={() => handleApplyThemePreset('royal')}
                activeOpacity={0.8}
              >
                <Sparkles color="#2563eb" size={14} />
                <Text style={styles.presetChipText}>Azul Royal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* ABAS DE CATEGORIA DE PERSONALIZAÇÃO */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {categories.map(tab => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.key;
                const tabColor = getCurrentColor(tab.key);
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                    onPress={() => {
                      soundHaptics.triggerLightTap();
                      setActiveTab(tab.key);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.tabColorIndicator, { backgroundColor: tabColor }]} />
                    <IconComponent color={isActive ? '#22c55e' : '#9ca3af'} size={15} />
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* GRADE DE PALETAS DE CORES */}
          <View style={styles.paletteSection}>
            <View style={styles.paletteHeaderRow}>
              <Text style={styles.paletteTitle}>
                {categories.find(c => c.key === activeTab)?.label}
              </Text>
              <Text style={styles.paletteHint}>
                {categories.find(c => c.key === activeTab)?.hint}
              </Text>
            </View>

            <View style={styles.paletteGrid}>
              {currentPalette.map((item: any) => {
                const isSelected = getCurrentColor(activeTab) === item.color;
                return (
                  <TouchableOpacity
                    key={item.color}
                    style={[
                      styles.colorSwatchCard,
                      isSelected && styles.colorSwatchCardSelected,
                    ]}
                    onPress={() => handleColorSelect(activeTab, item.color)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.colorBubble, { backgroundColor: item.color }]}>
                      {isSelected && <Check color="#fff" size={16} strokeWidth={3} />}
                    </View>
                    <Text
                      style={[
                        styles.colorLabel,
                        isSelected && styles.colorLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Barra de Ações Inferior Fixa */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Sparkles color="#fff" size={17} />
                <Text style={styles.saveBtnText}>Salvar Mascote 3D</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  headerBar: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  mascotSwitchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mascotSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#1f2937',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    position: 'relative',
  },
  mascotSwitchBtnActive: {
    borderColor: '#22c55e',
    backgroundColor: '#064e3b25',
  },
  mascotSwitchEmoji: {
    fontSize: 26,
  },
  mascotSwitchName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9ca3af',
  },
  mascotSwitchNameActive: {
    color: '#f9fafb',
  },
  mascotSwitchTag: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  activeCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStageCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  previewBadgeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#111827',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inspectMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#eab30820',
    borderWidth: 1,
    borderColor: '#eab30850',
  },
  inspectMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#facc15',
  },
  avatarHolder: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  stageQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  presetsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1.5,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f3f4f6',
  },
  tabsContainer: {
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabButtonActive: {
    borderColor: '#22c55e',
    backgroundColor: '#064e3b35',
  },
  tabColorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fff',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
  },
  tabLabelActive: {
    color: '#f9fafb',
  },
  paletteSection: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  paletteHeaderRow: {
    marginBottom: 14,
  },
  paletteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f9fafb',
  },
  paletteHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatchCard: {
    width: (width - 32 - 32 - 30) / 4,
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#1f2937',
  },
  colorSwatchCardSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#064e3b25',
  },
  colorBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  colorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  colorLabelSelected: {
    color: '#22c55e',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9ca3af',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#22c55e',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#052e16',
    letterSpacing: 0.3,
  },
});
