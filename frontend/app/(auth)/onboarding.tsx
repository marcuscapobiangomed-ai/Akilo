import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../../core/api';
import { supabase } from '../../core/supabase';
import { 
  ChevronLeft, 
  Dumbbell, 
  TrendingDown, 
  Heart, 
  ArrowRight, 
  Check, 
  Droplets, 
  Wheat, 
  ShieldAlert, 
  Sparkles, 
  ShieldCheck, 
  Crown,
  User,
  Calendar,
  Ruler,
  Scale,
  Percent,
  Zap,
  RefreshCw
} from 'lucide-react-native';
import { useToast } from '../../components/Toast';
import { markOnboardingComplete } from '../../core/onboarding';
import { calculateScientificTargets, BiologicalSex } from '../../core/domain/nutritionEngine';
import { LivingAvatar3D } from '../../components/LivingAvatar3D';
import { evaluateMascot, MascotId } from '../../core/domain/avatarEngine';
import { soundHaptics } from '../../core/soundHaptics';

type Goal = 'muscle_gain' | 'fat_loss' | 'maintain';
type ActivityLevel = 'low' | 'medium' | 'high';

export default function Onboarding() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // 5 Etapas:
  // 1: Identificação & Perfil Pessoal (Nome, Sexo com Direcionamento Automático, Data de Nascimento/Idade, Objetivo)
  // 2: Bioimpedância Domiciliar & Ponto de Partida (Peso, Altura, % Gordura, % Massa Magra, Cintura)
  // 3: Nível de Atividade Física (Leve, Moderado, Intenso)
  // 4: Apresentação Heroica do Treinador 3D (Marco Zero na Balança Inteligente)
  // 5: Metas Científicas Calculadas & Conclusão
  const [step, setStep] = useState(1);
  
  // Dados Pessoais & Biometria
  const [fullName, setFullName] = useState('');
  const [sex, setSex] = useState<BiologicalSex>('female');
  const [mascotId, setMascotId] = useState<MascotId>('gaia');
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState<Goal>('fat_loss');
  
  // Bioimpedância & Antropometria
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [waist, setWaist] = useState('');
  
  // Rotina & Carregamento
  const [activity, setActivity] = useState<ActivityLevel>('medium');
  const [loading, setLoading] = useState(false);
  
  const [calculatedTargets, setCalculatedTargets] = useState({
    calories: 2000,
    protein: 130,
    carbs: 220,
    fats: 60,
    saturatedFats: 16,
    fiber: 28,
    water: 2500,
    workouts: 4,
    isObesityAdjusted: false,
    effectiveWeightUsed: 70,
  });

  // Pré-carrega informações já salvas na sessão ou perfil
  useEffect(() => {
    async function loadInitialProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.user_metadata?.name) {
            setFullName(user.user_metadata.name);
          }
          if (user.user_metadata?.sex) {
            const s = user.user_metadata.sex === 'female' ? 'female' : 'male';
            setSex(s);
            setMascotId(s === 'female' ? 'gaia' : 'tita');
          }
          if (user.user_metadata?.birth_date) {
            setBirthDate(user.user_metadata.birth_date);
            const a = calculateAgeFromBirthDate(user.user_metadata.birth_date);
            if (a) setAge(String(a));
          }
        }

        const profile = await api.get('/api/profile/');
        if (profile) {
          if (profile.name && !fullName) setFullName(profile.name);
          if (profile.height_cm && !height) setHeight(String(profile.height_cm));
          if (profile.weight_kg && !weight) setWeight(String(profile.weight_kg));
          if (profile.age && !age) setAge(String(profile.age));
          if (profile.sex) {
            const s = profile.sex === 'female' ? 'female' : 'male';
            setSex(s);
            setMascotId(s === 'female' ? 'gaia' : 'tita');
          }
          if (profile.body_fat_pct) setBodyFat(String(profile.body_fat_pct));
          if (profile.muscle_mass_pct) setMuscleMass(String(profile.muscle_mass_pct));
          if (profile.waist_cm) setWaist(String(profile.waist_cm));
        }
      } catch (err) {
        console.log('Pré-carregamento de perfil finalizado');
      }
    }
    loadInitialProfile();
  }, []);

  // Formatação de Máscara DD/MM/AAAA para Data de Nascimento
  const formatBirthDate = (raw: string) => {
    const numbers = raw.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const calculateAgeFromBirthDate = (dateStr: string): number | null => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1920 || year > new Date().getFullYear()) return null;

    const birth = new Date(year, month - 1, day);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    return calculatedAge >= 10 && calculatedAge <= 115 ? calculatedAge : null;
  };

  const handleBirthDateChange = (val: string) => {
    const formatted = formatBirthDate(val);
    setBirthDate(formatted);
    const calculated = calculateAgeFromBirthDate(formatted);
    if (calculated) {
      setAge(String(calculated));
    }
  };

  // Seleção de Sexo Biológico com Direcionamento Automático de Mascote
  const handleSelectSex = (selectedSex: BiologicalSex) => {
    setSex(selectedSex);
    // Direcionamento Automático: Mulher -> Gaia | Homem -> Titã
    const targetMascot: MascotId = selectedSex === 'female' ? 'gaia' : 'tita';
    setMascotId(targetMascot);
    soundHaptics.triggerLightTap();
  };

  const parsedHeight = parseInt(height, 10) || 170;
  const parsedWeight = parseFloat(weight.replace(',', '.')) || 70;
  const parsedAge = parseInt(age, 10) || 28;
  const parsedBodyFat = bodyFat ? parseFloat(bodyFat.replace(',', '.')) : null;
  const parsedMuscleMass = muscleMass ? parseFloat(muscleMass.replace(',', '.')) : null;
  const parsedWaist = waist ? parseFloat(waist.replace(',', '.')) : null;

  // Avaliação 3D e Morfologia corporal reativa aos dados reais de bioimpedância
  const mascotEval = evaluateMascot({
    mascotId,
    sex,
    weightKg: parsedWeight,
    heightCm: parsedHeight,
    bodyFatPct: parsedBodyFat,
    muscleMassPct: parsedMuscleMass,
    waistCm: parsedWaist,
    goalType: goal,
  });

  const calculateTargets = () => {
    const h = parsedHeight;
    const w = parsedWeight;
    const a = parsedAge;
    
    // Motor científico completo alinhado a ABESO, SBAN, SBC e SBD
    const targets = calculateScientificTargets({
      weightKg: w,
      heightCm: h,
      age: a,
      sex,
      activityLevel: activity,
      goal,
    });
    
    setCalculatedTargets({
      calories: targets.calories,
      protein: targets.protein,
      carbs: targets.carbs,
      fats: targets.fats,
      saturatedFats: targets.saturatedFats,
      fiber: targets.fiber,
      water: targets.water,
      workouts: targets.workouts,
      isObesityAdjusted: targets.isObesityAdjusted,
      effectiveWeightUsed: targets.effectiveWeightUsed,
    });
    
    setStep(5);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const parsedAgeVal = parseInt(age, 10) || 28;
      const parsedHeightVal = parseInt(height, 10) || 170;
      const parsedWeightVal = parseFloat(weight.replace(',', '.')) || 70;
      const parsedFatVal = bodyFat ? parseFloat(bodyFat.replace(',', '.')) : null;
      const parsedMuscleVal = muscleMass ? parseFloat(muscleMass.replace(',', '.')) : null;
      const parsedWaistVal = waist ? parseFloat(waist.replace(',', '.')) : null;

      const today = new Date().toISOString().split('T')[0];

      // 1. Salvar dados biométricos completos no perfil com linha de base inicial (Marco Zero)
      await api.put('/api/profile/', {
        name: fullName.trim() || undefined,
        age: parsedAgeVal,
        birth_date: birthDate.trim() || undefined,
        height_cm: parsedHeightVal,
        weight_kg: parsedWeightVal,
        sex,
        waist_cm: parsedWaistVal,
        body_fat_pct: parsedFatVal,
        muscle_mass_pct: parsedMuscleVal,
        activity_level: activity,
        goal_type: goal,
        weekly_workouts_target: calculatedTargets.workouts,
        avatar_mascot_id: mascotId,
        initial_weight_kg: parsedWeightVal,
        initial_body_fat_pct: parsedFatVal,
        initial_muscle_mass_pct: parsedMuscleVal,
        initial_waist_cm: parsedWaistVal,
        initial_checkin_date: today,
      });
      
      // 2. Salvar metas diárias calculadas com teto SBC de saturadas
      await api.put('/api/profile/targets', {
        calories_target: calculatedTargets.calories,
        protein_target_g: calculatedTargets.protein,
        carbs_target_g: calculatedTargets.carbs,
        fats_target_g: calculatedTargets.fats,
        saturated_fats_target_g: calculatedTargets.saturatedFats,
        fiber_target_g: calculatedTargets.fiber,
        water_target_ml: calculatedTargets.water,
      });
      
      // 3. Registrar peso inicial no histórico de peso e checkin de bioimpedância
      try {
        await api.post('/api/weight/', {
          date: today,
          weight_kg: parsedWeightVal,
          body_fat_pct: parsedFatVal,
          muscle_mass_pct: parsedMuscleVal,
        });
      } catch {}

      try {
        await api.post('/api/checkin/log', {
          date: today,
          weight_kg: parsedWeightVal,
          body_fat_pct: parsedFatVal,
          muscle_mass_pct: parsedMuscleVal,
          waist_cm: parsedWaistVal,
        });
      } catch {}

      // 4. Marcar onboarding como concluído no banco e em cache
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await markOnboardingComplete(session.user.id);
      }
      
      showToast('Perfil configurado com sucesso! Bem-vindo à arena.', 'success');
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Erro ao salvar onboarding:', e);
      showToast(e.message || 'Falha ao salvar perfil. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const goals = [
    { id: 'fat_loss', title: 'Emagrecimento Sustentável', subtitle: 'Déficit calórico inteligente e preservação da massa muscular', icon: TrendingDown },
    { id: 'maintain', title: 'Manter Peso & Saúde', subtitle: 'Equilíbrio calórico, energia estável e hábitos consistentes', icon: Heart },
    { id: 'muscle_gain', title: 'Hipertrofia & Ganho Magro', subtitle: 'Superávit calórico controlado e alta densidade proteica', icon: Dumbbell },
  ];

  const activities = [
    { id: 'low', title: 'Leve / Inicial', desc: '1 a 2 dias por semana ou rotina diária mais sedentária' },
    { id: 'medium', title: 'Moderado Constante', desc: '3 a 5 dias por semana de treinos, musculação ou caminhadas frequentes' },
    { id: 'high', title: 'Intenso / Muito Ativo', desc: '6 a 7 dias por semana de musculação, corrida ou esportes de alta demanda' },
  ];

  const firstName = fullName.trim().split(' ')[0] || (sex === 'female' ? 'Atleta' : 'Guerreiro');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com indicador de progresso */}
      <View style={styles.header}>
        {step > 1 && (
          <TouchableOpacity 
            onPress={() => {
              soundHaptics.triggerLightTap();
              setStep(step - 1);
            }} 
            style={styles.backBtn} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft color="#ffffff" size={24} />
          </TouchableOpacity>
        )}
        <Text style={styles.stepText}>Etapa {step} de 5</Text>
        <View style={styles.progressDots}>
          {[1, 2, 3, 4, 5].map(s => (
            <View key={s} style={[styles.dot, s <= step && styles.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        
        {/* ======================================================== */}
        {/* ETAPA 1: Identificação, Sexo Biológico & Nascimento */}
        {/* ======================================================== */}
        {step === 1 && (
          <>
            <Text style={styles.title}>Vamos nos conhecer!</Text>
            <Text style={styles.subtitle}>
              Personalizaremos sua rota metabólica e direcionaremos seu parceiro 3D ideal.
            </Text>

            {/* Nome Completo */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <User color="#22c55e" size={16} />
                <Text style={styles.inputLabel}>Nome Completo</Text>
              </View>
              <TextInput
                style={styles.textInputFull}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Como deseja ser chamado(a)?"
                placeholderTextColor="#6b7280"
                autoCapitalize="words"
              />
            </View>

            {/* Sexo Biológico com Direcionamento Automático */}
            <View style={styles.inputGroup}>
              <Text style={styles.sectionTitle}>Sexo Biológico</Text>
              <Text style={styles.sectionHint}>
                Fundamental para a calibração da Taxa Metabólica Basal (BMR) e direcionamento automático do seu treinador(a).
              </Text>
              <View style={styles.sexRow}>
                <TouchableOpacity
                  style={[styles.sexButton, sex === 'female' && styles.sexButtonActive]}
                  onPress={() => handleSelectSex('female')}
                  activeOpacity={0.8}
                >
                  <Crown color={sex === 'female' ? '#f43f5e' : '#9ca3af'} size={18} />
                  <Text style={[styles.sexButtonText, sex === 'female' && styles.sexButtonTextActiveFemale]}>
                    Feminino (Mulher)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sexButton, sex === 'male' && styles.sexButtonActive]}
                  onPress={() => handleSelectSex('male')}
                  activeOpacity={0.8}
                >
                  <Dumbbell color={sex === 'male' ? '#38bdf8' : '#9ca3af'} size={18} />
                  <Text style={[styles.sexButtonText, sex === 'male' && styles.sexButtonTextActiveMale]}>
                    Masculino (Homem)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Card de Direcionamento Automático de Mascote */}
              {sex === 'female' ? (
                <View style={[styles.mascotAssignmentCard, { borderColor: '#f43f5e40', backgroundColor: '#f43f5e10' }]}>
                  <View style={[styles.mascotAssignmentBadge, { backgroundColor: '#f43f5e25' }]}>
                    <Crown color="#f43f5e" size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mascotAssignmentTitle, { color: '#fb7185' }]}>
                      ✨ Sua treinadora de elite será a Gaia 👑
                    </Text>
                    <Text style={styles.mascotAssignmentSub}>
                      Elegância, postura altiva e disciplina tática para esculpir sua forma campeã!
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.mascotAssignmentCard, { borderColor: '#38bdf840', backgroundColor: '#38bdf810' }]}>
                  <View style={[styles.mascotAssignmentBadge, { backgroundColor: '#38bdf825' }]}>
                    <Dumbbell color="#38bdf8" size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mascotAssignmentTitle, { color: '#38bdf8' }]}>
                      🥊 Seu treinador de elite será o Titã 🥊
                    </Text>
                    <Text style={styles.mascotAssignmentSub}>
                      Força bruta, foco inabalável e densidade muscular no ringue da balança!
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Data de Nascimento & Idade Reativa */}
            <View style={styles.inputGroup}>
              <View style={styles.statsRow}>
                <View style={{ flex: 1.4 }}>
                  <View style={styles.labelRow}>
                    <Calendar color="#22c55e" size={16} />
                    <Text style={styles.inputLabel}>Data de Nascimento</Text>
                  </View>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      style={styles.input}
                      value={birthDate}
                      onChangeText={handleBirthDateChange}
                      keyboardType="numeric"
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor="#6b7280"
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Idade</Text>
                  </View>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      style={styles.input}
                      value={age}
                      onChangeText={setAge}
                      keyboardType="numeric"
                      placeholder="28"
                      placeholderTextColor="#6b7280"
                      maxLength={3}
                    />
                    <Text style={styles.unitText}>anos</Text>
                  </View>
                </View>
              </View>

              {parseInt(age, 10) > 0 && (
                <View style={styles.autoAgeBadge}>
                  <Sparkles color="#22c55e" size={14} />
                  <Text style={styles.autoAgeText}>
                    {age} anos calculados para o metabolismo basal
                  </Text>
                </View>
              )}
            </View>

            {/* Objetivo Principal */}
            <Text style={styles.sectionTitle}>Qual é o seu objetivo principal?</Text>
            {goals.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalCard, goal === g.id && styles.goalCardActive]}
                onPress={() => {
                  soundHaptics.triggerLightTap();
                  setGoal(g.id as Goal);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.goalIcon, goal === g.id && styles.goalIconActive]}>
                  <g.icon color={goal === g.id ? '#0a1a15' : '#22c55e'} size={24} />
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalTitle}>{g.title}</Text>
                  <Text style={[styles.goalSubtitle, goal === g.id && styles.goalSubtitleActive]}>
                    {g.subtitle}
                  </Text>
                </View>
                <View style={[styles.radioOuter, goal === g.id && styles.radioOuterActive]}>
                  {goal === g.id && <Check color="#0a1a15" size={14} />}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ======================================================== */}
        {/* ETAPA 2: Bioimpedância Domiciliar & Ponto de Partida */}
        {/* ======================================================== */}
        {step === 2 && (
          <>
            <Text style={styles.title}>Bioimpedância & Ponto de Partida</Text>
            <Text style={styles.subtitle}>
              Estes dados calibram a física e as proporções musculares do seu avatar 3D na balança inteligente.
            </Text>

            {/* Medidas Obrigatórias: Altura e Peso */}
            <View style={styles.statsRow}>
              <View style={styles.statInput}>
                <View style={styles.labelRow}>
                  <Ruler color="#22c55e" size={16} />
                  <Text style={styles.inputLabel}>Altura (cm)</Text>
                </View>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.input}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    placeholder="170"
                    placeholderTextColor="#6b7280"
                    maxLength={3}
                  />
                  <Text style={styles.unitText}>cm</Text>
                </View>
              </View>

              <View style={styles.statInput}>
                <View style={styles.labelRow}>
                  <Scale color="#22c55e" size={16} />
                  <Text style={styles.inputLabel}>Peso Atual (kg)</Text>
                </View>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    placeholder="70.0"
                    placeholderTextColor="#6b7280"
                  />
                  <Text style={styles.unitText}>kg</Text>
                </View>
              </View>
            </View>

            {/* Seção de Bioimpedância Avançada (Opcional) */}
            <View style={styles.bioCard}>
              <View style={styles.bioHeader}>
                <Sparkles color="#38bdf8" size={18} />
                <Text style={styles.bioTitle}>Bioimpedância Domiciliar (Opcional)</Text>
              </View>
              <Text style={styles.bioDesc}>
                Se você possui balança de bioimpedância ou fita métrica, insira abaixo. O modelo 3D deformará o corpo com precisão cirúrgica!
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statInput}>
                  <View style={styles.labelRow}>
                    <Percent color="#38bdf8" size={14} />
                    <Text style={styles.bioInputLabel}>% Gordura (BF)</Text>
                  </View>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      style={styles.input}
                      value={bodyFat}
                      onChangeText={setBodyFat}
                      keyboardType="decimal-pad"
                      placeholder={sex === 'female' ? 'Ex: 24.0' : 'Ex: 18.0'}
                      placeholderTextColor="#6b7280"
                    />
                    <Text style={styles.unitText}>%</Text>
                  </View>
                </View>

                <View style={styles.statInput}>
                  <View style={styles.labelRow}>
                    <Dumbbell color="#38bdf8" size={14} />
                    <Text style={styles.bioInputLabel}>% Massa Muscular</Text>
                  </View>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      style={styles.input}
                      value={muscleMass}
                      onChangeText={setMuscleMass}
                      keyboardType="decimal-pad"
                      placeholder={sex === 'female' ? 'Ex: 32.0' : 'Ex: 40.0'}
                      placeholderTextColor="#6b7280"
                    />
                    <Text style={styles.unitText}>%</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statInput, { marginTop: 12 }]}>
                <View style={styles.labelRow}>
                  <Ruler color="#38bdf8" size={14} />
                  <Text style={styles.bioInputLabel}>Circunferência da Cintura (cm)</Text>
                </View>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.input}
                    value={waist}
                    onChangeText={setWaist}
                    keyboardType="decimal-pad"
                    placeholder="Ex: 82"
                    placeholderTextColor="#6b7280"
                  />
                  <Text style={styles.unitText}>cm</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <ShieldCheck color="#22c55e" size={16} />
              <Text style={styles.infoBoxText}>
                Não tem bioimpedância agora? Sem problemas! Estimamos sua composição com base no IMC e você poderá atualizar quando quiser na aba de Perfil.
              </Text>
            </View>
          </>
        )}

        {/* ======================================================== */}
        {/* ETAPA 3: Nível de Atividade Física */}
        {/* ======================================================== */}
        {step === 3 && (
          <>
            <Text style={styles.title}>Nível de Atividade Física</Text>
            <Text style={styles.subtitle}>Com qual frequência você costuma se exercitar durante a semana?</Text>

            {activities.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.activityCard, activity === a.id && styles.activityCardActive]}
                onPress={() => {
                  soundHaptics.triggerLightTap();
                  setActivity(a.id as ActivityLevel);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.activityTitle}>{a.title}</Text>
                  <Text style={styles.activityDesc}>{a.desc}</Text>
                </View>
                <View style={[styles.radioOuter, activity === a.id && styles.radioOuterActive]}>
                  {activity === a.id && <Check color="#0a1a15" size={14} />}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ======================================================== */}
        {/* ETAPA 4: Apresentação Heroica do Treinador 3D (Marco Zero) */}
        {/* ======================================================== */}
        {step === 4 && (
          <>
            <Text style={styles.title}>Seu Parceiro de Batalha</Text>
            <Text style={styles.subtitle}>
              Ele subiu na balança com você no Marco Zero da sua jornada e reflete sua composição corporal em tempo real!
            </Text>

            {/* Palco 3D do Marco Zero com Silhueta Deformada */}
            <View style={styles.onboardingAvatarStage}>
              <View style={styles.onboardingStageHeader}>
                <View style={[styles.onboardingStageBadge, { borderColor: mascotEval.badgeColor }]}>
                  <Text style={[styles.onboardingStageBadgeText, { color: mascotEval.badgeColor }]}>
                    MARCO ZERO • {mascotEval.badgeLabel.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.onboardingStageWeight}>{parsedWeight.toFixed(1)} kg na balança</Text>
              </View>

              <View style={styles.avatarHolder}>
                <LivingAvatar3D
                  mascotId={mascotId}
                  weightKg={parsedWeight}
                  heightCm={parsedHeight}
                  bodyFatPct={parsedBodyFat}
                  muscleMassPct={parsedMuscleMass}
                  morphology={mascotEval.morphology}
                  size={240}
                  hideBubble={false}
                  initialSpeech={
                    mascotId === 'gaia'
                      ? `Olá, ${firstName}! Nossos ${parsedWeight.toFixed(1)}kg estão na balança. Vamos juntas esculpir sua melhor versão!`
                      : `Bora pro ringue, ${firstName}! Nossos ${parsedWeight.toFixed(1)}kg estão na balança. Vamos secar e construir armadura!`
                  }
                />
              </View>

              {/* Métricas Registradas no Marco Zero */}
              <View style={styles.bioChipsRow}>
                {parsedBodyFat !== null && (
                  <View style={styles.bioChip}>
                    <Text style={styles.bioChipText}>{parsedBodyFat.toFixed(1)}% Gordura</Text>
                  </View>
                )}
                {parsedMuscleMass !== null && (
                  <View style={styles.bioChip}>
                    <Text style={styles.bioChipText}>{parsedMuscleMass.toFixed(1)}% Músculo</Text>
                  </View>
                )}
                {parsedWaist !== null && (
                  <View style={styles.bioChip}>
                    <Text style={styles.bioChipText}>{parsedWaist.toFixed(0)}cm Cintura</Text>
                  </View>
                )}
              </View>

              <Text style={styles.onboardingHintText}>
                💡 Arraste horizontalmente para inspecionar em 360° ou toque no parceiro para ouvi-lo!
              </Text>
            </View>

            {/* Alternador Opcional de Mascote */}
            <View style={styles.mascotSwitchContainer}>
              <Text style={styles.mascotSwitchTitle}>Prefere treinar com outro parceiro?</Text>
              <View style={styles.mascotSwitchRow}>
                <TouchableOpacity
                  style={[styles.mascotSwitchCard, mascotId === 'gaia' && styles.mascotSwitchCardActiveGaia]}
                  onPress={() => {
                    soundHaptics.triggerMediumTap();
                    setMascotId('gaia');
                  }}
                  activeOpacity={0.85}
                >
                  <Crown color="#f43f5e" size={20} />
                  <Text style={styles.mascotSwitchName}>Gaia 👑</Text>
                  <Text style={styles.mascotSwitchTag}>Elegância & Postura</Text>
                  <View style={[styles.radioOuter, mascotId === 'gaia' && styles.radioOuterActiveGaia, { marginTop: 6 }]}>
                    {mascotId === 'gaia' && <Check color="#ffffff" size={12} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mascotSwitchCard, mascotId === 'tita' && styles.mascotSwitchCardActiveTita]}
                  onPress={() => {
                    soundHaptics.triggerMediumTap();
                    setMascotId('tita');
                  }}
                  activeOpacity={0.85}
                >
                  <Dumbbell color="#38bdf8" size={20} />
                  <Text style={styles.mascotSwitchName}>Titã 🥊</Text>
                  <Text style={styles.mascotSwitchTag}>Força & Foco</Text>
                  <View style={[styles.radioOuter, mascotId === 'tita' && styles.radioOuterActiveTita, { marginTop: 6 }]}>
                    {mascotId === 'tita' && <Check color="#ffffff" size={12} />}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* ======================================================== */}
        {/* ETAPA 5: Metas Nutricionais Calculadas & Início */}
        {/* ======================================================== */}
        {step === 5 && (
          <>
            <View style={styles.congratsBadge}>
              <Sparkles color="#22c55e" size={20} />
              <Text style={styles.congratsText}>Plano Nutricional Personalizado</Text>
            </View>

            <Text style={styles.title}>Suas Metas Diárias</Text>
            <Text style={styles.subtitle}>
              Cálculo baseado nas Diretrizes Brasileiras de Nutrição e Cardiologia (ABESO, SBAN, SBC e SBD).
            </Text>

            <View style={styles.resultsCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Calorias Diárias</Text>
                <Text style={[styles.resultValue, { color: '#22c55e' }]}>
                  {calculatedTargets.calories.toLocaleString()} kcal
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Proteínas</Text>
                <Text style={styles.resultValue}>{calculatedTargets.protein}g</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Carboidratos</Text>
                <Text style={styles.resultValue}>{calculatedTargets.carbs}g</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Gorduras Totais</Text>
                <Text style={styles.resultValue}>{calculatedTargets.fats}g</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Gorduras Saturadas (Teto SBC)</Text>
                <Text style={[styles.resultValue, { color: '#f59e0b' }]}>≤ {calculatedTargets.saturatedFats}g</Text>
              </View>
              <View style={styles.resultRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Wheat color="#eab308" size={16} />
                  <Text style={styles.resultLabel}>Fibras (Saciedade)</Text>
                </View>
                <Text style={[styles.resultValue, { color: '#eab308' }]}>{calculatedTargets.fiber}g</Text>
              </View>
              <View style={styles.resultRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Droplets color="#38bdf8" size={16} />
                  <Text style={styles.resultLabel}>Hidratação (Água)</Text>
                </View>
                <Text style={[styles.resultValue, { color: '#38bdf8' }]}>
                  {(calculatedTargets.water / 1000).toFixed(1)} L
                </Text>
              </View>
              <View style={[styles.resultRow, { borderBottomWidth: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Dumbbell color="#a855f7" size={16} />
                  <Text style={styles.resultLabel}>Treinos por Semana</Text>
                </View>
                <Text style={[styles.resultValue, { color: '#a855f7' }]}>{calculatedTargets.workouts} sessões</Text>
              </View>
            </View>

            {calculatedTargets.isObesityAdjusted && (
              <View style={styles.obesityBadge}>
                <ShieldCheck color="#22c55e" size={16} />
                <Text style={styles.obesityBadgeText}>
                  Meta proteica calibrada pelo Peso Ajustado da ABESO ({calculatedTargets.effectiveWeightUsed} kg), prevenindo sobrecargas renais e desequilíbrios calóricos.
                </Text>
              </View>
            )}

            <Text style={styles.noteText}>
              Você poderá ajustar todas essas metas a qualquer momento na aba de Perfil.
            </Text>

            {/* Aviso Legal & Médico Obrigatório - CFM 2.314/2022 e CFN */}
            <View style={styles.medicalDisclaimerCard}>
              <View style={styles.medicalDisclaimerHeader}>
                <ShieldAlert color="#eab308" size={18} />
                <Text style={styles.medicalDisclaimerTitle}>Aviso Legal & Regulatório</Text>
              </View>
              <Text style={styles.medicalDisclaimerBody}>
                O aplicativo é uma ferramenta de suporte ao monitoramento de hábitos de estilo de vida e bem-estar. Não constitui diagnóstico médico nem prescrição dietética individualizada, atividade privativa de nutricionista (Lei Federal nº 8.234/1991 e Resolução CFM nº 2.314/2022). Consulte sempre um profissional de saúde antes de alterações severas na dieta.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Botões de Navegação Inferiores */}
      <View style={styles.bottomSection}>
        {step === 1 && (
          <TouchableOpacity 
            style={[styles.primaryButton, (!fullName.trim() || !age) && styles.buttonDisabled]}
            onPress={() => {
              soundHaptics.triggerLightTap();
              setStep(2);
            }}
            disabled={!fullName.trim() || !age}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Continuar para Bioimpedância</Text>
            <ArrowRight color="#0a1a15" size={20} />
          </TouchableOpacity>
        )}
        
        {step === 2 && (
          <TouchableOpacity 
            style={[styles.primaryButton, (!height || !weight) && styles.buttonDisabled]}
            onPress={() => {
              soundHaptics.triggerLightTap();
              setStep(3);
            }}
            disabled={!height || !weight}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Avançar para Atividade Física</Text>
            <ArrowRight color="#0a1a15" size={20} />
          </TouchableOpacity>
        )}

        {step === 3 && (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => {
              soundHaptics.triggerMediumTap();
              setStep(4);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Subir na Balança com seu Treinador</Text>
            <ArrowRight color="#0a1a15" size={20} />
          </TouchableOpacity>
        )}

        {step === 4 && (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => {
              soundHaptics.triggerMediumTap();
              calculateTargets();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Calcular Minhas Metas Científicas</Text>
            <ArrowRight color="#0a1a15" size={20} />
          </TouchableOpacity>
        )}
        
        {step === 5 && (
          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={() => {
              soundHaptics.triggerScaleLock();
              handleComplete();
            }}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#0a1a15" size="small" />
                <Text style={styles.primaryButtonText}>Configurando seu App...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Iniciar Minha Batalha</Text>
                <ArrowRight color="#0a1a15" size={20} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  stepText: { color: '#22c55e', fontWeight: '700', fontSize: 14 },
  progressDots: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#1f3d32' },
  dotActive: { backgroundColor: '#22c55e' },
  
  // Content
  content: { flex: 1, paddingHorizontal: 20 },
  title: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', marginTop: 10, marginBottom: 6 },
  subtitle: { color: '#9ca3af', fontSize: 14, marginBottom: 18, lineHeight: 20 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 4 },
  sectionHint: { color: '#9ca3af', fontSize: 12, marginBottom: 10, lineHeight: 16 },
  
  // Form Groups
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  inputLabel: { color: '#d1d5db', fontSize: 13, fontWeight: '600' },
  textInputFull: {
    backgroundColor: '#0f2920',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f3d32',
    color: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },

  // Sex Selector
  sexRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sexButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0f2920',
    borderWidth: 1.5,
    borderColor: '#1f3d32',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sexButtonActive: {
    borderColor: '#22c55e',
    backgroundColor: '#133527',
  },
  sexButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  sexButtonTextActiveFemale: {
    color: '#fb7185',
    fontWeight: 'bold',
  },
  sexButtonTextActiveMale: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },

  // Mascot Assignment Hero Card
  mascotAssignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 4,
  },
  mascotAssignmentBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotAssignmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  mascotAssignmentSub: {
    fontSize: 11,
    color: '#d1d5db',
    lineHeight: 15,
  },

  // Auto Age Badge
  autoAgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  autoAgeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },

  // Goal Cards
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#1f3d32',
    gap: 12,
  },
  goalCardActive: { borderColor: '#22c55e', backgroundColor: '#133527' },
  goalIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1f3d32', justifyContent: 'center', alignItems: 'center' },
  goalIconActive: { backgroundColor: '#22c55e' },
  goalInfo: { flex: 1 },
  goalTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  goalSubtitle: { color: '#9ca3af', marginTop: 2, fontSize: 12, lineHeight: 16 },
  goalSubtitleActive: { color: '#6ee7b7' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#1f3d32', justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  radioOuterActiveGaia: { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
  radioOuterActiveTita: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  
  // Stats Input
  statsRow: { flexDirection: 'row', gap: 12 },
  statInput: { flex: 1 },
  inputWithUnit: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f2920', borderRadius: 14, borderWidth: 1, borderColor: '#1f3d32' },
  input: { flex: 1, color: '#ffffff', paddingVertical: 14, paddingHorizontal: 14, fontSize: 16 },
  unitText: { color: '#9ca3af', paddingRight: 14, fontWeight: '600' },

  // Bioimpedance Box
  bioCard: {
    backgroundColor: '#0c221a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e4b39',
    marginTop: 18,
    marginBottom: 14,
  },
  bioHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bioTitle: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  bioDesc: { color: '#9ca3af', fontSize: 12, lineHeight: 16, marginBottom: 12 },
  bioInputLabel: { color: '#93c5fd', fontSize: 12, fontWeight: '600' },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  infoBoxText: { color: '#6ee7b7', fontSize: 12, lineHeight: 16, flex: 1 },

  // Activity Cards
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#1f3d32',
  },
  activityCardActive: { borderColor: '#22c55e', backgroundColor: '#133527' },
  activityTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  activityDesc: { color: '#9ca3af', marginTop: 3, fontSize: 12, lineHeight: 17 },

  // Onboarding 3D Stage
  onboardingAvatarStage: {
    backgroundColor: '#0d1f18',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f3d32',
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  onboardingStageHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  onboardingStageBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#111827',
  },
  onboardingStageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onboardingStageWeight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22c55e',
  },
  avatarHolder: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  bioChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  bioChip: {
    backgroundColor: '#133527',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e40',
  },
  bioChipText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '600',
  },
  onboardingHintText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Mascot Switcher
  mascotSwitchContainer: {
    marginTop: 6,
    marginBottom: 10,
  },
  mascotSwitchTitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  mascotSwitchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mascotSwitchCard: {
    flex: 1,
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#1f3d32',
    alignItems: 'center',
  },
  mascotSwitchCardActiveGaia: {
    borderColor: '#f43f5e',
    backgroundColor: '#201015',
  },
  mascotSwitchCardActiveTita: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c1a24',
  },
  mascotSwitchName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  mascotSwitchTag: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  // Congratulations & Results
  congratsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  congratsText: { color: '#22c55e', fontSize: 13, fontWeight: 'bold' },
  resultsCard: { backgroundColor: '#0f2920', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1f3d32' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#173b2d' },
  resultLabel: { color: '#d1d5db', fontSize: 14 },
  resultValue: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  obesityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  obesityBadgeText: { color: '#6ee7b7', fontSize: 12, lineHeight: 16, flex: 1 },
  noteText: { color: '#9ca3af', textAlign: 'center', marginTop: 12, fontSize: 12 },

  // Medical Disclaimer
  medicalDisclaimerCard: {
    marginTop: 18,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
  },
  medicalDisclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  medicalDisclaimerTitle: { color: '#facc15', fontSize: 12, fontWeight: 'bold' },
  medicalDisclaimerBody: { color: '#d1d5db', fontSize: 11, lineHeight: 17 },

  // Bottom Buttons
  bottomSection: { padding: 18, borderTopWidth: 1, borderTopColor: '#0f2920', backgroundColor: '#0a1a15' },
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#0a1a15', fontSize: 16, fontWeight: 'bold' },
});
