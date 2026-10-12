import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import Slider from '@react-native-community/slider';
import { api } from '../../core/api';
import { Trash2, Plus, Coffee, Sun, Moon, Utensils, X, Search, Edit3, Repeat, Sparkles } from 'lucide-react-native';
import { useToast } from '../../components/Toast';
import { HistorySkeleton } from '../../components/SkeletonLoader';
import { dataEvents } from '../../core/dataEvents';
import { searchFoodsLocal } from '../../core/foodDB';

type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

interface FoodLog {
  id: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  qty: number;
  unit_type?: string;
  meal_type: MealType;
  date: string;
  created_at: string;
}

interface FoodItem {
  id: string;
  name: string;
  source: 'master' | 'custom';
  calories_per_base: number;
  protein_per_base: number;
  carbs_per_base: number;
  fats_per_base: number;
  fiber_per_base?: number;
  unit_type: string;
  base_qty: number;
}

const mealLabels: Record<MealType, string> = {
  breakfast: 'Café da Manhã',
  lunch: 'Almoço',
  snacks: 'Lanches',
  dinner: 'Jantar',
};

const mealIcons: Record<MealType, any> = {
  breakfast: Coffee,
  lunch: Sun,
  snacks: Utensils,
  dinner: Moon,
};

const mealColors: Record<MealType, string> = {
  breakfast: '#f97316',
  lunch: '#22c55e',
  snacks: '#a855f7',
  dinner: '#3b82f6',
};

export default function History() {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { showToast } = useToast();

  // Modal de adicionar
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState(100);
  const [addingFood, setAddingFood] = useState(false);

  // Modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editMeal, setEditMeal] = useState<MealType>('breakfast');
  const [updating, setUpdating] = useState(false);

  // Repetir refeição
  const [repeatingMeal, setRepeatingMeal] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/api/food/log', { date: selectedDate });
      setLogs(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Erro ao buscar diário alimentar:', e);
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [selectedDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs();
  }, [selectedDate]);

  useEffect(() => {
    const unsub1 = dataEvents.on('food_logged', fetchLogs);
    const unsub2 = dataEvents.on('food_deleted', fetchLogs);
    const unsub3 = dataEvents.on('food_edited', fetchLogs);
    return () => {
      unsub1(); unsub2(); unsub3();
    };
  }, [selectedDate]);

  // AÇÃO ANTI-ATRITO: Repetir Refeição de Ontem em 1 Toque
  const handleRepeatMeal = async (mealType: MealType) => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() - 1);
    const sourceDate = curr.toISOString().split('T')[0];

    setRepeatingMeal(mealType);
    try {
      const res = await api.post('/api/food/repeat-meal', {
        sourceDate,
        targetDate: selectedDate,
        mealType,
      });

      if (res?.cloned > 0) {
        showToast(`+${res.cloned} itens repetidos de ontem no ${mealLabels[mealType]}!`, 'success');
        fetchLogs();
      } else {
        showToast(`Nenhum item encontrado no ${mealLabels[mealType]} de ontem.`, 'error');
      }
    } catch (e: any) {
      showToast('Erro ao repetir refeição', 'error');
    } finally {
      setRepeatingMeal(null);
    }
  };

  const handleDelete = (id: string, foodName: string) => {
    setItemToDelete({ id, name: foodName });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/food/log/${itemToDelete.id}`);
      setLogs((prev) => prev.filter((log) => log.id !== itemToDelete.id));
      showToast('Item removido com sucesso', 'success');
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (e: any) {
      showToast('Falha ao remover item', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (log: FoodLog) => {
    setEditingLog(log);
    setEditQuantity(String(log.qty || 100));
    setEditMeal(log.meal_type);
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!editingLog) return;
    setUpdating(true);
    try {
      const newQty = parseFloat(editQuantity.replace(',', '.')) || 100;
      const oldQty = editingLog.qty || 100;
      const multiplier = newQty / oldQty;

      const updatedData = {
        food_name: editingLog.food_name,
        calories: Math.round(editingLog.calories * multiplier),
        protein_g: Math.round(editingLog.protein_g * multiplier * 10) / 10,
        carbs_g: Math.round(editingLog.carbs_g * multiplier * 10) / 10,
        fats_g: Math.round(editingLog.fats_g * multiplier * 10) / 10,
        fiber_g: Math.round((editingLog.fiber_g || 0) * multiplier * 10) / 10,
        qty: newQty,
        meal_type: editMeal,
        date: editingLog.date,
      };

      await api.put(`/api/food/log/${editingLog.id}`, updatedData);
      setLogs((prev) =>
        prev.map((log) => (log.id === editingLog.id ? { ...log, ...updatedData } : log))
      );

      showToast('Item atualizado', 'success');
      setShowEditModal(false);
      setEditingLog(null);
    } catch (e: any) {
      showToast('Falha ao atualizar item', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Busca rápida (Local primeiro, Supabase TBCA depois)
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const localResults = await searchFoodsLocal(query);
      if (localResults.length > 0) {
        setSearchResults(
          localResults.map((f) => ({
            id: f.id,
            name: f.name,
            source: f.source,
            calories_per_base: f.calories,
            protein_per_base: f.protein_g,
            carbs_per_base: f.carbs_g,
            fats_per_base: f.fats_g,
            fiber_per_base: f.fiber_g,
            unit_type: f.unit_type,
            base_qty: f.base_qty,
          }))
        );
        setSearching(false);
        return;
      }

      // Consulta Supabase com Trigram em PT-BR
      const res = await api.get('/api/food/search', { q: query });
      const mapFood = (food: any, source: 'master' | 'custom'): FoodItem => ({
        id: food.id,
        name: food.name,
        source,
        calories_per_base: food.calories || 0,
        protein_per_base: food.protein_g || 0,
        carbs_per_base: food.carbs_g || 0,
        fats_per_base: food.fats_g || 0,
        fiber_per_base: food.fiber_g || 0,
        unit_type: food.unit_type || 'g',
        base_qty: food.base_qty || 100,
      });

      const masterFoods = (res.master || []).map((f: any) => mapFood(f, 'master'));
      const customFoods = (res.custom || []).map((f: any) => mapFood(f, 'custom'));
      setSearchResults([...masterFoods, ...customFoods]);
    } catch (e) {
      console.error('Erro na busca:', e);
    } finally {
      setSearching(false);
    }
  };

  const calcPreviewMacros = (food: FoodItem, currentQty: number) => {
    const factor = currentQty / (food.base_qty || 100);
    return {
      calories: Math.round(food.calories_per_base * factor),
      protein: Math.round(food.protein_per_base * factor * 10) / 10,
      carbs: Math.round(food.carbs_per_base * factor * 10) / 10,
      fats: Math.round(food.fats_per_base * factor * 10) / 10,
      fiber: Math.round((food.fiber_per_base || 0) * factor * 10) / 10,
    };
  };

  const handleAddFood = async () => {
    if (!selectedFood) return;
    setAddingFood(true);
    try {
      const macros = calcPreviewMacros(selectedFood, qty);
      await api.post('/api/food/log', {
        food_name: selectedFood.name,
        food_source: selectedFood.source || 'master',
        food_master_id: selectedFood.source === 'master' ? selectedFood.id : null,
        food_custom_id: selectedFood.source === 'custom' ? selectedFood.id : null,
        calories: macros.calories,
        protein_g: macros.protein,
        carbs_g: macros.carbs,
        fats_g: macros.fats,
        fiber_g: macros.fiber,
        qty: qty,
        unit_type: selectedFood.unit_type || 'g',
        meal_type: selectedMeal,
        date: selectedDate,
      });

      showToast('Alimento adicionado!', 'success');
      setShowAddModal(false);
      setSelectedFood(null);
      setSearchQuery('');
      setSearchResults([]);
      setQty(100);
      fetchLogs();
    } catch (e) {
      showToast('Erro ao adicionar alimento', 'error');
    } finally {
      setAddingFood(false);
    }
  };

  const groupedLogs = logs.reduce((acc, log) => {
    const mealType = log.meal_type || 'snacks';
    if (!acc[mealType]) acc[mealType] = [];
    acc[mealType].push(log);
    return acc;
  }, {} as Record<MealType, FoodLog[]>);

  // Seletor semanal em Português
  const getDates = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDaysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      dates.push({
        date: `${year}-${month}-${day}`,
        day: weekDaysPt[date.getDay()],
        dayNum: date.getDate(),
        isToday: i === 0,
      });
    }
    return dates;
  };

  const dates = getDates();

  const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const totalProtein = logs.reduce((sum, log) => sum + (log.protein_g || 0), 0);
  const totalCarbs = logs.reduce((sum, log) => sum + (log.carbs_g || 0), 0);
  const totalFats = logs.reduce((sum, log) => sum + (log.fats_g || 0), 0);
  const totalFiber = logs.reduce((sum, log) => sum + (log.fiber_g || 0), 0);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <HistorySkeleton />
      </SafeAreaView>
    );
  }

  const allMeals: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Diário de Refeições</Text>
            <Text style={styles.headerSubtitle}>{formatDate(selectedDate)}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Plus color="#0a1a15" size={22} />
          </TouchableOpacity>
        </View>

        {/* Seletor de Data */}
        <View style={styles.dateSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dates.map((d) => (
              <TouchableOpacity
                key={d.date}
                style={[styles.dateItem, selectedDate === d.date && styles.dateItemActive]}
                onPress={() => setSelectedDate(d.date)}
              >
                <Text style={[styles.dateDay, selectedDate === d.date && styles.dateDayActive]}>{d.day}</Text>
                <Text style={[styles.dateNum, selectedDate === d.date && styles.dateNumActive]}>{d.dayNum}</Text>
                {d.isToday && <View style={[styles.todayDot, selectedDate === d.date && styles.todayDotActive]} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Card de Resumo (Com Fibras) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{Math.round(totalCalories)}</Text>
            <Text style={styles.summaryLabel}>Calorias</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>{Math.round(totalProtein)}g</Text>
            <Text style={styles.summaryLabel}>Proteína</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>{Math.round(totalCarbs)}g</Text>
            <Text style={styles.summaryLabel}>Carbos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#f97316' }]}>{Math.round(totalFats)}g</Text>
            <Text style={styles.summaryLabel}>Gorduras</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#eab308' }]}>{Math.round(totalFiber)}g</Text>
            <Text style={styles.summaryLabel}>Fibras</Text>
          </View>
        </View>

        {/* Seções por Refeição */}
        {allMeals.map((mealType) => {
          const mealLogs = groupedLogs[mealType] || [];
          const MealIcon = mealIcons[mealType];
          const mealColor = mealColors[mealType];
          const mealCalories = mealLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
          const isRepeating = repeatingMeal === mealType;

          return (
            <View key={mealType} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <View style={styles.mealHeaderLeft}>
                  <View style={[styles.mealIconWrapper, { backgroundColor: `${mealColor}20` }]}>
                    <MealIcon color={mealColor} size={18} />
                  </View>
                  <Text style={styles.mealTitle}>{mealLabels[mealType]}</Text>
                  <Text style={styles.mealCaloriesBadge}>{Math.round(mealCalories)} kcal</Text>
                </View>

                {/* BOTÃO ANTI-ATRITO: Repetir Refeição */}
                <View style={styles.mealHeaderActions}>
                  <TouchableOpacity
                    style={styles.repeatButton}
                    disabled={isRepeating}
                    onPress={() => handleRepeatMeal(mealType)}
                  >
                    <Repeat color="#22c55e" size={13} />
                    <Text style={styles.repeatButtonText}>{isRepeating ? '...' : 'Repetir'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addMealButton}
                    onPress={() => {
                      setSelectedMeal(mealType);
                      setShowAddModal(true);
                    }}
                  >
                    <Plus color="#9ca3af" size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              {mealLogs.length === 0 ? (
                <View style={styles.emptyMealBox}>
                  <Text style={styles.emptyMealText}>Nenhum item registrado</Text>
                </View>
              ) : (
                <View style={styles.foodList}>
                  {mealLogs.map((log) => (
                    <View key={log.id} style={styles.foodItem}>
                      <View style={styles.foodInfo}>
                        <Text style={styles.foodName}>{log.food_name}</Text>
                        <Text style={styles.foodDetails}>
                          {log.qty}{log.unit_type || 'g'} • {Math.round(log.calories)} kcal • P: {Math.round(log.protein_g)}g • C: {Math.round(log.carbs_g)}g • G: {Math.round(log.fats_g)}g
                          {log.fiber_g ? ` • Fib: ${log.fiber_g}g` : ''}
                        </Text>
                      </View>
                      <View style={styles.foodActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(log)}>
                          <Edit3 color="#9ca3af" size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(log.id, log.food_name)}>
                          <Trash2 color="#ef4444" size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Modal Adicionar Alimento */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar ao {mealLabels[selectedMeal]}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            {/* Campo de Busca na TBCA */}
            <View style={styles.searchBox}>
              <Search color="#6b7280" size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar arroz, feijão, frango, frutas..."
                placeholderTextColor="#6b7280"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            {/* Resultados */}
            {selectedFood ? (
              <View style={styles.selectedFoodCard}>
                <View style={styles.selectedFoodHeader}>
                  <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedFood(null)}>
                    <X color="#9ca3af" size={18} />
                  </TouchableOpacity>
                </View>

                <View style={styles.portionSliderBox}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Quantidade</Text>
                    <Text style={styles.sliderVal}>{qty}g</Text>
                  </View>
                  <Slider
                    minimumValue={10}
                    maximumValue={500}
                    step={5}
                    value={qty}
                    onValueChange={setQty}
                    minimumTrackTintColor="#22c55e"
                    maximumTrackTintColor="#1f3d32"
                    thumbTintColor="#22c55e"
                  />
                </View>

                {(() => {
                  const m = calcPreviewMacros(selectedFood, qty);
                  return (
                    <View style={styles.previewMacrosRow}>
                      <View style={styles.previewMacro}>
                        <Text style={styles.previewMacroVal}>{m.calories}</Text>
                        <Text style={styles.previewMacroLbl}>Kcal</Text>
                      </View>
                      <View style={styles.previewMacro}>
                        <Text style={[styles.previewMacroVal, { color: '#3b82f6' }]}>{m.protein}g</Text>
                        <Text style={styles.previewMacroLbl}>Proteína</Text>
                      </View>
                      <View style={styles.previewMacro}>
                        <Text style={[styles.previewMacroVal, { color: '#22c55e' }]}>{m.carbs}g</Text>
                        <Text style={styles.previewMacroLbl}>Carbos</Text>
                      </View>
                      <View style={styles.previewMacro}>
                        <Text style={[styles.previewMacroVal, { color: '#f97316' }]}>{m.fats}g</Text>
                        <Text style={styles.previewMacroLbl}>Gordura</Text>
                      </View>
                      <View style={styles.previewMacro}>
                        <Text style={[styles.previewMacroVal, { color: '#eab308' }]}>{m.fiber}g</Text>
                        <Text style={styles.previewMacroLbl}>Fibras</Text>
                      </View>
                    </View>
                  );
                })()}

                <TouchableOpacity style={styles.primaryButton} disabled={addingFood} onPress={handleAddFood}>
                  <Text style={styles.primaryButtonText}>{addingFood ? 'Salvando...' : 'Adicionar Refeição'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.searchResultsList}>
                {searchResults.map((f) => (
                  <TouchableOpacity key={f.id} style={styles.searchItem} onPress={() => setSelectedFood(f)}>
                    <View style={styles.searchItemLeft}>
                      <Text style={styles.searchItemName} numberOfLines={2}>{f.name}</Text>
                      <Text style={styles.searchItemDetails}>
                        {Math.round(f.calories_per_base)} kcal por 100g • P: {Math.round(f.protein_per_base)}g • C: {Math.round(f.carbs_per_base)}g • Fibras: {Math.round(f.fiber_per_base || 0)}g
                      </Text>
                    </View>
                    <Plus color="#22c55e" size={20} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Deletar */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Remover Alimento?</Text>
            <Text style={styles.confirmSubtitle}>Deseja remover "{itemToDelete?.name}" do seu diário?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} disabled={deleting} onPress={confirmDelete}>
                <Text style={styles.deleteBtnText}>{deleting ? 'Removendo...' : 'Remover'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Editar */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Porção</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{editingLog?.food_name}</Text>
            <Text style={styles.inputLabel}>Quantidade ({editingLog?.unit_type || 'g'})</Text>
            <TextInput
              style={styles.input}
              value={editQuantity}
              onChangeText={setEditQuantity}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.primaryButton} disabled={updating} onPress={confirmEdit}>
              <Text style={styles.primaryButtonText}>{updating ? 'Salvando...' : 'Salvar Alteração'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },
  scrollContent: { padding: 18, paddingBottom: 110 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: '#9ca3af', fontSize: 13, textTransform: 'capitalize' },
  addButton: { backgroundColor: '#22c55e', width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Seletor de Data
  dateSelector: { marginBottom: 16 },
  dateItem: {
    backgroundColor: '#0f2920',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3d32',
    minWidth: 54,
  },
  dateItemActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  dateDay: { color: '#9ca3af', fontSize: 11, fontWeight: '500' },
  dateDayActive: { color: '#0a1a15', fontWeight: 'bold' },
  dateNum: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  dateNumActive: { color: '#0a1a15' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#22c55e', marginTop: 4 },
  todayDotActive: { backgroundColor: '#0a1a15' },

  // Summary Card (5 Métricas)
  summaryCard: {
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f3d32',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  summaryLabel: { color: '#6b7280', fontSize: 10, marginTop: 2 },
  summaryDivider: { width: 1, height: 26, backgroundColor: '#1f3d32' },

  // Seções por Refeição
  mealSection: { backgroundColor: '#0f2920', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1f3d32' },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealIconWrapper: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  mealCaloriesBadge: { color: '#9ca3af', fontSize: 12 },
  mealHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  repeatButtonText: { color: '#22c55e', fontSize: 11, fontWeight: 'bold' },
  addMealButton: { padding: 4 },
  emptyMealBox: { paddingVertical: 10, alignItems: 'center' },
  emptyMealText: { color: '#4b5563', fontSize: 12 },

  // Itens de Alimento
  foodList: { gap: 8 },
  foodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#153528', padding: 12, borderRadius: 12 },
  foodInfo: { flex: 1, marginRight: 8 },
  foodName: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  foodDetails: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  foodActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 4 },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f2920', padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#1f3d32', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#153528', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#1f3d32', gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, paddingVertical: 12, color: '#ffffff', fontSize: 14 },
  searchResultsList: { maxHeight: 320 },
  searchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f3d32' },
  searchItemLeft: { flex: 1, marginRight: 10 },
  searchItemName: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  searchItemDetails: { color: '#9ca3af', fontSize: 11, marginTop: 2 },

  // Selected Food Preview
  selectedFoodCard: { backgroundColor: '#153528', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#1f3d32' },
  selectedFoodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  selectedFoodName: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  portionSliderBox: { marginBottom: 16 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderLabel: { color: '#9ca3af', fontSize: 12 },
  sliderVal: { color: '#22c55e', fontSize: 15, fontWeight: 'bold' },
  previewMacrosRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f2920', padding: 12, borderRadius: 10, marginBottom: 16 },
  previewMacro: { alignItems: 'center' },
  previewMacroVal: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  previewMacroLbl: { color: '#6b7280', fontSize: 10, marginTop: 2 },

  // Modal Center Confirm
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { backgroundColor: '#0f2920', borderRadius: 20, padding: 20, width: '100%', borderWidth: 1, borderColor: '#1f3d32' },
  confirmTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  confirmSubtitle: { color: '#9ca3af', fontSize: 14, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#153528', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#ffffff', fontWeight: 'bold' },
  deleteBtn: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  deleteBtnText: { color: '#ffffff', fontWeight: 'bold' },

  inputLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#153528', borderRadius: 12, padding: 14, color: '#ffffff', fontSize: 15, borderWidth: 1, borderColor: '#1f3d32', marginBottom: 14 },
  primaryButton: { backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: '#0a1a15', fontWeight: 'bold', fontSize: 15 },
});
