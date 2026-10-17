import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Dimensions, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../../core/api';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { 
  Flame, 
  Droplets, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Activity, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  Dumbbell, 
  Info,
  Share2,
  Heart,
  ShieldCheck
} from 'lucide-react-native';
import { AnalyticsSkeleton } from '../../components/SkeletonLoader';
import { dataEvents } from '../../core/dataEvents';
import { analyzeWeightTrend, explainDailyFluctuation, WeightRecord } from '../../core/domain/trendsEngine';
import { generateSmartInsights, UserContext, Insight } from '../../core/domain/insightsEngine';
import { evaluateLipidProfile, LipidProfileEvaluation } from '../../core/domain/nutritionEngine';
import { soundHaptics } from '../../core/soundHaptics';

const { width } = Dimensions.get('window');

const DAY_LABELS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Analytics() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState(2000);
  const [waterTarget, setWaterTarget] = useState(2500);
  const [proteinTarget, setProteinTarget] = useState(140);
  const [fiberTarget, setFiberTarget] = useState(28);
  const [weeklyWorkoutsTarget, setWeeklyWorkoutsTarget] = useState(4);
  const [streak, setStreak] = useState({ current_streak: 0, best_streak: 0 });
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [bioHistory, setBioHistory] = useState<{
    records: Array<{
      date: string;
      weight_kg: number;
      body_fat_pct: number | null;
      muscle_mass_pct: number | null;
      waist_cm: number | null;
      visceral_fat?: number | null;
      metabolic_age?: number | null;
    }>;
    profile: {
      sex: 'male' | 'female';
      height_cm: number;
      waistThreshold: number;
    };
  }>({
    records: [],
    profile: { sex: 'female', height_cm: 170, waistThreshold: 88 },
  });
  const [bioTab, setBioTab] = useState<'tissues' | 'waist'>('tissues');

  const fetchAnalytics = async () => {
    try {
      const days = period === 'weekly' ? 7 : 30;
      const [res, bioRes] = await Promise.all([
        api.get('/api/analytics/weekly', { days }),
        api.get('/api/checkin/history'),
      ]);

      if (res) {
        const dailyData = Array.isArray(res) ? res : (res.data || []);
        setData(dailyData);

        const targets = res.targets || (dailyData[0]?.targets) || {};
        if (targets.calories_target) setTarget(Number(targets.calories_target));
        if (targets.water_target_ml) setWaterTarget(Number(targets.water_target_ml));
        if (targets.protein_g_target) setProteinTarget(Number(targets.protein_g_target));
        if (targets.fiber_g_target) setFiberTarget(Number(targets.fiber_g_target));
        if (targets.weekly_workouts_target) setWeeklyWorkoutsTarget(Number(targets.weekly_workouts_target));

        if (res.streak) setStreak(res.streak);
        if (res.weight_logs) setWeightLogs(res.weight_logs);
        if (res.exercises) setExerciseLogs(res.exercises);
      }

      if (bioRes && Array.isArray(bioRes.records)) {
        setBioHistory(bioRes);
      }
    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [period]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [period]);

  useEffect(() => {
    const unsub1 = dataEvents.on('food_logged', fetchAnalytics);
    const unsub2 = dataEvents.on('food_deleted', fetchAnalytics);
    const unsub3 = dataEvents.on('water_logged', fetchAnalytics);
    const unsub4 = dataEvents.on('weight_logged', fetchAnalytics);
    const unsub5 = dataEvents.on('food_edited', fetchAnalytics);
    const unsub6 = dataEvents.on('targets_updated', fetchAnalytics);
    const unsub7 = dataEvents.on('checkin_logged', fetchAnalytics);
    const unsub8 = dataEvents.on('profile_updated', fetchAnalytics);
    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8();
    };
  }, [period]);

  // Transformar logs de peso para o motor de tendências
  const weightRecords: WeightRecord[] = (weightLogs || []).map((w) => ({
    date: w.date,
    weight_kg: Number(w.weight_kg),
  }));

  const trendAnalysis = analyzeWeightTrend(weightRecords);

  // Verificação de flutuação de 24h
  let dailyFluctuationAlert: string | null = null;
  if (weightRecords.length >= 2) {
    dailyFluctuationAlert = explainDailyFluctuation(weightRecords[0].weight_kg, weightRecords[1].weight_kg);
  }

  // Estatísticas agregadas do período
  const getVal = (d: any, key: string) => d.summary?.[key] || d[key] || 0;
  const daysWithFood = data.filter((d) => getVal(d, 'calories') > 0).length;
  const avgCalories = data.length > 0 ? Math.round(data.reduce((s, d) => s + getVal(d, 'calories'), 0) / data.length) : 0;
  const avgProtein = data.length > 0 ? Math.round(data.reduce((s, d) => s + getVal(d, 'protein'), 0) / data.length) : 0;
  const avgFiber = data.length > 0 ? Math.round(data.reduce((s, d) => s + getVal(d, 'fiber'), 0) / data.length) : 0;
  const avgWater = data.length > 0 ? Math.round(data.reduce((s, d) => s + getVal(d, 'water'), 0) / data.length) : 0;
  const totalWorkouts = exerciseLogs.length;
  const totalExerciseMinutes = exerciseLogs.reduce((acc, e) => acc + Number(e.duration_minutes || 0), 0);

  // Perfil Lipídico Agregado (Médias diárias)
  const avgFats = data.length > 0 ? Math.round(data.reduce((s, d) => s + getVal(d, 'fats'), 0) / data.length) : 0;
  const avgSaturatedFats = data.length > 0 ? Math.round((data.reduce((s, d) => s + getVal(d, 'saturated_fats'), 0) / data.length) * 10) / 10 : 0;
  const avgMonoFats = data.length > 0 ? Math.round((data.reduce((s, d) => s + getVal(d, 'monounsaturated_fats'), 0) / data.length) * 10) / 10 : 0;
  const avgPolyFats = data.length > 0 ? Math.round((data.reduce((s, d) => s + getVal(d, 'polyunsaturated_fats'), 0) / data.length) * 10) / 10 : 0;
  const avgTransFats = data.length > 0 ? Math.round((data.reduce((s, d) => s + getVal(d, 'trans_fats'), 0) / data.length) * 10) / 10 : 0;
  const avgCholesterol = data.length > 0 ? Math.round(data.reduce((s, d) => s + getVal(d, 'cholesterol'), 0) / data.length) : 0;

  const lipidEvaluation: LipidProfileEvaluation = evaluateLipidProfile(
    avgFats,
    avgSaturatedFats,
    avgMonoFats,
    avgPolyFats,
    avgTransFats,
    avgCalories
  );

  // Montar contexto e disparar o motor de insights inteligentes
  const userContext: UserContext = {
    daysLoggedPast7d: daysWithFood,
    totalWorkoutsPast7d: totalWorkouts,
    weeklyWorkoutsTarget,
    avgCaloriesPast7d: avgCalories,
    targetCalories: target,
    avgProteinPast7d: avgProtein,
    targetProtein: proteinTarget,
    avgFiberPast7d: avgFiber,
    avgWaterPast7d: avgWater,
    targetWater: waterTarget,
    weightTrendKg: trendAnalysis.weeklyRateKg,
    sampleWeightCount7d: trendAnalysis.sampleCount7d,
  };

  const smartInsights: Insight[] = generateSmartInsights(userContext);

  const handleShareWeeklyReport = async () => {
    try {
      const topTip = smartInsights[0]?.actionableTip || 'Mantenha a consistência nos registros diários!';
      const weightSummary = trendAnalysis.isSufficientData 
        ? `• Média Móvel de Peso (7d): ${trendAnalysis.movingAverage7d} kg (${trendAnalysis.weeklyRateKg !== null && trendAnalysis.weeklyRateKg < 0 ? 'evolução de ' + Math.abs(trendAnalysis.weeklyRateKg) + ' kg/sem' : 'em acompanhamento'})`
        : `• Peso Atual: ${trendAnalysis.currentWeight ? trendAnalysis.currentWeight + ' kg' : 'Em fase de acúmulo de pesagens'}`;

      const message = `📊 Meu Relatório Semanal de Hábitos & Saúde:\n\n` +
        `🔥 Dias Registrados: ${daysWithFood}/7 dias\n` +
        `🥗 Média Calórica: ${avgCalories} kcal/dia (Meta: ${target} kcal)\n` +
        `🌾 Média de Fibras: ${avgFiber}g/dia (Meta: ${fiberTarget}g)\n` +
        `🥩 Média de Proteínas: ${avgProtein}g/dia (Meta: ${proteinTarget}g)\n` +
        `🥑 Gorduras Totais: ${avgFats}g/dia (Saturada: ${avgSaturatedFats}g, ${lipidEvaluation.saturatedCaloriesPercentage}% do VET)\n` +
        `💧 Hidratação Média: ${(avgWater / 1000).toFixed(1)} L/dia\n` +
        `🏋️ Atividade Física: ${totalWorkouts} treinos (${totalExerciseMinutes} min)\n` +
        `${weightSummary}\n\n` +
        `💡 Recomendação: ${topTip}\n\n` +
        `Registrado com foco no Batalha da Balança ⚔️⚖️`;

      await Share.share({ message });
    } catch (e) {
      console.error('Erro ao compartilhar relatório semanal:', e);
    }
  };

  // Gráfico de Calorias
  const chartData = data.slice(-7).map((d) => {
    const dayOfWeek = new Date(d.date + 'T12:00:00').getDay();
    const calories = d.summary?.calories || d.calories || 0;
    const isToday = new Date(d.date).toDateString() === new Date().toDateString();
    const calValue = Math.round(calories);
    return {
      value: calValue,
      label: isToday ? 'Hoje' : DAY_LABELS_PT[dayOfWeek],
      labelTextStyle: isToday ? { color: '#22c55e', fontSize: 13, fontWeight: 'bold' as const } : { color: '#9ca3af', fontSize: 11 },
      frontColor: isToday ? '#22c55e' : (calories >= target * 0.8 && calories <= target * 1.15 ? '#16a34a' : '#134e38'),
    };
  });

  // Gráfico de Hidratação
  const waterChartData = data.slice(-7).map((d) => {
    const dayOfWeek = new Date(d.date + 'T12:00:00').getDay();
    const water = d.summary?.water || d.water || 0;
    const isToday = new Date(d.date).toDateString() === new Date().toDateString();
    const waterValue = Math.round(water);
    return {
      value: waterValue,
      label: isToday ? '●' : DAY_LABELS_PT[dayOfWeek].charAt(0),
      labelTextStyle: isToday ? { color: '#0ea5e9', fontSize: 12, fontWeight: 'bold' as const } : { color: '#9ca3af', fontSize: 11 },
      frontColor: isToday ? '#0ea5e9' : (water >= waterTarget * 0.8 ? '#0891b2' : '#0c4a6e'),
    };
  });

  // Gráfico de Peso
  const weightChartData = weightLogs.slice(0, 10).reverse().map((w) => ({
    value: parseFloat(w.weight_kg) || 0,
    dataPointText: `${parseFloat(w.weight_kg)}`,
    textShiftY: -8,
    textColor: '#a855f7',
    textFontSize: 10,
  }));

  // Preparação de dados de Composição Corporal e Bioimpedância Clínica
  const bioRecords = bioHistory.records || [];
  const recordsWithComposition = bioRecords.filter(
    (r) => r.body_fat_pct !== null && r.muscle_mass_pct !== null
  );
  const recordsWithWaist = bioRecords.filter((r) => r.waist_cm !== null && (r.waist_cm || 0) > 0);

  const fatChartData = recordsWithComposition.map((r) => ({
    value: Number(r.body_fat_pct) || 0,
    dataPointText: `${r.body_fat_pct}%`,
    textShiftY: -8,
    textColor: '#f59e0b',
    textFontSize: 9,
    label: r.date ? r.date.slice(5) : '',
    labelTextStyle: { color: '#9ca3af', fontSize: 9 },
  }));

  const muscleChartData = recordsWithComposition.map((r) => ({
    value: Number(r.muscle_mass_pct) || 0,
    dataPointText: `${r.muscle_mass_pct}%`,
    textShiftY: 10,
    textColor: '#22c55e',
    textFontSize: 9,
  }));

  const waistChartData = recordsWithWaist.map((r) => ({
    value: Number(r.waist_cm) || 0,
    dataPointText: `${r.waist_cm}cm`,
    textShiftY: -8,
    textColor: '#38bdf8',
    textFontSize: 9,
    label: r.date ? r.date.slice(5) : '',
    labelTextStyle: { color: '#9ca3af', fontSize: 9 },
  }));

  const latestBio = bioRecords[bioRecords.length - 1];
  const firstBio = bioRecords[0];

  const fatDelta =
    latestBio?.body_fat_pct !== null &&
    latestBio?.body_fat_pct !== undefined &&
    firstBio?.body_fat_pct !== null &&
    firstBio?.body_fat_pct !== undefined
      ? Math.round((latestBio.body_fat_pct - firstBio.body_fat_pct) * 10) / 10
      : null;

  const muscleDelta =
    latestBio?.muscle_mass_pct !== null &&
    latestBio?.muscle_mass_pct !== undefined &&
    firstBio?.muscle_mass_pct !== null &&
    firstBio?.muscle_mass_pct !== undefined
      ? Math.round((latestBio.muscle_mass_pct - firstBio.muscle_mass_pct) * 10) / 10
      : null;

  const waistDelta =
    latestBio?.waist_cm !== null &&
    latestBio?.waist_cm !== undefined &&
    firstBio?.waist_cm !== null &&
    firstBio?.waist_cm !== undefined
      ? Math.round((latestBio.waist_cm - firstBio.waist_cm) * 10) / 10
      : null;

  let recompositionStatus: { label: string; color: string; desc: string } = {
    label: 'Marco Zero',
    color: '#38bdf8',
    desc: 'Cadastre suas pesagens periódicas na balança para acompanhar a queima de gordura e ganho magro.',
  };

  if (fatDelta !== null && muscleDelta !== null && bioRecords.length >= 2) {
    if (muscleDelta >= 0.6 && fatDelta <= 0.5) {
      recompositionStatus = {
        label: '🏆 Hipertrofia & Força',
        color: '#22c55e',
        desc: `Ganho de +${muscleDelta}% de massa muscular preservando gordura. Shape denso e forte!`,
      };
    } else if (fatDelta < 0 && muscleDelta >= -0.4) {
      recompositionStatus = {
        label: '🟢 Queima Efetiva',
        color: '#22c55e',
        desc: `Redução de ${Math.abs(fatDelta)}% de gordura corporal com preservação de massa muscular!`,
      };
    } else if (fatDelta > 0.5 && muscleDelta < -0.8) {
      recompositionStatus = {
        label: '⚠️ Alerta de Flacidez',
        color: '#ef4444',
        desc: 'Perda muscular detectada com aumento adiposo. Aumente proteínas e treinos de força!',
      };
    } else {
      recompositionStatus = {
        label: '⚖️ Estabilidade Tecidual',
        color: '#38bdf8',
        desc: 'Composição corporal em equilíbrio sustentável. Mantenha os treinos e hidratação!',
      };
    }
  }

  const isOnTrack = avgCalories >= target * 0.8 && avgCalories <= target * 1.15;
  const maxCalorieValue = Math.max(...chartData.map((d) => d.value), target);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AnalyticsSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progresso & Tendências</Text>
          <Text style={styles.headerSubtitle}>Média móvel real e consistência de hábitos</Text>
        </View>

        {/* Seletor de Período */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, period === 'weekly' && styles.toggleButtonActive]}
            onPress={() => setPeriod('weekly')}
          >
            <Text style={[styles.toggleText, period === 'weekly' && styles.toggleTextActive]}>Semanal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, period === 'monthly' && styles.toggleButtonActive]}
            onPress={() => setPeriod('monthly')}
          >
            <Text style={[styles.toggleText, period === 'monthly' && styles.toggleTextActive]}>Mensal</Text>
          </TouchableOpacity>
        </View>

        {/* Card Principal: Calorias & Nutrição */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <View>
              <Text style={styles.mainCardLabel}>Média Calórica Diária</Text>
              <Text style={styles.mainCardValue}>
                {avgCalories.toLocaleString()}
                <Text style={styles.mainCardUnit}> kcal/dia</Text>
              </Text>
            </View>
            <View style={[styles.statusBadge, isOnTrack ? styles.statusGreen : styles.statusOrange]}>
              {isOnTrack ? <TrendingUp color="#22c55e" size={16} /> : <Activity color="#f97316" size={16} />}
              <Text style={[styles.statusText, { color: isOnTrack ? '#22c55e' : '#f97316' }]}>
                {isOnTrack ? 'Dentro da Meta' : 'Abaixo do Planejado'}
              </Text>
            </View>
          </View>

          <View style={styles.chartArea}>
            {chartData.some((d) => d.value > 0) ? (
              <View style={{ position: 'relative' }}>
                <BarChart
                  data={chartData}
                  width={width - 80}
                  height={140}
                  barWidth={26}
                  spacing={14}
                  barBorderRadius={6}
                  backgroundColor="transparent"
                  yAxisThickness={0}
                  xAxisThickness={0}
                  hideRules
                  hideYAxisText
                  noOfSections={4}
                  maxValue={maxCalorieValue * 1.15}
                  initialSpacing={10}
                  showReferenceLine1
                  referenceLine1Position={target}
                  referenceLine1Config={{
                    color: 'rgba(255,255,255,0.3)',
                    dashWidth: 5,
                    dashGap: 3,
                    labelText: `${target} kcal`,
                    labelTextStyle: { color: '#9ca3af', fontSize: 11, fontWeight: '500' },
                  }}
                  focusBarOnPress
                  focusedBarConfig={{ color: '#4ade80' }}
                  renderTooltip={(item: any) => (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>{item.value} kcal</Text>
                    </View>
                  )}
                />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhum registro no período</Text>
                <Text style={styles.emptySubtext}>Registre suas refeições para acompanhar o balanço diário</Text>
              </View>
            )}
          </View>
        </View>

        {/* Estatísticas Rápidas: Dias Registrados e Proteína */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
              <Flame color="#f97316" size={22} />
            </View>
            <View>
              <Text style={styles.quickStatValue}>{daysWithFood} / 7</Text>
              <Text style={styles.quickStatLabel}>Dias Registrados</Text>
            </View>
          </View>

          <View style={styles.quickStatDivider} />

          <View style={styles.quickStatItem}>
            <View style={[styles.quickStatIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Activity color="#22c55e" size={22} />
            </View>
            <View>
              <Text style={styles.quickStatValue}>{avgProtein}g</Text>
              <Text style={styles.quickStatLabel}>Média Proteica</Text>
            </View>
          </View>
        </View>

        {/* CARD DE PESO & TENDÊNCIA REAL (trendsEngine) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <View style={[styles.cardIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Scale color="#a855f7" size={20} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Tendência de Peso Real</Text>
                <Text style={styles.cardSubtitle}>
                  {trendAnalysis.currentWeight
                    ? `Último registro: ${trendAnalysis.currentWeight} kg`
                    : 'Nenhuma pesagem recente'}
                </Text>
              </View>
            </View>

            {trendAnalysis.isSufficientData && trendAnalysis.changeLastWeekKg !== null && (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      trendAnalysis.changeLastWeekKg < 0
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(249, 115, 22, 0.15)',
                  },
                ]}
              >
                {trendAnalysis.changeLastWeekKg < 0 ? (
                  <TrendingDown color="#22c55e" size={14} />
                ) : (
                  <TrendingUp color="#f97316" size={14} />
                )}
                <Text
                  style={[
                    styles.trendText,
                    {
                      color: trendAnalysis.changeLastWeekKg < 0 ? '#22c55e' : '#f97316',
                    },
                  ]}
                >
                  {trendAnalysis.changeLastWeekKg > 0 ? '+' : ''}
                  {trendAnalysis.changeLastWeekKg} kg
                </Text>
              </View>
            )}
          </View>

          {/* Destaque de Média Móvel de 7 dias */}
          {trendAnalysis.isSufficientData ? (
            <View style={styles.movingAvgBox}>
              <View style={styles.movingAvgHeader}>
                <Text style={styles.movingAvgLabel}>MÉDIA MÓVEL (7 DIAS)</Text>
                <Text style={styles.movingAvgValue}>{trendAnalysis.movingAverage7d} kg</Text>
              </View>
              <Text style={styles.movingAvgDescription}>{trendAnalysis.disclaimer}</Text>
            </View>
          ) : (
            <View style={styles.insufficientDataBox}>
              <View style={styles.insufficientHeader}>
                <AlertTriangle color="#f59e0b" size={18} />
                <Text style={styles.insufficientTitle}>
                  Amostragem Insuficiente ({trendAnalysis.sampleCount7d}/3 pesagens)
                </Text>
              </View>
              <Text style={styles.insufficientText}>{trendAnalysis.disclaimer}</Text>
            </View>
          )}

          {/* Alerta de Amortecimento de Flutuação Diária */}
          {dailyFluctuationAlert && (
            <View style={styles.fluctuationAlertBox}>
              <Info color="#38bdf8" size={16} />
              <Text style={styles.fluctuationAlertText}>{dailyFluctuationAlert}</Text>
            </View>
          )}

          {/* Gráfico de Peso */}
          <View style={styles.weightChartArea}>
            {weightChartData.length >= 2 ? (
              <LineChart
                data={weightChartData}
                width={width - 75}
                height={90}
                color="#a855f7"
                thickness={3}
                hideDataPoints={false}
                dataPointsColor="#c084fc"
                dataPointsRadius={4}
                curved
                hideRules
                hideYAxisText
                hideAxesAndRules
                areaChart
                startFillColor="rgba(168, 85, 247, 0.25)"
                endFillColor="rgba(168, 85, 247, 0.02)"
                startOpacity={0.25}
                endOpacity={0.02}
              />
            ) : (
              <View style={styles.emptyStateSmall}>
                <Text style={styles.emptyTextSmall}>
                  Registre pelo menos 2 pesagens para visualizar a curva de evolução
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* NOVO CARD: COMPOSIÇÃO CORPORAL & BIOIMPEDÂNCIA CLÍNICA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <View style={[styles.cardIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Scale color="#f59e0b" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Composição Corporal & Bioimpedância</Text>
                <Text style={styles.cardSubtitle}>Massa Magra vs. Tecido Adiposo Subcutâneo</Text>
              </View>
            </View>

            {/* Tag de Recomposição */}
            <View style={[styles.lipidStatusBadge, { backgroundColor: `${recompositionStatus.color}20`, borderColor: recompositionStatus.color }]}>
              <Text style={[styles.lipidStatusText, { color: recompositionStatus.color }]}>
                {recompositionStatus.label}
              </Text>
            </View>
          </View>

          {/* Seletor de Abas Bioimpedância: Tecidos vs Cintura */}
          <View style={styles.bioTabRow}>
            <TouchableOpacity
              style={[styles.bioTabBtn, bioTab === 'tissues' && styles.bioTabBtnActive]}
              onPress={() => {
                soundHaptics.triggerLightTap();
                setBioTab('tissues');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.bioTabBtnText, bioTab === 'tissues' && styles.bioTabBtnTextActive]}>
                Curva de Tecidos (% Gordura / Músculo)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bioTabBtn, bioTab === 'waist' && styles.bioTabBtnActive]}
              onPress={() => {
                soundHaptics.triggerLightTap();
                setBioTab('waist');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.bioTabBtnText, bioTab === 'waist' && styles.bioTabBtnTextActive]}>
                Circunferência de Cintura (cm)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Métricas Rápidas */}
          <View style={styles.bioMetricsRow}>
            <View style={styles.bioMetricCol}>
              <Text style={styles.bioMetricLabel}>% GORDURA</Text>
              <Text style={[styles.bioMetricVal, { color: '#f59e0b' }]}>
                {latestBio?.body_fat_pct !== null && latestBio?.body_fat_pct !== undefined ? `${latestBio.body_fat_pct}%` : '--'}
              </Text>
              <Text style={[styles.bioMetricDelta, { color: (fatDelta || 0) <= 0 ? '#22c55e' : '#ef4444' }]}>
                {fatDelta !== null ? `${fatDelta > 0 ? '+' : ''}${fatDelta}%` : 'Marco Zero'}
              </Text>
            </View>

            <View style={styles.bioMetricDivider} />

            <View style={styles.bioMetricCol}>
              <Text style={styles.bioMetricLabel}>% MÚSCULO</Text>
              <Text style={[styles.bioMetricVal, { color: '#22c55e' }]}>
                {latestBio?.muscle_mass_pct !== null && latestBio?.muscle_mass_pct !== undefined ? `${latestBio.muscle_mass_pct}%` : '--'}
              </Text>
              <Text style={[styles.bioMetricDelta, { color: (muscleDelta || 0) >= 0 ? '#22c55e' : '#ef4444' }]}>
                {muscleDelta !== null ? `${muscleDelta > 0 ? '+' : ''}${muscleDelta}%` : 'Marco Zero'}
              </Text>
            </View>

            <View style={styles.bioMetricDivider} />

            <View style={styles.bioMetricCol}>
              <Text style={styles.bioMetricLabel}>CINTURA</Text>
              <Text style={[styles.bioMetricVal, { color: '#38bdf8' }]}>
                {latestBio?.waist_cm !== null && latestBio?.waist_cm !== undefined ? `${latestBio.waist_cm} cm` : '--'}
              </Text>
              <Text style={[styles.bioMetricDelta, { color: (waistDelta || 0) <= 0 ? '#22c55e' : '#ef4444' }]}>
                {waistDelta !== null ? `${waistDelta > 0 ? '+' : ''}${waistDelta} cm` : 'Marco Zero'}
              </Text>
            </View>
          </View>

          {/* Gráfico de Linhas */}
          {bioTab === 'tissues' ? (
            <View style={styles.weightChartArea}>
              {fatChartData.length >= 2 ? (
                <>
                  <View style={styles.chartLegendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                      <Text style={styles.legendText}>Gordura (%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                      <Text style={styles.legendText}>Massa Muscular (%)</Text>
                    </View>
                  </View>

                  <LineChart
                    data={fatChartData}
                    data2={muscleChartData}
                    width={width - 80}
                    height={130}
                    color="#f59e0b"
                    color2="#22c55e"
                    thickness={3}
                    thickness2={3}
                    dataPointsColor="#f59e0b"
                    dataPointsColor2="#22c55e"
                    dataPointsRadius={4}
                    dataPointsRadius2={4}
                    curved
                    hideRules
                    hideYAxisText={false}
                    yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                    yAxisColor="transparent"
                    xAxisColor="rgba(255,255,255,0.1)"
                    spacing={Math.max(40, (width - 100) / Math.max(1, fatChartData.length))}
                    initialSpacing={16}
                  />
                </>
              ) : (
                <View style={styles.emptyStateSmall}>
                  <Text style={styles.emptyTextSmall}>
                    Faça pelo menos 2 check-ins de bioimpedância no Perfil para ver a curva comparativa de tecidos.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.weightChartArea}>
              {waistChartData.length >= 2 ? (
                <>
                  <View style={styles.chartLegendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#38bdf8' }]} />
                      <Text style={styles.legendText}>Cintura (cm)</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={styles.legendText}>Limite SBC ({bioHistory.profile.waistThreshold}cm)</Text>
                    </View>
                  </View>

                  <LineChart
                    data={waistChartData}
                    width={width - 80}
                    height={130}
                    color="#38bdf8"
                    thickness={3}
                    dataPointsColor="#38bdf8"
                    dataPointsRadius={4}
                    curved
                    hideRules
                    hideYAxisText={false}
                    yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                    yAxisColor="transparent"
                    xAxisColor="rgba(255,255,255,0.1)"
                    spacing={Math.max(40, (width - 100) / Math.max(1, waistChartData.length))}
                    initialSpacing={16}
                    showReferenceLine1
                    referenceLine1Position={bioHistory.profile.waistThreshold}
                    referenceLine1Config={{ color: '#ef444480', dashWidth: 4, dashGap: 4 }}
                  />
                </>
              ) : (
                <View style={styles.emptyStateSmall}>
                  <Text style={styles.emptyTextSmall}>
                    Registre a circunferência de cintura no check-in para acompanhar a evolução das suas medidas.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Feedback Clínico da Recomposição */}
          <View style={[styles.fluctuationAlertBox, { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(56, 189, 248, 0.2)' }]}>
            <Info color="#38bdf8" size={15} />
            <Text style={styles.fluctuationAlertText}>{recompositionStatus.desc}</Text>
          </View>
        </View>

        {/* SEÇÃO DE INSIGHTS INTELIGENTES DETERMINÍSTICOS (insightsEngine) */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Sparkles color="#22c55e" size={20} />
            <Text style={styles.sectionTitle}>Insights Inteligentes</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Baseados exclusivamente nos seus dados e hábitos</Text>
        </View>

        {smartInsights.length > 0 ? (
          smartInsights.map((insight) => {
            const isPositive = insight.type === 'positive';
            const isWarning = insight.type === 'warning';
            const iconColor = isPositive ? '#22c55e' : isWarning ? '#f59e0b' : '#38bdf8';
            const borderColor = isPositive
              ? 'rgba(34, 197, 94, 0.25)'
              : isWarning
              ? 'rgba(245, 158, 11, 0.25)'
              : 'rgba(56, 189, 248, 0.25)';

            return (
              <View key={insight.id} style={[styles.insightCard, { borderColor }]}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightTitleRow}>
                    {isPositive ? (
                      <CheckCircle2 color={iconColor} size={18} />
                    ) : isWarning ? (
                      <AlertTriangle color={iconColor} size={18} />
                    ) : (
                      <Lightbulb color={iconColor} size={18} />
                    )}
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                  </View>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: `${iconColor}20` },
                    ]}
                  >
                    <Text style={[styles.categoryBadgeText, { color: iconColor }]}>
                      {insight.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.insightMessage}>{insight.message}</Text>

                {/* Bloco de Fundamentação / Explicação Factual */}
                <View style={styles.insightExplanationBox}>
                  <Text style={styles.insightExplanationLabel}>POR QUE ISSO IMPORTA?</Text>
                  <Text style={styles.insightExplanationText}>{insight.explanation}</Text>
                </View>

                {/* Dica Prática Acionável */}
                <View style={styles.insightActionBox}>
                  <Text style={styles.insightActionLabel}>👉 Dica Prática:</Text>
                  <Text style={styles.insightActionText}>{insight.actionableTip}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyInsightsCard}>
            <Sparkles color="#6b7280" size={24} />
            <Text style={styles.emptyInsightsText}>Ainda acumulando registros</Text>
            <Text style={styles.emptyInsightsSubtext}>
              Continue registrando suas refeições, água e pesagens para gerar insights personalizados.
            </Text>
          </View>
        )}

        {/* Card de Hidratação */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <View style={[styles.cardIcon, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                <Droplets color="#0ea5e9" size={20} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Hidratação</Text>
                <Text style={styles.cardSubtitle}>
                  {(avgWater / 1000).toFixed(1)}L méd. / {(waterTarget / 1000).toFixed(1)}L meta
                </Text>
              </View>
            </View>
            <Text style={[styles.cardPercent, { color: '#0ea5e9' }]}>
              {Math.round((avgWater / waterTarget) * 100)}%
            </Text>
          </View>

          <View style={styles.chartAreaSmall}>
            {waterChartData.some((d) => d.value > 0) ? (
              <BarChart
                data={waterChartData}
                width={width - 80}
                height={80}
                barWidth={24}
                spacing={16}
                barBorderRadius={4}
                backgroundColor="transparent"
                yAxisThickness={0}
                xAxisThickness={0}
                hideRules
                hideYAxisText
                noOfSections={2}
                initialSpacing={8}
                focusBarOnPress
                focusedBarConfig={{ color: '#38bdf8' }}
                renderTooltip={(item: any) => (
                  <View style={styles.tooltipSmall}>
                    <Text style={styles.tooltipTextSmall}>{(item.value / 1000).toFixed(1)}L</Text>
                  </View>
                )}
              />
            ) : (
              <Text style={styles.emptyTextSmall}>Nenhum registro de água nesta semana</Text>
            )}
          </View>
        </View>

        {/* Card de Atividade Física */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <View style={[styles.cardIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Dumbbell color="#22c55e" size={20} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Atividade Física Semanal</Text>
                <Text style={styles.cardSubtitle}>
                  {totalWorkouts} de {weeklyWorkoutsTarget} treinos realizados
                </Text>
              </View>
            </View>
            <Text style={[styles.cardPercent, { color: '#22c55e' }]}>
              {totalExerciseMinutes} min
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(
                      (totalWorkouts / Math.max(weeklyWorkoutsTarget, 1)) * 100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
          <Text style={styles.summaryFooter}>
            {totalWorkouts >= weeklyWorkoutsTarget
              ? 'Meta semanal atingida com sucesso! 🔥'
              : `Faltam ${Math.max(weeklyWorkoutsTarget - totalWorkouts, 0)} treino(s) para completar sua meta da semana.`}
          </Text>
        </View>

        {/* CARD DE PERFIL LIPÍDICO & SAÚDE CARDIOVASCULAR (OMS / SBC) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <View style={[styles.cardIcon, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                <Heart color="#eab308" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Qualidade Lipídica & Coração</Text>
                <Text style={styles.cardSubtitle}>
                  Diretriz OMS: Saturadas &lt; 10% das calorias
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.lipidStatusBadge,
                lipidEvaluation.status === 'excellent' || lipidEvaluation.status === 'balanced'
                  ? styles.statusGreen
                  : styles.statusOrange,
              ]}
            >
              <ShieldCheck
                color={
                  lipidEvaluation.status === 'excellent' || lipidEvaluation.status === 'balanced'
                    ? '#22c55e'
                    : '#f97316'
                }
                size={14}
              />
              <Text
                style={[
                  styles.lipidStatusText,
                  {
                    color:
                      lipidEvaluation.status === 'excellent' || lipidEvaluation.status === 'balanced'
                        ? '#22c55e'
                        : '#f97316',
                  },
                ]}
              >
                {lipidEvaluation.status === 'excellent'
                  ? 'Cardioprotetor'
                  : lipidEvaluation.status === 'trans_alert'
                  ? 'Alerta Trans'
                  : lipidEvaluation.isSaturatedExcessive
                  ? 'Ajustar Saturada'
                  : 'Equilibrado'}
              </Text>
            </View>
          </View>

          {/* Grid das 4 Métricas Lipídicas */}
          <View style={styles.lipidMetricsGrid}>
            {/* Gorduras Boas (Mono + Poli) */}
            <View style={styles.lipidMetricItem}>
              <Text style={styles.lipidMetricLabel}>Gorduras Boas</Text>
              <Text style={[styles.lipidMetricValue, { color: '#22c55e' }]}>
                {lipidEvaluation.goodFats_g}g
              </Text>
              <Text style={styles.lipidMetricSub}>
                {lipidEvaluation.goodFatsRatio}% do total
              </Text>
            </View>

            {/* Gordura Saturada */}
            <View style={styles.lipidMetricItem}>
              <Text style={styles.lipidMetricLabel}>Gord. Saturada</Text>
              <Text
                style={[
                  styles.lipidMetricValue,
                  { color: lipidEvaluation.isSaturatedExcessive ? '#f97316' : '#ffffff' },
                ]}
              >
                {avgSaturatedFats}g
              </Text>
              <Text
                style={[
                  styles.lipidMetricSub,
                  { color: lipidEvaluation.isSaturatedExcessive ? '#f97316' : '#9ca3af' },
                ]}
              >
                {lipidEvaluation.saturatedCaloriesPercentage}% do VET (máx 10%)
              </Text>
            </View>

            {/* Gordura Trans */}
            <View style={styles.lipidMetricItem}>
              <Text style={styles.lipidMetricLabel}>Gordura Trans</Text>
              <Text
                style={[
                  styles.lipidMetricValue,
                  { color: avgTransFats > 0.1 ? '#ef4444' : '#22c55e' },
                ]}
              >
                {avgTransFats}g
              </Text>
              <Text style={styles.lipidMetricSub}>
                {avgTransFats > 0.1 ? 'Evitar consumo' : 'Livre de Trans'}
              </Text>
            </View>

            {/* Colesterol */}
            <View style={styles.lipidMetricItem}>
              <Text style={styles.lipidMetricLabel}>Colesterol</Text>
              <Text style={styles.lipidMetricValue}>{avgCholesterol}mg</Text>
              <Text style={styles.lipidMetricSub}>Média diária</Text>
            </View>
          </View>

          {/* Banner de Recomendação Clínica */}
          <View
            style={[
              styles.lipidAdviceBox,
              lipidEvaluation.status === 'trans_alert' || lipidEvaluation.isSaturatedExcessive
                ? styles.lipidAdviceBoxWarning
                : styles.lipidAdviceBoxSuccess,
            ]}
          >
            <Info
              color={
                lipidEvaluation.status === 'trans_alert' || lipidEvaluation.isSaturatedExcessive
                  ? '#f59e0b'
                  : '#22c55e'
              }
              size={15}
            />
            <Text style={styles.lipidAdviceText}>{lipidEvaluation.message}</Text>
          </View>
        </View>

        {/* Resumo da Semana */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Balanço Nutricional Semanal</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Média calórica</Text>
            <Text style={styles.summaryValue}>{avgCalories.toLocaleString()} kcal</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Média de fibras</Text>
            <Text style={styles.summaryValue}>{avgFiber}g / dia</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Média de proteínas</Text>
            <Text style={styles.summaryValue}>{avgProtein}g / dia</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Média de gorduras</Text>
            <Text style={styles.summaryValue}>{avgFats}g / dia (Sat: {avgSaturatedFats}g)</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min((avgCalories / target) * 100, 100)}%` },
                ]}
              />
            </View>
          </View>
          <Text style={styles.summaryFooter}>
            {avgCalories > 0
              ? `${Math.round((avgCalories / target) * 100)}% da sua meta calórica diária`
              : 'Registre suas refeições para ver o resumo completo.'}
          </Text>

          {/* Botão de Compartilhar Relatório Semanal */}
          <TouchableOpacity
            style={styles.shareReportButton}
            onPress={handleShareWeeklyReport}
            activeOpacity={0.8}
          >
            <Share2 color="#22c55e" size={16} />
            <Text style={styles.shareReportText}>Compartilhar Relatório Semanal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  shareReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  shareReportText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Cabeçalho
  header: { marginBottom: 20 },
  headerTitle: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { color: '#9ca3af', fontSize: 15, marginTop: 4 },

  // Toggle
  toggleContainer: { flexDirection: 'row', backgroundColor: '#0f2920', borderRadius: 14, padding: 4, marginBottom: 20 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#22c55e' },
  toggleText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: '#0a1a15', fontWeight: '700' },

  // Card Principal
  mainCard: { backgroundColor: '#0f2920', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  mainCardLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 4 },
  mainCardValue: { color: '#ffffff', fontSize: 34, fontWeight: 'bold' },
  mainCardUnit: { color: '#6b7280', fontSize: 15, fontWeight: 'normal' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  statusGreen: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  statusOrange: { backgroundColor: 'rgba(249, 115, 22, 0.15)' },
  statusText: { fontSize: 12, fontWeight: '600' },
  chartArea: { alignItems: 'center', marginBottom: 8, minHeight: 140 },

  emptyState: { justifyContent: 'center', alignItems: 'center', paddingVertical: 36 },
  emptyText: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  emptySubtext: { color: '#6b7280', fontSize: 13, marginTop: 4, textAlign: 'center' },
  emptyStateSmall: { justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  emptyTextSmall: { color: '#6b7280', fontSize: 13, textAlign: 'center' },

  // Quick Stats
  quickStats: { flexDirection: 'row', backgroundColor: '#0f2920', borderRadius: 20, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  quickStatItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickStatIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  quickStatValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  quickStatLabel: { color: '#9ca3af', fontSize: 12 },
  quickStatDivider: { width: 1, height: 38, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 16 },

  // Cards Gerais
  card: { backgroundColor: '#0f2920', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  cardSubtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  cardPercent: { fontSize: 18, fontWeight: 'bold' },
  chartAreaSmall: { alignItems: 'center', minHeight: 80 },

  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  trendText: { fontSize: 13, fontWeight: '700' },
  weightChartArea: { alignItems: 'center', minHeight: 90, marginTop: 12 },

  // Caixa de Média Móvel
  movingAvgBox: { backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.25)', marginBottom: 10 },
  movingAvgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  movingAvgLabel: { color: '#c084fc', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  movingAvgValue: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  movingAvgDescription: { color: '#d8b4fe', fontSize: 12, lineHeight: 17 },

  // Aviso de Amostragem Insuficiente
  insufficientDataBox: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)', marginBottom: 10 },
  insufficientHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  insufficientTitle: { color: '#fbbf24', fontSize: 13, fontWeight: '700' },
  insufficientText: { color: '#fde68a', fontSize: 12, lineHeight: 17 },

  // Alerta de Flutuação Diária
  fluctuationAlertBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(14, 165, 233, 0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.2)', marginBottom: 8 },
  fluctuationAlertText: { color: '#bae6fd', fontSize: 12, lineHeight: 17, flex: 1 },

  // Seção de Insights
  sectionHeader: { marginTop: 10, marginBottom: 14 },
  sectionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  sectionSubtitle: { color: '#9ca3af', fontSize: 13, marginTop: 2 },

  insightCard: { backgroundColor: '#0f2920', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1 },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  insightTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  insightTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: '700' },
  insightMessage: { color: '#e5e7eb', fontSize: 13, lineHeight: 19, marginBottom: 12 },

  insightExplanationBox: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 10, marginBottom: 10 },
  insightExplanationLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  insightExplanationText: { color: '#d1d5db', fontSize: 12, lineHeight: 17 },

  insightActionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 10, padding: 10 },
  insightActionLabel: { color: '#22c55e', fontSize: 12, fontWeight: '700' },
  insightActionText: { color: '#86efac', fontSize: 12, lineHeight: 17, flex: 1 },

  emptyInsightsCard: { backgroundColor: '#0f2920', borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyInsightsText: { color: '#9ca3af', fontSize: 15, fontWeight: '600', marginTop: 10 },
  emptyInsightsSubtext: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 4 },

  // Resumo
  summaryCard: { backgroundColor: '#0f2920', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  summaryTitle: { color: '#ffffff', fontSize: 17, fontWeight: '600', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { color: '#9ca3af', fontSize: 14 },
  summaryValue: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  progressContainer: { marginTop: 8, marginBottom: 10 },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  progressBar: { height: '100%', backgroundColor: '#22c55e', borderRadius: 4 },
  summaryFooter: { color: '#6b7280', fontSize: 13 },

  // Tooltips
  tooltip: { backgroundColor: '#1f2937', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 4 },
  tooltipText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  tooltipSmall: { backgroundColor: '#0c4a6e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
  tooltipTextSmall: { color: '#ffffff', fontSize: 11, fontWeight: '500' },

  // Perfil Lipídico
  lipidStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  lipidStatusText: { fontSize: 12, fontWeight: '700' },
  lipidMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  lipidMetricItem: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  lipidMetricLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  lipidMetricValue: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  lipidMetricSub: { color: '#6b7280', fontSize: 10, marginTop: 2 },
  lipidAdviceBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12, borderWidth: 1 },
  lipidAdviceBoxSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.25)' },
  lipidAdviceBoxWarning: { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)' },
  lipidAdviceText: { color: '#e5e7eb', fontSize: 12, lineHeight: 17, flex: 1 },

  // Abas e Métricas de Bioimpedância
  bioTabRow: {
    flexDirection: 'row',
    backgroundColor: '#0a1a15',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  bioTabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioTabBtnActive: {
    backgroundColor: '#133527',
  },
  bioTabBtnText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  bioTabBtnTextActive: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  bioMetricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bioMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  bioMetricLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  bioMetricVal: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  bioMetricDelta: {
    fontSize: 11,
    fontWeight: '700',
  },
  bioMetricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
});

