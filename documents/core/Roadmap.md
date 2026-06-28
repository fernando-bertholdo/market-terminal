# Roadmap - Market Terminal

## Metadata

- **Versão:** 1.0.0
- **Status:** Em andamento (Ciclo 1 — SP0 ativo)
- **Última atualização:** 2026-06-28
- **Responsável:** Fernando Bertholdo

---

## Referências Principais

- [Projeto.md](Projeto.md) - Fonte de verdade, regras de negócio, arquitetura
- [TODO.md](TODO.md) - Tarefas granulares e progresso diário
- [../../CLAUDE.md](../../CLAUDE.md) (Claude Code) e [../../AGENTS.md](../../AGENTS.md) (Codex) - Regras de desenvolvimento sempre ativas
- [Design do Ciclo 1 (SP0+SP1)](../superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md) - Spec de design + ADRs D1–D8 + roadmap SP0–SP5
- [Plano do Ciclo 1](../superpowers/plans/2026-06-28-ciclo1-selfhost-foundation.md) - PR-0 a PR-3, critérios de aceite e verificações

> **Rastreabilidade (milestones):** ao concluir um milestone/PR, registre decisões/entregas no **Changelog** do `Projeto.md` e adicione no milestone uma referência curta (ex.: `Projeto.md: vX.Y.Z (SP1/PR-2 — scheduler interno)`). O diário operacional do ciclo vive em `.planning/ciclo-1-fundacao/CONTEXT.md`.

## Links Relacionados

### Initiative em andamento

- [.planning/ciclo-1-fundacao/CONTEXT.md](../../.planning/ciclo-1-fundacao/CONTEXT.md) - Diário de rodadas do Ciclo 1 (uma entrada por PR concluído)

---

## Visão Geral do Roadmap

Este projeto não é greenfield: o Market Terminal é um terminal FICC + simulador quant de paper-trading **já em produção** (autoria original de João Gabriel de Ouro Preto / `joaoouro`), operado como ferramenta pessoal single-tenant. O roadmap descreve a **evolução** da ferramenta pessoal (single-tenant, hospedada no Vercel, que saiu do ar por estourar o free-tier) para uma **plataforma self-hosted e multi-tenant** para um círculo fechado de ~10 usuários — preservando o invariante de não-lookahead do simulador e a autoria original.

As Fases 0–4 da metodologia (Planejamento, PoV, MVP, Hardening, Expansões) estão mapeadas diretamente sobre os sub-projetos **SP0–SP5** definidos no spec de design (Seção 6).

### Mapeamento Fases ↔ Sub-projetos ↔ Ciclos

| Fase | Nome | Sub-projeto(s) | Ciclo | Entrega-núcleo | Status |
|------|------|----------------|-------|----------------|--------|
| **0** | Planejamento | **SP0 · Fundação & docs** | Ciclo 1 | Repo próprio + metodologia + estado real documentado + roadmap + ADRs | 🔄 **Em andamento** |
| **1** | PoV (Prova de Valor) | **SP1 · Self-hosting Windows** | Ciclo 1 | Stack inteira rodando self-hosted no Windows, exposta por URL pública, sem Vercel | ⏳ Planejado (próximo no Ciclo 1) |
| **2** | MVP | **SP2 · Multi-tenancy core** | Ciclo 2 | `user_id` em tudo, auth multi-user, isolamento row-level verificado | ⏳ Planejado |
| **3** | Hardening | SP2 (consolidação) + itens diferidos | Ciclo 2 | Token assinado (D7), Postgres local 100% (D8), backups, isolamento adversarial | ⏳ Planejado |
| **4** | Expansões | **SP3 · Robô por usuário** · **SP4 · Workspace & UI** · **SP5 · Funcionalidades personalizadas** | Ciclos 3–4 | Estratégia/UI/configs por usuário sobre a fundação multi-tenant | ⏳ Planejado |

> **Nota de mapeamento:** o SP2 (multi-tenancy) atravessa a Fase 2 (entrega do núcleo multi-tenant = MVP) e a Fase 3 (endurecimento do isolamento + desbloqueio do self-hosted 100%). A Fase 3 absorve os itens deliberadamente diferidos no spec (D7 token assinado, D8 Postgres local, backups `pg_dump`), que são "hardening" por natureza — tornam o sistema robusto e self-contained.

### Timeline Geral

```
┌──────────────┬──────────────┬───────────────┬────────────────┬─────────────────┐
│    Fase 0    │   Fase 1     │    Fase 2     │    Fase 3      │     Fase 4      │
│ Planejamento │     PoV      │     MVP       │   Hardening    │   Expansões     │
│     SP0      │    SP1       │     SP2       │  SP2 (consol.) │ SP3 · SP4 · SP5 │
│  Fundação    │ Self-hosting │ Multi-tenancy │  D7 · D8 ·     │  Robô / UI /    │
│   & docs     │   Windows    │     core      │  backups       │ feats por user  │
├──────────────┴──────────────┼───────────────┼────────────────┴─────────────────┤
│        Ciclo 1               │    Ciclo 2    │         Ciclos 3–4               │
│   🔄 EM ANDAMENTO            │  ⏳ Planejado │       ⏳ Planejado               │
└──────────────────────────────┴───────────────┴──────────────────────────────────┘
       📝            🔬              🚀               🔒                ✨
```

### Fases

| Fase | Nome | Sub-projeto | Status | Objetivo |
|------|------|-------------|--------|----------|
| **0** | Planejamento | SP0 | 🔄 Em andamento | Repo próprio, metodologia, documentar o estado real, decisões (ADRs) |
| **1** | PoV | SP1 | ⏳ Planejado (Ciclo 1) | Provar a hipótese técnica: stack inteira self-hosted no Windows, exposta publicamente, com uptime |
| **2** | MVP | SP2 | ⏳ Planejado (Ciclo 2) | Plataforma multi-tenant funcional para o círculo fechado |
| **3** | Hardening | SP2 + diferidos | ⏳ Planejado | Isolamento verificado, token assinado, Postgres local, backups |
| **4** | Expansões | SP3 · SP4 · SP5 | ⏳ Planejado | Robô, workspace/UI e funcionalidades por usuário |

### Restrições & premissas globais (do spec de design)

- **R1 — Escala:** círculo fechado, ~10 usuários de confiança, provisionados por convite/admin (sem signup público, billing ou LGPD pesado).
- **R2 — Host:** um único desktop Windows doméstico com Docker Desktop.
- **R3 — Custo-alvo:** ~zero no 1º corte (Neon Free + Tailscale Free).
- **R4 — Autoria:** preservar a autoria de João (commits originais intactos; transparência sobre o espelhamento).
- **R5 — Invariante do simulador:** não-lookahead — sinais em `t` nunca podem ver preços após `t`. Toda mudança que toque a lógica de sinais exige revisão dedicada.

---

## Fase 0: Planejamento — SP0 · Fundação & Documentação

### Objetivo

Estabelecer a base de trabalho: criar o repositório próprio de Fernando (preservando autoria de João), instalar a metodologia de desenvolvimento (Fases 0–4, `documents/`, `.planning/`, configs multi-IA) e **documentar o estado real** do sistema — corrigindo a documentação herdada, que está defasada em relação ao código.

> **Por que isto vem primeiro:** o `CLAUDE.md` herdado descreve um estágio anterior (`sim-state.json`, "sem auth"), enquanto o código real já tem login completo (cookie + PBKDF2 + Postgres), persistência em **Neon Postgres**, **dois serviços Python** (`model-engine`, `news-nlp`) e um tick via **Cloudflare Worker**. Multi-tenancy guiado por um mapa errado é a principal fonte de retrabalho neste projeto.

### Timeline

- **Início:** 2026-06-28
- **Conclusão Prevista:** dentro do Ciclo 1 (corte único, PR-0)
- **Status:** 🔄 Em andamento — repo e metodologia já no lugar; documentação do estado real em curso

### Decisões Críticas (ADRs — congeladas como *Decision Locks*)

As decisões abaixo foram tomadas no design e estão **congeladas**; mudá-las exige checkpoint humano explícito (decisão original → por que mudar → impacto downstream).

| ID | Decisão | Implicação se mudar |
|----|---------|---------------------|
| **D1** | Repositório próprio (duplicação + `upstream`), **não** fork formal do GitHub | Muda todo o setup de remotes e o fluxo de sincronização com o upstream |
| **D2** | Escala "círculo fechado" (~10 usuários) | Isolamento row-level basta; signup/billing/LGPD pesado ficam fora de escopo |
| **D3** | Manter Neon (projeto **próprio** de Fernando) no Ciclo 1 | Reintroduz refactor de driver + questão de Edge Runtime se revertido |
| **D4** | Docker Compose como orquestrador no Windows | Reescreve PR-1/PR-2/PR-3 inteiros |
| **D5** | Tailscale Funnel para exposição pública | Reescreve PR-3; reintroduz necessidade de domínio/porta |
| **D6** | Tick interno (container `scheduler`) substitui o Cloudflare Worker | Muda PR-2; o `CRON_SECRET` **permanece** (passa a autenticar o scheduler interno) |
| **D7** | *(Futuro, SP2/Fase 3)* Sessão por token assinado, verificável sem tocar o banco no Edge | Desbloqueia a migração para Postgres local "de graça" |
| **D8** | *(Futuro, Fase 3)* Self-hosted 100% — `DATABASE_URL` → Postgres local containerizado | Backup vira `pg_dump` agendado; elimina dependência do Neon |

### DoR (Definition of Ready)

- [x] Spec de design aprovado (`documents/superpowers/specs/2026-06-28-...`)
- [x] Plano do Ciclo 1 escrito (`documents/superpowers/plans/2026-06-28-...`)
- [x] Acesso irrestrito ao repositório de origem (`joaoouro/Market-Terminal`)
- [x] Conta GitHub de Fernando e Docker Desktop disponíveis

### DoD (Definition of Done) — SP0

**Repositório & autoria:**
- [x] Repo próprio privado no ar; `origin` → `fernando-bertholdo/market-terminal`, `upstream` → `joaoouro/Market-Terminal`
- [ ] Histórico completo de commits preservado (autoria de João intacta — `git log --format='%an'` inclui `João Gabriel de Ouro Preto`)
- [ ] João avisado do espelhamento (transparência — R4)

**Metodologia:**
- [x] Estrutura `documents/` + configs multi-IA (`.claude/`, `.codex/`, `.agents/`) presentes
- [ ] `.claude/` versionado no git (exceto efêmeros: `.claude/plans/`, `.claude/settings.local.json`)
- [ ] `.planning/ciclo-1-fundacao/CONTEXT.md` criado (diário de rodadas)

**Documentação do estado real:**
- [ ] `CLAUDE.md` e `AGENTS.md` refletem o estado real (auth completa, Neon, serviços Python, tick) — **sem** `sim-state.json` como persistência primária
- [ ] `documents/core/Projeto.md` populado (visão + arquitetura real)
- [x] `documents/core/Roadmap.md` criado (Fases 0–4 ↔ SP0–SP5)
- [x] `documents/core/TODO.md` criado (backlog inicial)
- [ ] Spec e plano commitados; **nenhum secret no git** (`.env`/`.env.local` gitignored)

### Skills Aplicáveis

- **Antes:** `validate-dor Fase0`
- **Durante:** `sync-downstream` (portar metodologia), `pre-commit-check`, `update-docs system`
- **Após:** `validate-dod Fase0`, `update-docs task SP0`

---

## Fase 1: PoV — SP1 · Self-hosting no Windows

### Objetivo

Provar a hipótese técnica central da migração: rodar a **aplicação inteira** (Next.js + `model-engine` + `news-nlp` + tick interno) self-hosted no desktop Windows de Fernando, persistindo no Neon próprio, exposta por uma **URL pública estável** acessível por qualquer navegador, com auto-restart e início no boot — **sem Vercel e sem Cloudflare Worker**.

### Arquitetura-alvo

```
        Tailscale Funnel → https://market-terminal.<tailnet>.ts.net
                │
   ┌────────────┴── Windows + Docker Desktop (inicia no boot) ───────────┐
   │  docker-compose (restart: unless-stopped)                           │
   │    [web: Next.js standalone] ──→ [model-engine] (FastAPI :8010)     │
   │          │                       [news-nlp]    (FastAPI :8000)      │
   │    [scheduler] ──1/min──→ GET /api/market + POST /api/sim {tick}    │
   │                └──(Bearer CRON_SECRET, retrain diário opcional)     │
   └──────────┼──────────────────────────────────────────────────────────┘
              ↓
       [Neon Postgres]  (projeto próprio de Fernando — por ora na nuvem)
   ✗ Cloudflare Worker → ELIMINADO   ✓ CRON_SECRET → PERMANECE
```

### Timeline

- **Início Previsto:** ao concluir SP0 (DoD 100%)
- **Conclusão Prevista:** dentro do Ciclo 1 (3 PRs sequenciais)
- **Status:** ⏳ Planejado — infra integrada e sequencial (baixa paralelização)

### Milestones

#### M1.1 — PR-1: Containerização

**Objetivo:** rodar `web` + `model-engine` + `news-nlp` localmente via Docker Compose, com o contrato BFF↔Python íntegro.

**Entregas:**
- `next.config.js` com `output: 'standalone'`
- `Dockerfile` (multi-stage standalone) + `.dockerignore`
- `docker-compose.yml` com os três serviços, rede interna e `restart: unless-stopped`
- Volume persistente `news-models:/models` (evita re-download dos pesos `torch`/`transformers`)
- `.env.example` atualizado (URLs internas do Compose + `TERMINAL_URL`)

**Guardrail ativo:** **G-CONTRACT** — dentro do Compose, `web` resolve `ATLAS_BACKEND_URL` interno e `/api/market`, `/api/sim`, `/api/news` respondem com dados reais (não fallback de erro).

**DoR:**
- [ ] SP0 completo (DoD 100%)
- [ ] Docker Desktop funcional no Windows

**DoD:**
- [ ] `docker compose up` sobe os três serviços com status `running`
- [ ] G-CONTRACT verificado: `/api/market` retorna dados do backend Python interno (não erro de conexão)
- [ ] `.next/standalone/server.js` gerado pelo build
- [ ] `npm run type-check` e `npm run lint` passam
- [ ] Nenhum secret commitado

#### M1.2 — PR-2: Scheduler interno + Neon próprio

**Objetivo:** substituir o Cloudflare Worker por um container `scheduler` interno e persistir no projeto Neon próprio de Fernando.

**Entregas:**
- `scripts/scheduler.mjs` (loop de 60s: `GET /api/market` + `POST /api/sim {action:'tick'}` com `Bearer CRON_SECRET`; retrain diário opcional com gate por hora UTC)
- Serviço `scheduler` no Compose (reutiliza a imagem do `web`)
- `DATABASE_URL` apontando para o Neon próprio de Fernando

**DoR:**
- [ ] M1.1 (PR-1) completo (DoD 100%)
- [ ] Projeto Neon próprio criado (connection string pooled)

**DoD:**
- [ ] `scheduler` roda no Compose e loga o tick sem erros HTTP repetidos
- [ ] `/api/sim` reporta `"persistence":"postgres"` (Neon próprio)
- [ ] Após ~2 min sem browser aberto, o `asOf`/equity intraday do book avança (tick alimentando o book)
- [ ] Comportamento equivale ao do Worker (mesmos endpoints/ação/auth)

#### M1.3 — PR-3: Exposição (Tailscale Funnel), uptime e cutover

**Objetivo:** expor o terminal por URL pública estável, garantir uptime (boot + restart), validar estabilidade e aposentar o Worker.

**Entregas:**
- Tailscale instalado no Windows + Funnel da porta 3000 (`https://<host>.<tailnet>.ts.net`)
- Docker Desktop "start on login/boot" + Tailscale como serviço
- `DEPLOY.md` reescrito para o procedimento self-hosted; Worker marcado como legado (código mantido por referência, não deletado)

**Guardrail ativo:** **G-BASELINE-PARITY (adaptado)** — sem operação paralela (Vercel já offline, não há baseline ao vivo). Reduz-se a um **critério de estabilidade**: o ambiente Windows sobe, persiste no Neon, o tick avança o book e **sobrevive a um reboot do Windows** (Docker e Tailscale religam sozinhos).

**DoR:**
- [ ] M1.2 (PR-2) completo (DoD 100%)
- [ ] Conta Tailscale + HTTPS/Funnel habilitados no tailnet (MagicDNS + certificados)

**DoD:**
- [ ] URL `*.ts.net` acessível por qualquer navegador externo (ex.: celular em rede móvel), sem instalação no cliente; tela de login carrega e a app funciona após login
- [ ] G-BASELINE-PARITY (adaptado): após reboot do Windows, serviços religam sozinhos, persistência mantida, tick retoma — **sem intervenção manual**
- [ ] `DEPLOY.md` descreve o procedimento self-hosted; Worker marcado como legado

### DoD Fase 1 (Consolidado — aceite do SP1)

**Funcional:**
- [ ] `docker compose up` sobe `web` + `model-engine` + `news-nlp` + `scheduler` no Windows
- [ ] Terminal acessível por `https://…ts.net` de qualquer navegador, sem instalação no cliente
- [ ] `/api/sim` reporta `"persistence":"postgres"` (Neon próprio)
- [ ] Após 2+ min sem browser aberto, `asOf` do book avança e o equity intraday ganha marcas

**Resiliência:**
- [ ] Serviços reiniciam sozinhos após `docker restart` e após reboot do Windows
- [ ] Cloudflare Worker não é mais necessário para o tick

**Qualidade & Segurança:**
- [ ] `npm run type-check` e `npm run lint` passam
- [ ] Invariante de não-lookahead intacto (nenhuma tarefa do ciclo toca lógica de sinais — R5)
- [ ] Nenhum secret hardcoded; `.env`/`.env.local` fora do git

**Documentação:**
- [ ] `CLAUDE.md`/`AGENTS.md`/`DEPLOY.md` refletem o estado self-hosted
- [ ] `.planning/ciclo-1-fundacao/CONTEXT.md` com entrada por PR
- [ ] `Projeto.md` atualizado (Changelog) e `Roadmap.md` referencia a entrada

### Skills Aplicáveis

- **Antes:** `validate-dor M1.1` / `M1.2` / `M1.3`
- **Durante:** `pre-commit-check`, `organize-commits`, `update-docs system`
- **Após:** `validate-dod M1.x`, `update-docs task SP1`

---

## Fase 2: MVP — SP2 · Multi-tenancy core

### Objetivo

Transformar a ferramenta single-tenant na **plataforma multi-tenant** para o círculo fechado: introduzir `user_id` em todas as tabelas e fluxos, auth multi-usuário e **isolamento row-level verificado**. É o MVP do produto multi-tenant — cada pessoa enxerga apenas o próprio book/estado.

> **Pré-requisito conceitual:** o spec lista pontos single-tenant conhecidos (Apêndice A) — `CREDENTIAL_ID = 'primary'` em `src/lib/auth.ts`, `STATE_ID = 'paper-book'` em `src/lib/sim/stateStore.ts`, sessão sem identidade de tenant em `src/middleware.ts`, e estado em `localStorage` nos hooks de UI. Esse mapa é **ponto de partida, não lista exaustiva**.

### Estratégia de execução (caso canônico de paralelização)

Este é o sub-projeto com maior fan-out real. Padrão recomendado (do spec, Seção 8):
1. **Sweep multi-modal (loop-until-dry):** N agentes varrendo o código por ângulos diferentes (por tabela, por rota de API, por hook de estado/`localStorage`) até K rodadas sem achados novos.
2. **Pipeline de migração:** cada ponto vira uma transformação independente (`WHERE id='primary'`/`'paper-book'` → `WHERE user_id=$1`; endpoints recebem o `user_id` da sessão).
3. **Verificação adversarial de isolamento:** para cada endpoint migrado, um agente cético tenta provar vazamento entre `user_id`.
4. **Blindagem:** centralizar acesso a dados numa camada única que **exige** `user_id` como parâmetro (reduz a superfície de "endpoint que esqueceu o filtro").

### Timeline

- **Início Previsto:** Ciclo 2 (spec → plano → implementação próprios)
- **Status:** ⏳ Planejado

### Milestones (indicativos — detalhados no plano do Ciclo 2)

- **M2.1 — Modelo de dados multi-tenant:** `user_id` em `auth_credentials`, `auth_sessions`, `sim_state` (e demais tabelas encontradas no sweep); migração de schema.
- **M2.2 — Auth multi-usuário + token assinado (D7):** múltiplos usuários; sessão carrega identidade; validação por token assinado verificável sem `SELECT` no Edge — desacopla o `middleware.ts` do driver Neon.
- **M2.3 — Camada única de acesso a dados:** função/módulo que exige `user_id`; eliminação de SQL solto espalhado.
- **M2.4 — Verificação adversarial de isolamento:** novo guardrail **G-TENANT-ISOLATION**.

### DoR

- [ ] Fase 1 (SP1) completa e estável (sobreviveu a reboot)
- [ ] Sweep multi-modal concluído (todos os pontos single-tenant mapeados)
- [ ] Camada única de acesso a dados desenhada
- [ ] Decisão sobre histórico do paper book (subir limpo vs. importar via `pg_dump` da tabela `sim_state`) tomada

### DoD

**Funcional:**
- [ ] `user_id` presente e obrigatório em todas as tabelas e rotas de dados do usuário
- [ ] Auth multi-usuário funcional; provisionamento por convite/admin (R1)
- [ ] Sessão por token assinado (D7) — `middleware.ts` não faz `SELECT` no Edge

**Isolamento (G-TENANT-ISOLATION):**
- [ ] Verificação adversarial passa: nenhum endpoint permite acessar dado de outro `user_id`
- [ ] Acesso a dados centralizado em camada que exige `user_id`

**Invariante:**
- [ ] Não-lookahead preservado em todas as mudanças que tocam o simulador (R5)

---

## Fase 3: Hardening — Confiabilidade & self-hosted 100%

### Objetivo

Endurecer a fundação multi-tenant e tornar o sistema robusto e self-contained: consolidar o isolamento, desacoplar o banco do Edge Runtime e eliminar a dependência do Neon na nuvem. Absorve os itens deliberadamente **diferidos** no design (D7, entregue no SP2, é pré-requisito; D8 + backups são o coração desta fase).

### Timeline

- **Início Previsto:** após SP2 entregue e isolamento verificado
- **Status:** ⏳ Planejado

### Milestones

#### M3.1 — Self-hosted 100% (D8: Postgres local)

**Objetivo:** migrar `DATABASE_URL` de Neon para um Postgres local containerizado, destravado pelo token assinado (D7) que removeu o acoplamento do Edge ao driver Neon.

**DoD:**
- [ ] Postgres local containerizado no Compose; `DATABASE_URL` aponta para ele
- [ ] App 100% self-contained (sem dependência de nuvem para dados)
- [ ] Migração de dados validada (sem perda)

#### M3.2 — Backups & durabilidade

**Objetivo:** proteger os dados do círculo fechado.

**DoD:**
- [ ] `pg_dump` agendado (restauração testada)
- [ ] Procedimento de restore documentado em `DEPLOY.md`

#### M3.3 — Resiliência & observabilidade básica

**DoD:**
- [ ] Monitoramento básico de saúde dos serviços (web, model-engine, news-nlp, scheduler)
- [ ] Resiliência além do reboot test (ex.: recuperação após queda de um serviço individual)

### DoD Fase 3 (Consolidado)

**Confiabilidade:**
- [ ] Sistema sobrevive a reboot, queda de serviço individual e restauração de backup
- [ ] Sem dependência de nuvem para dados (D8)

**Manutenibilidade:**
- [ ] Troubleshooting documentado; logs facilitam diagnóstico
- [ ] Invariante de não-lookahead preservado (R5)

---

## Fase 4: Expansões — Valor por usuário

### Objetivo

Sobre a fundação multi-tenant endurecida, entregar valor incremental e personalizado por usuário. Cada stream (SP3/SP4/SP5) é independente e sob demanda.

### Timeline

- **Início Previsto:** Ciclos 3–4 (pós-Hardening)
- **Status:** ⏳ Planejado

### Milestones

#### M4.1 — SP3: Robô / estratégia por usuário

**Objetivo:** estratégia e parâmetros por pessoa; `model-engine` multi-perfil.

**Valor:** cada usuário roda o próprio robô com sleeves/pesos/risco próprios.

**DoD (indicativo):**
- [ ] Parâmetros de estratégia persistidos por `user_id`
- [ ] `model-engine` resolve sinais por perfil de usuário (walk-forward safe — R5)
- [ ] Caps de risco e vol-targeting configuráveis por usuário

#### M4.2 — SP4: Workspace & UI por usuário

**Objetivo:** migrar estado de `localStorage` (per-browser) para servidor por usuário; temas/presets.

**Valor:** workspace consistente entre dispositivos.

**DoD (indicativo):**
- [ ] `useWatchlist`, `useAlerts`, `useTerminalPreferences`, `useTerminalWorkspace` persistidos por `user_id` no servidor
- [ ] Temas/presets por usuário

#### M4.3 — SP5: Funcionalidades personalizadas

**Objetivo:** features sob demanda construídas sobre a fundação SP2.

**Valor:** variável — priorizado por necessidade do círculo fechado.

**DoD (indicativo):**
- [ ] Cada feature respeita isolamento de tenant (G-TENANT-ISOLATION) e não-lookahead (R5)

---

## Riscos & Mitigações (resumo)

| Risco | Mitigação | Fase |
|-------|-----------|------|
| Uptime de PC doméstico (queda de luz/internet, reboot) | `restart: unless-stopped` + Docker no boot + Tailscale como serviço; aceitar que 100% é aspiracional | 1 |
| Secret vazado no git durante a migração | `.env`/`.env.local` gitignored; `git status` antes de cada commit; smoke nunca imprime secret | 0–1 |
| `news-nlp` re-baixa pesos a cada restart | Volume `news-models:/models` no Compose | 1 |
| Vazamento de tenant (row-level) | Camada única com `user_id` + verificação adversarial (G-TENANT-ISOLATION) | 2 |
| Edge Runtime preso ao driver Neon | Token assinado (D7) | 2–3 |
| Perda de dados | Backup automático do Neon (1º corte) → `pg_dump` agendado (D8) | 3 |
| Quebra do invariante de não-lookahead | Revisão dedicada a cada mudança que toque o simulador (R5) | Todas |

---

## Quando Atualizar Este Documento

Atualize quando:
- **Milestones/PRs são completados** (atualizar status)
- **Timeline muda** (atrasos, aceleração)
- **DoR/DoD são ajustados** (novos critérios)
- **Decision Locks (D1–D8) mudam** (exige checkpoint humano)
- **Novos sub-projetos/milestones são adicionados**

**Processo:**
1. Atualizar a seção relevante
2. Incrementar versão (semver)
3. Adicionar entrada no Changelog
4. Registrar a entrega no `Projeto.md` (Changelog) e referenciar aqui

---

## Changelog

### v1.0.0 (2026-06-28)

**Criação Inicial:**
- Roadmap da evolução single-tenant → plataforma self-hosted multi-tenant
- Fases 0–4 mapeadas nos sub-projetos SP0–SP5 e nos Ciclos 1–4
- DoR/DoD por fase/milestone derivados dos critérios de aceite do spec e do plano do Ciclo 1
- ADRs D1–D8 registradas como Decision Locks
- Status atual: Ciclo 1 em andamento (SP0 ativo, SP1 planejado); SP2+ planejados

**Autor:** Fernando Bertholdo (com Claude Code)
**Contexto:** SP0 — Fundação & documentação (PR-0). Projeto herdado de João Gabriel de Ouro Preto (`joaoouro`), autoria preservada.

---

## Skills Aplicáveis

**Por Milestone:**
- `validate-dor [milestone-id]` - Validar DoR antes de iniciar
- `validate-dod [milestone-id]` - Validar DoD ao concluir

**Qualidade e Validação:**
- `pre-commit-check` - Checklist completo antes de commit
- `validate-testing` - Validar cobertura de testes (quando aplicável)

**Manutenção:**
- `update-docs system` - Atualizar docs técnicos após mudanças arquiteturais
- `update-docs task [milestone-id]` - Atualizar Projeto.md (Changelog) e referenciar no Roadmap.md
- `update-docs roadmap` - Reprioritizar Roadmap/TODO quando decisões mudarem o plano
- `audit-rules` - Auditar regras e documentação
- `validate-docs-links` - Validar links em documentação

---

**Última atualização:** 2026-06-28
**Versão:** 1.0.0
**Mantido por:** Fernando Bertholdo
