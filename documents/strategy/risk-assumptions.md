# Risk & Assumptions Register

## Metadata

- **Versão:** 1.0.0
- **Status:** Ativo (Living Document)
- **Última atualização:** 2026-06-28
- **Responsável:** Fernando Bertholdo
- **Gerado por:** preenchimento manual a partir do design do Ciclo 1 (`documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md`)

> **Living Document:** Este registro deve ser atualizado ao longo do projeto. Premissas invalidadas viram riscos. Riscos mitigados são marcados como resolvidos.

---

## Premissas (Assumptions)

| # | Premissa | Criticidade | Como Validar | Status |
|---|----------|-------------|--------------|--------|
| A1 | O desktop Windows fica ligado e ocioso com uptime próximo de 100% | Alta | Monitorar disponibilidade da URL `*.ts.net` por alguns dias; checar que sobrevive a um ciclo de uso normal | [A VALIDAR] |
| A2 | Docker Desktop inicia no boot do Windows e religa os containers (`restart: unless-stopped`) | Alta | Reboot proposital → verificar `web`, `model-engine`, `news-nlp` e `scheduler` de pé sem intervenção | [A VALIDAR] |
| A3 | Tailscale Funnel entrega URL pública estável sem abrir portas no roteador nem IP fixo | Alta | Acessar `https://…ts.net` de rede externa/4G, sem VPN cliente, em navegador qualquer | [A VALIDAR] |
| A4 | Neon Free comporta o uso do círculo fechado (~10) sem estourar limites | Média | Acompanhar métricas de storage/compute no painel do Neon ao longo do uso | [A VALIDAR] |
| A5 | Fontes gratuitas (Yahoo, BCB, FRED, B3, RSS) seguem acessíveis server-side sem auth paga | Média | Monitorar `SourceStatus`/StatusBar e logs de fetch; detectar quedas de uma fonte específica | [A VALIDAR] |
| A6 | Isolamento row-level por `user_id` é suficiente para o modelo de confiança do círculo | Média | Verificação adversarial no SP2 (tentar ler dado de outro `user_id`) | [A VALIDAR] |
| A7 | Token de sessão assinado (D7) substitui o `SELECT` no Edge sem regressão de auth | Média | Prototipar no SP2; comparar fluxo de login/sessão antes e depois | [A VALIDAR] |
| A8 | O invariante de não-lookahead se mantém em todas as mudanças do simulador | Alta | Revisão dedicada a cada PR que toque o engine; conferir que sinais em `t` não veem preços > `t` | [A VALIDAR] |

**Status possíveis:** `[A VALIDAR]` | `[VALIDADA]` | `[INVALIDADA → ver Risco RN]`

---

## Riscos

| # | Risco | Probabilidade | Impacto | Mitigação | Owner |
|---|-------|---------------|---------|-----------|-------|
| R1 | Uptime de PC doméstico: queda de luz/internet, reboot do Windows ou crash do Docker derrubam a stack | Média | Alto | `restart: unless-stopped` + Docker no boot + Tailscale como serviço; aceitar 100% como aspiracional para círculo fechado | Fernando |
| R2 | Vazamento de tenant no SP2 — um filtro `user_id` esquecido expõe dados de outro usuário | Média | Alto | Centralizar acesso numa camada única que **exige** `user_id`; verificação adversarial cética por endpoint migrado | Fernando |
| R3 | Rate-limit ou quebra de fontes não-oficiais (Yahoo/RSS) deixa o tape sem dados | Média | Médio | Fetchers `null`+log; micro-cache, single-flight, stale-if-error, source health; degradação graciosa (`---`) | Fernando |
| R4 | Perda de dados no Neon (sem backup) destrói `auth_*` e `sim_state` | Baixa | Alto | Backup automático do Neon no 1º corte; `pg_dump` agendado quando migrar para local (D8) | Fernando |
| R5 | Vazamento de secrets (`.env` no host, `CRON_SECRET`, `DATABASE_URL`, `FRED_API_KEY`, tokens de backend) | Média | Alto | `.env` gitignored, nunca commitar; secrets só via env vars; rotacionar se exposto | Fernando |
| R6 | Edge Runtime preso ao driver Neon trava a migração para Postgres local | Média | Médio | D7 (token assinado no SP2) desacopla o `middleware.ts` do driver → migração local "de graça" depois | Fernando |
| R7 | Quebra do invariante de não-lookahead introduz viés/lookahead nos sinais | Baixa | Alto | Revisão dedicada a cada mudança no simulador (R5 do design); `closesWithLive` nunca duplica a barra do dia | Fernando |
| R8 | Contratos de DI da B3 expiram e os dados quebram silenciosamente (`NOK`) | Média | Baixo | Atualizar símbolos em `constants.ts`/`api/market/route.ts`; tratar `NOK` como ausência esperada fora de pregão | Fernando |
| R9 | Divergência do upstream (João) dificulta merges futuros | Média | Baixo | Aceito conscientemente (D1); upstream mantido só para cherry-picks pontuais | Fernando |
| R10 | `news-nlp` re-baixa pesos `torch`/`transformers` a cada restart (cold start lento) | Média | Baixo | Volume persistente para `/models` (`HF_HOME`) + `WARMUP` pré-baixando pesos; modo fast NLP de fallback | Fernando |

### Matriz de Risco (Resumo Visual)

```
            │ Baixo Impacto │ Medio Impacto │ Alto Impacto      │
────────────┼───────────────┼───────────────┼───────────────────┤
Alta Prob.  │               │               │                   │
Media Prob. │ R8, R9        │ R3, R6        │ R1, R2, R5        │
Baixa Prob. │ R10           │               │ R4, R7            │
```

---

## Dependências Externas

| Dependência | Tipo | Risco se Indisponível | Fallback |
|-------------|------|-----------------------|----------|
| Neon Postgres (projeto próprio de Fernando) | Serviço | Perda de persistência de `auth_*` e `sim_state` | Arquivo local `data/sim-state.json` sem `DATABASE_URL`; backup + Postgres local (D8) |
| Tailscale (Funnel) | Serviço | Perda da URL pública de acesso | Cloudflare Tunnel + domínio próprio (upgrade futuro) |
| Yahoo Finance (v8 chart API, não-oficial) | API | Sem quotes live nem históricos | `null` + stale-if-error; demais fontes seguem parciais; live splice degrada |
| FRED | API | Sem US yields/macro (CPI, UNRATE, breakevens…) | Requer `FRED_API_KEY`; campos degradam para `null` |
| BCB (SGS / Olinda / PTAX / Focus) | API | Sem SELIC/CDI/IPCA/PTAX/Focus | `null`; fetchers caminham até 7 dias para o último fix de PTAX |
| B3 (instrumentQuotation, não-oficial) | API | Sem DI futures | `NOK` fora de pregão é esperado (ausência, não erro) |
| RSS (Bloomberg / Google News proxy p/ Reuters) | Feed | Sem notícias no terminal | Lista vazia; Reuters só via Google News (RSS direto morto desde 2020) |
| Docker Desktop (Windows) | Runtime | Stack não sobe | Start no boot + `restart: unless-stopped`; host único (sem redundância) |
| Hugging Face (pesos `torch`/`transformers`) | Download | `news-nlp` não treina/infere | Cache em `/models` + `WARMUP`; modo fast NLP de fallback |
| João (autor original / upstream) | Pessoa | Acesso ao upstream revogado/arquivado | Repo é **duplicação** independente (D1); upstream só para cherry-picks |

---

## Histórico de Mudanças

| Data | Item | Mudança | Evidência |
|------|------|---------|-----------|
| 2026-06-28 | Criação | Registro inicial a partir do design do Ciclo 1 | `documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md` |

---

## Cross-references

- [Vision & Strategy](vision-strategy.md) — riscos ameaçam a visão
- [Constraints & No-Goals](constraints-no-goals.md) — constraints não mitigadas viram riscos
- [Success Metrics](success-metrics.md) — riscos materializados afetam métricas

## → Projeto.md

Esta seção reflete em: [Projeto.md — Riscos](../core/Projeto.md)

---

**Última atualização:** 2026-06-28
