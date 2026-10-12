import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, Modal, TextInput, Dimensions, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../core/api';
import { useRouter } from 'expo-router';
import { Plus, Droplets, Scale, X, Flame, Dumbbell, Wheat, Droplet, Sparkles, Activity, Clock, Check, Trophy } from 'lucide-react-native';
import { supabase } from '../../core/supabase';
import Svg, { Circle, G } from 'react-native-svg';
import { useToast } from '../../components/Toast';
import { DashboardSkeleton } from '../../components/SkeletonLoader';
import { BarChart } from 'react-native-gifted-charts';
import { dataEvents } from '../../core/dataEvents';
import { ensureFoodDB } from '../../core/foodDB';
import { CommunityModal } from '../../components/CommunityModal';

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

      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/api/analytics/daily', { date: today });
      setData(res);

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
    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7();
    };
  }, []);

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
            <Text style={styles.appName}>Akilo</Text>
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
            <TouchableOpacity style={styles.trophyBtn} onPress={() => setCommunityModalVisible(true)}>
              <Trophy color="#eab308" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Círculo Principal de Calorias */}
        <View style={styles.calorieSection}>
          <TouchableOpacity
            style={styles.calorieCircleContainer}
            activeOpacity={0.8}
            onPress={() => setShowCaloriePercentage(!showCaloriePercentage)}
          >
            <CircularProgress progress={calProgress} size={220} strokeWidth={16} color="#22c55e" />
            <Animated.View
              style={[styles.calorieCenter, { opacity: calorieFadeAnim, transform: [{ scale: calorieScaleAnim }] }]}
            >
              {showCaloriePercentage ? (
                <>
                  <Text style={styles.calorieLabel}>Meta Atingida</Text>
                  <Text style={styles.calorieValue}>{Math.round(calProgress * 100)}%</Text>
                  <Text style={styles.calorieUnit}>CONCLUÍDO</Text>
                </>
              ) : (
                <>
                  <Text style={styles.calorieLabel}>Restante</Text>
                  <Text style={styles.calorieValue}>{caloriesRemaining.toLocaleString('pt-BR')}</Text>
                  <Text style={styles.calorieUnit}>KCAL</Text>
                </>
              )}
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.calorieStats}>
            <View style={styles.calorieStat}>
              <Text style={styles.calorieStatLabel}>Consumido</Text>
              <Text style={styles.calorieStatValue}>{caloriesConsumed.toLocaleString('pt-BR')}</Text>
            </View>
            <View style={styles.calorieStatDivider} />
            <View style={styles.calorieStat}>
              <Text style={styles.calorieStatLabel}>Meta Diária</Text>
              <Text style={styles.calorieStatValue}>{caloriesTarget.toLocaleString('pt-BR')}</Text>
            </View>
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

      {/* Modal de Comunidade & Ranking Semanal */}
      <CommunityModal
        visible={communityModalVisible}
        onClose={() => setCommunityModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },
  scrollContent: { padding: 18, paddingBottom: 100 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImage: { width: 38, height: 38, resizeMode: 'contain' },
  appName: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateContainer: { alignItems: 'flex-end' },
  dateLabel: { color: '#6b7280', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  dateValue: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f3d32', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  streakText: { color: '#ffffff', fontWeight: 'bold' },

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
});
