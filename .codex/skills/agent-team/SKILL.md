---
name: agent-team
description: Orquestrar trabalho paralelo no Codex usando subagentes `explorer`, `worker` e `awaiter`. Use quando houver 3+ subtarefas independentes, pesquisa paralela, implementação em arquivos disjuntos, ou testes e esperas longas.
---

# Agent Team — Codex Multi-Agent

Guia operacional para portar a estratégia de subagentes e teammates do Claude para o modelo multi-agente atual do Codex.

No Codex atual, o equivalente prático de "agent team" é um fluxo **lead-led**:
- o agente principal decide a decomposição do trabalho
- o agente principal spawna subagentes especializados
- o agente principal faz relay de findings entre eles
- o agente principal consolida, valida e commita

## Regra de Ouro

> **Lead coordena e commita. Subagentes investigam, implementam ou aguardam. Ninguém edita docs core fora do lead.**

## Mapeamento Claude -> Codex

| Claude | Codex |
|--------|-------|
| Lead + agent team | Sessão principal + subagentes |
| Research teammate | `explorer` |
| Implementer/test teammate | `worker` |
| Teammate aguardando testes/monitoramento | `awaiter` |
| Delegate mode / task list compartilhada | Convenção operacional do lead |
| Chat direto entre teammates | Relay feito pelo lead |

## Quando Usar

- Pesquisa paralela antes de implementar
- 3+ subtarefas independentes com ownership claro de arquivos
- Implementação separada de review ou verificação
- Testes demorados, monitoramento, polling ou qualquer espera longa
- Bugs complexos com hipóteses concorrentes

## Quando Não Usar

- Tarefa simples (<100 linhas, 1-2 arquivos)
- Dependência sequencial forte entre subtarefas
- Escopo ambíguo ou requisitos ainda indefinidos
- Subtarefas que inevitavelmente editariam o mesmo arquivo

## Tipos de Subagente

### `explorer`

Use para:
- perguntas específicas sobre o codebase
- pesquisas read-only em paralelo
- comparação de abordagens
- review de risco e identificação de edge cases

Regras:
- escopo estreito e objetivo único
- leitura only
- reportar findings com referências de arquivo
- se um `explorer` cobriu o problema, o lead não deve reabrir os mesmos arquivos sem motivo

### `worker`

Use para:
- implementar código
- escrever ou ajustar testes
- aplicar refactors localizados

Regras:
- atribua ownership explícito de arquivos ou diretórios
- diga sempre que o worker não está sozinho no codebase e deve ignorar mudanças alheias
- proíba docs core, commits e alterações fora do escopo

### `awaiter`

Use para:
- rodar testes demorados
- monitorar processo longo
- esperar deploy, indexação, crawler ou batch
- qualquer tarefa em que a sessão principal só precise aguardar e consolidar

Regras:
- use **sempre** para trabalho de espera
- o lead deve esperar com timeout longo
- o deliverable é status objetivo: passou/falhou/em andamento + evidência mínima

### `default`

Fallback para tarefas curtas e delimitadas que não cabem claramente em `explorer`, `worker` ou `awaiter`.

## Workflow Base

1. Ler `documents/core/Roadmap.md`.
2. Validar se vale paralelizar: 3+ deliverables independentes ou pesquisa/espera paralelizável.
3. Dividir trabalho em unidades autocontidas com deliverable claro.
4. Garantir ownership disjunto de arquivos para cada `worker`.
5. Spawnear subagentes com contexto suficiente e restrições explícitas.
6. Fazer relay dos findings relevantes entre subagentes; não presumir comunicação direta entre eles.
7. Esperar conclusão, consolidar resultados e só então seguir para quality gates.
8. Executar `pre-commit-check`, `validate-testing`, `organize-commits`, `update-docs` e `validate-dod` no lead, quando aplicável.

## Nível 1 — Parallel Research

### Composição

```
Lead
├── Explorer A: codebase e padrões existentes
├── Explorer B: abordagens e riscos
└── Explorer C (opcional): edge cases e conflitos
```

### Workflow

1. O lead define 2-3 perguntas de pesquisa independentes.
2. Cada `explorer` recebe pergunta, escopo e deliverable próprio.
3. O lead consolida os sumários recebidos.
4. Se houver divergência, o lead redistribui a divergência para um `explorer` ou decide a abordagem.

### Prompt Base — `explorer`

```text
Você é um subagente `explorer` no projeto {{PROJECT_NAME}}.

CONTEXTO:
- Milestone: {{MILESTONE_ID}} — {{MILESTONE_DESC}}
- Initiative: {{INITIATIVE_NAME}}
- Leia `.planning/README.md` e, se existir, `.planning/{{INITIATIVE_NAME}}/CONTEXT.md`

TAREFA:
{{RESEARCH_QUESTION}}

ESCOPO DE LEITURA:
{{DIRS_TO_ANALYZE}}

RESTRIÇÕES:
- Apenas leitura
- Não edite `documents/core/`
- Não faça git commit/add/push

DELIVERABLE:
1. Findings com referências `arquivo:linha`
2. Recomendação objetiva
3. Riscos e pontos em aberto
```

## Nível 2 — Parallel Sprint

### Composição

```
Lead
├── Worker A: implementação em arquivos do grupo 1
├── Worker B: implementação ou testes em arquivos do grupo 2
├── Explorer Reviewer: review read-only
└── Awaiter (quando preciso): executa testes ou observação longa
```

### Workflow

1. O lead mapeia tasks -> arquivos.
2. Cada `worker` recebe ownership disjunto.
3. O `explorer` reviewer recebe a lista de arquivos para review read-only.
4. Se os testes forem longos, o lead usa `awaiter` para executá-los.
5. Findings do reviewer ou awaiter voltam ao lead.
6. O lead redireciona correções aos `workers` apropriados.
7. O lead encerra os subagentes e executa os gates finais.

### Prompt Base — `worker`

```text
Você é um subagente `worker` no projeto {{PROJECT_NAME}}.

CONTEXTO:
- Milestone: {{MILESTONE_ID}} — {{MILESTONE_DESC}}
- Initiative: {{INITIATIVE_NAME}}
- Leia `.planning/README.md` e, se existir, `.planning/{{INITIATIVE_NAME}}/CONTEXT.md`

TASK:
{{TASK_DESCRIPTION}}

OWNERSHIP DE ARQUIVOS:
- {{FILE_1}}
- {{FILE_2}}

REGRAS:
- Você não está sozinho no codebase; ignore mudanças alheias fora do seu escopo
- Edite apenas os arquivos designados
- Não edite `documents/core/`
- Não faça git commit/add/push
- Não invoque skills de documentação

DELIVERABLE:
1. O que foi implementado
2. Decisões técnicas tomadas
3. Bloqueios, se houver
```

### Prompt Base — `awaiter`

```text
Você é um subagente `awaiter` no projeto {{PROJECT_NAME}}.

TAREFA DE ESPERA:
{{WAIT_TASK}}

COMANDO OU SINAL A ACOMPANHAR:
{{WAIT_COMMAND}}

REGRAS:
- Não implemente código novo
- Apenas execute, acompanhe e reporte status
- Se falhar, capture a menor evidência útil para o lead

DELIVERABLE:
1. Status final: PASS / FAIL / TIMEOUT / STILL-RUNNING
2. Evidência mínima relevante
3. Próximo passo sugerido
```

## Regras de Segurança

### Lead Only

- `git add/commit/push`
- editar `documents/core/Roadmap.md`
- editar `documents/core/Projeto.md`
- editar `.planning/README.md` ou criar estrutura em `.planning/`
- invocar `organize-commits`, `pre-commit-check`, `validate-dod`, `update-docs`

### Prevenção de Conflitos

Regra: **um conjunto de arquivos por worker**.

```text
CORRETO:
Worker A -> src/modulo_a/*
Worker B -> src/modulo_b/*
Worker Testes -> tests/modulo_a/*

ERRADO:
Worker A -> src/modulo_a/servico.py
Worker B -> src/modulo_a/servico.py
```

Se overlap for inevitável, serialize.

## Integração com Skills

| Skill | Quem Invoca | Quando |
|-------|-------------|--------|
| `validate-dor` | Lead | Antes de paralelizar |
| `fresh-context` | Lead | Antes de spawnar em contexto degradado |
| `pre-commit-check` | Lead | Depois dos subagentes |
| `validate-testing` | Lead | Após correções e antes do DoD |
| `organize-commits` | Lead | Depois da consolidação |
| `update-docs` | Lead | Após consolidação final |
| `validate-dod` | Lead | Ao concluir milestone |

## Changelog

### v1.0.0

- Criação inicial da skill
- Mapeamento explícito de `explorer`, `worker`, `awaiter` e `default`
- Prompts base para research, implementation e espera longa
- Regras de ownership e prevenção de conflito de arquivos

<!-- @runtime-placeholders: PROJECT_NAME, MILESTONE_ID, MILESTONE_DESC, INITIATIVE_NAME, TASK_DESCRIPTION, FILE_1, FILE_2, RESEARCH_QUESTION, DIRS_TO_ANALYZE, WAIT_TASK, WAIT_COMMAND -->
