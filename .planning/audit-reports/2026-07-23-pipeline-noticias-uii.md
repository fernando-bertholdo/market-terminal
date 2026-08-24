# Auditoria do pipeline de notícias contra a UII

> **Data de origem: 2026-07-23.** Este documento é a transposição fiel de um
> relatório produzido naquela data — não foi reescrito, reordenado nem
> revalidado contra o código de hoje.
>
> | | |
> |---|---|
> | Produzido em | 2026-07-23, sessão `3e8ad4d6-6ff1-4681-9635-28856e7b0970` |
> | Processo | `audit-news` — auditoria automatizada, **modo somente-leitura** |
> | Transposto em | 2026-08-20, issue TECH-31 |
> | Escopo do resgate | transposição literal; nenhum finding foi corrigido |
>
> **Como ler.** Os caminhos e números de linha apontam para o estado do código
> em 2026-07-23. Parte pode ter mudado — confira antes de agir. Um finding aqui
> é registro histórico, não tarefa aberta: a decisão sobre o que vira trabalho
> ainda não foi tomada (P2 da TECH-31).

---

AUDITORIA — Pipeline de notícias vs UII (read-only, nada editado)

## 1. INVENTÁRIO DO PIPELINE (o que é computado)

Por headline — `NewsClassification` (types/market.ts:54-63): themes[], factors[] (sinais assinados), assets[] (sinais assinados), relevance, confidence, decay, ageMinutes, halfLifeMinutes.
- Vocabulário: 13 temas, 14 fatores, 10 ativos (vocab.ts:11-55).
- Regex classifier (classifier.ts:146-199): 18 regras tema→fator + direção por POSITIVE/NEGATIVE/RISK_OFF/RISK_ON (classifier.ts:134-137); confidence = 0.45 + min(matches,3)×0.12 + bônus direção (185-187).
- Time decay: half-life 720min (monetary/inflation) senão 360min (decay.ts:27-29).
- Propagação fator→ativo pelo grafo econômico (graph.ts:19-37 prior estático; graph.ts:47-68 recalibra magnitudes por co-movimento de preço se NEWS_GRAPH_CALIBRATED=true, calibratedGraph.json).
- impact escalar = relevance×confidence×decay (newsTrigger.ts:81-82; NewsPage.tsx:250).
- duplicateCount por dedup (dedupe.ts:55).

Agregados — `NewsIntelligence` (aggregates.ts:79-104): POR FATOR **e POR ATIVO**: score (média direcional ponderada), intensity, mentions, positive/negative/neutral, latestAt. peso = relevance×confidence×decay×strength (aggregates.ts:23-27). Exposto em /api/news `intelligence` (route.ts:27).

Saúde de fonte — `SourceStatus` (news.ts:184-204, 321-343): ok, stale, cache(hit/miss/refresh/stale), fetchedAt, lastSuccessAt, ageMs, itemCount, invalidItemCount, por fonte + agregado `news`.
Freshness (news.ts:350-355): ttlMs, staleIfErrorMs, oldestSourceAgeMs, newestPublishedAt.
Classification status (mlClassifier.ts:114-135): mode(disabled/unconfigured/ml/fallback), mlEnabled/Configured/Attempted/Success, requested/sent/mlClassified/fallback Items, maxItemsPerBatch, durationMs, error, httpStatus.
ML runtime (ml-status route:159-213): mode(disabled/unconfigured/ml-trained/ml-seed/fallback), health serviço (ok/latency/url), runtime classifier (attempts/successes/failures/fallbackRate), forward tape rows + latest published/observed, head weights (trained/seed/updatedAt/generatedAt/source/rows/headlines/assetModels).
Head por-ativo (head.ts:130-138): regressão logística sobre vetor de 6 features [bias, graph_prior, absa, tone, relevance, confidence]; recarrega pesos do Neon head_weights em runtime (head.ts:76-106).
Overlay quant (strategies.ts:221-281 newsSignal): score de ativo+fatores temáticos → símbolos do SIM_UNIVERSE. Pre-market triggers (newsTrigger.ts:69-119): impact≥0.4, idade≤240min → newsCoeff 0.35→0.9 (strategies.ts:531-538) + rebalance forçado, persistido em state.newsTriggers.

## 2. INVENTÁRIO DA UI (o que é renderizado) + gaps

NewsPage.tsx renderiza: card de status do modelo ML (mode badge, health NLP+latency+url, mlClassified/sent, forward rows, head trained/seed) (62-125); barra de freshness (newestPublishedAt, dots por fonte, poll) (127-154); **"Live macro read" = top 6 FATORES por intensity** (53-56, 156-183); chips de fonte + busca textual (185-212); lista de headlines: título, badge fonte, relTime, até 2 temas, impact escalar (214-259).
OverviewPage.tsx (256-282): "Latest headlines", 8 itens — só título+fonte+relTime, zero classificação.
QuantPage.tsx: newsTriggers active/recent (42-43), flag decision.newsTriggered (438), leitura de fatores de sim.data.news.

COMPUTADO MAS NUNCA MOSTRADO:
- **Agregados por ATIVO** (`intelligence.assets`) — computados em aggregates.ts, mas /api/sim os DESCARTA (route.ts:457-461 envia só factors) e a NewsPage só renderiza factors. Direção/força de notícia por ativo é invisível.
- Sinais assets[]/factors[] por headline — qual ativo a manchete move e direção — nunca no row (só 2 temas + impact escalar).
- duplicateCount (tamanho do cluster de dedup) — nunca exibido (sem "+N fontes").
- positive/negative/neutral por fator/ativo — computado, nunca mostrado.
- confidence e decay individuais / ageMinutes / halfLifeMinutes — dobrados no "impact" opaco.
- classifiedCount vs itemCount — não vira "X de Y classificadas".
- Proveniência ML-vs-regex POR headline — status é só global/batch; UI não indica qual manchete veio do ML (e só MAX_ITEMS_PER_BATCH=2 vão ao ML, mlClassifier.ts:90-93).

## 3. FLUXO DE DADOS (useNews.ts)
SWR poll 30s (AtlasShell.tsx:207; useNews.ts:39), dedupingInterval 10s. Consome items, sources, error, fetchedAt, freshness.newestPublishedAt, intelligence, classification (75-93); expõe headlineAgeSeconds. Cap slice(0,50) (63) — API já capa MAX_HEADLINES=50 (news.ts:63,299-301). Descarta: freshness.ttlMs/staleIfErrorMs/oldestSourceAgeMs, intelligence.assets, sinais por-item.

## 4. QUALIDADE DO PIPELINE
- Dedup: SIM — Jaccard de tokens ≥0.72/0.88 + match de números (dedupe.ts:39-63); guarda duplicateCount.
- Clustering por história: NÃO — só colapso de títulos quase-idênticos, sem clustering por tópico/evento entre veículos.
- Ranking: CRONOLÓGICO apenas (news.ts:299-301), apesar do impact ser computado. Reading list não é ordenada por relevância.
- Persistência: forward store (news_forward Neon ou JSONL, forwardCollector.ts) guarda id/título/fonte/published_at/observed_at SÓ para retraining, atrás de NEWS_FORWARD_ENABLED. Cache de fonte é in-memory (news.ts:69). Sem snapshot histórico de intelligence.
- "O que mudou desde ontem": NÃO — intelligence é recomputada a cada request das ≤50 manchetes atuais; news_forward tem manchetes cruas mas nenhum score/agregado ao longo do tempo.

## 5. NEWS-NLP
Pipeline full: MT(opus-mt-mul-en) → FinBERT(tone) → zero-shot NLI(mDeBERTa-v3 xnli, 30 hipóteses assinadas) → ABSA(deberta-v3-absa) (pipeline.py:1-27, mapping.py:63-140). Região br/us (mapping.py:26-29); ABSA mapeia 10 ativos por keyword (156-166).
ARMADILHA: PIPELINE_MODE default = "lite" (pipeline.py:32) → classify_one_lite é regex aumentado em PT (210-267) com **assets sempre [] (linha 260)**. Ou seja, mesmo em "ML mode" o serviço roda regex-PT a menos que PIPELINE_MODE=full. E MAX_ITEMS_PER_BATCH=2 → só 2 de 50 manchetes vão ao ML por request; as outras 48 são regex TS. Retrain: POST /retrain (app.py:123-137) diário via Cloudflare worker → lê forward store, rotula por Yahoo intraday, retreina head, grava head_weights no Neon (single-flight). UI só indica ML-vs-regex GLOBALMENTE; sem badge por-headline, e com batch=2 ~96% é regex mesmo em modo ml — invisível ao usuário.

## 6. OPORTUNIDADES (ordenadas por impacto ÷ esforço)

1. **Ordenar reading list por impact, não só tempo** (esforço mínimo): impact já é computado por headline (NewsPage.tsx:250); lista é cronológica. Toggle "Top" usando relevance×confidence×decay expõe o que o modelo julga importar.
2. **Mostrar leitura de notícia por ATIVO** (dado já pronto, só descartado): intelligence.assets é totalmente computado mas nunca renderizado; adicionar chips/heatmap espelhando "Live macro read" de fatores + incluir assets em route.ts:457-461. Baixo-médio.
3. **Tags de ativo/direção por headline** (dado em todo item): item.classification.assets tem sinais assinados; renderizar chips coloridos (OIL↑, BRL↓) no row em vez de só 2 temas — vira "o que isso move" escaneável. Baixo.
4. **Badge de cluster de dedup ("+3 fontes")**: duplicateCount já existe (dedupe.ts:55), oculto; vira sinal de consenso/cobertura. Mínimo.
5. **Proveniência ML-vs-regex por headline + subir batch**: só 2/50 vão ao ML (mlClassifier.ts:90-93) e proveniência é global; marcar cada manchete com seu classificador e aumentar MAX_ITEMS para o investimento ML ser usado e visível. Médio (precisa mode por-item no batch status).
6. **Painel "o que mudou desde ontem"** (precisa persistência leve): snapshots diários de intelligence (scores de factors/assets) — o encanamento Neon já existe (padrão forwardCollector) — e diff hoje×ontem mostra temas subindo/caindo. Médio, alto valor de mesa.
7. **Alertas a partir de triggers** (detecção já existe): detectNewsTriggers (newsTrigger.ts) já acha manchetes frescas de alto impacto e os símbolos que movem; ligar ao banner de alertas do cliente (useAlerts) para uma manchete quente pingar o usuário, não só o paper book. Médio.
8. **Clustering por história além de títulos quase-idênticos**: dedup atual só colapsa títulos; adicionar clustering por tópico (assets/factors compartilhados + overlap de tokens) agrupa uma história em desenvolvimento num card com contador de fontes. Médio-alto.
9. **Expor confidence/decay/idade em vez de só "impact" opaco**: mostrar os componentes (fresco vs stale, alta vs baixa confiança) num mini-medidor para calibrar confiança; valores já no item. Baixo.
10. **Corrigir/expor PIPELINE_MODE default**: mesmo em "ML mode" o serviço roda lite-regex (pipeline.py:32, assets sempre vazio), então o ABSA por-ativo que a UI foi construída para mostrar está morto; documentar/togglar full pipeline e refletir o modo verdadeiro. Config baixa, alta honestidade de rotulagem.

Arquivos-chave: src/lib/news/{aggregates,classifier,classify,dedupe,decay,graph,head,mlClassifier,forwardCollector,vocab}.ts; src/lib/fetchers/news.ts; src/app/api/news/{route,ml-status/route}.ts; src/hooks/{useNews,useNewsMlStatus}.ts; src/components/atlas/pages/{NewsPage,OverviewPage,QuantPage}.tsx; src/lib/sim/{strategies,newsTrigger}.ts (:221-281,:69-119); src/app/api/sim/route.ts:455-476; services/news-nlp/{app,mapping,pipeline}.py.
