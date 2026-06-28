# Ciclo 1 — Fundação Self-Hosted: Plano de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para rastreio.

**Goal:** Tirar o Market Terminal do Vercel (offline por limite de free-tier) e colocá-lo rodando self-hosted no desktop Windows de Fernando, num repositório próprio, com a metodologia de desenvolvimento documentada — sem ainda introduzir multi-tenancy.

**Architecture:** Docker Compose orquestra `web` (Next.js standalone), `model-engine` e `news-nlp` (FastAPI), e um `scheduler` interno (tick que substitui o Cloudflare Worker). Persistência segue no Neon (projeto próprio de Fernando). Exposição pública por Tailscale Funnel (URL `*.ts.net` estável, sem abrir portas).

**Tech Stack:** Next.js 15, React 18, Node 20, Python 3.11 (FastAPI/uvicorn), Neon Postgres (`@neondatabase/serverless`), Docker Compose, Tailscale Funnel.

## Global Constraints

- **Driver de banco:** manter `@neondatabase/serverless` (funciona no Edge Runtime do `middleware.ts`). Não trocar para `pg` neste ciclo.
- **Verificação:** não há suite de testes. Validar com `npm run type-check` + `npm run lint` + smoke das rotas de API. Nunca afirmar "funciona" sem rodar o comando e ver a saída.
- **Secrets:** `.env` e `.env.local` são gitignored. Nenhum secret (DATABASE_URL, APP_PASSWORD, CRON_SECRET, chaves) entra no git.
- **Invariante do simulador:** não-lookahead — sinais em t nunca podem ver preços após t. Nenhuma tarefa deste ciclo toca a lógica de sinais; se tocar, é violação de escopo.
- **Contrato de API:** rotas retornam `ApiResponse<T>` com HTTP 200 mesmo em falha de dados. Não alterar esse contrato.
- **Autoria:** preservar histórico de commits de João (`joaoouro`). Commits de Fernando entram por cima; o repo de origem vira `upstream`.

---

## Contexto

**Problema:** O projeto roda (rodava) no Vercel Hobby, que saiu do ar por estourar o free-tier; além disso, adicionar Fernando como contribuidor exigiria plano PRO. O `CLAUDE.md` herdado está defasado (descreve `sim-state.json` e "sem auth", quando já há Neon Postgres e login completo).

**Resultado esperado:** Market Terminal acessível por uma URL pública estável a partir do desktop Windows de Fernando, num repositório próprio dele, com a documentação refletindo o estado real e a metodologia de desenvolvimento (Fases 0–4) instalada — base estável para o Ciclo 2 (multi-tenancy).

**Decisões já tomadas:** ver Decision Locks abaixo. Spec de design completo em `documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md`.

---

## Decision Locks

Decisões congeladas ANTES da implementação. Mudança exige checkpoint humano explícito (AskUserQuestion explicando: decisão original → por que mudar → impacto downstream).

| ID | Decisão | Data | Implicação se mudar |
|---|---|---|---|
| D1 | Repositório próprio (duplicação + `upstream`), não fork formal | 2026-06-28 | Muda todo o setup de remotes e o fluxo de sincronização |
| D3 | Manter Neon (projeto próprio) no Ciclo 1 | 2026-06-28 | Reintroduz refactor de driver + questão de Edge Runtime |
| D4 | Docker Compose como orquestrador | 2026-06-28 | Reescreve PR-1/PR-2/PR-3 inteiros |
| D5 | Tailscale Funnel para exposição | 2026-06-28 | Reescreve PR-3; reintroduz necessidade de domínio |
| D6 | Tick interno (container scheduler) substitui Cloudflare Worker | 2026-06-28 | Muda PR-2; reintroduz dependência externa |

---

## Guardrails Nomeados (G-*)

Selecionados do catálogo `enhanced-planning/references/guardrail-catalog.md`. **Regra:** ao completar cada slice, confirmar que todos os guardrails ativos foram respeitados.

- **G-CONTRACT** *(ativo — PR-1)* — o contrato `web` (BFF) ↔ serviços Python (`model-engine`, `news-nlp`) deve continuar funcionando após containerização. Como não há suite de testes, vira **smoke de contrato**: dentro do Compose, `web` resolve `ATLAS_BACKEND_URL` interno e as rotas `/api/market`, `/api/sim`, `/api/news` respondem com dados reais (não fallback de erro). Verificar antes e depois de cada mudança no PR-1.
- **G-BASELINE-PARITY** *(adaptado — PR-3)* — a forma clássica (operação paralela com o ambiente de origem por N dias) **não se aplica**: o Vercel está offline, não há baseline ao vivo para comparar (rationale documentado, conforme o catálogo permite). Reduz-se a um **critério de aceite de estabilidade**: o ambiente Windows sobe, persiste no Neon, o tick avança o book, e **sobrevive a um reboot do Windows** (Docker e Tailscale religam sozinhos). Sem janela de paralela.
- *(Anotado para o Ciclo 2/SP2: novo `G-TENANT-ISOLATION` — verificação adversarial de que nenhum endpoint vaza dados entre `user_id`. Fora do escopo deste plano.)*

---

## Implementação

> **Estilo de verificação:** onde há código (next.config, Dockerfile, compose, scheduler), o passo mostra o código completo. Onde é infra/setup, o passo termina num **comando de verificação com saída esperada**. Cada tarefa termina testável e com commit.

### PR-0: Fundação & Documentação

**Objetivo:** Estabelecer o repositório próprio de Fernando com autoria de João preservada, instalar a metodologia, e documentar o estado real.

**Guardrails ativos:** nenhum técnico (trabalho de repo/docs).

#### Tarefa 0.1: Criar o repositório próprio com `upstream`

**Files:** nenhum arquivo de código — operação de git/GitHub.

**Interfaces:**
- Consome: clone atual (`origin = joaoouro/Market-Terminal`).
- Produz: `origin = fernando-bertholdo/market-terminal` (privado), `upstream = joaoouro/Market-Terminal`.

- [ ] **Passo 1: Confirmar o username e nome do repo de destino**

> Valores do usuário (confirmar antes de executar): username GitHub `fernando-bertholdo`, nome do repo `market-terminal`. Ajustar se renomear (ver Decision Locks / Seção 11 do spec).

- [ ] **Passo 2: Criar o repo vazio privado na conta de Fernando**

```bash
gh repo create fernando-bertholdo/market-terminal --private --description "FICC market terminal + quant paper-trading simulator (self-hosted)"
```
Esperado: `✓ Created repository fernando-bertholdo/market-terminal on GitHub`.

- [ ] **Passo 3: Reapontar remotes preservando o histórico**

```bash
git remote rename origin upstream
git remote add origin https://github.com/fernando-bertholdo/market-terminal.git
git remote -v
```
Esperado: `origin` → fernando-bertholdo, `upstream` → joaoouro (fetch e push em cada).

- [ ] **Passo 4: Publicar todo o histórico no repo próprio**

```bash
git push -u origin main
```
Esperado: push de 13 commits; `branch 'main' set up to track 'origin/main'`.

- [ ] **Passo 5: Verificar autoria preservada**

```bash
git log --format='%an' | sort -u
```
Esperado: inclui `João Gabriel de Ouro Preto` (histórico intacto).

> **Nota relacional:** avisar João que o espelhamento foi feito (transparência — R4 do spec).

#### Tarefa 0.2: Portar a metodologia de desenvolvimento

**Files:** cria `.claude/`, `.codex/`, `.agents/`, `documents/`, `.planning/` (estrutura do template).

- [ ] **Passo 1: Invocar a skill `sync-downstream`**

Invocar a skill `sync-downstream` (do usuário) para forward-portar a estrutura do `tech-product-template` para este projeto, respeitando o stack TypeScript/Next + Python. Ela detecta drift estrutural e mescla contextualmente.

- [ ] **Passo 2: Verificar a estrutura portada**

```bash
ls -d .claude documents .planning 2>/dev/null
ls documents/core/ 2>/dev/null
```
Esperado: diretórios presentes; `documents/core/` contém os arquivos-base (Projeto.md, Roadmap.md, TODO.md — a popular na Tarefa 0.3).

- [ ] **Passo 3: Criar o diário da initiative**

```bash
mkdir -p .planning/ciclo-1-fundacao
```
Criar `.planning/ciclo-1-fundacao/CONTEXT.md` com o cabeçalho:
```markdown
# Ciclo 1 — Fundação Self-Hosted · CONTEXT

Plano: `documents/superpowers/plans/2026-06-28-ciclo1-selfhost-foundation.md`
Spec:  `documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md`

## Diário de Rodadas

<!-- uma entrada por PR concluído: o que foi entregue, commits, decisões emergentes, próximo passo -->
```

- [ ] **Passo 4: Versionar a metodologia no git**

O `.gitignore` herdado ignora todo o `.claude/` (linha `.claude/`). A metodologia (skills, rules, prompts) precisa ser versionada, mantendo fora apenas os efêmeros (`.claude/plans/`, `.claude/settings.local.json`). Ajustar conforme a convenção do `sync-downstream` (tipicamente remover `.claude/` e adicionar `.claude/plans/` + `.claude/settings.local.json`). Verificar:

```bash
git check-ignore .claude/skills >/dev/null 2>&1 && echo "AINDA IGNORADO — ajustar .gitignore" || echo ".claude/skills versionavel ok"
```
Esperado: `.claude/skills versionavel ok`.

#### Tarefa 0.3: Documentar o estado real

**Files:**
- Modify: `CLAUDE.md` (corrigir defasagem)
- Modify: `AGENTS.md` (corrigir defasagem)
- Create: `documents/core/Projeto.md`, `documents/core/Roadmap.md`, `documents/core/TODO.md`

- [ ] **Passo 1: Corrigir o `CLAUDE.md`** — atualizar as seções defasadas para o estado real: auth completa (cookie + PBKDF2 + Postgres), persistência Neon (não `sim-state.json`), serviços Python (`services/model-engine`, `services/news-nlp`), e o tick. Manter o que ainda é verdadeiro (fontes de dados, design system).

- [ ] **Passo 2: Espelhar as correções no `AGENTS.md`** (mesmo conteúdo factual).

- [ ] **Passo 3: Criar `documents/core/Projeto.md`** — visão, arquitetura real (diagrama do spec), stack, e link para o spec de design.

- [ ] **Passo 4: Criar `documents/core/Roadmap.md`** — Fases 0–4 mapeadas nos sub-projetos SP0–SP5 (tabela da Seção 6 do spec).

- [ ] **Passo 5: Criar `documents/core/TODO.md`** — backlog inicial: os PRs deste ciclo + itens adiados (histórico do book, domínio próprio).

- [ ] **Passo 6: Verificar consistência**

```bash
grep -n "sim-state.json" CLAUDE.md
```
Esperado: nenhuma menção a `sim-state.json` como persistência primária (só como fallback local).

#### Tarefa 0.4: Commit do PR-0

- [ ] **Passo 1: Revisar o que será commitado**

```bash
git status
git add documents/ .planning/ CLAUDE.md AGENTS.md .claude .codex .agents 2>/dev/null
git status
```
Esperado: spec de design, plano, docs core, CONTEXT.md e metodologia staged; nenhum `.env`.

- [ ] **Passo 2: Commitar**

```bash
git commit -m "chore(planning): adiciona repo próprio, metodologia e docs do estado real (PR-0)"
git push
```

**Critério de aceite PR-0:**
- [ ] `origin` aponta para o repo de Fernando; `upstream` para o de João; histórico (13 commits) preservado.
- [ ] Estrutura de metodologia (`documents/`, `.planning/`, `.claude/`) presente.
- [ ] `CLAUDE.md`/`AGENTS.md` refletem o estado real (sem `sim-state.json` como persistência primária).
- [ ] `Projeto.md`, `Roadmap.md`, `TODO.md` criados.
- [ ] Spec e plano commitados; nenhum secret no git.

---

### PR-1: Containerização

**Objetivo:** Rodar `web` + `model-engine` + `news-nlp` localmente via Docker Compose, com o contrato BFF↔Python funcionando.

**Guardrails ativos:** **G-CONTRACT**.

#### Tarefa 1.1: Habilitar o build standalone do Next

**Files:** Modify `next.config.js`

- [ ] **Passo 1: Adicionar `output: 'standalone'`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.reuters.com" },
      { protocol: "https", hostname: "**.ft.com" },
      { protocol: "https", hostname: "**.bloomberg.com" },
    ],
  },
  serverExternalPackages: ["rss-parser"],
};

module.exports = nextConfig;
```

- [ ] **Passo 2: Verificar o build gera o standalone**

```bash
npm run build
ls .next/standalone/server.js
```
Esperado: build conclui; `.next/standalone/server.js` existe.

- [ ] **Passo 3: Commit**

```bash
git add next.config.js
git commit -m "build(web): habilita output standalone para Docker"
```

#### Tarefa 1.2: Dockerfile do `web` + `.dockerignore`

**Files:** Create `Dockerfile`, Create `.dockerignore`

- [ ] **Passo 1: Criar `.dockerignore`**

```
node_modules
.next
.git
data
.env*
npm-debug.log
documents
.planning
```

- [ ] **Passo 2: Criar `Dockerfile` (multi-stage standalone)**

```dockerfile
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["node", "server.js"]
```

> O `scripts/` é copiado porque o `scheduler` (PR-2) reutiliza esta imagem rodando `node scripts/scheduler.mjs`.

- [ ] **Passo 3: Verificar o build da imagem**

```bash
docker build -t market-terminal-web .
```
Esperado: build conclui sem erro; imagem `market-terminal-web` criada.

- [ ] **Passo 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "build(web): adiciona Dockerfile multi-stage e dockerignore"
```

#### Tarefa 1.3: docker-compose com os três serviços

**Files:** Create `docker-compose.yml`, Create `.env.example` (atualizar)

- [ ] **Passo 1: Criar `docker-compose.yml`**

```yaml
services:
  web:
    build: .
    env_file: .env
    environment:
      ATLAS_BACKEND_URL: http://model-engine:8010
      MODEL_ENGINE_URL: http://model-engine:8010
      NEWS_NLP_URL: http://news-nlp:8000
    ports:
      - "3000:3000"
    depends_on:
      - model-engine
      - news-nlp
    restart: unless-stopped

  model-engine:
    build: ./services/model-engine
    restart: unless-stopped

  news-nlp:
    build: ./services/news-nlp
    environment:
      PORT: "8000"
    volumes:
      - news-models:/models
    restart: unless-stopped

volumes:
  news-models:
```

> O volume `news-models` persiste os pesos `torch`/`transformers` em `/models` (`HF_HOME`), evitando re-download a cada restart. O `scheduler` é adicionado no PR-2.

- [ ] **Passo 2: Atualizar `.env.example`** — adicionar `TERMINAL_URL` (usado pelo scheduler no PR-2) e documentar que as URLs de backend são internas do Compose:

```
# Self-hosted: URLs internas do Compose (não alterar nomes de serviço)
# ATLAS_BACKEND_URL=http://model-engine:8010
# NEWS_NLP_URL=http://news-nlp:8000
# TERMINAL_URL=http://web:3000   # usado pelo container scheduler
```

- [ ] **Passo 3: Criar o `.env` local (não commitado)** com os valores reais para o smoke. Mínimo para subir: `DATABASE_URL` (Neon — pode ser temporário aqui; o definitivo entra no PR-2), `FRED_API_KEY`, `APP_USERNAME`, `APP_PASSWORD`, `CRON_SECRET`.

```bash
cp .env.example .env
# editar .env com os valores reais
grep -q "^DATABASE_URL=postgres" .env && echo "DATABASE_URL ok"
```

- [ ] **Passo 4 (G-CONTRACT): Subir e fazer smoke do contrato**

```bash
docker compose up -d --build
docker compose ps
```
Esperado: `web`, `model-engine`, `news-nlp` com status `running`.

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/market | head -c 300
```
Esperado: JSON com campos de mercado vindos do backend Python (não erro de conexão), confirmando o contrato BFF↔model-engine. (A auth do app é por cookie de sessão; apenas `/api/market` e `/api/sim` aceitam `Bearer CRON_SECRET` — rotas como `/api/news` exigem login. Para o news-nlp, validar alcançabilidade com `docker compose exec web node -e "fetch('http://news-nlp:8000/').then(r=>console.log(r.status))"`.)

> Registrar o resultado do smoke como evidência do G-CONTRACT.

- [ ] **Passo 5: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "build(infra): docker-compose com web + model-engine + news-nlp"
```

**Critério de aceite PR-1:**
- [ ] `docker compose up` sobe os três serviços com status `running`.
- [ ] **G-CONTRACT:** `/api/market` e `/api/news` respondem com dados reais via backend Python interno.
- [ ] `npm run type-check` e `npm run lint` passam.
- [ ] Nenhum secret commitado (`.env` fora do git).

---

### PR-2: Scheduler interno + Neon próprio

**Objetivo:** Substituir o Cloudflare Worker por um container `scheduler` interno e persistir no projeto Neon próprio de Fernando.

**Guardrails ativos:** nenhum novo (G-CONTRACT do PR-1 permanece válido).

#### Tarefa 2.1: Script do scheduler (tick)

**Files:** Create `scripts/scheduler.mjs`

- [ ] **Passo 1: Criar `scripts/scheduler.mjs`** (replica o comportamento de `deploy/cloudflare-worker/src/index.ts`)

```js
// Tick interno: substitui o Cloudflare Worker num servidor persistente.
// A cada 60s: refresh de mercado + tick do book. Retrain diário opcional.
const TERMINAL_URL = process.env.TERMINAL_URL ?? 'http://web:3000';
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const NEWS_NLP_URL = process.env.NEWS_NLP_URL;
const RETRAIN_HOUR_UTC = Number(process.env.RETRAIN_HOUR_UTC ?? '6');

async function hit(path, init) {
  const res = await fetch(new URL(path, TERMINAL_URL), init);
  if (!res.ok) console.error(`[scheduler] ${path}: HTTP ${res.status} ${await res.text()}`);
  return res;
}

async function tick() {
  const auth = { Authorization: `Bearer ${CRON_SECRET}` };
  try {
    await hit('/api/market', { headers: auth });
    await hit('/api/sim', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tick' }),
    });
  } catch (err) {
    console.error('[scheduler] tick failed:', err);
  }

  if (NEWS_NLP_URL) {
    const now = new Date();
    if (now.getUTCHours() === RETRAIN_HOUR_UTC && now.getUTCMinutes() === 0) {
      try {
        await fetch(new URL('/retrain', NEWS_NLP_URL), { method: 'POST' });
      } catch (err) {
        console.error('[scheduler] retrain failed:', err);
      }
    }
  }
}

console.log(`[scheduler] tick a cada 60s → ${TERMINAL_URL}`);
tick();
setInterval(tick, 60_000);
```

> Replica fielmente o Worker: mesmos endpoints (`GET /api/market`, `POST /api/sim {action:'tick'}`), mesma autenticação (`Bearer CRON_SECRET`), mesmo gate de hora para o retrain diário.

#### Tarefa 2.2: Adicionar o serviço `scheduler` ao Compose

**Files:** Modify `docker-compose.yml`

- [ ] **Passo 1: Adicionar o serviço** (reutiliza a imagem do `web`)

```yaml
  scheduler:
    build: .
    command: node scripts/scheduler.mjs
    env_file: .env
    environment:
      TERMINAL_URL: http://web:3000
      NEWS_NLP_URL: http://news-nlp:8000
    depends_on:
      - web
    restart: unless-stopped
```

- [ ] **Passo 2: Subir e verificar o scheduler logando**

```bash
docker compose up -d --build scheduler
docker compose logs --tail=5 scheduler
```
Esperado: linha `[scheduler] tick a cada 60s → http://web:3000` e ausência de erros HTTP repetidos.

#### Tarefa 2.3: Provisionar o Neon próprio e validar persistência

**Files:** nenhum (configuração de `.env`)

- [ ] **Passo 1: Criar o projeto Neon** (console Neon, conta de Fernando) e copiar a connection string pooled.

- [ ] **Passo 2: Definir `DATABASE_URL` no `.env`** com a string do Neon próprio e recriar os serviços:

```bash
docker compose up -d --force-recreate web scheduler
```

- [ ] **Passo 3 (verificação de persistência): confirmar backend postgres**

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sim | grep -o '"persistence":"[a-z]*"'
```
Esperado: `"persistence":"postgres"`.

- [ ] **Passo 4 (verificação do tick): confirmar avanço do book sem browser**

Aguardar ~2 minutos e comparar o `asOf` / equity intraday em duas leituras:
```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sim | grep -o '"asOf":"[^"]*"'
```
Esperado: o `asOf` avança entre leituras (o scheduler está alimentando o tick).

- [ ] **Passo 5: Commit**

```bash
git add scripts/scheduler.mjs docker-compose.yml
git commit -m "feat(scheduler): tick interno substitui o cloudflare worker"
```

**Critério de aceite PR-2:**
- [ ] `scheduler` roda no Compose e loga o tick sem erros HTTP.
- [ ] `/api/sim` reporta `"persistence":"postgres"` (Neon próprio).
- [ ] O `asOf`/equity do book avança sem nenhum browser aberto.
- [ ] O comportamento do tick equivale ao do Worker (mesmos endpoints/ação).

---

### PR-3: Exposição (Tailscale Funnel), uptime e cutover

**Objetivo:** Expor o terminal por uma URL pública estável, garantir uptime (boot + restart), validar estabilidade e aposentar o Worker.

**Guardrails ativos:** **G-BASELINE-PARITY** (adaptado — critério de estabilidade).

#### Tarefa 3.1: Tailscale Funnel

**Files:** nenhum (configuração de host Windows)

- [ ] **Passo 1: Instalar o Tailscale no Windows** e autenticar (conta de Fernando).

- [ ] **Passo 2: Habilitar HTTPS/Funnel no tailnet** (admin console: MagicDNS + HTTPS certificates ligados).

- [ ] **Passo 3: Expor a porta do `web` (3000) via Funnel**

```powershell
tailscale funnel 3000
```
Esperado: a saída mostra a URL pública `https://<host>.<tailnet>.ts.net` servindo `localhost:3000`.

- [ ] **Passo 4 (verificação de acesso público): abrir a URL `*.ts.net` num navegador externo** (ex.: celular em rede móvel). Esperado: tela de login do terminal carrega; após login, a aplicação funciona.

#### Tarefa 3.2: Uptime (boot + restart)

**Files:** nenhum (configuração de host)

- [ ] **Passo 1: Configurar o Docker Desktop para iniciar no login/boot do Windows** (Settings → General → "Start Docker Desktop when you log in").

- [ ] **Passo 2: Confirmar que o Tailscale roda como serviço** (inicia no boot por padrão).

- [ ] **Passo 3 (G-BASELINE-PARITY adaptado — teste de resiliência): reiniciar o Windows e validar recuperação automática**

Após o reboot, sem intervenção manual:
```bash
docker compose ps
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sim | grep -o '"persistence":"[a-z]*"'
```
Esperado: serviços `running`; `"persistence":"postgres"`; a URL `*.ts.net` volta a responder; o tick retoma (asOf avança). Registrar como evidência do guardrail.

#### Tarefa 3.3: Cutover — aposentar o Worker e atualizar docs

**Files:** Modify `DEPLOY.md`

- [ ] **Passo 1: Reescrever `DEPLOY.md`** para o procedimento self-hosted (Docker Compose + Neon próprio + Tailscale Funnel + scheduler interno), marcando o caminho Vercel/Worker como legado/histórico.

- [ ] **Passo 2: Marcar o Cloudflare Worker como não-implantado** — adicionar nota em `deploy/cloudflare-worker/` de que foi substituído pelo `scheduler` (manter o código no repo por referência; não deletar).

- [ ] **Passo 3: Commit**

```bash
git add DEPLOY.md deploy/cloudflare-worker/
git commit -m "docs(deploy): self-hosting no Windows substitui Vercel + worker"
```

**Critério de aceite PR-3:**
- [ ] URL `*.ts.net` acessível por qualquer navegador externo, sem instalação no cliente.
- [ ] **G-BASELINE-PARITY (adaptado):** após reboot do Windows, serviços religam sozinhos, persistência mantida, tick retoma.
- [ ] `DEPLOY.md` descreve o procedimento self-hosted; Worker marcado como legado.

---

## Checkpoints Humanos

| Gate | Momento | Pergunta |
|---|---|---|
| Design | Antes de implementar | ✓ Spec aprovado nesta sessão |
| Por PR-0 | Repo + docs prontos | Repo próprio e documentação aprovados? |
| Por PR-1 | Compose sobe + smoke | Contrato BFF↔Python íntegro? Avançar? |
| Mid-point | Após PR-1 | Containerização alinhada? Ajustar algo antes do scheduler/Neon? |
| Por PR-2 | Tick + Neon validados | Persistência e tick corretos? Avançar? |
| Desbloqueio cutover | Antes da Tarefa 3.3 | Estabilidade (reboot) validada? Pode aposentar o Worker? |
| Final | Todos critérios atendidos | Posso marcar o Ciclo 1 como concluído? |

---

## Registro de Riscos

| Risco | Severidade | Mitigação | Owner | Status |
|---|---|---|---|---|
| Uptime de PC doméstico (queda de luz/internet, reboot) | Média | `restart: unless-stopped` + Docker no boot + Tailscale serviço; teste de reboot (PR-3) | Fernando | Aberto |
| Secret vazado no git durante a migração | Alta | `.env`/`.env.local` gitignored; `git status` antes de cada commit; smoke nunca imprime secret | Fernando | Aberto |
| `news-nlp` re-baixa pesos a cada restart | Média | Volume `news-models:/models` no Compose | Fernando | Mitigado (PR-1) |
| Driver Neon preso ao Edge Runtime | Baixa (neste ciclo) | Mantido Neon (D3); resolvido no SP2 via token assinado | Fernando | Aceito |
| Tailscale Funnel: limitações de porta/uso | Baixa | App atrás tem auth próprio; Funnel cobre HTTPS; migração futura p/ domínio registrada | Fernando | Aceito |
| Quebra acidental do invariante não-lookahead | Alta | Nenhuma tarefa toca lógica de sinais; revisão independente por PR | Fernando | Aberto |

---

## Tabela de Progresso

| Slice / PR | Data | Commit | Status | Notas |
|---|---|---|---|---|
| PR-0 | | | | |
| PR-1 | | | | |
| PR-2 | | | | |
| PR-3 | | | | |

---

## Isonomia Documental

**Regra:** ao completar cada PR, atualizar TODOS os arquivos abaixo afetados. Não commitar código sem atualizar docs correspondentes.

| Arquivo | Referencia | Ação ao Implementar | Verificado |
|---|---|---|---|
| `CLAUDE.md` | Arquitetura e persistência | Atualizar para estado real (PR-0) e self-hosted (PR-3) | [ ] |
| `AGENTS.md` | Idem CLAUDE.md | Espelhar correções | [ ] |
| `DEPLOY.md` | Procedimento de deploy | Reescrever para self-hosted (PR-3) | [ ] |
| `.env.example` | Variáveis de ambiente | Adicionar `TERMINAL_URL`/URLs internas (PR-1) | [ ] |
| `documents/core/Projeto.md` | Visão/arquitetura | Criar (PR-0) | [ ] |
| `documents/core/Roadmap.md` | Fases e SPs | Criar (PR-0) | [ ] |
| `documents/core/TODO.md` | Backlog | Criar (PR-0); atualizar ao fim do ciclo | [ ] |
| `.planning/ciclo-1-fundacao/CONTEXT.md` | Diário de rodadas | Entrada por PR | [ ] |

---

## Protocolo de Revisão Independente (substitui Codex)

> Codex indisponível nesta sessão. Substituído por subagente de review com **contexto fresco** (`feature-dev:code-reviewer`), que vê o código sem o viés de intenção do autor. Limitação reconhecida: mesma família de modelo.

**Ao completar cada PR:**
1. Verificar critérios de aceite 100%.
2. Completar a verificação cruzada (Isonomia Documental).
3. **Fase 1 — Exploração independente:** despachar `feature-dev:code-reviewer` sobre os arquivos do PR, SEM passar os critérios de aceite, pedindo: gaps, riscos não cobertos, problemas de qualidade, inconsistências entre componentes.
4. **Fase 2 — Classificação:** classificar cada achado (CRÍTICO / MÉDIO / BAIXO).
5. **Meta-avaliação Claude:** CRÍTICO → corrigir antes de avançar; MÉDIO → ajustar ou registrar; BAIXO → observação.
6. **PRs sensíveis (PR-2 persistência, PR-3 cutover):** usar múltiplas lentes (um subagente para correção, outro para segurança/secrets) para diversificar.
7. Registrar o resultado na Tabela de Progresso (coluna Notas), formato: `Revisão PR-N: X CRÍTICO, Y MÉDIO, Z BAIXO — <resumo 1 linha>`.

---

## Protocolo de Conclusão de PR

**OBRIGATÓRIO ao completar cada PR — todos os passos antes de iniciar o próximo:**

1. Marcar (`- [x]`) todos os critérios de aceite do PR neste plano.
2. Preencher a Tabela de Progresso (Data, Commit, Status `completo`, Notas).
3. Adicionar entrada no `.planning/ciclo-1-fundacao/CONTEXT.md` (entregue, commits, decisões emergentes, próximo passo).
4. Atualizar os docs da Isonomia Documental afetados.
5. Confirmar que os guardrails G-* ativos foram respeitados.
6. Rodar a Revisão Independente (acima).
7. Informar: "PR-N completo. Recomendo `/compact` antes de prosseguir." e aguardar confirmação.
8. Se a sessão passar de ~100k tokens, invocar `fresh-context` (ou `generate-session-prompt`) antes de seguir.

---

## Protocolo Multi-Sessão

1. **Ao completar cada slice:** atualizar checkboxes + Tabela de Progresso.
2. **Ao completar cada PR:** executar o Protocolo de Conclusão de PR integralmente (inclui atualizar o CONTEXT.md).
3. **Ao iniciar nova sessão:** ler o plano integralmente, consultar a Tabela de Progresso e o CONTEXT.md, retomar do próximo slice pendente.
4. **Ao encerrar sessão sem completar um PR:** registrar o ponto exato de parada + decisões pendentes no CONTEXT.md.

---

## Sequência de Commits

| PR | Commits esperados | Type | Scope |
|---|---|---|---|
| PR-0 | repo+metodologia+docs do estado real | chore | planning |
| PR-1 | standalone; Dockerfile+dockerignore; compose | build | web / infra |
| PR-2 | scheduler.mjs; serviço scheduler no compose | feat | scheduler |
| PR-3 | DEPLOY.md self-hosted; worker marcado legado | docs | deploy |

---

## Verificação Final

- [ ] Todos os critérios de aceite marcados (`- [x]`) em PR-0..PR-3.
- [ ] Tabela de Progresso completa (data, commit, status por PR).
- [ ] Isonomia Documental completa (todos os docs atualizados).
- [ ] `.planning/ciclo-1-fundacao/CONTEXT.md` com diário por PR.
- [ ] Guardrails G-CONTRACT e G-BASELINE-PARITY (adaptado) verificados, nenhum violado.
- [ ] Revisão Independente executada para cada PR (ou justificativa de skip).
- [ ] Decision locks respeitados (nenhum desbloqueado sem checkpoint).
- [ ] `npm run type-check` e `npm run lint` passam.
- [ ] Smoke: URL `*.ts.net` responde; `/api/sim` → `"persistence":"postgres"`; tick avança sem browser.
- [ ] Nenhum arquivo fora do escopo do plano modificado; nenhum secret no git.
- [ ] Sobrevive a reboot do Windows (serviços + tick religam sozinhos).
- [ ] Documentação atualizada (CLAUDE.md, AGENTS.md, DEPLOY.md, Projeto.md, Roadmap.md, TODO.md).
