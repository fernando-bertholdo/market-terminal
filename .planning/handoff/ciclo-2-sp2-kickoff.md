Vamos iniciar o **Ciclo 2 — SP2 · Multi-tenancy core** do Market Terminal. O Ciclo 1 (fundação self-hosted) está concluído e mergeado na `main` (`057240c`): o app roda self-hosted no Windows e o próximo passo é transformar o produto single-tenant em multi-tenant de verdade — cada usuário com seu próprio book/robô, dados isolados por `user_id`, e um ranking justo entre os usuários do círculo fechado.

**Referências principais:**
- @documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md — spec de design. Ler **D6** (isolamento row-level), **D7** (sessão por token assinado), a Seção **"SP2 em destaque — o padrão de migração multi-tenant"** e o **Apêndice A** (mapa inicial dos pontos single-tenant).
- @documents/core/Roadmap.md — SP2 = Ciclo 2, atravessa Fase 2 (MVP multi-tenant) e Fase 3 (hardening: D7, D8 Postgres local, backups, isolamento adversarial).
- @.planning/ciclo-1-fundacao/CONTEXT.md — diário do Ciclo 1 (entregas, decisões, pendências, gotchas operacionais).
- @src/lib/auth.ts — auth **já** multi-credencial (login por username, `loadCredentialByUsername`, `createSession(credentialId)`, `provisionCredential`). Falta ligar sessão→`user_id` e migrar para token assinado (D7).
- @src/lib/sim/stateStore.ts — persistência do book, hoje keyed por `STATE_ID='paper-book'` (global) → precisa virar keyed por `user_id`.
- @src/app/api/sim/route.ts — endpoint do simulador; precisa receber o `user_id` da sessão.
- @src/lib/sim/engine.ts — motor do paper book (fills, custos, persistência).
- @src/middleware.ts — gate de sessão no Edge (hoje um `SELECT` no Postgres; alvo do D7).
- @CLAUDE.md e @.claude/CLAUDE.md — regras operacionais (commits, planning, skills, agent teams).

**Objetivo:** Entregar o núcleo multi-tenant — introduzir `user_id` em toda a camada de dados (o `sim_state` e futuras settings ganham `user_id`; `auth_credentials` já tem id/username), isolar os books por usuário (row-level, banco compartilhado — D6), migrar a validação de sessão para **token assinado** verificável no Edge sem tocar o banco (D7), e construir um **ranking/leaderboard justo** entre os usuários. Sub-objetivos de fases seguintes (SP3/4/5, ciclos posteriores): robô/estratégia por usuário, workspace/UI customizável, settings salvos por usuário.

---

### Estado atual (fim do Ciclo 1)

- **Deploy:** self-hosted no Windows (WSL2 + Docker Engine; Tailscale **Funnel no host Windows** → `localhost:3000` → container `web`). URL: `https://market-terminal.tailb4f665.ts.net`. Os 4 serviços (web, model-engine, news-nlp, scheduler) sobem sozinhos após reboot (validado no PR-3); keep-alive `WSL-KeepAlive-MT` mantém a distro WSL2 quente. Boot headless em `onlogon` (auto-login adiado — o usuário resolve depois).
- **Auth:** multi-credencial já feita. Dois logins: `fernando` (id `primary`) e `joao` — **mas ambos compartilham o mesmo book global**. A sessão hoje é um `SELECT` no Postgres dentro do `middleware.ts` (Edge Runtime, driver Neon).
- **Persistência:** Neon Postgres (`auth_credentials`, `auth_sessions`, `sim_state`). `sim_state` é **UMA linha JSONB** (`STATE_ID='paper-book'`) — o ponto central a migrar.
- **Book:** fresco (decidido não importar o do João); o dele pode ser arquivado via `pg_dump` (só tabela `sim_state`) se quiser um benchmark — nunca fundir no book vivo.

---

### TAREFA A — Planejar o Ciclo 2 (antes de qualquer código)

O Ciclo 1 confirmou: a migração multi-tenant é o **caso canônico** de sweep→migrate→verify do método. Não mexer no código sem o planning montado.

**Ação:**
1. `init-milestone` (ou `init-detour`) para criar `.planning/ciclo-2-*/` (CONTEXT.md, handoff/, verification/, plans/).
2. `validate-dor` — o DoR aqui inclui ler o spec (D6/D7/Seção SP2/Apêndice A) e confirmar/expandir o mapa de pontos single-tenant.
3. `enhanced-planning` para o design do SP2: contrato de isolamento, camada única de acesso a dados, esquema do token assinado (D7), esquema de ranking e de settings por usuário.

### TAREFA B — O padrão de migração (do spec, Seção "SP2 em destaque")

1. **Sweep:** varrer todos os pontos single-tenant (`WHERE id='primary'`, `STATE_ID='paper-book'`, etc.). O Apêndice A tem o mapa inicial — validar/expandir com `grep`.
2. **Camada única de acesso a dados que EXIGE `user_id`** como parâmetro (blindagem — reduz a superfície de "endpoint que esqueceu o filtro"). Migrar `stateStore.ts`/`engine.ts` para passar por essa camada.
3. **Pipeline de migração:** cada ponto vira uma transformação independente (`STATE_ID` global → `user_id` da sessão; endpoints recebem o `user_id`), paralelizável (candidato a agent teams / dynamic workflow).
4. **Verificação adversarial de isolamento:** para cada endpoint migrado, um agente **cético** tenta provar vazamento — acessar dado de outro `user_id`. Num modelo row-level, um único filtro esquecido vaza tudo; essa camada é o que torna o isolamento **verificado**, não presumido.

### TAREFA C — D7 (token assinado) + ranking + provisionamento

- **D7:** trocar o `SELECT` de sessão no Edge (`middleware.ts`) por **token assinado** (HMAC/JWT) verificável sem tocar o banco — desbloqueia o D8 (Postgres local) "de graça".
- **Ranking:** view/API que compara equity/retorno por `user_id`, com **baseline justo** (mesmo capital inicial e data de início) para não premiar quem começou antes.
- **Provisionamento:** hoje `provisionCredential` é manual (rodado via `node` no Mac contra o Neon, porque o standalone empacota o `@neondatabase/serverless`). Avaliar um fluxo melhor (endpoint admin gated? script versionado?).

---

**Por favor:**
1. Rodar `init-milestone`/`init-detour` para o Ciclo 2 + `validate-dor`; **não** começar código sem o planning (Tarefa A).
2. Ler o spec (D6/D7/Seção SP2/Apêndice A) e produzir, via `enhanced-planning`, o **contrato de isolamento** e a **camada de acesso com `user_id` obrigatório** (Tarefa B).
3. Implementar a migração do `sim_state` (global → por `user_id`) com **verificação adversarial de isolamento** por endpoint (Tarefa B) — considerar agent teams pela paralelizabilidade.
4. Endereçar D7 (token assinado no Edge) e o **ranking justo** + provisionamento (Tarefa C) — podem ser sub-fases separadas com specs próprios (o spec diz que cada sub-projeto a partir do SP2 tem seu ciclo spec→plano→impl).
5. **Deploy + verificação visual:** rebuild do `web` no Windows (`SSH → wsl -d Ubuntu -u root -- "cd /mnt/g/tech_projects/market-terminal && docker compose build web && docker compose up -d web"`); **verificar visualmente sempre** (Chrome DevTools MCP na URL pública) — logar como **dois usuários diferentes** e provar que cada um vê **só o seu book**. Commits atômicos pt-BR **sem atribuição de IA**. Atualizar CONTEXT.md/Roadmap/TODO (`update-docs`), `validate-dod` ao fechar.

**Operacional / gotchas herdados (economizam horas):**
- **Controle remoto:** SSH Mac→Windows via Tailscale (`anderr@100.83.237.24`, chave `~/.ssh/market_terminal_win`); helper `/tmp/win.sh` = `ssh ... "$@"`; comandos no WSL via `wsl -d Ubuntu -u root -- ...`.
- **Credenciais headless:** o **GCM do Windows e o git do WSL não autenticam em SSH headless** (mesma classe do docker-credential). Para push/fetch use o **git nativo do Windows** (`D:\Program Files\Git\cmd\git.exe`) com token (`gh auth token` no Mac, embutido na URL de fetch, sem persistir) — ou faça no console. Repos Mac/Windows já rastreiam `origin/main`.
- **Standalone empacota deps:** scripts avulsos dentro do container **não** resolvem `@neondatabase/serverless`; rode contra o Neon a partir do **Mac** (tem `node_modules`) — foi assim que o `joao` foi provisionado.
- **Fallback TS mascara o Python:** o Next cai em fetchers TypeScript quando o `model-engine` está fora — a UI fica verde mesmo assim. Sempre cheque `docker compose ps` + `/health` do model-engine, não só o dashboard.
- **Rede WSL2:** o Funnel fica no **host Windows** (não no WSL2) porque o NAT do WSL2 quebra o caminho direto Tailscale (ping passa, TLS não). Não recriar o Funnel dentro do WSL2.

**Skills sugeridas:** `init-milestone`, `validate-dor`, `enhanced-planning`, `validate-dod`, `pre-commit-check`, `organize-commits`, `update-docs`, `fresh-context`, `agent-team` (migração paralelizável).
