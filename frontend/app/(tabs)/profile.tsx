import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { api } from '../../core/api';
import { supabase } from '../../core/supabase';
import { useRouter } from 'expo-router';
import { 
  User, 
  Target, 
  LogOut, 
  Edit3, 
  ChevronRight, 
  X, 
  Check, 
  ShieldAlert, 
  Dumbbell, 
  Trash2, 
  Info,
  Scale,
  Flame,
  Droplets,
  Activity,
  Sparkles,
  Calendar,
  Ruler,
  Trophy,
  Award,
  Zap,
  Eye,
  Palette,
  Share2,
  Lock,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../components/Toast';
import { ProfileSkeleton } from '../../components/SkeletonLoader';
import { dataEvents } from '../../core/dataEvents';
import { calculateBMI, estimateBMR, evaluateMetabolicAge, evaluateBodyFat, BiologicalSex } from '../../core/domain/bodyComposition';
import { evaluateMascot, getDetailedMilestones, type MascotId, type MascotCustomization } from '../../core/domain/avatarEngine';
import { getMascotImage } from '../../assets/avatars';
import { LivingAvatar3D } from '../../components/LivingAvatar3D';
import { MascotStudioModal } from '../../components/MascotStudioModal';
import { BioCheckinCeremonyModal } from '../../components/BioCheckinCeremonyModal';
import { evaluateBioReaction, type BioReactionResult } from '../../core/domain/bioReactionEngine';
import { soundHaptics } from '../../core/soundHaptics';
import ShapeVictoryCardModal from '../../components/ShapeVictoryCardModal';
import MilestoneLadderModal from '../../components/MilestoneLadderModal';

const { width } = Dimensions.get('window');

export default function Profile() {
  const router = useRouter();
  const { showToast, showConfirm } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Modal de Edição de Metas
  const [editTargetsModalVisible, setEditTargetsModalVisible] = useState(false);
  const [editTargets, setEditTargets] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    fiber: '',
    water: '',
    weeklyWorkouts: '',
  });
  const [savingTargets, setSavingTargets] = useState(false);

  // Modal de Seleção de Mascote
  const [selectMascotModalVisible, setSelectMascotModalVisible] = useState(false);
  const [mascotStudioModalVisible, setMascotStudioModalVisible] = useState(false);
  const [ceremonyModalVisible, setCeremonyModalVisible] = useState(false);
  const [showVictoryCard, setShowVictoryCard] = useState(false);
  const [activeReactionResult, setActiveReactionResult] = useState<BioReactionResult | null>(() =>
    evaluateBioReaction({
      current: { weightKg: 83.8, bodyFatPct: 22.0, muscleMassPct: 35.0, waistCm: 88.0 },
      previous: { weightKg: 85.0, bodyFatPct: 23.5, muscleMassPct: 35.0, waistCm: 90.0 },
      baseline: { weightKg: 92.0, bodyFatPct: 28.0, waistCm: 98.0 },
      mascotId: 'tita',
      sex: 'male',
      previousStageLevel: 1,
    })
  );

  // Modo de visualização do Mascote: 3D Vivo (reativo) vs 2D Arte de Colecionador
  const [avatarDisplayMode, setAvatarDisplayMode] = useState<'3d' | '2d'>('3d');
  const [triggerMascotInspect, setTriggerMascotInspect] = useState(false);
  const [bioComparison, setBioComparison] = useState<any>(null);
  const [milestoneLadderModalVisible, setMilestoneLadderModalVisible] = useState(false);

  // Modal de Edição Completa de Perfil & Bioimpedância
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editProfile, setEditProfile] = useState<{
    name: string;
    age: string;
    height: string;
    weight: string;
    sex: BiologicalSex;
    bodyFat: string;
    muscleMass: string;
    bodyWater: string;
    waist: string;
    initialWeight: string;
    basalMetabolism: string;
    metabolicAge: string;
    activity: string;
    goal: string;
    checkinFrequency: number;
    avatarMascotId: MascotId;
  }>({
    name: '',
    age: '',
    height: '',
    weight: '',
    sex: 'male',
    bodyFat: '',
    muscleMass: '',
    bodyWater: '',
    waist: '',
    initialWeight: '',
    basalMetabolism: '',
    metabolicAge: '',
    activity: '',
    goal: '',
    checkinFrequency: 7,
    avatarMascotId: 'tita',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Modal de Exclusão Definitiva de Conta (Apple 5.1.1(v) & LGPD)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/profile/');
      setProfile(res);

      if (res) {
        setEditProfile({
          name: res.name || '',
          age: res.age ? String(res.age) : '',
          height: res.height_cm ? String(res.height_cm) : '',
          weight: res.weight_kg ? String(res.weight_kg) : '',
          sex: (res.sex === 'female' ? 'female' : 'male') as BiologicalSex,
          bodyFat: res.body_fat_pct !== undefined && res.body_fat_pct !== null ? String(res.body_fat_pct) : '',
          muscleMass: res.muscle_mass_pct !== undefined && res.muscle_mass_pct !== null ? String(res.muscle_mass_pct) : '',
          bodyWater: res.body_water_pct !== undefined && res.body_water_pct !== null ? String(res.body_water_pct) : '',
          waist: res.waist_cm ? String(res.waist_cm) : '',
          initialWeight: res.initial_weight_kg ? String(res.initial_weight_kg) : '',
          basalMetabolism: res.basal_metabolism_kcal ? String(res.basal_metabolism_kcal) : '',
          metabolicAge: res.metabolic_age ? String(res.metabolic_age) : '',
          activity: res.activity_level || 'medium',
          goal: res.goal_type || 'maintain',
          checkinFrequency: res.checkin_frequency_days || 7,
          avatarMascotId: (res.avatar_mascot_id as MascotId) || 'tita',
        });
      }

      const targetsRes = await api.get('/api/profile/targets');
      setTargets(targetsRes);

      if (targetsRes) {
        setEditTargets({
          calories: String(targetsRes.calories_target || 2000),
          protein: String(targetsRes.protein_g_target || targetsRes.protein_target_g || 140),
          carbs: String(targetsRes.carbs_g_target || targetsRes.carbs_target_g || 250),
          fats: String(targetsRes.fats_g_target || targetsRes.fats_target_g || 60),
          fiber: String(targetsRes.fiber_g_target || targetsRes.fiber_target_g || 28),
          water: String(targetsRes.water_target_ml || 2500),
          weeklyWorkouts: String(targetsRes.weekly_workouts_target || 4),
        });
      }

      // Comparativo de Bioimpedância: Marco Zero (1ª pesagem) vs Atual (última)
      try {
        const compRes = await api.get('/api/checkin/comparison');
        setBioComparison(compRes);
      } catch (ce) {
        console.warn('Erro ao carregar comparativo de bioimpedância:', ce);
      }
    } catch (e) {
      console.error('Erro ao buscar perfil:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const unsub1 = dataEvents.on('profile_updated', fetchProfile);
    const unsub2 = dataEvents.on('targets_updated', fetchProfile);
    const unsub3 = dataEvents.on('weight_logged', fetchProfile);
    const unsub4 = dataEvents.on('checkin_logged' as any, fetchProfile);
    return () => {
      unsub1(); unsub2(); unsub3(); unsub4();
    };
  }, []);

  const handleSignOut = () => {
    showConfirm('Encerrar Sessão', 'Deseja realmente sair da sua conta?', async () => {
      setSigningOut(true);
      try {
        await supabase.auth.signOut();
        router.replace('/(auth)/login');
      } catch (e) {
        console.error('Erro ao sair:', e);
        showToast('Falha ao encerrar sessão', 'error');
      } finally {
        setSigningOut(false);
      }
    });
  };

  const handleSaveTargets = async () => {
    setSavingTargets(true);
    try {
      await api.put('/api/profile/targets', {
        calories_target: parseInt(editTargets.calories, 10) || 2000,
        protein_g_target: parseInt(editTargets.protein, 10) || 140,
        carbs_g_target: parseInt(editTargets.carbs, 10) || 250,
        fats_g_target: parseInt(editTargets.fats, 10) || 60,
        fiber_g_target: parseInt(editTargets.fiber, 10) || 28,
        water_target_ml: parseInt(editTargets.water, 10) || 2500,
        weekly_workouts_target: parseInt(editTargets.weeklyWorkouts, 10) || 4,
      });
      showToast('Metas atualizadas com sucesso!', 'success');
      setEditTargetsModalVisible(false);
      fetchProfile();
    } catch (e) {
      console.error('Erro ao salvar metas:', e);
      showToast('Falha ao atualizar metas', 'error');
    } finally {
      setSavingTargets(false);
    }
  };

  const handleSelectMascot = async (mascotId: MascotId) => {
    try {
      await api.put('/api/profile/', { avatar_mascot_id: mascotId });
      setProfile((prev: any) => prev ? { ...prev, avatar_mascot_id: mascotId } : { avatar_mascot_id: mascotId });
      setEditProfile((prev) => ({ ...prev, avatarMascotId: mascotId }));
      showToast(`Mascote alterado para ${mascotId === 'tita' ? 'Titã 🥊' : 'Gaia 👑'}!`, 'success');
      setSelectMascotModalVisible(false);
      setTriggerMascotInspect(true);
      setTimeout(() => setTriggerMascotInspect(false), 5500);
    } catch (e) {
      showToast('Falha ao trocar mascote', 'error');
    }
  };

  const handleSaveMascotCustomization = async (newMascotId: MascotId, newCustom: MascotCustomization) => {
    try {
      await api.put('/api/profile/', {
        avatar_mascot_id: newMascotId,
        avatar_customization: newCustom,
      });
      setProfile((prev: any) => ({
        ...prev,
        avatar_mascot_id: newMascotId,
        avatar_customization: newCustom,
      }));
      setEditProfile((prev) => ({ ...prev, avatarMascotId: newMascotId }));
      showToast(`Visual 3D de ${newMascotId === 'tita' ? 'Titã 🥊' : 'Gaia 👑'} salvo com sucesso!`, 'success');
      setTriggerMascotInspect(true);
      setTimeout(() => setTriggerMascotInspect(false), 4500);
    } catch (e) {
      console.error('Erro ao salvar personalização:', e);
      showToast('Falha ao salvar personalização', 'error');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const parsedWeight = editProfile.weight ? parseFloat(editProfile.weight.replace(',', '.')) : null;
      const parsedHeight = editProfile.height ? parseInt(editProfile.height, 10) : null;
      const parsedAge = editProfile.age ? parseInt(editProfile.age, 10) : null;

      const parsedBodyFat = editProfile.bodyFat ? parseFloat(editProfile.bodyFat.replace(',', '.')) : null;
      const parsedMuscleMass = editProfile.muscleMass ? parseFloat(editProfile.muscleMass.replace(',', '.')) : null;
      const parsedBodyWater = editProfile.bodyWater ? parseFloat(editProfile.bodyWater.replace(',', '.')) : null;
      const parsedWaist = editProfile.waist ? parseFloat(editProfile.waist.replace(',', '.')) : null;
      const parsedInitialWeight = editProfile.initialWeight ? parseFloat(editProfile.initialWeight.replace(',', '.')) : null;
      const parsedBasal = editProfile.basalMetabolism ? parseInt(editProfile.basalMetabolism, 10) : null;
      const parsedMetabolicAge = editProfile.metabolicAge ? parseInt(editProfile.metabolicAge, 10) : null;

      const payload: any = {
        name: editProfile.name.trim() || 'Usuário',
        age: parsedAge,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        body_fat_pct: parsedBodyFat,
        muscle_mass_pct: parsedMuscleMass,
        body_water_pct: parsedBodyWater,
        waist_cm: parsedWaist,
        initial_weight_kg: parsedInitialWeight || profile?.initial_weight_kg || parsedWeight,
        initial_waist_cm: profile?.initial_waist_cm || parsedWaist,
        initial_body_fat_pct: profile?.initial_body_fat_pct || parsedBodyFat,
        avatar_mascot_id: editProfile.avatarMascotId || 'tita',
        basal_metabolism_kcal: parsedBasal,
        metabolic_age: parsedMetabolicAge,
        activity_level: editProfile.activity || 'medium',
        goal_type: editProfile.goal || 'maintain',
        sex: editProfile.sex || 'male',
        checkin_frequency_days: editProfile.checkinFrequency || 7,
      };

      await api.put('/api/profile/', payload);

      // Sincroniza também no log de peso de hoje se o peso tiver sido alterado
      if (parsedWeight && parsedWeight > 0) {
        const today = new Date().toISOString().split('T')[0];
        try {
          await api.post('/api/weight/', {
            date: today,
            weight_kg: parsedWeight,
            body_fat_pct: parsedBodyFat,
            muscle_mass_pct: parsedMuscleMass,
            body_water_pct: parsedBodyWater,
          });
        } catch (e) {
          // Ignora se der erro de conflict ou offline
        }
      }

      showToast('Dados corporais, bioimpedância e mascote atualizados!', 'success');
      setEditProfileModalVisible(false);
      setAvatarDisplayMode('3d');
      setTriggerMascotInspect(true);
      fetchProfile();
      try {
        dataEvents.emit('profile_updated');
        dataEvents.emit('checkin_logged' as any);
        dataEvents.emit('weight_logged');
      } catch {}
    } catch (e: any) {
      console.error('Erro ao salvar perfil:', e);
      showToast(e.message || 'Falha ao atualizar dados', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Exclusão Definitiva de Conta via RPC delete_user_account
  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput.trim().toUpperCase() !== 'EXCLUIR') {
      showToast('Digite a palavra EXCLUIR para confirmar', 'error');
      return;
    }

    setDeletingAccount(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;

      await AsyncStorage.clear();
      await supabase.auth.signOut();
      setDeleteModalVisible(false);
      showToast('Conta e dados excluídos com sucesso.', 'success');
      router.replace('/(auth)/login');
    } catch (e: any) {
      console.error('Erro ao excluir conta:', e);
      showToast(e.message || 'Falha ao excluir conta. Contate o suporte.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const activityLabels: Record<string, string> = {
    low: 'Leve (1-2x/sem)',
    medium: 'Moderado (3-4x/sem)',
    high: 'Intenso (5-7x/sem)',
  };

  const goalLabels: Record<string, string> = {
    fat_loss: 'Emagrecimento',
    maintain: 'Manutenção',
    muscle_gain: 'Hipertrofia',
  };

  const activities = [
    { id: 'low', label: 'Leve (1-2x)' },
    { id: 'medium', label: 'Moderado (3-4x)' },
    { id: 'high', label: 'Intenso (5-7x)' },
  ];

  const goals = [
    { id: 'fat_loss', label: 'Emagrecimento' },
    { id: 'maintain', label: 'Manutenção' },
    { id: 'muscle_gain', label: 'Hipertrofia' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  // Cálculos dinâmicos
  const currentWeight = profile?.weight_kg ? Number(profile.weight_kg) : 0;
  const currentHeight = profile?.height_cm ? Number(profile.height_cm) : 0;
  const currentAge = profile?.age ? Number(profile.age) : 0;
  const currentSex: BiologicalSex = profile?.sex === 'female' ? 'female' : 'male';

  const bmiEval = calculateBMI(currentWeight, currentHeight, currentAge);
  const estimatedBmr = estimateBMR(currentWeight, currentHeight, currentAge, currentSex);
  const activeBmr = profile?.basal_metabolism_kcal || estimatedBmr;
  const isCustomBmr = Boolean(profile?.basal_metabolism_kcal);

  const metabolicAgeEval = evaluateMetabolicAge(currentAge, profile?.metabolic_age);
  const fatEval = evaluateBodyFat(profile?.body_fat_pct, currentSex);

  // Avaliação Dinâmica do Mascote de Bioimpedância & Redução de Medidas
  const currentMascotId: MascotId = (profile?.avatar_mascot_id as MascotId) || (currentSex === 'female' ? 'gaia' : 'tita');
  const mascotEval = evaluateMascot({
    mascotId: currentMascotId,
    sex: currentSex,
    weightKg: currentWeight || 70,
    heightCm: currentHeight || 170,
    bodyFatPct: profile?.body_fat_pct,
    muscleMassPct: profile?.muscle_mass_pct,
    bodyWaterPct: profile?.body_water_pct,
    waistCm: profile?.waist_cm,
    initialWeightKg: profile?.initial_weight_kg || profile?.weight_kg,
    initialBodyFatPct: profile?.initial_body_fat_pct || profile?.body_fat_pct,
    initialWaistCm: profile?.initial_waist_cm || profile?.waist_cm,
    goalType: profile?.goal_type,
    customization: profile?.avatar_customization,
  });

  const userCaloriesTarget = targets?.calories_target || 2000;
  const userProteinTarget = targets?.protein_g_target || targets?.protein_target_g || 140;
  const userCarbsTarget = targets?.carbs_g_target || targets?.carbs_target_g || 250;
  const userFatsTarget = targets?.fats_g_target || targets?.fats_target_g || 60;
  const userFiberTarget = targets?.fiber_g_target || targets?.fiber_target_g || 28;
  const userWaterTarget = targets?.water_target_ml || 2500;
  const userWorkoutsTarget = targets?.weekly_workouts_target || 4;

  const handleOpenBioCeremony = () => {
    const bioReaction = evaluateBioReaction({
      current: {
        weightKg: currentWeight || bioComparison?.latestBio?.weightKg || 75.0,
        bodyFatPct: profile?.body_fat_pct ? Number(profile.body_fat_pct) : 22.0,
        muscleMassPct: profile?.muscle_mass_pct ? Number(profile.muscle_mass_pct) : 35.0,
        bodyWaterPct: profile?.body_water_pct ? Number(profile.body_water_pct) : 55.0,
        waistCm: profile?.waist_cm ? Number(profile.waist_cm) : 88.0,
      },
      previous: (bioComparison?.latestBio && bioComparison.latestBio.weightKg > 20) ? {
        weightKg: bioComparison.latestBio.weightKg,
        bodyFatPct: bioComparison.latestBio.bodyFatPct,
        muscleMassPct: bioComparison.latestBio.muscleMassPct,
        waistCm: bioComparison.latestBio.waistCm,
      } : {
        weightKg: +(currentWeight ? currentWeight + 1.2 : 76.2).toFixed(1),
        bodyFatPct: +(profile?.body_fat_pct ? Number(profile.body_fat_pct) + 1.4 : 23.4).toFixed(1),
        muscleMassPct: profile?.muscle_mass_pct ? Number(profile.muscle_mass_pct) : 35.0,
        waistCm: +(profile?.waist_cm ? Number(profile.waist_cm) + 2.0 : 90.0).toFixed(1),
      },
      baseline: (bioComparison?.firstBio && bioComparison.firstBio.weightKg > 20) ? {
        weightKg: bioComparison.firstBio.weightKg,
        bodyFatPct: bioComparison.firstBio.bodyFatPct,
        waistCm: bioComparison.firstBio.waistCm,
      } : {
        weightKg: +(currentWeight ? currentWeight + 6.0 : 81.0).toFixed(1),
        bodyFatPct: +(profile?.body_fat_pct ? Number(profile.body_fat_pct) + 5.0 : 27.0).toFixed(1),
        waistCm: +(profile?.waist_cm ? Number(profile.waist_cm) + 8.0 : 96.0).toFixed(1),
      },
      mascotId: currentMascotId,
      sex: currentSex,
      heightCm: currentHeight || 170,
      userName: profile?.name || 'Guerreiro',
      previousStageLevel: mascotEval?.stageLevel || 1,
    });

    setActiveReactionResult(bioReaction);
    setCeremonyModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho */}
        <Text style={styles.headerTitle}>Configurações & Perfil</Text>

        {/* Card de Identificação do Usuário */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => setEditProfileModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarContainer}>
            <User color="#22c55e" size={28} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'Seu Nome'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || 'email@exemplo.com'}</Text>
          </View>
          <View style={styles.editBtn}>
            <Edit3 color="#22c55e" size={18} />
          </View>
        </TouchableOpacity>

        {/* HERO CARD: SEU MASCOTE DA BATALHA DA BALANÇA (3D VIVO & REATIVO) */}
        <View style={styles.mascotHeroCard}>
          <View style={styles.mascotTopHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy color="#eab308" size={18} />
              <Text style={styles.mascotHeaderTitle}>Seu Mascote da Batalha</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Toggle Modo 3D Vivo vs Ilustração 2D */}
              <View style={styles.avatarModeToggle}>
                <TouchableOpacity
                  style={[styles.avatarModeBtn, avatarDisplayMode === '3d' && styles.avatarModeBtnActive]}
                  onPress={() => setAvatarDisplayMode('3d')}
                  activeOpacity={0.8}
                >
                  <Zap color={avatarDisplayMode === '3d' ? '#22c55e' : '#6b7280'} size={12} />
                  <Text style={[styles.avatarModeBtnText, avatarDisplayMode === '3d' && styles.avatarModeBtnTextActive]}>
                    3D Vivo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.avatarModeBtn, avatarDisplayMode === '2d' && styles.avatarModeBtnActive]}
                  onPress={() => setAvatarDisplayMode('2d')}
                  activeOpacity={0.8}
                >
                  <Eye color={avatarDisplayMode === '2d' ? '#22c55e' : '#6b7280'} size={12} />
                  <Text style={[styles.avatarModeBtnText, avatarDisplayMode === '2d' && styles.avatarModeBtnTextActive]}>
                    2D Arte
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.switchMascotBtn}
                onPress={() => setSelectMascotModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.switchMascotBtnText}>{mascotEval.mascotName}</Text>
                <ChevronRight color="#22c55e" size={13} />
              </TouchableOpacity>
            </View>
          </View>

          {avatarDisplayMode === '3d' ? (
            /* PALCO 3D VIVO: Personagem reativo sobre a balança de bioimpedância */
            <View style={styles.living3DStageWrapper}>
              <View style={styles.livingStageHeaderRow}>
                <View style={[styles.mascotArchetypeBadge, { backgroundColor: `${mascotEval.badgeColor}25`, borderColor: mascotEval.badgeColor }]}>
                  <Text style={[styles.mascotArchetypeText, { color: mascotEval.badgeColor }]}>
                    {mascotEval.badgeLabel} • FASE {mascotEval.stageLevel}
                  </Text>
                </View>
                <Text style={styles.livingStageSubtitle}>{mascotEval.stageName}</Text>
              </View>

              <LivingAvatar3D 
                mascotId={currentMascotId}
                weightKg={currentWeight || bioComparison?.latestBio?.weightKg || 75}
                heightCm={currentHeight || 170}
                bodyFatPct={profile?.body_fat_pct}
                muscleMassPct={profile?.muscle_mass_pct}
                morphology={mascotEval.morphology}
                customization={profile?.avatar_customization}
                isInspecting={triggerMascotInspect}
                onInspectionTrigger={() => {
                  soundHaptics.triggerMediumTap();
                  setTriggerMascotInspect(true);
                  setTimeout(() => setTriggerMascotInspect(false), 5500);
                }}
                size={220}
                hideBubble={true}
              />

              {/* Botões de Ação Imediata da Balança */}
              <View style={styles.avatarQuickActionRow}>
                <TouchableOpacity
                  style={styles.customizeTriggerBtn}
                  onPress={() => {
                    soundHaptics.triggerLightTap();
                    setMascotStudioModalVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Palette color="#c084fc" size={15} />
                  <Text style={styles.customizeTriggerBtnText}>Personalizar 3D</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scanTriggerBtn}
                  onPress={() => {
                    soundHaptics.triggerMediumTap();
                    setTriggerMascotInspect(true);
                    setTimeout(() => setTriggerMascotInspect(false), 5500);
                  }}
                  activeOpacity={0.85}
                >
                  <Sparkles color="#eab308" size={15} />
                  <Text style={styles.scanTriggerBtnText}>Inspecionar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.updateScaleBtn}
                  onPress={() => {
                    soundHaptics.triggerMediumTap();
                    handleOpenBioCeremony();
                  }}
                  activeOpacity={0.85}
                >
                  <Scale color="#22c55e" size={15} />
                  <Text style={styles.updateScaleBtnText}>Balança</Text>
                </TouchableOpacity>
              </View>

              {/* Status Morfológico em Tempo Real guiado por Peso + % Gordura + % Massa Muscular */}
              <View style={styles.morphDetailsRow}>
                <View style={styles.morphPill}>
                  <Dumbbell color="#22c55e" size={12} />
                  <Text style={styles.morphPillLabel}>Braços & Pernas</Text>
                  <Text style={styles.morphPillValue}>
                    {Math.round(mascotEval.morphology.armBulk * 100)}% porte
                  </Text>
                </View>
                <View style={styles.morphPill}>
                  <Flame color="#eab308" size={12} />
                  <Text style={styles.morphPillLabel}>Definição</Text>
                  <Text style={styles.morphPillValue}>
                    {Math.round(mascotEval.morphology.muscleDefinition * 100)}% tomus
                  </Text>
                </View>
                <View style={styles.morphPill}>
                  <Activity color="#38bdf8" size={12} />
                  <Text style={styles.morphPillLabel}>Abdômen</Text>
                  <Text style={styles.morphPillValue}>
                    {mascotEval.morphology.bellyVolume <= 1.0 ? 'Definido' : 'Em Transição'}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* MODO 2D: Ilustração de Colecionador com 10 Marcos Granulares Oficiais */
            <View style={styles.mascot2DContainer}>
              <View style={styles.mascotBodyRow}>
                <View style={styles.mascotAvatarWrapper}>
                  <Image 
                    source={getMascotImage(mascotEval.milestoneAssetKey || mascotEval.assetKey)} 
                    style={styles.mascotAvatarImage} 
                    resizeMode="contain" 
                  />
                  <View style={[styles.mascotArchetypeBadge, { backgroundColor: `${mascotEval.badgeColor}25`, borderColor: mascotEval.badgeColor }]}>
                    <Text style={[styles.mascotArchetypeText, { color: mascotEval.badgeColor }]}>
                      MARCO {mascotEval.milestoneLevel}/10 • {mascotEval.milestoneBadge}
                    </Text>
                  </View>
                </View>

                <View style={styles.mascotDetails}>
                  <Text style={styles.mascotStageTitle}>{mascotEval.milestoneName || mascotEval.stageName}</Text>
                  <Text style={styles.mascotStageDesc}>{mascotEval.stageDescription}</Text>
                  
                  <View style={styles.speechBubble}>
                    <Sparkles color="#eab308" size={14} style={{ marginTop: 2 }} />
                    <Text style={styles.speechText}>"{mascotEval.milestoneQuote || mascotEval.flavorQuote}"</Text>
                  </View>

                  {/* Recompensa Cosmética Desbloqueada */}
                  {mascotEval.unlockedCosmetics && mascotEval.unlockedCosmetics.length > 0 && (
                    <View style={styles.cosmeticBadgePill}>
                      <Trophy color="#eab308" size={11} />
                      <Text style={styles.cosmeticBadgePillText} numberOfLines={1}>
                        🎁 {mascotEval.unlockedCosmetics[0]}
                      </Text>
                    </View>
                  )}

                  {/* Botões de Ação do Modo 2D */}
                  <View style={styles.mascot2DActionsRow}>
                    <TouchableOpacity
                      style={styles.openLadderBtn}
                      onPress={() => {
                        soundHaptics.triggerLightTap();
                        setMilestoneLadderModalVisible(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Trophy color="#22c55e" size={12} />
                      <Text style={styles.openLadderBtnText}>Ver 10 Marcos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.share2DBtn}
                      onPress={() => {
                        soundHaptics.triggerLightTap();
                        setShowVictoryCard(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Share2 color="#38bdf8" size={12} />
                      <Text style={styles.share2DBtnText}>Card Stories</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Trilho Horizontal dos 10 Marcos com Navegação */}
              <View style={styles.milestoneTrackSection}>
                <View style={styles.milestoneTrackHeader}>
                  <Text style={styles.milestoneTrackTitle}>
                    Esteira dos 10 Marcos ({currentMascotId === 'gaia' ? 'Gaia' : 'Titã'})
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      soundHaptics.triggerLightTap();
                      setMilestoneLadderModalVisible(true);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.milestoneTrackSeeAll}>Ver Todos</Text>
                    <ChevronRight color="#22c55e" size={12} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.milestoneTrackScroll}
                >
                  {getDetailedMilestones(currentMascotId).map((m) => {
                    const isConquered = mascotEval.milestoneLevel >= m.level;
                    const isCurrent = mascotEval.milestoneLevel === m.level;

                    return (
                      <TouchableOpacity
                        key={`mini-m-${m.level}`}
                        style={[
                          styles.miniMilestoneCard,
                          isCurrent && styles.miniMilestoneCardCurrent,
                          isConquered && !isCurrent && styles.miniMilestoneCardConquered,
                        ]}
                        onPress={() => {
                          soundHaptics.triggerLightTap();
                          setMilestoneLadderModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={getMascotImage(m.assetKey)}
                          style={styles.miniMilestoneThumb}
                          resizeMode="contain"
                        />
                        <Text style={[styles.miniMilestoneLevel, isCurrent && { color: '#facc15' }]}>
                          M{m.level}
                        </Text>
                        <Text style={styles.miniMilestoneWeight}>{m.weightKg.toFixed(0)}kg</Text>
                        {isCurrent ? (
                          <View style={styles.miniCurrentDot} />
                        ) : isConquered ? (
                          <Check color="#22c55e" size={10} style={{ marginTop: 2 }} />
                        ) : (
                          <Lock color="#64748b" size={9} style={{ marginTop: 2 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Barra de Evolução Visual de Medidas & Peso Rumo à Forma Campeã */}
          <View style={styles.evolutionBarContainer}>
            <View style={styles.evolutionBarHeader}>
              <Text style={styles.evolutionBarTitle}>Evolução Corporal (Fase {mascotEval.stageLevel} de 5)</Text>
              <Text style={styles.evolutionBarPct}>{mascotEval.progressPercentage}%</Text>
            </View>
            <View style={styles.evolutionTrack}>
              <View style={[styles.evolutionFill, { width: `${mascotEval.progressPercentage}%`, backgroundColor: mascotEval.badgeColor }]} />
            </View>
          </View>

          {/* ⚖️ PAINEL COMPARATIVO DE BIOIMPEDÂNCIA (PRIMEIRA VS ÚLTIMA PESAGEM) */}
          <View style={styles.bioComparisonCard}>
            <View style={styles.bioComparisonHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Activity color="#22c55e" size={16} />
                <Text style={styles.bioComparisonTitle}>Bioimpedância: 1ª vs. Atual</Text>
              </View>
              <View style={[styles.bioStatusBadge, {
                backgroundColor: bioComparison?.status === 'great_progress' ? 'rgba(34, 197, 94, 0.2)'
                  : bioComparison?.status === 'muscle_loss_alert' ? 'rgba(239, 68, 68, 0.2)'
                  : bioComparison?.status === 'hypertrophy' ? 'rgba(234, 179, 8, 0.2)'
                  : 'rgba(56, 189, 248, 0.2)',
                borderColor: bioComparison?.status === 'great_progress' ? '#22c55e'
                  : bioComparison?.status === 'muscle_loss_alert' ? '#ef4444'
                  : bioComparison?.status === 'hypertrophy' ? '#eab308'
                  : '#38bdf8',
              }]}>
                <Text style={[styles.bioStatusBadgeText, {
                  color: bioComparison?.status === 'great_progress' ? '#22c55e'
                    : bioComparison?.status === 'muscle_loss_alert' ? '#ef4444'
                    : bioComparison?.status === 'hypertrophy' ? '#eab308'
                    : '#38bdf8',
                }]}>
                  {bioComparison?.status === 'great_progress' ? '🟢 Queima Efetiva'
                    : bioComparison?.status === 'muscle_loss_alert' ? '🔴 Alerta de Flacidez'
                    : bioComparison?.status === 'hypertrophy' ? '🏆 Hipertrofia'
                    : bioComparison?.status === 'fat_gain_alert' ? '⚠️ Força Bruta'
                    : '📌 Marco Zero'}
                </Text>
              </View>
            </View>

            {/* Grid Comparativo Lado a Lado (1º Check-in vs Último Check-in) */}
            <View style={styles.bioDuelRow}>
              {/* Card Esquerda: 1ª Bioimpedância */}
              <View style={styles.bioDuelColumn}>
                <Text style={styles.bioDuelColTitle}>1ª Pesagem</Text>
                <Text style={styles.bioDuelDate}>
                  {bioComparison?.firstBio?.date && bioComparison.firstBio.date !== 'Início'
                    ? new Date(bioComparison.firstBio.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : 'Marco Zero'}
                </Text>

                <View style={styles.bioDuelStatItem}>
                  <Text style={styles.bioDuelStatLabel}>Peso</Text>
                  <Text style={styles.bioDuelStatVal}>{bioComparison?.firstBio?.weightKg ? `${bioComparison.firstBio.weightKg.toFixed(1)}kg` : '--'}</Text>
                </View>

                <View style={styles.bioDuelStatItem}>
                  <Text style={styles.bioDuelStatLabel}>Gordura</Text>
                  <Text style={styles.bioDuelStatVal}>{bioComparison?.firstBio?.bodyFatPct !== null && bioComparison?.firstBio?.bodyFatPct !== undefined ? `${bioComparison.firstBio.bodyFatPct}%` : '--'}</Text>
                </View>

                <View style={styles.bioDuelStatItem}>
                  <Text style={styles.bioDuelStatLabel}>Músculo</Text>
                  <Text style={styles.bioDuelStatVal}>{bioComparison?.firstBio?.muscleMassPct !== null && bioComparison?.firstBio?.muscleMassPct !== undefined ? `${bioComparison.firstBio.muscleMassPct}%` : '--'}</Text>
                </View>

                <View style={styles.bioDuelStatItem}>
                  <Text style={styles.bioDuelStatLabel}>Cintura</Text>
                  <Text style={styles.bioDuelStatVal}>{bioComparison?.firstBio?.waistCm ? `${bioComparison.firstBio.waistCm}cm` : '--'}</Text>
                </View>
              </View>

              {/* Centro: Seta de Evolução & Deltas */}
              <View style={styles.bioDuelCenterCol}>
                <View style={styles.bioArrowBadge}>
                  <ChevronRight color="#22c55e" size={14} />
                </View>

                {/* Delta Peso */}
                <View style={styles.bioDeltaPill}>
                  <Text style={[styles.bioDeltaText, { color: (bioComparison?.deltas?.weightDeltaKg || 0) <= 0 ? '#22c55e' : '#f59e0b' }]}>
                    {(bioComparison?.deltas?.weightDeltaKg || 0) <= 0 
                      ? `${bioComparison?.deltas?.weightDeltaKg || 0}kg` 
                      : `+${bioComparison?.deltas?.weightDeltaKg}kg`}
                  </Text>
                </View>

                {/* Delta Gordura */}
                <View style={styles.bioDeltaPill}>
                  <Text style={[styles.bioDeltaText, { color: (bioComparison?.deltas?.fatDeltaPct ?? 0) <= 0 ? '#22c55e' : '#ef4444' }]}>
                    {bioComparison?.deltas?.fatDeltaPct !== null && bioComparison?.deltas?.fatDeltaPct !== undefined
                      ? (bioComparison.deltas.fatDeltaPct <= 0 ? `${bioComparison.deltas.fatDeltaPct}%` : `+${bioComparison.deltas.fatDeltaPct}%`)
                      : '--'}
                  </Text>
                </View>

                {/* Delta Músculo */}
                <View style={styles.bioDeltaPill}>
                  <Text style={[styles.bioDeltaText, { color: (bioComparison?.deltas?.muscleDeltaPct ?? 0) >= 0 ? '#22c55e' : '#ef4444' }]}>
                    {bioComparison?.deltas?.muscleDeltaPct !== null && bioComparison?.deltas?.muscleDeltaPct !== undefined
                      ? (bioComparison.deltas.muscleDeltaPct >= 0 ? `+${bioComparison.deltas.muscleDeltaPct}%` : `${bioComparison.deltas.muscleDeltaPct}%`)
                      : '--'}
                  </Text>
                </View>

                {/* Delta Cintura */}
                <View style={styles.bioDeltaPill}>
                  <Text style={[styles.bioDeltaText, { color: (bioComparison?.deltas?.waistDeltaCm ?? 0) <= 0 ? '#38bdf8' : '#ef4444' }]}>
                    {bioComparison?.deltas?.waistDeltaCm !== null && bioComparison?.deltas?.waistDeltaCm !== undefined
                      ? (bioComparison.deltas.waistDeltaCm <= 0 ? `${bioComparison.deltas.waistDeltaCm}cm` : `+${bioComparison.deltas.waistDeltaCm}cm`)
                      : '--'}
                  </Text>
                </View>
              </View>

              {/* Card Direita: Última Bioimpedância */}
              <View style={[styles.bioDuelColumn, { borderColor: 'rgba(34, 197, 94, 0.45)' }]}>
                <Text style={[styles.bioDuelColTitle, { color: '#22c55e' }]}>Última</Text>
                <Text style={styles.bioDuelDate}>
                  {bioComparison?.latestBio?.date && bioComparison.latestBio.date !== 'Hoje'
                    ? new Date(bioComparison.latestBio.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : 'Hoje'}
                </Text>

                <View style={styles.bioDuelStatItem}>
                  <Text style={styles.bioDuelStatLabel}>Peso</Text>
                  <Text style={[styles.bioDuelStatVal, { color: '#ffffff', fontWeight: 'bold' }]}>
                    {bioComparison?.latestBio?.weightKg ? `${bioComparison.latestBio.weightKg.toFixed(1)}kg` : `${currentWeight.toFixed(1)}kg`}
                  </Text>
                </View>

                <View style={styles.bioDuelStatItem}>
                  <Text style={styles.bioDuelStatLabel}>Gordura</Text>
                  <Text style={[styles.bioDuelStatVal, { color: '#ffffff', fontWeight: 'bold' }]}>
                    {bioComparison?.latestBio?.bodyFatPct !== null && bioComparison?.latestBio?.bodyFatPct !== undefined ? `${bioComparison.latestBio.bodyFatPct}%` : '--'}
                  </Text>
                </View>

                <View style={styles.bioDuelStatItem}>
                  <Text style={styles.bioDuelStatLabel}>Músculo</Text>
                  <Text style={[styles.bioDuelStatVal, { color: '#ffffff', fontWeight: 'bold' }]}>
                    {bioComparison?.latestBio?.muscleMassPct !== null && bioComparison?.latestBio?.muscleMassPct !== undefined ? `${bioComparison.latestBio.muscleMassPct}%` : '--'}
                  </Text>
                </View>

                <View style={styles.bioDuelStatItem}>
                  <Text style={styles.bioDuelStatLabel}>Cintura</Text>
                  <Text style={[styles.bioDuelStatVal, { color: '#ffffff', fontWeight: 'bold' }]}>
                    {bioComparison?.latestBio?.waistCm ? `${bioComparison.latestBio.waistCm}cm` : '--'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Diagnóstico do Mascote sobre a Evolução */}
            <View style={styles.bioDiagnosticBox}>
              <Sparkles color="#facc15" size={14} style={{ marginTop: 2 }} />
              <Text style={styles.bioDiagnosticText}>
                {bioComparison?.feedback || mascotEval.measurementsFeedback}
              </Text>
            </View>
          </View>

          {/* Dica da Próxima Fase */}
          <View style={styles.nextMilestoneBox}>
            <Text style={styles.nextMilestoneText}>🎯 {mascotEval.nextMilestone}</Text>
          </View>

          {/* Botão de Compartilhar Vitória Social */}
          <TouchableOpacity
            style={styles.shareVictoryProfileBtn}
            onPress={() => {
              soundHaptics.triggerMediumTap();
              setShowVictoryCard(true);
            }}
            activeOpacity={0.85}
          >
            <Share2 color="#10b981" size={16} />
            <Text style={styles.shareVictoryProfileText}>Gerar Card de Vitória para Stories / Zap</Text>
          </TouchableOpacity>
        </View>

        {/* 1) HERO CARD: BIOMETRIA BÁSICA & IMC */}
        <View style={styles.heroBiometricCard}>
          <View style={styles.biometricTopRow}>
            <View style={styles.biometricStat}>
              <View style={styles.statIconBadge}>
                <Calendar color="#22c55e" size={14} />
              </View>
              <Text style={styles.biometricValue}>{currentAge > 0 ? `${currentAge}` : '--'}</Text>
              <Text style={styles.biometricLabel}>Idade Real</Text>
            </View>

            <View style={styles.biometricDivider} />

            <View style={styles.biometricStat}>
              <View style={styles.statIconBadge}>
                <Ruler color="#38bdf8" size={14} />
              </View>
              <Text style={styles.biometricValue}>{currentHeight > 0 ? `${currentHeight}` : '--'}</Text>
              <Text style={styles.biometricLabel}>Altura (cm)</Text>
            </View>

            <View style={styles.biometricDivider} />

            <View style={styles.biometricStat}>
              <View style={styles.statIconBadge}>
                <Scale color="#a855f7" size={14} />
              </View>
              <Text style={styles.biometricValue}>{currentWeight > 0 ? `${currentWeight.toFixed(1)}` : '--'}</Text>
              <Text style={styles.biometricLabel}>Peso (kg)</Text>
            </View>
          </View>

          {/* Faixa Integrada de IMC */}
          <View style={styles.bmiSection}>
            <View style={styles.bmiHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Activity color={bmiEval?.color || '#22c55e'} size={18} />
                <Text style={styles.bmiTitle}>Índice de Massa Corporal (IMC)</Text>
              </View>
              {bmiEval && (
                <View style={[styles.bmiCategoryBadge, { backgroundColor: `${bmiEval.color}20`, borderColor: `${bmiEval.color}50` }]}>
                  <Text style={[styles.bmiCategoryText, { color: bmiEval.color }]}>{bmiEval.label}</Text>
                </View>
              )}
            </View>

            <View style={styles.bmiValueRow}>
              <Text style={styles.bmiNumber}>{bmiEval ? bmiEval.bmi : '--'}</Text>
              <Text style={styles.bmiUnit}>kg/m²</Text>
              {bmiEval && (
                <Text style={styles.bmiStandardText}>({bmiEval.standard})</Text>
              )}
            </View>

            {/* Espectro Visual de Cores do IMC */}
            {bmiEval?.isElderly ? (
              <>
                <View style={styles.bmiTrackContainer}>
                  <View style={[styles.bmiTrackSegment, { backgroundColor: '#38bdf8', flex: 22.0 }]} />
                  <View style={[styles.bmiTrackSegment, { backgroundColor: '#22c55e', flex: 5.0 }]} />
                  <View style={[styles.bmiTrackSegment, { backgroundColor: '#f59e0b', flex: 10.0 }]} />
                </View>
                <View style={styles.bmiTrackLegend}>
                  <Text style={styles.legendText}>Baixo Peso (&lt; 22)</Text>
                  <Text style={styles.legendText}>Adequado (22-27)</Text>
                  <Text style={styles.legendText}>Sobrepeso (&gt; 27)</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.bmiTrackContainer}>
                  <View style={[styles.bmiTrackSegment, { backgroundColor: '#38bdf8', flex: 18.5 }]} />
                  <View style={[styles.bmiTrackSegment, { backgroundColor: '#22c55e', flex: 6.4 }]} />
                  <View style={[styles.bmiTrackSegment, { backgroundColor: '#f59e0b', flex: 5.0 }]} />
                  <View style={[styles.bmiTrackSegment, { backgroundColor: '#ef4444', flex: 10.0 }]} />
                </View>
                <View style={styles.bmiTrackLegend}>
                  <Text style={styles.legendText}>Abaixo</Text>
                  <Text style={styles.legendText}>Eutrofia (18.5-24.9)</Text>
                  <Text style={styles.legendText}>Sobrepeso</Text>
                  <Text style={styles.legendText}>Obesidade (ABESO)</Text>
                </View>
              </>
            )}

            {bmiEval?.details && (
              <Text style={styles.bmiDetailsText}>{bmiEval.details}</Text>
            )}
          </View>
        </View>

        {/* 2) PAINEL DE BIOIMPEDÂNCIA COMPLETA */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Scale color="#22c55e" size={20} />
            <Text style={styles.sectionTitle}>Composição Corporal (Bioimpedância)</Text>
          </View>
          <TouchableOpacity onPress={() => setEditProfileModalVisible(true)} style={styles.editLink}>
            <Text style={styles.editLinkText}>Editar</Text>
            <ChevronRight color="#22c55e" size={16} />
          </TouchableOpacity>
        </View>

        <View style={styles.bioGrid}>
          {/* Gordura Corporal % */}
          <View style={styles.bioCard}>
            <View style={styles.bioCardHeader}>
              <Text style={styles.bioCardTitle}>Gordura Corporal</Text>
              <View style={[styles.bioIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ef4444' }}>%</Text>
              </View>
            </View>
            <Text style={styles.bioCardValue}>
              {profile?.body_fat_pct !== undefined && profile?.body_fat_pct !== null ? `${profile.body_fat_pct}%` : '--'}
            </Text>
            {fatEval ? (
              <Text style={[styles.bioCardStatus, { color: fatEval.color }]}>{fatEval.label}</Text>
            ) : (
              <Text style={styles.bioCardHint}>Toque em editar para registrar</Text>
            )}
          </View>

          {/* Massa Muscular % */}
          <View style={styles.bioCard}>
            <View style={styles.bioCardHeader}>
              <Text style={styles.bioCardTitle}>Massa Muscular</Text>
              <View style={[styles.bioIconBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Dumbbell color="#22c55e" size={15} />
              </View>
            </View>
            <Text style={[styles.bioCardValue, { color: '#22c55e' }]}>
              {profile?.muscle_mass_pct !== undefined && profile?.muscle_mass_pct !== null ? `${profile.muscle_mass_pct}%` : '--'}
            </Text>
            <Text style={styles.bioCardHint}>Densidade esquelética e magra</Text>
          </View>

          {/* Água Corporal % */}
          <View style={styles.bioCard}>
            <View style={styles.bioCardHeader}>
              <Text style={styles.bioCardTitle}>Água Corporal</Text>
              <View style={[styles.bioIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Droplets color="#38bdf8" size={15} />
              </View>
            </View>
            <Text style={[styles.bioCardValue, { color: '#38bdf8' }]}>
              {profile?.body_water_pct !== undefined && profile?.body_water_pct !== null ? `${profile.body_water_pct}%` : '--'}
            </Text>
            <Text style={styles.bioCardHint}>Hidratação intracelular</Text>
          </View>

          {/* Metabolismo Basal kcal/dia */}
          <View style={styles.bioCard}>
            <View style={styles.bioCardHeader}>
              <Text style={styles.bioCardTitle}>Metabolismo Basal</Text>
              <View style={[styles.bioIconBadge, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                <Flame color="#f97316" size={15} />
              </View>
            </View>
            <Text style={[styles.bioCardValue, { color: '#f97316' }]}>
              {activeBmr > 0 ? `${activeBmr}` : '--'}
              <Text style={{ fontSize: 13, color: '#9ca3af', fontWeight: 'normal' }}> kcal</Text>
            </Text>
            <Text style={styles.bioCardHint}>
              {isCustomBmr ? 'Medido pela balança' : 'Estimativa Mifflin-St Jeor'}
            </Text>
          </View>

          {/* Idade Metabólica (Card Largo com Comparativo) */}
          <View style={styles.bioCardFull}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Sparkles color="#a855f7" size={18} />
                  <Text style={styles.bioCardTitle}>Idade Metabólica</Text>
                </View>
                <Text style={styles.bioCardValueLarge}>
                  {profile?.metabolic_age ? `${profile.metabolic_age} anos` : 'Não informada'}
                </Text>
              </View>

              {metabolicAgeEval && (
                <View style={[styles.metaAgeBadge, { backgroundColor: `${metabolicAgeEval.color}20`, borderColor: `${metabolicAgeEval.color}50` }]}>
                  <Text style={[styles.metaAgeText, { color: metabolicAgeEval.color }]}>
                    {metabolicAgeEval.label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.bioCardSubtext}>
              {profile?.metabolic_age 
                ? 'Indica o ritmo e vitalidade celular aferidos pelos sensores de bioimpedância.'
                : 'Informe a idade metabólica da sua balança para comparar com sua idade cronológica real.'}
            </Text>
          </View>
        </View>

        {/* Badges de Atividade, Objetivo e Check-in Oficial */}
        <View style={styles.badgesRow}>
          <TouchableOpacity
            style={styles.badge}
            onPress={() => setEditProfileModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeLabel}>Nível de Atividade</Text>
            <Text style={styles.badgeValue}>{activityLabels[profile?.activity_level] || 'Moderado'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.badge}
            onPress={() => setEditProfileModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeLabel}>Objetivo Atual</Text>
            <Text style={styles.badgeValue}>{goalLabels[profile?.goal_type] || 'Manutenção'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.badge}
            onPress={() => setEditProfileModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeLabel}>Check-in Oficial</Text>
            <Text style={[styles.badgeValue, { color: '#eab308' }]}>
              {profile?.checkin_frequency_days === 14 ? 'A cada 14d' : profile?.checkin_frequency_days === 30 ? 'A cada 30d' : 'Semanal (7d)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3) METAS NUTRICIONAIS & HÁBITOS */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Target color="#22c55e" size={20} />
            <Text style={styles.sectionTitle}>Metas Nutricionais & Hábitos</Text>
          </View>
          <TouchableOpacity onPress={() => setEditTargetsModalVisible(true)} style={styles.editLink}>
            <Text style={styles.editLinkText}>Editar</Text>
            <ChevronRight color="#22c55e" size={16} />
          </TouchableOpacity>
        </View>

        <View style={styles.targetsGrid}>
          <View style={styles.targetCard}>
            <Text style={styles.targetValue}>{userCaloriesTarget.toLocaleString()}</Text>
            <Text style={styles.targetLabel}>Calorias (kcal)</Text>
          </View>
          <View style={styles.targetCard}>
            <Text style={styles.targetValue}>{userProteinTarget}g</Text>
            <Text style={styles.targetLabel}>Proteínas</Text>
          </View>
          <View style={styles.targetCard}>
            <Text style={styles.targetValue}>{userCarbsTarget}g</Text>
            <Text style={styles.targetLabel}>Carboidratos</Text>
          </View>
          <View style={styles.targetCard}>
            <Text style={styles.targetValue}>{userFatsTarget}g</Text>
            <Text style={styles.targetLabel}>Gorduras</Text>
          </View>
          <View style={styles.targetCard}>
            <Text style={[styles.targetValue, { color: '#38bdf8' }]}>{userFiberTarget}g</Text>
            <Text style={styles.targetLabel}>Fibras</Text>
          </View>
          <View style={styles.targetCard}>
            <Text style={[styles.targetValue, { color: '#0ea5e9' }]}>{(userWaterTarget / 1000).toFixed(1)}L</Text>
            <Text style={styles.targetLabel}>Água Diária</Text>
          </View>
          <View style={[styles.targetCard, { width: '100%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Dumbbell color="#22c55e" size={18} />
              <Text style={styles.targetValue}>{userWorkoutsTarget} treinos / semana</Text>
            </View>
            <Text style={styles.targetLabel}>Frequência de Atividade Física Planejada</Text>
          </View>
        </View>

        {/* Aviso Legal & Médico Obrigatório - CFM 2.314/2022 e CFN */}
        <View style={styles.disclaimerBox}>
          <View style={styles.disclaimerHeader}>
            <Info color="#9ca3af" size={18} />
            <Text style={styles.disclaimerTitle}>Aviso Médico & Regulatório</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Este aplicativo é uma ferramenta de apoio ao monitoramento de hábitos e estilo de vida saudável. Não substitui o aconselhamento, diagnóstico ou prescrição dietética individualizada, atividades privativas de nutricionistas e médicos (Lei Federal nº 8.234/1991 e Resolução CFM nº 2.314/2022). Consulte sempre um profissional de saúde qualificado antes de alterações severas na dieta ou rotina de treinos.
          </Text>
        </View>

        {/* Encerrar Sessão */}
        <TouchableOpacity
          style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          <LogOut color="#9ca3af" size={18} />
          <Text style={styles.signOutText}>{signingOut ? 'Saindo...' : 'Encerrar Sessão'}</Text>
        </TouchableOpacity>

        {/* Exclusão Definitiva de Conta (Apple Guideline 5.1.1(v) & LGPD) */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setDeleteModalVisible(true)}
          activeOpacity={0.8}
        >
          <Trash2 color="#ef4444" size={18} />
          <Text style={styles.deleteAccountText}>Excluir Minha Conta e Todos os Dados</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DE EDIÇÃO DE METAS */}
      <Modal visible={editTargetsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajustar Metas</Text>
              <TouchableOpacity onPress={() => setEditTargetsModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'calories', label: 'Meta de Calorias (kcal)', value: editTargets.calories },
                { key: 'protein', label: 'Meta de Proteína (g)', value: editTargets.protein },
                { key: 'carbs', label: 'Meta de Carboidratos (g)', value: editTargets.carbs },
                { key: 'fats', label: 'Meta de Gorduras (g)', value: editTargets.fats },
                { key: 'fiber', label: 'Meta de Fibras (g)', value: editTargets.fiber },
                { key: 'water', label: 'Meta de Água (ml)', value: editTargets.water },
                { key: 'weeklyWorkouts', label: 'Treinos por Semana (dias)', value: editTargets.weeklyWorkouts },
              ].map((item) => (
                <View key={item.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{item.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={item.value}
                    onChangeText={(v) => setEditTargets((prev) => ({ ...prev, [item.key]: v }))}
                    keyboardType="numeric"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.saveButton, savingTargets && styles.buttonDisabled]}
                onPress={handleSaveTargets}
                disabled={savingTargets}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {savingTargets ? 'Salvando...' : 'Salvar Metas'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE EDIÇÃO COMPLETA DE PERFIL & BIOIMPEDÂNCIA */}
      <Modal visible={editProfileModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Dados Corporais & Bioimpedância</Text>
                <Text style={styles.modalSubtitle}>Atualize as medidas da sua balança inteligente</Text>
              </View>
              <TouchableOpacity onPress={() => setEditProfileModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Seção 1: Dados Pessoais & Corporais Básicos */}
              <Text style={styles.formSectionHeader}>Dados Básicos</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Completo</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.name}
                  onChangeText={(v) => setEditProfile((prev) => ({ ...prev, name: v }))}
                  placeholder="Seu nome"
                  placeholderTextColor="#6b7280"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Idade Real (anos)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.age}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, age: v }))}
                    keyboardType="numeric"
                    placeholder="28"
                    placeholderTextColor="#6b7280"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Altura (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.height}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, height: v }))}
                    keyboardType="numeric"
                    placeholder="175"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso Atual (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.weight}
                  onChangeText={(v) => setEditProfile((prev) => ({ ...prev, weight: v }))}
                  keyboardType="decimal-pad"
                  placeholder="74.5"
                  placeholderTextColor="#6b7280"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sexo Biológico (Calibração Mifflin-St Jeor)</Text>
                <View style={styles.modalSexRow}>
                  <TouchableOpacity
                    style={[styles.modalSexBtn, editProfile.sex === 'female' && styles.modalSexBtnActive]}
                    onPress={() => setEditProfile((prev) => ({ ...prev, sex: 'female' }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalSexBtnText, editProfile.sex === 'female' && styles.modalSexBtnTextActive]}>Feminino</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSexBtn, editProfile.sex === 'male' && styles.modalSexBtnActive]}
                    onPress={() => setEditProfile((prev) => ({ ...prev, sex: 'male' }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalSexBtnText, editProfile.sex === 'male' && styles.modalSexBtnTextActive]}>Masculino</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Seção 2: Bioimpedância */}
              <Text style={[styles.formSectionHeader, { marginTop: 18 }]}>Métricas de Bioimpedância</Text>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Gordura Corporal (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.bodyFat}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, bodyFat: v }))}
                    keyboardType="decimal-pad"
                    placeholder="ex: 18.5"
                    placeholderTextColor="#6b7280"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Massa Muscular (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.muscleMass}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, muscleMass: v }))}
                    keyboardType="decimal-pad"
                    placeholder="ex: 38.0"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Água Corporal (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.bodyWater}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, bodyWater: v }))}
                    keyboardType="decimal-pad"
                    placeholder="ex: 58.2"
                    placeholderTextColor="#6b7280"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Idade Metabólica</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.metabolicAge}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, metabolicAge: v }))}
                    keyboardType="numeric"
                    placeholder="ex: 24"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Cintura / Medida (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.waist}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, waist: v }))}
                    keyboardType="decimal-pad"
                    placeholder="ex: 85.0"
                    placeholderTextColor="#6b7280"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Peso Inicial (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.initialWeight}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, initialWeight: v }))}
                    keyboardType="decimal-pad"
                    placeholder="ex: 95.0"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mascote Escolhido</Text>
                <View style={styles.modalSexRow}>
                  <TouchableOpacity
                    style={[styles.modalSexBtn, editProfile.avatarMascotId === 'tita' && styles.modalSexBtnActive]}
                    onPress={() => setEditProfile((prev) => ({ ...prev, avatarMascotId: 'tita' }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalSexBtnText, editProfile.avatarMascotId === 'tita' && styles.modalSexBtnTextActive]}>
                      Titã 🥊
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSexBtn, editProfile.avatarMascotId === 'gaia' && styles.modalSexBtnActive]}
                    onPress={() => setEditProfile((prev) => ({ ...prev, avatarMascotId: 'gaia' }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalSexBtnText, editProfile.avatarMascotId === 'gaia' && styles.modalSexBtnTextActive]}>
                      Gaia 👑
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Metabolismo Basal (kcal/dia da balança)</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.basalMetabolism}
                  onChangeText={(v) => setEditProfile((prev) => ({ ...prev, basalMetabolism: v }))}
                  keyboardType="numeric"
                  placeholder={`Estimado: ${estimatedBmr} kcal`}
                  placeholderTextColor="#6b7280"
                />
              </View>

              {/* Seção 3: Atividade e Objetivos */}
              <Text style={[styles.formSectionHeader, { marginTop: 18 }]}>Atividade & Foco</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nível de Atividade</Text>
                <View style={styles.optionsRow}>
                  {activities.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        styles.optionBtn,
                        editProfile.activity === a.id && styles.optionBtnActive,
                      ]}
                      onPress={() => setEditProfile((prev) => ({ ...prev, activity: a.id }))}
                    >
                      <Text
                        style={[
                          styles.optionBtnText,
                          editProfile.activity === a.id && styles.optionBtnTextActive,
                        ]}
                      >
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Objetivo Atual</Text>
                <View style={styles.optionsRow}>
                  {goals.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.optionBtn,
                        editProfile.goal === g.id && styles.optionBtnActive,
                      ]}
                      onPress={() => setEditProfile((prev) => ({ ...prev, goal: g.id }))}
                    >
                      <Text
                        style={[
                          styles.optionBtnText,
                          editProfile.goal === g.id && styles.optionBtnTextActive,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Seção 4: Frequência de Check-in para Competição */}
              <Text style={[styles.formSectionHeader, { marginTop: 18 }]}>Frequência do Check-in Oficial</Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', marginBottom: 10, lineHeight: 18 }}>
                Escolha com qual frequência você deseja ser lembrado de registrar suas medidas para pontuar (+15 pts) na competição do grupo.
              </Text>

              <View style={styles.inputGroup}>
                <View style={styles.optionsRow}>
                  {[
                    { id: 7, label: 'Semanal (7d) 🏆' },
                    { id: 14, label: 'Quinzenal (14d)' },
                    { id: 30, label: 'Mensal (30d)' },
                  ].map((freq) => (
                    <TouchableOpacity
                      key={freq.id}
                      style={[
                        styles.optionBtn,
                        editProfile.checkinFrequency === freq.id && styles.optionBtnActive,
                      ]}
                      onPress={() => setEditProfile((prev) => ({ ...prev, checkinFrequency: freq.id }))}
                    >
                      <Text
                        style={[
                          styles.optionBtnText,
                          editProfile.checkinFrequency === freq.id && styles.optionBtnTextActive,
                        ]}
                      >
                        {freq.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, savingProfile && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {savingProfile ? 'Salvando...' : 'Salvar Medidas & Bioimpedância'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE SELEÇÃO DO MASCOTE (TITÃ OU GAIA) */}
      <Modal visible={selectMascotModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '82%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Escolha Seu Mascote</Text>
                <Text style={styles.modalSubtitle}>Ele evolui e muda de forma com a sua bioimpedância</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectMascotModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Opção Titã */}
              <TouchableOpacity
                style={[
                  styles.mascotChoiceCard,
                  (profile?.avatar_mascot_id || 'tita') === 'tita' && styles.mascotChoiceCardActive,
                ]}
                onPress={() => handleSelectMascot('tita')}
                activeOpacity={0.8}
              >
                <Image 
                  source={getMascotImage('tita_muscular')} 
                  style={styles.mascotChoiceImg} 
                  resizeMode="contain" 
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.mascotChoiceName}>Titã 🥊 (Masculino)</Text>
                    {(profile?.avatar_mascot_id || 'tita') === 'tita' && (
                      <View style={styles.activeMascotBadge}>
                        <Text style={styles.activeMascotBadgeText}>Selecionado</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.mascotChoiceDesc}>
                    O colosso da balança. Começa focado no modo treino pesado, queima gordura e constrói um shape blindado de campeão da balança.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Opção Gaia */}
              <TouchableOpacity
                style={[
                  styles.mascotChoiceCard,
                  profile?.avatar_mascot_id === 'gaia' && styles.mascotChoiceCardActive,
                ]}
                onPress={() => handleSelectMascot('gaia')}
                activeOpacity={0.8}
              >
                <Image 
                  source={getMascotImage('gaia_athletic')} 
                  style={styles.mascotChoiceImg} 
                  resizeMode="contain" 
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.mascotChoiceName}>Gaia 👑 (Feminino)</Text>
                    {profile?.avatar_mascot_id === 'gaia' && (
                      <View style={styles.activeMascotBadge}>
                        <Text style={styles.activeMascotBadgeText}>Selecionada</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.mascotChoiceDesc}>
                    A guardiã da balança. Postura atlética e elegante, queima medidas corporais e conquista a coroa dourada da vitória.
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE EXCLUSÃO DEFINITIVA DE CONTA */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconBadge}>
              <ShieldAlert color="#ef4444" size={32} />
            </View>

            <Text style={styles.deleteModalTitle}>Excluir Conta Permanentemente?</Text>
            <Text style={styles.deleteModalSubtitle}>
              Esta ação é irreversível conforme as normas de privacidade (Apple 5.1.1(v) e LGPD). Todos os seus históricos de refeições, pesagens, metas e treinos serão apagados imediatamente do banco de dados.
            </Text>

            <View style={styles.confirmBox}>
              <Text style={styles.confirmInstruction}>
                Para confirmar a exclusão, digite a palavra <Text style={styles.boldRed}>EXCLUIR</Text> abaixo:
              </Text>
              <TextInput
                style={styles.confirmInput}
                value={deleteConfirmationInput}
                onChangeText={setDeleteConfirmationInput}
                placeholder="EXCLUIR"
                placeholderTextColor="#6b7280"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.cancelDeleteBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmationInput('');
                }}
              >
                <Text style={styles.cancelDeleteText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  (deleteConfirmationInput.trim().toUpperCase() !== 'EXCLUIR' || deletingAccount) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmationInput.trim().toUpperCase() !== 'EXCLUIR' || deletingAccount}
              >
                <Text style={styles.confirmDeleteText}>
                  {deletingAccount ? 'Excluindo...' : 'Excluir Definitivamente'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DO ESTÚDIO 3D DE PERSONALIZAÇÃO (TITÃ & GAIA) */}
      <MascotStudioModal
        visible={mascotStudioModalVisible}
        onClose={() => setMascotStudioModalVisible(false)}
        mascotId={currentMascotId}
        customization={profile?.avatar_customization}
        weightKg={currentWeight || bioComparison?.latestBio?.weightKg || 75}
        heightCm={currentHeight || 170}
        bodyFatPct={profile?.body_fat_pct}
        muscleMassPct={profile?.muscle_mass_pct}
        onSave={handleSaveMascotCustomization}
      />

      {/* MODAL DA CERIMÔNIA DE BIOIMPEDÂNCIA VIVA */}
      <BioCheckinCeremonyModal
        visible={ceremonyModalVisible}
        onClose={() => setCeremonyModalVisible(false)}
        reactionResult={activeReactionResult}
        onContinue={() => setCeremonyModalVisible(false)}
      />

      {/* MODAL CARD DE VITÓRIA SOCIAL (STORIES / WHATSAPP) */}
      <ShapeVictoryCardModal
        visible={showVictoryCard}
        onClose={() => setShowVictoryCard(false)}
        mascotName={currentMascotId === 'gaia' ? 'Gaia' : 'Titã'}
        mascotAssetKey={mascotEval.milestoneAssetKey || mascotEval.assetKey}
        milestoneLevel={mascotEval.milestoneLevel}
        milestoneBadge={mascotEval.milestoneBadge}
        currentWeightKg={currentWeight || bioComparison?.latestBio?.weightKg || 75}
        initialWeightKg={Number(profile?.initial_weight_kg) || undefined}
        weightDeltaKg={
          bioComparison?.deltas?.weightDelta !== undefined
            ? Math.abs(bioComparison.deltas.weightDelta)
            : undefined
        }
        bodyFatPct={profile?.body_fat_pct}
        muscleMassPct={profile?.muscle_mass_pct}
        waistCm={profile?.waist_cm}
        streakDays={7}
        userName={profile?.name || 'Guerreiro(a)'}
      />

      {/* MODAL DA ESCADA COMPLETA DE 10 MARCOS, GANHOS E HIPERTROFIA */}
      <MilestoneLadderModal
        visible={milestoneLadderModalVisible}
        onClose={() => setMilestoneLadderModalVisible(false)}
        mascotId={currentMascotId}
        currentMilestoneLevel={mascotEval.milestoneLevel}
        currentWeightKg={currentWeight || bioComparison?.latestBio?.weightKg || 70}
        onShareMilestone={() => {
          setMilestoneLadderModalVisible(false);
          setShowVictoryCard(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },
  content: { padding: 20, paddingBottom: 120 },

  headerTitle: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },

  // Card do Perfil
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2920',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  profileInfo: { flex: 1 },
  profileName: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  profileEmail: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  editBtn: { padding: 8 },

  shareVictoryProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f2920',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 12,
  },
  shareVictoryProfileText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800',
  },

  // HERO CARD BIOMÉTRICO & IMC
  heroBiometricCard: {
    backgroundColor: '#0f2920',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  biometricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#173b2d',
  },
  biometricStat: { flex: 1, alignItems: 'center' },
  statIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  biometricValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  biometricLabel: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  biometricDivider: { width: 1, height: 36, backgroundColor: '#1f3d32' },

  // Seção de IMC
  bmiSection: { marginTop: 14 },
  bmiHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bmiTitle: { color: '#d1d5db', fontSize: 14, fontWeight: '600' },
  bmiCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  bmiCategoryText: { fontSize: 12, fontWeight: 'bold' },
  bmiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  bmiNumber: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
  bmiUnit: { color: '#9ca3af', fontSize: 14 },
  bmiTrackContainer: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  bmiTrackSegment: { height: '100%' },
  bmiTrackLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendText: { color: '#6b7280', fontSize: 10 },

  // BIOIMPEDÂNCIA GRID
  bioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  bioCard: {
    width: (width - 40 - 12) / 2,
    backgroundColor: '#0f2920',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  bioCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bioCardTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  bioIconBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  bioCardValue: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  bioCardStatus: { fontSize: 12, fontWeight: 'bold' },
  bioCardHint: { color: '#6b7280', fontSize: 11 },
  bioCardFull: {
    width: '100%',
    backgroundColor: '#0f2920',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  bioCardValueLarge: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  bioCardSubtext: { color: '#9ca3af', fontSize: 12, marginTop: 8, lineHeight: 17 },
  metaAgeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  metaAgeText: { fontSize: 12, fontWeight: 'bold' },

  // Badges de Atividade e Objetivo
  badgesRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  badge: {
    flex: 1,
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  badgeLabel: { color: '#6b7280', fontSize: 11, marginBottom: 4 },
  badgeValue: { color: '#22c55e', fontSize: 14, fontWeight: 'bold' },

  // Seções & Cabeçalhos
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLinkText: { color: '#22c55e', fontSize: 13, fontWeight: '600' },

  // Metas Grid
  targetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  targetCard: {
    width: (width - 40 - 20) / 3,
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f3d32',
    alignItems: 'center',
  },
  targetValue: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
  targetLabel: { color: '#9ca3af', fontSize: 11, textAlign: 'center' },

  // Disclaimer Médico Apple 1.4.1
  disclaimerBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
    marginBottom: 20,
  },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  disclaimerTitle: { color: '#facc15', fontSize: 13, fontWeight: 'bold' },
  disclaimerText: { color: '#d1d5db', fontSize: 12, lineHeight: 18 },

  // Botões de Sessão e Conta
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f2920',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f3d32',
    marginBottom: 12,
  },
  signOutText: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 24,
  },
  deleteAccountText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold' },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0a1a15',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#1f3d32', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  modalTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  modalSubtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  formSectionHeader: { color: '#22c55e', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 6, fontWeight: '500' },
  input: {
    backgroundColor: '#0f2920',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  optionsRow: { flexDirection: 'row', gap: 8 },
  optionBtn: {
    flex: 1,
    backgroundColor: '#0f2920',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  optionBtnActive: { borderColor: '#22c55e', backgroundColor: '#14382c' },
  optionBtnText: { color: '#9ca3af', fontSize: 12 },
  optionBtnTextActive: { color: '#22c55e', fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: '#0a1a15', fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.6 },

  // Delete Modal
  deleteModalContent: {
    backgroundColor: '#0f2920',
    borderRadius: 24,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  deleteIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  deleteModalSubtitle: { color: '#9ca3af', fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  confirmBox: { width: '100%', marginBottom: 20 },
  confirmInstruction: { color: '#d1d5db', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  boldRed: { color: '#ef4444', fontWeight: 'bold' },
  confirmInput: {
    backgroundColor: '#0a1a15',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    fontWeight: 'bold',
  },
  deleteActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#173b2d', alignItems: 'center' },
  cancelDeleteText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center' },
  confirmDeleteText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },

  // Estilos de Validação Brasileira (IMC & Sexo)
  bmiStandardText: { color: '#9ca3af', fontSize: 12, marginLeft: 8 },
  bmiDetailsText: { color: '#9ca3af', fontSize: 11, marginTop: 8, fontStyle: 'italic', lineHeight: 15 },
  modalSexRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalSexBtn: {
    flex: 1,
    backgroundColor: '#0a1a15',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  modalSexBtnActive: { borderColor: '#22c55e', backgroundColor: '#14382c' },
  modalSexBtnText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
  modalSexBtnTextActive: { color: '#22c55e', fontWeight: 'bold' },

  // HERO CARD DO MASCOTE DA BATALHA
  mascotHeroCard: {
    backgroundColor: '#0f2920',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  mascotTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#173b2d',
  },
  mascotHeaderTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  avatarModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#0a1a15',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#173b2d',
  },
  avatarModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  avatarModeBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  avatarModeBtnText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
  },
  avatarModeBtnTextActive: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  living3DStageWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },
  livingStageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  livingStageSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarQuickActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    width: '100%',
  },
  customizeTriggerBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  customizeTriggerBtnText: {
    color: '#d8b4fe',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scanTriggerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  scanTriggerBtnText: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: 'bold',
  },
  updateScaleBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  updateScaleBtnText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: 'bold',
  },
  morphDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    gap: 6,
  },
  morphPill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#0a1a15',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#173b2d',
    gap: 2,
  },
  morphPillLabel: {
    color: '#9ca3af',
    fontSize: 9,
    fontWeight: '500',
  },
  morphPillValue: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  switchMascotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  switchMascotBtnText: { color: '#22c55e', fontSize: 12, fontWeight: 'bold' },
  mascotBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  mascotAvatarWrapper: {
    width: 100,
    alignItems: 'center',
  },
  mascotAvatarImage: {
    width: 95,
    height: 110,
    borderRadius: 16,
  },
  mascotArchetypeBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  mascotArchetypeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  mascotDetails: {
    flex: 1,
  },
  mascotStageTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mascotStageDesc: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  speechBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#0a1a15',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  speechText: {
    flex: 1,
    color: '#facc15',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  mascot2DContainer: {
    marginBottom: 10,
  },
  cosmeticBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  cosmeticBadgePillText: {
    color: '#facc15',
    fontSize: 10,
    fontWeight: '700',
  },
  mascot2DActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  openLadderBtn: {
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
  openLadderBtnText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '800',
  },
  share2DBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  share2DBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  milestoneTrackSection: {
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  milestoneTrackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  milestoneTrackTitle: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  milestoneTrackSeeAll: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '700',
  },
  milestoneTrackScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  miniMilestoneCard: {
    width: 60,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  miniMilestoneCardCurrent: {
    borderColor: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    shadowColor: '#eab308',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  miniMilestoneCardConquered: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  miniMilestoneThumb: {
    width: 38,
    height: 42,
    borderRadius: 6,
    marginBottom: 3,
  },
  miniMilestoneLevel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  miniMilestoneWeight: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '600',
  },
  miniCurrentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#facc15',
    marginTop: 4,
  },
  evolutionBarContainer: {
    marginBottom: 14,
  },
  evolutionBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  evolutionBarTitle: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '600',
  },
  evolutionBarPct: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  evolutionTrack: {
    height: 8,
    backgroundColor: '#0a1a15',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#173b2d',
  },
  evolutionFill: {
    height: '100%',
    borderRadius: 4,
  },
  // ⚖️ ESTILOS DO CARD DE DUELO DE BIOIMPEDÂNCIA (PRIMEIRA VS ÚLTIMA PESAGEM)
  bioComparisonCard: {
    backgroundColor: '#0a1a15',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  bioComparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bioComparisonTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bioStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  bioStatusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  bioDuelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 10,
  },
  bioDuelColumn: {
    flex: 1,
    backgroundColor: '#0f2920',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  bioDuelColTitle: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bioDuelDate: {
    color: '#6b7280',
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 8,
  },
  bioDuelStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31, 61, 50, 0.5)',
  },
  bioDuelStatLabel: {
    color: '#9ca3af',
    fontSize: 10,
  },
  bioDuelStatVal: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '600',
  },
  bioDuelCenterCol: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  bioArrowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1f3d32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bioDeltaPill: {
    backgroundColor: '#0a1a15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#173b2d',
    width: '100%',
    alignItems: 'center',
  },
  bioDeltaText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  bioDiagnosticBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
    marginTop: 2,
  },
  bioDiagnosticText: {
    color: '#fef08a',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  nextMilestoneBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  nextMilestoneText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },

  // MODAL DE ESCOLHA DE MASCOTE
  mascotChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#0f2920',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  mascotChoiceCardActive: {
    borderColor: '#22c55e',
    backgroundColor: '#14382c',
  },
  mascotChoiceImg: {
    width: 75,
    height: 85,
    borderRadius: 12,
  },
  mascotChoiceName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mascotChoiceDesc: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
  },
  activeMascotBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  activeMascotBadgeText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
