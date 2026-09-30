# Agent Skills

## Metadata

- **Versão:** 3.0.0
- **Status:** Template
- **Última atualização:** 10/Abril/2026
- **Responsável:** {{RESPONSIBLE_NAME}}

---

## Sobre Este Diretório

Este diretório contém **Agent Skills** - instruções especializadas que ensinam o agente de IA a executar tarefas específicas do projeto.

**Skills vs Commands:**
- **Commands**: Documentação de procedimentos para execução manual ou pelo agente
- **Skills**: Instruções otimizadas para o agente, seguindo padrão MCP Agent Skills

**Benefícios das Skills:**
- Descoberta automática pelo agente (via description triggers)
- Formato otimizado para consumo por IA
- Progressive disclosure (carga no context apenas quando necessário)
- Integração com MCP (Model Context Protocol)

---

## Índice de Skills

### Skills Essenciais (13)

Operações recorrentes de documentação, validação, manutenção e lifecycle de initiatives.

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `enhanced-planning` | [enhanced-planning/SKILL.md](enhanced-planning/SKILL.md) | Guardrails estruturais para planos | Ao criar planos, antes de writing-plans |
| `audit-rules` | [audit-rules/SKILL.md](audit-rules/SKILL.md) | Auditar qualidade e integridade das regras | Antes de commits, ao completar fases |
| `audit-roadmap-refs` | [audit-roadmap-refs/SKILL.md](audit-roadmap-refs/SKILL.md) | Auditar referências a skills no Roadmap | Após criar skill, auditoria periódica |
| `audit-architecture` | [audit-architecture/SKILL.md](audit-architecture/SKILL.md) | Auditar redundância e sincronização entre arquivos | Antes de completar fase, após criar docs |
| `organize-commits` | [organize-commits/SKILL.md](organize-commits/SKILL.md) | Organizar mudanças em commits granulares | Após trabalho extenso, antes de push |
| `update-docs` | [update-docs/SKILL.md](update-docs/SKILL.md) | Atualizar documentação técnica | Após milestone, decisão arquitetural |
| `validate-docs-links` | [validate-docs-links/SKILL.md](validate-docs-links/SKILL.md) | Validar links e backlinks | Antes de completar DoD, após criar docs |
| `generate-session-prompt` | [generate-session-prompt/SKILL.md](generate-session-prompt/SKILL.md) | Gerar prompt para retomada de sessão | Sessão >150k tokens, mudança de contexto |
| `reconcile-initiative` | [reconcile-initiative/SKILL.md](reconcile-initiative/SKILL.md) | Reconciliar docs core após conclusão de initiative | Ao completar initiative |
| `archive-initiative` | [archive-initiative/SKILL.md](archive-initiative/SKILL.md) | Arquivar initiative concluída em _archive/ | Ao completar fase, sob demanda |
| `init-milestone` | [init-milestone/SKILL.md](init-milestone/SKILL.md) | Inicializar infraestrutura de planning para milestone | Antes de iniciar qualquer milestone |
| `init-detour` | [init-detour/SKILL.md](init-detour/SKILL.md) | Inicializar infraestrutura de planning para detour | Antes de iniciar qualquer detour |
| `claude-design-flow` | [claude-design-flow/SKILL.md](claude-design-flow/SKILL.md) | Fluxo de prototipação visual: 7 etapas, 3 bundles, modo local + publicação no Claude Design | Ao trabalhar interface, identidade visual, fluxos de usuário |

### Skills de Validação (5)

Validação de qualidade, testes, processos (Definition of Ready/Done), e kickoff.

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `validate-kickoff` | [validate-kickoff/SKILL.md](validate-kickoff/SKILL.md) | Validar completude do kickoff (discovery dinâmico) | **OBRIGATÓRIO** após executar kickoff-prompt |
| `validate-dod` | [validate-dod/SKILL.md](validate-dod/SKILL.md) | Validar Definition of Done | **OBRIGATÓRIO** antes de marcar milestone completo |
| `validate-dor` | [validate-dor/SKILL.md](validate-dor/SKILL.md) | Validar Definition of Ready | **OBRIGATÓRIO** antes de iniciar milestone |
| `pre-commit-check` | [pre-commit-check/SKILL.md](pre-commit-check/SKILL.md) | Checklist completo pré-commit (inclui code quality) | **SEMPRE** antes de git commit |
| `validate-testing` | [validate-testing/SKILL.md](validate-testing/SKILL.md) | Validar cobertura de testes | Após feature, pré-commit, DoD |

### Skills de Orquestração (1)

Coordenação de múltiplos agentes para trabalho paralelo.

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `agent-team` | [agent-team/SKILL.md](agent-team/SKILL.md) | Orquestrar equipe de agentes (3 níveis: research, sprint, pipeline) | Quando tarefa tem 3+ subtarefas independentes |

### Skills de UI Excellence (13)

Coordenação e execução de boas práticas para construção de interfaces web. Source: plugin `ui-excellence` do marketplace [`4-successful-ai-life`](https://github.com/fernando-bertholdo/4-successful-AI-life). Sincronizadas via `scripts/release/sync-ui-from-marketplace.sh`.

**Foundations (originais):**

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `ui-excellence` | [ui-excellence/SKILL.md](ui-excellence/SKILL.md) | Coordenador/triage que roteia para 12 specialist skills | Ao construir, revisar ou refinar qualquer UI web |
| `ui-animation-motion` | [ui-animation-motion/SKILL.md](ui-animation-motion/SKILL.md) | Animation decisions, easing, springs, gestures, performance (Emil Kowalski) | Animações, transições, motion design |
| `ui-visual-polish` | [ui-visual-polish/SKILL.md](ui-visual-polish/SKILL.md) | Visual details: text wrapping, shadows, border radius, alignment (Jakub Krehel) | Polimento visual, refinamento de interface |
| `ui-web-standards` | [ui-web-standards/SKILL.md](ui-web-standards/SKILL.md) | Web interface guidelines: a11y, forms, focus, perf, dark mode, i18n (Vercel) | Qualquer componente ou página web |
| `ui-accessibility` | [ui-accessibility/SKILL.md](ui-accessibility/SKILL.md) | WCAG 2.1 compliance: semantic HTML, keyboard, ARIA, contrast, testing | Acessibilidade, compliance, auditorias |

**Systems (adaptadas de [wondelai/skills](https://github.com/wondelai/skills), MIT):**

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `ui-refactoring` | [ui-refactoring/SKILL.md](ui-refactoring/SKILL.md) | Visual hierarchy, spacing, color, depth, design tokens (Wathan & Schoger) | Design system, "my UI looks off" |
| `ui-typography` | [ui-typography/SKILL.md](ui-typography/SKILL.md) | Typeface selection, pairing, responsive type, web font loading (Santa Maria) | Font pairing, typographic scale |

**Audit (adaptadas de wondelai/skills, MIT):**

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `ui-heuristics` | [ui-heuristics/SKILL.md](ui-heuristics/SKILL.md) | Nielsen's 10 heuristics, Krug usability, cognitive walkthrough | Usability audit, UX review |
| `ui-cro` | [ui-cro/SKILL.md](ui-cro/SKILL.md) | CRO methodology: funnel mapping, A/B testing, objection handling | Landing page conversion |

**Interaction (adaptada de wondelai/skills, MIT):**

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `ui-microinteractions` | [ui-microinteractions/SKILL.md](ui-microinteractions/SKILL.md) | Triggers, rules, feedback, loops & modes (Dan Saffer) | Button feedback, loading states |

**Behavior (adaptadas de wondelai/skills, MIT):**

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `ui-hooked` | [ui-hooked/SKILL.md](ui-hooked/SKILL.md) | Hook Model: trigger→action→variable reward→investment (Nir Eyal) | Engagement loops, habit formation |
| `ui-retention` | [ui-retention/SKILL.md](ui-retention/SKILL.md) | Behavior design (B=MAP), Ability Chain, tiny habits (BJ Fogg) | Onboarding friction, activation |
| `ui-copy` | [ui-copy/SKILL.md](ui-copy/SKILL.md) | SUCCESs checklist: sticky messaging (Chip & Dan Heath) | Taglines, value propositions |

### Skills de Sincronização (2)

| Skill | Arquivo | Descrição | Uso Frequente |
|-------|---------|-----------|---------------|
| `mirror-upstream` | [mirror-upstream/SKILL.md](mirror-upstream/SKILL.md) | Backport inteligente para templates upstream com fechamento Git na origem/destinos | Após melhorar skill/regra, periodicamente |
| `sync-downstream` | [sync-downstream/SKILL.md](sync-downstream/SKILL.md) | Forward-porting para projetos derivados com fechamento Git na origem/destino | Após atualizar template, ao retomar projeto |

---

## Como o Agente Usa as Skills

### 1. Descoberta Automática

O agente lê o **description** de cada skill para decidir quando aplicar:

```yaml
description: Validar Definition of Done de um milestone antes de marcá-lo
como completo. Use OBRIGATORIAMENTE antes de marcar milestone como completo,
durante desenvolvimento como checklist de progresso, ou antes de transição
para próximo milestone.
```

**Triggers identificados:**
- "antes de marcar milestone completo"
- "checklist de progresso"
- "transição para próximo milestone"

### 2. Carregamento Just-in-Time

**Metadata sempre em contexto (~100 palavras por skill):**
- `name` e `description`

**Body carregado apenas quando skill trigga (<5k palavras):**
- Procedimentos detalhados
- Exemplos
- Referências

### 3. Progressive Disclosure

Skills podem referenciar recursos adicionais que são lidos apenas se necessário:

```markdown
## Referências Detalhadas

Para procedimento completo de correção automática, veja:
- [auto-fix-guide.md](references/auto-fix-guide.md)
```

---

## Workflow Típico por Fase

### Após Kick-off

**Skills usadas:**
1. `validate-kickoff` - Validar que todos os placeholders foram preenchidos

### Fase de Setup

**Skills usadas:**
1. `validate-docs-links` - Validar arquivos criados
2. `audit-rules` (full) - Auditar todas as regras
3. `organize-commits` - Organizar commits granulares
4. `validate-dod` - Validar DoD completo

**Ordem:**
```
[Criar arquivos] → validate-docs-links → [Fix links] →
audit-rules full → [Resolver issues] → organize-commits →
validate-dod
```

### Fase de Planejamento

**Skills usadas:**
1. `validate-dor` - Validar pré-requisitos
2. `update-docs` (system) - Se arquitetura decidida
3. `validate-dod` - Validar decisões tomadas

### Fase de Desenvolvimento

#### Antes de Milestone

```bash
# Validar pré-requisitos
→ validate-dor [milestone-id]
```

#### Durante Milestone

```bash
# Validações rápidas durante desenvolvimento
→ validate-testing

# Antes de commit (inclui code quality, testing, security)
→ pre-commit-check
→ organize-commits (se múltiplas mudanças)
```

#### Ao Completar Milestone

```bash
# 1. Validar DoD
→ validate-dod [milestone-id]

# 2. Atualizar Projeto.md (milestone) + refs no Roadmap
→ update-docs task [milestone-id]

# (Opcional) Reprioritizar o Roadmap
→ update-docs roadmap

# 3. Atualizar arquitetura (se necessário)
→ update-docs system

# 4. Se último milestone da initiative:
→ reconcile-initiative <initiative-id>

# 5. Validar links
→ validate-docs-links check

# 6. Organizar commits
→ organize-commits

# 7. Commit final
git commit -m "docs(milestone): finaliza [milestone-id]"

# 8. Ao início da próxima fase (ou sob demanda):
→ archive-initiative <initiative-id>
```

---

## Convenções de Nomenclatura

### Padrão de Nomes

**Skills (diretórios):**
- `kebab-case` (lowercase, hyphens)
- Verbo-led quando possível
- Máximo 64 caracteres
- Exemplo: `validate-dod`, `organize-commits`, `audit-rules`

**Arquivo principal:**
- `SKILL.md` (uppercase, obrigatório)

### Estrutura de Diretório

```
.claude/skills/
├── README.md                           # Este arquivo
├── agent-team/
│   └── SKILL.md
├── enhanced-planning/
│   ├── SKILL.md
│   └── references/
│       ├── codex-review-protocol.md
│       ├── guardrail-catalog.md
│       └── plan-template.md
├── archive-initiative/
│   └── SKILL.md
├── audit-architecture/
│   └── SKILL.md
├── audit-roadmap-refs/
│   └── SKILL.md
├── audit-rules/
│   └── SKILL.md
├── fresh-context/
│   └── SKILL.md
├── generate-session-prompt/
│   └── SKILL.md
├── organize-commits/
│   └── SKILL.md
├── pre-commit-check/
│   └── SKILL.md
├── reconcile-initiative/
│   └── SKILL.md
├── update-docs/
│   └── SKILL.md
├── validate-docs-links/
│   └── SKILL.md
├── validate-dod/
│   └── SKILL.md
├── validate-dor/
│   └── SKILL.md
├── validate-kickoff/
│   └── SKILL.md
└── validate-testing/
    └── SKILL.md
```

---

## Ciclo de Vida das Skills

### Criar Nova Skill

**1. Identificar necessidade:**
- Processo recorrente (>3 vezes)
- Validação complexa padronizada
- Checklist extenso consistente
- Tarefa propensa a erros

**2. Planejar skill:**
- Nome (kebab-case, verbo-led)
- Description (triggers claros)
- Conteúdo essencial (<500 linhas)
- Referências externas (se necessário)

**3. Criar estrutura:**
```bash
mkdir .claude/skills/skill-name
touch .claude/skills/skill-name/SKILL.md
```

**4. Escrever SKILL.md:**
```markdown
---
name: skill-name
description: [O que faz] + [Quando usar com triggers claros]
---

# Skill Title

[Conteúdo conciso, imperativo, acionável]
```

**5. Adicionar ao índice:**
- Atualizar este README.md
- Testar em cenário real
- Commitar: `docs(skills): adiciona skill [nome]`

### Atualizar Skill Existente

**Gatilhos para atualização:**
- Processo subjacente evolui
- Feedback de uso (confuso, incompleto)
- Integração com novas skills
- Fase do projeto muda

**Processo:**
1. Ler skill existente
2. Atualizar conteúdo
3. Manter estrutura (não quebrar formato)
4. Adicionar exemplos se necessário
5. Atualizar este README se mudou triggers
6. Commitar: `docs(skills): atualiza [skill] - [contexto]`

---

## Integração com Outras Ferramentas

### MCP Agent Skills

Skills seguem padrão MCP (Model Context Protocol) Agent Skills:

**Benefícios:**
- Descoberta automática via description
- Carregamento eficiente (metadata + body sob demanda)
- Compartilhamento entre projetos
- Versionamento independente

**Compatibilidade:**
- Cursor AI (via MCP)
- OpenAI Codex (via Agent Skills)
- Claude Code (via Agent Skills)
- Outros editores com suporte MCP

---

## Métricas de Qualidade

### Por Skill

**Checklist de qualidade:**
- [ ] Name: kebab-case, <64 chars
- [ ] Description: triggers claros, <1024 chars
- [ ] Body: <500 linhas
- [ ] Instruções imperativas/infinitivas
- [ ] Exemplos contextualizados
- [ ] Procedimentos acionáveis
- [ ] Referências funcionais

### Conjunto de Skills

**Métricas:**
- Total de skills: 29
- Skills essenciais: 10
- Skills de validação: 5
- Skills de orquestração: 1
- Skills de UI excellence: 13 (5 originais + 8 wondelai)
- Linhas médias por skill: ~350
- Coverage de workflows: 100%

---

## Referências

### Documentação Core
- `documents/core/Projeto.md` - Contexto do projeto
- `documents/core/Roadmap.md` - Milestones e fases
- `CLAUDE.md` - Regras sempre ativas

### Regras
- `.claude/rules/README.md` - Índice de regras
- `.claude/rules/*.md` - Regras path-targeted

---

## Uso Rápido

**Durante desenvolvimento:**
```bash
→ validate-testing
```

**Antes de commit:**
```bash
→ pre-commit-check
→ organize-commits  # Se múltiplas mudanças
```

**Antes de iniciar milestone:**
```bash
→ validate-dor [milestone-id]
```

**Ao completar milestone:**
```bash
→ validate-dod [milestone-id]
→ update-docs task [milestone-id]
→ update-docs system  # Se arquitetura mudou
→ update-docs roadmap  # Se decisões mudaram o plano
→ reconcile-initiative <initiative-id>  # Se último milestone
→ archive-initiative <initiative-id>     # Ao início da próxima fase
```

**Antes de completar fase:**
```bash
→ validate-docs-links check
→ audit-rules full
→ archive-initiative --phase <fase>  # Arquivar initiatives concluídas
```

---

**Última atualização:** 10/Abril/2026
**Versão:** 3.0.0

---

## Changelog

### v3.0.0

**Skills Adicionadas (8, via marketplace sync):**
- ui-refactoring (UI/systems) — Visual hierarchy, spacing, design tokens (Wathan & Schoger)
- ui-typography (UI/systems) — Typeface selection, font pairing, responsive type (Santa Maria)
- ui-heuristics (UI/audit) — Nielsen heuristics, Krug usability (severity ratings, cognitive walkthrough)
- ui-cro (UI/audit) — CRO methodology, funnel mapping, A/B testing (Blanks & Jesson)
- ui-microinteractions (UI/interaction) — Triggers, rules, feedback, loops (Dan Saffer)
- ui-hooked (UI/behavior) — Hook Model, habit formation (Nir Eyal)
- ui-retention (UI/behavior) — Behavior design B=MAP, activation (BJ Fogg)
- ui-copy (UI/behavior) — SUCCESs checklist, sticky messaging (Chip & Dan Heath)

**Skills Atualizadas (5, refreshed from marketplace):**
- ui-excellence — Coordinator expandido com triage para 13 domínios
- ui-animation-motion, ui-visual-polish, ui-web-standards, ui-accessibility — Refreshed com sync header

**Governança:**
- UI skills agora sincronizadas do marketplace externo `4-successful-ai-life` via `scripts/release/sync-ui-from-marketplace.sh`
- G-ISONOMIA enforced via `scripts/validate/validate-ui-parity.sh` (paridade 3 camadas)

Total: 29 skills (de 21)

### v2.4.0

**Skills Adicionadas (5):**
- ui-excellence (UI) — Coordenador/triage para sub-skills de UI
- ui-animation-motion (UI) — Animações, easing, springs, gestos
- ui-visual-polish (UI) — Sombras, border radius, tipografia, alinhamento óptico
- ui-web-standards (UI) — Acessibilidade, formulários, performance, dark mode, i18n
- ui-accessibility (UI) — WCAG 2.1, keyboard navigation, ARIA, contraste

Total: 21 skills (de 16)

### v2.3.0

**Skills Adicionadas (1):**
- enhanced-planning v2.0.0 (essencial) — Guardrails estruturais unificados para planos (remove tiers LOW/MEDIUM/HIGH)

Total: 16 skills (de 15)

### v2.2.0

**Skills Atualizadas (2):**
- mirror-upstream v1.1.0 — Fecha o espelhamento com `organize-commits` e `pre-commit-check`
- sync-downstream v1.1.0 — Fecha a sincronização com `organize-commits` e `pre-commit-check`

**Governança:**
- Skills de sincronização passam a exigir commits reais na origem e no destino
- Worktree limpo passa a ser critério explícito de conclusão

Total: 15 skills (sem mudança de contagem)

### v2.0.0

**Skills Adicionadas (2):**
- reconcile-initiative (essencial) — Reconciliação de docs core após conclusão de initiative
- archive-initiative (essencial) — Arquivamento com dados temporais e INDEX.md

**Skills Atualizadas:**
- validate-dod v3.0.0 — Post-DoD reconciliation gate
- update-docs v1.1.0 — Referência a reconcile-initiative
- fresh-context — Fallback para paths arquivados (_archive/)
- generate-session-prompt — Fallback para paths arquivados (_archive/)

Total: 15 skills (de 13)

### v1.0.0

**Criação Inicial:**
- 13 skills (7 essenciais + 5 validação + 1 orquestração)

---

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|------|--------|---------|---------|-----------|
| 2026-09-30 | `—` | — | todas as skills + `README.md` | Camada `.codex/skills/` criada neste repositório a partir do tech-product-template 2.18.0 (`b51dbf9`), TECH-668: composição da origem, inclusive as `ui-*`, que a §9 do `.claude/CLAUDE.md` daqui declara replicadas em `.codex/skills/ui-*/`; fica de fora o alias `figma-design-flow`, pelo mesmo critério da linha `SYNC-20260805-004` do `.agents/skills/README.md` (este repositório nunca teve o executor Figma); placeholders de kickoff preenchidos com os valores que o `.agents/` daqui já usa, e as adaptações deliberadas que `.claude/` e `.agents/` daqui já têm: o ponteiro do `init-detour` para o `AGENTS.md` do `tech-product-template` (`efc5917`) e a linha de trabalho avulso dele, e a Fase 0 do Roadmap no `validate-testing` (as duas da TECH-220, `aa6e9b8`). O histórico anterior destas skills é o da origem e fica na tabela do template. Referência na origem: SYNC-20260915-001, SYNC-20260920-001/002 e SYNC-20260920-003 |
