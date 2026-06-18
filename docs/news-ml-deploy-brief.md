# Brief de deploy — pipeline de notícias-ML (entregar ao agente do cowork)

> Cole este arquivo inteiro no agente do cowork, junto com o **bloco de segredos**
> (abaixo). É autossuficiente. O agente faz só deploy + env vars + verificação —
> **não** muda código de modelo nem o contrato. Não rodar `git init`.

## Contexto (ler antes)
- `docs/news-sentiment-ml-plan.md` — decisões travadas (§0) e tabela de ativação (§12b).
- `CLAUDE.md` — arquitetura e fontes de dados.
- Invariantes inegociáveis: **sem LLM/Claude em runtime, sem API paga**, contrato
  `NewsIntelligence` inalterado, regex como fallback, no-lookahead.
- Tudo já implementado; `npm run type-check` e `npm run lint` passam limpos. A
  tarefa é **operacional**.

## Componentes
- **App Next.js (Vercel)** — já no ar.
- **`services/news-nlp/`** — micro-serviço Python (FastAPI + pesos abertos
  FinBERT/zero-shot-NLI/ABSA + MT PT→EN), com `Dockerfile`. Endpoints:
  `GET /health`, `POST /classify`, `POST /retrain`, `GET /retrain/status`.
- **`deploy/cloudflare-worker/`** — worker de cron (já no ar), preparado pra
  disparar `/retrain` 1×/dia.
- **Neon (Postgres)** — já usado pelo simulador; tabelas `news_forward` e
  `head_weights` se autocriam.

## Bloco de segredos (o humano preenche e anexa)
```
DATABASE_URL         = postgresql://...        # mesmo Neon do simulador
HF_TOKEN             = hf_...                   # Hugging Face, role Write
NEWS_NLP_TOKEN       = <string aleatória longa> # mesmo valor no serviço, Vercel e worker
VERCEL_TOKEN         = ...
CLOUDFLARE_API_TOKEN = ...
Vercel project       = <nome do projeto>
```

---

## Passo 1 — Deploy do serviço Python (Hugging Face Spaces)
1. Crie um **Space Docker** (CPU basic, free), público, com o `HF_TOKEN`.
2. Push do **conteúdo de `services/news-nlp/`** (Dockerfile, app.py, pipeline.py,
   mapping.py, retrain.py, requirements.txt) para a raiz do repo do Space.
3. Em *Settings → Secrets* do Space: `DATABASE_URL`, `NEWS_NLP_TOKEN`. Opcionais:
   `WARMUP=true` (cold start mais lento na 1ª vez, sem re-download depois) e
   `NLI_THRESHOLD=0.65` (recomendado — corta sinais fracos, menos ruído no dia 1).
4. O Dockerfile honra `$PORT` (HF usa 7860). Aguarde o build (baixa ~1.3 GB de
   pesos na 1ª chamada).
5. **Verificar:**
   ```
   curl https://<space>/health
   curl -s https://<space>/classify -H "content-type: application/json" \
     -H "authorization: Bearer <NEWS_NLP_TOKEN>" \
     -d '{"items":[{"id":"a","title":"Fed signals higher for longer"},
                   {"id":"b","title":"Cessar-fogo derruba petróleo"}]}'
   ```
   Esperado: `results[]` com `factors`/`assets`/`tone`. Anote a URL do Space.

## Passo 2 — Ligar tudo na Vercel (env vars do projeto, Production, server-side)
Com `VERCEL_TOKEN`. Adicione/atualize e faça redeploy:
```
NEWS_ML_ENABLED       = true
NEWS_NLP_URL          = https://<space>
NEWS_NLP_TOKEN        = <anexado>
NEWS_NLP_TIMEOUT_MS   = 8000
NEWS_GRAPH_CALIBRATED = true
NEWS_HEAD_ENABLED     = true   # seguro no dia 1: o seed segue o grafo, depois melhora sozinho
NEWS_FORWARD_ENABLED  = true
```
**Verificar:** `/api/news` responde 200 e segue classificando. Se o serviço cair,
o app cai pra regex sozinho — esperado, não é erro.

## Passo 3 — Re-treino contínuo no worker Cloudflare
Com `CLOUDFLARE_API_TOKEN`, em `deploy/cloudflare-worker/`:
- `wrangler.toml` `[vars]`: `NEWS_NLP_URL = "https://<space>"` (opcional
  `RETRAIN_HOUR_UTC = "6"`).
- `npx wrangler secret put NEWS_NLP_TOKEN` (= o anexado). Não mexer em `CRON_SECRET`.
- `npm run deploy`. Passa a chamar `POST /retrain` 1×/dia às 06:00 UTC.

## Verificação final / guardrails
- `/api/news` deve seguir 200 em qualquer cenário (falha do serviço → regex).
- Não alterar `src/types/market.ts` (contrato) nem lógica de modelo. Só infra/env.
- Se tocar em qualquer arquivo, rodar `npm run type-check` e `npm run lint`.
- Reportar: URL do Space, env vars setadas, saída de `/health` e `/classify`, e
  confirmação do `npm run deploy` do worker.

## Como o sistema aprende sozinho depois (não requer ação)
- `NEWS_FORWARD_ENABLED` grava cada manchete nova (PT+EN) no Neon (`news_forward`).
- O worker dispara `/retrain` diário → o serviço rotula via Yahoo intraday (§8),
  re-treina a cabeça por ativo, grava `head_weights` no Neon.
- O app lê `head_weights` em runtime (TTL ~10min) → a cabeça melhora **sem
  redeploy**. GDELT/FNSPID são acelerador opcional, **não** pré-requisito.

## Expectativa honesta de qualidade (primeiras semanas)
- Não é um LLM gerando texto — são classificadores. "Alucinação" no sentido
  generativo não se aplica; o risco real é **ruído/erro de classificação**.
- Dia 1: o *sentimento* (FinBERT/NLI/ABSA) já é de qualidade máxima (pré-treinado);
  a *direção por ativo* (cabeça) é só a do grafo até acumular dados forward.
- Fontes de ruído a vigiar: tradução PT→EN achatando jargão; NLI mal calibrado
  (por isso `NLI_THRESHOLD=0.65`); manchete sem direção clara.
- **Anti-overfit:** a cabeça é minúscula (6 features) + ancorada no grafo (L2) +
  só treina modelo por ativo com ≥150 linhas; e o re-treino tem **gate de holdout**
  — só publica pesos que **batem o grafo no teste temporal**, senão mantém o prior.
  Ou seja, a cabeça ao vivo **nunca fica pior que o grafo** out-of-sample.
  (Tunável: `RETRAIN_MIN_EDGE` exige uma margem extra acima do prior pra publicar.)
- Contenção: agregação pondera por confiança/relevância + decay; o sim tem caps
  (40%/ativo, vol-target, de-gross por regime) e é **paper-trading** (nunca executa).
- Tratar as primeiras semanas como **observação/amaciamento**: o forward grava
  tudo, dá pra comparar o que foi marcado vs o que aconteceu antes de confiar mais.
