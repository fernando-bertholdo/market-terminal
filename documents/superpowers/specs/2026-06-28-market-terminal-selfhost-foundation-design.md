# Market Terminal — Evolução para Plataforma Self-Hosted Multi-Tenant
## Design do Ciclo 1: Fundação (SP0 + SP1)

| Campo | Valor |
|---|---|
| Data | 2026-06-28 |
| Autor do design | Fernando Bertholdo (com Claude Code) |
| Status | Proposto — aguardando revisão |
| Repo de origem | `joaoouro/Market-Terminal` (privado, autoria de João Gabriel de Ouro Preto) |
| Repo de destino | Repositório próprio privado de Fernando, com `upstream` → origem |
| Escopo deste documento | Visão geral + roadmap completo (SP0–SP5) + design detalhado do **Ciclo 1 (SP0 + SP1)** |

---

## 1. Contexto & motivação

O Market Terminal é um terminal de mercado FICC estilo Bloomberg + simulador de paper-trading quant, escrito por João e operado até aqui como **ferramenta pessoal single-tenant**. Fernando recebeu acesso irrestrito ao repositório e a liberdade de desenvolver livremente, sem intenção de "se adonar" do projeto — o que torna a estratégia de **repositório próprio com preservação de autoria** (ver D1) a forma correta de prosseguir.

### 1.1 Divergência entre a documentação herdada e o código real

O `CLAUDE.md` herdado descreve um estágio anterior do projeto. O código atual já evoluiu muito além dele:

| Camada | `CLAUDE.md` (defasado) | Código real (2026-06-28) |
|---|---|---|
| Auth | "uso pessoal, sem login" | Login completo: sessão em cookie, PBKDF2, tabelas no Postgres (`src/lib/auth.ts`, `src/middleware.ts`) |
| Persistência | `data/sim-state.json` | **Neon Postgres** (`@neondatabase/serverless`); arquivo é só fallback local sem `DATABASE_URL` |
| Backend | tudo em TypeScript/Next | **2 serviços Python** (`services/model-engine`, `services/news-nlp`, FastAPI + Docker); Next virou casca + auth + executor do book + BFF |
| Cron | — | **Cloudflare Worker** (`deploy/cloudflare-worker`) dá um "tick" a cada minuto |

> **Implicação de design:** documentar o estado real (SP0) é pré-requisito de qualquer mudança estrutural. Multi-tenancy guiado por um mapa errado é a principal fonte de retrabalho neste projeto.

### 1.2 Dores que motivam a migração

1. **Vercel Free Tier atingido** — limites de compute/bandwidth do plano Hobby.
2. **Colaboração bloqueada** — adicionar Fernando como contribuidor no Vercel exige plano PRO.
3. **Desejo de controle** — Fernando tem um desktop Windows com ~100% de uptime, ocioso, ideal para self-hosting.

### 1.3 Objetivo macro (além do Ciclo 1)

Transformar a ferramenta pessoal em uma **plataforma self-hosted e multi-tenant** para um círculo fechado de usuários, onde cada pessoa tem seu próprio robô/estratégia, sua interface customizada e suas configurações — preservando o invariante de não-lookahead do simulador e o isolamento de dados entre usuários.

---

## 2. Objetivos & não-objetivos do Ciclo 1

### Objetivos
- **O1.** Estabelecer o repositório próprio de Fernando, com histórico e autoria de João preservados e `upstream` configurado.
- **O2.** Adotar a metodologia de desenvolvimento de Fernando (template `tech-product-template`: Fases 0–4, `documents/`, `.planning/`, configs multi-IA) no projeto.
- **O3.** Documentar o **estado real** do sistema, corrigindo a documentação defasada.
- **O4.** Rodar a aplicação inteira (Next + 2 serviços Python + tick) no desktop Windows com auto-restart e início no boot.
- **O5.** Expor o terminal por uma **URL pública estável**, acessível por qualquer navegador, sem o visitante instalar nada.
- **O6.** Manter o Neon como banco no 1º corte (zero refactor de driver).

### Não-objetivos (ficam para ciclos posteriores)
- Multi-tenancy de fato (introdução de `user_id`) → **SP2**.
- Robô/estratégia por usuário → **SP3**.
- Customização de UI e configs por usuário → **SP4**.
- Postgres local (eliminar Neon) → fase futura, destravada pelo SP2.
- Signup público, billing, recuperação de senha, verificação de e-mail → fora de escopo (escala círculo fechado).

---

## 3. Restrições & premissas

- **R1.** Escala: **círculo fechado**, ~10 usuários de confiança, provisionados por convite/admin.
- **R2.** Host: um único desktop Windows doméstico (Docker Desktop disponível).
- **R3.** Custo-alvo do 1º corte: ~zero (Neon Free + Tailscale Free).
- **R4.** Preservar autoria de João (commits originais intactos; aviso de transparência a ele sobre o espelhamento).
- **R5.** Não quebrar o invariante de não-lookahead do simulador em nenhuma mudança.

---

## 4. Decisões-chave (ADRs)

### D1 — Repositório próprio (duplicação), não fork formal do GitHub
- **Contexto:** o repo de origem é privado e de terceiro; o trabalho planejado é uma *divergência* (reescrita da fundação de dados), não contribuição incremental.
- **Decisão:** criar um repo novo e privado na conta de Fernando, importando o histórico completo, e adicionar a origem como remote `upstream`.
- **Por que não fork formal:** forks de repositório privado ficam reféns do acesso de Fernando ao upstream — se revogado ou arquivado, o GitHub pode desabilitar o fork. A duplicação dá independência e ainda preserva a autoria de João.
- **Consequências:** sincronização com o upstream passa a ser manual via git (`fetch`/`merge`), aceitável dado que a base vai divergir bastante.

### D2 — Escala "círculo fechado"
- **Decisão:** projetar para ~10 usuários conhecidos.
- **Consequências:** isolamento **row-level** (banco compartilhado + `user_id`) é suficiente; signup/billing/LGPD pesado saem do escopo; segurança pragmática.

### D3 — Manter Neon (projeto próprio de Fernando) no 1º corte
- **Contexto:** o código usa `@neondatabase/serverless`, driver específico da Neon que funciona no Edge Runtime (usado pelo `middleware.ts`).
- **Decisão:** Fernando cria o **próprio** projeto Neon (não reusa o do João); a dor real (Vercel) é resolvida sem mexer no banco.
- **Consequências:** zero refactor de driver agora; o sistema não fica 100% self-contained ainda (depende do Neon). Migração para Postgres local fica para fase futura.

### D4 — Docker Compose no Windows
- **Decisão:** orquestrar `web`, `model-engine`, `news-nlp` e `scheduler` via `docker-compose`, com `restart: unless-stopped`; Docker Desktop configurado para iniciar no boot do Windows.
- **Por quê:** os serviços Python já têm `Dockerfile`; políticas de restart entregam o uptime desejado; setup reproduzível facilita a futura migração para Postgres local.

### D5 — Tailscale Funnel para exposição pública
- **Decisão:** expor o `web` por Tailscale Funnel (`https://<host>.<tailnet>.ts.net`).
- **Por quê:** URL pública estável acessível por qualquer navegador, sem o visitante instalar nada, sem abrir portas no roteador, sem IP fixo, custo zero. Roda como serviço (religa no boot).
- **Consequências:** URL não-branded (`*.ts.net`). Migração futura para domínio próprio + Cloudflare Tunnel é trivial (não toca a aplicação).

### D6 — Tick interno substitui o Cloudflare Worker
- **Contexto:** o Worker existe apenas porque funções serverless (Vercel) não rodam loops contínuos. Ele faz, a cada minuto, `GET /api/market` + `POST /api/sim {action:'tick'}` autenticados com `Bearer CRON_SECRET`, e um `POST /retrain` diário opcional no news-nlp.
- **Decisão:** substituir o Worker por um container `scheduler` interno no Compose que replica esse comportamento.
- **Importante:** o **Worker** (peça externa) é eliminado; o **`CRON_SECRET` permanece** — passa a autenticar o scheduler interno contra os mesmos endpoints liberados pelo `middleware.ts`.

### D7 — (Futuro, SP2) Sessão por token assinado
- **Decisão futura:** ao reescrever o auth para multi-tenant, trocar a validação de sessão (hoje um `SELECT` no Postgres dentro do `middleware.ts`/Edge) por um **token assinado** verificável sem tocar o banco no Edge.
- **Benefício:** desacopla o middleware do driver Neon → destrava a migração para Postgres local "de graça".

### D8 — (Futuro) Self-hosted 100% (Postgres local)
- **Decisão futura:** após D7, migrar `DATABASE_URL` de Neon para um Postgres local containerizado; backup vira `pg_dump` agendado.

---

## 5. Arquitetura-alvo (Ciclo 1)

**Hoje (serverless/Vercel):**
```
[Navegador] → [Vercel: Next.js + API] → [Neon Postgres]
[Cloudflare Worker] ──tick 1/min (Bearer CRON_SECRET)──↑
[Python backends: model-engine, news-nlp] ── deploy separado
```

**Depois (desktop Windows self-hosted):**
```
        Tailscale Funnel  →  https://market-terminal.<seu-tailnet>.ts.net
                │
   ┌────────────┴── Windows + Docker Desktop (inicia no boot) ───────────┐
   │  docker-compose  (restart: unless-stopped)                          │
   │                                                                     │
   │    [web: Next.js standalone] ──→ [model-engine] (FastAPI)           │
   │          │                       [news-nlp]    (FastAPI)            │
   │          │                                                          │
   │    [scheduler] ──1/min──→ GET /api/market + POST /api/sim {tick}    │
   │                └──(Bearer CRON_SECRET, retrain diário opcional)     │
   └──────────┼──────────────────────────────────────────────────────────┘
              ↓
       [Neon Postgres]  (projeto próprio de Fernando — por ora na nuvem)

   ✗ Cloudflare Worker  → ELIMINADO (tick virou o container scheduler)
   ✓ CRON_SECRET        → PERMANECE (autentica o scheduler interno)
```

### Componentes
- **web** — Next.js (`output: 'standalone'`), serve UI + rotas de API + auth + executor do paper book. Porta interna exposta ao Tailscale Funnel.
- **model-engine** — serviço Python existente (market data, históricos, macro, sinais, earnings), porta **8010**. Alvo de `ATLAS_BACKEND_URL`/`MODEL_ENGINE_URL` (rede interna do Compose).
- **news-nlp** — serviço Python existente (pipeline NLP de notícias; retrain opcional), porta **8000**; carrega pesos `torch`/`transformers` (cache em `/models` → exige volume persistente).
- **scheduler** — novo container leve; loop de 1 minuto chamando os endpoints com `CRON_SECRET`.
- **Neon Postgres** — projeto próprio de Fernando; mesmas tabelas (`auth_credentials`, `auth_sessions`, `sim_state`).
- **Tailscale** — cliente no host Windows (não no Compose) fazendo Funnel da porta do `web`.

---

## 6. Decomposição em sub-projetos (roadmap)

| Ciclo | Sub-projeto | Entrega | Paraleliza bem? |
|---|---|---|---|
| **1** | **SP0 · Fundação & docs** | Repo próprio + metodologia portada + estado real documentado + roadmap | Médio (documentar subsistemas em paralelo) |
| **1** | **SP1 · Self-hosting** | Compose no Windows + Neon próprio + Tailscale Funnel + tick interno | Baixo (infra integrada/sequencial) |
| 2 | SP2 · Multi-tenancy core | `user_id` em tudo; auth multi-user com token assinado (D7); isolamento via camada única de acesso a dados | **Alto** (sweep → migrate → verify) |
| 3 | SP3 · Robô por usuário | Estratégia/parâmetros por pessoa; model-engine multi-perfil | Médio-alto |
| 3 | SP4 · Workspace & UI por usuário | `localStorage` → servidor por usuário; temas/presets | Médio |
| 4 | SP5 · Funcionalidades personalizadas | Sobre a fundação do SP2 | Variável |
| 4 | (Futuro) Self-hosted 100% | Postgres local (D8), destravado por D7 | Baixo |

Cada sub-projeto a partir do SP2 terá seu próprio ciclo spec → plano → implementação.

---

## 7. Design detalhado — Ciclo 1

### 7.1 SP0 — Fundação & documentação

**Passos:**
1. **Criar o repo próprio** — duplicar `joaoouro/Market-Terminal` para um repo novo privado na conta de Fernando, preservando todo o histórico; configurar `origin` (Fernando) e `upstream` (João). Avisar João sobre o espelhamento (transparência — R4).
2. **Portar a metodologia** — usar a skill `sync-downstream` para trazer a estrutura do template (`.claude/`, `.codex/`, `.agents/`, `documents/`, `.planning/`) para o projeto, adaptando ao stack TypeScript/Next + Python.
3. **Documentar o estado real** — reescrever `CLAUDE.md` e `AGENTS.md` para refletir a arquitetura atual (auth, Neon, serviços Python, Worker); criar `documents/core/Projeto.md` (visão e arquitetura reais), `documents/core/Roadmap.md` (Fases 0–4 mapeadas em SP0–SP5).
4. **Registrar decisões** — este documento de design é a primeira peça; decisões D1–D8 viram referência viva.

**Critério de pronto:** repo próprio no ar; `documents/` populado; `CLAUDE.md` reflete o real; roadmap publicado.

### 7.2 SP1 — Self-hosting no Windows

**Mudanças no código/infra:**
1. **`next.config.js`** — adicionar `output: 'standalone'` para o Dockerfile do `web` ficar enxuto.
2. **`Dockerfile` do `web`** (novo) — build multi-stage Next standalone.
3. **`docker-compose.yml`** (novo) — serviços `web`, `model-engine`, `news-nlp`, `scheduler`; rede interna; `restart: unless-stopped`; `env_file`.
4. **`scheduler`** (novo) — container leve (ex.: shell/Node) que a cada 60s chama `GET /api/market` e `POST /api/sim {action:'tick'}` com `Bearer ${CRON_SECRET}`; opcionalmente o `POST /retrain` diário (gate por hora UTC, como no Worker).
5. **Variáveis de ambiente** — configurar `.env` no host (ver tabela abaixo).
6. **Tailscale** — instalar cliente no Windows; habilitar Funnel apontando para a porta do `web`.
7. **Uptime** — Docker Desktop "start on login/boot"; Tailscale como serviço.
8. **Aposentar o Worker** — `deploy/cloudflare-worker` deixa de ser implantado (mantido no repo por referência/histórico).

**Variáveis de ambiente (host):**

| Variável | Origem | Obrigatória |
|---|---|---|
| `DATABASE_URL` | Projeto Neon próprio de Fernando | Sim |
| `FRED_API_KEY` | Chave grátis própria (FRED) | Sim |
| `APP_USERNAME` / `APP_PASSWORD` | Definidas por Fernando (bootstrap do admin no 1º login) | Sim |
| `CRON_SECRET` | Definida por Fernando (autentica o scheduler) | Sim |
| `ATLAS_BACKEND_URL` / `MODEL_ENGINE_URL` | URL interna do Compose: `http://model-engine:8010` | Sim (para usar o backend Python) |
| `ATLAS_BACKEND_TOKEN` / `MODEL_ENGINE_TOKEN` | Definidas por Fernando (opcional) | Não |
| `NEWS_NLP_URL` / `NEWS_NLP_TOKEN` | Interno do Compose; habilita retrain | Não |
| Providers opcionais (Tiingo, Finnhub, …) | Chaves próprias se desejado | Não |

> **Portas internas (confirmadas nos `Dockerfile`s):** `model-engine` → **8010**; `news-nlp` → **8000** (respeita `$PORT`). O `news-nlp` carrega modelos `torch`/`transformers` com cache em `/models` (`HF_HOME`) — montar um **volume persistente** para `/models` (e, opcionalmente, pré-baixar os pesos via o `WARMUP` já previsto no Dockerfile) evita re-download a cada restart e melhora o cold start no Windows.

**Critério de pronto (aceite do SP1):** ver Seção 10.

---

## 8. Estratégia de execução & paralelização (workflows dinâmicos)

**Princípio:** orquestração multi-agente rende proporcionalmente à *independência* do trabalho. Aplicar onde há fan-out real; evitar onde o trabalho é integrado/sequencial. Workflows pertencem à fase de **implementação** (com opt-in explícito), não ao design.

| Sub-projeto | Aplicabilidade | Padrão recomendado |
|---|---|---|
| SP0 | Média | **Parallel readers** — um agente por subsistema (auth, fetchers, sim engine, frontend, serviços Python) lendo e produzindo o mapa real → síntese no `Projeto.md`/`CLAUDE.md`. |
| SP1 | Baixa | Infra integrada e sequencial (compose depende do Dockerfile, etc.). Manter inline; no máximo paralelizar redação de Dockerfiles independentes. |
| **SP2** | **Alta — caso canônico** | Pipeline de **migração** (ver abaixo). |
| SP3/SP4 | Média-alta | Fan-out por asset/sleeve (SP3) ou por área de UI/config (SP4), com verificação por item. |

### SP2 em destaque — o padrão de migração multi-tenant
1. **Sweep multi-modal (loop-until-dry):** N agentes varrendo o código de ângulos diferentes (por tabela, por rota de API, por hook de estado/`localStorage`) para encontrar *todos* os pontos que assumem single-tenant. Repetir até K rodadas sem achados novos. Pontos âncora conhecidos no Apêndice A.
2. **Pipeline de migração:** cada ponto vira uma transformação independente (`WHERE id='primary'`/`'paper-book'` → `WHERE user_id=$1`; endpoints recebem o `user_id` da sessão), processada em paralelo.
3. **Verificação adversarial de isolamento:** para cada endpoint migrado, um agente *cético* tenta provar vazamento de tenant (acessar dado de outro `user_id`). Num modelo row-level, um único filtro esquecido vaza dados — essa camada é o que torna o isolamento *verificado*, não presumido.
4. **Tática de blindagem:** centralizar acesso a dados numa camada/função única que **exige** `user_id` como parâmetro, em vez de SQL solto espalhado (reduz a superfície de "endpoint que esqueceu o filtro").

---

## 9. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Uptime de um PC doméstico (quedas de luz/internet, reboot do Windows) | `restart: unless-stopped` + Docker no boot + Tailscale como serviço; aceitar que 100% é aspiracional para círculo fechado |
| Perda de dados no Neon | Backup automático do Neon no 1º corte; `pg_dump` agendado quando migrar para local (D8) |
| Vazamento de tenant no SP2 | Camada única de acesso com `user_id` + verificação adversarial (Seção 8) |
| Edge Runtime preso ao driver Neon | Resolver no SP2 via token assinado (D7) |
| Quebra do invariante de não-lookahead | Revisão dedicada a cada mudança que toque o simulador (R5) |
| Divergência do upstream dificultar merges futuros | Aceito conscientemente (D1); upstream mantido só para cherry-picks pontuais |

---

## 10. Critérios de aceite — Ciclo 1

**SP0:**
- [ ] Repo próprio privado no ar, histórico de João preservado, `upstream` configurado.
- [ ] Estrutura `documents/` + `.planning/` + configs multi-IA presentes.
- [ ] `CLAUDE.md`/`AGENTS.md` refletem o estado real; `Projeto.md` e `Roadmap.md` criados.

**SP1:**
- [ ] `docker-compose up` sobe `web` + `model-engine` + `news-nlp` + `scheduler` no Windows.
- [ ] Terminal acessível por `https://…ts.net` de qualquer navegador, sem instalação no cliente.
- [ ] `/api/sim` reporta `"persistence": "postgres"` (Neon próprio).
- [ ] Após 2+ minutos sem navegador aberto: `asOf` do book avança e o equity intraday ganha marcas (tick interno funcionando).
- [ ] Serviços reiniciam sozinhos após `docker restart` e após reboot do Windows.
- [ ] Cloudflare Worker não é mais necessário para o tick.

---

## 11. Decisões adiadas / questões em aberto

- **Histórico do paper book:** decidido "depois" — subimos limpo no 1º corte; avaliar importar via `pg_dump` (só tabela `sim_state`) no SP2.
- **Domínio próprio + Cloudflare Tunnel:** upgrade futuro sobre o Tailscale Funnel; registrado como item de roadmap.
- **Nome do projeto no repo próprio:** manter "Market-Terminal" ou renomear — decidir no início do SP0.

---

## Apêndice A — Pontos single-tenant conhecidos (mapa inicial para o SP2)

| Local | Âncora single-tenant | Ação no SP2 |
|---|---|---|
| `src/lib/auth.ts` | `CREDENTIAL_ID = 'primary'` (uma credencial global) | Tabela de múltiplos usuários; sessão carrega identidade |
| `src/lib/sim/stateStore.ts` | `STATE_ID = 'paper-book'` (um book global) | Book por `user_id` |
| `src/middleware.ts` | Sessão valida "logado/não", sem identidade de tenant; `SELECT` no Edge | Token assinado com `user_id` (D7) |
| `src/hooks/useWatchlist.ts`, `useAlerts.ts`, `useTerminalPreferences.ts`, `useTerminalWorkspace.ts` | Estado em `localStorage` (per-browser) | Migrar para servidor por usuário (SP4) |
| Serviços Python (`model-engine`) | Sinais globais | Parametrização por perfil de usuário (SP3) |

> Este apêndice é um ponto de partida, **não** uma lista exaustiva — o sweep multi-modal do SP2 (Seção 8) deve encontrar o restante.
