# Vision & Strategy

## Metadata

- **Versão:** 1.0.0
- **Status:** Ativo
- **Última atualização:** 2026-06-28
- **Responsável:** Fernando Bertholdo
- **Gerado por:** preenchimento manual a partir do design do Ciclo 1 (`documents/superpowers/specs/2026-06-28-market-terminal-selfhost-foundation-design.md`)

---

## Problema

O **Market Terminal** é um terminal de mercado FICC estilo Bloomberg (foco Brasil/EUA — rates, FX, commodities, notícias e camada macro) acoplado a um **simulador quant de paper-trading** com motor de estratégias fundamentado em pesquisa publicada (TSMOM, CARRY, MACRO + condicionamento de regime e vol targeting por covariância). Nasceu como ferramenta pessoal **single-tenant** de um colega (João / `joaoouro`), rodando no Vercel, e enfrenta três dores concretas:

1. **Saiu do ar** — o plano Hobby (free-tier) do Vercel atingiu seus limites de compute/bandwidth e o terminal ficou indisponível.
2. **Colaboração bloqueada** — adicionar Fernando como contribuidor no Vercel exigiria o plano PRO (pago).
3. **Sem controle de infraestrutura** — não há onde rodar a stack completa (Next.js + 2 serviços Python FastAPI + tick contínuo) de forma barata e sob domínio próprio, apesar de Fernando dispor de um desktop Windows ocioso com uptime próximo de 100%.

No plano de fundo há um problema de mercado: profissionais de FICC não têm uma ferramenta **densa, gratuita, customizável e privada** que una tape de mercado em tempo real e um robô de paper-trading sério (research-backed, com invariante de não-lookahead). Terminais comerciais são caros; alternativas gratuitas são fragmentadas e não simulam estratégia.

## Visão

Transformar uma ferramenta pessoal single-tenant em uma **plataforma self-hosted e multi-tenant para um círculo fechado (~10) de profissionais de mercado de confiança, por convite** — onde cada pessoa tem seu próprio robô/estratégia de paper-trading, sua interface customizada e suas configurações, com **isolamento de dados por usuário**, rodando a **custo praticamente zero** sobre fontes de dados gratuitas, exposta por uma **URL pública estável** sem abrir portas no roteador — e **nunca executando ordens reais**.

O estado ideal: Fernando (e cada membro do círculo) abre uma URL no navegador, sem instalar nada, e vê seu terminal denso e seu book paper rodando continuamente — o tick avança mesmo com nenhum navegador aberto, a persistência é confiável, e os dados de um usuário jamais cruzam para outro.

## Por Que Agora

- **Gatilho imediato:** o terminal está fora do ar (Vercel free-tier estourado). A migração não é otimização especulativa — é o caminho para voltar a ter a ferramenta no ar.
- **Recurso ocioso disponível:** Fernando tem um desktop Windows com uptime ~100% e Docker Desktop, ideal para self-hosting a custo zero.
- **Ferramentas maduras:** Tailscale Funnel (URL pública sem abrir portas, sem IP fixo), Docker Desktop iniciando no boot do Windows e `restart: unless-stopped` tornam o self-hosting doméstico viável e reproduzível.
- **Fundação multi-tenant a uma camada de distância:** o código já evoluiu além do `CLAUDE.md` herdado — já tem **login** (sessão em cookie, PBKDF2, tabelas no Postgres), **persistência em Neon Postgres** (não mais só `data/sim-state.json`) e **2 serviços Python** (model-engine, news-nlp). Falta essencialmente introduzir `user_id`. Migrar a infraestrutura agora, antes de empilhar mais features, evita retrabalho.
- **Janela de autoria limpa:** Fernando recebeu acesso irrestrito e desenvolve em repositório próprio (com `upstream` para a origem), preservando a autoria de João — momento certo para formalizar a divergência.

## Proposta de Valor

| Comparação | Diferencial do Market Terminal self-hosted |
|---|---|
| vs. Vercel pago / free-tier estourado | Custo ~zero, controle total da stack, sem limites de compute/bandwidth, contribuição livre |
| vs. terminais comerciais (Bloomberg etc.) | Gratuito, denso, customizável, com simulador quant fundamentado em pesquisa — para uso privado |
| vs. ferramentas gratuitas fragmentadas | Tape unificado (rates/FX/commodities/news/macro) **+** robô de paper-trading num só lugar |
| vs. single-tenant atual | Cada membro do círculo tem robô, UI e configs próprios, com isolamento de dados por `user_id` |
| vs. operar manualmente / planilhas | Tick contínuo automatizado, marcação a mercado, P&L e cenários sem operação manual |

---

## Horizonte de Evolução

O roadmap está decomposto em sub-projetos (SP0–SP5) agrupados em ciclos. Detalhes em [Roadmap.md](../core/Roadmap.md) e no design do Ciclo 1.

| Fase | Horizonte | Descrição |
|------|-----------|-----------|
| A (atual) | Ciclo 1 — Agora (2026) | **Fundação & self-hosting (SP0 + SP1).** Repo próprio com autoria de João preservada e `upstream` configurado; metodologia portada; documentação do estado real; stack completa (web Next.js + model-engine + news-nlp + scheduler) em Docker Compose no desktop Windows; Neon próprio de Fernando; Tailscale Funnel; tick interno substitui o Cloudflare Worker. Ainda single-tenant. |
| B | Ciclo 2 — Próximo | **Multi-tenancy core (SP2).** Introdução de `user_id` em tudo (book, auth, estado); auth multi-usuário com **token de sessão assinado** (D7) que desacopla o middleware do driver Neon; isolamento via **camada única de acesso a dados** que exige `user_id`, com verificação adversarial de vazamento. |
| C | Ciclo 3+ — Futuro | **Personalização por usuário e self-hosted 100% (SP3/SP4/SP5 + D8).** Robô/estratégia e parâmetros por pessoa no model-engine; workspace/UI por usuário (migrar `localStorage` → servidor); funcionalidades personalizadas; migração de Neon para **Postgres local** containerizado (destravada pelo token assinado do SP2), com backup via `pg_dump`. |

## Princípios Arquiteturais

Princípios que guiam decisões técnicas ao longo de todas as fases:

1. **Paper-trading only — nunca executa ordens reais.** Invariante de produto inviolável: o simulador marca a mercado, preenche e custeia fills no book, mas jamais envia ordens a corretora. Remove risco regulatório e financeiro.
2. **Não-lookahead.** Sinais em `t` nunca enxergam preços depois de `t`. Toda mudança que toque o simulador (`closesWithLive` nunca duplica a barra do dia; covariância/hedge ratios só usam dados disponíveis na decisão) passa por revisão dedicada.
3. **Dados gratuitos e degradação graciosa.** Todas as fontes (BCB, FRED, Yahoo, B3, RSS) são gratuitas/não-oficiais. Fetchers retornam `null` e logam, nunca lançam para o chamador; `ApiResponse<T>` é sempre HTTP 200 com `SourceStatus` por fonte; a UI renderiza faltas como `---` e mostra a saúde das fontes no StatusBar.
4. **Isolamento por usuário desde o design.** O caminho multi-tenant é **row-level** (banco compartilhado + `user_id`), com acesso centralizado numa camada que **exige** `user_id` — isolamento verificado adversarialmente, não presumido.
5. **Preservação de autoria.** O histórico e o crédito de João são mantidos intactos; trabalha-se em repositório próprio com `upstream` para a origem (duplicação consciente, não fork formal — D1), com transparência para João.
6. **Custo-zero pragmático.** A escala de círculo fechado (~10 pessoas de confiança) permite segurança pragmática e infraestrutura gratuita (Neon Free + Tailscale Free + FRED grátis), sem over-engineering (sem billing, signup público ou LGPD pesado).

---

## Cross-references

- [Constraints & No-Goals](constraints-no-goals.md) — limites do escopo
- [Success Metrics](success-metrics.md) — como medir se estamos no caminho
- [Risk & Assumptions](risk-assumptions.md) — o que pode dar errado

## → Projeto.md

Esta seção reflete em: [Projeto.md — Visão e Objetivos](../core/Projeto.md)

---

**Última atualização:** 2026-06-28
