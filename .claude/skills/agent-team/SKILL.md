---
name: agent-team
description: Orquestrar equipe de agentes para trabalho paralelo. Use quando tarefa tiver 3+ subtarefas independentes, quando milestone tiver tasks em arquivos diferentes, ou quando precisar de pesquisa paralela antes de implementar. Guia composição de equipe, spawn prompts, e coordenação.
---

# Agent Team — Orquestração Multi-Agente

Guia operacional para criar e coordenar equipes de agentes usando Agent Teams nativo do Claude Code.

## Escopo

Esta skill é **stack-agnostic**. Os spawn prompts usam placeholders (`{{FILE_1}}`, `{{SRC_DIR}}`, etc.) que devem ser preenchidos conforme a estrutura do projeto. Exemplos usam paths genéricos; adapte para o layout do seu projeto (ex.: `src/` para Python, `pkg/` para Go, `lib/` para Ruby, `src/main/java/` para Java).

## Regra de Ouro

> **"Lead coordena e commita. Teammates implementam e reportam. Ninguém edita docs core."**

## Quando Usar

- **Pesquisa paralela** antes de implementar (validar abordagem)
- **Tasks independentes** dentro de um milestone (arquivos diferentes)
- **Sprint completo** com fases research → implementation → test → review
- **Code review** com múltiplos revisores (segurança, performance, cobertura)

## Quando NÃO Usar

- Tarefa simples (<100 linhas, 1-2 arquivos)
- Tasks com dependência sequencial forte entre si
- Milestone que requer decisões incrementais do usuário
- Quando contexto do projeto é ambíguo (resolver ambiguidade primeiro)

## Input Esperado

```
agent-team [nível] [milestone-id]
```

Exemplos:
- `agent-team research M1.2` → Pesquisa paralela para M1.2
- `agent-team sprint M1.3` → Sprint paralelo para M1.3
- `agent-team pipeline M2.1` → Pipeline completo para M2.1
- `agent-team` → Auto-detecta nível adequado e milestone atual

## Nível 1 — Parallel Research

### Quando Usar

- Antes de implementar feature complexa
- Quando há múltiplas abordagens possíveis
- Para validar plano antes de execução (previne "wrong approach")

### Composição

```
Lead (Opus/Sonnet): coordena, sintetiza, decide
├── Researcher A (Haiku): analisa codebase e padrões existentes
├── Researcher B (Haiku): pesquisa abordagens e best practices
└── Researcher C (Haiku): identifica riscos, edge cases, e conflitos
```

**Custo estimado:** Baixo (Haiku para pesquisa)

### Workflow

```
1. Lead lê Roadmap.md + TODO.md do milestone
2. Lead define 2-3 perguntas de pesquisa independentes
3. Lead spawna researchers com prompts focados
4. Researchers investigam em paralelo (leitura only)
5. Lead sintetiza findings em decisão de approach
6. Lead apresenta recomendação ao usuário
7. Após aprovação, Lead implementa (ou escala para Nível 2)
```

### Spawn Prompts — Research

> **Spawn prompts:** Leia `spawn-researcher.md` e use a seção correspondente:
> - Researcher A (análise de codebase) → seção "Researcher A — Análise de Codebase"
> - Researcher B (abordagens) → seção "Researcher B — Abordagens e Best Practices"

---

## Nível 2 — Parallel Sprint

### Quando Usar

- Milestone com 3+ tasks independentes
- Tasks tocam **arquivos diferentes** (sem conflito de merge)
- Cada task é autocontida (produz deliverable claro)

### Composição

```
Lead (Opus/Sonnet, delegate mode): distribui tasks, valida, commita
├── Implementer (Sonnet): implementa módulos designados
├── Tester (Sonnet): escreve testes para módulos prontos
└── Reviewer (Haiku): review de código + segurança (read-only)
```

**Custo estimado:** Médio (Sonnet para implementação)

### Workflow

```
1. Lead lê Roadmap.md + TODO.md do milestone
2. Lead mapeia tasks → arquivos (garantir zero overlap)
3. Lead entra em delegate mode (Shift+Tab)
4. Lead spawna teammates com tasks e arquivos designados
5. Implementer(s) trabalham em arquivos designados
6. Tester trabalha nos diretórios de testes para módulos já prontos
7. Reviewer faz review read-only e reporta findings
8. Lead valida resultados (pre-commit-check)
9. Lead organiza commits atômicos (organize-commits)
10. Lead atualiza docs (update-docs)
```

### Spawn Prompts — Sprint

> **Spawn prompts por role:**
> - Implementer → Leia `spawn-implementer.md` e use como base para o spawn
> - Tester → Leia `spawn-tester.md` e use como base para o spawn
> - Reviewer → Leia `spawn-reviewer.md` e use como base para o spawn

---

## Nível 3 — Full Pipeline

### Quando Usar

- Sprint completo com múltiplas fases
- Milestone grande que beneficia de research antes de implementation
- Quando usuário quer execução máxima autônoma

### Composição (por fase)

```
Lead (Opus, delegate mode): orquestra todas as fases

Fase 1 — Research (paralelo, Haiku):
├── Researcher A: codebase analysis
└── Researcher B: approach validation

Fase 2 — Implementation (paralelo, Sonnet):
├── Implementer A: módulos grupo 1
└── Implementer B: módulos grupo 2
    (Tester pode iniciar quando módulos prontos)

Fase 3 — Quality (Lead, sequencial):
├── pre-commit-check
├── validate-testing
└── organize-commits

Fase 4 — Documentation (Lead, sequencial):
├── update-docs task [milestone-id]
└── validate-dod [milestone-id]
```

### Workflow

```
1. Lead lê Roadmap.md + TODO.md
2. Lead executa Fase 1 (research paralelo)
3. Lead sintetiza findings e apresenta approach ao usuário
4. Após aprovação, Lead executa Fase 2 (implementation paralelo)
5. Lead monitora progresso via task list (Ctrl+T)
6. Após implementation, Lead executa Fase 3 (quality gates)
7. Se gates passam, Lead executa Fase 4 (documentation)
8. Lead reporta resultado final com evidências
```

---

## Regras de Segurança (Reforço)

### Lead Only (NUNCA delegar)

| Ação | Por que Lead Only |
|------|-------------------|
| `git add/commit/push` | Atomic commits com rastreamento em TODO.md |
| Editar `TODO.md` | Single Source of Truth para tracking |
| Editar `Roadmap.md` | Single Source of Truth para timeline |
| Editar `Projeto.md` | Single Source of Truth para decisões |
| `organize-commits` | Requer visão global de todas as mudanças |
| `pre-commit-check` | Gate que valida trabalho consolidado |
| `validate-dod` | Gate final do milestone |
| `update-docs` | Atualiza docs core com visão global |

### Acesso a `.planning/`

**Teammates PODEM:**
- Ler `.planning/README.md` (mapeamento milestone→initiative)
- Ler `.planning/<initiative>/CONTEXT.md` (contexto vivo)
- Ler `.planning/<initiative>/handoff/<id>-CONTEXT.md` (snapshots)

**Teammates NÃO PODEM:**
- Editar `.planning/README.md` (Lead only — mantém mapeamento)
- Criar diretórios em `.planning/` (Lead only)
- Editar `patches/{slug}/plan.md` (Lead only)

### Prevenção de Conflitos de Arquivo

**Regra:** Cada teammate trabalha em **conjunto disjunto de arquivos**.

```
# CORRETO (exemplo — adapte paths para o layout do projeto):
Implementer A → {{SRC_DIR}}/module_a/file_a.ext, {{SRC_DIR}}/module_a/file_b.ext
Implementer B → {{SRC_DIR}}/module_b/file_c.ext, {{SRC_DIR}}/module_b/file_d.ext
Tester        → {{TEST_DIR}}/test_module_a.ext, {{TEST_DIR}}/test_module_b.ext

# ERRADO:
Implementer A → {{SRC_DIR}}/module_a/file_a.ext
Implementer B → {{SRC_DIR}}/module_a/file_a.ext  ← CONFLITO!
```

Se overlap for inevitável, **serializar** (não paralelizar) essas tasks.

---

## Monitoramento e Steering

### Durante Execução

- **Ctrl+T**: Toggle task list (ver progresso)
- **Shift+Up/Down**: Navegar entre teammates
- **Enter em teammate**: Ver sessão do teammate
- **Escape**: Interromper turn do teammate

### Sinais de Problema

| Sinal | Ação |
|-------|------|
| Teammate parado há muito tempo | Enviar mensagem perguntando status |
| Task marcada completa sem evidência | Hook `TaskCompleted` bloqueia automaticamente |
| Teammate editando arquivo errado | Interromper (Escape) e redirecionar |
| Conflito de arquivo detectado | Parar teammates, resolver, redistribuir |

---

## Exemplo Completo — Nível 2 Sprint

```
Usuário: agent-team sprint {{MILESTONE_ID}}

Lead:
# Preparação
1. Lê Roadmap.md → {{MILESTONE_ID}} tem 3 tasks independentes
2. Lê TODO.md → Tasks: T01, T02, T03 (em arquivos diferentes)
3. Mapeia tasks → arquivos (garantir zero overlap entre teammates)

# Criação de equipe
"Crie uma equipe com 2 teammates Sonnet para implementar {{MILESTONE_ID}} em
 paralelo. Teammate 'impl-a': implementar T01 nos arquivos designados.
 Teammate 'impl-b': implementar T02+T03 nos arquivos designados."

# Ativar delegate mode (Shift+Tab)

# Monitorar progresso (Ctrl+T)
# Quando teammates terminarem:
# - Rodar pre-commit-check
# - organize-commits
# - update-docs task {{MILESTONE_ID}}
# - validate-dod {{MILESTONE_ID}}
```

---

## Integração com Skills Existentes

| Skill | Quem Invoca | Quando |
|-------|-------------|--------|
| `validate-dor` | Lead | Antes de criar equipe |
| `fresh-context` | Lead | Se contexto >150k antes de spawnar |
| `pre-commit-check` | Lead | Após teammates terminarem |
| `organize-commits` | Lead | Após pre-commit-check |
| `validate-testing` | Lead (ou hook automático) | Antes de marcar task completa |
| `validate-dod` | Lead | Ao finalizar milestone |
| `update-docs` | Lead | Após validate-dod |

---

## Skills Relacionadas

- `fresh-context` — Handoff context para initiative
- `pre-commit-check` — Gate de qualidade (Lead only)
- `organize-commits` — Atomic commits (Lead only)
- `validate-dor` — Gate antes de iniciar milestone
- `validate-dod` — Gate ao completar milestone

---

## Changelog

### v1.1.0

**Initiative-Based Planning:**
- Todos os spawn prompts incluem `INITIATIVE_NAME` + instrução para ler `.planning/README.md` e `<initiative>/CONTEXT.md`
- Adicionada subsection "Acesso a `.planning/`" nas Regras de Segurança
- Adicionado `INITIATIVE_NAME` ao `@runtime-placeholders`

### v1.0.0

**Criação Inicial:**
- Três níveis de orquestração (research, sprint, pipeline)
- Templates de spawn prompts por role
- Regras de segurança para teammates
- Integração com quality gate hooks
- Integração com skills existentes do template

<!-- @runtime-placeholders: MILESTONE_ID, MILESTONE_DESC, INITIATIVE_NAME, TASK_DESCRIPTION, FILE_1, FILE_2, SRC_DIR, TEST_DIR, TEST_DIR_INTEGRATION, TEST_FILES, MODULES_TO_TEST, FILES_TO_REVIEW, RESEARCH_QUESTION_A, RESEARCH_QUESTION_B, DIRS_TO_ANALYZE -->
