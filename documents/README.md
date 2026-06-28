# Documentação - Market Terminal

## Estrutura

```
documents/
├── README.md                    # Este arquivo (índice)
├── AGENTS.md                    # Regras locais para docs
├── core/                        # Documentos principais
│   ├── Projeto.md               # Fonte de verdade (living document)
│   ├── Roadmap.md               # Fases, milestones, DoR/DoD
│   └── TODO.md                  # Tracking granular de tarefas
├── archive/                     # Documentos de kick-off (historico)
│   └── README.md                # Instrucoes para arquivos de kick-off
├── guides/                      # Guias reutilizáveis (playbooks)
│   └── ai-assisted-workflow.md  # Exemplo de guia
├── technical/                   # Documentação técnica detalhada
│   └── README.md
└── strategy/                    # Documentos estrategicos (design-sprint)
    ├── README.md                # Indice e salvaguardas
    ├── vision-strategy.md       # Tier 1: visao e estrategia
    ├── constraints-no-goals.md  # Tier 1: limites e no-goals
    ├── success-metrics.md       # Tier 1: metricas de sucesso
    └── risk-assumptions.md      # Tier 1: riscos e premissas (living doc)
```

---

## Documentos Core

| Documento | Propósito | Quando Consultar |
|-----------|-----------|------------------|
| [Projeto.md](core/Projeto.md) | **Fonte de verdade** - Regras de negócio, arquitetura, decisões | Sempre que precisar de contexto |
| [Roadmap.md](core/Roadmap.md) | Fases, milestones, DoR/DoD | Planejamento, validação de progresso |
| [TODO.md](core/TODO.md) | Tracking granular, progresso diário | Durante desenvolvimento |

---

## Documentos de Kick-off (Archive)

A pasta `archive/` contém documentos originais do kick-off do projeto:

- **TAP** (Termo de Abertura do Projeto) - PDF ou Word
- **Transcrições de reuniões** - TXT
- **Especificações técnicas originais** - Se houver

> **Nota:** Estes documentos são históricos. Para decisões atuais, consulte sempre `core/Projeto.md`.

---

## Documentação Técnica (Technical)

Documentação técnica detalhada para aspectos específicos:

- `architecture.md` - Visão técnica da arquitetura
- `integrations.md` - Detalhes de integrações externas

> **Salvaguarda:** Todo documento em `technical/` deve linkar para a seção correspondente em `core/Projeto.md`.

---

## Guias e Playbooks (Guides)

Guias curtos e reutilizáveis de operação/processo:

- `guides/` - Playbooks e procedimentos recorrentes (não use para registro de milestones)
- [ai-assisted-workflow.md](guides/ai-assisted-workflow.md) - Workflow assistido por IA
- **Agent Teams** - Orquestração multi-agente via skill `/agent-team` (ver `.claude/skills/agent-team/SKILL.md`)

> **Salvaguarda:** Se um guia impactar decisões de negócio/arquitetura, reflita em `core/Projeto.md`.

---

## Documentos de Estrategia (Strategy)

Documentos estrategicos gerados via `design-sprint` ou preenchimento manual.

**Tier 1 — Sempre presentes:**

| Documento | Proposito |
|-----------|-----------|
| [vision-strategy.md](strategy/vision-strategy.md) | Por que o projeto existe e para onde vai |
| [constraints-no-goals.md](strategy/constraints-no-goals.md) | O que NAO sera construido + limitacoes |
| [success-metrics.md](strategy/success-metrics.md) | Como medir sucesso |
| [risk-assumptions.md](strategy/risk-assumptions.md) | Riscos, premissas e dependencias (living doc) |

**Tier 2 — Condicionais** (criados por `design-sprint` se aplicavel):
- `user-personas.md` — Se projeto tem usuarios finais
- `business-model.md` — Se ha ambicao comercial
- `competitive-landscape.md` — Se ha competidores

> **Salvaguarda:** Decisoes finais devem ser refletidas em `core/Projeto.md`. Strategy docs sao inputs/exploracao, nao fonte de verdade.

---

## Regras de Documentação

### Single Source of Truth

1. `core/Projeto.md` é a **fonte única de verdade**
2. `technical/` e `strategy/` são **suplementares**
3. Se houver conflito, **Projeto.md prevalece**

### Salvaguardas

- Todo documento suplementar deve **linkar** para Projeto.md
- Evite duplicação de conteúdo entre diretórios
- Atualize `Roadmap.md` e `TODO.md` quando status mudar

### Navegação

- Máximo **3 cliques** entre quaisquer 2 documentos
- Use links relativos (`[link](./path/to/file.md)`)
- Mantenha índices atualizados

---

## Skills Relacionadas

- `validate-docs-links check` - Validar integridade de links
- `update-docs system` - Atualizar documentação técnica
- `audit-architecture` - Auditar redundância entre documentos

---

**Última atualização:** 2026-06-28
**Versão:** 1.0.0
