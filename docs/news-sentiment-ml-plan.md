# Plano — Análise de Sentimento de Notícias (stack sem LLM, custo zero)

> Status: **PLANO (não implementado)**. Documento de decisão. Nada de código até
> João dar o "vai".
> Autor do rascunho: Claude Code · Atualizado: 2026-06-14

## 0. TL;DR

Substituir o classificador regex por uma **pipeline de modelos pré-treinados
abertos**, sem LLM em runtime e **sem nenhum custo além do plano atual**:

```
manchete ─► [se PT] tradução PT→EN (opus-mt, ONNX)
         │
         ├─► FinBERT          (tom: positivo/negativo/neutro)        ┐
         ├─► zero-shot NLI     (tema/evento: escalada vs cessar-fogo) ┤─► features
         └─► ABSA              (sentimento POR ATIVO citado)          ┘
                                          │
                                          ▼
            grafo econômico calibrado por correlação de preço  (efeitos de 2ª ordem · prior)
                                          │
                                          ▼
            cabeça leve (ridge/logística) treinada em RETORNO REAL de preço  ◄── alvo principal
                                          │              (bootstrap histórico HOJE + refino forward)
                                          ▼
                 score direcional por ativo → NewsIntelligence (contrato inalterado)
```

**Decisões travadas (Gate Fase 0 — fechado com João em 2026-06-14):**
1. **Runtime:** ~~ONNX/transformers.js **embarcado no worker**~~ **REVISADO em
   2026-06-14 (Gate de Viabilidade — ver §3).** O Cloudflare Worker existente é só
   um cron pinger (38 linhas) e os limites do Workers (script 3/10 MiB, **128 MB de
   RAM fixos**, asset WASM < 25 MiB vs. ORT de 25.9 MiB) inviabilizam embarcar a
   stack §2. **Nova decisão: micro-serviço Python dedicado** (transformers/PyABSA
   completos), invocado pelo `/api/news`. Modelo de hospedagem (sub-decisão
   restante): **free tier sob-demanda com cold-start** (HF Spaces/Fly/Render) para
   honrar o custo-zero do §0/§11, ou local/own-box. A inferência fica fora do
   caminho do Claude (satisfaz "nada para se o acesso ao Claude acabar").
2. **Idiomas:** **EN + PT.** Manchetes em português (dados Brasil) passam por uma
   **tradução PT→EN** (modelo aberto, ONNX) antes da pipeline EN. Implica também
   **adicionar feeds PT** (ver §4).
3. **Alvo:** mirar **direto na cabeça leve treinada por reação de preço**. O grafo
   calibrado por correlação é o **prior** (dá sinal no dia 1), não um produto final
   separado.
4. **Janela de reação de preço (rótulo):** a mais curta praticável — **primário
   15 min**, configurável (15/30/60). Ver §8.
5. **Dataset:** montar **bootstrap histórico HOJE** (GDELT + FNSPID + Yahoo) e
   treinar a cabeça já; o **forward collection roda em paralelo como refino
   contínuo** — não é mais a única forma do modelo existir. Ver §4.

**Invariantes firmes:**
- ❌ Sem LLM (Claude/qualquer um) em runtime e sem API paga.
- ❌ Sem rotulação manual por LLM.
- ✅ Só pesos abertos gratuitos + dados públicos gratuitos + dados que já temos.
- ✅ Custo de inferência **zero marginal**; produção **não depende** de Claude.
- ✅ Regex atual permanece como **fallback** determinístico.

---

## 1. Problema

O classificador atual (`src/lib/news/classifier.ts`) é um motor de **regras regex**.
Ele falha em duas frentes:

1. **Detecção de tom** — não entende negação ("not as hot as feared"), ironia ou
   contexto; a direção sai de um léxico cru de palavras-chave.
2. **Direção por ativo** — usa um mapa estático manual (`FACTOR_ASSET_EXPOSURES`)
   que não distingue *escalada* de *cessar-fogo*, nem captura efeitos cruzados
   (dólar forte → ruim pro ouro/EM) ou de segunda ordem.

O objetivo é **impacto direcional por ativo, com convicção**, mantendo o contrato
que o resto do código já consome:

```ts
NewsIntelligence {
  assets:  Partial<Record<NewsAsset,  NewsAggregate>>  // direção, intensidade, convicção
  factors: Partial<Record<NewsFactor, NewsAggregate>>
}
```

**Não-objetivos:** prever preço; ler corpo de matéria (só temos títulos); idiomas
além de EN/PT; usar qualquer LLM em runtime.

---

## 2. A stack — cada camada e o que resolve

| Camada | Tecnologia | Resolve | Custo |
|---|---|---|---|
| **Idioma (PT→EN)** | **MT aberto** (`Helsinki-NLP/opus-mt-pt-en` ou similar, ONNX) | normaliza manchetes PT (Brasil) para a pipeline EN, sem manter dois conjuntos de modelos | grátis |
| **Tom** | **FinBERT** (`ProsusAI/finbert` ou variante *financial-news*) | tom positivo/negativo/neutro, com negação/contexto (melhor que regex) | grátis |
| **Tema/evento** | **Zero-shot NLI** (`bart-large-mnli` / `deberta-mnli`) | classifica contra rótulos arbitrários ("desescalada", "aperto monetário", "choque de oferta") **sem treinar** — desambigua cessar-fogo vs escalada | grátis |
| **Sentimento por ativo citado** | **ABSA** (`deberta-v3-base-absa`, PyABSA) | sentimento direcionado a um *aspecto*: `(manchete, "petróleo") → neg`; `(manchete, "ações") → pos` — o coração da "2ª parte" | grátis |
| **Efeito em ativo não citado** | **Grafo econômico assinado, calibrado por correlação de preço** | propaga o driver primário para ativos de 2ª ordem (dólar↑ → ouro−, EM−); pesos das arestas **vêm da co-movimentação histórica**. **É o prior.** | grátis (dado que já temos) |
| **Decisão final por ativo** | **Cabeça leve (ridge/logística) por ativo** — **alvo principal** | mapeia o vetor de features → score direcional; treinada em **retorno real de preço** (rótulo grátis, não-circular) | grátis |
| **Fallback** | **Regex atual** | garante `NewsIntelligence` mesmo se um modelo falhar/timeout | grátis |

### Por que ABSA é a peça central
O FinBERT dá **um** rótulo pra frase inteira — não sabe pra qual ativo nem em que
direção. O ABSA responde "positivo/negativo **em relação a [alvo]**", então uma
mesma manchete vira sinais opostos pra ativos diferentes. É exatamente a "segunda
parte" que o FinBERT sozinho não cobre.

### Por que o grafo + cabeça por preço
ABSA só alcança o ativo que dá pra inferir do texto. Pro ativo **não citado** e
pros efeitos de 2ª ordem, o **grafo calibrado por correlação** propaga o sinal e
serve de **prior** enquanto a cabeça tem pouco dado fino. A **cabeça leve treinada
em reação de preço** é o **alvo**: substitui o mapa manual por algo aterrado no
mercado.

### Idiomas (EN + PT) — decisão travada
Os modelos financeiros maduros (FinBERT/ABSA) são em inglês. Para os **dados
Brasil** (BRL, IBOV, DI, PBR/VALE/ITUB), manchetes em português entram por um
**passo de tradução PT→EN** (modelo aberto, ONNX) e seguem a **mesma pipeline EN**.
Ressalva: a tradução pode achatar nuance; plano B = modelos **multilíngues**
(xlm-roberta / mDeBERTa), avaliado na Fase 1.

---

## 3. Onde roda (runtime — REVISADO 2026-06-14 após Gate de Viabilidade)

> **⚠️ Decisão original reprovada no gate.** A premissa "ONNX/transformers.js
> embarcado no worker Cloudflare que já existe" caiu por dois motivos:
> 1. O worker existente (`deploy/cloudflare-worker/src/index.ts`) **não hospeda
>    lógica** — é um cron pinger de 38 linhas que só chama `/api/market` e
>    `/api/sim` na Vercel. A classificação de notícia roda em **rota Next.js na
>    Vercel**, não no Cloudflare.
> 2. Limites do Cloudflare Workers: script **3 MiB (free) / 10 MiB (paid)**,
>    memória **128 MB por isolate, fixa e não elevável**, asset WASM **< 25 MiB**
>    (o runtime `ort-wasm-simd-threaded.asyncify.wasm` tem **25.9 MiB** → nem
>    carrega; cf. transformers.js issue #1521), CPU 10 ms (free)/50 ms (paid). O
>    conjunto §2 (FinBERT 110M + bart-large-mnli 407M + deberta-absa 184M + opus-mt
>    77M) estoura a RAM mesmo quantizado. **Não roda — nem parcialmente.**
>
> **Decisão nova (João, 2026-06-14):** **micro-serviço Python dedicado** com
> transformers/PyABSA completos, invocado pelo `/api/news` (HTTP). Hospedagem alvo:
> free tier sob-demanda com cold-start (custo $0) — sub-decisão a confirmar.

Grafo e regressão leve continuam triviais e rodam em qualquer lugar, inclusive
direto no `/api/news`.

> **Nota:** a **construção do dataset** (§4) e o **treino da cabeça** rodam
> **offline**, no seu ambiente — não no worker. Só a *inferência* roda embarcada.
> BigQuery (GDELT) e download de datasets são passos de build, não de runtime.

### Orçamento near-tick
Cache **por id de manchete** → só processa título **novo**. Por manchete nova:
[tradução se PT] + FinBERT (1 passe) + ABSA **só nos 1–3 aspectos** que o
NER/zero-shot indicar (não nos 11 ativos) + zero-shot (1 passe) + grafo/regressão
(instantâneo). **Tamanho do bundle** é o risco a vigiar — carregamento lazy +
quantização agressiva.

---

## 4. Dados — bootstrap histórico HOJE + refino forward

A pipeline base (MT + FinBERT + zero-shot + ABSA) é **pré-treinada → funciona sem
nenhum dado nosso**. O que precisa de dados é só a **calibração** do grafo e da
cabeça leve — e isso **não precisa esperar coleta**, porque dá pra montar um
dataset histórico **agora**, de graça.

### 4.1 Bootstrap histórico (montar hoje)

**Notícias com timestamp (a parte antes faltante):**

| Fonte | O que dá | Custo |
|---|---|---|
| **GDELT** ⭐ | Notícia global com **timestamp** (a cada 15 min), desde 2015, com **tom, temas e entidades** já computados; via **BigQuery free tier** | grátis |
| **FNSPID** | ~15M notícias financeiras **já alinhadas com preço** (S&P 500), 2024 | grátis (HuggingFace/GitHub) |
| **CC-NEWS** (opcional) | Arquivo de artigos desde 2016, com data | ~grátis (compute) |

**Preço para o rótulo:**

| Fonte | O que dá | Limite |
|---|---|---|
| **Yahoo intraday** (já usamos) | barras de 15 min nos **últimos ~60 dias** | janela fina só recente |
| **Yahoo daily** | closes diários de **anos** | granularidade grossa |
| **Stooq / Alpha Vantage / Twelve Data** | mais histórico (rate-limited) | suplementar |

**Como o rótulo é montado:** `label(ativo, manchete) = sinal(retorno(ativo, t_pub → t_pub+janela))`
(§8), pareando o timestamp GDELT/FNSPID com a barra de preço correspondente.

### 4.2 Estratégia de granularidade (a pegadinha honesta)
- **Rótulo fino (15–60 min):** só nos **~60 dias** de sobreposição (GDELT + Yahoo
  intraday). Já são **milhares de eventos** — bootstrap real, disponível hoje.
- **Rótulo grosso (próximo close):** **anos** de GDELT + closes diários → dataset
  grande, label mais ruidoso, usado como **prior** e para os ativos magros.
- **PT/Brasil é mais magro** nesses arquivos → bootstrap PT menor; o forward
  collection + feeds PT compensam ao longo do tempo.

### 4.3 Refino forward (roda sozinho, em paralelo)
A partir do deploy, gravar a cada tick **manchete + snapshot de preço** num store.
Isso acumula reações intradiárias reais (inclusive PT) e **re-treina a cabeça
periodicamente** — o modelo só melhora com o tempo, sem intervenção. **Tudo já fica
pronto hoje; o forward é refinamento, não pré-requisito.**

### 4.4 Feeds PT (novo)
Habilitar fontes em português para os ativos Brasil (ex.: Google News PT por tema;
avaliar InfoMoney/Brazil Journal — Valor está bloqueado, ver CLAUDE.md). Sem feed
PT, o suporte PT não tem o que classificar em produção.

### 4.5 No-lookahead
Features usam só o título e o timestamp da própria manchete; a calibração usa
retornos **após** a manchete, mas o modelo em produção **nunca** vê preço futuro ao
pontuar.

---

## 5. Arquitetura de integração

```
NewsItem ─► [PT? → MT PT→EN] ─► [FinBERT] ─► tom
                              ─► [zero-shot NLI] ─► tema/evento (signed)
                              ─► [NER/gate] ─► aspectos ─► [ABSA por aspecto] ─► sentimento/ativo
                                          │
                       vetor de features ─┤
                                          ▼
              [grafo econômico calibrado por correlação]  → propagação 2ª ordem / prior
                                          ▼
              [cabeça leve ridge/logística por ativo]      → score direcional  (alvo)
                                          ▼
              adapter → NewsIntelligence (assets/factors)  ← contrato inalterado
                                          │
              (timeout/erro em qualquer modelo) → [regex fallback]
```

- O `aggregates.ts` e o resto do app **não mudam** — só trocamos o "cérebro" que
  produz direção/convicção por fator/ativo.
- Degradação graciosa: qualquer falha → regex assume; nunca fica sem
  `NewsIntelligence`.

---

## 6. Time de agentes (papéis, entradas, saídas, gates)

Cada papel pode ser um subagente do Claude Code (`Explore`, `Plan`,
`general-purpose`). **Orquestrador = sessão principal**, abrindo gates com João.
Nenhum agente envolve LLM em runtime do produto — agentes são só para *construir*.

| Agente | Papel | Entrada | Saída | Gate |
|---|---|---|---|---|
| **A0 · Pesquisa** (`Explore`) | Validar pesos abertos (MT, FinBERT, ABSA, NLI) + tamanho ONNX + latência no worker; licenças | Este plano | Lista final de modelos + benchmark | Confirma viabilidade ONNX |
| **A1 · Dataset bootstrap** (`general-purpose`) | **Ingerir GDELT (BigQuery) + FNSPID + Yahoo intraday/daily**, parear notícia↔preço, montar rótulos (§8); filtrar pro universo; splits temporais | Fontes públicas | Dataset histórico rotulado (fino 60d + grosso anos) | Entrega a A4 |
| **A1b · Forward collection** (`general-purpose`) | Gravar manchete+preço a cada tick; **feeds PT**; pipeline de re-treino periódico | RSS atual + feeds PT | Store contínuo + job de refino | Roda em paralelo |
| **A2 · Detecção** (`general-purpose`) | Integrar MT PT→EN + FinBERT + zero-shot + ABSA (ONNX no worker), gate de aspectos, cache por id | Modelos de A0 | Módulo de features por manchete | Entrega a A4 |
| **A3 · Grafo econômico** (`general-purpose`) | Grafo assinado fator→ativo; **calibrar pesos pela correlação de preço**; serve de prior | Histórico de preço | Grafo calibrado | Entrega a A4 |
| **A4 · Cabeça leve** (`general-purpose`) — **alvo** | Treinar ridge/logística por ativo com features (A2/A3) e **rótulos do bootstrap** (A1); grafo como prior; export | A1+A2+A3 | Modelo por ativo + métricas vs regex | **Gate**: bate o regex? |
| **A5 · Integração** (`general-purpose`) | Servir tudo (ONNX/worker), adapter → `NewsIntelligence`, cache, fallback regex, feature flag | A2/A3/A4, `lib/news/*` | PR de integração atrás de flag | Entrega a A6 |
| **A6 · Avaliação/QA** (`Explore`/`general-purpose`) | Held-out + conjunto-armadilha (cessar-fogo, negação, efeitos cruzados, manchete PT); calibração; A/B vs regex | Saídas A4/A5 | Relatório + go/no-go | **Gate final** → João aprova produção |
| **A7 · Riscos/Guardrails** (transversal) | Latência near-tick, tamanho do bundle, no-lookahead, modos de falha | Todos | Checklist de risco | Bloqueia merge se violar invariantes |

---

## 7. Fases e milestones

- **Fase 1 — Detecção** (A0+A2): MT + FinBERT + zero-shot + ABSA em ONNX no worker,
  cache por id. **Já é upgrade sobre o regex**, cobre EN+PT.
- **Fase 2 — Dataset bootstrap** (A1+A3): ingerir GDELT+FNSPID+Yahoo, montar
  rótulos (§8), grafo calibrado por correlação. **Tudo offline, disponível hoje.**
- **Fase 3 — Cabeça leve por preço** (A4) — **o alvo**: treinar **já com o
  bootstrap**, **superando o baseline regex** no conjunto-armadilha. *Gate.*
- **Fase 4 — Integração + forward** (A5+A1b): servir atrás de flag, fallback regex,
  e ligar a coleta forward + re-treino periódico (refino contínuo).
- **Fase 5 — Eval & rollout** (A6/A7): A/B, calibração, go/no-go. *Gate João.*

O modelo **nasce treinado hoje** (bootstrap) e **se aprimora sozinho** com o
forward collection — sem esperar meses de coleta no caminho crítico.

---

## 8. Rótulo: janela de reação de preço (decisão travada)

Quanto antes melhor → **janela primária de 15 min** após a publicação, com 30 e
60 min como variantes configuráveis (`LABEL_WINDOW_MIN`).

```
label(ativo, manchete) = sinal( retorno(ativo, t_pub → t_pub + janela) )
```

- **Bootstrap fino (15–60 min):** ~60 dias de sobreposição GDELT × Yahoo intraday.
- **Bootstrap grosso (próximo close):** anos de GDELT × Yahoo daily → prior + ativos magros.
- **Forward:** a coleta grava preço a cada tick, então a janela de 15 min vive em
  dados reais daqui pra frente e o re-treino periódico a refina.

---

## 9. Critérios de aceite

- **Acurácia direcional por ativo** no test set **> baseline regex** (mesmos dados,
  rótulos = reação de preço na janela §8).
- **Conjunto-armadilha**: cessar-fogo, negação, "miss vs beat", ao menos um efeito
  cruzado (dólar↑ → ouro−) e **ao menos uma manchete PT** corretos.
- **Convicção calibrada** (Brier score).
- **Latência near-tick** + bundle ONNX dentro do limite do worker.
- **Custo marginal de inferência = 0** e **zero dependência de LLM/serviço pago**.
- **No-lookahead** intacto; **fallback regex** sempre disponível.

---

## 10. Riscos e mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| Vários modelos ONNX estouram tamanho/latência do worker | **Alta** | Quantização; lazy load; ABSA só em 1–3 aspectos; cache por id; medir na Fase 1 |
| GDELT/CC-NEWS grandes e ruidosos | Média | Filtrar por ativo/tema; BigQuery free tier; começar com FNSPID (já alinhado) |
| Intradiário fino só ~60d (Yahoo) | Média | Bootstrap fino 60d + grosso de anos como prior; forward refina a janela curta |
| Cobertura PT/Brasil magra nos arquivos | Média | Forward collection + feeds PT compensam; grafo como prior pros ativos magros |
| Tradução PT→EN distorce nuance | Média | Plano B multilíngue (xlm-roberta/mDeBERTa); conjunto-armadilha PT |
| Overfitting da cabeça | Média | Splits temporais; ridge; eval out-of-time |

---

## 11. Custo — explicitamente zero

- **Setup:** pesos abertos (MT/FinBERT/ABSA/NLI) + dados públicos (GDELT/FNSPID/Yahoo) — grátis.
- **Treino da cabeça:** CPU local — grátis.
- **Inferência em produção:** ONNX embarcado no worker — **zero marginal**.
- **Sem API paga, sem LLM, sem rotulação manual.** Nada além do plano atual.

A única "moeda" é tempo de desenvolvimento. Produção não consome tokens nem depende
de Claude — **nada para se o acesso ao Claude acabar**.

---

## 12. Próximo passo

Gate Fase 0 fechado (§0). Com o **bootstrap histórico**, as Fases 1–3 são todas
**construíveis hoje** (sem espera de coleta no caminho crítico); o forward
collection (Fase 4) só refina.

---

## 12b. Status de implementação

- **Fase 0 (gate):** ✅ ONNX-no-worker reprovado; runtime = micro-serviço Python (§3).
- **Fase 1 (detecção):** ✅ `services/news-nlp/` (MT+FinBERT+zero-shot+ABSA) +
  integração TS (`src/lib/news/{vocab,decay,graph,mlClassifier,classify}.ts`),
  contrato `NewsIntelligence` inalterado, regex como fallback atrás de
  `NEWS_ML_ENABLED` (default off). type-check/lint/smoke OK.
- **Fase 2 (dataset + grafo):** ✅ toolchain offline em `research/news-bootstrap/`.
  - **Grafo calibrado (A3):** rodado de verdade → `src/lib/news/calibratedGraph.json`
    (33 arestas calibradas por correlação de preço Yahoo, 6 mantidas como prior por
    falta de proxy). Calibração **preserva o sinal do prior**, magnitude = `|corr|`
    (dois cuidados: BRL=X é USD/BRL; proxies de ETF setorial carregam beta de
    mercado — sinais livres só na cabeça da Fase 3). Ativado por
    `NEWS_GRAPH_CALIBRATED=true` (default off; sobrescreve só arestas existentes).
  - **Dataset (A1):** `gdelt.py`/`fnspid.py`/`labels.py`/`splits.py`/`build_dataset.py`
    + `demo_label.py` (prova rodável dos rótulos §8 em intraday Yahoo, sem credenciais).
    GDELT (BigQuery) e FNSPID (HF) precisam rodar no ambiente do João.
- **Fase 3 (cabeça leve):** ✅ implementada. Logística L2 por ativo (`train_head.py`,
  stdlib), grafo como **âncora L2** do prior, splits temporais, export para
  `src/lib/news/headWeights.json`. Vetor de features compartilhado Py↔TS
  (`featurelib.py` ↔ `src/lib/news/head.ts`): `[bias, graph_prior, absa, tone,
  relevance, confidence]`. Runtime em `head.ts`, integrado no `mlClassifier`
  (`combineAssets`) atrás de `NEWS_HEAD_ENABLED` (default off; fallback = grafo+ABSA).
  Serviço passou a emitir `tone`. **Validação controlada** (dados sintéticos com
  negação/efeito-cruzado): cabeça **77.3% vs baseline-tom 59.4% (+17.8 pts)**,
  Brier 0.299→0.153; trap set §9 cabeça 8/12 vs baseline 2/12.
  ⚠️ `headWeights.json` atual = **pesos sintéticos (placeholder)** só para validar o
  aprendiz/loader. A métrica de aceite real (§9) exige **re-treino no dataset offline**
  (features do serviço Fase 1 + rótulos GDELT/FNSPID) antes de ligar em produção.
- **Fase 4 (forward + integração):** ✅ implementada.
  - **Feeds PT (§4.4):** `gnews-br` (Google News PT por tema macro), `infomoney`,
    `braziljournal` em `NEWS_SOURCES`. Smoke: 12 manchetes PT no feed.
  - **Coleta forward (A1b):** `src/lib/news/forwardCollector.ts` persiste cada
    manchete nova (id, título, fonte, publishedAt, observedAt) — tabela Neon
    `news_forward` quando há `DATABASE_URL`, senão JSONL em `data/` — atrás de
    `NEWS_FORWARD_ENABLED` (default off), best-effort (nunca quebra `/api/news`).
  - **Bridge de re-treino (offline/manual):** `research/news-bootstrap/forward_to_dataset.py`
    lê o store → rotula via Yahoo intraday (§8) → `train_head.py`. Loop validado com
    dados reais: 50 manchetes → 101 linhas rotuladas.
  - **Re-treino CONTÍNUO (automático, sem cron manual):**
    - `services/news-nlp` ganhou `POST /retrain` (+ `retrain.py` self-contained):
      lê `news_forward` do Neon → rotula via Yahoo → treina a cabeça → grava em
      `head_weights` (Neon). Single-flight, em thread de fundo.
    - O **worker Cloudflare** (sempre-ligado, tick de minuto) dispara `/retrain`
      **1×/dia** (`RETRAIN_HOUR_UTC`, default 06:00 UTC) — acorda o serviço
      scale-to-zero, que re-treina e dorme.
    - O app **lê `head_weights` do Neon em runtime** (`head.ts`, TTL ~10min,
      fallback no JSON estático) → a cabeça melhora **sem redeploy e sem você rodar
      nada**.
  - **Consequência:** o bootstrap **GDELT/FNSPID deixa de ser pré-requisito** —
    vira acelerador opcional de cold-start. Com o forward contínuo + grafo como
    prior no dia 1, a cabeça esquenta sozinha com reações reais (inclusive PT).
  - **Seed seguro:** `headWeights.json` agora é uma **semente-prior** (segue o
    grafo+ABSA), não mais sintética. Logo `NEWS_HEAD_ENABLED` pode ficar **on desde
    o dia 1** sem risco: comporta-se como o grafo até o 1º re-treino real, e a
    partir daí melhora sozinho. Não há mais gate de "esperar pra ligar a cabeça".
  - **Anti-overfit (gate de holdout):** `retrain.py` só publica novos pesos se eles
    **superarem o prior no teste temporal** (global e por ativo); senão mantém os
    atuais. Cabeça minúscula (6 features) + âncora L2 no grafo + `MIN_ROWS=150`
    garantem que, com pouco/ruidoso dado, ela **encolhe pro grafo** em vez de
    decorar ruído. A cabeça ao vivo nunca fica pior que o grafo out-of-sample.
    Tunável: `RETRAIN_MIN_EDGE` (margem exigida acima do prior).

### Como ligar em produção (todas as flags são server-side, default off)

| Flag | Liga | Pré-requisito |
|---|---|---|
| `NEWS_ML_ENABLED` + `NEWS_NLP_URL` (+`NEWS_NLP_TOKEN`) | pipeline ML (Fase 1) no lugar do regex | serviço `services/news-nlp` no ar |
| `NEWS_GRAPH_CALIBRATED` | grafo calibrado por preço (Fase 2/A3) como prior | `calibratedGraph.json` (gerado) |
| `NEWS_HEAD_ENABLED` | cabeça por ativo (Fase 3/A4) | seguro no dia 1 (seed = segue o grafo); melhora sozinho via `head_weights` no Neon |
| `NEWS_FORWARD_ENABLED` | coleta forward (Fase 4) | `DATABASE_URL` (Neon) em produção |

Para o re-treino contínuo, setar no **worker Cloudflare**: `NEWS_NLP_URL`,
`NEWS_NLP_TOKEN`, `RETRAIN_HOUR_UTC` (opcional). O serviço e o app compartilham o
mesmo `DATABASE_URL` (Neon).

Regex permanece como fallback determinístico em todas as combinações; o contrato
`NewsIntelligence` e o no-lookahead são invariantes em todas as fases.

### O que só você pode fazer (não é código — deploy + segredos)
1. Subir `services/news-nlp` num host (HF Spaces/Fly/Render free) e pegar a URL.
2. Setar as flags acima na Vercel e no worker; `npm run deploy` no worker.
3. (Opcional) cold-start GDELT/FNSPID — **não é mais bloqueio** (ver Fase 4).
A partir daí o refino é automático; nada de rodar scripts à mão.

---

## 13. Handoff para um agente novo (cold start) — leia isto primeiro

Se você é um agente pegando este projeto do zero, siga esta ordem e estes limites.
Não tente fazer tudo de uma vez.

### Ordem de leitura
1. `CLAUDE.md` na raiz (arquitetura geral, fontes de dados, convenções).
2. Este documento inteiro (decisões travadas no §0 são **não-negociáveis**).
3. Os arquivos da superfície de integração (abaixo) — **leia antes de escrever**.

### Superfície de integração (arquivos exatos a conhecer)
- **Contrato de saída:** `src/types/market.ts` → `NewsIntelligence`, `NewsItem`,
  `NewsClassification`, `NewsAggregate`, `NewsAsset`, `NewsFactor`. **Não mude esse
  contrato** — o app inteiro consome ele. Você troca só quem *produz* a classificação.
- **O que substituir (o "cérebro" atual):** `src/lib/news/classifier.ts`
  (regex → vira fallback) e `src/lib/news/aggregates.ts` (mantém igual).
- **Onde a notícia é buscada:** `src/lib/fetchers/news.ts`. Feeds em
  `src/lib/constants.ts` → `NEWS_SOURCES` (adicionar feeds PT aqui — Fase 4).
- **Quem usa a saída no sim:** `src/app/api/sim/route.ts` +
  `src/lib/sim/newsTrigger.ts` + `src/lib/sim/strategies.ts` (`newsSignal`). A nova
  pipeline deve devolver o mesmo formato.
- **Preço para calibrar:** `src/lib/fetchers/yahooHistory.ts`,
  `src/lib/analytics.ts`, e o tape em `src/lib/sim/engine.ts` (`intradayEquity`).
- **Worker (runtime ONNX):** `deploy/cloudflare-worker/` (ver `DEPLOY.md`).

### Dataset bootstrap (passos de BUILD, offline — ver §4)
- **GDELT** via BigQuery (free tier): notícia+timestamp+tom desde 2015.
- **FNSPID** (HuggingFace/GitHub): notícia financeira já alinhada com preço (US).
- **Yahoo**: intraday (~60d, janela fina) + daily (anos, janela grossa).
- Parear timestamp↔preço, montar rótulo (§8), splits temporais. **Roda no seu
  ambiente, não no worker.**

### Faça PRIMEIRO (gate de viabilidade)
Validar que **transformers.js/ONNX roda dentro do Cloudflare Worker** com os
modelos escolhidos (tamanho de bundle, CPU time, cold start). **Se não couber**,
pare e leve ao João (contingência: Workers AI / micro-serviço).

### Ordem de implementação (construível hoje, graças ao bootstrap)
1. **Fase 1** — detecção (MT+FinBERT+zero-shot+ABSA), `NewsIntelligence` idêntico,
   **regex como fallback** atrás de feature flag.
2. **Fase 2** — montar o dataset bootstrap (GDELT+FNSPID+Yahoo) + grafo calibrado.
3. **Fase 3** — treinar a cabeça leve por ativo com o bootstrap; bater o regex.
4. **Fase 4** — integrar + ligar forward collection (feeds PT + re-treino periódico).
Reporte ao fim de cada fase.

### Como verificar (não há suíte de testes — ver CLAUDE.md)
- `npm run type-check` e `npm run lint` (limpos).
- Smoke test: `npm run dev` + `Invoke-WebRequest http://localhost:3000/api/news`
  — conferir `intelligence.assets`/`factors` preenchidos.
- Deploy: `npx vercel --prod --yes` (projeto linkado); worker via wrangler.

### Invariantes que não podem ser violados
- Sem LLM em runtime, sem API paga, sem rotulação manual (§0).
- `NewsIntelligence` não muda de formato.
- No-lookahead: classificar usa só o título + timestamp da própria manchete.
- Fallback regex sempre disponível; o app nunca fica sem classificação.
