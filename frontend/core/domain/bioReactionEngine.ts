/**
 * bioReactionEngine.ts
 * Motor clínico de avaliação de bioimpedância e reação viva dos mascotes Titã e Gaia.
 * Classifica a evolução em 8 cenários fisiológicos, calcula deltas reais, detecta
 * level-up de metamorfose corporal (Fases 1 a 5) e gera falas dinâmicas sob medida.
 * Alinhado às diretrizes da ABESO e SBMEE.
 */

import { evaluateMascot } from './avatarEngine.ts';
import type { MascotId, MascotEvaluation } from './avatarEngine.ts';

export type BiologicalSex = 'male' | 'female';

export type BioScenarioKey =
  | 'gold_burn'          // 1. Queima de Ouro (Gordura caiu, músculo mantido/subiu)
  | 'muscle_gain'        // 2. Hipertrofia de Respeito (Ganho expressivo de massa muscular)
  | 'catabolism_alert'   // 3. Alerta Falso Magro / Catabolismo (Peso caiu, mas músculo foi junto)
  | 'retention_alert'    // 4. Alerta de Retenção / Ganho de Gordura
  | 'silent_recomp'      // 5. O Falso Platô / Recomposição Silenciosa (Peso igual, cintura menor)
  | 'zero_mark'          // 6. Marco Zero (Primeira pesagem do cadastro)
  | 'triumphant_return'  // 7. Retorno Triunfal pós-Sumiço (>14 dias sem check-in)
  | 'champion_form';     // 8. Forma Campeã / Meta de Gordura e Peso Batida

export interface BioDataPoint {
  weightKg: number;
  bodyFatPct?: number | null;
  muscleMassPct?: number | null;
  bodyWaterPct?: number | null;
  waistCm?: number | null;
  date?: string;
}

export interface BioEvaluationInput {
  current: BioDataPoint;
  previous?: BioDataPoint | null;
  baseline?: BioDataPoint | null;
  mascotId: MascotId;
  sex?: BiologicalSex;
  heightCm?: number;
  targetWeightKg?: number;
  targetBodyFatPct?: number;
  daysSinceLastCheckin?: number;
  userName?: string;
  previousStageLevel?: number; // 1 a 5
}

export interface BioDeltaBadge {
  id: string;
  label: string;
  valueStr: string;
  deltaNum: number;
  direction: 'up' | 'down' | 'neutral';
  tone: 'positive' | 'warning' | 'alert' | 'neutral';
  icon: 'flame' | 'shield' | 'tape' | 'scale' | 'water';
}

export interface StageEvolution {
  evolved: boolean;
  oldStageLevel: number;
  newStageLevel: number;
  stageName: string;
  badgeLabel: string;
  badgeColor: string;
  morphologyAssetKey: string;
  milestoneLevel?: number;
  milestoneBadge?: string;
}

export interface BioReactionResult {
  scenarioKey: BioScenarioKey;
  scenarioTitle: string;
  scenarioSubtitle: string;
  mascotId: MascotId;
  mascotName: string;
  speechText: string;
  shortReaction: string;
  nextStepAction: string;
  accentColor: string;
  glowColor: string;
  badges: BioDeltaBadge[];
  evolution: StageEvolution;
  mascotEval: MascotEvaluation;
  currentWeightKg: number;
  weightDeltaKg: number;
  fatDeltaPct: number | null;
  muscleDeltaPct: number | null;
  waistDeltaCm: number | null;
  totalWeightLostKg: number;
  totalWaistLostCm: number;
}

/**
 * Avalia o diferencial de bioimpedância e retorna a reação viva da persona.
 */
export function evaluateBioReaction(input: BioEvaluationInput): BioReactionResult {
  const safeInput = input || ({} as any);
  const rawCurWeight = Number(safeInput.current?.weightKg);
  const current: BioDataPoint = (safeInput.current && !isNaN(rawCurWeight) && isFinite(rawCurWeight) && rawCurWeight > 0)
    ? safeInput.current
    : { weightKg: 70.0, date: new Date().toISOString().split('T')[0] };

  const previous = safeInput.previous;
  const baseline = safeInput.baseline || previous || current;
  const mascotId: MascotId = safeInput.mascotId === 'gaia' ? 'gaia' : 'tita';
  const mascotName = mascotId === 'gaia' ? 'Gaia' : 'Titã';
  const sex: BiologicalSex = safeInput.sex || (mascotId === 'gaia' ? 'female' : 'male');
  const height = safeInput.heightCm || 170;
  const daysSince = safeInput.daysSinceLastCheckin || 7;

  // 1. Cálculos de Deltas Imediatos (apenas se previous existir com peso biológico plausível > 20kg)
  const hasValidPrevious = !!(previous && previous.weightKg && previous.weightKg > 20 && !isNaN(previous.weightKg));
  const weightDeltaKg = hasValidPrevious ? Math.round((current.weightKg - previous.weightKg) * 10) / 10 : 0;
  
  let fatDeltaPct: number | null = null;
  if (hasValidPrevious && previous?.bodyFatPct !== undefined && previous?.bodyFatPct !== null && current.bodyFatPct !== undefined && current.bodyFatPct !== null) {
    fatDeltaPct = Math.round((current.bodyFatPct - previous.bodyFatPct) * 10) / 10;
  }

  let muscleDeltaPct: number | null = null;
  if (hasValidPrevious && previous?.muscleMassPct !== undefined && previous?.muscleMassPct !== null && current.muscleMassPct !== undefined && current.muscleMassPct !== null) {
    muscleDeltaPct = Math.round((current.muscleMassPct - previous.muscleMassPct) * 10) / 10;
  }

  let waistDeltaCm: number | null = null;
  if (hasValidPrevious && previous?.waistCm !== undefined && previous?.waistCm !== null && current.waistCm !== undefined && current.waistCm !== null) {
    waistDeltaCm = Math.round((current.waistCm - previous.waistCm) * 10) / 10;
  }

  // Deltas totais desde o Marco Zero
  const effectiveBaseline = (baseline && baseline.weightKg && baseline.weightKg > 20) 
    ? baseline 
    : (hasValidPrevious ? previous! : current);
  const totalWeightLostKg = Math.round(Math.max(0, effectiveBaseline.weightKg - current.weightKg) * 10) / 10;
  const totalWaistLostCm = effectiveBaseline.waistCm && current.waistCm 
    ? Math.round(Math.max(0, effectiveBaseline.waistCm - current.waistCm) * 10) / 10
    : Math.round((totalWeightLostKg * 0.9) * 10) / 10;

  // 2. Avaliação de Morfologia Corporal Atual
  const mascotEval = evaluateMascot({
    mascotId,
    sex,
    weightKg: current.weightKg,
    heightCm: height,
    bodyFatPct: current.bodyFatPct,
    muscleMassPct: current.muscleMassPct,
    bodyWaterPct: current.bodyWaterPct,
    waistCm: current.waistCm,
    initialWeightKg: baseline.weightKg,
    initialBodyFatPct: baseline.bodyFatPct,
    initialWaistCm: baseline.waistCm,
    initialMuscleMassPct: baseline.muscleMassPct,
  });

  // 3. Detecção de Level-Up na Metamorfose do Shape
  const previousLevel = input.previousStageLevel || mascotEval.stageLevel;
  const hasEvolved = mascotEval.stageLevel > previousLevel;
  const evolution: StageEvolution = {
    evolved: hasEvolved,
    oldStageLevel: previousLevel,
    newStageLevel: mascotEval.stageLevel,
    stageName: mascotEval.stageName,
    badgeLabel: mascotEval.badgeLabel,
    badgeColor: mascotEval.badgeColor,
    morphologyAssetKey: mascotEval.milestoneAssetKey || mascotEval.assetKey,
    milestoneLevel: mascotEval.milestoneLevel,
    milestoneBadge: mascotEval.milestoneBadge,
  };

  // 4. Classificação dos 8 Cenários Clínicos
  let scenarioKey: BioScenarioKey = 'gold_burn';

  const isFirstCheckin = !hasValidPrevious || !previous || (previous.weightKg === current.weightKg && !previous.bodyFatPct && !previous.waistCm);
  const isTargetAchieved = (input.targetWeightKg && current.weightKg <= input.targetWeightKg) ||
    (input.targetBodyFatPct && current.bodyFatPct && current.bodyFatPct <= input.targetBodyFatPct);
  const isTriumphantReturn = daysSince >= 14 && !isFirstCheckin;

  if (isFirstCheckin) {
    scenarioKey = 'zero_mark';
  } else if (isTargetAchieved) {
    scenarioKey = 'champion_form';
  } else if (isTriumphantReturn) {
    scenarioKey = 'triumphant_return';
  } else {
    // Diagnósticos baseados em diferenciais de gordura, músculo, cintura e peso
    const weightDrop = weightDeltaKg < -0.2;
    const weightSame = Math.abs(weightDeltaKg) <= 0.3;
    const weightUp = weightDeltaKg > 0.3;

    const fatDrop = fatDeltaPct !== null ? fatDeltaPct < -0.2 : (weightDrop && (!waistDeltaCm || waistDeltaCm < 0));
    const fatUp = fatDeltaPct !== null ? fatDeltaPct > 0.3 : (weightUp && waistDeltaCm && waistDeltaCm > 0.5);
    const muscleDrop = muscleDeltaPct !== null ? muscleDeltaPct < -0.4 : false;
    const muscleUp = muscleDeltaPct !== null ? muscleDeltaPct > 0.3 : false;
    const waistDrop = waistDeltaCm !== null ? waistDeltaCm < -0.4 : false;

    // Cenário 3: Catabolismo (Peso caiu, mas músculo foi sacrificado ou gordura subiu)
    if (weightDrop && (muscleDrop || (fatDeltaPct !== null && fatDeltaPct > 0.2))) {
      scenarioKey = 'catabolism_alert';
    }
    // Cenário 5: Recomposição Silenciosa (Peso estável, mas cintura caiu ou gordura caiu)
    else if (weightSame && (waistDrop || fatDrop)) {
      scenarioKey = 'silent_recomp';
    }
    // Cenário 2: Hipertrofia de Respeito (Massa muscular subiu expressivamente)
    else if (muscleUp && !fatUp) {
      scenarioKey = 'muscle_gain';
    }
    // Cenário 4: Retenção / Deslize (Peso e gordura subiram)
    else if (weightUp && (fatUp || (waistDeltaCm !== null && waistDeltaCm > 0.5))) {
      scenarioKey = 'retention_alert';
    }
    // Cenário 1: Queima de Ouro (Padrão ouro: peso caiu com queima de gordura ou desinchaço)
    else if (weightDrop || fatDrop || waistDrop) {
      scenarioKey = 'gold_burn';
    }
    // Fallback: se peso subiu levemente sem dados de bio, alerta suave de retenção
    else if (weightUp) {
      scenarioKey = 'retention_alert';
    } else {
      scenarioKey = 'gold_burn';
    }
  }

  // 5. Construção dos Badges Flutuantes
  const badges: BioDeltaBadge[] = [];

  // Badge 1: Peso
  if (weightDeltaKg !== 0 || scenarioKey === 'zero_mark') {
    const isWeightLossGood = weightDeltaKg < 0;
    badges.push({
      id: 'weight',
      label: 'Balança',
      valueStr: `${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg.toFixed(1)} kg`,
      deltaNum: weightDeltaKg,
      direction: weightDeltaKg > 0 ? 'up' : weightDeltaKg < 0 ? 'down' : 'neutral',
      tone: isWeightLossGood ? 'positive' : weightDeltaKg > 0 ? 'warning' : 'neutral',
      icon: 'scale',
    });
  }

  // Badge 2: Gordura Corporal
  if (fatDeltaPct !== null) {
    const isFatLossGood = fatDeltaPct <= 0;
    badges.push({
      id: 'fat',
      label: 'Gordura',
      valueStr: fatDeltaPct === 0 ? 'Estável' : `${fatDeltaPct > 0 ? '+' : ''}${fatDeltaPct.toFixed(1)}%`,
      deltaNum: fatDeltaPct,
      direction: fatDeltaPct > 0 ? 'up' : fatDeltaPct < 0 ? 'down' : 'neutral',
      tone: isFatLossGood ? 'positive' : 'alert',
      icon: 'flame',
    });
  }

  // Badge 3: Massa Magra
  if (muscleDeltaPct !== null) {
    const isMuscleGainGood = muscleDeltaPct >= 0;
    badges.push({
      id: 'muscle',
      label: 'Músculo',
      valueStr: muscleDeltaPct === 0 ? 'Protegido' : `${muscleDeltaPct > 0 ? '+' : ''}${muscleDeltaPct.toFixed(1)}%`,
      deltaNum: muscleDeltaPct,
      direction: muscleDeltaPct > 0 ? 'up' : muscleDeltaPct < 0 ? 'down' : 'neutral',
      tone: isMuscleGainGood ? 'positive' : 'alert',
      icon: 'shield',
    });
  }

  // Badge 4: Cintura
  if (waistDeltaCm !== null) {
    const isWaistLossGood = waistDeltaCm <= 0;
    badges.push({
      id: 'waist',
      label: 'Cintura',
      valueStr: waistDeltaCm === 0 ? 'Estável' : `${waistDeltaCm > 0 ? '+' : ''}${waistDeltaCm.toFixed(1)} cm`,
      deltaNum: waistDeltaCm,
      direction: waistDeltaCm > 0 ? 'up' : waistDeltaCm < 0 ? 'down' : 'neutral',
      tone: isWaistLossGood ? 'positive' : 'warning',
      icon: 'tape',
    });
  }

  // 6. Geração de Falas Dinâmicas Hiper-Personalizadas (Persona Titã vs Gaia)
  const absWeight = Math.abs(weightDeltaKg).toFixed(1);
  const absWaist = waistDeltaCm ? Math.abs(waistDeltaCm).toFixed(1) : (Math.abs(weightDeltaKg) * 0.9).toFixed(1);

  let scenarioTitle = '';
  let scenarioSubtitle = '';
  let speechText = '';
  let shortReaction = '';
  let nextStepAction = '';
  let accentColor = '#22c55e';
  let glowColor = '#22c55e';

  switch (scenarioKey) {
    case 'gold_burn':
      scenarioTitle = '🔥 Queima de Ouro!';
      scenarioSubtitle = 'Gordura eliminada com massa muscular protegida';
      accentColor = '#22c55e';
      glowColor = '#22c55e';
      if (mascotId === 'tita') {
        speechText = `Aí sim, guerreiro! Menos ${absWeight}kg na balança e sua cintura encolheu ${absWaist}cm! Secamos gordura pura e o músculo ficou intacto. A armadura tá ficando folgada!`;
        shortReaction = `Gordura no chão, guarda levantada! Esse shape tá esculpido na raça!`;
      } else {
        speechText = `Estratégia soberana! Você eliminou ${absWeight}kg de volume e sua cintura afinou ${absWaist}cm mantendo a firmeza. É isso que acontece quando a disciplina encontra a comida certa!`;
        shortReaction = `Queima limpa e soberana! Sua cintura afinou e sua coroa tá brilhando mais forte hoje!`;
      }
      nextStepAction = 'Garanta sua cota de proteínas hoje para consolidar essa queima sem perda de tônus.';
      break;

    case 'muscle_gain':
      scenarioTitle = '⚡ Hipertrofia de Respeito!';
      scenarioSubtitle = 'Densidade muscular aumentada com metabolismo acelerado';
      accentColor = '#3b82f6';
      glowColor = '#60a5fa';
      if (mascotId === 'tita') {
        speechText = `Olha a densidade desse aço! A balança pode até subir quando o que entra é músculo puro! Construímos uma armadura de campeão hoje com esse treino pesado!`;
        shortReaction = `Massa magra no teto! Esse treino tá valendo cada gota de suor!`;
      } else {
        speechText = `Poder puro! Músculo consome calorias até quando você dorme. Parabéns por alimentar a sua força e construir uma musculatura densa e inabalável!`;
        shortReaction = `Mais densa, mais forte, inabalável! Esse ganho muscular é sua blindagem.`;
      }
      nextStepAction = 'Não pule o descanso reparador hoje e mantenha os carboidratos complexos pré-treino.';
      break;

    case 'catabolism_alert':
      scenarioTitle = '⚠️ Alerta de Catabolismo';
      scenarioSubtitle = 'Peso caiu, mas a massa magra foi sacrificada';
      accentColor = '#f59e0b';
      glowColor = '#fbbf24';
      if (mascotId === 'tita') {
        speechText = `Opa, guerreiro, para tudo e escuta o técnico: o ponteiro caiu ${absWeight}kg, mas o músculo foi junto! Passar fome não queima gordura, devora suas forças! Hoje é dia de caprichar na proteína de verdade!`;
        shortReaction = `Peso baixo sem proteína vira flacidez! Menos desespero, mais bife no prato e treino forte!`;
      } else {
        speechText = `Atenção aos números reais: perder peso sacrificando massa magra deixa o metabolismo lento. Não queremos apenas ser menores, queremos ser firmes e tonificados! Vamos reajustar suas proteínas agora.`;
        shortReaction = `Não troque tônus muscular por números na balança. Sua prioridade absoluta hoje é a proteína!`;
      }
      nextStepAction = 'Ative o lembrete de proteína e garanta pelo menos 1.6g/kg nas refeições de hoje.';
      break;

    case 'retention_alert':
      scenarioTitle = '🛡️ Guarda Alta: Retenção Detectada';
      scenarioSubtitle = 'Oscilação hídrica ou excesso pontual; foco nas próximas 24h';
      accentColor = '#f97316';
      glowColor = '#fb923c';
      if (mascotId === 'tita') {
        speechText = `Tomamos um golpe no round (+${absWeight}kg), e daí? Ninguém é derrotado por um número se não desistir da luta! Sacode a poeira, bebe meio litro de água agora e vamos queimar essa camada no próximo treino!`;
        shortReaction = `A balança subiu, mas a vergonha fica no zero! Levanta essa guarda que a virada começa hoje!`;
      } else {
        speechText = `Sem dramas e sem culpa: um deslize de rota não destrói o império que você está construindo. Muita dessa subida de ${absWeight}kg é apenas retenção e água! Foco limpo nas próximas 24 horas e o equilíbrio volta.`;
        shortReaction = `Respire fundo. A consistência de meses é muito maior que um fim de semana. Retome a água e o foco!`;
      }
      nextStepAction = 'Beba 500ml de água imediatamente e planeje as próximas refeições sem restrições malucas.';
      break;

    case 'silent_recomp':
      scenarioTitle = '✨ Recomposição Silenciosa!';
      scenarioSubtitle = 'O peso cravou igual, mas você trocou gordura por músculo';
      accentColor = '#a855f7';
      glowColor = '#c084fc';
      if (mascotId === 'tita') {
        speechText = `Não cai na pegadinha da balança! O peso cravou em ${current.weightKg.toFixed(1)}kg, mas sua cintura encolheu ${absWaist}cm! Você trocou banha por músculo, guerreiro! Isso é recomposição corporal de elite!`;
        shortReaction = `Esquece o ponteiro estático! O espelho e a fita métrica tão gritando vitória!`;
      } else {
        speechText = `A ciência é maravilhosa: 1kg de músculo ocupa metade do espaço de 1kg de gordura! Seu peso está cravado em ${current.weightKg.toFixed(1)}kg, mas sua cintura reduziu ${absWaist}cm. Vitória silenciosa e brilhante!`;
        shortReaction = `Recomposição corporal pura! O peso não mexeu porque sua musculatura substituiu a gordura. Comemore!`;
      }
      nextStepAction = 'Tire uma foto de perfil e compare suas medidas na aba de fotos corporais.';
      break;

    case 'zero_mark':
      scenarioTitle = '🚀 Marco Zero Calibrado!';
      scenarioSubtitle = 'Ponto de partida oficial registrado na pedra';
      accentColor = '#22c55e';
      glowColor = '#22c55e';
      if (mascotId === 'tita') {
        speechText = `Marco Zero registrado em ${current.weightKg.toFixed(1)}kg! Agora seu corpo tem voz e a gente tem uma estratégia de verdade. Daqui pra frente, cada grama eliminada vai transformar o seu avatar e a sua vida! Toca aqui e vamos vencer!`;
        shortReaction = `Linha de largada dada! Seu ponto de partida tá gravado na pedra. Bora pra batalha!`;
      } else {
        speechText = `Bem-vinda à sua nova realidade! O ponto de partida em ${current.weightKg.toFixed(1)}kg é o mais corajoso de todos. A partir de hoje, cada escolha inteligente vai esculpir a sua melhor versão soberana!`;
        shortReaction = `Marco zero calibrado! O comando da sua saúde está nas suas mãos. Vamos juntas!`;
      }
      nextStepAction = 'Confira suas metas de calorias e água no Halo Metabólico da tela inicial.';
      break;

    case 'triumphant_return':
      scenarioTitle = '👑 Retorno Triunfal!';
      scenarioSubtitle = 'Você voltou ao tatame e a consistência recomeça agora';
      accentColor = '#eab308';
      glowColor = '#facc15';
      if (mascotId === 'tita') {
        speechText = `OLHA QUEM TÁ NA ÁREA! Tava com saudade do meu parceiro de treino! O que passou, passou. O importante é que você pisou na balança de novo hoje com ${current.weightKg.toFixed(1)}kg. Bora pro round!`;
        shortReaction = `Você voltou pro ringue! É isso que importa! Bota a guarda no lugar e vamo pra cima!`;
      } else {
        speechText = `Que alegria ver você aqui de novo! A jornada não é sobre nunca falhar, é sobre sempre reencontrar o caminho do trono. Estamos prontas para continuar de onde paramos!`;
        shortReaction = `Você está de volta! Nada de olhar para trás, sua determinação recomeça neste exato segundo.`;
      }
      nextStepAction = 'Beba um copo d água agora e registre sua primeira refeição do dia para reativar o streak.';
      break;

    case 'champion_form':
      scenarioTitle = '🏆 FORMA CAMPEÃ ALCANÇADA!';
      scenarioSubtitle = 'Meta de peso e composição corporal conquistada com glória';
      accentColor = '#eab308';
      glowColor = '#facc15';
      if (mascotId === 'tita') {
        speechText = `CAMPEÃO INCONTESTÁVEL! Olha onde você chegou: cravamos ${current.weightKg.toFixed(1)}kg! Lembra do primeiro dia? Aquela gordura foi derretida e o que sobrou foi disciplina pura! Essa vitória é sua!`;
        shortReaction = `SHAPE BLINDADO DE CAMPEÃO! Você zerou essa meta com glória total! Sensacional!`;
      } else {
        speechText = `Coroa de ouro conquistada por mérito absoluto! Você provou a si mesma que paciência, ciência e determinação movem montanhas. O topo do pódio tem o seu nome gravado hoje!`;
        shortReaction = `Consagração suprema! Sua disciplina transformou seu corpo e sua mente. Parabéns, campeã!`;
      }
      nextStepAction = 'Compartilhe sua conquista e ative a fase de consolidação e manutenção no perfil.';
      break;
  }

  return {
    scenarioKey,
    scenarioTitle,
    scenarioSubtitle,
    mascotId,
    mascotName,
    speechText,
    shortReaction,
    nextStepAction,
    accentColor,
    glowColor,
    badges,
    evolution,
    mascotEval,
    currentWeightKg: current.weightKg,
    weightDeltaKg,
    fatDeltaPct,
    muscleDeltaPct,
    waistDeltaCm,
    totalWeightLostKg,
    totalWaistLostCm,
  };
}
