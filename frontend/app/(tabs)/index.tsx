import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, Modal, TextInput, Dimensions, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { api } from '../../core/api';
import { useRouter } from 'expo-router';
import { Plus, Droplets, Scale, X, Flame, Dumbbell, Wheat, Droplet, Sparkles, Activity, Clock, Check, Trophy, Palette, Zap, Bell } from 'lucide-react-native';
import { supabase } from '../../core/supabase';
import Svg, { Circle, G } from 'react-native-svg';
import { useToast } from '../../components/Toast';
import { DashboardSkeleton } from '../../components/SkeletonLoader';
import { BarChart } from 'react-native-gifted-charts';
import { dataEvents } from '../../core/dataEvents';
import { ensureFoodDB } from '../../core/foodDB';
import { CommunityModal } from '../../components/CommunityModal';
import { calculateBMI } from '../../core/domain/bodyComposition';
import {
  evaluateMascot,
  generateHomeMascotSpeech,
  analyzeAndCorrectMuscleInput,
  analyzeAndCorrectWaistInput,
  type MascotId,
  type MascotCustomization,
} from '../../core/domain/avatarEngine';
import { getMascotImage } from '../../assets/avatars';
import { LivingAvatar3D } from '../../components/LivingAvatar3D';
import { MascotStudioModal } from '../../components/MascotStudioModal';
import { BioCheckinCeremonyModal } from '../../components/BioCheckinCeremonyModal';
import { NotificationsModal } from '../../components/NotificationsModal';
import { evaluateBioReaction, type BioReactionResult } from '../../core/domain/bioReactionEngine';
import { soundHaptics } from '../../core/soundHaptics';
import { getLocalDateString } from '../../core/dateUtils';

const { width } = Dimensions.get('window');

// Componente de Progresso Circular
const CircularProgress = ({ progress, size, strokeWidth, color }: { progress: number; size: number; strokeWidth: number; color: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(Math.max(progress, 0), 1) * circumference);

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1f3d32"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

// Cartão de Macronutriente Interativo
const MacroCard = ({ label, value, target, color, icon: IconComponent }: { label: string; value: number; target: number; color: string; icon: any }) => {
  const [showPercentage, setShowPercentage] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progress = target > 0 ? value / target : 0;
  const percentage = Math.round(progress * 100);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    });
  }, [showPercentage]);

  return (
    <TouchableOpacity style={styles.macroCard} activeOpacity={0.7} onPress={() => setShowPercentage(!showPercentage)}>
      <View style={styles.macroCircleWrapper}>
        <CircularProgress progress={progress} size={54} strokeWidth={4.5} color={color} />
        <Animated.View style={[styles.macroIconWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {showPercentage ? (
            <Text style={[styles.macroPercentage, { color }]}>{percentage}%</Text>
          ) : (
            <IconComponent color={color} size={15} />
          )}
        </Animated.View>
      </View>
      <Text style={[styles.macroValue, { color }]}>{Math.round(value)}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modais
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);

  // Estados dos formulários
  const [customWater, setCustomWater] = useState('');
  const [weight, setWeight] = useState('');
  const [streak, setStreak] = useState(0);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<number[]>([]);
  const [showCaloriePercentage, setShowCaloriePercentage] = useState(false);

  // Estados de Exercícios
  const [exercisesList, setExercisesList] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [exerciseMinutes, setExerciseMinutes] = useState('30');
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [savingExercise, setSavingExercise] = useState(false);
  const [communityModalVisible, setCommunityModalVisible] = useState(false);
  const [mascotStudioVisible, setMascotStudioVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  // Estados do Check-in Periódico de Bioimpedância & Peso (+15 pts no grupo)
  const [profile, setProfile] = useState<any>(null);
  const [checkinStatus, setCheckinStatus] = useState<any>(null);
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    weight: '',
    bodyFat: '',
    muscleMass: '',
    bodyWater: '',
    waist: '',
    basalMetabolism: '',
    metabolicAge: '',
    notes: '',
  });

  const currentSex = (profile?.sex === 'female' ? 'female' : 'male') as any;

  // Autocorreção Inteligente de Entradas de Bioimpedância durante o Check-in
  const checkinMuscleCorrection = useMemo(
    () => analyzeAndCorrectMuscleInput(checkinForm.muscleMass, currentSex),
    [checkinForm.muscleMass, currentSex]
  );
  const checkinWaistCorrection = useMemo(
    () => analyzeAndCorrectWaistInput(checkinForm.waist),
    [checkinForm.waist]
  );

  const [savingCheckin, setSavingCheckin] = useState(false);
  const [skippingCheckin, setSkippingCheckin] = useState(false);
  const [inspectCheckinAvatar, setInspectCheckinAvatar] = useState(false);
  const [homeMascotInspect, setHomeMascotInspect] = useState(false);
  const [ceremonyModalVisible, setCeremonyModalVisible] = useState(false);
  const [activeReactionResult, setActiveReactionResult] = useState<BioReactionResult | null>(null);

  const calorieFadeAnim = useRef(new Animated.Value(1)).current;
  const calorieScaleAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { showToast } = useToast();

  const fetchDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const today = getLocalDateString();
      const res = await api.get('/api/analytics/daily', { date: today });
      setData(res);

      // Perfil do usuário (para mascote e bioimpedância)
      try {
        const profRes = await api.get('/api/profile/');
        setProfile(profRes);
      } catch (e) {}

      // Status do Check-in Periódico de Bioimpedância & Peso
      try {
        const cStatus = await api.get('/api/checkin/status');
        setCheckinStatus(cStatus);
      } catch (e) {}

      // Streak
      try {
        const streakRes = await supabase.from('streaks').select('current_streak').maybeSingle();
        if (streakRes.data) setStreak(streakRes.data.current_streak || 0);
      } catch (e) {}

      // Histórico de peso recente
      try {
        const weightRes = await supabase
          .from('weight_logs')
          .select('weight_kg, date')
          .order('date', { ascending: false })
          .limit(7);

        if (weightRes.data && weightRes.data.length > 0) {
          setLatestWeight(weightRes.data[0].weight_kg);
          const history = weightRes.data.reverse().map((w) => w.weight_kg);
          setWeightHistory(history);
        }
      } catch (e) {}

      // Carregar lista de exercícios para o modal
      try {
        const exList = await api.get('/api/exercises/master');
        if (exList && exList.length > 0) {
          setExercisesList(exList);
          if (!selectedExercise) setSelectedExercise(exList[0]);
        }
      } catch (e) {}
    } catch (e) {
      console.error('Erro ao buscar dados do dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    ensureFoodDB();
  }, []);

  // Ouvinte de eventos globais de atualização
  useEffect(() => {
    const unsub1 = dataEvents.on('food_logged', fetchDashboard);
    const unsub2 = dataEvents.on('food_deleted', fetchDashboard);
    const unsub3 = dataEvents.on('food_edited', fetchDashboard);
    const unsub4 = dataEvents.on('water_logged', fetchDashboard);
    const unsub5 = dataEvents.on('weight_logged', fetchDashboard);
    const unsub6 = dataEvents.on('targets_updated', fetchDashboard);
    const unsub7 = dataEvents.on('exercise_logged', fetchDashboard);
    const unsub8 = dataEvents.on('checkin_logged', fetchDashboard);
    const unsub9 = dataEvents.on('checkin_skipped', fetchDashboard);
    const unsub10 = dataEvents.on('profile_updated', fetchDashboard);
    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9(); unsub10();
    };
  }, []);

  // Ações de Check-in
  const handleOpenCheckinModal = () => {
    const prof = checkinStatus?.profile || profile;
    setCheckinForm({
      weight: prof?.weight_kg ? String(prof.weight_kg) : '',
      bodyFat: prof?.body_fat_pct !== undefined && prof?.body_fat_pct !== null ? String(prof.body_fat_pct) : '',
      muscleMass: prof?.muscle_mass_pct !== undefined && prof?.muscle_mass_pct !== null ? String(prof.muscle_mass_pct) : '',
      bodyWater: prof?.body_water_pct !== undefined && prof?.body_water_pct !== null ? String(prof.body_water_pct) : '',
      waist: prof?.waist_cm ? String(prof.waist_cm) : '',
      basalMetabolism: prof?.basal_metabolism_kcal ? String(prof.basal_metabolism_kcal) : '',
      metabolicAge: prof?.metabolic_age ? String(prof.metabolic_age) : '',
      notes: '',
    });
    setCheckinModalVisible(true);
  };

  const handleSkipCheckin = async () => {
    setSkippingCheckin(true);
    try {
      await api.post('/api/checkin/skip', {});
      showToast('Check-in adiado por 3 dias. Sem cobranças! 👍', 'info');
      setCheckinStatus((prev: any) => prev ? { ...prev, isDue: false } : null);
      setCheckinModalVisible(false);
    } catch (e) {
      showToast('Erro ao adiar verificação', 'error');
    } finally {
      setSkippingCheckin(false);
    }
  };

  const handleSaveCheckin = async () => {
    const parsedWeight = parseFloat(checkinForm.weight.replace(',', '.'));
    if (!parsedWeight || isNaN(parsedWeight) || parsedWeight <= 0) {
      showToast('Informe seu peso atual em kg', 'error');
      return;
    }

    setSavingCheckin(true);
    try {
      const prof = checkinStatus?.profile || profile;
      let bmi: number | null = null;
      if (prof?.height_cm && prof.height_cm > 0) {
        const bmiEval = calculateBMI(parsedWeight, prof.height_cm);
        if (bmiEval) bmi = bmiEval.bmi;
      }

      const parsedWaist = checkinWaistCorrection.isCorrected
        ? checkinWaistCorrection.correctedNum
        : (checkinForm.waist ? parseFloat(checkinForm.waist.replace(',', '.')) : null);
      const parsedMuscle = checkinMuscleCorrection.isCorrected
        ? checkinMuscleCorrection.correctedNum
        : (checkinForm.muscleMass ? parseFloat(checkinForm.muscleMass.replace(',', '.')) : null);

      const payload = {
        weight_kg: parsedWeight,
        bmi,
        body_fat_pct: checkinForm.bodyFat ? parseFloat(checkinForm.bodyFat.replace(',', '.')) : null,
        muscle_mass_pct: parsedMuscle,
        body_water_pct: checkinForm.bodyWater ? parseFloat(checkinForm.bodyWater.replace(',', '.')) : null,
        waist_cm: parsedWaist,
        basal_metabolism_kcal: checkinForm.basalMetabolism ? parseInt(checkinForm.basalMetabolism, 10) : null,
        metabolic_age: checkinForm.metabolicAge ? parseInt(checkinForm.metabolicAge, 10) : null,
        notes: checkinForm.notes.trim() || undefined,
      };

      await api.post('/api/checkin/log', payload);
      setCheckinModalVisible(false);
      setCheckinStatus((prev: any) => prev ? { ...prev, isDue: false } : null);

      // Dispara a Cerimônia de Bioimpedância Viva com Análise do Mascote
      try {
        const compRes = await api.get('/api/checkin/comparison').catch(() => null);
        const bioReaction = evaluateBioReaction({
          current: {
            weightKg: parsedWeight,
            bodyFatPct: payload.body_fat_pct,
            muscleMassPct: payload.muscle_mass_pct,
            bodyWaterPct: payload.body_water_pct,
            waistCm: payload.waist_cm,
          },
          previous: compRes?.latestBio ? {
            weightKg: compRes.latestBio.weightKg,
            bodyFatPct: compRes.latestBio.bodyFatPct,
            muscleMassPct: compRes.latestBio.muscleMassPct,
            waistCm: compRes.latestBio.waistCm,
          } : (latestWeight ? { weightKg: latestWeight } : null),
          baseline: compRes?.firstBio ? {
            weightKg: compRes.firstBio.weightKg,
            bodyFatPct: compRes.firstBio.bodyFatPct,
            waistCm: compRes.firstBio.waistCm,
          } : null,
          mascotId: currentMascotId,
          sex: currentSex,
          heightCm: profile?.height_cm || 170,
          userName: profile?.name || 'Guerreiro',
          previousStageLevel: (typeof mascotEval !== 'undefined' && mascotEval?.stageLevel) ? mascotEval.stageLevel : 1,
        });

        setActiveReactionResult(bioReaction);
        setCeremonyModalVisible(true);
      } catch (ce) {
        showToast('Check-in registrado! +15 pts no ranking da semana! 🎉', 'success');
      }

      fetchDashboard();
    } catch (e: any) {
      showToast(e.message || 'Falha ao salvar check-in', 'error');
    } finally {
      setSavingCheckin(false);
    }
  };

  const handleOpenBioCeremony = async () => {
    try {
      const compRes = await api.get('/api/checkin/comparison').catch(() => null);
      const curWeight = latestWeight || profile?.weight_kg || 75.0;
      const curBf = profile?.body_fat_pct || 22.0;
      const curMuscle = profile?.muscle_mass_pct || 35.0;
      const curWaist = profile?.waist_cm || 88.0;

      const bioReaction = evaluateBioReaction({
        current: {
          weightKg: curWeight,
          bodyFatPct: curBf,
          muscleMassPct: curMuscle,
          bodyWaterPct: profile?.body_water_pct || 55.0,
          waistCm: curWaist,
        },
        previous: (compRes?.latestBio && compRes.latestBio.weightKg > 20) ? {
          weightKg: compRes.latestBio.weightKg,
          bodyFatPct: compRes.latestBio.bodyFatPct,
          muscleMassPct: compRes.latestBio.muscleMassPct,
          waistCm: compRes.latestBio.waistCm,
        } : {
          // Fallback realista para demonstração de Queima de Ouro
          weightKg: +(curWeight + 1.2).toFixed(1),
          bodyFatPct: +(curBf + 1.4).toFixed(1),
          muscleMassPct: curMuscle,
          waistCm: +(curWaist + 2.0).toFixed(1),
        },
        baseline: (compRes?.firstBio && compRes.firstBio.weightKg > 20) ? {
          weightKg: compRes.firstBio.weightKg,
          bodyFatPct: compRes.firstBio.bodyFatPct,
          waistCm: compRes.firstBio.waistCm,
        } : {
          weightKg: +(curWeight + 6.0).toFixed(1),
          bodyFatPct: +(curBf + 5.0).toFixed(1),
          waistCm: +(curWaist + 8.0).toFixed(1),
        },
        mascotId: currentMascotId,
        sex: currentSex,
        heightCm: profile?.height_cm || 170,
        userName: profile?.name || (currentMascotId === 'gaia' ? 'Guerreira' : 'Guerreiro'),
        previousStageLevel: (typeof mascotEval !== 'undefined' && mascotEval?.stageLevel) ? mascotEval.stageLevel : 1,
      });

      setActiveReactionResult(bioReaction);
      setCeremonyModalVisible(true);
    } catch (e) {
      console.warn('Erro ao abrir cerimônia:', e);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  const handleAddWater = async (amount: number) => {
    try {
      await api.post('/api/water/', { date: new Date().toISOString().split('T')[0], amount_ml: amount });
      showToast(`+${amount} ml de água registrados!`, 'success');
      setWaterModalVisible(false);
      setCustomWater('');
      fetchDashboard();
    } catch (e) {
      showToast('Falha ao registrar água', 'error');
    }
  };

  const handleLogWeight = async () => {
    const weightNum = parseFloat(weight.replace(',', '.'));
    if (!weightNum || weightNum <= 0) {
      showToast('Digite um peso válido', 'error');
      return;
    }
    try {
      await api.post('/api/weight/', { date: new Date().toISOString().split('T')[0], weight_kg: weightNum });
      showToast(`Peso registrado: ${weightNum.toFixed(1)} kg`, 'success');
      setWeightModalVisible(false);
      setWeight('');
      fetchDashboard();
    } catch (e) {
      showToast('Falha ao registrar peso', 'error');
    }
  };

  const handleLogExercise = async () => {
    const mins = parseInt(exerciseMinutes, 10);
    if (!mins || mins <= 0) {
      showToast('Digite uma duração válida', 'error');
      return;
    }

    setSavingExercise(true);
    try {
      const userWeight = latestWeight || 70.0;
      const met = selectedExercise?.met_value || 5.0;
      // Fórmula científica de MET: Kcal = MET * peso * (minutos / 60)
      const estimatedCals = Math.round(met * userWeight * (mins / 60));

      await api.post('/api/exercises/log', {
        exercise_master_id: selectedExercise?.id,
        exercise_name: selectedExercise?.name || 'Treino Geral',
        date: new Date().toISOString().split('T')[0],
        duration_minutes: mins,
        calories_burned: estimatedCals,
        notes: exerciseNotes || null,
      });

      showToast(`Treino de ${mins} min registrado (~${estimatedCals} kcal)!`, 'success');
      setExerciseModalVisible(false);
      setExerciseNotes('');
      fetchDashboard();
    } catch (e: any) {
      showToast('Erro ao salvar exercício', 'error');
    } finally {
      setSavingExercise(false);
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
      showToast(`Visual 3D de ${newMascotId === 'tita' ? 'Titã 🥊' : 'Gaia 👑'} salvo com sucesso!`, 'success');
      setHomeMascotInspect(true);
      setTimeout(() => setHomeMascotInspect(false), 4500);
    } catch (e) {
      console.error('Erro ao salvar personalização:', e);
      showToast('Falha ao salvar personalização', 'error');
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(calorieFadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(calorieScaleAnim, { toValue: 0.85, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(calorieFadeAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(calorieScaleAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
    });
  }, [showCaloriePercentage]);

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  const { summary, targets } = data || {
    summary: { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, water: 0, exerciseMinutes: 0, exerciseCalories: 0 },
    targets: { calories_target: 2000, protein_target_g: 120, carbs_target_g: 250, fats_target_g: 60, fiber_target_g: 25, water_target_ml: 2500 },
  };

  const caloriesConsumed = Math.round(summary.calories || 0);
  const caloriesTarget = targets?.calories_target || 2000;
  const caloriesRemaining = Math.max(caloriesTarget - caloriesConsumed, 0);
  const calProgress = caloriesTarget > 0 ? caloriesConsumed / caloriesTarget : 0;
  const waterProgress = targets?.water_target_ml ? (summary.water || 0) / targets.water_target_ml : 0;

  // Avaliação Dinâmica do Mascote
  const currentMascotId: MascotId = (profile?.avatar_mascot_id as MascotId) || (currentSex === 'female' ? 'gaia' : 'tita');
  const mascotEval = evaluateMascot({
    mascotId: currentMascotId,
    sex: currentSex,
    weightKg: latestWeight || profile?.weight_kg || 70,
    heightCm: profile?.height_cm || 170,
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

  // Falas Interativas em Tempo Real do Mascote para a Tela Inicial
  const homeSpeech = generateHomeMascotSpeech({
    mascotId: currentMascotId,
    caloriesTarget: caloriesTarget,
    caloriesConsumed: caloriesConsumed,
    proteinG: summary.protein || 0,
    proteinTargetG: targets?.protein_target_g || targets?.protein_g_target || 140,
    archetype: mascotEval.archetype,
    userName: profile?.name,
  });

  // Avaliação Dinâmica em Tempo Real durante o Check-in (conforme o usuário digita peso, gordura, massa muscular)
  const formWeightNum = parseFloat(checkinForm.weight.replace(',', '.'));
  const formFatNum = checkinForm.bodyFat ? parseFloat(checkinForm.bodyFat.replace(',', '.')) : undefined;
  const formMuscleNum = checkinMuscleCorrection.isCorrected
    ? checkinMuscleCorrection.correctedNum
    : (checkinForm.muscleMass ? parseFloat(checkinForm.muscleMass.replace(',', '.')) : undefined);
  const formWaistNum = checkinWaistCorrection.isCorrected
    ? checkinWaistCorrection.correctedNum
    : (checkinForm.waist ? parseFloat(checkinForm.waist.replace(',', '.')) : undefined);

  const activeCheckinEval = evaluateMascot({
    mascotId: currentMascotId,
    sex: currentSex,
    weightKg: !isNaN(formWeightNum) && formWeightNum > 0 ? formWeightNum : (latestWeight || profile?.weight_kg || 70),
    heightCm: profile?.height_cm || 170,
    bodyFatPct: formFatNum !== undefined && !isNaN(formFatNum) ? formFatNum : profile?.body_fat_pct,
    muscleMassPct: formMuscleNum !== undefined && !isNaN(formMuscleNum) ? formMuscleNum : profile?.muscle_mass_pct,
    waistCm: formWaistNum !== undefined && !isNaN(formWaistNum) ? formWaistNum : profile?.waist_cm,
    initialWeightKg: profile?.initial_weight_kg || profile?.weight_kg,
    initialBodyFatPct: profile?.initial_body_fat_pct || profile?.body_fat_pct,
    initialWaistCm: profile?.initial_waist_cm || profile?.waist_cm,
    goalType: profile?.goal_type,
    customization: profile?.avatar_customization,
  });

  const hasUnreadNotifications = !!(
    checkinStatus?.isDue ||
    (summary?.water || 0) < (targets?.water_target_ml || 2500) * 0.4 ||
    caloriesConsumed === 0
  );
  const unreadNotificationsCount =
    (checkinStatus?.isDue ? 1 : 0) +
    ((summary?.water || 0) < (targets?.water_target_ml || 2500) * 0.4 ? 1 : 0) +
    (caloriesConsumed === 0 ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
            <Text style={styles.appName} numberOfLines={1}>Batalha da Balança</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>HOJE</Text>
              <Text style={styles.dateValue}>
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Flame color="#f97316" size={16} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => {
                soundHaptics.triggerLightTap();
                setNotificationsModalVisible(true);
              }}
              activeOpacity={0.8}
              accessibilityLabel="Notificações"
            >
              <Bell color="#22c55e" size={18} />
              {hasUnreadNotifications && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotificationsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.trophyBtn} onPress={() => setCommunityModalVisible(true)}>
              <Trophy color="#eab308" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🌟 ARENA HERO: PERSONAGEM 3D CENTRAL & META CALÓRICA INTERATIVA */}
        <View style={styles.mascotHeroArena}>
          {/* Barra de Topo do Mascote e Ações Rápidas */}
          <View style={styles.mascotTopActionBar}>
            <View style={[styles.heroSpeechBadge, { backgroundColor: `${mascotEval.badgeColor}22`, borderColor: mascotEval.badgeColor }]}>
              <Sparkles color={mascotEval.badgeColor || '#facc15'} size={12} />
              <Text style={[styles.heroSpeechSpeaker, { color: mascotEval.badgeColor || '#facc15' }]}>
                {mascotEval.mascotName} • {mascotEval.badgeLabel}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity 
                style={[styles.heroCustomizePill, { borderColor: '#22c55e' }]}
                onPress={() => handleOpenBioCeremony()}
                activeOpacity={0.8}
              >
                <Zap color="#22c55e" size={12} />
                <Text style={[styles.heroCustomizePillText, { color: '#22c55e' }]}>Cerimônia</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.heroCustomizePill}
                onPress={() => setMascotStudioVisible(true)}
                activeOpacity={0.8}
              >
                <Palette color="#c084fc" size={12} />
                <Text style={styles.heroCustomizePillText}>Personalizar 3D</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dica / Mensagem Compacta do Mascote */}
          <TouchableOpacity
            style={styles.heroSpeechCompactCard}
            activeOpacity={0.85}
            onPress={() => {
              soundHaptics.triggerMediumTap();
              setHomeMascotInspect(true);
              setTimeout(() => setHomeMascotInspect(false), 4500);
            }}
          >
            <Text style={styles.heroSpeechCompactText} numberOfLines={2}>
              "{homeSpeech.mainSpeech}"
            </Text>
          </TouchableOpacity>

          {/* 2. Palco 3D Vivo com Anel Calórico Integrado */}
          <View style={styles.heroStageContainer}>
            {/* Halo / Anel Circular de Progresso Calórico ao redor da base da balança */}
            <View style={styles.heroProgressHalo}>
              <CircularProgress 
                progress={calProgress} 
                size={256} 
                strokeWidth={9} 
                color={calProgress > 1 ? '#ef4444' : (mascotEval.badgeColor || '#22c55e')} 
              />
            </View>

            {/* O Mascote 3D Vivo na Balança */}
            <View style={styles.heroAvatarContainer}>
              <LivingAvatar3D 
                mascotId={currentMascotId}
                weightKg={latestWeight || profile?.weight_kg || 70}
                heightCm={profile?.height_cm || 170}
                bodyFatPct={profile?.body_fat_pct}
                muscleMassPct={profile?.muscle_mass_pct}
                morphology={mascotEval.morphology}
                customization={profile?.avatar_customization}
                size={256}
                height={256}
                simple={false}
                hideBubble={true}
                isInspecting={homeMascotInspect}
                onInspectionTrigger={() => {
                  soundHaptics.triggerMediumTap();
                  setHomeMascotInspect(true);
                  setTimeout(() => setHomeMascotInspect(false), 4500);
                }}
              />
            </View>
          </View>

          {/* 3. Placar de Calorias (Consumido, Restante / Progresso, Meta Diária) */}
          <View style={styles.heroScoreboard}>
            <View style={styles.heroScoreCol}>
              <Text style={styles.heroScoreLabel}>Consumido</Text>
              <Text style={styles.heroScoreValue}>{caloriesConsumed.toLocaleString('pt-BR')}</Text>
              <Text style={styles.heroScoreUnit}>KCAL</Text>
            </View>

            <View style={styles.heroScoreDivider} />

            <TouchableOpacity
              style={styles.heroScoreCenterCol}
              activeOpacity={0.8}
              onPress={() => setShowCaloriePercentage(!showCaloriePercentage)}
            >
              <Animated.View style={{ opacity: calorieFadeAnim, transform: [{ scale: calorieScaleAnim }], alignItems: 'center' }}>
                <Text style={[styles.heroScoreLabel, { color: '#22c55e', fontWeight: 'bold' }]}>
                  {showCaloriePercentage ? 'Meta Atingida' : 'Restante'}
                </Text>
                <Text style={[styles.heroScoreHighlightValue, { color: calProgress > 1 ? '#ef4444' : '#22c55e' }]}>
                  {showCaloriePercentage
                    ? `${Math.round(calProgress * 100)}%`
                    : caloriesRemaining.toLocaleString('pt-BR')}
                </Text>
                <Text style={styles.heroScoreUnit}>
                  {showCaloriePercentage ? 'CONCLUÍDO' : 'KCAL'}
                </Text>
              </Animated.View>
            </TouchableOpacity>

            <View style={styles.heroScoreDivider} />

            <View style={styles.heroScoreCol}>
              <Text style={styles.heroScoreLabel}>Meta Diária</Text>
              <Text style={styles.heroScoreValue}>{caloriesTarget.toLocaleString('pt-BR')}</Text>
              <Text style={styles.heroScoreUnit}>KCAL</Text>
            </View>
          </View>

          {/* 4. Ações Rápidas no Mascote */}
          <View style={styles.heroActionsRow}>
            <TouchableOpacity 
              style={styles.heroActionBtn}
              onPress={() => {
                soundHaptics.triggerMediumTap();
                setHomeMascotInspect(true);
                setTimeout(() => setHomeMascotInspect(false), 4500);
              }}
              activeOpacity={0.8}
            >
              <Sparkles color="#38bdf8" size={13} />
              <Text style={styles.heroActionBtnText}>Inspecionar Corpo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.heroActionBtn, { borderColor: 'rgba(34, 197, 94, 0.4)' }]}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
            >
              <Scale color="#22c55e" size={13} />
              <Text style={[styles.heroActionBtnText, { color: '#22c55e' }]}>Ver Bioimpedância</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Linha dos 4 Macronutrientes (Proteína, Carbo, Gordura, Fibras) */}
        <View style={styles.macroRow}>
          <MacroCard
            label="Proteína"
            value={summary.protein || 0}
            target={targets?.protein_target_g || 120}
            color="#3b82f6"
            icon={Dumbbell}
          />
          <MacroCard
            label="Carboidrato"
            value={summary.carbs || 0}
            target={targets?.carbs_target_g || 250}
            color="#22c55e"
            icon={Wheat}
          />
          <MacroCard
            label="Gorduras"
            value={summary.fats || 0}
            target={targets?.fats_target_g || 60}
            color="#f97316"
            icon={Droplet}
          />
          <MacroCard
            label="Fibras"
            value={summary.fiber || 0}
            target={targets?.fiber_target_g || 25}
            color="#eab308"
            icon={Sparkles}
          />
        </View>

        {/* Seção de Exercícios Físicos */}
        <View style={styles.sectionHeader}>
          <Activity color="#ec4899" size={20} />
          <Text style={styles.sectionTitle}>Atividade Física</Text>
        </View>
        <View style={styles.exerciseCard}>
          <View style={styles.exerciseLeft}>
            <Text style={styles.exerciseMinutes}>{summary.exerciseMinutes || 0} <Text style={styles.exerciseUnit}>min</Text></Text>
            <Text style={styles.exerciseCals}>~{summary.exerciseCalories || 0} kcal estimadas</Text>
          </View>
          <TouchableOpacity style={styles.exerciseBtn} onPress={() => setExerciseModalVisible(true)}>
            <Plus color="#ec4899" size={16} />
            <Text style={styles.exerciseBtnText}>Registrar Treino</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Hidratação */}
        <View style={styles.sectionHeader}>
          <Droplets color="#06b6d4" size={20} />
          <Text style={styles.sectionTitle}>Hidratação</Text>
        </View>
        <View style={styles.hydrationCard}>
          <View style={styles.hydrationLeft}>
            <Text style={styles.hydrationValue}>{Math.round(summary.water || 0).toLocaleString('pt-BR')}</Text>
            <Text style={styles.hydrationTarget}>/ {(targets?.water_target_ml || 2500).toLocaleString('pt-BR')} ml</Text>
          </View>
          <View style={styles.hydrationMiddle}>
            <View style={styles.hydrationBar}>
              <View style={[styles.hydrationProgress, { width: `${Math.min(waterProgress * 100, 100)}%` }]} />
            </View>
          </View>
          <View style={styles.hydrationRight}>
            <TouchableOpacity style={styles.quickWaterBtn} onPress={() => handleAddWater(250)}>
              <Plus color="#06b6d4" size={14} />
              <Text style={styles.quickWaterBtnText}>250</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickWaterBtn} onPress={() => handleAddWater(500)}>
              <Plus color="#06b6d4" size={14} />
              <Text style={styles.quickWaterBtnText}>500</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção de Peso */}
        <View style={styles.sectionHeader}>
          <Scale color="#a855f7" size={20} />
          <Text style={styles.sectionTitle}>Peso Corporal</Text>
        </View>
        <View style={styles.weightCard}>
          {latestWeight ? (
            <>
              <View style={styles.weightInfo}>
                <View style={styles.weightMain}>
                  <Text style={styles.weightValue}>{latestWeight.toFixed(1)}</Text>
                  <Text style={styles.weightUnit}>kg</Text>
                </View>
                {weightHistory.length >= 2 && (
                  <View style={styles.weightChange}>
                    <Text style={[styles.weightChangeIcon, { color: weightHistory[weightHistory.length - 1] < weightHistory[0] ? '#22c55e' : '#ef4444' }]}>
                      {weightHistory[weightHistory.length - 1] < weightHistory[0] ? '↓' : '↑'}
                    </Text>
                    <Text style={[styles.weightChangeText, { color: weightHistory[weightHistory.length - 1] < weightHistory[0] ? '#22c55e' : '#ef4444' }]}>
                      {Math.abs(weightHistory[weightHistory.length - 1] - weightHistory[0]).toFixed(1)} kg
                    </Text>
                    <Text style={styles.weightChangePeriod}>últimos 7 dias</Text>
                  </View>
                )}
              </View>
              <View style={styles.weightChart}>
                {weightHistory.length >= 2 ? (
                  <BarChart
                    data={weightHistory.map((w, i) => ({
                      value: w,
                      frontColor: i === weightHistory.length - 1 ? '#22c55e' : '#374151',
                    }))}
                    width={110}
                    height={38}
                    barWidth={7}
                    spacing={5}
                    hideRules
                    hideYAxisText
                    hideAxesAndRules
                    noOfSections={3}
                    maxValue={Math.max(...weightHistory) * 1.1}
                  />
                ) : null}
              </View>
              <TouchableOpacity style={styles.weightUpdateBtn} onPress={() => setWeightModalVisible(true)}>
                <Plus color="#a855f7" size={18} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.weightPlaceholder}>Nenhum peso registrado ainda</Text>
              <TouchableOpacity style={styles.weightUpdateBtn} onPress={() => setWeightModalVisible(true)}>
                <Plus color="#a855f7" size={18} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Desafio Semanal & Ranking de Hábitos */}
        <TouchableOpacity
          style={styles.communityCard}
          onPress={() => setCommunityModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.communityIconBox}>
            <Trophy color="#eab308" size={24} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.communityCardTitle}>Desafio Semanal com Amigos</Text>
            <Text style={styles.communityCardSubtitle}>
              Pontue mantendo a consistência dos seus hábitos diários!
            </Text>
          </View>
          <View style={styles.communityCardBtn}>
            <Text style={styles.communityCardBtnText}>Ranking</Text>
          </View>
        </TouchableOpacity>

        {/* Ações Rápidas */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(tabs)/food')}>
            <Plus color="#22c55e" size={22} />
            <Text style={styles.quickActionText}>Registrar Alimento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(tabs)/history')}>
            <Clock color="#3b82f6" size={22} />
            <Text style={styles.quickActionText}>Ver Diário</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Água */}
      <Modal visible={waterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Água</Text>
              <TouchableOpacity onPress={() => setWaterModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickWaterGrid}>
              {[250, 500, 750, 1000].map((amt) => (
                <TouchableOpacity key={amt} style={styles.quickWaterButton} onPress={() => handleAddWater(amt)}>
                  <Text style={styles.quickWaterText}>{amt} ml</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Quantidade Personalizada (ml)</Text>
            <TextInput
              style={styles.input}
              value={customWater}
              onChangeText={setCustomWater}
              keyboardType="numeric"
              placeholder="Ex: 350"
              placeholderTextColor="#6b7280"
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                const amt = parseInt(customWater, 10);
                if (amt > 0) handleAddWater(amt);
              }}
            >
              <Text style={styles.primaryButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Peso */}
      <Modal visible={weightModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Peso Corporal</Text>
              <TouchableOpacity onPress={() => setWeightModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Peso (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="Ex: 74.5"
              placeholderTextColor="#6b7280"
            />
            <Text style={styles.modalHint}>
              💡 Dica: Pese-se preferencialmente pela manhã em jejum para manter a consistência dos dados.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogWeight}>
              <Text style={styles.primaryButtonText}>Salvar Pesagem</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Treino / Exercício */}
      <Modal visible={exerciseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Treino</Text>
              <TouchableOpacity onPress={() => setExerciseModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Selecione a Modalidade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseCategoryScroll}>
              {exercisesList.map((ex) => {
                const isSelected = selectedExercise?.id === ex.id;
                return (
                  <TouchableOpacity
                    key={ex.id}
                    style={[styles.exercisePill, isSelected && styles.exercisePillSelected]}
                    onPress={() => setSelectedExercise(ex)}
                  >
                    <Text style={[styles.exercisePillText, isSelected && styles.exercisePillTextSelected]}>
                      {ex.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>Duração (minutos)</Text>
            <TextInput
              style={styles.input}
              value={exerciseMinutes}
              onChangeText={setExerciseMinutes}
              keyboardType="numeric"
              placeholder="Ex: 45"
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.inputLabel}>Observações (opcional)</Text>
            <TextInput
              style={styles.input}
              value={exerciseNotes}
              onChangeText={setExerciseNotes}
              placeholder="Ex: treino de pernas e panturrilha"
              placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#ec4899' }]}
              disabled={savingExercise}
              onPress={handleLogExercise}
            >
              <Text style={styles.primaryButtonText}>
                {savingExercise ? 'Salvando...' : 'Salvar Treino'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CHECK-IN DE BIOIMPEDÂNCIA */}
      <Modal visible={checkinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.checkinIconWrapper, { width: 36, height: 36 }]}>
                  <Scale color="#22c55e" size={20} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Check-in de Medidas</Text>
                  <Text style={styles.modalSubtitle}>Garante +15 pts para a competição</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setCheckinModalVisible(false)} style={styles.closeBtn}>
                <X color="#9ca3af" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Balão de Incentivo & Palco 3D Vivo do Mascote na Balança */}
              <View style={styles.checkinLivingStage}>
                <LivingAvatar3D 
                  mascotId={currentMascotId}
                  weightKg={!isNaN(formWeightNum) && formWeightNum > 0 ? formWeightNum : (latestWeight || profile?.weight_kg || 70)}
                  heightCm={profile?.height_cm || 170}
                  bodyFatPct={formFatNum !== undefined && !isNaN(formFatNum) ? formFatNum : profile?.body_fat_pct}
                  muscleMassPct={formMuscleNum !== undefined && !isNaN(formMuscleNum) ? formMuscleNum : profile?.muscle_mass_pct}
                  morphology={activeCheckinEval.morphology}
                  customization={profile?.avatar_customization}
                  isInspecting={inspectCheckinAvatar}
                  onInspectionTrigger={() => {
                    setInspectCheckinAvatar(true);
                    setTimeout(() => setInspectCheckinAvatar(false), 5500);
                  }}
                  size={195}
                />
                <Text style={styles.checkinStageHint}>
                  💡 Conforme você altera os dados abaixo, o personagem reage em tempo real na balança!
                </Text>
              </View>

              <View style={styles.checkinBannerInfo}>
                <Sparkles color="#eab308" size={16} />
                <Text style={styles.checkinBannerInfoText}>
                  Registrar este check-in credita instantaneamente +15 pontos no ranking semanal do seu grupo!
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso Atual (kg) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ex: 75.4"
                  placeholderTextColor="#6b7280"
                  keyboardType="decimal-pad"
                  value={checkinForm.weight}
                  onChangeText={(v) => setCheckinForm((prev) => ({ ...prev, weight: v }))}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Gordura Corporal (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex: 18.5"
                    placeholderTextColor="#6b7280"
                    keyboardType="decimal-pad"
                    value={checkinForm.bodyFat}
                    onChangeText={(v) => setCheckinForm((prev) => ({ ...prev, bodyFat: v }))}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Massa Muscular (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex: 38.0"
                    placeholderTextColor="#6b7280"
                    keyboardType="decimal-pad"
                    value={checkinForm.muscleMass}
                    onChangeText={(v) => setCheckinForm((prev) => ({ ...prev, muscleMass: v }))}
                    onBlur={() => {
                      if (checkinMuscleCorrection.isCorrected) {
                        setCheckinForm((prev) => ({ ...prev, muscleMass: checkinMuscleCorrection.correctedStr }));
                      }
                    }}
                  />
                  {checkinMuscleCorrection.isCorrected && (
                    <View style={styles.correctionNotice}>
                      <Sparkles color="#38bdf8" size={12} />
                      <Text style={styles.correctionNoticeText}>
                        {checkinMuscleCorrection.message}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Água Corporal (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex: 58.0"
                    placeholderTextColor="#6b7280"
                    keyboardType="decimal-pad"
                    value={checkinForm.bodyWater}
                    onChangeText={(v) => setCheckinForm((prev) => ({ ...prev, bodyWater: v }))}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Idade Metabólica</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex: 25"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={checkinForm.metabolicAge}
                    onChangeText={(v) => setCheckinForm((prev) => ({ ...prev, metabolicAge: v }))}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cintura / Medidas (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ex: 85.0"
                  placeholderTextColor="#6b7280"
                  keyboardType="decimal-pad"
                  value={checkinForm.waist}
                  onChangeText={(v) => setCheckinForm((prev) => ({ ...prev, waist: v }))}
                  onBlur={() => {
                    if (checkinWaistCorrection.isCorrected) {
                      setCheckinForm((prev) => ({ ...prev, waist: checkinWaistCorrection.correctedStr }));
                    }
                  }}
                />
                {checkinWaistCorrection.isCorrected && (
                  <View style={styles.correctionNotice}>
                    <Sparkles color="#38bdf8" size={12} />
                    <Text style={styles.correctionNoticeText}>
                      {checkinWaistCorrection.message}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Metabolismo Basal (kcal/dia da balança)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ex: 1650"
                  placeholderTextColor="#6b7280"
                  keyboardType="numeric"
                  value={checkinForm.basalMetabolism}
                  onChangeText={(v) => setCheckinForm((prev) => ({ ...prev, basalMetabolism: v }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Observações (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ex: Pesagem em jejum logo após acordar"
                  placeholderTextColor="#6b7280"
                  value={checkinForm.notes}
                  onChangeText={(v) => setCheckinForm((prev) => ({ ...prev, notes: v }))}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, savingCheckin && styles.buttonDisabled, { marginTop: 16 }]}
                onPress={handleSaveCheckin}
                disabled={savingCheckin}
              >
                <Check color="#0a1a15" size={20} />
                <Text style={styles.saveBtnText}>
                  {savingCheckin ? 'Salvando...' : 'Confirmar Check-in (+15 pts)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipInModalBtn}
                onPress={handleSkipCheckin}
                disabled={skippingCheckin}
              >
                <Text style={styles.skipInModalBtnText}>Pular esta verificação (lembrar depois)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Comunidade & Ranking Semanal */}
      <CommunityModal
        visible={communityModalVisible}
        onClose={() => setCommunityModalVisible(false)}
      />

      {/* MODAL DO ESTÚDIO 3D DE PERSONALIZAÇÃO */}
      <MascotStudioModal
        visible={mascotStudioVisible}
        onClose={() => setMascotStudioVisible(false)}
        mascotId={currentMascotId}
        customization={profile?.avatar_customization}
        weightKg={latestWeight || profile?.weight_kg || 70}
        heightCm={profile?.height_cm || 170}
        bodyFatPct={profile?.body_fat_pct}
        muscleMassPct={profile?.muscle_mass_pct}
        onSave={handleSaveMascotCustomization}
      />

      {/* MODAL DA CERIMÔNIA DE BIOIMPEDÂNCIA VIVA */}
      <BioCheckinCeremonyModal
        visible={ceremonyModalVisible}
        onClose={() => setCeremonyModalVisible(false)}
        reactionResult={activeReactionResult}
        onContinue={() => {
          setCeremonyModalVisible(false);
          fetchDashboard();
        }}
      />

      {/* MODAL DE NOTIFICAÇÕES & CHECK-IN */}
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        checkinStatus={checkinStatus}
        mascotEval={mascotEval}
        onOpenCheckin={() => {
          setNotificationsModalVisible(false);
          handleOpenCheckinModal();
        }}
        onSkipCheckin={handleSkipCheckin}
        skippingCheckin={skippingCheckin}
        waterCurrent={summary.water || 0}
        waterTarget={targets?.water_target_ml || targets?.water_ml_target || 2500}
        onQuickAddWater={(amt) => handleAddWater(amt)}
        caloriesRemaining={caloriesRemaining}
        caloriesConsumed={caloriesConsumed}
        caloriesTarget={caloriesTarget}
        streak={streak}
        onOpenCommunity={() => {
          setNotificationsModalVisible(false);
          setCommunityModalVisible(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },
  scrollContent: { padding: 18, paddingBottom: 115 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, marginRight: 6 },
  logoImage: { width: 32, height: 32, borderRadius: 8, resizeMode: 'contain' },
  appName: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateContainer: { alignItems: 'flex-end' },
  dateLabel: { color: '#6b7280', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  dateValue: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f3d32', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 16, gap: 4 },
  streakText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  // Calorie Section
  calorieSection: { alignItems: 'center', marginBottom: 20 },
  calorieCircleContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  calorieCenter: { position: 'absolute', alignItems: 'center' },
  calorieLabel: { color: '#9ca3af', fontSize: 13 },
  calorieValue: { color: '#ffffff', fontSize: 44, fontWeight: 'bold' },
  calorieUnit: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  calorieStats: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32, marginTop: 14 },
  calorieStat: { alignItems: 'center' },
  calorieStatLabel: { color: '#6b7280', fontSize: 12 },
  calorieStatValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  calorieStatDivider: { width: 1, height: 36, backgroundColor: '#1f3d32' },

  // Macro Cards (4 Colunas)
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  macroCard: { flex: 1, backgroundColor: '#0f2920', borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1f3d32' },
  macroCircleWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  macroIconWrapper: { position: 'absolute' },
  macroPercentage: { fontSize: 10, fontWeight: 'bold' },
  macroValue: { fontSize: 15, fontWeight: 'bold' },
  macroLabel: { color: '#6b7280', fontSize: 11, marginTop: 2 },

  // Section Headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  // Exercise Card
  exerciseCard: {
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseLeft: { gap: 2 },
  exerciseMinutes: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  exerciseUnit: { color: '#ec4899', fontSize: 16 },
  exerciseCals: { color: '#9ca3af', fontSize: 12 },
  exerciseBtn: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.35)',
  },
  exerciseBtnText: { color: '#ec4899', fontWeight: 'bold', fontSize: 13 },

  // Hydration
  hydrationCard: {
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hydrationLeft: { minWidth: 80 },
  hydrationValue: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  hydrationTarget: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  hydrationMiddle: { flex: 1 },
  hydrationBar: { height: 6, backgroundColor: '#1f3d32', borderRadius: 3, overflow: 'hidden' },
  hydrationProgress: { height: '100%', backgroundColor: '#06b6d4', borderRadius: 3 },
  hydrationRight: { flexDirection: 'row', gap: 6 },
  quickWaterBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  quickWaterBtnText: { color: '#06b6d4', fontWeight: 'bold', fontSize: 12 },

  // Weight
  weightCard: {
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f3d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightInfo: { flexShrink: 0 },
  weightMain: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  weightValue: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  weightUnit: { color: '#9ca3af', fontSize: 15, marginLeft: 4 },
  weightChange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weightChangeIcon: { fontSize: 13, fontWeight: 'bold' },
  weightChangeText: { fontSize: 12, fontWeight: 'bold' },
  weightChangePeriod: { color: '#6b7280', fontSize: 11 },
  weightChart: { flex: 1, height: 38, maxWidth: 120 },
  weightPlaceholder: { color: '#9ca3af', fontSize: 14, textAlign: 'center', flex: 1 },
  weightUpdateBtn: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },

  // Quick Actions
  quickActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#0f2920',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3d32',
    gap: 6,
  },
  quickActionText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0f2920',
    padding: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1f3d32',
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { color: '#ffffff', fontSize: 19, fontWeight: 'bold' },
  inputLabel: { color: '#9ca3af', marginBottom: 8, marginTop: 14, fontSize: 13, fontWeight: '500' },
  input: {
    backgroundColor: '#153528',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  modalHint: { color: '#6b7280', fontSize: 12, marginTop: 10, lineHeight: 18 },
  quickWaterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickWaterButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#153528',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  quickWaterText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  exerciseCategoryScroll: { marginBottom: 6 },
  exercisePill: {
    backgroundColor: '#153528',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  exercisePillSelected: {
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
    borderColor: '#ec4899',
  },
  exercisePillText: { color: '#9ca3af', fontSize: 13, fontWeight: '500' },
  exercisePillTextSelected: { color: '#ffffff', fontWeight: 'bold' },
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonText: { color: '#0a1a15', fontWeight: 'bold', fontSize: 16 },

  // Botão de Notificações no Header
  notificationBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0a1a15',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },

  // Troféu no Header
  trophyBtn: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card de Comunidade
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2920',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
  },
  communityIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityCardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  communityCardSubtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2, lineHeight: 16 },
  communityCardBtn: {
    backgroundColor: '#eab308',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  communityCardBtnText: { color: '#0a1a15', fontWeight: 'bold', fontSize: 12 },

  // Check-in Banner & Modal
  checkinBanner: {
    backgroundColor: '#0d281e',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#059669',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  checkinBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  checkinIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkinBannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  checkinPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  checkinPointsText: {
    color: '#eab308',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkinBannerSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  checkinBannerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  checkinPrimaryBtn: {
    flex: 1.4,
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  checkinPrimaryBtnText: {
    color: '#0a1a15',
    fontSize: 13,
    fontWeight: 'bold',
  },
  checkinSkipBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  checkinSkipBtnText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  checkinBannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
    marginBottom: 10,
  },
  checkinBannerInfoText: {
    flex: 1,
    color: '#fbbf24',
    fontSize: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    marginBottom: 6,
  },
  closeBtn: {
    padding: 4,
  },
  saveBtn: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#0a1a15',
    fontSize: 15,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  skipInModalBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  skipInModalBtnText: {
    color: '#9ca3af',
    fontSize: 13,
  },

  // ESTILOS DO MASCOTE NO DASHBOARD & CHECK-IN
  mascotBannerAvatarWrapper: {
    width: 52,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#0a1a15',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  // 🌟 ESTILOS DA ARENA DO MASCOTE CENTRAL (DASHBOARD HERO)
  mascotHeroArena: {
    backgroundColor: '#0a1a15',
    borderRadius: 24,
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  mascotTopActionBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  heroSpeechBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  heroSpeechSpeaker: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  heroCustomizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  heroCustomizePillText: {
    color: '#d8b4fe',
    fontSize: 10,
    fontWeight: '700',
  },
  heroSpeechCompactCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 41, 32, 0.75)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    marginBottom: 6,
  },
  heroSpeechCompactText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  heroStageContainer: {
    width: 266,
    height: 266,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 6,
  },
  heroProgressHalo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroScoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#0f2920',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    marginTop: 6,
  },
  heroScoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroScoreCenterCol: {
    flex: 1.2,
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  heroScoreLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
  },
  heroScoreValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 1,
  },
  heroScoreHighlightValue: {
    color: '#22c55e',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 1,
  },
  heroScoreUnit: {
    color: '#6b7280',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroScoreDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1f3d32',
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    width: '100%',
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f2920',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  heroActionBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkinMascotGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0a1a15',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  checkinLivingStage: {
    alignItems: 'center',
    backgroundColor: '#0a1a15',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  checkinStageHint: {
    color: '#9ca3af',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  correctionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0c2738',
    borderColor: '#38bdf880',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
  },
  correctionNoticeText: {
    color: '#bae6fd',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
    fontWeight: '500',
  },
});

