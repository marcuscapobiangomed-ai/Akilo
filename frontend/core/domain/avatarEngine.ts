/**
 * avatarEngine.ts
 * Motor Científico de Bioimpedância e Evolução dos Mascotes da "Batalha da Balança".
 * Transforma métricas corporais (peso, IMC, % gordura, % massa muscular, % água, medidas de cintura)
 * no arquétipo dinâmico do mascote (Titã ou Gaia) e calcula sua progressão visual
 * de perda de peso, redução de medidas e flacidez/tônus a cada atualização.
 *
 * Inclui:
 * - Suporte a extremos (Obeso Extremo, Magro Extremo, Atleta Campeão)
 * - Detecção clínica de "Falso Magro / Flácido" (Catabolismo muscular por má alimentação / excesso de doces)
 * - Motor de Falas Dinâmicas para a Tela Inicial (Speech Engine de Calorias e Metas)
 */

export type BiologicalSex = 'male' | 'female';

export type MascotId = 'tita' | 'gaia';

export type MascotArchetype =
  | 'robust'        // Gordão / Treino Pesado (alta adiposidade corporal, foco em queima)
  | 'extreme_obese' // Obeso Extremo / Peso-Pesado Titânico (IMC >= 34 ou gordura muito alta)
  | 'muscular'      // Forte / Maromba (alta massa magra e densidade muscular, shape imponente)
  | 'lean'          // Magrinho / Ágil (baixo peso e baixa gordura, foco em ganho limpo)
  | 'extreme_lean'  // Magro Extremo / Peso-Pena (baixo IMC < 18.5, baixa massa magra)
  | 'skinny_fat'    // Falso Magro / Flácido (perda de peso com catabolismo muscular e retenção de gordura)
  | 'athletic';     // Em Forma / Campeão (eutrofia equilibrada, vitalidade e definição plena)

export interface MascotEvaluation {
  mascotId: MascotId;
  mascotName: string;
  archetype: MascotArchetype;
  stageLevel: number; // 1 | 2 | 3 | 4 | 5
  stageName: string;
  stageDescription: string;
  badgeLabel: string;
  badgeColor: string;
  assetKey: string;
  flavorQuote: string;
  targetWeightKg: number;
  weightDeltaKg: number; // Diferença em relação ao peso ideal/meta
  progressPercentage: number; // 0 - 100% de avanço rumo à forma saudável/meta
  // Métricas de Perda de Peso & Redução de Medidas Corporais
  weightLostKg: number; // kg eliminados desde o início
  fatLostPct: number | null; // % de gordura reduzido
  muscleDeltaPct: number | null; // Variação de massa muscular (%)
  waistLostCm: number | null; // Centímetros de cintura/circunferência reduzidos
  measurementsFeedback: string; // Resumo motivador das medidas reduzidas
  nextMilestone: string; // Próximo passo para a próxima fase da transformação
  // Esteira Master de 10 Marcos Granulares (Titã & Gaia)
  milestoneLevel: number; // 1 a 10
  milestoneName: string;
  milestoneBadge: string;
  milestoneIcon: string;
  milestoneQuote: string;
  milestoneAssetKey: string;
  unlockedCosmetics: string[];
  // Morfologia Corporal 3D Paramétrica (guiada por Peso + % Gordura + % Massa Muscular)
  morphology: BodyMorphology;
}

export interface MascotCustomization {
  eyeColor: string;       // Cor da íris dos olhos (ex: '#38bdf8' Azul, '#10b981' Verde)
  glovesColor?: string;   // Legado compatível
  suitColor: string;      // Bermuda esportiva (Titã) / Leg short biker (Gaia)
  topColor?: string;      // Top de academia (Gaia)
  sneakersColor?: string; // Tênis esportivo de treino
  hairColor?: string;     // Cor do cabelo
  headbandColor?: string; // Legado compatível
  skinTone: string;       // Tom de pele anatômico do personagem
}

export const DEFAULT_TITA_CUSTOMIZATION: MascotCustomization = {
  eyeColor: '#38bdf8',      // Azul safira brilhante
  glovesColor: '#ef4444',   // Legado
  suitColor: '#18181b',     // Bermuda de academia preto carbono
  topColor: '#18181b',      // Top (não aplicável ao Titã topless)
  sneakersColor: '#18181b', // Tênis preto esportivo
  headbandColor: '#ef4444', // Legado
  skinTone: '#fde68a',      // Pele clara amigável
};

export const DEFAULT_GAIA_CUSTOMIZATION: MascotCustomization = {
  eyeColor: '#10b981',      // Verde esmeralda radiante
  glovesColor: '#be123c',   // Legado
  suitColor: '#18181b',     // Leg short biker preto carbono
  topColor: '#f43f5e',      // Top de academia coral/berry
  sneakersColor: '#18181b', // Tênis esportivo de treino
  headbandColor: '#facc15', // Legado
  skinTone: '#fde68a',      // Pele radiante
};

export const CUSTOMIZATION_PALETTES = {
  eyes: [
    { label: 'Azul Safira', color: '#38bdf8' },
    { label: 'Verde Esmeralda', color: '#10b981' },
    { label: 'Castanho Mel', color: '#b45309' },
    { label: 'Âmbar Solar', color: '#f59e0b' },
    { label: 'Violeta Cósmico', color: '#a855f7' },
    { label: 'Rubi Intenso', color: '#e11d48' },
    { label: 'Cinza Gelo', color: '#94a3b8' },
    { label: 'Preto Ônix', color: '#1e293b' },
  ],
  suit: [
    { label: 'Preto Carbono', color: '#18181b' },
    { label: 'Grafite Chumbo', color: '#334155' },
    { label: 'Verde Militar', color: '#166534' },
    { label: 'Azul Noturno', color: '#1e3a8a' },
    { label: 'Vinho Profundo', color: '#881337' },
    { label: 'Vermelho Atlético', color: '#b91c1c' },
    { label: 'Roxo Noturno', color: '#581c87' },
    { label: 'Azul Royal', color: '#1d4ed8' },
  ],
  top: [
    { label: 'Coral Berry', color: '#f43f5e' },
    { label: 'Preto Carbono', color: '#18181b' },
    { label: 'Verde Esmeralda', color: '#10b981' },
    { label: 'Roxo Galáctico', color: '#7c3aed' },
    { label: 'Rosa Quartzo', color: '#fb7185' },
    { label: 'Azul Celeste', color: '#38bdf8' },
    { label: 'Dourado Solar', color: '#facc15' },
    { label: 'Branco Puro', color: '#f8fafc' },
  ],
  sneakers: [
    { label: 'Preto Ônix', color: '#18181b' },
    { label: 'Branco Platina', color: '#f8fafc' },
    { label: 'Azul Titânico', color: '#2563eb' },
    { label: 'Vermelho Corrida', color: '#ef4444' },
    { label: 'Verde Neon', color: '#22c55e' },
    { label: 'Laranja Turbo', color: '#f97316' },
    { label: 'Grafite Treino', color: '#475569' },
    { label: 'Amarelo Energy', color: '#eab308' },
  ],
  skin: [
    { label: 'Pele Clara', color: '#fde68a' },
    { label: 'Tom Pêssego', color: '#fed7aa' },
    { label: 'Tom Dourado', color: '#f59e0b' },
    { label: 'Tom Bronze', color: '#d97706' },
    { label: 'Tom Moreno', color: '#b45309' },
    { label: 'Tom Escuro', color: '#78350f' },
  ],
  // Legado para compatibilidade retroativa
  gloves: [
    { label: 'Preto Carbono', color: '#18181b' },
    { label: 'Vermelho Atlético', color: '#ef4444' },
    { label: 'Dourado Campeão', color: '#eab308' },
    { label: 'Azul Titânico', color: '#2563eb' },
  ],
  headband: [
    { label: 'Preto Carbono', color: '#18181b' },
    { label: 'Vermelho Fogo', color: '#ef4444' },
    { label: 'Dourado Solar', color: '#facc15' },
    { label: 'Verde Esmeralda', color: '#22c55e' },
  ],
};

export interface BodyMorphology {
  armBulk: number;           // 0.70 a 1.60 (volume e espessura do braço/bíceps)
  legBulk: number;           // 0.75 a 1.50 (volume e espessura das pernas)
  torsoWidth: number;        // 0.80 a 1.50 (largura do tórax e ombros em V)
  bellyVolume: number;       // 0.65 a 1.70 (projeção e volume abdominal de gordura)
  waistWidth: number;        // 0.70 a 1.45 (largura da cintura)
  muscleDefinition: number;  // 0.00 a 1.00 (nitidez de fibras e tanquinho)
  flaccidityFactor: number;  // 0.00 a 1.00 (grau de flacidez / falta de tônus)
  glowColor: string;         // Cor do pulso de bioimpedância
  inspectionQuote: string;   // Frase ao olhar para o próprio corpo
  customization: MascotCustomization; // Personalização estética das cores
}

export interface MascotInput {
  mascotId?: MascotId; // 'tita' ou 'gaia' (default de acordo com sex ou escolha)
  sex?: BiologicalSex; // 'male' | 'female'
  weightKg: number;
  heightCm: number;
  bodyFatPct?: number | null;
  muscleMassPct?: number | null;
  bodyWaterPct?: number | null;
  waistCm?: number | null;
  initialWeightKg?: number | null;
  initialBodyFatPct?: number | null;
  initialWaistCm?: number | null;
  initialMuscleMassPct?: number | null;
  goalType?: string; // 'fat_loss' | 'muscle_gain' | 'maintain'
  customization?: Partial<MascotCustomization> | null;
}

export interface MilestoneEvaluation {
  milestoneLevel: number; // 1 a 10
  milestoneName: string;
  milestoneBadge: string;
  milestoneIcon: string;
  milestoneQuote: string;
  milestoneAssetKey: string;
  unlockedCosmetics: string[];
}

/**
 * Calcula o marco de progressão granular (Níveis 1 a 10) para Titã ou Gaia,
 * ponderando o avanço na meta pessoal (progresso relativo) e a faixa antropométrica
 * atingida pelo peso real na esteira oficial (peso absoluto).
 */
export function evaluateMilestoneLadder(
  mascotId: MascotId,
  progressPct: number,
  currentWeightKg?: number
): MilestoneEvaluation {
  const milestones = getDetailedMilestones(mascotId);

  // 1. Nível por progresso relativo pessoal (1 a 10)
  const clampedPct = Math.max(0, Math.min(100, progressPct));
  let progressLevel = 1;
  if (clampedPct >= 90) progressLevel = 10;
  else progressLevel = Math.floor(clampedPct / 10) + 1;

  // 2. Nível por peso antropométrico da esteira oficial (se peso informado)
  let weightLevel = 1;
  if (currentWeightKg && currentWeightKg > 0) {
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (currentWeightKg <= milestones[i].weightKg + 0.1) {
        weightLevel = milestones[i].level;
        break;
      }
    }
  }

  // O marco final é o maior entre o progresso da meta e o peso real alcançado
  const finalLevel = Math.max(progressLevel, weightLevel);
  const m = milestones[finalLevel - 1] || milestones[0];

  return {
    milestoneLevel: m.level,
    milestoneName: m.name,
    milestoneBadge: m.badge,
    milestoneIcon: m.icon,
    milestoneQuote: m.quote,
    milestoneAssetKey: m.assetKey,
    unlockedCosmetics: m.unlockedCosmetics,
  };
}

export interface DetailedMilestone {
  level: number;
  name: string;
  weightKg: number;
  bodyFatPct: number;
  muscleMassPct: number;
  waistCm: number;
  chestOrHipCm: number;
  hudDisplay: string;
  hudSubtext: string;
  badge: string;
  badgeColor: string;
  icon: string;
  quote: string;
  assetKey: string;
  unlockedCosmetics: string[];
  bodyStateDescription: string;
}

/**
 * Retorna o catálogo completo dos 10 marcos granulares antropométricos e clínicos
 * para Titã (Homem, 92.5kg a 70.0kg) ou Gaia (Mulher, 82.0kg a 58.0kg).
 */
export function getDetailedMilestones(mascotId: MascotId): DetailedMilestone[] {
  const isGaia = mascotId === 'gaia';
  const prefix = isGaia ? 'gaia_m' : 'tita_m';
  if (isGaia) {
    const gaiaList: Omit<DetailedMilestone, 'assetKey'>[] = [
      {
        level: 1,
        name: 'O Despertar da Guerreira',
        weightKg: 82.0,
        bodyFatPct: 39.0,
        muscleMassPct: 26.0,
        waistCm: 100,
        chestOrHipCm: 112,
        hudDisplay: '82.0 kg',
        hudSubtext: 'BF: 39% • 100cm',
        badge: 'Aquecimento Pesado',
        badgeColor: '#ef4444',
        icon: 'gauge_red',
        quote: 'Aqui é o ponto de largada! Vamos acelerar esse metabolismo e vencer com foco total!',
        unlockedCosmetics: ['Faixa Vermelha', 'Toalha de Treino', 'Luvas Berry Clássicas'],
        bodyStateDescription: 'Tronco arredondado, retenção hídrica acentuada, olhar focado e postura determinada.',
      },
      {
        level: 2,
        name: 'Quebra do Inchaço',
        weightKg: 79.5,
        bodyFatPct: 37.0,
        muscleMassPct: 26.8,
        waistCm: 96,
        chestOrHipCm: 110,
        hudDisplay: '79.5 kg',
        hudSubtext: 'BF: 37% • 96cm',
        badge: 'Retenção Zero',
        badgeColor: '#f59e0b',
        icon: 'gauge_yellow',
        quote: 'Primeiros litros de inchaço eliminados! Meu rosto afinou e a postura tá firme e ereta!',
        unlockedCosmetics: ['Toalha nos Ombros', 'Top Esportivo Básico'],
        bodyStateDescription: 'Rosto mais limpo e desinchado, redução de retenção articular nos tornozelos e punhos.',
      },
      {
        level: 3,
        name: 'Desinchaço Notável',
        weightKg: 77.0,
        bodyFatPct: 34.5,
        muscleMassPct: 27.5,
        waistCm: 93,
        chestOrHipCm: 108,
        hudDisplay: '77.0 kg',
        hudSubtext: 'BF: 34.5% • 93cm',
        badge: 'Alívio Articular',
        badgeColor: '#f97316',
        icon: 'flame_amber',
        quote: 'A queima ativa começou! A toalha foi pro cinto e as roupas já estão bem mais folgadas!',
        unlockedCosmetics: ['Faixa Verde Esmeralda', 'Toalha no Cinto'],
        bodyStateDescription: 'Cintura recua significativamente, articulações leves, caminhada com menor impacto.',
      },
      {
        level: 4,
        name: 'Ativação Metabólica',
        weightKg: 74.0,
        bodyFatPct: 32.0,
        muscleMassPct: 28.2,
        waistCm: 89,
        chestOrHipCm: 106,
        hudDisplay: '74.0 kg',
        hudSubtext: 'BF: 32% • 89cm',
        badge: 'Metabolismo Turbo',
        badgeColor: '#22c55e',
        icon: 'leaf_eco',
        quote: 'Queima contínua ativada! Cada refeição limpa protege o tônus e queima gordura!',
        unlockedCosmetics: ['Top com Costura Reforçada', 'Tênis de Treino Pro'],
        bodyStateDescription: 'Curvatura do abdômen retrai, cintura rompe abaixo dos 90cm, tônus nas coxas visível.',
      },
      {
        level: 5,
        name: 'Fronteira da Saúde (Saída Risco)',
        weightKg: 71.0,
        bodyFatPct: 29.5,
        muscleMassPct: 29.0,
        waistCm: 85,
        chestOrHipCm: 104,
        hudDisplay: '71.0 kg',
        hudSubtext: 'BF: 29.5% • 85cm',
        badge: 'Coração de Gaia',
        badgeColor: '#ec4899',
        icon: 'heart_shield',
        quote: 'Saímos da faixa de risco severo! Coração protegido e medidas caindo com elegância!',
        unlockedCosmetics: ['Insígnia Coração de Gaia', 'Luvas Berry com Frisos Ouro Rosa'],
        bodyStateDescription: 'Ponto de inflexão clínica: queda de 11kg, postura esguia, ombros e trapézio desenhados.',
      },
      {
        level: 6,
        name: 'Cintura de Ampulheta (< 80cm)',
        weightKg: 68.0,
        bodyFatPct: 27.0,
        muscleMassPct: 29.8,
        waistCm: 79,
        chestOrHipCm: 102,
        hudDisplay: '68.0 kg',
        hudSubtext: 'CINTURA < 80cm • ZONA VERDE',
        badge: 'Zona Segura ABESO',
        badgeColor: '#06b6d4',
        icon: 'lightning_cyan',
        quote: 'Cintura abaixo de 80 cm! Proteção cardiovascular nível ouro pela ABESO!',
        unlockedCosmetics: ['Biker Short de Compressão Esmeralda'],
        bodyStateDescription: 'Silhueta em ampulheta evidente, abdômen plano, redução drástica de gordura visceral.',
      },
      {
        level: 7,
        name: 'Silhueta Esculpida',
        weightKg: 65.0,
        bodyFatPct: 24.0,
        muscleMassPct: 30.8,
        waistCm: 75,
        chestOrHipCm: 100,
        hudDisplay: '65.0 kg',
        hudSubtext: 'BF: 24% • 75cm',
        badge: 'V-Taper Feminino',
        badgeColor: '#8b5cf6',
        icon: 'flame_neon',
        quote: 'A cintura afinou e as pernas ganharam desenho e tônus! Curvas atléticas de respeito!',
        unlockedCosmetics: ['Tênis Edição Especial Turbo'],
        bodyStateDescription: 'Dorsais abrem harmonia com a cintura, pernas e panturrilhas com tônus firme e atlético.',
      },
      {
        level: 8,
        name: 'Linhas de Definição (11-Line Abs)',
        weightKg: 62.5,
        bodyFatPct: 21.0,
        muscleMassPct: 31.8,
        waistCm: 72,
        chestOrHipCm: 98,
        hudDisplay: '62.5 kg',
        hudSubtext: 'BF: 21% • 72cm',
        badge: 'Definição Plena',
        badgeColor: '#e2e8f0',
        icon: 'medal_silver',
        quote: 'As linhas do abdômen despontaram! Tônus e firmeza esculpidos com comida de verdade!',
        unlockedCosmetics: ['Faixa Grafite Elite', 'Top Preto Carbono'],
        bodyStateDescription: 'Linha Alba e contornos laterais abdominais desenhados, ombros firmes e postura altiva.',
      },
      {
        level: 9,
        name: 'O Limiar do Pódio Feminino',
        weightKg: 60.0,
        bodyFatPct: 19.0,
        muscleMassPct: 32.8,
        waistCm: 69,
        chestOrHipCm: 96,
        hudDisplay: '60.0 kg',
        hudSubtext: 'BF: 19% • 69cm',
        badge: 'Pré-Campeã',
        badgeColor: '#eab308',
        icon: 'trophy_gold',
        quote: 'Estamos a um passo da coroa! Foco total e consistência de ferro nessa reta final!',
        unlockedCosmetics: ['Luvas Berry com Punhos Dourados GAIA'],
        bodyStateDescription: 'Físico atlético esbelto de alta densidade muscular e cortes limpos, elegância natural.',
      },
      {
        level: 10,
        name: 'Gaia Campeã Suprema',
        weightKg: 58.0,
        bodyFatPct: 17.5,
        muscleMassPct: 34.0,
        waistCm: 67,
        chestOrHipCm: 95,
        hudDisplay: '58.0 kg',
        hudSubtext: 'FORMA CAMPEÃ • ESTRELA OURO',
        badge: 'Campeã Soberana',
        badgeColor: '#facc15',
        icon: 'star_gold',
        quote: 'Coroa de louros merecida! Transformação plena, saúde de ferro e beleza radiante!',
        unlockedCosmetics: ['Tiara de Louros com Esmeralda', 'Pódio de Campeã', 'Aura Cósmica'],
        bodyStateDescription: 'Mulher definida, linda, 11-line abs esculpido, 100% humana sem nenhuma peça robótica.',
      },
    ];
    return gaiaList.map((m) => ({ ...m, assetKey: `${prefix}${m.level}` }));
  }

  // Titã
  const titaList: Omit<DetailedMilestone, 'assetKey'>[] = [
    {
      level: 1,
      name: 'O Despertar do Peso-Pesado',
      weightKg: 92.5,
      bodyFatPct: 33.2,
      muscleMassPct: 29.5,
      waistCm: 104,
      chestOrHipCm: 116,
      hudDisplay: '92.5 kg',
      hudSubtext: 'BF: 33.2% • 104cm',
      badge: 'Aquecimento Pesado',
      badgeColor: '#ef4444',
      icon: 'gauge_red',
      quote: 'Aqui é peso-pesado! Vamos derreter essa camada na balança com garra total!',
      unlockedCosmetics: ['Faixa Vermelha', 'Toalha no Ombro', 'Luvas Vermelhas Clássicas'],
      bodyStateDescription: 'Tronco esférico, retenção hídrica severa, esforço visível e garra no olhar.',
    },
    {
      level: 2,
      name: 'Quebra da Retenção',
      weightKg: 90.0,
      bodyFatPct: 31.0,
      muscleMassPct: 30.2,
      waistCm: 101,
      chestOrHipCm: 114,
      hudDisplay: '90.0 kg',
      hudSubtext: 'BF: 31% • 101cm',
      badge: 'Retenção Zero',
      badgeColor: '#f59e0b',
      icon: 'gauge_yellow',
      quote: 'Primeiros quilos de água eliminados! Rosto desinchando e guarda levantada!',
      unlockedCosmetics: ['Toalha nos Ombros (Boxeador)', 'Bermuda Verde Tradicional'],
      bodyStateDescription: 'Rosto desinchando, postura firme, sorriso confiante e guarda levantada.',
    },
    {
      level: 3,
      name: 'Desinchaço Notável',
      weightKg: 88.0,
      bodyFatPct: 29.0,
      muscleMassPct: 31.2,
      waistCm: 99,
      chestOrHipCm: 112,
      hudDisplay: '88.0 kg',
      hudSubtext: 'BF: 29% • 99cm',
      badge: 'Alívio Articular',
      badgeColor: '#f97316',
      icon: 'flame_amber',
      quote: 'Queima ativa ligada! A toalha foi pro cinto e as articulações tão mais leves!',
      unlockedCosmetics: ['Toalha no Cinto', 'Faixa Verde de Treino'],
      bodyStateDescription: 'Cintura rompe barreira dos 100cm, alívio nas articulações dos joelhos.',
    },
    {
      level: 4,
      name: 'Transição & Queima Ativa',
      weightKg: 84.1,
      bodyFatPct: 24.8,
      muscleMassPct: 33.1,
      waistCm: 94,
      chestOrHipCm: 109,
      hudDisplay: '84.1 kg',
      hudSubtext: 'BF: 24.8% • 94cm',
      badge: 'Queima Constante',
      badgeColor: '#22c55e',
      icon: 'leaf_eco',
      quote: 'Menos volume na balança e postura de combate! O inchaço sumiu de vez!',
      unlockedCosmetics: ['Bermuda com Costura Reforçada', 'Tênis de Treino Pro'],
      bodyStateDescription: 'Abdômen recuado, umbigo visível, tônus muscular evidente nos braços.',
    },
    {
      level: 5,
      name: 'Fronteira da Saúde',
      weightKg: 82.0,
      bodyFatPct: 23.0,
      muscleMassPct: 33.8,
      waistCm: 92,
      chestOrHipCm: 107,
      hudDisplay: '82.0 kg',
      hudSubtext: 'BF: 23% • 92cm',
      badge: 'Coração de Titã',
      badgeColor: '#ec4899',
      icon: 'heart_shield',
      quote: 'Queda de risco severo! Coração blindado e medidas descendo a cada pesagem!',
      unlockedCosmetics: ['Insígnia Coração de Titã no Peitoral'],
      bodyStateDescription: 'Queda de 10kg, peitoral ganha formato atlético quadrado, postura ereta.',
    },
    {
      level: 6,
      name: 'Cintura de Aço (Zona ABESO)',
      weightKg: 80.0,
      bodyFatPct: 21.0,
      muscleMassPct: 34.8,
      waistCm: 89,
      chestOrHipCm: 105,
      hudDisplay: '80.0 kg',
      hudSubtext: 'CINTURA < 90cm • ZONA VERDE',
      badge: 'Cintura Segura',
      badgeColor: '#06b6d4',
      icon: 'lightning_cyan',
      quote: 'Cintura abaixo de 90 cm! Saímos oficialmente da zona de perigo cardiovascular!',
      unlockedCosmetics: ['Luvas com Faixas de Fibra de Carbono'],
      bodyStateDescription: 'Cintura < 90cm (saída oficial do risco coronariano alto segundo a ABESO).',
    },
    {
      level: 7,
      name: 'Aceleração & V-Taper',
      weightKg: 77.0,
      bodyFatPct: 18.5,
      muscleMassPct: 35.8,
      waistCm: 85,
      chestOrHipCm: 106,
      hudDisplay: '77.0 kg',
      hudSubtext: 'BF: 18.5% • 85cm',
      badge: 'V-Taper Ativo',
      badgeColor: '#8b5cf6',
      icon: 'flame_neon',
      quote: 'Ombros largos e cintura fina! O tronco em V tá aparecendo com força!',
      unlockedCosmetics: ['Tênis Edição Corrida Turbo'],
      bodyStateDescription: 'V-Taper evidente, ombros largos e cintura fina se destacando.',
    },
    {
      level: 8,
      name: 'Primeiros Cortes',
      weightKg: 74.0,
      bodyFatPct: 15.0,
      muscleMassPct: 36.8,
      waistCm: 81,
      chestOrHipCm: 107,
      hudDisplay: '74.0 kg',
      hudSubtext: 'BF: 15% • 81cm',
      badge: 'Definição Inicial',
      badgeColor: '#e2e8f0',
      icon: 'medal_silver',
      quote: 'Linha Alba e oblíquos marcando! A musculatura tá rasgando a gordura!',
      unlockedCosmetics: ['Faixa Grafite Elite', 'Luvas com Friso Dourado'],
      bodyStateDescription: 'Linha Alba visível, topo dos 4 gomos e oblíquos marcando na pele.',
    },
    {
      level: 9,
      name: 'O Limiar do Pódio',
      weightKg: 72.0,
      bodyFatPct: 13.5,
      muscleMassPct: 37.5,
      waistCm: 78,
      chestOrHipCm: 107,
      hudDisplay: '72.0 kg',
      hudSubtext: 'BF: 13.5% • 78cm',
      badge: 'Pré-Campeão',
      badgeColor: '#eab308',
      icon: 'trophy_gold',
      quote: 'Quase no topo do pódio! Falta só um ajuste fino pra coroar esse shape!',
      unlockedCosmetics: ['Luvas com Punhos Dourados'],
      bodyStateDescription: 'Six-pack quase pleno, separação nítida de deltóides e quadríceps.',
    },
    {
      level: 10,
      name: 'Campeão Titânico Supremo',
      weightKg: 70.0,
      bodyFatPct: 12.5,
      muscleMassPct: 38.0,
      waistCm: 76,
      chestOrHipCm: 108,
      hudDisplay: '70.0 kg',
      hudSubtext: 'FORMA CAMPEÃ • ESTRELA OURO',
      badge: 'Forma Lendária',
      badgeColor: '#facc15',
      icon: 'star_gold',
      quote: 'Shape blindado de campeão lendário! Peso cravado e saúde no topo do mundo!',
      unlockedCosmetics: ['Tiara Dourada', 'Fundo Holográfico Campeão', 'Aura Dourada'],
      bodyStateDescription: 'Six-pack trincado, definição muscular plena, padrão de ouro estético e clínico.',
    },
  ];
  return titaList.map((m) => ({ ...m, assetKey: `${prefix}${m.level}` }));
}

export interface GainScenarioEvaluation {
  scenarioKey: 'water_retention' | 'caloric_rebound' | 'clean_hypertrophy';
  title: string;
  cause: string;
  hudDisplay: string;
  hudSubtext: string;
  quote: string;
  recommendation: string;
  icon: string;
  badgeColor: string;
  weightDeltaKg: number;
  assetKey: string;
}

/**
 * Avalia o cenário clínico de ganho de peso (retenção hídrica/TPM, rebote ou hipertrofia).
 */
export function evaluateGainScenario(
  mascotId: MascotId,
  currentWeightKg: number,
  weightDeltaKg: number,
  fatDeltaPct?: number | null,
  muscleDeltaPct?: number | null,
  waistDeltaCm?: number | null
): GainScenarioEvaluation {
  const isGain = weightDeltaKg > 0;
  const isWater = fatDeltaPct !== null && fatDeltaPct !== undefined && fatDeltaPct <= 0.1 && (muscleDeltaPct === null || muscleDeltaPct === undefined || muscleDeltaPct >= 0);
  const isHypertrophy = muscleDeltaPct !== null && muscleDeltaPct !== undefined && muscleDeltaPct > 0.4 && (fatDeltaPct === null || fatDeltaPct === undefined || fatDeltaPct <= 0.2);

  if (isHypertrophy) {
    if (mascotId === 'gaia') {
      return {
        scenarioKey: 'clean_hypertrophy',
        title: 'Hipertrofia Fit: Glúteos & Pernas de Rocha',
        cause: 'Treino de força com sobrecarga e aporte proteico, elevando a massa magra sem aumento de gordura.',
        hudDisplay: `${currentWeightKg.toFixed(1)} kg`,
        hudSubtext: 'MÚSCULO PURO • GLÚTEOS DE ROCHA',
        quote: 'A balança subiu porque construímos pernas e glúteos de rocha! Cintura fina preservada e tônus de aço!',
        recommendation: 'Mantenha o superávit calórico controlado (+200 kcal) e priorize o descanso reparador.',
        icon: 'shield_emerald_dumbbell',
        badgeColor: '#10b981',
        weightDeltaKg,
        assetKey: 'gaia_gain_hypertrophy',
      };
    }
    return {
      scenarioKey: 'clean_hypertrophy',
      title: 'Hipertrofia Titânica: Armadura de Aço',
      cause: 'Treino pesado de força com superávit calórico limpo, construindo massa magra densa.',
      hudDisplay: `${currentWeightKg.toFixed(1)} kg`,
      hudSubtext: 'ARMADURA DE AÇO • BULKING LIMPO',
      quote: 'Massa muscular no teto! A balança subiu porque construímos uma blindagem de campeão!',
      recommendation: 'Consuma 2.0g/kg de proteína e continue a progressão de cargas no treino.',
      icon: 'shield_gold_dumbbell',
      badgeColor: '#eab308',
      weightDeltaKg,
      assetKey: 'tita_gain_hypertrophy',
    };
  }

  if (isWater || (!fatDeltaPct && weightDeltaKg <= 2.2)) {
    if (mascotId === 'gaia') {
      return {
        scenarioKey: 'water_retention',
        title: 'Retenção Hormonal da Fase Lútea (TPM)',
        cause: 'Flutuação hormonal transitória de estrogênio e progesterona retendo sódio e líquidos.',
        hudDisplay: `${currentWeightKg.toFixed(1)} kg`,
        hudSubtext: 'RETENÇÃO HORMONAL • BEBA 3L',
        quote: 'Meninas, TPM e retenção são pura oscilação hormonal transitória! Não pire na balança: muita água, chá e foco que passa em 48h!',
        recommendation: 'Aumente a ingestão de água para 3L/dia, consuma chás diuréticos suaves e evite excesso de sal.',
        icon: 'water_droplets',
        badgeColor: '#38bdf8',
        weightDeltaKg,
        assetKey: 'gaia_gain_water',
      };
    }
    return {
      scenarioKey: 'water_retention',
      title: 'Retenção Hídrica Transitória',
      cause: 'Excesso pontual de sódio ou reposição de glicogênio muscular pós-treino retendo água.',
      hudDisplay: `${currentWeightKg.toFixed(1)} kg`,
      hudSubtext: 'RETENÇÃO HÍDRICA • BEBA 3L',
      quote: 'Tomamos um golpe de água na balança (+1.5kg)! Não é gordura: beba 3L d\'água agora que o inchaço sai no suor!',
      recommendation: 'Beba 500ml de água imediatamente e retome as refeições limpas.',
      icon: 'water_droplets',
      badgeColor: '#38bdf8',
      weightDeltaKg,
      assetKey: 'tita_gain_water',
    };
  }

  // Rebote Adiposo / Deslize Severo
  if (mascotId === 'gaia') {
    return {
      scenarioKey: 'caloric_rebound',
      title: 'Alerta de Resgate da Guerreira',
      cause: 'Superávit calórico prolongado com acúmulo de gordura e aumento de medidas na cintura.',
      hudDisplay: `${currentWeightKg.toFixed(1)} kg`,
      hudSubtext: 'ALERTA DE RESGATE • FOCO LIMPO',
      quote: 'Deslizes acontecem, mas nós somos guerreiras! Coloque o top, amarre o cabelo e vamos reconquistar cada centímetro!',
      recommendation: 'Nada de passar fome ou jejuns malucos. Volte ao plano de refeições limpas e caminhe 8.000 passos hoje.',
      icon: 'alert_triangle',
      badgeColor: '#f97316',
      weightDeltaKg,
      assetKey: 'gaia_gain_rebound',
    };
  }
  return {
    scenarioKey: 'caloric_rebound',
    title: 'Alerta de Resgate do Titã',
    cause: 'Sequência de excessos calóricos com elevação de percentual de gordura e circunferência abdominal.',
    hudDisplay: `${currentWeightKg.toFixed(1)} kg`,
    hudSubtext: 'ALERTA DE RESGATE • GUARDA ALTA',
    quote: 'Levanta essa guarda, guerreiro! Um round perdido não encerra a luta. Sacode a poeira e bora pra cima!',
    recommendation: 'Volte ao déficit calórico controlado e faça uma sessão aeróbica para queimar o excedente.',
    icon: 'alert_triangle',
    badgeColor: '#ef4444',
    weightDeltaKg,
    assetKey: 'tita_gain_rebound',
  };
}

export interface HypertrophyMilestone {
  levelCode: string;
  name: string;
  weightKg: number;
  muscleMassPct: number;
  bodyFatPct: number;
  waistCm: number;
  chestOrHipCm: number;
  hudDisplay: string;
  badge: string;
  badgeColor: string;
  quote: string;
  assetKey: string;
  unlockedCosmetics: string[];
}

/**
 * Avalia a esteira master de hipertrofia muscular ascendente (Titã até 120kg / Gaia até 95kg).
 */
function computeHypertrophyBase(mascotId: MascotId, weightKg: number): Omit<HypertrophyMilestone, 'assetKey'> {
  if (mascotId === 'gaia') {
    if (weightKg < 64.0) {
      return {
        levelCode: 'GH1',
        name: 'Bikini Fitness Esculpida',
        weightKg: 62.0,
        muscleMassPct: 33.0,
        bodyFatPct: 18.0,
        waistCm: 68,
        chestOrHipCm: 98,
        hudDisplay: '62.0 kg',
        badge: 'Bikini Fitness',
        badgeColor: '#10b981',
        quote: 'Cintura finíssima e musculatura modelada como escultura! Harmonia total.',
        unlockedCosmetics: ['Top Berry Clássico', 'Faixa Verde Esmeralda'],
      };
    } else if (weightKg < 68.0) {
      return {
        levelCode: 'GH2',
        name: 'Curves & Tone',
        weightKg: 66.0,
        muscleMassPct: 34.2,
        bodyFatPct: 18.8,
        waistCm: 70,
        chestOrHipCm: 101,
        hudDisplay: '66.0 kg',
        badge: 'Curves & Tone',
        badgeColor: '#06b6d4',
        quote: 'Curvas firmes e tônus denso! Cada repetição construiu esse contorno.',
        unlockedCosmetics: ['Munhequeiras Ouro Rosa'],
      };
    } else if (weightKg < 72.0) {
      return {
        levelCode: 'GH3',
        name: 'Wellness Athletic',
        weightKg: 70.0,
        muscleMassPct: 35.5,
        bodyFatPct: 19.5,
        waistCm: 72,
        chestOrHipCm: 105,
        hudDisplay: '70.0 kg',
        badge: 'Wellness Athletic',
        badgeColor: '#8b5cf6',
        quote: 'Padrão Wellness de respeito: membros inferiores imponentes e cintura sob controle.',
        unlockedCosmetics: ['Luvas Berry com Frisos Ouro Rosa'],
      };
    } else if (weightKg < 77.0) {
      return {
        levelCode: 'GH4',
        name: 'Glúteos & Pernas de Titânio',
        weightKg: 75.0,
        muscleMassPct: 37.0,
        bodyFatPct: 20.2,
        waistCm: 74,
        chestOrHipCm: 109,
        hudDisplay: '75.0 kg',
        badge: 'Pernas de Titânio',
        badgeColor: '#ec4899',
        quote: 'Potência pura no agachamento! Pernas e glúteos densos de titânio puro.',
        unlockedCosmetics: ['Cinto de Couro para Agachamento Pesado'],
      };
    } else if (weightKg < 82.0) {
      return {
        levelCode: 'GH5',
        name: 'Heavyweight Wellness',
        weightKg: 80.0,
        muscleMassPct: 38.5,
        bodyFatPct: 21.0,
        waistCm: 76,
        chestOrHipCm: 114,
        hudDisplay: '80.0 kg',
        badge: 'Heavyweight Wellness',
        badgeColor: '#f59e0b',
        quote: 'Massa muscular densa no topo da categoria! Força e imponência na arena.',
        unlockedCosmetics: ['Manoplas de Aço Escovado Femininas'],
      };
    } else if (weightKg < 87.0) {
      return {
        levelCode: 'GH6',
        name: 'Powerlifter Guerreira',
        weightKg: 85.0,
        muscleMassPct: 40.0,
        bodyFatPct: 21.8,
        waistCm: 78,
        chestOrHipCm: 118,
        hudDisplay: '85.0 kg',
        badge: 'Powerlifter Elite',
        badgeColor: '#f97316',
        quote: 'Força bruta sem limites! O terra e o agachamento dobram a barra.',
        unlockedCosmetics: ['Faixas de Joelho de Competição'],
      };
    } else if (weightKg < 92.0) {
      return {
        levelCode: 'GH7',
        name: 'Strongwoman de Elite',
        weightKg: 90.0,
        muscleMassPct: 41.5,
        bodyFatPct: 22.2,
        waistCm: 80,
        chestOrHipCm: 122,
        hudDisplay: '90.0 kg',
        badge: 'Strongwoman Elite',
        badgeColor: '#e11d48',
        quote: 'Erguendo pedras e quebrando recordes mundiais! Força incomparável.',
        unlockedCosmetics: ['Cinto Powerlifting Titânico Feminino'],
      };
    } else {
      return {
        levelCode: 'GH8',
        name: 'A Valquíria Suprema',
        weightKg: 95.0,
        muscleMassPct: 43.5,
        bodyFatPct: 22.5,
        waistCm: 82,
        chestOrHipCm: 126,
        hudDisplay: '95.0 kg',
        badge: 'Valquíria Suprema',
        badgeColor: '#facc15',
        quote: 'A Deusa da Força e da Batalha! Transformação mitológica com armadura de ouro e esmeralda!',
        unlockedCosmetics: ['Armadura de Valquíria Dourada & Esmeralda', 'Cinturão Titan Championship', 'Aura Cósmica'],
      };
    }
  }

  // Titã
  if (weightKg < 78.0) {
    return {
      levelCode: 'H1',
      name: 'Estética Clássica (Men\'s)',
      weightKg: 75.0,
      muscleMassPct: 38.5,
      bodyFatPct: 12.0,
      waistCm: 78,
      chestOrHipCm: 108,
      hudDisplay: '75.0 kg',
      badge: 'Estética Clássica',
      badgeColor: '#10b981',
      quote: 'Linhas clássicas do fisiculturismo de ouro! Cintura fina e peitoral desenhado.',
      unlockedCosmetics: ['Faixa Verde', 'Luvas Vermelhas Tradicionais'],
    };
  } else if (weightKg < 83.0) {
    return {
      levelCode: 'H2',
      name: 'Densidade em V (Classic)',
      weightKg: 80.0,
      muscleMassPct: 39.5,
      bodyFatPct: 13.5,
      waistCm: 82,
      chestOrHipCm: 114,
      hudDisplay: '80.0 kg',
      badge: 'Densidade em V',
      badgeColor: '#06b6d4',
      quote: 'Costas largas como asas e braços densos! O V-Taper tá imponente.',
      unlockedCosmetics: ['Luvas com Faixas Metálicas', 'Munhequeiras'],
    };
  } else if (weightKg < 89.0) {
    return {
      levelCode: 'H3',
      name: 'Hipertrofia Titânica',
      weightKg: 86.0,
      muscleMassPct: 40.5,
      bodyFatPct: 15.0,
      waistCm: 86,
      chestOrHipCm: 119,
      hudDisplay: '86.0 kg',
      badge: 'Hipertrofia Titânica',
      badgeColor: '#eab308',
      quote: 'Massa muscular maciça construída com ferro e comida de verdade!',
      unlockedCosmetics: ['Luvas Blindadas em Ouro', 'Bermuda com Friso Dourado'],
    };
  } else if (weightKg < 96.0) {
    return {
      levelCode: 'H4',
      name: 'Heavyweight Maromba',
      weightKg: 92.0,
      muscleMassPct: 42.5,
      bodyFatPct: 15.5,
      waistCm: 87,
      chestOrHipCm: 124,
      hudDisplay: '92.0 kg',
      badge: 'Heavyweight Maromba',
      badgeColor: '#f59e0b',
      quote: 'Mais de 90kg com corte muscular aparente! Categoria peso-pesado respeitada.',
      unlockedCosmetics: ['Cinto de Couro de Levantamento de Peso'],
    };
  } else if (weightKg < 104.0) {
    return {
      levelCode: 'H5',
      name: 'O Juggernaut dos Ferros',
      weightKg: 100.0,
      muscleMassPct: 44.5,
      bodyFatPct: 15.0,
      waistCm: 88,
      chestOrHipCm: 128,
      hudDisplay: '100.0 kg',
      badge: 'Juggernaut dos Ferros',
      badgeColor: '#ef4444',
      quote: 'Três dígitos na balança com cintura blindada! Uma força incontrolável.',
      unlockedCosmetics: ['Cinto Powerlifting Titânico', 'Ombros Esféricos'],
    };
  } else if (weightKg < 111.0) {
    return {
      levelCode: 'H6',
      name: 'Brutalidade Muscular',
      weightKg: 108.0,
      muscleMassPct: 46.0,
      bodyFatPct: 16.0,
      waistCm: 91,
      chestOrHipCm: 133,
      hudDisplay: '108.0 kg',
      badge: 'Brutalidade Muscular',
      badgeColor: '#dc2626',
      quote: 'Pernas tronco de árvore e dorsais que cobrem a arena! Brutalidade pura.',
      unlockedCosmetics: ['Manoplas de Aço Escovado'],
    };
  } else if (weightKg < 117.0) {
    return {
      levelCode: 'H7',
      name: 'Strongman Titânico',
      weightKg: 114.0,
      muscleMassPct: 47.0,
      bodyFatPct: 16.5,
      waistCm: 93,
      chestOrHipCm: 137,
      hudDisplay: '114.0 kg',
      badge: 'Strongman Titânico',
      badgeColor: '#991b1b',
      quote: 'Trapézio colado na orelha e força de tempestade! Ninguém segura esse Titã.',
      unlockedCosmetics: ['Trapézio Colossal', 'Fundo de Arena de Força'],
    };
  } else {
    return {
      levelCode: 'H8',
      name: 'O Colosso Lendário',
      weightKg: 120.0,
      muscleMassPct: 48.5,
      bodyFatPct: 16.5,
      waistCm: 94,
      chestOrHipCm: 142,
      hudDisplay: '120.0 kg',
      badge: 'Colosso Lendário',
      badgeColor: '#facc15',
      quote: 'O ápice da força universal! Cinturão Titan Championship e aura dourada divina!',
      unlockedCosmetics: ['Cinturão Titan Championship', 'Manoplas Rúnicas', 'Aura Dourada'],
    };
  }
}

export function evaluateHypertrophyLadder(mascotId: MascotId, weightKg: number): HypertrophyMilestone {
  const base = computeHypertrophyBase(mascotId, weightKg);
  let assetKey = mascotId === 'gaia' ? 'gaia_gain_hypertrophy' : 'tita_gain_hypertrophy';
  if (mascotId === 'gaia') {
    if (base.levelCode === 'GH8') assetKey = 'gaia_m10';
  } else {
    if (base.levelCode === 'H5' || base.levelCode === 'H6') assetKey = 'tita_h_juggernaut';
    else if (base.levelCode === 'H7' || base.levelCode === 'H8') assetKey = 'tita_h_colosso';
  }
  return { ...base, assetKey };
}

/**
 * Avalia o mascote ativo do usuário e calcula seu arquétipo corporal dinâmico,
 * seus estágios evolutivos e a perda de peso/medidas corporais.
 */
export function evaluateMascot(input: MascotInput): MascotEvaluation {
  const safeInput = input || ({} as any);
  const sex: BiologicalSex = safeInput.sex === 'female' || safeInput.mascotId === 'gaia' ? 'female' : 'male';
  const mascotId: MascotId = safeInput.mascotId === 'gaia' ? 'gaia' : 'tita';
  const mascotName = mascotId === 'gaia' ? 'Gaia' : 'Titã';

  const rawWeight = Number(safeInput.weightKg);
  const weight = !isNaN(rawWeight) && isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 70.0;
  const rawHeight = Number(safeInput.heightCm);
  const height = !isNaN(rawHeight) && isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 170.0;
  const heightM = height > 0 ? height / 100 : 1.7;
  const bmiRaw = heightM > 0 && weight > 0 ? (weight / (heightM * heightM)) : 24.0;
  const bmi = isFinite(bmiRaw) && bmiRaw > 0 ? Math.round(bmiRaw * 10) / 10 : 24.0;

  const rawFat = safeInput.bodyFatPct !== undefined && safeInput.bodyFatPct !== null ? Number(safeInput.bodyFatPct) : undefined;
  const fatPct = rawFat !== undefined && !isNaN(rawFat) && isFinite(rawFat) && rawFat >= 0 ? Math.min(80, rawFat) : undefined;
  const rawMuscle = safeInput.muscleMassPct !== undefined && safeInput.muscleMassPct !== null ? Number(safeInput.muscleMassPct) : undefined;
  const musclePct = rawMuscle !== undefined && !isNaN(rawMuscle) && isFinite(rawMuscle) && rawMuscle >= 0 ? Math.min(95, rawMuscle) : undefined;

  // 1. Cálculo do Peso Meta e Diferencial
  const targetWeightKg = Math.round(23.5 * heightM * heightM * 10) / 10;
  const weightDeltaKg = Math.round((weight - targetWeightKg) * 10) / 10;

  // 2. Métricas de Perda de Peso & Redução de Medidas Corporais
  const rawInitWeight = Number(safeInput.initialWeightKg);
  const initialWeight = !isNaN(rawInitWeight) && isFinite(rawInitWeight) && rawInitWeight > 0 ? rawInitWeight : weight;
  const weightLostKg = Math.round(Math.max(0, initialWeight - weight) * 10) / 10;

  // Variação de gordura corporal
  let fatLostPct: number | null = null;
  if (input.initialBodyFatPct !== undefined && input.initialBodyFatPct !== null && fatPct !== undefined && fatPct !== null) {
    fatLostPct = Math.round((input.initialBodyFatPct - fatPct) * 10) / 10;
  }

  // Variação de massa muscular
  let muscleDeltaPct: number | null = null;
  if (input.initialMuscleMassPct !== undefined && input.initialMuscleMassPct !== null && musclePct !== undefined && musclePct !== null) {
    muscleDeltaPct = Math.round((musclePct - input.initialMuscleMassPct) * 10) / 10;
  }

  // Medidas de cintura reduzidas (aferidas ou estimadas antropometricamente pela ABESO: ~0.9cm por kg de gordura)
  let waistLostCm: number | null = null;
  if (input.initialWaistCm && input.waistCm) {
    waistLostCm = Math.round(Math.max(0, input.initialWaistCm - input.waistCm) * 10) / 10;
  } else if (weightLostKg > 0) {
    waistLostCm = Math.round((weightLostKg * 0.9) * 10) / 10;
  }

  // 3. Determinação Científica do Arquétipo de Bioimpedância
  // Considera tanto o estado estático quanto a trajetória metabólica (peso caiu + músculo caiu / gordura subiu = flácido)
  let archetype: MascotArchetype = 'athletic';

  // Detecção do Fenômeno "Falso Magro / Flácido" (Catabolismo por má alimentação)
  const isLosingMuscleWhileDieting = weightLostKg > 0.8 && ((fatLostPct !== null && fatLostPct < -0.3) || (muscleDeltaPct !== null && muscleDeltaPct < -0.8));
  const isStaticSkinnyFat = fatPct !== undefined && fatPct !== null && musclePct !== undefined && musclePct !== null &&
    fatPct >= (sex === 'female' ? 28.0 : 21.0) &&
    musclePct < (sex === 'female' ? 28.0 : 33.0) &&
    bmi < 26.5;

  if (isLosingMuscleWhileDieting || isStaticSkinnyFat) {
    archetype = 'skinny_fat';
  } else if (fatPct !== undefined && fatPct !== null && fatPct > 0) {
    // Critérios clínicos de corte por sexo biológico (SBMEE / ACSM / ABESO)
    const isExtremeFat = sex === 'female' ? fatPct >= 38.0 || bmi >= 34.0 : fatPct >= 31.0 || bmi >= 34.0;
    const isHighFat = sex === 'female' ? fatPct >= 31.0 : fatPct >= 24.0;
    const isExtremeLow = bmi < 18.5 || (fatPct < (sex === 'female' ? 16.0 : 10.0) && (!musclePct || musclePct < (sex === 'female' ? 26.0 : 31.0)));
    const isLowFat = sex === 'female' ? fatPct < 20.0 : fatPct < 13.0;
    const isHighMuscle = musclePct ? (sex === 'female' ? musclePct >= 32.0 : musclePct >= 38.0) : false;

    if (isExtremeFat) {
      archetype = 'extreme_obese';
    } else if (isHighFat) {
      archetype = 'robust';
    } else if (isHighMuscle && !isHighFat) {
      archetype = 'muscular';
    } else if (isExtremeLow) {
      archetype = 'extreme_lean';
    } else if (isLowFat && (!musclePct || musclePct < (sex === 'female' ? 28 : 34))) {
      archetype = 'lean';
    } else {
      archetype = 'athletic';
    }
  } else {
    // Fallback por IMC (quando o usuário ainda não registrou balança de bioimpedância)
    if (bmi >= 34.0) {
      archetype = 'extreme_obese';
    } else if (bmi >= 27.0) {
      archetype = 'robust';
    } else if (bmi < 18.5) {
      archetype = 'extreme_lean';
    } else if (bmi < 20.5) {
      archetype = 'lean';
    } else {
      archetype = 'athletic';
    }
  }

  // 4. Progresso de Transformação Corporal (0% a 100%)
  let progressPercentage = 50;
  if (initialWeight > targetWeightKg) {
    const totalToLose = initialWeight - targetWeightKg;
    const currentLost = initialWeight - weight;
    if (totalToLose > 0) {
      progressPercentage = Math.min(Math.max(Math.round((currentLost / totalToLose) * 100), 0), 100);
    }
  } else if (archetype === 'athletic' || archetype === 'muscular') {
    progressPercentage = 95;
  } else if (archetype === 'robust' || archetype === 'extreme_obese') {
    progressPercentage = 25;
  } else if (archetype === 'skinny_fat') {
    progressPercentage = 40;
  } else {
    progressPercentage = 45;
  }

  // 5. Determinação do Estágio Evolutivo da Transformação (Fases 1 a 5)
  let stageLevel = 1;
  let stageName = '';
  let stageDescription = '';
  let nextMilestone = '';

  if (progressPercentage < 20) {
    stageLevel = 1;
    stageName = mascotId === 'tita' ? 'Fase 1: Titã no Aquecimento Inicial' : 'Fase 1: Gaia na Linha de Partida';
    stageDescription = 'Início da jornada! Seu personagem está concentrado na balança para ativar a queima metabólica.';
    nextMilestone = 'Perca os primeiros 1.5 kg para desbloquear a Fase 2 de Queima Ativa!';
  } else if (progressPercentage < 45) {
    stageLevel = 2;
    stageName = mascotId === 'tita' ? 'Fase 2: Queima Ativa de Gordura' : 'Fase 2: Ativação Metabólica';
    stageDescription = 'Metabolismo turbinado! O inchaço diminuiu e a gordura corporal começou a derreter.';
    nextMilestone = 'Continue firme na dieta para notar suas roupas visivelmente mais folgadas!';
  } else if (progressPercentage < 70) {
    stageLevel = 3;
    stageName = mascotId === 'tita' ? 'Fase 3: Medidas Caindo na Fita' : 'Fase 3: Silhueta em Transformação';
    stageDescription = 'Redução visível de medidas na cintura e tronco! Seu personagem está afinando e secando.';
    nextMilestone = 'Mantenha o déficit para revelar a definição muscular na Fase 4!';
  } else if (progressPercentage < 95) {
    stageLevel = 4;
    stageName = mascotId === 'tita' ? 'Fase 4: Shape Seco & Definido' : 'Fase 4: Forma Esculpida & Tonificada';
    stageDescription = 'Baixo percentual de gordura e musculatura destacada. Seu mascote está quase no topo!';
    nextMilestone = 'Faltam poucos quilos e medidas para conquistar a Forma Campeã!';
  } else {
    stageLevel = 5;
    stageName = mascotId === 'tita' ? 'Fase 5: Titã Campeão Lendário' : 'Fase 5: Gaia Forma Campeã Suprema';
    stageDescription = 'Transformação plena alcançada! Peso, composição e medidas corporais no padrão de ouro da saúde!';
    nextMilestone = 'Mantenha seus hábitos saudáveis e celebre a vitória absoluta na Batalha da Balança!';
  }

  // 6. Feedback Textual Sintético de Medidas e Peso
  let measurementsFeedback = '';
  if (archetype === 'skinny_fat') {
    measurementsFeedback = 'Atenção: o peso diminuiu, mas a musculatura perdeu volume e a gordura continuou!';
  } else if (weightLostKg > 0 && waistLostCm && waistLostCm > 0) {
    measurementsFeedback = `-${weightLostKg} kg eliminados e ~${waistLostCm} cm a menos de cintura!`;
  } else if (weightLostKg > 0) {
    measurementsFeedback = `-${weightLostKg} kg eliminados desde o início da jornada!`;
  } else if (archetype === 'muscular') {
    measurementsFeedback = 'Composição hipertrófica densa com excelente massa magra!';
  } else if (archetype === 'athletic') {
    measurementsFeedback = 'Composição corporal equilibrada e medidas em dia!';
  } else {
    measurementsFeedback = 'Primeira pesagem registrada. Cada grama a menos vai transformar seu mascote!';
  }

  // 7. Mapeamento de Assets, Badges e Frases Motivacionais do Personagem
  let assetKey = `${mascotId}_${archetype}`;
  if (archetype === 'extreme_obese') assetKey = `${mascotId}_robust`;
  else if (archetype === 'extreme_lean') assetKey = `${mascotId}_lean`;
  else if (archetype === 'skinny_fat') assetKey = `${mascotId}_lean`;
  else if (mascotId === 'gaia' && archetype === 'muscular') assetKey = 'gaia_athletic';

  let badgeLabel = '';
  let badgeColor = '#22c55e';
  let flavorQuote = '';

  if (mascotId === 'tita') {
    switch (archetype) {
      case 'extreme_obese':
        badgeLabel = 'Força Bruta Pesada';
        badgeColor = '#ef4444';
        flavorQuote = 'Aqui é peso-pesado! Vamos derreter essa camada na balança com garra total!';
        break;
      case 'robust':
        badgeLabel = 'Modo Treino Pesado';
        badgeColor = '#f59e0b';
        flavorQuote = weightLostKg > 0 
          ? `Já foram embora ${weightLostKg} kg! A balança tá com medo da gente, segue firme!` 
          : 'Suor no treino hoje, medalha amanhã! Vamos derreter essa gordura na balança!';
        break;
      case 'skinny_fat':
        badgeLabel = 'Alerta de Flacidez';
        badgeColor = '#f97316';
        flavorQuote = 'O peso caiu, mas comemos mal e o músculo foi embora! Bora comer proteína e levantar peso!';
        break;
      case 'muscular':
        badgeLabel = 'Shape Blindado';
        badgeColor = '#eab308';
        flavorQuote = muscleDeltaPct && muscleDeltaPct > 0
          ? `Ganhamos +${muscleDeltaPct}% de massa muscular! Construindo uma armadura de campeão!`
          : 'Massa muscular no teto! Esse shape é construído com proteína e disciplina!';
        break;
      case 'extreme_lean':
      case 'lean':
        badgeLabel = 'Veloz & Peso-Pena';
        badgeColor = '#38bdf8';
        flavorQuote = 'Agilidade total! Cada grama de proteína ajuda a construir músculos com qualidade.';
        break;
      case 'athletic':
      default:
        badgeLabel = 'Forma Lendária';
        badgeColor = '#22c55e';
        flavorQuote = 'Constância é a nossa maior arma! O peso tá cravado e a saúde tá no topo!';
        break;
    }
  } else {
    switch (archetype) {
      case 'extreme_obese':
        badgeLabel = 'Guerreira Pesada';
        badgeColor = '#ef4444';
        flavorQuote = 'Pronta para a batalha! Vamos acelerar esse metabolismo e secar com foco total!';
        break;
      case 'robust':
        badgeLabel = 'Treino Intenso & Foco';
        badgeColor = '#f59e0b';
        flavorQuote = weightLostKg > 0
          ? `Menos ${weightLostKg} kg na balança! Minha cintura afinou e minha força só aumenta!`
          : 'Cada refeição saudável me deixa mais leve e determinada para vencer!';
        break;
      case 'skinny_fat':
        badgeLabel = 'Alerta de Flacidez';
        badgeColor = '#f97316';
        flavorQuote = 'O peso baixou na balança, mas faltou proteína! Vamos tonificar esse corpo com comida boa!';
        break;
      case 'muscular':
      case 'athletic':
        badgeLabel = 'Campeã Coroada';
        badgeColor = '#eab308';
        flavorQuote = 'Coroa de ouro merecida! Minha disciplina e minhas escolhas transformaram o meu corpo!';
        break;
      case 'extreme_lean':
      case 'lean':
      default:
        badgeLabel = 'Pura Vitalidade';
        badgeColor = '#38bdf8';
        flavorQuote = 'Leveza e precisão nos treinos! Pronta para encarar qualquer desafio na balança!';
        break;
    }
  }

  // 8. Cálculo da Morfologia Paramétrica 3D Guiada por Peso + % Gordura + % Massa Muscular
  const baselineMuscle = sex === 'female' ? 28.0 : 34.0;
  const baselineFat = sex === 'female' ? 22.0 : 16.0;

  // Estimativa clínica contínua calibrada quando o usuário ainda não possui bioimpedância
  let estimatedFat = baselineFat;
  if (!fatPct) {
    if (bmi >= 35) estimatedFat = sex === 'female' ? 42.0 : 34.0;
    else if (bmi >= 30) estimatedFat = sex === 'female' ? 36.0 : 28.0;
    else if (bmi >= 25) estimatedFat = sex === 'female' ? 29.0 : 22.0;
    else if (bmi <= 18.5) estimatedFat = sex === 'female' ? 16.0 : 10.0;
  }

  const effectiveMuscle = musclePct || baselineMuscle;
  const effectiveFat = fatPct || estimatedFat;

  const muscleDiff = effectiveMuscle - baselineMuscle;
  const fatDiff = effectiveFat - baselineFat;

  // Fator de Flacidez (0.00 a 1.00):
  // Elevado quando há catabolismo (perda de peso comendo mal/doces) ou quando a gordura é alta em relação ao músculo
  let flaccidityFactor = 0.0;
  if (archetype === 'skinny_fat') {
    flaccidityFactor = 0.85;
  } else if (archetype === 'extreme_obese') {
    flaccidityFactor = 0.65;
  } else if (archetype === 'robust') {
    flaccidityFactor = 0.40;
  } else if (archetype === 'muscular' || archetype === 'athletic') {
    flaccidityFactor = 0.05;
  } else {
    flaccidityFactor = 0.20;
  }

  // Braços: engrossam e ganham tônus conforme a massa muscular sobe. No falso magro, perdem calibre.
  let armBulk = Math.min(Math.max(Number((1.0 + muscleDiff * 0.038).toFixed(2)), 0.72), 1.55);
  if (archetype === 'skinny_fat') armBulk = Math.min(armBulk, 0.86);
  if (archetype === 'extreme_obese') armBulk = Math.max(armBulk, 1.25);
  if (archetype === 'extreme_lean') armBulk = Math.min(armBulk, 0.76);

  // Pernas: densidade com massa magra. No falso magro, afinam.
  let legBulk = Math.min(Math.max(Number((1.0 + muscleDiff * 0.026 + (weight - targetWeightKg) * 0.003).toFixed(2)), 0.75), 1.48);
  if (archetype === 'skinny_fat') legBulk = Math.min(legBulk, 0.88);
  if (archetype === 'extreme_obese') legBulk = Math.max(legBulk, 1.30);
  if (archetype === 'extreme_lean') legBulk = Math.min(legBulk, 0.78);

  // Abdômen / Barriga: no falso magro, mesmo com peso menor, a barriga continua proeminente e flácida
  let bellyVolume = Math.min(Math.max(Number((1.0 + fatDiff * 0.032).toFixed(2)), 0.65), 1.65);
  if (archetype === 'skinny_fat') bellyVolume = Math.max(bellyVolume, 1.22);
  if (archetype === 'extreme_obese') bellyVolume = Math.max(bellyVolume, 1.48);
  if (archetype === 'extreme_lean') bellyVolume = Math.min(bellyVolume, 0.72);

  // Cintura
  let waistWidth = Math.min(Math.max(Number((0.92 + fatDiff * 0.026).toFixed(2)), 0.70), 1.45);
  if (archetype === 'skinny_fat') waistWidth = Math.max(waistWidth, 1.10);
  if (archetype === 'extreme_obese') waistWidth = Math.max(waistWidth, 1.35);

  // Tórax / Ombros (V-Taper)
  let torsoWidth = Math.min(Math.max(Number((1.0 + muscleDiff * 0.030).toFixed(2)), 0.80), 1.50);
  if (archetype === 'skinny_fat') torsoWidth = Math.min(torsoWidth, 0.92);
  if (archetype === 'extreme_obese') torsoWidth = Math.max(torsoWidth, 1.25);
  if (archetype === 'extreme_lean') torsoWidth = Math.min(torsoWidth, 0.82);

  // Definição Muscular Fisiológica (0 a 1) baseada nas diretrizes SBMEE/ABESO:
  // Gominhos abdominais e cortes estéticos só emergem quando a camada de gordura subcutânea diminui.
  const muscleRatio = Math.min(effectiveMuscle / (sex === 'female' ? 36 : 42), 1.25);
  const fatCutoffFull = sex === 'female' ? 18.0 : 12.0;   // Definição plena (six-pack clássico visível)
  const fatCutoffStart = sex === 'female' ? 25.0 : 18.5;  // Ponto onde as linhas abdominais começam a desenhar

  let muscleDefinition = 0.05;
  if (effectiveFat >= fatCutoffStart) {
    // Acima de 18.5% (homens) ou 25% (mulheres): a musculatura abdominal permanece encoberta pela camada adiposa.
    // Revela apenas leve firmeza/tônus em ombros e braços caso a massa muscular seja elevada.
    muscleDefinition = Math.min(Math.max(Number((0.08 + Math.max(0, muscleDiff) * 0.02).toFixed(2)), 0.05), 0.22);
  } else if (effectiveFat <= fatCutoffFull) {
    // Padrão ouro / atlético: definição plena com relevo nítido de gominhos e peitoral esculpido
    muscleDefinition = Math.min(Math.max(Number((0.75 + Math.max(0, muscleDiff) * 0.04).toFixed(2)), 0.70), 1.0);
  } else {
    // Faixa de transição gradual (entre 18.5% e 12%): os contornos e cortes musculares vão surgindo progressivamente
    const leanFactor = (fatCutoffStart - effectiveFat) / (fatCutoffStart - fatCutoffFull);
    const muscleBonus = Math.max(0, muscleDiff) * 0.025;
    muscleDefinition = Math.min(Math.max(Number(((0.22 + leanFactor * 0.50 + muscleBonus) * muscleRatio).toFixed(2)), 0.15), 0.95);
  }

  if (archetype === 'skinny_fat' || archetype === 'extreme_obese') {
    muscleDefinition = 0.05;
  }

  let glowColor = '#22c55e';
  if (archetype === 'muscular') glowColor = '#eab308';
  else if (archetype === 'robust') glowColor = '#f59e0b';
  else if (archetype === 'extreme_obese') glowColor = '#ef4444';
  else if (archetype === 'skinny_fat') glowColor = '#f97316';
  else if (archetype === 'lean' || archetype === 'extreme_lean') glowColor = '#38bdf8';

  // Frase de Inspeção ao tocar no personagem
  let inspectionQuote = '';
  if (archetype === 'skinny_fat') {
    inspectionQuote = 'Olhando pro shape: a balança baixou, mas os braços e pernas murcharam e a barriga continuou flácida! Hora de comer proteína e treinar forte!';
  } else if (archetype === 'extreme_obese') {
    inspectionQuote = 'Peso-pesado titânico na balança! Cada refeição limpa e cada treino vai queimar essa camada de gordura!';
  } else if (archetype === 'extreme_lean') {
    inspectionQuote = 'Shape muito leve! Agora a meta é colocar massa muscular de qualidade comendo comida limpa!';
  } else if (muscleDeltaPct && muscleDeltaPct > 0 && effectiveFat <= (sex === 'female' ? 22 : 16)) {
    inspectionQuote = `Olha o tamanho desse bíceps e o corte do abdômen! Ganhamos +${muscleDeltaPct}% de músculo e secamos a gordura!`;
  } else if (weightLostKg > 0 && fatLostPct && fatLostPct > 0) {
    if (effectiveFat > (sex === 'female' ? 25 : 18.5)) {
      inspectionQuote = `Olha a cintura desinchando! Menos ${weightLostKg} kg e -${fatLostPct}% de gordura! O tronco tá mais compacto e firme!`;
    } else {
      inspectionQuote = `Olha a cintura secando! Foram -${weightLostKg} kg e -${fatLostPct}% de gordura! A definição abdominal tá aparecendo!`;
    }
  } else if (weightLostKg > 0) {
    inspectionQuote = `Já eliminamos ${weightLostKg} kg! As medidas diminuíram e a postura tá bem mais leve!`;
  } else if (archetype === 'muscular') {
    inspectionQuote = 'Braços e pernas de aço! Alta densidade de massa magra no padrão campeão!';
  } else if (archetype === 'robust') {
    inspectionQuote = 'Olhando pro shape: modo peso-pesado em queima ativa! Vamos transformar essa massa em músculo puro!';
  } else if (archetype === 'lean') {
    inspectionQuote = 'Shape ágil e veloz! Cada treino e refeição nutritiva vai preencher os braços e pernas!';
  } else {
    inspectionQuote = 'Shape pronto pra batalha! Acompanhe cada grama e veja seu corpo se transformar!';
  }

  const defaultCustom = mascotId === 'gaia' ? DEFAULT_GAIA_CUSTOMIZATION : DEFAULT_TITA_CUSTOMIZATION;
  const customization: MascotCustomization = {
    eyeColor: input.customization?.eyeColor || defaultCustom.eyeColor,
    glovesColor: input.customization?.glovesColor || defaultCustom.glovesColor,
    suitColor: input.customization?.suitColor || defaultCustom.suitColor,
    headbandColor: input.customization?.headbandColor || defaultCustom.headbandColor,
    skinTone: input.customization?.skinTone || defaultCustom.skinTone,
  };

  const morphology: BodyMorphology = {
    armBulk,
    legBulk,
    torsoWidth,
    bellyVolume,
    waistWidth,
    muscleDefinition,
    flaccidityFactor,
    glowColor,
    inspectionQuote,
    customization,
  };

  const milestoneData = evaluateMilestoneLadder(mascotId, progressPercentage, weight);

  return {
    mascotId,
    mascotName,
    archetype,
    stageLevel,
    stageName,
    stageDescription,
    badgeLabel,
    badgeColor,
    assetKey,
    flavorQuote,
    targetWeightKg,
    weightDeltaKg,
    progressPercentage,
    weightLostKg,
    fatLostPct,
    muscleDeltaPct,
    waistLostCm,
    measurementsFeedback,
    nextMilestone,
    milestoneLevel: milestoneData.milestoneLevel,
    milestoneName: milestoneData.milestoneName,
    milestoneBadge: milestoneData.milestoneBadge,
    milestoneIcon: milestoneData.milestoneIcon,
    milestoneQuote: milestoneData.milestoneQuote,
    milestoneAssetKey: milestoneData.milestoneAssetKey || `${mascotId}_m${milestoneData.milestoneLevel}`,
    unlockedCosmetics: milestoneData.unlockedCosmetics,
    morphology,
  };
}

/**
 * Interface do Motor de Falas Dinâmicas para a Tela Inicial (Home)
 */
export interface HomeMascotSpeechInput {
  mascotId: MascotId;
  caloriesTarget: number;
  caloriesConsumed: number;
  proteinG?: number;
  proteinTargetG?: number;
  archetype?: MascotArchetype;
  userName?: string;
  hour?: number;
}

export interface HomeMascotSpeech {
  mainSpeech: string;
  subSpeech: string;
  sentiment: 'positive' | 'warning' | 'encouraging' | 'celebration';
  calRemaining: number;
  progressPct: number;
}

/**
 * Gera a fala interativa e inteligente do mascote na Tela Inicial
 * informando a meta, o consumido, o restante e orientações nutricionais.
 */
export function generateHomeMascotSpeech(input: HomeMascotSpeechInput): HomeMascotSpeech {
  const target = Math.max(1, Math.round(input.caloriesTarget || 2000));
  const consumed = Math.max(0, Math.round(input.caloriesConsumed || 0));
  const remaining = Math.max(0, target - consumed);
  const progressPct = Math.min(Math.round((consumed / target) * 100), 200);

  const currentHour = input.hour !== undefined ? input.hour : new Date().getHours();
  const isMorning = currentHour >= 5 && currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 18;
  const isNight = currentHour >= 18 || currentHour < 5;

  const mascotName = input.mascotId === 'gaia' ? 'Gaia' : 'Titã';
  const nameGreeting = input.userName ? `, ${input.userName}` : '';

  let mainSpeech = '';
  let subSpeech = '';
  let sentiment: 'positive' | 'warning' | 'encouraging' | 'celebration' = 'encouraging';

  if (consumed === 0) {
    if (isMorning) {
      mainSpeech = `Bom dia${nameGreeting}! Sua meta hoje é de ${target.toLocaleString('pt-BR')} kcal.`;
      subSpeech = 'Falta tudo por enquanto! Bora começar com um café nutritivo e hidratação!';
    } else {
      mainSpeech = `Ainda não registrou refeições hoje${nameGreeting}! Sua meta é de ${target.toLocaleString('pt-BR')} kcal.`;
      subSpeech = 'Não fique em jejum sem planejar! Registre o que você já comeu.';
    }
    sentiment = 'encouraging';
  } else if (remaining > 0 && progressPct < 85) {
    if (isMorning) {
      mainSpeech = `Ó, sua meta de calorias é ${target.toLocaleString('pt-BR')} kcal!`;
      subSpeech = `Você já comeu ${consumed.toLocaleString('pt-BR')} kcal e faltam ${remaining.toLocaleString('pt-BR')} kcal para fechar o dia!`;
    } else if (isAfternoon) {
      mainSpeech = `Sua meta é de ${target.toLocaleString('pt-BR')} kcal: já consumiu ${consumed.toLocaleString('pt-BR')} kcal!`;
      subSpeech = `Faltam ${remaining.toLocaleString('pt-BR')} kcal. Como está o aporte de proteínas para o almoço/lanche?`;
    } else {
      mainSpeech = `Faltam ${remaining.toLocaleString('pt-BR')} kcal para atingir sua meta de ${target.toLocaleString('pt-BR')} kcal!`;
      subSpeech = `Já consumiu ${consumed.toLocaleString('pt-BR')} kcal. Planeje um jantar equilibrado para não catabolizar!`;
    }
    sentiment = 'positive';
  } else if (remaining > 0 && progressPct >= 85) {
    mainSpeech = `Quase lá! Faltam apenas ${remaining.toLocaleString('pt-BR')} kcal para bater as ${target.toLocaleString('pt-BR')} kcal!`;
    subSpeech = `Você já comeu ${consumed.toLocaleString('pt-BR')} kcal. Uma ceia leve ou shake proteico fecha com chave de ouro!`;
    sentiment = 'positive';
  } else if (consumed >= target && consumed <= target + 80) {
    mainSpeech = `Cravou na mosca! Você bateu a meta de ${target.toLocaleString('pt-BR')} kcal hoje!`;
    subSpeech = `Consumiu exatamente ${consumed.toLocaleString('pt-BR')} kcal. Parabéns pela disciplina e precisão!`;
    sentiment = 'celebration';
  } else {
    // Ultrapassou a meta
    const over = consumed - target;
    mainSpeech = `Opa${nameGreeting}, passamos ${over.toLocaleString('pt-BR')} kcal da meta diária de ${target.toLocaleString('pt-BR')} kcal!`;
    subSpeech = `Total de ${consumed.toLocaleString('pt-BR')} kcal. Sem neura: amanhã compensamos no treino e na consistência!`;
    sentiment = 'warning';
  }

  // Dica adicional de proteína se disponível
  if (input.proteinG && input.proteinTargetG && input.proteinTargetG > 0) {
    const protPct = Math.round((input.proteinG / input.proteinTargetG) * 100);
    if (protPct < 50 && isAfternoon) {
      subSpeech += ` (Proteína em ${Math.round(input.proteinG)}g de ${input.proteinTargetG}g: capriche na próxima refeição!)`;
    }
  }

  return {
    mainSpeech,
    subSpeech,
    sentiment,
    calRemaining: remaining,
    progressPct,
  };
}
