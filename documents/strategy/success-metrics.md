# Success Metrics & KPIs

## Metadata

- **Versão:** 1.0.0
- **Status:** Ativo
- **Última atualização:** 2026-06-28
- **Responsável:** Fernando Bertholdo
- **Gerado por:** preenchimento manual a partir do design do Ciclo 1 (`documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md`)

---

## North Star Metric

**Métrica:** Uptime útil da plataforma
**Definição:** fração das janelas de verificação (ex.: um ping periódico) em que, simultaneamente, (a) a URL `https://…ts.net` responde HTTP 200 em `/api/market` de um navegador externo **e** (b) o `asOf` do paper book avançou desde a verificação anterior (o tick interno está vivo, sem navegador aberto).
**Baseline:** efetivamente 0% — o terminal está fora do ar no Vercel (free-tier estourado), sem controle de Fernando.
**Target:** ≥ 99% ao final do Ciclo 1 (self-hosting). 100% é aspiracional para um host doméstico; o círculo fechado tolera janelas curtas.

---

## Métricas de Validação (Curto Prazo)

Avaliadas no **Ciclo 1 (SP1)**. São, na prática, os critérios de aceite do self-hosting.

| # | Métrica | Tipo | Target | Como Medir | Prazo |
|---|---------|------|--------|------------|-------|
| V1 | App acessível por URL Tailscale estável, sem abrir portas | Output | HTTP 200 em `/api/market` | Acessar `https://…ts.net` de rede externa/4G, em navegador qualquer, sem instalar nada nem abrir portas no roteador | Ciclo 1 |
| V2 | Tick do book avança sem navegador aberto | Output | `asOf` avança e equity intraday ganha marcas | Após 2+ min sem cliente, inspecionar `/api/sim` duas vezes e comparar `asOf` e o tape de equity | Ciclo 1 |
| V3 | Persistência Postgres confirmada | Output | `/api/sim` reporta `"persistence": "postgres"` | `GET /api/sim` no Neon próprio de Fernando | Ciclo 1 |
| V4 | Stack completa sobe e auto-restarta | Output | `web` + `model-engine` + `news-nlp` + `scheduler` de pé e religando | `docker-compose up`; depois `docker restart` e reboot do Windows → conferir todos os containers de volta | Ciclo 1 |

**Critério de Continuidade:**
- Se V1–V4 atingidos → Ciclo 1 aceito; prosseguir para o **Ciclo 2 (multi-tenancy, SP2)**.
- Se apenas parte atingida → corrigir a infraestrutura **antes** do SP2 (introduzir tenancy sobre base instável só multiplica risco).
- Se nenhum atingido → reavaliar a decisão de self-hosting doméstico (ex.: host alternativo / VPS barato), mantendo Neon e Tailscale.

---

## Métricas de Valor (Médio/Longo Prazo)

Avaliadas a partir do **Ciclo 2** (multi-tenancy) em diante.

| # | Métrica | Tipo | Target | Frequência de Medição |
|---|---------|------|--------|-----------------------|
| M1 | Isolamento multi-tenant verificado (SP2) | Outcome | **0 vazamentos** entre tenants — cada `user_id` só lê/escreve seus próprios dados (book, auth, watchlist) | Por endpoint migrado no SP2 + verificação adversarial contínua |
| M2 | Usuários ativos do círculo fechado | Outcome | Até ~10 contas provisionadas, cada uma com book próprio rodando | Mensal |
| M3 | Robô/estratégia por usuário operante (SP3) | Outcome | Cada usuário com sleeves/parâmetros próprios no `model-engine` | Por release do SP3 |
| M4 | Continuidade do paper book | Outcome | Book marcado a mercado a cada tick; P&L e equity curve sem gaps relevantes | Contínuo |

---

## Métricas Operacionais

| # | Métrica | Threshold Aceitável | Alerta Se |
|---|---------|---------------------|-----------|
| O1 | Disponibilidade da URL `*.ts.net` | ≥ 99% | URL cai por mais que uma janela curta de verificação |
| O2 | Frescor do tick (idade do `asOf` em horário de mercado) | Avança a cada ~1 min (scheduler 1/min) | `asOf` para de avançar em pregão |
| O3 | Saúde das fontes (BCB/FRED/Yahoo/B3/RSS) | Maioria `ok` no `SourceStatus` | Uma fonte fica `down` por mais de um ciclo de refresh |
| O4 | Modo de persistência | `"postgres"` | Cai para fallback de arquivo (`DATABASE_URL` ausente ou Neon indisponível) |
| O5 | Restart de containers | Todos `up` | Algum container entra em loop de restart |
| O6 | Saúde do `news-nlp` | Modelo carregado (ou fast mode) | Inferência/retrain falha repetidamente |

---

## Anti-métricas (O Que NÃO Otimizar)

| Anti-métrica | Por Que Não Otimizar | Exemplo de Armadilha |
|--------------|----------------------|----------------------|
| Número de usuários a todo custo | Quebra o modelo de **círculo fechado de confiança** e forçaria signup público, billing e LGPD pesado | Abrir cadastro self-service para "crescer a base" |
| Retorno do paper book (P&L) | É simulador de **pesquisa**, não fundo; perseguir P&L incentiva overfit e ameaça o invariante de não-lookahead | Tunar sinais para inflar a equity curve histórica |
| 100% de uptime literal | O último "9" num PC doméstico custa desproporcional; o círculo fechado tolera janelas curtas | Comprar redundância/infra cara, contrariando o custo-zero |
| Cobertura de dados via fontes pagas | Trocar fontes gratuitas por pagas para "completar" buracos ocasionais fere a constraint de custo ~zero | Assinar um data feed caro por causa de uma falha intermitente do Yahoo/RSS |

---

## Cross-references

- [Vision & Strategy](vision-strategy.md) — métricas derivam da visão
- [Constraints & No-Goals](constraints-no-goals.md) — constraints informam thresholds
- [Risk & Assumptions](risk-assumptions.md) — riscos materializados afetam métricas

## → Projeto.md

Esta seção reflete em: [Projeto.md — Critérios de Sucesso](../core/Projeto.md)

---

**Última atualização:** 2026-06-28
