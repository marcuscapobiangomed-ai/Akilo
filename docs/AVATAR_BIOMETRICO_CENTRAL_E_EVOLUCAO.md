# 🥊 Doutrina de Concepção & Engenharia: Avatar Biométrico Central & Evolução Morfológica Real

> **Status:** Documento Oficial de Referência do Projeto  
> **Versão:** 2.0 (Alinhada às Diretrizes SBMEE, ABESO, ACSM e Ministério da Saúde)  
> **Escopo:** Tela Inicial (Home Hero Arena), Perfil (Duelo de Bioimpedância) e Motor Morfológico 3D Vivo (`avatarEngine.ts`).

---

## 1. Visão Estratégica do Produto

O aplicativo **Batalha da Balança** transcende o modelo tradicional de "diário alimentar frio" (planilhas de macros com anéis abstratos) e adota o **Avatar 3D Vivo como Protagonista Central da Experiência**:

1. **Protagonismo na Tela Inicial (Home):** O personagem (Titã ou Gaia) posiciona-se no centro da tela sobre a balança inteligente, cercado pelo anel de calorias integrado (Halo Metabólico) e dialoga ativamente com o usuário através de um balão de falas dinâmico e contextual.
2. **Confronto Histórico no Perfil (Duelo de Bioimpedância):** Um painel comparativo contrapõe o **1º Check-in (Marco Zero)** com a **Pesagem Mais Recente**, exibindo deltas clínicos de peso, % de gordura, % de massa muscular, circunferência de cintura e idade metabólica.
3. **Morfologia Biológica Reativa & Fisiologia Real:** A evolução do personagem não é guiada apenas pelo "peso bruto", mas pela composição tecidual (Massa Gorda vs. Massa Magra). Uma pessoa que perde peso passando fome e comendo doces sem bater proteína perde massa muscular e desenvolve o arquétipo **"Falso Magro / Flácido"**; quem emagrece treinando força e batendo proteínas preserva massa magra e ruma para a **"Forma Campeã"**.

---

## 2. A Régua Fisiológica de Definição Muscular (SBMEE & ABESO)

### 2.1 O Princípio Médico da Definição Honesta
A definição muscular aparente (gominhos abdominais, linha alba, corte de deltoides e peitoral esculpido) é governada biologicamente pela **espessura da camada de tecido adiposo subcutâneo**.

Pelas diretrizes da **SBMEE** (Sociedade Brasileira de Medicina do Exercício e do Esporte) e da **ABESO**:

* **Homens:**
  * **> 25% de Gordura:** Obesidade / Gordura Muito Elevada. Parede abdominal coberta, tronco cilíndrico ou arredondado.
  * **21% a 24.9% de Gordura:** Sobrepeso Leve / Limiar Superior. Abdômen ainda suave e macio. **Gominhos NÃO aparecem**.
  * **16% a 20% de Gordura:** Faixa Saudável / Transição. Abdômen reto/plano, linhas laterais esboçando, sem divisão trincada.
  * **11% a 15% de Gordura:** Nível Fitness / Atlético. Divisórias dos retos abdominais (six-pack) visíveis e nítidas.
  * **6% a 10% de Gordura:** Nível Competição / Ripped. Vascularização aparente, pele fina e corte profundo.
* **Mulheres:**
  * **> 32%:** Obesidade / Gordura Alta.
  * **25% a 31%:** Sobrepeso / Média populacional. Abdômen suave.
  * **20% a 24%:** Faixa Saudável / Tonificada ("11-line abs" sutil).
  * **15% a 19%:** Atlética / Fitness definida.

### 2.2 A Armadilha da Recompensa Prematura (Por que evitar o avatar trincado cedo demais?)
Se um usuário que pesava **92.5 kg (33.2% gordura, cintura 104 cm)** chega a **84.1 kg (24.8% gordura, cintura 94 cm)** e o aplicativo renderiza um avatar com abdômen trincado estilo fisiculturista:
1. **Quebra de Confiança Clínica (Dismorfia):** O usuário se olha no espelho e vê que ainda tem uma barriga de sobrepeso; se o aplicativo o retrata rasgado, a experiência soa mentirosa e infantil.
2. **Esgotamento da Dopamina e Gamificação:** Se aos 84.1 kg o avatar já está no topo da definição muscular, qual será a motivação visual para continuar a dieta e atingir a meta dos **70 kg**? Nenhuma! O avatar "já zerou o shape".

---

## 3. A Esteira Master de 10 Marcos Evolutivos do Titã (92.5 kg ➔ 70.0 kg)

Para eliminar qualquer sensação de estagnação ("o peso muda pouco") e oferecer ciclos rápidos de dopamina a cada 2 a 3 semanas (~2.0 kg a 2.5 kg eliminados), a jornada oficial conta com **10 Marcos Clínicos e Paramétricos**:

```
[M1: 92.5kg] ➔ [M2: 90.0kg] ➔ [M3: 88.0kg] ➔ [M4: 84.1kg] ➔ [M5: 82.0kg]
[M6: 80.0kg] ➔ [M7: 77.0kg] ➔ [M8: 74.0kg] ➔ [M9: 72.0kg] ➔ [M10: 70.0kg]
```

### Detalhamento Antropométrico, Bioimpedância e Visual dos 10 Marcos:

| Marco / Nome Oficial | Peso (kg) | % Gordura | % Músculo | Cintura | Ícone & Display Peitoral | Acessórios Desbloqueados | Estado Corporal |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1. O Despertar do Peso-Pesado** | **92.5 kg** | 33.2% | 29.5% | 104 cm | Analógico Vermelho + `92.5 kg` | Faixa vermelha + Toalha no ombro/cabeça + Gotas de suor | Tronco esférico, retenção hídrica severa, esforço visível |
| **2. Quebra da Retenção** | **90.0 kg** | 31.0% | 30.2% | 101 cm | Gauge Amarelo + `90.0 kg` (BF 31% • 101cm) | Toalha nos ombros (tipo boxeador) + Suor seco | Rosto desinchando, postura firme, sorriso confiante |
| **3. Desinchaço Notável** | **88.0 kg** | 29.0% | 31.2% | 99 cm | Chama Âmbar + `88.0 kg` (BF 29% • 99cm) | Toalha amarrada na cintura + Faixa verde | Cintura rompe barreira dos 100cm, alívio articular |
| **4. Transição & Queima Ativa** | **84.1 kg** | 24.8% | 33.1% | 94 cm | Folha Eco + `84.1 kg` | Luvas em posição de guarda + Tênis de treino | Abdômen recuado, umbigo visível, tônus muscular |
| **5. Fronteira da Saúde** | **82.0 kg** | 23.0% | 33.8% | 92 cm | Insígnia "Coração de Titã" + `82.0 kg` | Insígnia no peitoral de proteção cardiovascular | Queda de 10kg, peitoral ganha formato atlético |
| **6. Cintura de Aço (Zona ABESO)**| **80.0 kg** | 21.0% | 34.8% | 89 cm | Raio Ciano ⚡ + `80.0 kg` (BF 21% • 89cm) | Luvas com faixas de fibra de carbono | Cintura < 90cm (saída de risco coronariano alto) |
| **7. Aceleração & V-Taper** | **77.0 kg** | 18.5% | 35.8% | 85 cm | Chama Neon + `77.0 kg` (BF 18.5% • 85cm) | Toalha dispensada + Tênis edição especial turbo | V-Taper evidente, ombros largos e cintura fina |
| **8. Primeiros Cortes** | **74.0 kg** | 15.0% | 36.8% | 81 cm | Medalha Prata / Chama Ouro + `74.0 kg` | Faixa preta/grafite + Luvas com friso dourado | Linha Alba visível, topo dos 4 gomos e oblíquos |
| **9. O Limiar do Pódio** | **72.0 kg** | 13.5% | 37.5% | 78 cm | Troféu Dourado + `72.0 kg` (BF 13.5% • 78cm) | Punhos dourados de campeão + Pose de vitória | Six-pack quase pleno, separação de quadríceps |
| **10. Campeão Titânico Supremo** | **70.0 kg** | 12.5% | 38.0% | 76 cm | Estrela Ouro 5 Pontas ⭐ + `70.0 kg` | Fundo Holográfico Campeão + Tiara Ouro | Six-pack trincado, padrão ouro estético e clínico |

#### Galeria Completa das 10 Renderizações 3D (`docs/evolution_benchmarks/`):
* **Marco 1 (92.5 kg):** `docs/evolution_benchmarks/tita_marco1_92kg.jpg`
* **Marco 2 (90.0 kg):** `docs/evolution_benchmarks/tita_marco_90kg_retencao.jpg`
* **Marco 3 (88.0 kg):** `docs/evolution_benchmarks/tita_marco1_5_88kg_desinche.jpg`
* **Marco 4 (84.1 kg):** `docs/evolution_benchmarks/tita_marco2_84kg_transicao.jpg`
* **Marco 5 (82.0 kg):** `docs/evolution_benchmarks/tita_marco_82kg_saude.jpg`
* **Marco 6 (80.0 kg):** `docs/evolution_benchmarks/tita_marco_80kg_cinturadeaco.jpg`
* **Marco 7 (77.0 kg):** `docs/evolution_benchmarks/tita_marco2_5_77kg_cintura.jpg`
* **Marco 8 (74.0 kg):** `docs/evolution_benchmarks/tita_marco_74kg_cortes.jpg`
* **Marco 9 (72.0 kg):** `docs/evolution_benchmarks/tita_marco_72kg_podio.jpg`
* **Marco 10 (70.0 kg):** `docs/evolution_benchmarks/tita_marco3_70kg_campeao.jpg`

---

## 3.1 O Sistema Multi-Métricas de Recomposição Corporal em 4 Eixos

Quando a balança "trava" ou varia pouco (-200g a +200g), a recomposição corporal real continua ocorrendo. O sistema monitora 4 eixos independentes:

1. **Eixo Peso (kg):** Altera o LCD central da balança peitoral do Titã.
2. **Eixo % Gordura Corporal (BF%):** Reduz a camada que encobre os músculos (`muscleDefinition`) e comanda o ícone do peitoral (Analógico Vermelho ➔ Chama Âmbar ➔ Folha Eco ➔ Raio Neon ➔ Estrela Ouro).
3. **Eixo % Massa Muscular:** Aumenta a espessura e densidade dos braços (`armBulk`), ombros (`torsoWidth`) e pernas (`legBulk`).
4. **Eixo Circunferência Abdominal (cm):** Controla a largura da cintura (`waistWidth`) e retração do abdômen (`bellyVolume`). Pela ABESO, cada -1 cm de cintura reduz drasticamente o risco cardiovascular e gera feedback visual imediato no Titã, mesmo que o peso permaneça igual.

---

## 3.2 Os 3 Cenários Clínicos de Ganho de Peso & Marcos de Resgate

Nem todo ganho de peso na balança é igual. O aplicativo **não adota postura punitiva ou humilhante** (que afasta o usuário do app), mas sim uma abordagem clínica de acolhimento ativo, resgate motivacional e valorização do ganho de massa muscular:

```
[ GANHO 1: RETENÇÃO HÍDRICA ]       ➔       [ GANHO 2: REBOTE ADIPOSO ]       ➔       [ GANHO 3: HIPERTROFIA PURA ]
  Sódio / Glicogênio (+1.5kg rápido)          Deslize Real (+3kg a +5kg)                  Bulking Limpo (+2kg Músculo)
  Ícone: Gotas de Água 💧                     Ícone: Triângulo Alerta ⚠️                  Ícone: Haltere de Ouro 🛡️
  "Alerta de Hidratação: Beba 3L!"            "Alerta de Resgate: Volta por Cima!"        "Hipertrofia Titânica: Puro Aço!"
```

### Detalhamento dos 3 Marcos de Ganho de Peso:

| Cenário de Ganho | Causa Fisiológica | Comportamento do Titã | Display Peitoral | Acessórios / Render Salvo |
| :--- | :--- | :--- | :--- | :--- |
| **1. Retenção Hídrica Transitória** (+1.0 a +2.0 kg em 48h) | Excesso de sódio, carboidratos (glicogênio retém água 1:3), inflamação pós-treino ou período pré-menstrual | Bochechas e abdômen levemente inchados, sorriso amigável, segurando garrafa de água esportiva | Ícone de Gotas d'Água 💧 + `87.0 kg` (Subtexto: `RETENÇÃO HÍDRICA • BEBA 3L`) | `docs/evolution_benchmarks/tita_ganho_retencao_87kg.jpg` |
| **2. Rebote Adiposo / Deslize Severo** (+3.0 a +5.0 kg consistente) | Superávit calórico prolongado com aumento de gordura e cintura (+3 a +6cm) | Postura de guarda de boxe protetora, toalha nos ombros, olhar determinado pronto para a volta por cima | Triângulo de Alerta Âmbar ⚠️ + `96.0 kg` (Subtexto: `BF: 36% • CINTURA: 110cm`) | `docs/evolution_benchmarks/tita_ganho_rebote_96kg.jpg` |
| **3. Hipertrofia & Densidade Muscular** (+1.5 a +3.0 kg de Músculo) | Ganho de peso atlético com treino de força pesado, aumento de %MM e cintura controlada | Bíceps massivos, peitoral quadrado blindado, V-taper imponente, pose de duplo bíceps | Haltere Dourado em Escudo de Titânio 🛡️ + `86.0 kg` (`BF: 17% • MM: 39.5% • CINTURA: 86cm`) | `docs/evolution_benchmarks/tita_ganho_hipertrofia_86kg.jpg` |

---

## 3.3 A Esteira Master de Hipertrofia Muscular Titânica (75.0 kg ➔ 120.0 kg)

Para usuários cujo objetivo principal é o **ganho de massa muscular magra, força bruta e fisiculturismo (Bulking Limpo / Força Máxima)**, o sistema oferece uma esteira ascendente de hipertrofia até **120.0 kg**:

```
[H1: 75kg Estética] ➔ [H2: 80kg Classic] ➔ [H3: 86kg Titânico] ➔ [H4: 92kg Heavyweight]
[H5: 100kg Juggernaut] ➔ [H6: 108kg Brutal] ➔ [H7: 114kg Strongman] ➔ [H8: 120kg Colosso]
```

### Tabela Antropométrica e Paramétrica de Hipertrofia:

| Nível / Nome Oficial | Peso (kg) | % Massa Magra | % Gordura | Cintura (cm) | Tórax (cm) | Ícone & Display Peitoral | Acessório / Visual Desbloqueado |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **H1. Estética Clássica (Men's)** | **75.0 kg** | 38.5% | 12.0% | 78 cm | 108 cm | Halteres de Bronze + `75.0 kg` | Faixa Verde + Luvas Vermelhas Tradicionais |
| **H2. Densidade em V (Classic)** | **80.0 kg** | 39.5% | 13.5% | 82 cm | 114 cm | Halteres de Prata + `80.0 kg` | Luvas com faixas metálicas + Munhequeiras |
| **H3. Hipertrofia Titânica** | **86.0 kg** | 40.5% | 15.0% | 86 cm | 119 cm | Haltere Dourado em Escudo 🛡️ + `86.0 kg` | Luvas blindadas em ouro + Bermuda com friso dourado |
| **H4. Heavyweight Maromba** | **92.0 kg** | 42.5% | 15.5% | 87 cm | 124 cm | Kettlebell Vulcânico + `92.0 kg` | Cinto de couro de levantamento de peso |
| **H5. O Juggernaut dos Ferros** | **100.0 kg** | 44.5% | 15.0% | 88 cm | 128 cm | Bigorna Dourada & Martelo + `100.0 kg` | Cinto Powerlifting Titânico + Ombros esféricos |
| **H6. Brutalidade Muscular** | **108.0 kg** | 46.0% | 16.0% | 91 cm | 133 cm | Manopla de Titânio + `108.0 kg` | Manoplas de aço escovado + Pernas tronco de árvore |
| **H7. Strongman Titânico** | **114.0 kg** | 47.0% | 16.5% | 93 cm | 137 cm | Martelo de Thor Titânico + `114.0 kg` | Trapézio colossal + Fundo de arena de força |
| **H8. O Colosso Lendário** | **120.0 kg** | 48.5% | 16.5% | 94 cm | 142 cm | Coroa Mística & Martelo Divino + `120.0 kg` | **Cinturão Titan Championship** + Manoplas Rúnicas + Aura Dourada |

#### Renderizações 3D Salvas de Hipertrofia (`docs/evolution_benchmarks/`):
* **Marco H3 (86.0 kg - Hipertrofia Titânica):** `docs/evolution_benchmarks/tita_ganho_hipertrofia_86kg.jpg`
* **Marco H5 (100.0 kg - O Juggernaut):** `docs/evolution_benchmarks/tita_hipertrofia_100kg_juggernaut.jpg`
* **Marco H8 (120.0 kg - O Colosso Lendário):** `docs/evolution_benchmarks/tita_hipertrofia_120kg_colosso.jpg`

---

## 3.4 A Esteira Master dos 10 Marcos da Gaia (82.0 kg ➔ 58.0 kg)

Para o público feminino, a jornada da **Gaia** respeita a fisiologia endocrinológica e antropométrica das diretrizes da **ABESO, ACSM e SBMEE**:
- Faixa de corte de cintura segura feminina: **< 80 cm** (risco aumentado $\ge 80\text{ cm}$, risco muito alto $\ge 88\text{ cm}$).
- Percentual de gordura saudável: **20% a 24%**; atlética: **16% a 19%**.

```
[G1: 82.0kg] ➔ [G2: 79.5kg] ➔ [G3: 77.0kg] ➔ [G4: 74.0kg] ➔ [G5: 71.0kg]
[G6: 68.0kg] ➔ [G7: 65.0kg] ➔ [G8: 62.5kg] ➔ [G9: 60.0kg] ➔ [G10: 58.0kg]
```

### Detalhamento Antropométrico, Bioimpedância e Visual dos 10 Marcos da Gaia:

| Nível | Marco / Nome Oficial | Peso (kg) | % Gordura | % Músculo | Cintura | Busto / Quadril | Ícone & Display Peitoral | Acessórios Desbloqueados | Estado Corporal (100% Humana Linda & Esculpida) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **G1** | **O Despertar da Guerreira** | **82.0 kg** | 39.0% | 26.0% | 100 cm | 104 / 112 cm | Analógico Vermelho + `82.0 kg` | Faixa Vermelha + Toalha de treino no ombro + Gotas de suor | Tronco arredondado, retenção hídrica acentuada, olhar focado e postura determinada |
| **G2** | **Quebra do Inchaço** | **79.5 kg** | 37.0% | 26.8% | 96 cm | 102 / 110 cm | Gauge Amarelo + `79.5 kg` (BF 37% • 96cm) | Toalha nos ombros + Top esportivo básico | Rosto mais limpo e desinchado, redução de retenção articular nos tornozelos e punhos |
| **G3** | **Desinchaço Notável** | **77.0 kg** | 34.5% | 27.5% | 93 cm | 100 / 108 cm | Chama Âmbar + `77.0 kg` (BF 34.5% • 93cm) | Toalha amarrada no cinto + Faixa Verde Esmeralda | Cintura recua significativamente, articulações mais leves, caminhada com menor impacto |
| **G4** | **Ativação Metabólica** | **74.0 kg** | 32.0% | 28.2% | 89 cm | 98 / 106 cm | Folha Eco + `74.0 kg` (BF 32% • 89cm) | Top Esportivo com costura reforçada + Tênis de treino Pro | Curvatura do abdômen retrai, cintura rompe abaixo dos 90cm, tônus nas coxas visível |
| **G5** | **Fronteira da Saúde (Saída Risco)**| **71.0 kg** | 29.5% | 29.0% | 85 cm | 96 / 104 cm | Insígnia "Coração de Gaia" + `71.0 kg` | **Insígnia Coração de Gaia** no peitoral + Luvas Berry frisos ouro rosa | Ponto de inflexão clínica: queda de 11kg, postura esguia, ombros e trapézio desenhados |
| **G6** | **Cintura de Ampulheta (< 80cm)** | **68.0 kg** | 27.0% | 29.8% | 79 cm | 94 / 102 cm | Raio Ciano ⚡ + `68.0 kg` (CINTURA < 80cm • ZONA VERDE) | Biker short de alta compressão esmeralda | **Zona Verde de Ouro da ABESO** (<80cm): silhueta em ampulheta evidente, abdômen plano |
| **G7** | **Silhueta Esculpida** | **65.0 kg** | 24.0% | 30.8% | 75 cm | 92 / 100 cm | Chama Neon + `65.0 kg` (BF 24% • 75cm) | Tênis edição especial turbo | Dorsais abrem harmonia com a cintura, pernas e panturrilhas com desenho atlético |
| **G8** | **Linhas de Definição (11-Line Abs)**| **62.5 kg** | 21.0% | 31.8% | 72 cm | 90 / 98 cm | Medalha de Prata + `62.5 kg` (BF 21% • 72cm) | Faixa Grafite Elite + Top Preto Carbono | Linha Alba e contornos laterais do abdômen nítidos, ombros firmes e postura altiva |
| **G9** | **O Limiar do Pódio Feminino** | **60.0 kg** | 19.0% | 32.8% | 69 cm | 89 / 96 cm | Troféu Ouro + `60.0 kg` (BF 19% • 69cm) | Luvas Berry com punhos dourados "GAIA" | Físico atlético esbelto de alta densidade muscular e cortes limpos, elegância natural |
| **G10**| **Gaia Campeã Suprema** | **58.0 kg** | 17.5% | 34.0% | 67 cm | 88 / 95 cm | Estrela Ouro ⭐ + `58.0 kg` (FORMA CAMPEÃ) | **Tiara de Louros com Esmeralda** + Pódio de Campeã + Aura Cósmica | Mulher definida, linda, 11-line abs esculpido, 100% humana sem nenhuma peça robótica |

#### Galeria de Renderizações Salvas da Gaia (`docs/evolution_benchmarks/`):
* **Gaia Campeã Suprema (Redesign Humano, Linda & Definida):** `docs/evolution_benchmarks/gaia_campea_humana_linda.jpg` *(ativo em `frontend/assets/avatars/gaia_athletic.png` e `gaia_lean.png`)*
* **Gaia Início / Robusta (Treino Pesado):** `docs/evolution_benchmarks/gaia_marco1_robust.png` *(ativo em `frontend/assets/avatars/gaia_robust.png`)*
* **Backup de Modelos Mecânicos Descartados:** `frontend/assets/avatars/gaia_athletic_robot_old.png` e `frontend/assets/avatars/gaia_lean_robot_old.png` (isolados para garantir zero robótica na experiência da usuária).

---

## 3.5 Os 3 Cenários Clínicos de Ganho de Peso da Gaia: Empatia, TPM & Glúteos de Rocha

Assim como o Titã, a Gaia conta com detecção clínica para 3 cenários de subida de peso na balança, com abordagem empática e livre de dismorfia:

| Cenário de Ganho | Causa Fisiológica | Comportamento da Gaia | Display Peitoral | Acessórios / Conduta Clínica | Frase da Mascote |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Retenção Hormonal / Fase Lútea (TPM)** (+1.5 a +2.5 kg transitórios) | Oscilação de estrogênio e progesterona retendo sódio e água subcutânea; gordura corporal inalterada | Bochechas coradas, leve inchaço abdominal, postura tranquila segurando garrafa de água esportiva | Ícone Gotas de Água 💧 + `60.5 kg` (`RETENÇÃO HORMONAL • BEBA 3L`) | Garrafa de água esportiva + Chá de hibisco suave | *"Meninas, TPM e retenção são pura oscilação hormonal transitória! Não pire na balança: muita água, chá e foco que passa em 48h!"* |
| **2. Rebote Adiposo / Alerta de Resgate da Guerreira** (+3.0 a +5.0 kg consistente) | Superávit calórico prolongado com acúmulo de gordura e aumento de medidas na cintura | Postura firme de guarda alta, toalha nos ombros, olhar acolhedor e determinado pronto para a volta por cima | Triângulo de Alerta Rosa/Âmbar ⚠️ + `86.0 kg` (`BF: 40% • CINTURA: 102cm`) | Toalha de boxe nos ombros + Plano de retomada limpa | *"Deslizes acontecem, mas nós somos guerreiras! Coloque o top, amarre o cabelo e vamos reconquistar cada centímetro com calma e foco!"* |
| **3. Hipertrofia Fit: Glúteos & Pernas de Rocha** (+1.5 a +3.5 kg Músculo Puro) | Treino de força com sobrecarga progressiva e aporte proteico, densificando quadríceps e glúteos | Quadríceps e glúteos densos esculpidos, cintura fina preservada, braços tonificados e postura altiva | Escudo Esmeralda com Haltere Ouro 🛡️ + `64.0 kg` (`MÚSCULO PURO • GLÚTEOS DE ROCHA`) | Munhequeiras Ouro Rosa + Cinto de agachamento | *"A balança subiu porque construímos pernas e glúteos de rocha! Cintura fina preservada e tônus de aço!"* |

---

## 3.6 A Esteira Master de Hipertrofia & Força da Gaia (GH1 a GH8 até 95.0 kg - A Valquíria Suprema)

Para o público feminino que foca em **hipertrofia, ganho de massa magra, força bruta e categorias Wellness / Strongwoman**, a esteira de progressão conta com 8 níveis simétricos aos do Titã:

| Nível / Nome Oficial | Peso (kg) | % Massa Magra | % Gordura | Cintura (cm) | Busto / Quadril (cm) | Ícone & Display Peitoral | Acessório / Visual Desbloqueado |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **GH1. Bikini Fitness Esculpida** | **62.0 kg** | 33.0% | 18.0% | 68 cm | 92 / 98 cm | Halteres Bronze + `62.0 kg` | Top Berry Clássico + Faixa Verde Esmeralda |
| **GH2. Curves & Tone** | **66.0 kg** | 34.2% | 18.8% | 70 cm | 94 / 101 cm | Halteres Prata + `66.0 kg` | Munhequeiras Ouro Rosa + Frisos Metálicos |
| **GH3. Wellness Athletic** | **70.0 kg** | 35.5% | 19.5% | 72 cm | 97 / 105 cm | Halteres Ouro + `70.0 kg` | Luvas Berry com frisos ouro rosa |
| **GH4. Glúteos & Pernas de Titânio**| **75.0 kg** | 37.0% | 20.2% | 74 cm | 100 / 109 cm | Haltere Ouro em Escudo 🛡️ + `75.0 kg`| Cinto de couro para agachamento pesado |
| **GH5. Heavyweight Wellness** | **80.0 kg** | 38.5% | 21.0% | 76 cm | 104 / 114 cm | Kettlebell Vulcânico + `80.0 kg` | Manoplas de aço escovado femininas |
| **GH6. Powerlifter Guerreira** | **85.0 kg** | 40.0% | 21.8% | 78 cm | 108 / 118 cm | Bigorna Dourada & Barra + `85.0 kg` | Faixas de joelho de competição de força |
| **GH7. Strongwoman de Elite** | **90.0 kg** | 41.5% | 22.2% | 80 cm | 112 / 122 cm | Martelo Divino & Escudo + `90.0 kg` | Cinto Powerlifting Titânico Feminino |
| **GH8. A Valquíria Suprema** | **95.0 kg** | 43.5% | 22.5% | 82 cm | 116 / 126 cm | Coroa Mística de Louros + `95.0 kg` | **Armadura de Valquíria Dourada & Esmeralda** + Cinturão Titan Championship + Aura Cósmica |

---

## 3.7 Gaia Ágil & Leve: O Arquétipo Peso-Pena Feminino (48.0 a 52.0 kg)

Para usuárias de estatura mais baixa ou que buscam o shape **corredora, peso-pena e agilidade total ("bem magrinha demais")**:
- **Peso:** 48.0 kg a 52.0 kg
- **% Gordura:** 14.0% a 16.0% (mínimo fisiológico saudável feminino)
- **Cintura:** 62 cm a 65 cm
- **Morfologia:** Mulher jovem, delicada, esguia, membros longos e finos, rosto suave e amigável.
- **Acessórios:** Luvas leves de treino, tênis de corrida leve, fone esportivo, rabo de cavalo alto.
- **Regra Absoluta:** 100% humana com pele macia e natural. **ZERO peças robóticas, pistões, engrenagens ou armaduras mecânicas.**

---

## 4. Matriz Paramétrica de Morfologia Corporal (`avatarEngine.ts`)

### 4.1 Os Arquétipos de Bioimpedância

| Arquétipo | Critério Clínico de Ativação | Silhueta Visual do Mascote 3D |
| :--- | :--- | :--- |
| `extreme_obese` | IMC ≥ 34 ou Gordura ≥ 31% (H) / ≥ 38% (M) | Tronco largo e esférico, barriga volumosa pendente, sem recorte muscular, postura pesada. |
| `robust` | Gordura ≥ 21% (H) / ≥ 28% (M) e IMC ≥ 25 | Corpo forte porém coberto por camada adiposa. Barriga saliente suave, sem gominhos visíveis. |
| `skinny_fat` | Perda de peso com catabolismo (músculo caiu / gordura subiu) OU BF alto com pouco músculo | Braços e pernas finos (haste murcha), abdômen proeminente e flácido, postura levemente curvada. |
| `athletic` | Gordura 11-18% (H) / 18-24% (M) com músculo equilibrado | Silhueta em V (V-Taper), abdômen plano com contornos definidos, peitoral desenhado. |
| `muscular` | Gordura ≤ 16% (H) / ≤ 22% (M) e Músculo ≥ 38% (H) / ≥ 32% (M) | Ombros largos, bíceps hipertrofiados, peitoral quadrado, 6 gominhos esculpidos. |
| `lean` / `extreme_lean` | IMC < 20 ou Gordura < 12% (H) / < 18% (M) sem hipertrofia | Tronco estreito, membros finos, postura ágil e leve. |

### 4.2 Lógica Matemática de Inibição Fisiológica de Definição

Para evitar gominhos irreais quando a gordura corporal for superior a 18.5% (homens) ou 25% (mulheres), o motor aplica:

```typescript
// avatarEngine.ts
const fatCutoffFull = sex === 'female' ? 18.0 : 12.0;   // Definição plena
const fatCutoffStart = sex === 'female' ? 25.0 : 18.5;  // Limiar de início da definição

let muscleDefinition = 0.05;
if (effectiveFat >= fatCutoffStart) {
  // Gordura subcutânea encobre os gominhos:
  muscleDefinition = Math.min(Math.max(Number((0.08 + Math.max(0, muscleDiff) * 0.02).toFixed(2)), 0.05), 0.22);
} else if (effectiveFat <= fatCutoffFull) {
  // Padrão ouro / atlético:
  muscleDefinition = Math.min(Math.max(Number((0.75 + Math.max(0, muscleDiff) * 0.04).toFixed(2)), 0.70), 1.0);
} else {
  // Faixa de transição gradual:
  const leanFactor = (fatCutoffStart - effectiveFat) / (fatCutoffStart - fatCutoffFull);
  const muscleBonus = Math.max(0, muscleDiff) * 0.025;
  muscleDefinition = Math.min(Math.max(Number(((0.22 + leanFactor * 0.50 + muscleBonus) * muscleRatio).toFixed(2)), 0.15), 0.95);
}
```

---

## 5. Implementação na Interface do Aplicativo

### 5.1 Tela Inicial (`frontend/app/(tabs)/index.tsx`)
- **Mascot Hero Arena:** Substitui gráficos estáticos isolados por uma arena imersiva.
- **Anel Calórico Integrado (Halo):** O círculo de progresso de calorias (verde/vermelho) contorna a base da balança do avatar 3D (`size={234}`).
- **Balão de Fala Dinâmico (Speech Bubble):** 
  - Comunica a meta do dia, calorias consumidas, calorias restantes e alerta de proteínas.
  - Ao tocar no balão ou no mascote, dispara uma animação de inspeção corporal (flexão de bíceps, olhar para a balança e fala personalizada).
- **Placar Tríplice:** Consumido | Restante / Percentual | Meta Diária.

### 5.2 Tela de Perfil (`frontend/app/(tabs)/profile.tsx`)
- **Card Duelo de Bioimpedância:**
  - Coluna Esquerda: 1ª Pesagem (Marco Zero).
  - Coluna Direita: Última Pesagem (Atual).
  - Coluna Central: Deltas de Peso (-8.4kg), Gordura (-8.4%), Músculo (+3.6%) e Cintura (-10cm).
  - Tag Semântica de Diagnóstico: `🟢 Queima Efetiva`, `🔴 Alerta de Flacidez`, `🏆 Hipertrofia`, `⚠️ Força Bruta` ou `📌 Marco Zero`.

---

## 6. Checklist de Execução & Testes

- [x] **Migration SQL:** `database/05_add_initial_muscle_and_bioimpedance_history.sql` criada para rastrear linha de base de músculo e data inicial.
- [x] **Endpoint de Comparação:** `/api/checkin/comparison` implementado em `frontend/core/api.ts` com fallback inteligente para perfis novos e cálculo de deltas.
- [x] **Motor Morfológico:** `frontend/core/domain/avatarEngine.ts` com arquétipos `extreme_obese`, `extreme_lean`, `skinny_fat`, cálculo calibrado de `flaccidityFactor` e inibição de definição por gordura subcutânea.
- [x] **Componente 3D:** `frontend/components/LivingAvatar3D.tsx` atualizado com suporte a `hideBubble` e renderização condicional de gominhos conforme `muscleDefinition > 0.35`.
- [x] **Arena na Home:** `frontend/app/(tabs)/index.tsx` integrada com o Mascote no centro do palco e anel calórico.
- [x] **Duelo no Perfil:** `frontend/app/(tabs)/profile.tsx` integrado com o comparativo de bioimpedância.
- [x] **Testes Unitários:** 100% dos 14 testes de domínio validados em `frontend/core/domain/test-domain.mjs`.
- [x] **Compilação TypeScript:** `tsc --noEmit` executado com 0 erros.
