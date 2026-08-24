# TODO - Market Terminal

## Metadata

- **Versão:** 1.0.0
- **Status:** Em andamento (Ciclo 1 — SP0/PR-0 ativo)
- **Última atualização:** 2026-06-28
- **Responsável:** Fernando Bertholdo

---

## Referências Principais

- [Roadmap.md](Roadmap.md) - Fases, milestones, DoR/DoD, mapeamento SP0–SP5
- [Projeto.md](Projeto.md) - Fonte de verdade, regras de negócio
- [../../CLAUDE.md](../../CLAUDE.md) - Regras de desenvolvimento
- [Plano do Ciclo 1](../superpowers/plans/2026-06-28-ciclo1-selfhost-foundation.md) - PR-0 a PR-3 detalhados (código + verificações)
- [Design do Ciclo 1](../superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md) - ADRs D1–D8 + roadmap SP0–SP5

---

## Progresso Geral

```
Fase 0 (SP0):  █████░░░░░░░░  ~45% (PR-0 em andamento)         🔄 Em andamento
Fase 1 (SP1):  ░░░░░░░░░░░░░   0%  (PR-1, PR-2, PR-3)          ⏳ Planejado (Ciclo 1)
Fase 2 (SP2):  ░░░░░░░░░░░░░   0%  (multi-tenancy core)        ⏳ Planejado (Ciclo 2)
Fase 3 (Hard): ░░░░░░░░░░░░░   0%  (D7 · D8 · backups)         ⏳ Planejado
Fase 4 (Exp):  ░░░░░░░░░░░░░   0%  (SP3 · SP4 · SP5)           ⏳ Planejado
```

**Status Geral:** Ciclo 1 em andamento — repo próprio e metodologia já no lugar; documentando o estado real (PR-0).
**Próximo Milestone:** concluir PR-0 (docs do estado real + commit), depois iniciar PR-1 (Containerização).

---

## FASE 0: Planejamento — SP0 · Fundação & Documentação

> **Ciclo 1 · PR-0.** Estabelecer repo próprio (autoria de João preservada), instalar a metodologia e documentar o estado real. Critério de aceite no [plano, PR-0](../superpowers/plans/2026-06-28-ciclo1-selfhost-foundation.md).

### Decisões Críticas (Decision Locks — já tomadas no design)

- [x] **D1** — Repositório próprio (duplicação + `upstream`), não fork formal
- [x] **D2** — Escala "círculo fechado" (~10 usuários)
- [x] **D3** — Manter Neon (projeto próprio de Fernando) no Ciclo 1
- [x] **D4** — Docker Compose como orquestrador
- [x] **D5** — Tailscale Funnel para exposição pública
- [x] **D6** — Tick interno (container `scheduler`) substitui o Cloudflare Worker
- [ ] **D7** — *(diferida p/ SP2/Fase 3)* Sessão por token assinado
- [ ] **D8** — *(diferida p/ Fase 3)* Self-hosted 100% (Postgres local)
- [ ] **Nome do projeto no repo próprio** — manter "Market-Terminal" (resolvido: repo `market-terminal`); confirmar definitivo

### Tarefa 0.1: Criar o repositório próprio com `upstream`

- [x] Criar repo vazio privado na conta de Fernando (`fernando-bertholdo/market-terminal`)
  - verify: `gh repo view fernando-bertholdo/market-terminal --json visibility`
- [x] Reapontar remotes: `origin` → Fernando, `upstream` → `joaoouro/Market-Terminal`
  - verify: `git remote -v` (origin = fernando-bertholdo, upstream = joaoouro) ✓ confirmado
- [x] Publicar todo o histórico no repo próprio (`git push -u origin main`)
- [ ] Verificar autoria preservada
  - verify: `git log --format='%an' | sort -u` inclui `João Gabriel de Ouro Preto`
- [ ] Avisar João sobre o espelhamento (transparência — R4)

### Tarefa 0.2: Portar a metodologia de desenvolvimento

- [x] Estrutura da metodologia presente (`.claude/` com skills/rules/prompts, `documents/`)
- [ ] Rodar/conferir `sync-downstream` para forward-portar o template (drift estrutural)
- [ ] Criar `.planning/ciclo-1-fundacao/CONTEXT.md` (diário de rodadas — header com links p/ plano e spec)
  - files: `.planning/ciclo-1-fundacao/CONTEXT.md`
- [ ] Versionar `.claude/` no git (o `.gitignore` herdado ignora `.claude/` inteiro; manter fora só `.claude/plans/` e `.claude/settings.local.json`)
  - verify: `git check-ignore .claude/skills` retorna vazio (não ignorado)

### Tarefa 0.3: Documentar o estado real

- [ ] Corrigir `CLAUDE.md` para o estado real: auth completa (cookie + PBKDF2 + Postgres), persistência **Neon** (não `sim-state.json`), serviços Python (`model-engine`, `news-nlp`), tick
  - files: `CLAUDE.md`
  - verify: `grep -n "sim-state.json" CLAUDE.md` → só como fallback local, nunca persistência primária
- [ ] Espelhar as correções no `AGENTS.md` (mesmo conteúdo factual)
  - files: `AGENTS.md`
- [ ] Popular `documents/core/Projeto.md` (visão + arquitetura real + diagrama do spec + link p/ design)
  - files: `documents/core/Projeto.md`
- [x] Criar `documents/core/Roadmap.md` (Fases 0–4 ↔ SP0–SP5)
- [x] Criar `documents/core/TODO.md` (este backlog)

### Tarefa 0.4: Commit do PR-0

- [ ] Revisar staging (`git status`) — garantir nenhum `.env` incluído
- [ ] Commitar: `chore(planning): adiciona repo próprio, metodologia e docs do estado real (PR-0)`
- [ ] `git push`

### Critério de Aceite PR-0 (DoD SP0)

- [x] `origin` aponta p/ repo de Fernando; `upstream` p/ João
- [ ] Histórico (commits) preservado, autoria de João intacta
- [x] Estrutura de metodologia (`documents/`, `.claude/`) presente
- [ ] `.planning/ciclo-1-fundacao/CONTEXT.md` criado
- [ ] `CLAUDE.md`/`AGENTS.md` refletem o estado real (sem `sim-state.json` como persistência primária)
- [ ] `Projeto.md` populado; `Roadmap.md`, `TODO.md` criados
- [ ] Spec e plano commitados; nenhum secret no git

---

## FASE 1: PoV — SP1 · Self-hosting no Windows

> **⏳ Aguardando:** conclusão do PR-0. Ciclo 1 · PR-1 → PR-2 → PR-3 (sequenciais). Guardrails: **G-CONTRACT** (PR-1), **G-BASELINE-PARITY adaptado** (PR-3).

### PR-1: Containerização

#### Tarefa 1.1: Habilitar o build standalone do Next

- [ ] Adicionar `output: 'standalone'` ao `next.config.js`
  - files: `next.config.js`
  - verify: `npm run build && ls .next/standalone/server.js`
- [ ] Commit: `build(web): habilita output standalone para Docker`

#### Tarefa 1.2: Dockerfile do `web` + `.dockerignore`

- [ ] Criar `.dockerignore` (node_modules, .next, .git, data, .env*, documents, .planning)
  - files: `.dockerignore`
- [ ] Criar `Dockerfile` multi-stage (deps → builder → runner; copia `public`, `.next/standalone`, `.next/static`, `scripts`)
  - files: `Dockerfile`
  - verify: `docker build -t market-terminal-web .`
  - done: imagem `market-terminal-web` criada sem erro (o `scripts/` é copiado porque o `scheduler` reusa esta imagem)
- [ ] Commit: `build(web): adiciona Dockerfile multi-stage e dockerignore`

#### Tarefa 1.3: docker-compose com os três serviços

- [ ] Criar `docker-compose.yml`: `web` (build local, ports 3000, env_file, depends_on), `model-engine` (build `./services/model-engine`), `news-nlp` (build `./services/news-nlp`, volume `news-models:/models`); `restart: unless-stopped` em todos
  - files: `docker-compose.yml`
- [ ] Atualizar `.env.example`: URLs internas do Compose (`ATLAS_BACKEND_URL=http://model-engine:8010`, `NEWS_NLP_URL=http://news-nlp:8000`, `TERMINAL_URL=http://web:3000`)
  - files: `.env.example`
- [ ] Criar `.env` local (não commitado) com valores reais mínimos: `DATABASE_URL`, `FRED_API_KEY`, `APP_USERNAME`, `APP_PASSWORD`, `CRON_SECRET`
- [ ] **(G-CONTRACT) Smoke do contrato BFF↔Python**
  - verify: `docker compose up -d --build && docker compose ps` (web, model-engine, news-nlp `running`)
  - verify: `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/market | head -c 300` → JSON do backend Python (não erro de conexão)
  - verify (news-nlp alcançável): `docker compose exec web node -e "fetch('http://news-nlp:8000/').then(r=>console.log(r.status))"`
  - done: registrar o resultado do smoke como evidência do G-CONTRACT
- [ ] Commit: `build(infra): docker-compose com web + model-engine + news-nlp`

#### Critério de Aceite PR-1

- [ ] `docker compose up` sobe os três serviços (`running`)
- [ ] G-CONTRACT: `/api/market` e `/api/news` respondem com dados reais via backend Python interno
- [ ] `npm run type-check` e `npm run lint` passam
- [ ] Nenhum secret commitado (`.env` fora do git)

### PR-2: Scheduler interno + Neon próprio

#### Tarefa 2.1: Script do scheduler (tick)

- [ ] Criar `scripts/scheduler.mjs` — replica o Cloudflare Worker: loop 60s → `GET /api/market` + `POST /api/sim {action:'tick'}` com `Bearer CRON_SECRET`; retrain diário opcional (gate por hora UTC via `RETRAIN_HOUR_UTC`)
  - files: `scripts/scheduler.mjs`

#### Tarefa 2.2: Adicionar o serviço `scheduler` ao Compose

- [ ] Adicionar serviço `scheduler` (reusa a imagem do `web`, `command: node scripts/scheduler.mjs`, `TERMINAL_URL=http://web:3000`, `NEWS_NLP_URL`, `depends_on: web`, `restart: unless-stopped`)
  - files: `docker-compose.yml`
  - verify: `docker compose up -d --build scheduler && docker compose logs --tail=5 scheduler` → `[scheduler] tick a cada 60s → http://web:3000`, sem erros HTTP repetidos

#### Tarefa 2.3: Provisionar o Neon próprio e validar persistência

- [ ] Criar o projeto Neon próprio (console Neon, conta de Fernando); copiar a connection string pooled
- [ ] Definir `DATABASE_URL` no `.env` e recriar serviços (`docker compose up -d --force-recreate web scheduler`)
- [ ] **(verificação de persistência)**
  - verify: `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sim | grep -o '"persistence":"[a-z]*"'` → `"persistence":"postgres"`
- [ ] **(verificação do tick)** — aguardar ~2 min e comparar `asOf` em duas leituras
  - verify: `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sim | grep -o '"asOf":"[^"]*"'` → avança entre leituras
- [ ] Commit: `feat(scheduler): tick interno substitui o cloudflare worker`

#### Critério de Aceite PR-2

- [ ] `scheduler` roda no Compose e loga o tick sem erros HTTP
- [ ] `/api/sim` reporta `"persistence":"postgres"` (Neon próprio)
- [ ] `asOf`/equity do book avança sem nenhum browser aberto
- [ ] Comportamento do tick equivale ao do Worker (mesmos endpoints/ação)

### PR-3: Exposição (Tailscale Funnel), uptime e cutover

#### Tarefa 3.1: Tailscale Funnel

- [ ] Instalar o Tailscale no Windows e autenticar (conta de Fernando)
- [ ] Habilitar HTTPS/Funnel no tailnet (admin console: MagicDNS + HTTPS certificates)
- [ ] Expor a porta do `web` (3000) via Funnel
  - verify: `tailscale funnel 3000` → URL pública `https://<host>.<tailnet>.ts.net`
- [ ] **(acesso público)** abrir a URL `*.ts.net` num navegador externo (ex.: celular em rede móvel)
  - done: tela de login carrega; após login, a app funciona — sem instalação no cliente

#### Tarefa 3.2: Uptime (boot + restart)

- [ ] Configurar Docker Desktop para iniciar no login/boot do Windows (Settings → General → "Start Docker Desktop when you log in")
- [ ] Confirmar Tailscale rodando como serviço (inicia no boot por padrão)
- [ ] **(G-BASELINE-PARITY adaptado — teste de resiliência)** reiniciar o Windows e validar recuperação automática
  - verify: `docker compose ps` (serviços `running`)
  - verify: `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sim | grep -o '"persistence":"[a-z]*"'` → `"postgres"`; URL `*.ts.net` responde; tick retoma
  - done: registrar como evidência do guardrail

#### Tarefa 3.3: Cutover — aposentar o Worker e atualizar docs

- [ ] Reescrever `DEPLOY.md` para o procedimento self-hosted (Compose + Neon próprio + Tailscale Funnel + scheduler); marcar o caminho Vercel/Worker como legado
  - files: `DEPLOY.md`
- [ ] Marcar o Cloudflare Worker como não-implantado (nota em `deploy/cloudflare-worker/` — manter o código por referência, **não** deletar)
  - files: `deploy/cloudflare-worker/`
- [ ] Commit: `docs(deploy): self-hosting no Windows substitui Vercel + worker`

#### Critério de Aceite PR-3

- [ ] URL `*.ts.net` acessível por qualquer navegador externo, sem instalação no cliente
- [ ] G-BASELINE-PARITY (adaptado): após reboot do Windows, serviços religam sozinhos, persistência mantida, tick retoma
- [ ] `DEPLOY.md` descreve o procedimento self-hosted; Worker marcado como legado

### DoD Fase 1 / SP1 (Consolidado)

- [ ] `docker compose up` sobe `web` + `model-engine` + `news-nlp` + `scheduler` no Windows
- [ ] Terminal acessível por `https://…ts.net` de qualquer navegador, sem instalação no cliente
- [ ] `/api/sim` → `"persistence":"postgres"` (Neon próprio)
- [ ] Após 2+ min sem browser, `asOf` do book avança e o equity intraday ganha marcas
- [ ] Serviços religam sozinhos após `docker restart` e após reboot do Windows
- [ ] Cloudflare Worker não é mais necessário para o tick
- [ ] `npm run type-check` + `npm run lint` passam; invariante não-lookahead intacto (R5)

---

## FASE 2: MVP — SP2 · Multi-tenancy core

> **⏳ Planejado (Ciclo 2)** — terá spec → plano → implementação próprios. Caso canônico de paralelização (sweep multi-modal → pipeline de migração → verificação adversarial). Novo guardrail **G-TENANT-ISOLATION**.

### Pré-trabalho (sweep)

- [ ] Sweep multi-modal (loop-until-dry): varrer o código por tabela, por rota de API e por hook de estado/`localStorage` até K rodadas sem achados novos
- [ ] Consolidar o mapa completo de pontos single-tenant (partindo do Apêndice A do spec)
- [ ] Desenhar a camada única de acesso a dados que **exige** `user_id`

### Migração (a partir do Apêndice A — ponto de partida, não exaustivo)

- [ ] `src/lib/auth.ts` — substituir `CREDENTIAL_ID = 'primary'` (credencial global) por tabela de múltiplos usuários; sessão carrega identidade
- [ ] `src/lib/sim/stateStore.ts` — substituir `STATE_ID = 'paper-book'` (book global) por book por `user_id`
- [ ] `src/middleware.ts` — trocar o `SELECT` de sessão no Edge por **token assinado** com `user_id` (D7); desacopla do driver Neon
- [ ] Adicionar `user_id` a `auth_credentials`, `auth_sessions`, `sim_state` (e demais tabelas do sweep); migração de schema
- [ ] Endpoints recebem o `user_id` da sessão (`WHERE id='primary'`/`'paper-book'` → `WHERE user_id=$1`)
- [ ] Provisionamento de usuários por convite/admin (R1 — sem signup público)

### Verificação de isolamento (G-TENANT-ISOLATION)

- [ ] Verificação adversarial por endpoint: agente cético tenta acessar dado de outro `user_id` (deve falhar)
- [ ] Confirmar que todo acesso a dados passa pela camada única que exige `user_id`
- [ ] Confirmar invariante não-lookahead preservado em qualquer mudança no simulador (R5)

---

## FASE 3: Hardening — Confiabilidade & self-hosted 100%

> **⏳ Planejado** — endurece a fundação multi-tenant; absorve os itens diferidos D7 (pré-requisito, entregue no SP2) / D8 + backups.

### M3.1 — Self-hosted 100% (D8: Postgres local)

- [ ] Adicionar Postgres local containerizado ao Compose
- [ ] Migrar `DATABASE_URL` de Neon → Postgres local (destravado pelo token assinado D7)
- [ ] Validar migração de dados (sem perda); app 100% self-contained (sem nuvem para dados)

### M3.2 — Backups & durabilidade

- [ ] `pg_dump` agendado; testar restore
- [ ] Documentar procedimento de restore em `DEPLOY.md`

### M3.3 — Resiliência & observabilidade básica

- [ ] Monitoramento básico de saúde (web, model-engine, news-nlp, scheduler)
- [ ] Validar recuperação após queda de um serviço individual (além do reboot test do SP1)

---

## FASE 4: Expansões — Valor por usuário

> **⏳ Planejado (Ciclos 3–4)** — incremental e sob demanda, sobre a fundação multi-tenant. Cada feature respeita G-TENANT-ISOLATION e não-lookahead (R5).

### M4.1 — SP3: Robô / estratégia por usuário

- [ ] Persistir parâmetros de estratégia por `user_id` (sleeves, pesos, caps, vol-target)
- [ ] `model-engine` multi-perfil: resolve sinais por perfil de usuário (walk-forward safe — R5)
- [ ] Expor configuração de risco por usuário na UI

### M4.2 — SP4: Workspace & UI por usuário

- [ ] Migrar `useWatchlist` de `localStorage` → servidor por `user_id`
- [ ] Migrar `useAlerts` → servidor por `user_id`
- [ ] Migrar `useTerminalPreferences` → servidor por `user_id`
- [ ] Migrar `useTerminalWorkspace` (presets/grid) → servidor por `user_id`
- [ ] Temas/presets por usuário; workspace consistente entre dispositivos

### M4.3 — SP5: Funcionalidades personalizadas

- [ ] Backlog de features sob demanda (priorizado pelo círculo fechado) — definir ao iniciar o ciclo
- [ ] Cada feature: respeitar isolamento de tenant e não-lookahead

---

## Itens Adiados (deferred — preservar histórico de decisão)

> Decisões registradas no spec (Seção 11) e no plano. Adiadas conscientemente; reavaliar no ciclo indicado.

- [ ] **Preservar histórico do paper book** — decidido "subir limpo" no 1º corte; avaliar importar via `pg_dump` (só a tabela `sim_state`) no **SP2**. Aparece como item de DoR do SP2.
- [ ] **Domínio próprio + Cloudflare Tunnel** — upgrade futuro sobre o Tailscale Funnel (troca a URL `*.ts.net` por domínio branded). Não toca a aplicação; agendar pós-Ciclo 1.
- [ ] **Postgres local (D8) / self-hosted 100%** — destravado pelo token assinado (D7); planejado para a **Fase 3 (Hardening)**. Backup vira `pg_dump` agendado.
- [ ] **Confirmar nome definitivo do projeto** no repo próprio (mantido "Market-Terminal" / `market-terminal`).

---

## Bloqueios e Dependências

### Bloqueios Ativos

**1. Arquitetura do agente always-on — decisão aguardando o Fernando (TECH-31 · P1).**

Quatro opções na mesa desde 23/07/2026: sessão de terminal aberta; disparo por
relógio de um agente headless no host Windows; routine na nuvem como núcleo;
híbrido (headless local + routine externa de watchdog de uptime). A sessão de
julho recomendou o híbrido. **Nada foi decidido.**

O que trava atrás disso: as skills `/briefing`, `/recap` e `/watchdog`, e o
esboço de `.planning/patches/agente-headless/`.

Insumo levantado em 20/08/2026, que não existia em julho e pode encolher a
decisão — **apurado, não concluído**:

- O daemon do orquestrador de tarefas roda como processo persistente no WSL do
  desktop (`homelab-wsl`). O processo em execução hoje subiu em 19/08 17:30, não
  é um uptime contínuo desde a instalação.
- Já existem três automações agendadas ativas no workspace, criadas pelo
  Fernando. Duas cobrem funções que a P1 pretendia construir do zero: um
  briefing diário do portfólio (desde 17/08) e uma ronda diária de
  infraestrutura que checa o homelab por SSH em modo somente-leitura (desde
  18/08). Falta o `/recap`.
- Há runtimes online em **duas máquinas** (o MacBook e o `homelab-wsl`). O
  agendamento é externo às duas, mas a execução precisa de um runtime vivo — o
  que aproxima o arranjo atual do híbrido sem que a escolha tenha sido feita, e
  deixa em aberto o caso de as duas máquinas caírem juntas.

> ⚠️ Este registro **não satisfaz** o critério "a decisão de P1 está registrada"
> da TECH-31. Ele registra a pendência e o insumo; a decisão continua com o
> Fernando. O comando de verificação daquele critério (`grep headless|watchdog`)
> passa a casar com este texto — casar não é decidir.

### Dependências

1. **PR-0 → PR-1:** docs do estado real concluídos antes de containerizar.
2. **PR-1 → PR-2:** Compose sobe os três serviços (G-CONTRACT) antes de adicionar o scheduler e o Neon próprio.
3. **PR-2 → PR-3:** persistência (`"persistence":"postgres"`) e tick validados antes de expor publicamente e fazer cutover.
4. **SP1 → SP2:** ambiente self-hosted estável (sobreviveu a reboot) antes de introduzir `user_id`.
5. **D7 → D8:** token assinado (remove acoplamento Edge↔Neon) antes de migrar para Postgres local.

---

## Próximas Ações (Top 3)

1. **[AGORA]** Concluir PR-0: corrigir `CLAUDE.md`/`AGENTS.md` p/ o estado real, popular `Projeto.md`, criar `.planning/ciclo-1-fundacao/CONTEXT.md`, ajustar `.gitignore` p/ versionar `.claude/`.
2. **[DEPOIS]** Commitar PR-0 (`chore(planning): ...`), verificar autoria preservada e avisar João do espelhamento.
3. **[EM SEGUIDA]** Iniciar PR-1: `output: 'standalone'` + Dockerfile + `docker-compose.yml`, com smoke do G-CONTRACT.

---

## Skills Úteis

### Validação de Milestones
- `validate-dor [milestone-id]` - Validar Definition of Ready antes de iniciar
- `validate-dod [milestone-id]` - Validar Definition of Done ao concluir

### Qualidade de Código
- `pre-commit-check` - Checklist completo antes de commit
- `validate-testing` - Validar cobertura (quando houver testes)

### Documentação
- `sync-downstream` - Forward-portar a metodologia do template (PR-0)
- `update-docs system` - Atualizar documentação técnica
- `update-docs task [milestone-id]` - Atualizar Projeto.md (Changelog) e referenciar no Roadmap.md
- `update-docs roadmap` - Reprioritizar Roadmap/TODO quando decisões mudarem o plano
- `validate-docs-links` - Validar sistema de links

### Git
- `organize-commits` - Guiar organização de commits (Conventional Commits, atômicos)

### Context Management
- `fresh-context [milestone]` - Gerar CONTEXT.md para handoff (sessão >150k tokens)
- `generate-session-prompt` - Gerar prompt curto para retomada

---

## Quando Atualizar Este Documento

Atualize quando:
- **Tarefas são completadas** (marcar `- [x]`)
- **Novas tarefas/PRs são identificados**
- **Bloqueios surgem ou são resolvidos**
- **Milestones/PRs são completados** (atualizar barras de progresso)
- **Itens adiados são retomados** (mover da seção "Itens Adiados")

**Processo:**
1. Atualizar a seção relevante
2. Incrementar versão (semver) se mudança significativa
3. Registrar no `.planning/ciclo-1-fundacao/CONTEXT.md` (diário) e commitar

---

## Changelog

### v1.0.0 (2026-06-28)

**Criação Inicial:**
- Backlog granular do Ciclo 1 (PR-0 a PR-3) com tarefas, verificações (`verify:`) e critérios de aceite extraídos do plano
- Backlog futuro (SP2 multi-tenant, SP3 robô por usuário, SP4 UI por usuário, SP5)
- Seção "Itens Adiados" preservando o histórico de decisão (histórico do paper book, domínio próprio + Cloudflare Tunnel, Postgres local/D8)
- Status atual refletido: PR-0 em andamento (repo + metodologia no lugar; docs do estado real em curso)

**Autor:** Fernando Bertholdo (com Claude Code)
**Contexto:** SP0 — Fundação & documentação. Projeto herdado de João Gabriel de Ouro Preto (`joaoouro`), autoria preservada.

---

**Última atualização:** 2026-06-28
**Versão:** 1.0.0
**Mantido por:** Fernando Bertholdo
