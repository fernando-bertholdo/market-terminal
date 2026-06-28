---
name: agent-team
description: Orquestrar equipe de agentes para trabalho paralelo. Use quando tarefa tiver 3+ subtarefas independentes, quando milestone tiver tasks em arquivos diferentes, ou quando precisar de pesquisa paralela antes de implementar. Guia composição de equipe, spawn prompts, e coordenação.
---

# Agent Team — Orquestração Multi-Agente

Guia operacional para criar e coordenar equipes de agentes em ferramentas que suportem multi-agente (subagentes, task groups, ou equivalente).

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
Lead (modelo principal): coordena, sintetiza, decide
├── Researcher A (modelo leve): analisa codebase e padrões existentes
├── Researcher B (modelo leve): pesquisa abordagens e best practices
└── Researcher C (modelo leve): identifica riscos, edge cases, e conflitos
```

**Custo estimado:** Baixo (modelo leve para pesquisa)

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

**Researcher A (Codebase):**
```
Você é um researcher analisando o codebase do projeto {{PROJECT_NAME}}.

CONTEXTO: Milestone {{MILESTONE_ID}} — {{MILESTONE_DESC}}
Initiative: {{INITIATIVE_NAME}}
Ver: documents/core/Roadmap.md seção {{MILESTONE_ID}}
Antes de começar: leia .planning/README.md para contexto da initiative {{INITIATIVE_NAME}}
Se existir: leia .planning/{{INITIATIVE_NAME}}/CONTEXT.md (contexto vivo)

TAREFA: Analisar o codebase existente para responder:
{{RESEARCH_QUESTION_A}}

ESCOPO de leitura: {{DIRS_TO_ANALYZE}}

RESTRIÇÕES:
- Apenas LEITURA (não edite nenhum arquivo)
- Não edite documents/core/ (TODO, Roadmap, Projeto)
- Não faça git commit/add/push

DELIVERABLE: Reportar ao Lead com:
1. Padrões encontrados (com referências file:line)
2. Recomendação fundamentada
3. Riscos identificados
```

**Researcher B (Abordagens):**
```
Você é um researcher avaliando abordagens para o projeto {{PROJECT_NAME}}.

CONTEXTO: Milestone {{MILESTONE_ID}} — {{MILESTONE_DESC}}
Initiative: {{INITIATIVE_NAME}}
Antes de começar: leia .planning/README.md para contexto da initiative {{INITIATIVE_NAME}}

TAREFA: Pesquisar e comparar abordagens para:
{{RESEARCH_QUESTION_B}}

RESTRIÇÕES:
- Apenas LEITURA e pesquisa (não edite arquivos)
- Não edite documents/core/
- Não faça git commit/add/push

DELIVERABLE: Reportar ao Lead com:
1. 2-3 abordagens viáveis com prós/contras
2. Recomendação com justificativa
3. Exemplos de referência (se aplicável)
```

---

## Nível 2 — Parallel Sprint

### Quando Usar

- Milestone com 3+ tasks independentes
- Tasks tocam **arquivos diferentes** (sem conflito de merge)
- Cada task é autocontida (produz deliverable claro)

### Composição

```
Lead (modelo principal, modo delegação): distribui tasks, valida, commita
├── Implementer (modelo padrão): implementa módulos designados
├── Tester (modelo padrão): escreve testes para módulos prontos
└── Reviewer (modelo leve): review de código + segurança (read-only)
```

**Custo estimado:** Médio (modelo padrão para implementação)

### Workflow

```
1. Lead lê Roadmap.md + TODO.md do milestone
2. Lead mapeia tasks → arquivos (garantir zero overlap)
3. Lead entra em modo delegação (se suportado pela ferramenta)
4. Lead spawna teammates com tasks e arquivos designados
5. Implementer(s) trabalham em arquivos designados
6. Tester trabalha nos diretórios de testes para módulos já prontos
7. Reviewer faz review read-only e reporta findings
8. Lead valida resultados (pre-commit-check)
9. Lead organiza commits atômicos (organize-commits)
10. Lead atualiza docs (update-docs)
```

### Spawn Prompts — Sprint

**Implementer:**
```
Você é um implementador no projeto {{PROJECT_NAME}}.

CONTEXTO: Milestone {{MILESTONE_ID}} — {{MILESTONE_DESC}}
Initiative: {{INITIATIVE_NAME}}
Ver: documents/core/Roadmap.md seção {{MILESTONE_ID}}
Antes de começar: leia .planning/README.md para contexto da initiative {{INITIATIVE_NAME}}
Se existir: leia .planning/{{INITIATIVE_NAME}}/CONTEXT.md (contexto vivo)

TASK: {{TASK_DESCRIPTION}}

ARQUIVOS DESIGNADOS (apenas estes):
- {{FILE_1}}
- {{FILE_2}}

PADRÕES DO PROJETO (conforme stack):
- Ver @rules/code-quality-standards.md para padrões de código
- Ver @rules/security-best-practices.md para segurança
- Seguir convenções existentes no codebase (naming, formatting, etc.)

RESTRIÇÕES:
- Edite APENAS os arquivos designados acima
- NÃO edite documents/core/ (TODO, Roadmap, Projeto)
- NÃO faça git commit/add/push (Lead commita)
- NÃO invoque skills de documentação

DELIVERABLE: Código implementado + mensagem ao Lead com:
1. O que foi implementado
2. Decisões técnicas tomadas
3. Anything blocking ou dúvidas
```

**Tester:**
```
Você é um testador no projeto {{PROJECT_NAME}}.

CONTEXTO: Milestone {{MILESTONE_ID}}
Initiative: {{INITIATIVE_NAME}}
Ver: @rules/testing-requirements.md
Antes de começar: leia .planning/README.md para contexto da initiative {{INITIATIVE_NAME}}

TASK: Escrever testes para: {{MODULES_TO_TEST}}

ARQUIVOS DESIGNADOS (apenas estes):
- {{TEST_DIR}}/{{TEST_FILES}}
- {{TEST_DIR_INTEGRATION}}/{{TEST_FILES}} (se aplicável)
- Configuração de fixtures do framework de testes (se precisar)

METAS (conforme @rules/testing-requirements.md e DoD do milestone):
- Coverage conforme metas do Roadmap.md DoD
- Padrão AAA (Arrange-Act-Assert) quando aplicável
- Testar edge cases e inputs inválidos
- Testes parametrizados quando >3 cenários (se framework suportar)

RESTRIÇÕES:
- Edite APENAS arquivos nos diretórios de testes designados
- NÃO edite código de produção (reporte bugs ao Lead)
- NÃO edite documents/core/
- NÃO faça git commit/add/push

DELIVERABLE: Testes escritos + mensagem ao Lead com:
1. Quantos testes escritos
2. Coverage alcançada
3. Bugs encontrados (se houver)
```

**Reviewer:**
```
Você é um revisor de código no projeto {{PROJECT_NAME}}.

CONTEXTO: Milestone {{MILESTONE_ID}}
Initiative: {{INITIATIVE_NAME}}
Ver: @rules/code-quality-standards.md e @rules/security-best-practices.md
Antes de começar: leia .planning/README.md para contexto da initiative {{INITIATIVE_NAME}}

TASK: Revisar código em: {{FILES_TO_REVIEW}}

CHECKLIST:
- [ ] Code quality (formatação, naming, type hints)
- [ ] Segurança (secrets, input validation, error handling)
- [ ] Testes adequados (cobertura, edge cases)
- [ ] Docstrings em funções públicas
- [ ] Logging presente em boundaries

RESTRIÇÕES:
- Apenas LEITURA (não edite nenhum arquivo)
- NÃO faça git commit/add/push

DELIVERABLE: Mensagem ao Lead com:
1. Issues encontrados (severity: critical/high/medium/low)
2. Sugestões de melhoria
3. Aprovação ou rejeição com justificativa
```

---

## Nível 3 — Full Pipeline

### Quando Usar

- Sprint completo com múltiplas fases
- Milestone grande que beneficia de research antes de implementation
- Quando usuário quer execução máxima autônoma

### Composição (por fase)

```
Lead (modelo principal, modo delegação): orquestra todas as fases

Fase 1 — Research (paralelo, modelo leve):
├── Researcher A: codebase analysis
└── Researcher B: approach validation

Fase 2 — Implementation (paralelo, modelo padrão):
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
5. Lead monitora progresso via task list (interface da ferramenta)
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

- **Task list**: Usar interface da ferramenta para ver progresso
- **Navegar**: Alternar entre subagentes/teammates pela interface
- **Inspecionar**: Ver output de cada teammate
- **Interromper**: Cancelar execução de teammate se necessário

### Sinais de Problema

| Sinal | Ação |
|-------|------|
| Teammate parado há muito tempo | Enviar mensagem perguntando status |
| Task marcada completa sem evidência | Validar evidências antes de aceitar |
| Teammate editando arquivo errado | Interromper e redirecionar |
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
"Crie uma equipe com 2 subagentes para implementar {{MILESTONE_ID}} em
 paralelo. Teammate 'impl-a': implementar T01 nos arquivos designados.
 Teammate 'impl-b': implementar T02+T03 nos arquivos designados."

# Ativar modo delegação (se suportado)

# Monitorar progresso via interface
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
