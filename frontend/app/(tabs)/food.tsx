import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { api } from '../../core/api';
import { Plus, X, Search, Heart, Sparkles, Check, AlertCircle } from 'lucide-react-native';
import { useToast } from '../../components/Toast';
import { searchFoodsLocal } from '../../core/foodDB';
import { dataEvents } from '../../core/dataEvents';
import { calculatePortion, CalculatedNutrients } from '../../core/domain/nutritionEngine';

const { width } = Dimensions.get('window');

interface Food {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number | null;
  sodium_mg?: number | null;
  base_qty: number;
  unit_type: string;
  data_source?: string;
  brand?: string;
  preparation_type?: string;
  user_id?: string;
  is_custom?: boolean;
}

const MEALS_PT = [
  { key: 'breakfast', label: 'Café da Manhã' },
  { key: 'lunch', label: 'Almoço' },
  { key: 'snacks', label: 'Lanches' },
  { key: 'dinner', label: 'Jantar' },
];

const QUICK_GRAM_BUTTONS = [50, 100, 150, 200, 300];

export default function FoodSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ master: Food[]; custom: Food[] }>({ master: [], custom: [] });
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [qty, setQty] = useState(100);
  const [mealType, setMealType] = useState('breakfast');
  const [activeTab, setActiveTab] = useState<'recent' | 'favorites' | 'custom'>('recent');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [loggingFood, setLoggingFood] = useState(false);

  // Dados das abas
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<Food[]>([]);
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Formulário de alimento personalizado
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFats, setCustomFats] = useState('');
  const [customFiber, setCustomFiber] = useState('');
  const [customBaseQty, setCustomBaseQty] = useState('100');
  const [customUnit, setCustomUnit] = useState('g');
  const [savingCustom, setSavingCustom] = useState(false);

  const { showToast } = useToast();

  const searchFood = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      // 1. Tenta buscar no cache local
      const localResults = await searchFoodsLocal(query);
      if (localResults.length > 0) {
        const master = localResults.filter((f) => f.source === 'master');
        const custom = localResults
          .filter((f) => f.source === 'custom')
          .map((f) => ({ ...f, is_custom: true }));
        setResults({ master: master as any, custom: custom as any });
        setLoading(false);
        return;
      }

      // 2. Busca online via Supabase (Trigram)
      const res = await api.get('/api/food/search', { q: query.trim() });
      const customWithFlag = (res.custom || []).map((f: Food) => ({ ...f, is_custom: true }));
      setResults({ master: res.master || [], custom: customWithFlag });
    } catch (e) {
      console.error('Erro na busca de alimentos:', e);
      showToast('Falha ao buscar alimentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogFood = async () => {
    if (!selectedFood) return;

    setLoggingFood(true);
    const calculated: CalculatedNutrients = calculatePortion(
      {
        base_qty: selectedFood.base_qty,
        calories: selectedFood.calories,
        protein_g: selectedFood.protein_g,
        carbs_g: selectedFood.carbs_g,
        fats_g: selectedFood.fats_g,
        fiber_g: selectedFood.fiber_g,
        sodium_mg: selectedFood.sodium_mg,
      },
      qty,
      selectedFood.unit_type
    );

    try {
      const payload = {
        date: new Date().toISOString().split('T')[0],
        meal_type: mealType,
        food_source: selectedFood.is_custom || selectedFood.user_id ? 'custom' : 'master',
        food_master_id: selectedFood.is_custom || selectedFood.user_id ? null : selectedFood.id,
        food_custom_id: selectedFood.is_custom || selectedFood.user_id ? selectedFood.id : null,
        food_name: selectedFood.name,
        brand: selectedFood.brand || null,
        qty: qty,
        unit_type: selectedFood.unit_type || 'g',
        calories: calculated.calories,
        protein_g: calculated.protein_g,
        carbs_g: calculated.carbs_g,
        fats_g: calculated.fats_g,
        fiber_g: calculated.fiber_g,
        sodium_mg: calculated.sodium_mg,
      };

      await api.post('/api/food/log', payload);
      const mealName = MEALS_PT.find((m) => m.key === mealType)?.label || mealType;
      showToast(`${selectedFood.name} adicionado ao ${mealName}!`, 'success');
      setSelectedFood(null);
      setQty(100);
    } catch (e) {
      console.error('Erro ao registrar alimento:', e);
      showToast('Falha ao registrar alimento. Tente novamente.', 'error');
    } finally {
      setLoggingFood(false);
    }
  };

  const handleSaveCustomFood = async () => {
    if (!customName.trim() || !customCalories.trim()) {
      showToast('Informe o nome e as calorias do alimento', 'error');
      return;
    }

    setSavingCustom(true);
    try {
      await api.post('/api/food/custom', {
        name: customName.trim(),
        calories: parseFloat(customCalories) || 0,
        protein_g: parseFloat(customProtein) || 0,
        carbs_g: parseFloat(customCarbs) || 0,
        fats_g: parseFloat(customFats) || 0,
        fiber_g: customFiber ? parseFloat(customFiber) : null,
        base_qty: parseFloat(customBaseQty) || 100,
        unit_type: customUnit,
      });
      showToast('Alimento personalizado cadastrado!', 'success');
      resetCustomForm();
      setShowCustomModal(false);
      loadCustom();
    } catch (e) {
      showToast('Falha ao salvar alimento', 'error');
    } finally {
      setSavingCustom(false);
    }
  };

  const resetCustomForm = () => {
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFats('');
    setCustomFiber('');
    setCustomBaseQty('100');
    setCustomUnit('g');
  };

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const faves = await api.get('/api/food/favorites');
      setFavoriteFoods(faves || []);
      const ids = new Set<string>((faves || []).map((f: Food) => f.id));
      setFavoriteIds(ids);
    } catch (e) {
      console.error('Erro ao carregar favoritos:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadRecent = async () => {
    setLoading(true);
    try {
      const recent = await api.get('/api/food/recent');
      setRecentFoods(recent || []);
    } catch (e) {
      console.error('Erro ao carregar recentes:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCustom = async () => {
    setLoading(true);
    try {
      const custom = await api.get('/api/food/search', { q: '' });
      const customWithFlag = (custom.custom || []).map((f: Food) => ({ ...f, is_custom: true }));
      setCustomFoods(customWithFlag);
    } catch (e) {
      console.error('Erro ao carregar personalizados:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (food: Food) => {
    const isFavorite = favoriteIds.has(food.id);
    const isCustomFood = !!food.user_id || food.is_custom || false;

    try {
      if (isFavorite) {
        await api.delete(`/api/food/favorites/${food.id}`);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(food.id);
          return next;
        });
        showToast('Removido dos favoritos', 'success');
      } else {
        await api.post(`/api/food/favorites/${food.id}`, { is_custom: isCustomFood });
        setFavoriteIds((prev) => new Set(prev).add(food.id));
        showToast('Adicionado aos favoritos', 'success');
      }

      if (activeTab === 'favorites') {
        loadFavorites();
      }
    } catch (e) {
      console.error('Erro ao alternar favorito:', e);
      showToast('Falha ao atualizar favoritos', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'recent') loadRecent();
    else if (activeTab === 'favorites') loadFavorites();
    else if (activeTab === 'custom') loadCustom();
  }, [activeTab]);

  useEffect(() => {
    const refreshActiveTab = () => {
      if (activeTab === 'recent') loadRecent();
      else if (activeTab === 'favorites') loadFavorites();
      else if (activeTab === 'custom') loadCustom();
    };
    const unsub1 = dataEvents.on('food_logged', refreshActiveTab);
    const unsub2 = dataEvents.on('food_deleted', refreshActiveTab);
    const unsub3 = dataEvents.on('food_edited', refreshActiveTab);
    return () => {
      unsub1(); unsub2(); unsub3();
    };
  }, [activeTab]);

  const getSliderConfig = (unitType: string) => {
    if (unitType === 'unidade' || unitType === 'serving') {
      return { min: 0.5, max: 10, step: 0.5, unit: unitType };
    }
    return { min: 5, max: 500, step: 5, unit: unitType || 'g' };
  };

  // Render do Alimento na Lista
  const renderFoodItem = ({ item }: { item: Food }) => {
    const isTBCA = !item.is_custom && !item.user_id;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedFood(item);
          setQty(item.base_qty || 100);
        }}
        style={styles.foodCard}
        activeOpacity={0.7}
      >
        <View style={styles.foodImagePlaceholder}>
          <Text style={styles.foodEmoji}>🥗</Text>
        </View>

        <View style={styles.foodInfo}>
          <View style={styles.foodTitleRow}>
            <Text style={styles.foodName} numberOfLines={1}>
              {item.name}
            </Text>
            {isTBCA ? (
              <View style={styles.tbcaBadge}>
                <Text style={styles.tbcaBadgeText}>TBCA</Text>
              </View>
            ) : (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Criado</Text>
              </View>
            )}
          </View>

          <Text style={styles.foodServing}>
            Porção padrão: {item.base_qty || 100}{item.unit_type || 'g'}
            {item.preparation_type ? ` • ${item.preparation_type}` : ''}
          </Text>

          <View style={styles.foodMacrosRow}>
            <Text style={styles.foodCalories}>{item.calories} kcal</Text>
            <Text style={styles.foodMacroP}> • {item.protein_g}g P</Text>
            <Text style={styles.foodMacroC}> • {item.carbs_g}g C</Text>
            <Text style={styles.foodMacroF}> • {item.fats_g}g G</Text>
            {item.fiber_g != null && (
              <Text style={styles.foodMacroFib}> • {item.fiber_g}g Fib</Text>
            )}
          </View>
        </View>

        <View style={styles.addFoodBtn}>
          <Plus color="#22c55e" size={20} />
        </View>
      </TouchableOpacity>
    );
  };

  const calculatedModalNutrients = selectedFood
    ? calculatePortion(
        {
          base_qty: selectedFood.base_qty,
          calories: selectedFood.calories,
          protein_g: selectedFood.protein_g,
          carbs_g: selectedFood.carbs_g,
          fats_g: selectedFood.fats_g,
          fiber_g: selectedFood.fiber_g,
          sodium_mg: selectedFood.sodium_mg,
        },
        qty,
        selectedFood.unit_type
      )
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search color="#6b7280" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar alimentos (ex: Arroz, Frango, Tapioca)..."
            placeholderTextColor="#6b7280"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (!text.trim()) {
                setResults({ master: [], custom: [] });
              }
            }}
            onSubmitEditing={searchFood}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults({ master: [], custom: [] }); }}>
              <X color="#9ca3af" size={18} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.searchSubmitBtn} onPress={searchFood}>
          <Search color="#0a1a15" size={18} />
        </TouchableOpacity>
      </View>

      {/* Abas de Navegação */}
      {!query && (
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            <TouchableOpacity
              onPress={() => setActiveTab('recent')}
              style={[styles.tab, activeTab === 'recent' && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>Recentes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('favorites')}
              style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>Favoritos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('custom')}
              style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>Meus Alimentos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.createCustomBtn} onPress={() => setShowCustomModal(true)}>
              <Plus color="#22c55e" size={16} />
              <Text style={styles.createCustomText}>Cadastrar Alimento</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Lista de Resultados */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#22c55e" size="large" />
          <Text style={styles.loadingText}>Buscando base de dados brasileira...</Text>
        </View>
      ) : (
        <FlatList
          data={
            query
              ? [...results.custom, ...results.master]
              : activeTab === 'recent'
              ? recentFoods
              : activeTab === 'favorites'
              ? favoriteFoods
              : customFoods
          }
          keyExtractor={(item) => item.id}
          renderItem={renderFoodItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                {query ? '🔍' : activeTab === 'recent' ? '⏰' : activeTab === 'favorites' ? '❤️' : '🥗'}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? 'Nenhum alimento encontrado'
                  : activeTab === 'recent'
                  ? 'Nenhum histórico recente'
                  : activeTab === 'favorites'
                  ? 'Nenhum favorito salvo'
                  : 'Nenhum alimento personalizado'}
              </Text>
              <Text style={styles.emptySubtext}>
                {query
                  ? 'Tente termos simples como "arroz", "banana", "ovo" ou cadastre um alimento novo.'
                  : activeTab === 'recent'
                  ? 'Os alimentos registrados nas refeições aparecerão aqui para repetição rápida.'
                  : activeTab === 'favorites'
                  ? 'Toque no coração ao selecionar um alimento para salvá-lo aqui.'
                  : 'Cadastre ingredientes ou receitas próprias tocando no botão "+ Cadastrar Alimento".'}
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL DE AJUSTE DE PORÇÃO & REGISTRO */}
      <Modal visible={!!selectedFood} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {/* Cabeçalho do Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedFood?.name}
                </Text>
                <View style={styles.sourceTagRow}>
                  <Text style={styles.modalSubtitle}>
                    Base: {selectedFood?.base_qty}{selectedFood?.unit_type || 'g'}
                  </Text>
                  <View style={styles.originBadge}>
                    <Text style={styles.originBadgeText}>
                      {selectedFood?.is_custom ? 'Receita Própria' : 'TBCA • USP'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.favoriteBtn}
                onPress={() => selectedFood && toggleFavorite(selectedFood)}
              >
                <Heart
                  color={selectedFood && favoriteIds.has(selectedFood.id) ? '#ef4444' : '#6b7280'}
                  fill={selectedFood && favoriteIds.has(selectedFood.id) ? '#ef4444' : 'transparent'}
                  size={24}
                />
              </TouchableOpacity>
            </View>

            {/* 5 Cards de Macronutrientes (Com Fibras) */}
            {calculatedModalNutrients && (
              <View style={styles.macroRow}>
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxValue}>{calculatedModalNutrients.calories}</Text>
                  <Text style={styles.macroBoxLabel}>KCAL</Text>
                </View>
                <View style={[styles.macroBox, styles.macroBoxHighlight]}>
                  <Text style={[styles.macroBoxValue, styles.macroBoxValueHighlight]}>
                    {calculatedModalNutrients.protein_g}g
                  </Text>
                  <Text style={[styles.macroBoxLabel, styles.macroBoxLabelHighlight]}>PROT</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxValue}>{calculatedModalNutrients.carbs_g}g</Text>
                  <Text style={styles.macroBoxLabel}>CARB</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxValue}>{calculatedModalNutrients.fats_g}g</Text>
                  <Text style={styles.macroBoxLabel}>GORD</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxValue}>{calculatedModalNutrients.fiber_g}g</Text>
                  <Text style={styles.macroBoxLabel}>FIBR</Text>
                </View>
              </View>
            )}

            {/* Alerta de Completude de Dados se Fibra for Nula */}
            {calculatedModalNutrients?.hasIncompleteData && (
              <View style={styles.incompleteDataBanner}>
                <AlertCircle color="#f59e0b" size={14} />
                <Text style={styles.incompleteDataText}>
                  Teor de fibras não detalhado na tabela de origem para este item.
                </Text>
              </View>
            )}

            {/* Ajuste de Porção */}
            {selectedFood && (() => {
              const sliderCfg = getSliderConfig(selectedFood.unit_type);
              return (
                <View style={styles.sliderSection}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Quantidade Consumida</Text>
                    <Text style={styles.sliderValue}>
                      {qty}
                      <Text style={styles.sliderUnit}> {sliderCfg.unit}</Text>
                    </Text>
                  </View>

                  <Slider
                    style={styles.slider}
                    minimumValue={sliderCfg.min}
                    maximumValue={sliderCfg.max}
                    step={sliderCfg.step}
                    value={qty}
                    onValueChange={setQty}
                    minimumTrackTintColor="#22c55e"
                    maximumTrackTintColor="#1f3d32"
                    thumbTintColor="#22c55e"
                  />

                  {/* Botões Rápidos de Gramagem */}
                  <View style={styles.quickGramsRow}>
                    {QUICK_GRAM_BUTTONS.map((g) => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setQty(g)}
                        style={[styles.quickGramBtn, qty === g && styles.quickGramBtnActive]}
                      >
                        <Text style={[styles.quickGramText, qty === g && styles.quickGramTextActive]}>
                          {g}g
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })()}

            {/* Seleção do Tipo de Refeição */}
            <Text style={styles.mealLabel}>Refeição de Destino</Text>
            <View style={styles.mealButtons}>
              {MEALS_PT.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setMealType(m.key)}
                  style={[styles.mealButton, mealType === m.key && styles.mealButtonActive]}
                >
                  <Text style={[styles.mealButtonText, mealType === m.key && styles.mealButtonTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ações */}
            <TouchableOpacity
              style={[styles.addButton, loggingFood && styles.addButtonDisabled]}
              onPress={handleLogFood}
              disabled={loggingFood}
            >
              <Text style={styles.addButtonText}>
                {loggingFood ? 'Adicionando ao diário...' : 'Adicionar ao Diário'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedFood(null)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CRIAÇÃO DE ALIMENTO PERSONALIZADO */}
      <Modal visible={showCustomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cadastrar Alimento</Text>
              <TouchableOpacity onPress={() => { resetCustomForm(); setShowCustomModal(false); }}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome do Alimento ou Receita *</Text>
              <TextInput
                style={styles.input}
                value={customName}
                onChangeText={setCustomName}
                placeholder="ex: Panqueca de Aveia com Banana"
                placeholderTextColor="#6b7280"
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Calorias (kcal) *</Text>
                  <TextInput
                    style={styles.input}
                    value={customCalories}
                    onChangeText={setCustomCalories}
                    keyboardType="numeric"
                    placeholder="ex: 180"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Porção Base (g/ml)</Text>
                  <TextInput
                    style={styles.input}
                    value={customBaseQty}
                    onChangeText={setCustomBaseQty}
                    keyboardType="numeric"
                    placeholder="100"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.fourthInput}>
                  <Text style={styles.inputLabel}>Proteína (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={customProtein}
                    onChangeText={setCustomProtein}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View style={styles.fourthInput}>
                  <Text style={styles.inputLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View style={styles.fourthInput}>
                  <Text style={styles.inputLabel}>Gorduras (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={customFats}
                    onChangeText={setCustomFats}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View style={styles.fourthInput}>
                  <Text style={styles.inputLabel}>Fibras (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={customFiber}
                    onChangeText={setCustomFiber}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.addButton, savingCustom && styles.addButtonDisabled, { marginTop: 20 }]}
                onPress={handleSaveCustomFood}
                disabled={savingCustom}
              >
                <Text style={styles.addButtonText}>
                  {savingCustom ? 'Salvando alimento...' : 'Salvar Alimento'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { resetCustomForm(); setShowCustomModal(false); }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },

  // Barra de Pesquisa
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2920',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  searchInput: { flex: 1, color: '#ffffff', paddingVertical: 12, paddingHorizontal: 10, fontSize: 14 },
  searchSubmitBtn: {
    backgroundColor: '#22c55e',
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Abas
  tabsContainer: { paddingHorizontal: 16, marginBottom: 12 },
  tabsScroll: { gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  tabActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  tabText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#0a1a15', fontWeight: '700' },
  createCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#153528',
    borderWidth: 1,
    borderColor: '#22c55e',
    gap: 4,
  },
  createCustomText: { color: '#22c55e', fontSize: 13, fontWeight: '600' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#9ca3af', fontSize: 14 },

  // Lista
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2920',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  foodImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#153528',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodEmoji: { fontSize: 24 },
  foodInfo: { flex: 1, marginLeft: 12 },
  foodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foodName: { color: '#ffffff', fontSize: 15, fontWeight: '600', flex: 1 },
  tbcaBadge: { backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tbcaBadgeText: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
  customBadge: { backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  customBadgeText: { color: '#38bdf8', fontSize: 10, fontWeight: '700' },

  foodServing: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  foodMacrosRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  foodCalories: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  foodMacroP: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  foodMacroC: { color: '#9ca3af', fontSize: 12 },
  foodMacroF: { color: '#9ca3af', fontSize: 12 },
  foodMacroFib: { color: '#38bdf8', fontSize: 12, fontWeight: '600' },
  addFoodBtn: { padding: 8, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 10 },

  // Vazio
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText: { color: '#ffffff', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { color: '#6b7280', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0f2920',
    padding: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1f3d32',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#1f3d32', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  modalTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  sourceTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  modalSubtitle: { color: '#9ca3af', fontSize: 13 },
  originBadge: { backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  originBadgeText: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  favoriteBtn: { padding: 10, backgroundColor: '#153528', borderRadius: 12, borderWidth: 1, borderColor: '#1f3d32' },

  // Macros do Modal
  macroRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  macroBox: {
    flex: 1,
    backgroundColor: '#153528',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  macroBoxHighlight: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  macroBoxValue: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  macroBoxValueHighlight: { color: '#0a1a15' },
  macroBoxLabel: { color: '#9ca3af', fontSize: 10, marginTop: 2, fontWeight: '700' },
  macroBoxLabelHighlight: { color: '#0a1a15' },

  incompleteDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  incompleteDataText: { color: '#fde68a', fontSize: 11, flex: 1 },

  // Slider
  sliderSection: { marginBottom: 18 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderLabel: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  sliderValue: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
  sliderUnit: { fontSize: 15, fontWeight: 'normal', color: '#9ca3af' },
  slider: { width: '100%', height: 36 },

  // Botões de gramagem rápida
  quickGramsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickGramBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#153528',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  quickGramBtnActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  quickGramText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  quickGramTextActive: { color: '#0a1a15', fontWeight: '700' },

  // Refeição
  mealLabel: { color: '#ffffff', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  mealButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  mealButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f3d32',
    backgroundColor: '#153528',
  },
  mealButtonActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  mealButtonText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  mealButtonTextActive: { color: '#0a1a15', fontWeight: '700' },

  // Botões de Ação
  addButton: { backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: '#0a1a15', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { paddingVertical: 14, alignItems: 'center' },
  cancelButtonText: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },

  // Form custom
  inputLabel: { color: '#9ca3af', marginBottom: 6, marginTop: 10, fontSize: 13 },
  input: {
    backgroundColor: '#153528',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  rowInputs: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  fourthInput: { flex: 1 },
});
