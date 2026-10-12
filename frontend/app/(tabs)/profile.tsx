import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
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
  Info 
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../components/Toast';
import { ProfileSkeleton } from '../../components/SkeletonLoader';
import { dataEvents } from '../../core/dataEvents';

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

  // Modal de Edição de Perfil
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editProfile, setEditProfile] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    activity: '',
    goal: '',
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
          age: String(res.age || ''),
          height: String(res.height_cm || ''),
          weight: String(res.weight_kg || ''),
          activity: res.activity_level || 'medium',
          goal: res.goal_type || 'maintain',
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
    return () => {
      unsub1(); unsub2();
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
        calories_target: parseInt(editTargets.calories) || 2000,
        protein_g_target: parseInt(editTargets.protein) || 140,
        carbs_g_target: parseInt(editTargets.carbs) || 250,
        fats_g_target: parseInt(editTargets.fats) || 60,
        fiber_g_target: parseInt(editTargets.fiber) || 28,
        water_target_ml: parseInt(editTargets.water) || 2500,
        weekly_workouts_target: parseInt(editTargets.weeklyWorkouts) || 4,
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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/api/profile/', {
        name: editProfile.name || null,
        age: parseInt(editProfile.age) || null,
        height_cm: parseInt(editProfile.height) || null,
        weight_kg: parseFloat(editProfile.weight) || null,
        activity_level: editProfile.activity,
        goal_type: editProfile.goal,
      });
      showToast('Perfil atualizado com sucesso!', 'success');
      setEditProfileModalVisible(false);
      fetchProfile();
    } catch (e) {
      console.error('Erro ao salvar perfil:', e);
      showToast('Falha ao atualizar perfil', 'error');
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
    muscle_gain: 'Ganho de Massa',
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

  const userCaloriesTarget = targets?.calories_target || 2000;
  const userProteinTarget = targets?.protein_g_target || targets?.protein_target_g || 140;
  const userCarbsTarget = targets?.carbs_g_target || targets?.carbs_target_g || 250;
  const userFatsTarget = targets?.fats_g_target || targets?.fats_target_g || 60;
  const userFiberTarget = targets?.fiber_g_target || targets?.fiber_target_g || 28;
  const userWaterTarget = targets?.water_target_ml || 2500;
  const userWorkoutsTarget = targets?.weekly_workouts_target || 4;

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
            <User color="#22c55e" size={30} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'Seu Nome'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || 'email@exemplo.com'}</Text>
          </View>
          <View style={styles.editBtn}>
            <Edit3 color="#22c55e" size={18} />
          </View>
        </TouchableOpacity>

        {/* Linha de Biometria Básica */}
        <TouchableOpacity
          style={styles.statsRow}
          onPress={() => setEditProfileModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile?.age || '--'}</Text>
            <Text style={styles.statLabel}>Idade (anos)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile?.height_cm || '--'}</Text>
            <Text style={styles.statLabel}>Altura (cm)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile?.weight_kg || '--'}</Text>
            <Text style={styles.statLabel}>Peso (kg)</Text>
          </View>
        </TouchableOpacity>

        {/* Badges de Atividade e Objetivo */}
        <View style={styles.badgesRow}>
          <TouchableOpacity
            style={styles.badge}
            onPress={() => setEditProfileModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeLabel}>Nível de Atividade</Text>
            <Text style={styles.badgeValue}>{activityLabels[profile?.activity_level] || 'Não definido'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.badge}
            onPress={() => setEditProfileModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeLabel}>Objetivo Atual</Text>
            <Text style={styles.badgeValue}>{goalLabels[profile?.goal_type] || 'Não definido'}</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Metas Diárias e Semanais */}
        <View style={styles.sectionHeader}>
          <Target color="#22c55e" size={20} />
          <Text style={styles.sectionTitle}>Metas Nutricionais & Hábitos</Text>
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

        {/* Aviso Legal & Médico Obrigatório (Apple Guideline 1.4.1) */}
        <View style={styles.disclaimerBox}>
          <View style={styles.disclaimerHeader}>
            <Info color="#9ca3af" size={18} />
            <Text style={styles.disclaimerTitle}>Aviso Médico & Legal</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Este aplicativo é uma ferramenta de apoio ao monitoramento de hábitos de estilo de vida e não substitui o aconselhamento, diagnóstico ou tratamento médico ou nutricional individualizado. Consulte sempre um médico ou nutricionista antes de iniciar mudanças severas na dieta ou rotina de treinos.
          </Text>
        </View>

        {/* Encerrar Sessão */}
        <TouchableOpacity
          style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          <LogOut color="#9ca3af" size={18} />
          <Text style={styles.signOutText}>{signingOut ? 'Saindo...' : 'Encerrar Sessão'}</Text>
        </TouchableOpacity>

        {/* Exclusão Definitiva de Conta (Apple Guideline 5.1.1(v) & LGPD) */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setDeleteModalVisible(true)}
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
              >
                <Text style={styles.saveButtonText}>
                  {savingTargets ? 'Salvando...' : 'Salvar Metas'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE EDIÇÃO DE PERFIL BIOMÉTRICO */}
      <Modal visible={editProfileModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Dados Pessoais</Text>
              <TouchableOpacity onPress={() => setEditProfileModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Idade (anos)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.age}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, age: v }))}
                    keyboardType="numeric"
                    placeholder="ex: 28"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Peso (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={editProfile.weight}
                    onChangeText={(v) => setEditProfile((prev) => ({ ...prev, weight: v }))}
                    keyboardType="decimal-pad"
                    placeholder="ex: 75.5"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Altura (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.height}
                  onChangeText={(v) => setEditProfile((prev) => ({ ...prev, height: v }))}
                  keyboardType="numeric"
                  placeholder="ex: 175"
                  placeholderTextColor="#6b7280"
                />
              </View>

              <Text style={styles.sectionLabel}>Nível de Atividade Física</Text>
              <View style={styles.optionRow}>
                {activities.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.optionBtn, editProfile.activity === a.id && styles.optionBtnActive]}
                    onPress={() => setEditProfile((prev) => ({ ...prev, activity: a.id }))}
                  >
                    <Text style={[styles.optionText, editProfile.activity === a.id && styles.optionTextActive]}>
                      {a.label}
                    </Text>
                    {editProfile.activity === a.id && <Check color="#0a1a15" size={14} />}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Objetivo Principal</Text>
              <View style={styles.optionRow}>
                {goals.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.optionBtn, editProfile.goal === g.id && styles.optionBtnActive]}
                    onPress={() => setEditProfile((prev) => ({ ...prev, goal: g.id }))}
                  >
                    <Text style={[styles.optionText, editProfile.goal === g.id && styles.optionTextActive]}>
                      {g.label}
                    </Text>
                    {editProfile.goal === g.id && <Check color="#0a1a15" size={14} />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, savingProfile && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                <Text style={styles.saveButtonText}>
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE EXCLUSÃO DEFINITIVA DE CONTA (Apple Guideline 5.1.1(v) & LGPD) */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: '#ef4444' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.deleteHeaderRow}>
              <ShieldAlert color="#ef4444" size={26} />
              <Text style={styles.deleteModalTitle}>Excluir Conta e Dados</Text>
            </View>

            <Text style={styles.deleteWarningText}>
              Esta ação é <Text style={{ fontWeight: 'bold', color: '#ef4444' }}>definitiva e irreversível</Text>. Todos os seus registros de refeições, treinos, pesagens, água, metas e dados pessoais serão excluídos imediatamente do banco de dados.
            </Text>

            <Text style={styles.deleteConfirmLabel}>
              Para confirmar, digite <Text style={{ fontWeight: 'bold', color: '#ffffff' }}>EXCLUIR</Text> abaixo:
            </Text>

            <TextInput
              style={[styles.input, { borderColor: '#ef4444', textAlign: 'center', fontWeight: 'bold', letterSpacing: 2 }]}
              value={deleteConfirmationInput}
              onChangeText={setDeleteConfirmationInput}
              autoCapitalize="characters"
              placeholder="EXCLUIR"
              placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
              style={[
                styles.deleteConfirmButton,
                (deleteConfirmationInput.trim().toUpperCase() !== 'EXCLUIR' || deletingAccount) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleDeleteAccount}
              disabled={deleteConfirmationInput.trim().toUpperCase() !== 'EXCLUIR' || deletingAccount}
            >
              <Text style={styles.deleteConfirmButtonText}>
                {deletingAccount ? 'Excluindo todos os dados...' : 'Confirmar Exclusão Definitiva'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setDeleteConfirmationInput('');
                setDeleteModalVisible(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },
  content: { padding: 20, paddingBottom: 110 },

  // Cabeçalho
  headerTitle: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', marginBottom: 20 },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2920',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f3d32',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  profileEmail: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  editBtn: { padding: 8 },

  // Biometria
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#1f3d32' },

  // Badges
  badgesRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  badge: {
    flex: 1,
    backgroundColor: '#0f2920',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  badgeLabel: { color: '#9ca3af', fontSize: 12 },
  badgeValue: { color: '#22c55e', fontSize: 14, fontWeight: '700', marginTop: 4 },

  // Seção de Metas
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  sectionTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700', flex: 1 },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  editLinkText: { color: '#22c55e', fontWeight: '600', fontSize: 14 },

  targetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  targetCard: {
    width: '48%',
    backgroundColor: '#0f2920',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  targetValue: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  targetLabel: { color: '#9ca3af', fontSize: 12, marginTop: 4 },

  // Disclaimer
  disclaimerBox: {
    backgroundColor: '#0c221a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  disclaimerTitle: { color: '#d1d5db', fontSize: 13, fontWeight: '700' },
  disclaimerText: { color: '#9ca3af', fontSize: 12, lineHeight: 17 },

  // Ações de Conta
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#0f2920',
    borderWidth: 1,
    borderColor: '#1f3d32',
    gap: 8,
    marginBottom: 12,
  },
  signOutText: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },

  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 8,
    marginBottom: 24,
  },
  deleteAccountText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  buttonDisabled: { opacity: 0.5 },

  // Modal Base
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0f2920',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1f3d32',
    maxHeight: '88%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#1f3d32', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#ffffff', fontSize: 19, fontWeight: 'bold' },

  inputGroup: { marginBottom: 14 },
  inputLabel: { color: '#9ca3af', marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: '#153528',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  saveButtonText: { color: '#0a1a15', fontWeight: 'bold', fontSize: 16 },

  rowInputs: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  halfInput: { flex: 1 },

  sectionLabel: { color: '#ffffff', fontSize: 15, fontWeight: '600', marginBottom: 10, marginTop: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f3d32',
    backgroundColor: '#153528',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionBtnActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  optionText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  optionTextActive: { color: '#0a1a15', fontWeight: '700' },

  // Delete Modal
  deleteHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  deleteModalTitle: { color: '#ef4444', fontSize: 19, fontWeight: 'bold' },
  deleteWarningText: { color: '#d1d5db', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  deleteConfirmLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 10 },
  deleteConfirmButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  deleteConfirmButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  cancelButton: { paddingVertical: 14, alignItems: 'center' },
  cancelButtonText: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },
});
