# Agent Skills

## Metadata

- **Versão:** 2.3.0
- **Status:** Template
- **Última atualização:** Template
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

### Skills Essenciais (12)

Operacoes recorrentes de documentacao, validacao, manutencao e lifecycle de initiatives.

| Skill | Arquivo | Descricao | Uso Frequente |
|-------|---------|-----------|---------------|
| `design-sprint` | [design-sprint/SKILL.md](design-sprint/SKILL.md) | Exploracao colaborativa de design → strategy docs | Inicio de projeto, antes de generate-tap |
| `enhanced-planning` | [enhanced-planning/SKILL.md](enhanced-planning/SKILL.md) | Guardrails estruturais para planos | Ao criar planos, antes de writing-plans |
| `audit-rules` | [audit-rules/SKILL.md](audit-rules/SKILL.md) | Auditar qualidade e integridade das regras | Antes de commits, ao completar fases |
| `audit-roadmap-refs` | [audit-roadmap-refs/SKILL.md](audit-roadmap-refs/SKILL.md) | Auditar referências a skills em Roadmap/TODO | Após criar skill, auditoria periódica |
| `audit-architecture` | [audit-architecture/SKILL.md](audit-architecture/SKILL.md) | Auditar redundância e sincronização entre arquivos | Antes de completar fase, após criar docs |
| `organize-commits` | [organize-commits/SKILL.md](organize-commits/SKILL.md) | Organizar mudanças em commits granulares | Após trabalho extenso, antes de push |
| `update-docs` | [update-docs/SKILL.md](update-docs/SKILL.md) | Atualizar documentação técnica | Após milestone, decisão arquitetural |
| `validate-docs-links` | [validate-docs-links/SKILL.md](validate-docs-links/SKILL.md) | Validar links e backlinks | Antes de completar DoD, após criar docs |
| `generate-session-prompt` | [generate-session-prompt/SKILL.md](generate-session-prompt/SKILL.md) | Gerar prompt para retomada de sessão | Sessão >150k tokens, mudança de contexto |
| `reconcile-initiative` | [reconcile-initiative/SKILL.md](reconcile-initiative/SKILL.md) | Reconciliar docs core após conclusão de initiative | Ao completar initiative |
| `archive-initiative` | [archive-initiative/SKILL.md](archive-initiative/SKILL.md) | Arquivar initiative concluída em _archive/ | Ao completar fase, sob demanda |
| `init-milestone` | [init-milestone/SKILL.md](init-milestone/SKILL.md) | Inicializar infraestrutura de planning para milestone | Antes de iniciar qualquer milestone |
| `init-detour` | [init-detour/SKILL.md](init-detour/SKILL.md) | Inicializar infraestrutura de planning para detour | Antes de iniciar qualquer detour |

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

### Skills de UI Excellence (migradas para plugin externo)

Skills UI agora vivem no plugin `ui-excellence` do marketplace [`4-successful-ai-life`](https://github.com/fernando-bertholdo/4-successful-AI-life). Invoke via `/ui-excellence:coordinator`, `/ui-excellence:animation-motion`, etc. Veja `.codex/skills/README.md` ou `.agents/skills/README.md` para o catálogo completo de 13 skills flat.

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

### Antes do Kick-off (Exploracao de Design)

**Skills usadas:**
1. `design-sprint` - Explorar design colaborativamente, gerar strategy docs
2. `generate-tap` - Consolidar strategy docs + materiais brutos em TAP

### Apos Kick-off

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

# (Opcional) Reprioritizar Roadmap/TODO
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
├── design-sprint/
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
- Total de skills: 17
- Skills essenciais: 10
- Skills de validação: 5
- Skills de orquestração: 1
- Linhas médias por skill: ~350
- Coverage de workflows: 100%

---

## Referências

### Documentação Core
- `documents/core/Projeto.md` - Contexto do projeto
- `documents/core/Roadmap.md` - Milestones e fases
- `documents/core/TODO.md` - Tracking granular
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

**Ultima atualizacao:** Template
**Versao:** 2.4.0

---

## Changelog

### v2.4.0

**Skills Adicionadas (1):**
- design-sprint v1.0.0 (essencial) — Exploracao colaborativa de design, gera strategy docs em `documents/strategy/` (Tier 1 + Tier 2 condicional)

**Skills Atualizadas (1):**
- generate-tap v1.1.0 — Escaneia `documents/strategy/` como fonte estruturada prioritaria

**Documentos Novos:**
- 4 templates Tier 1 em `documents/strategy/`: vision-strategy, constraints-no-goals, risk-assumptions, success-metrics
- `documents/strategy/README.md` atualizado com estrutura Tier 1/Tier 2

**Diagramas Atualizados:**
- `documents/guides/kickoff-sequence-diagram.md` v2.0.0 — Fase 0 (design-sprint) adicionada
- `.agents/workflows/kickoff.md` — Step 0 (design-sprint) adicionado

Total: 17 skills (de 16)

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
| 2026-02-21 | `77ecc43` | — | (criação inicial - 13 skills) | Inicializa tech-product-template |
| 2026-03-05 | `06087eb` | — | mirror-upstream/SKILL.md | Cria mirror-upstream |
| 2026-03-05 | `06087eb` | — | sync-downstream/SKILL.md | Cria sync-downstream |
| 2026-03-05 | `06087eb` | — | archive-initiative/SKILL.md | Cria archive-initiative |
| 2026-03-05 | `06087eb` | — | reconcile-initiative/SKILL.md | Cria reconcile-initiative |
| 2026-03-05 | `06087eb` | — | README.md, validate-dod/..., update-docs/..., fresh-context/... | Skills v2.1.0, governance |
| 2026-03-06 | `bca7ad9` | SYNC-20260306-001 | organize-commits/SKILL.md, pre-commit-check/SKILL.md | Padroniza commits em pt-BR |
| 2026-03-06 | `64f3777` | SYNC-20260306-005 | `mirror-upstream/SKILL.md`, `sync-downstream/SKILL.md`, `README.md` | Propaga fechamento Git obrigatório para as skills de sync na camada `.claude` |
| 2026-03-06 | 64c7142 | SYNC-20260306-001 | organize-commits/SKILL.md | Padroniza commits em pt-BR |
| 2026-03-06 | 64c7142 | SYNC-20260306-001 | pre-commit-check/SKILL.md | Valida assunto de commit em pt-BR |
| 2026-03-10 | `9e9a507` | SYNC-20260310-002 | `init-milestone/SKILL.md` | Cria skill init-milestone: infraestrutura obrigatória de planning |
| 2026-03-10 | `a31a417` | SYNC-20260310-002 | 7 skills milestone-centric | Atualiza paths .planning/ para modelo milestone-centric |
| 2026-03-10 | `40f6a3d` | SYNC-20260310-002 | `validate-dor/SKILL.md` | Adiciona BLOCKER gate para verificar diretório do milestone |
| 2026-03-21 | `b41decd` | SYNC-20260321-001 | `enhanced-planning/SKILL.md` + 3 refs, `README.md` | Cria skill enhanced-planning v1.0.0 com guardrails tiered |
| 2026-03-24 | `6bae3e2` | SYNC-20260324-002 | `init-milestone/SKILL.md` | Atualiza template para CONTEXT.md unificado |
| 2026-03-24 | `900f9f3` | SYNC-20260324-002 | `init-detour/SKILL.md` | Cria skill init-detour para inicialização de detours |
| 2026-03-24 | `7ee9500` | SYNC-20260324-002 | `validate-dor/SKILL.md`, `validate-dod/SKILL.md` | Unifica para aceitar initiatives (milestone + detour) |
| 2026-03-24 | `01beee7` | SYNC-20260324-002 | 5 skills auxiliares | Atualiza skills auxiliares para conceito de initiative |
| 2026-03-24 | `875ef00` | SYNC-20260324-002 | `CLAUDE.md`, `README.md` | CLAUDE.md v2.6.0 e README para initiative unification |
| 2026-03-24 | `bd7bbae` | SYNC-20260324-003 | `enhanced-planning/SKILL.md` + 2 refs × 3 agent dirs, 3 `README.md` | Atualiza enhanced-planning v1.1.0 → v2.0.0: remove tiers, unifica guardrails |
| 2026-03-30 | `1accbb6` | SYNC-20260330-001/002 | 5 UI skills, `rules/ui-excellence-standards.md`, 2 `README.md` | Cria UI Excellence; propagado para lass (f069711) e monitor-fundos (ae63986) |
| 2026-03-30 | `bafd406` | SYNC-20260330-006 | mirror-upstream/SKILL.md, sync-downstream/SKILL.md | Adiciona replicação obrigatória entre camadas (v1.2.0) |
| 2026-04-04 | `d35ebba` | SYNC-20260404-001 | `enhanced-planning/SKILL.md`, `enhanced-planning/references/codex-review-protocol.md`, `enhanced-planning/references/plan-template.md` | Substitui skill-codex:codex por /codex:rescue no enhanced-planning (9 arquivos × 3 camadas) |
| 2026-04-10 | `PENDING` | SYNC-20260410-001 | 5 UI dirs (DELETADOS), `sync-downstream/SKILL.md`, `README.md` | Migra skills UI para plugin marketplace `4-successful-ai-life`; deleta standalone; sync-downstream v1.3.0 |
| 2026-04-11 | `1645890` | SYNC-20260411-001 | `enhanced-planning/references/guardrail-catalog.md` × 3 camadas | Adiciona G-BASELINE-PARITY ao catalogo arquitetural (migracoes de infra com paralela obrigatoria); origem monitor-fundos 14e876f; ref lass 9f55684 |
| 2026-08-17 | `d607fbc` | — | `fresh-context/CLAUDE.md`, `validate-dod/templates/CLAUDE.md` | Remove stubs residuais do claude-mem (170 bytes, só o bloco `<claude-mem-context>`). Plugin desinstalado há meses; varredura global achou 43 cópias em 8 repos |
