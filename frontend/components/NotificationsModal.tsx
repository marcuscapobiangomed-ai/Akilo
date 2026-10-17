import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Bell,
  X,
  Scale,
  Flame,
  Droplets,
  Trophy,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react-native';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  checkinStatus?: any;
  mascotEval: any;
  onOpenCheckin: () => void;
  onSkipCheckin: () => void;
  skippingCheckin: boolean;
  waterCurrent: number;
  waterTarget: number;
  onQuickAddWater: (amount: number) => void;
  caloriesRemaining: number;
  caloriesConsumed: number;
  caloriesTarget: number;
  streak: number;
  onOpenCommunity: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  checkinStatus,
  mascotEval,
  onOpenCheckin,
  onSkipCheckin,
  skippingCheckin,
  waterCurrent,
  waterTarget,
  onQuickAddWater,
  caloriesRemaining,
  caloriesConsumed,
  caloriesTarget,
  streak,
  onOpenCommunity,
}) => {
  const isCheckinDue = !!checkinStatus?.isDue;
  const isWaterLow = waterCurrent < waterTarget * 0.5;
  const isCaloriesZero = caloriesConsumed === 0;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bellIconBox}>
                <Bell color="#22c55e" size={20} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Central de Notificações</Text>
                <Text style={styles.modalSubtitle}>
                  Lembretes e avisos da sua evolução
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X color="#9ca3af" size={20} />
            </TouchableOpacity>
          </View>

          {/* Lista de Notificações */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {/* 1. NOTIFICAÇÃO: CHECK-IN OFICIAL (+15 PTS) */}
            {isCheckinDue ? (
              <View style={[styles.notifCard, styles.notifCardHighlight]}>
                <View style={styles.notifCardHeader}>
                  <View style={styles.notifIconCircle}>
                    <Scale color="#22c55e" size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.notifBadgeRow}>
                      <Text style={styles.notifSource}>
                        {mascotEval?.mascotName || 'Titã'} • Check-in
                      </Text>
                      <View style={styles.pointsBadge}>
                        <Sparkles color="#eab308" size={11} />
                        <Text style={styles.pointsText}>+15 pts</Text>
                      </View>
                    </View>
                    <Text style={styles.notifItemTitle}>
                      Hora do seu Check-in Periódico!
                    </Text>
                  </View>
                </View>

                <Text style={styles.notifDescription}>
                  "{mascotEval?.flavorQuote || 'Vamos atualizar suas medidas para avaliar sua composição corporal e evolução!'}"
                </Text>

                <View style={styles.checkinBtnRow}>
                  <TouchableOpacity
                    style={styles.checkinActionBtn}
                    onPress={() => {
                      onClose();
                      onOpenCheckin();
                    }}
                    activeOpacity={0.8}
                  >
                    <Scale color="#0a1a15" size={15} />
                    <Text style={styles.checkinActionBtnText}>
                      Atualizar Medidas Agora
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.checkinSkipBtn}
                    onPress={onSkipCheckin}
                    disabled={skippingCheckin}
                    activeOpacity={0.8}
                  >
                    <Clock color="#9ca3af" size={14} />
                    <Text style={styles.checkinSkipBtnText}>
                      {skippingCheckin ? 'Adiado...' : 'Pular (3 dias)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* 2. NOTIFICAÇÃO: ALERTA DE NUTRIÇÃO & CALORIAS */}
            <View style={styles.notifCard}>
              <View style={styles.notifCardHeader}>
                <View style={[styles.notifIconCircle, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                  <Flame color="#f97316" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifBadgeRow}>
                    <Text style={[styles.notifSource, { color: '#f97316' }]}>
                      Dieta & Metas
                    </Text>
                    <Text style={styles.notifTimeTag}>Hoje</Text>
                  </View>
                  <Text style={styles.notifItemTitle}>
                    {isCaloriesZero
                      ? 'Nenhuma refeição registrada ainda'
                      : caloriesRemaining > 0
                      ? `${caloriesRemaining.toLocaleString('pt-BR')} kcal restantes`
                      : 'Meta diária concluída!'}
                  </Text>
                </View>
              </View>

              <Text style={styles.notifDescription}>
                {isCaloriesZero
                  ? 'Não fique em jejum sem planejar! Registre seu café, almoço ou lanches para manter seu gasto energético ativo.'
                  : caloriesRemaining > 0
                  ? `Você já consumiu ${caloriesConsumed.toLocaleString('pt-BR')} de ${caloriesTarget.toLocaleString('pt-BR')} kcal hoje. Mantenha o foco até o final do dia!`
                  : 'Excelente consistência! Você atingiu sua meta diária de calorias sem exageros.'}
              </Text>
            </View>

            {/* 3. NOTIFICAÇÃO: HIDRATAÇÃO */}
            <View style={styles.notifCard}>
              <View style={styles.notifCardHeader}>
                <View style={[styles.notifIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <Droplets color="#06b6d4" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifBadgeRow}>
                    <Text style={[styles.notifSource, { color: '#06b6d4' }]}>
                      Hidratação
                    </Text>
                    <Text style={styles.notifTimeTag}>
                      {waterCurrent} / {waterTarget} ml
                    </Text>
                  </View>
                  <Text style={styles.notifItemTitle}>
                    {isWaterLow ? 'Mantenha-se hidratado!' : 'Hidratação em ótimo nível!'}
                  </Text>
                </View>
              </View>

              <Text style={styles.notifDescription}>
                A água acelera seu metabolismo basal, otimiza o transporte de nutrientes e reduz a retenção de líquidos.
              </Text>

              <TouchableOpacity
                style={styles.waterQuickBtn}
                onPress={() => onQuickAddWater(250)}
                activeOpacity={0.8}
              >
                <Plus color="#06b6d4" size={14} />
                <Text style={styles.waterQuickBtnText}>+250 ml de Água Rápido</Text>
              </TouchableOpacity>
            </View>

            {/* 4. NOTIFICAÇÃO: STREAK & COMUNIDADE */}
            <View style={styles.notifCard}>
              <View style={styles.notifCardHeader}>
                <View style={[styles.notifIconCircle, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                  <Trophy color="#eab308" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifBadgeRow}>
                    <Text style={[styles.notifSource, { color: '#eab308' }]}>
                      Comunidade & Ranking
                    </Text>
                    <Text style={styles.notifTimeTag}>Sequência: {streak}d</Text>
                  </View>
                  <Text style={styles.notifItemTitle}>
                    {streak > 0
                      ? `Fogo aceso! Sequência de ${streak} dias`
                      : 'Inicie sua sequência de hábitos hoje!'}
                  </Text>
                </View>
              </View>

              <Text style={styles.notifDescription}>
                Registrar seus treinos, check-ins e refeições gera pontos para o ranking do seu grupo no aplicativo.
              </Text>

              <TouchableOpacity
                style={styles.communityLinkBtn}
                onPress={() => {
                  onClose();
                  onOpenCommunity();
                }}
                activeOpacity={0.8}
              >
                <Trophy color="#eab308" size={14} />
                <Text style={styles.communityLinkBtnText}>Ver Ranking do Meu Grupo</Text>
              </TouchableOpacity>
            </View>

            {/* Rodapé Informativo */}
            <View style={styles.emptyFooter}>
              <CheckCircle2 color="#22c55e" size={14} />
              <Text style={styles.emptyFooterText}>
                Central de notificações atualizada em tempo real
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    height: '88%',
    alignSelf: 'center',
    backgroundColor: '#0f2920',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#1f3d32',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.15)',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    paddingBottom: 8,
    gap: 12,
  },
  notifCard: {
    backgroundColor: 'rgba(10, 26, 21, 0.85)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  notifCardHighlight: {
    backgroundColor: 'rgba(10, 36, 26, 0.95)',
    borderColor: 'rgba(34, 197, 94, 0.45)',
    borderWidth: 1.5,
  },
  notifCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifSource: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notifTimeTag: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#facc15',
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 18,
  },
  notifDescription: {
    fontSize: 12,
    color: '#d1fae5',
    lineHeight: 17,
    opacity: 0.9,
  },
  checkinBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  checkinActionBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 12,
  },
  checkinActionBtnText: {
    color: '#0a1a15',
    fontWeight: '800',
    fontSize: 13,
  },
  checkinSkipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    borderRadius: 12,
  },
  checkinSkipBtnText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 12,
  },
  waterQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  waterQuickBtnText: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '700',
  },
  communityLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.35)',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  communityLinkBtnText: {
    color: '#facc15',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  emptyFooterText: {
    color: '#6b7280',
    fontSize: 11,
  },
});
