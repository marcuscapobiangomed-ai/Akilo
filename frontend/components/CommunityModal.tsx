import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Share,
} from 'react-native';
import { 
  Trophy, 
  X, 
  Users, 
  Plus, 
  Key, 
  ShieldCheck, 
  Flame, 
  Droplets, 
  Dumbbell, 
  Utensils, 
  Share2,
  Scale
} from 'lucide-react-native';
import { api } from '../core/api';
import { useToast } from './Toast';

interface LeaderboardItem {
  user_id: string;
  user_name: string;
  food_logged_days: number;
  exercise_days: number;
  water_goal_days: number;
  checkin_done_this_week?: number;
  latest_checkin_date?: string;
  total_habit_points: number;
}

interface GroupItem {
  id: string;
  name: string;
  description?: string;
  invite_code: string;
  role: string;
}

export function CommunityModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'groups'>('leaderboard');
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Modais de Criação e Entrada
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsRes, leadRes] = await Promise.all([
        api.get('/api/groups/my'),
        api.get('/api/groups/leaderboard', selectedGroupId ? { group_id: selectedGroupId } : undefined),
      ]);
      setGroups(groupsRes || []);
      setLeaderboard(leadRes || []);
    } catch (e) {
      console.error('Erro ao carregar ranking e grupos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, selectedGroupId]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showToast('Digite o nome do grupo', 'error');
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await api.post('/api/groups/create', {
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
      });
      showToast(`Grupo "${res.name}" criado! Código: ${res.invite_code}`, 'success');
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateGroup(false);
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Falha ao criar grupo', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCodeInput.trim()) {
      showToast('Informe o código de convite', 'error');
      return;
    }
    setJoiningGroup(true);
    try {
      const res = await api.post('/api/groups/join', {
        invite_code: inviteCodeInput.trim(),
      });
      showToast(`Você entrou no grupo "${res.group.name}"!`, 'success');
      setInviteCodeInput('');
      setShowJoinGroup(false);
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Falha ao entrar no grupo', 'error');
    } finally {
      setJoiningGroup(false);
    }
  };

  const handleShareInvite = async (group: GroupItem) => {
    try {
      await Share.share({
        message: `Participe do meu grupo "${group.name}" no aplicativo! Use o código de convite: ${group.invite_code}`,
      });
    } catch (e) {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />

          {/* Cabeçalho */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Trophy color="#eab308" size={24} />
              <View>
                <Text style={styles.modalTitle}>Ranking & Grupos</Text>
                <Text style={styles.modalSubtitle}>Consistência semanal de hábitos</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#9ca3af" size={22} />
            </TouchableOpacity>
          </View>

          {/* Abas */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'leaderboard' && styles.tabBtnActive]}
              onPress={() => setActiveTab('leaderboard')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'leaderboard' && styles.tabBtnTextActive]}>
                Ranking da Semana
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'groups' && styles.tabBtnActive]}
              onPress={() => setActiveTab('groups')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'groups' && styles.tabBtnTextActive]}>
                Meus Grupos ({groups.length})
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#22c55e" size="large" />
              <Text style={styles.loadingText}>Carregando pontuações...</Text>
            </View>
          ) : activeTab === 'leaderboard' ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Filtro de Grupos */}
              {groups.length > 0 && (
                <View style={styles.filterScrollWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setSelectedGroupId(null)}
                      style={[styles.groupChip, selectedGroupId === null && styles.groupChipActive]}
                    >
                      <Text style={[styles.groupChipText, selectedGroupId === null && styles.groupChipTextActive]}>
                        Geral
                      </Text>
                    </TouchableOpacity>

                    {groups.map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => setSelectedGroupId(g.id)}
                        style={[styles.groupChip, selectedGroupId === g.id && styles.groupChipActive]}
                      >
                        <Text style={[styles.groupChipText, selectedGroupId === g.id && styles.groupChipTextActive]}>
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Banner de Ética e Anti-Fraude */}
              <View style={styles.ethicsBanner}>
                <ShieldCheck color="#22c55e" size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ethicsTitle}>Pontuação Baseada em Hábitos</Text>
                  <Text style={styles.ethicsDesc}>
                    Zero bônus para restrições ou perda de peso. Pontue com refeições (+10), água (+5), treino (+10) e Check-in oficial de bioimpedância da semana (+15 pts).
                  </Text>
                </View>
              </View>

              {/* Lista do Ranking */}
              {leaderboard.length > 0 ? (
                leaderboard.map((item, index) => {
                  const isFirst = index === 0;
                  const isSecond = index === 1;
                  const isThird = index === 2;
                  const medalEmoji = isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `${index + 1}º`;

                  return (
                    <View
                      key={item.user_id}
                      style={[
                        styles.leaderboardCard,
                        isFirst && styles.leaderboardFirst,
                      ]}
                    >
                      <View style={styles.positionBadge}>
                        <Text style={styles.positionText}>{medalEmoji}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.userNameText} numberOfLines={1}>
                          {item.user_name || 'Usuário'}
                        </Text>
                        <View style={styles.habitDetailsRow}>
                          <View style={styles.habitBadge}>
                            <Utensils color="#22c55e" size={12} />
                            <Text style={styles.habitBadgeText}>{item.food_logged_days}d</Text>
                          </View>
                          <View style={styles.habitBadge}>
                            <Dumbbell color="#38bdf8" size={12} />
                            <Text style={styles.habitBadgeText}>{item.exercise_days}d</Text>
                          </View>
                          <View style={styles.habitBadge}>
                            <Droplets color="#0ea5e9" size={12} />
                            <Text style={styles.habitBadgeText}>{item.water_goal_days}d</Text>
                          </View>
                          {Boolean(item.checkin_done_this_week && item.checkin_done_this_week > 0) && (
                            <View style={[styles.habitBadge, { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: 'rgba(234, 179, 8, 0.4)' }]}>
                              <Scale color="#eab308" size={12} />
                              <Text style={[styles.habitBadgeText, { color: '#eab308', fontWeight: 'bold' }]}>Check-in +15</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.pointsBadge}>
                        <Text style={styles.pointsValue}>{item.total_habit_points}</Text>
                        <Text style={styles.pointsLabel}>PTS</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Users color="#6b7280" size={36} />
                  <Text style={styles.emptyText}>Nenhum registro de hábitos na semana ainda</Text>
                  <Text style={styles.emptySubtext}>
                    Comece registrando suas refeições, água ou treinos para pontuar no ranking!
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Botões de Ação para Grupos */}
              <View style={styles.groupActionsRow}>
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => setShowCreateGroup(true)}
                >
                  <Plus color="#0a1a15" size={18} />
                  <Text style={styles.actionBtnPrimaryText}>Criar Grupo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnSecondary}
                  onPress={() => setShowJoinGroup(true)}
                >
                  <Key color="#22c55e" size={18} />
                  <Text style={styles.actionBtnSecondaryText}>Entrar com Código</Text>
                </TouchableOpacity>
              </View>

              {/* Lista dos Meus Grupos */}
              {groups.length > 0 ? (
                groups.map((group) => (
                  <View key={group.id} style={styles.groupCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupCardTitle}>{group.name}</Text>
                      {group.description ? (
                        <Text style={styles.groupCardDesc}>{group.description}</Text>
                      ) : null}
                      <View style={styles.inviteCodeBadge}>
                        <Text style={styles.inviteCodeText}>Código: {group.invite_code}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => handleShareInvite(group)}
                    >
                      <Share2 color="#22c55e" size={18} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Users color="#6b7280" size={36} />
                  <Text style={styles.emptyText}>Você ainda não está em nenhum grupo</Text>
                  <Text style={styles.emptySubtext}>
                    Crie um grupo com seus amigos ou use um código de convite para competir e se motivar!
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Modal para Criar Grupo */}
          <Modal visible={showCreateGroup} animationType="fade" transparent>
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalContent}>
                <Text style={styles.subModalTitle}>Criar Novo Grupo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do grupo (ex: Time da Saúde)"
                  placeholderTextColor="#6b7280"
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                />
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder="Descrição (opcional)"
                  placeholderTextColor="#6b7280"
                  value={newGroupDesc}
                  onChangeText={setNewGroupDesc}
                />

                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { marginTop: 16 }]}
                  onPress={handleCreateGroup}
                  disabled={creatingGroup}
                >
                  <Text style={styles.actionBtnPrimaryText}>
                    {creatingGroup ? 'Criando...' : 'Confirmar e Gerar Código'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowCreateGroup(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal para Entrar em Grupo */}
          <Modal visible={showJoinGroup} animationType="fade" transparent>
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalContent}>
                <Text style={styles.subModalTitle}>Entrar em um Grupo</Text>
                <Text style={styles.subModalSubtitle}>
                  Digite o código de convite de 6 caracteres compartilhado pelo seu amigo:
                </Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 }]}
                  placeholder="ex: AK7X9B"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="characters"
                  value={inviteCodeInput}
                  onChangeText={setInviteCodeInput}
                />

                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { marginTop: 16 }]}
                  onPress={handleJoinGroup}
                  disabled={joiningGroup}
                >
                  <Text style={styles.actionBtnPrimaryText}>
                    {joiningGroup ? 'Entrando...' : 'Entrar no Grupo'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowJoinGroup(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0f2920',
    padding: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1f3d32',
    height: '90%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#1f3d32', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  modalSubtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 6 },

  // Abas
  tabsRow: { flexDirection: 'row', backgroundColor: '#153528', borderRadius: 14, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#22c55e' },
  tabBtnText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  tabBtnTextActive: { color: '#0a1a15', fontWeight: '700' },

  loadingBox: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loadingText: { color: '#9ca3af', fontSize: 14 },

  filterScrollWrapper: { marginBottom: 14 },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#153528',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  groupChipActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  groupChipText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  groupChipTextActive: { color: '#0a1a15', fontWeight: '700' },

  // Ética
  ethicsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    marginBottom: 16,
  },
  ethicsTitle: { color: '#22c55e', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  ethicsDesc: { color: '#d1fae5', fontSize: 11, lineHeight: 16 },

  // Leaderboard
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#153528',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  leaderboardFirst: {
    borderColor: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
  },
  positionBadge: { width: 34, alignItems: 'center' },
  positionText: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  userNameText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  habitDetailsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  habitBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  habitBadgeText: { color: '#9ca3af', fontSize: 11 },
  pointsBadge: { alignItems: 'flex-end', minWidth: 60 },
  pointsValue: { color: '#22c55e', fontSize: 18, fontWeight: 'bold' },
  pointsLabel: { color: '#6b7280', fontSize: 10, fontWeight: '700' },

  // Ações de Grupos
  groupActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  actionBtnPrimaryText: { color: '#0a1a15', fontWeight: 'bold', fontSize: 14 },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#153528',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#22c55e',
    gap: 6,
  },
  actionBtnSecondaryText: { color: '#22c55e', fontWeight: 'bold', fontSize: 13 },

  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#153528',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  groupCardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  groupCardDesc: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  inviteCodeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  inviteCodeText: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  shareBtn: { padding: 10, backgroundColor: '#0f2920', borderRadius: 12, borderWidth: 1, borderColor: '#1f3d32' },

  emptyState: { paddingVertical: 40, alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptySubtext: { color: '#6b7280', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 },

  // Submodais
  subModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  subModalContent: { backgroundColor: '#0f2920', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#1f3d32' },
  subModalTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subModalSubtitle: { color: '#9ca3af', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  input: {
    backgroundColor: '#153528',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },
});
