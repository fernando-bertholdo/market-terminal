# Constraints & No-Goals

## Metadata

- **Versão:** 1.0.0
- **Status:** Ativo
- **Última atualização:** 2026-06-28
- **Responsável:** Fernando Bertholdo
- **Gerado por:** preenchimento manual a partir do design do Ciclo 1 (`documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md`)

---

## No-Goals (O Que NÃO Será Construído)

| # | No-Goal | Justificativa |
|---|---------|---------------|
| 1 | **Produto público aberto / SaaS comercial** | A ambição é um **círculo fechado** (~10 pessoas de confiança, por convite/admin). Abrir ao público forçaria billing, suporte e compliance que não fazem parte do projeto. |
| 2 | **Execução de ordens reais** | O produto é **paper-trading only** — invariante inviolável. Nunca envia ordens a corretora; elimina risco regulatório e financeiro e dispensa licença/integração de execução. |
| 3 | **Signup público, verificação de e-mail e recuperação de senha** | Usuários são provisionados por admin/convite. Para ~10 pessoas conhecidas, fluxos self-service de cadastro são superfície de ataque e manutenção desnecessárias. |
| 4 | **Billing / cobrança / planos** | Custo-alvo do projeto é ~zero e não há transação financeira entre membros; cobrança não agrega valor ao círculo fechado. |
| 5 | **Compliance LGPD pesado / DPO / fluxos de consentimento** | Não há dados de terceiros nem público externo; o círculo é de confiança. Segurança é pragmática (isolamento `user_id`, secrets em env), sem aparato jurídico de produto público. |
| 6 | **Postgres local no 1º corte (eliminar o Neon)** | O código usa `@neondatabase/serverless` no Edge Runtime (`middleware.ts`). Trocar agora exigiria refactor de driver. Mantém-se o Neon (projeto próprio de Fernando); a migração local fica destravada pelo token assinado do SP2 (D7/D8). |
| 7 | **Backtest histórico como produto** | `/api/sim` e a página Quant expõem **só o modelo live**. Históricos permanecem como *inputs* (momentum, vol, covariância, hedge ratios), nunca como um backtest apresentado ao usuário. |
| 8 | **Domínio próprio / branding de URL no 1º corte** | A URL `*.ts.net` do Tailscale Funnel é suficiente para o círculo fechado. Domínio próprio + Cloudflare Tunnel é upgrade futuro trivial que não toca a aplicação. |

---

## Constraints Técnicas

| Constraint | Impacto no Design | Mitigação |
|------------|-------------------|-----------|
| Host único: desktop Windows doméstico com Docker Desktop | Uptime limitado por energia/internet/reboot; sem redundância | `restart: unless-stopped`, Docker Desktop "start on boot", Tailscale como serviço; aceitar que 100% é aspiracional |
| Edge Runtime preso ao driver Neon (`@neondatabase/serverless` no `middleware.ts`) | Não dá para migrar a Postgres local sem refactor; o middleware faz `SELECT` de sessão no Edge | Manter Neon no 1º corte; resolver no SP2 com **token de sessão assinado** (D7) que desacopla o middleware do banco |
| Fontes de dados gratuitas/não-oficiais (Yahoo v8, RSS) sujeitas a rate-limit/quebra | Indisponibilidade intermitente de quotes/históricos/notícias | Fetchers retornam `null` e logam (nunca lançam); `ApiResponse` sempre HTTP 200 com `SourceStatus`; micro-cache, single-flight, stale-if-error; UI renderiza `---` |
| `news-nlp` carrega pesos `torch`/`transformers` (cache em `/models`, `HF_HOME`) | Cold start lento e risco de re-download a cada restart no Windows | Volume persistente para `/models` + `WARMUP` pré-baixando pesos; modo fast NLP como fallback |
| Símbolos de DI futures da B3 expiram (contract codes) | Dados de DI quebram silenciosamente (`NOK`) quando o contrato vence | Atualizar símbolos em `constants.ts` e `api/market/route.ts`; tratar `NOK` como ausência de dado (fora de pregão), não erro |
| Invariante de não-lookahead no simulador | Qualquer mudança no engine pode introduzir viés de lookahead | Revisão dedicada a cada PR que toque o simulador; `closesWithLive` nunca duplica a barra do dia |
| Repo de origem é privado e de terceiro (João) | Fork formal ficaria refém do acesso de Fernando ao upstream | **Duplicação** com histórico completo + `upstream` como remote (D1); sync manual via git |

## Constraints de Negócio

| Constraint | Tipo | Impacto |
|------------|------|---------|
| Custo-alvo ~zero (Neon Free + Tailscale Free + FRED grátis) | Orçamento | Limita infraestrutura paga e escala; reforça self-hosting doméstico e fontes gratuitas |
| Preservar a autoria de João (commits originais intactos) | Ético / Relacional | Repo próprio com histórico preservado; aviso de transparência a João sobre o espelhamento (R4 do design) |
| Paper-trading only | Regulatório / Produto | Nunca toca ordens reais; sem necessidade de corretora, licença ou KYC |
| Escala de círculo fechado (~10, por convite) | Organizacional | Justifica isolamento row-level e segurança pragmática; dispensa signup/billing/LGPD pesado |

## Constraints de Recursos

| Recurso | Limitação | Consequência |
|---------|-----------|--------------|
| Equipe | Fernando solo (com Claude Code) | Bandwidth limitado → metodologia em fases (0–4) + orquestração multi-agente só onde há fan-out real (ex.: sweep de migração do SP2) |
| Infraestrutura | Um único host doméstico, sem cluster/redundância | SLA de círculo fechado; sem alta disponibilidade — quedas curtas são toleradas |
| Dependências de free-tier externas | Neon Free e Tailscale Free sujeitos a mudança de política | Fallbacks documentados: Postgres local (D8) e Cloudflare Tunnel + domínio próprio (futuro) |
| Chave FRED | Requer `FRED_API_KEY` (grátis, mas obrigatória) | Sem a chave, dados de US macro/yields degradam para `null` |

---

## Corte MVP vs Ideal

"MVP" aqui = **Ciclo 1 (SP0 + SP1)**. As demais capacidades são planejadas para ciclos posteriores.

| Feature/Capacidade | MVP? | Fase Planejada | Justificativa |
|--------------------|------|----------------|---------------|
| Repo próprio + metodologia portada + docs do estado real | Sim | Ciclo 1 (SP0) | Documentar o real é pré-requisito de qualquer mudança estrutural |
| Stack em Docker Compose no Windows (web + model-engine + news-nlp + scheduler) | Sim | Ciclo 1 (SP1) | Entrega o uptime desejado com setup reproduzível |
| Neon próprio (cloud) no 1º corte | Sim | Ciclo 1 (SP1) | Zero refactor de driver; resolve a dor (Vercel) sem mexer no banco |
| Tailscale Funnel (URL `*.ts.net`) | Sim | Ciclo 1 (SP1) | URL pública estável sem abrir portas, sem IP fixo, custo zero |
| Tick interno (container `scheduler`) | Sim | Ciclo 1 (SP1) | Substitui o Cloudflare Worker; `CRON_SECRET` permanece |
| Multi-tenancy real (`user_id` em tudo) | Não | Ciclo 2 (SP2) | Base instável primeiro; introduzir tenancy sobre infra não validada multiplica risco |
| Token de sessão assinado (desacopla Edge do Neon) | Não | Ciclo 2 (SP2 / D7) | Pré-requisito para Postgres local; feito junto da reescrita de auth |
| Robô/estratégia por usuário | Não | Ciclo 3 (SP3) | Depende da fundação multi-tenant do SP2 |
| Workspace/UI por usuário (`localStorage` → servidor) | Não | Ciclo 3 (SP4) | Depende de `user_id`; hoje é estado per-browser |
| Postgres local (self-hosted 100%) | Não | Futuro (D8) | Destravado pelo token assinado (D7); backup vira `pg_dump` agendado |
| Domínio próprio + Cloudflare Tunnel | Não | Futuro | Upgrade sobre o Tailscale Funnel; não toca a aplicação |

---

## Cross-references

- [Vision & Strategy](vision-strategy.md) — por que existimos (informa o que cortar)
- [Success Metrics](success-metrics.md) — métricas validam se os cortes foram corretos
- [Risk & Assumptions](risk-assumptions.md) — constraints não mitigadas viram riscos

## → Projeto.md

Esta seção reflete em: [Projeto.md — Escopo](../core/Projeto.md)

---

**Última atualização:** 2026-06-28
