# Ciclo 1 — Fundação Self-Hosted · CONTEXT

Plano: `documents/superpowers/plans/2026-06-28-ciclo1-selfhost-foundation.md`
Spec:  `documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md`
Branch: `ciclo-1-fundacao`

## Diário de Rodadas

### 2026-06-28 — PR-0 · Fundação & documentação (concluído)

**Entregue:**
- Repositório próprio criado (`fernando-bertholdo/market-terminal`, privado); `origin`=Fernando, `upstream`=joaoouro; histórico de João preservado; branch de trabalho `ciclo-1-fundacao`.
- Metodologia portada via `sync-downstream` (escopo: framework completo): `.claude/` + `.agents/` (skills exceto `ui-*`, rules, workflows, prompts, hooks, stack Python), `.planning/` esqueleto. Placeholders de config traduzidos para o domínio.
- Documentação do estado real: `documents/core/Projeto.md`/`Roadmap.md`/`TODO.md` + `documents/strategy/*` (escritos por subagentes, zero placeholders); `CLAUDE.md`/`AGENTS.md` da raiz alinhados ao estado real (Neon, auth de sessão, serviços Python, 27 ativos, Cloudflare Worker).
- `.gitignore` ajustado para versionar a metodologia (exceto `.claude/plans`, `settings.json`, `settings.local.json`).

**Commits:** `55bdaf4`, `9ec76c2`, `dae6b6d`, `4a70d28` (metodologia + docs) + commit das docs do código (CLAUDE/AGENTS).

**Decisões emergentes:**
- Política de commit confirmada: **sem co-autoria de IA** (metodologia do usuário prevalece sobre o default do harness).
- `.claude/settings.json` ficou **gitignored e pendente de revisão** do usuário (tinha `model: sonnet` + placeholders; edição bloqueada pelo sistema como self-modification).
- 4 skills duplicadas (projeto + global): `enhanced-planning`, `generate-session-prompt`, `mirror-upstream`, `sync-downstream` — efeito do escopo "auto-contido"; manter ou remover a critério do usuário.
- Correção factual: universo do simulador = **27 ativos** (o CLAUDE.md dizia 11).

**Revisão independente:** dispensada para o PR-0 (documentação, sem código a revisar).

**Próximo passo:** PR-1 · Containerização (next.config standalone, Dockerfile do web, docker-compose). Requer `npm install` (node_modules ausente neste clone). Build/deploy ocorre no Windows.

### 2026-06-28 — PR-1 · Containerização + PR-2 · Scheduler (parte de código)

**Entregue (código, validado localmente no Mac):**
- `next.config.js`: `output: 'standalone'` + `outputFileTracingRoot: __dirname` (corrige o aninhamento do `server.js` quando o projeto está sob `~/Documents`).
- `Dockerfile` multi-stage (Next standalone) + `.dockerignore`.
- `docker-compose.yml`: serviços `web` (3000), `model-engine` (8010), `news-nlp` (8000, volume `news-models`) e `scheduler` (tick interno); `restart: unless-stopped`.
- `scripts/scheduler.mjs`: replica o Cloudflare Worker (GET `/api/market` + POST `/api/sim {tick}` com `Bearer CRON_SECRET`; retrain diário opcional).

**Validação local:** `npm run type-check` ✓, `npm run build` ✓ (`server.js` na raiz do standalone), `npm run lint` ✓, `node --check scheduler.mjs` ✓. Docker ausente no Mac — `docker compose` e smokes validados na fase Windows.

**Pendente (fase Windows):** provisionar Neon próprio + `.env`, `docker compose up`, smoke do contrato (G-CONTRACT), `"persistence":"postgres"`, tick avançando o book sem browser. Depois PR-3 (Tailscale Funnel + uptime + cutover).

### 2026-07-19 — Fase Windows: canal SSH estabelecido, ambiente diagnosticado

**Canal de controle:** SSH Mac→Windows via Tailscale funcionando (chave dedicada `~/.ssh/market_terminal_win` no Mac). Windows: host `desktop-0mv2ie1` (Tailscale `100.83.237.24`), usuário `anderr` (perfil em `C:\Users\feber`). OpenSSH Server rodando/automático; firewall liberado para a 22 em qualquer perfil.

**Ambiente Windows diagnosticado:**
- Windows 10 22H2 (build 19045).
- Instalados: Tailscale (drive `G:`), OpenSSH Server, GitHub Desktop (git embutido em `...\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe`).
- Ausentes: Docker, WSL, winget, git standalone.
- Virtualização: habilitada no firmware (`VirtualizationFirmwareEnabled=True`, `HypervisorPresent=False`) → WSL2/Docker viáveis, sem bloqueador de BIOS.

**Decisão pendente (usuário):** runtime de containers — WSL2 + Docker Engine (recomendado, headless via SSH) vs Docker Desktop (GUI-bound). Ambos exigem ~1 reboot. Nada instalado ainda (aguardando confirmação para não disparar reboot sem o usuário).

### 2026-07-19 — Fase Windows: stack no ar, verificação visual e caveat de acesso

**Runtime provisionado:** WSL2 (Ubuntu, disco D) + **Docker Engine nativo** (não Docker Desktop — evita o `docker-credential-desktop` que falha em SSH headless: "A specified logon session does not exist"). Docker e imagens no disco D conforme pedido.

**Stack no ar:** `docker compose up -d --build` com os 4 serviços (web 3000, model-engine 8010, news-nlp 8000, scheduler). `.env` próprio no Windows (`G:/tech_projects/market-terminal/.env`) com Neon próprio.

**Smokes (G-CONTRACT):** `/api/market` retorna campos reais via BFF→model-engine; `/api/sim` reporta `"persistence":"postgres"`; scheduler avança o book sem browser. O web bindava no id do container (env `HOSTNAME`) e recusava conexões externas — fixado com `HOSTNAME=0.0.0.0` (commit `ee69fe1`).

**Acesso público:** Tailscale + Funnel rodando **dentro do WSL2** (não no host). Exigiu habilitar HTTPS certs e autorizar o node no Funnel. URL pública `https://market-terminal.tailb4f665.ts.net` responde **HTTP 200 para qualquer um sem Tailscale** (verificado forçando o IP do ingress `199.38.181.54`).

**Uptime:** o WSL2 congela a distro ociosa (o Funnel cai). Resolvido com **keep-alive ativo** (curl a cada 5s no localhost:3000) via Task Scheduler (`WSL-KeepAlive-MT`, `/sc onlogon`) — o keep-alive passivo (`tail -f /dev/null`) não impedia o freeze.

**Verificação visual (Chrome DevTools MCP):** login (`fernando`) → dashboard Overview renderizando dados ao vivo (USD/BRL 5.1108, SELIC 14.15%, curva DI Jan/27–Jan/30, movers, 8 manchetes reais classificadas, 4 data sources verdes). Feita via túnel SSH `-L 8899:localhost:3000` (o caminho direto Tailscale não serve o navegador). Registrado como instrução permanente (memória `always-visual-verification`). Quirks pré-existentes do app (não do deploy): card US 10Y sem valor; DI Jul/26 `—` (domingo/contrato expirado).

**Caveat aberto (decisão do usuário):** o caminho **direto via Tailscale MagicDNS** (o que dispositivos do usuário COM Tailscale usam) dá timeout — sintoma de rede WSL2-NAT (ping/UDP passa, handshake TLS não). O Funnel público funciona por trafegar pelo túnel ingress↔node. Fix robusto candidato: servir o Funnel do **host Windows** (Tailscale nativo, sem NAT do WSL2), que exigiria renomear o node para manter a URL. Pendente de decisão.

**Próximo passo:** decidir o fix do acesso direto; depois reescrever `DEPLOY.md` com o setup real (WSL2 Docker Engine, disco D, keep-alive, Tailscale no WSL2) e o teste de reboot (PR-3).

### 2026-07-19 — Funnel migrado para o host Windows (acesso direto corrigido)

**Problema:** o Funnel no node WSL2 servia o público (via ingress) mas o caminho **direto via Tailscale MagicDNS** — usado pelos dispositivos do usuário COM Tailscale — dava timeout (rede WSL2-NAT: ping/UDP passa, handshake TLS não). Do Mac do usuário, "nada carregava".

**Fix (aprovado):** mover só a camada de rede para o Tailscale **nativo do Windows**, mantendo os containers no WSL2 (Docker Linux exige kernel Linux; autonomia remota preservada via SSH→Windows→`wsl`):
- Funnel ativado no node Windows → `localhost:3000` (que o WSL2 encaminha ao container).
- WSL2: funnel desligado, node renomeado `market-terminal` → `market-terminal-wsl` para liberar o nome.
- Windows: node renomeado `desktop-0mv2ie1-1` → `market-terminal`; cert provisionado; funnel limpo só nesse nome.

**Resultado:** `https://market-terminal.tailb4f665.ts.net` responde HTTP 200 **direto (MagicDNS, ~25-50ms) e público (ingress, ~1s)**. Verificação visual do Mac pela URL real: login → dashboard com dados ao vivo. Único acerto pontual: flush de DNS no Mac do usuário (cache do IP antigo do WSL2; `sudo dscacheutil -flushcache`), one-time e só no dispositivo que acessou o nome antigo antes do rename.

**Arquitetura final de rede:** Windows Tailscale (Funnel, sempre on) → `localhost:3000` → WSL2 Docker (mantido quente pelo keep-alive `WSL-KeepAlive-MT`). O keep-alive continua necessário — aquece a distro/container, não a rede.

**Pendente:** reescrever `DEPLOY.md` com esse desenho final; teste de reboot (PR-3).

### 2026-07-19 — Saúde do stack, book fresco e login do João (multi-credencial)

**Bug do model-engine corrigido:** o container estava em loop de restart — o `Dockerfile` não copiava `earnings.py` (que `app.py` importa), quebrando em `ModuleNotFoundError`. O app seguia via fallback TypeScript, mascarando a falha (dashboard verde não prova o Python servindo). Adicionado ao COPY (commit `a7ee37e`); rebuild → `model-engine Up`, contrato BFF→Python confirmado (`{"status":"ok","backend":"python","capabilities":[...]}`).

**Decisão do usuário (quant data):** seguir com book **fresco** (sem importar o do João). Inspeção do Neon confirmou que o único "quant data" persistido é o paper book (`sim_state`: 3 posições, cash/equity ~1M, tape `intradayEquity`); o modelo é **código** (27 decisões computadas live), sem dataset/treino. Isolamento de dados por usuário fica para o SP2.

**Login do João (multi-credencial):** o auth resolvia sempre a credencial fixa `primary` (single-login). Refatorado (`src/lib/auth.ts`, commit `d755282`): login **por username** (`loadCredentialByUsername`), `createSession(credentialId)`, `changeCredentials` no usuário logado, e `provisionCredential`. Schema já suportava N credenciais (username UNIQUE). Provisionada a credencial `joao` direto no Neon a partir do Mac (o `@neondatabase/serverless` é bundlado no standalone, não resolvível em `/app`). Book **compartilhado** (mesma interface/dados). Verificado: `joao` 200, `fernando` 200, senha errada 401; visualmente `joao` no dashboard com o username correto no Account. Isolamento por usuário = SP2.

**DEPLOY.md** reescrito para o desenho final (commit `3772024`).

**Dívida técnica:** os repos divergiram — Mac (fonte, com os commits) vs Windows (deploy, working-tree editado via `scp` + rebuild). Reconciliar depois (fazer o Windows rastrear `origin`).

**Pendente:** teste de reboot (PR-3, precisa do usuário à frente do PC) + decisão de boot headless (onlogon vs onstart/auto-login — tradeoff de segurança).

### 2026-07-19 — PR-3: teste de reboot PASSOU (auto-heal com login)

Reboot real do Windows validado. Recuperação automática confirmada:
- OpenSSH + Tailscale (serviços) subiram no boot, **antes** do login; node Windows reconectou sozinho.
- WSL Ubuntu subiu no login do usuário (tarefa `onlogon`); `systemd` + `docker.service` enabled + `restart:unless-stopped` trouxeram os 4 containers ("Up About a minute") sem intervenção.
- `model-engine` voltou saudável (fix do `earnings.py` na imagem, sem loop).
- Funnel do Windows persistiu (reload automático) → URL pública **HTTP 200 em 57ms**.
- `persistence:postgres` (book intacto no Neon); **a sessão do usuário sobreviveu** (Neon); dashboard renderiza com dados ao vivo. Boot levou ~6min (mais lento que o normal).

**Nível validado:** auto-heal **COM login**. Headless (sem login) ainda depende de decisão de segurança: o WSL é registrado **por-usuário**, então uma tarefa `onstart` como SYSTEM não enxerga a distro `Ubuntu` — a tarefa de boot precisaria rodar como o usuário (senha guardada) ou usar auto-login.

**Ciclo 1 — estado:** stack self-hosted no ar, URL pública estável (`market-terminal.tailb4f665.ts.net`), acesso direto+público OK, `model-engine` saudável, login multi-credencial (`fernando`+`joao`), reboot self-heal validado.

> **Nota posterior (26/07/2026):** o nó foi renomeado para `homelab` e a URL vigente passou a ser `https://homelab.tailb4f665.ts.net`. O registro acima é histórico do Ciclo 1 e foi preservado como tal. Ver `.planning/patches/rename-node-homelab/plan.md`.

**Decisão de boot headless:** ficou em `onlogon` (opção C — self-heal quando o usuário loga). Auto-login via Sysinternals Autologon foi tentado mas travou: conta local `anderr`, senha antiga (08/07/2022) que o usuário não usa (loga por PIN); trocar a senha resetaria o PIN, então adiado. `Autologon64.exe` deixado em `C:\Users\feber` para uso futuro. Auto-login / "servidor Always On" fica a cargo do usuário depois.

**Pendências (arrumação/futuro):** reconciliar repos Mac↔Windows (o deploy recebeu fixes via `scp`, o Windows precisa passar a rastrear `origin`); merge de `ciclo-1-fundacao` → `main`; SP2 (design multi-tenant + ranking).
