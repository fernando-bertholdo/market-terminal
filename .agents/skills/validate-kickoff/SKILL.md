---
name: validate-kickoff
description: Validar completude do kickoff verificando placeholders não preenchidos. Use após executar o kickoff-prompt para garantir que todos os placeholders foram substituídos, comentários de instrução foram removidos, e valores são consistentes entre arquivos. Usa discovery dinâmico — detecta automaticamente novos arquivos e placeholders sem necessidade de mapa central.
---

# Skill: validate-kickoff

Validar completude do kick-off verificando placeholders não preenchidos em todo o projeto.

## Escopo

Esta skill é **stack-agnostic** e **auto-adaptável**. Ela escaneia dinamicamente todos os arquivos do projeto por padrões `{{...}}`, respeitando anotações de classificação distribuída. Não depende de uma lista fixa de arquivos ou placeholders — qualquer adição ou remoção futura de arquivos é automaticamente contemplada.

## Quando Usar

- **OBRIGATORIAMENTE** após executar o kick-off prompt
- Periodicamente durante Fase 0 (para pegar placeholders esquecidos)
- Após adicionar novos arquivos ao template (para validar que placeholders foram preenchidos)
- Antes do primeiro commit de um projeto derivado do template

## Input Esperado

```
validate-kickoff [modo]
```

Exemplos:
- `validate-kickoff` → Validação completa (default)
- `validate-kickoff quick` → Apenas contagem de placeholders por arquivo
- `validate-kickoff consistency` → Foca em verificar consistência entre arquivos

## Convenção de Anotações

Esta skill depende de duas anotações HTML que classificam placeholders:

### `@kickoff-exclude`

Marca um arquivo inteiro como excluído da validação. Usado em arquivos que **documentam** placeholders como instrução (não como valores a preencher).

```markdown
<!-- @kickoff-exclude -->
```

**Quando usar:** Em prompts, guias, e templates de referência que mencionam `{{PLACEHOLDER}}` como exemplo ou instrução.

### `@runtime-placeholders`

Declara quais placeholders naquele arquivo são **preenchidos dinamicamente** em tempo de execução (não durante kickoff). Formato: lista separada por vírgulas.

```markdown
<!-- @runtime-placeholders: VAR_1, VAR_2, VAR_3 -->
```

**Quando usar:** Em skills com spawn prompts, templates de contexto, ou qualquer arquivo onde `{{...}}` é parte do design operacional (preenchido pelo agente ao invocar a skill).

### Regra Default

**Todo `{{...}}` é considerado kickoff-time por padrão.** Se um placeholder é runtime, o arquivo que o contém deve declará-lo explicitamente via `@runtime-placeholders`. Isso garante que novos arquivos adicionados ao template sejam automaticamente validados.

## Workflow

### 1. Escanear Arquivos

```
Para cada arquivo no projeto (exceto .git/, node_modules/, venv/, __pycache__/):
  Se arquivo contém <!-- @kickoff-exclude -->:
    → Pular arquivo inteiro
  Se arquivo contém {{...}} patterns:
    → Coletar todos os placeholders encontrados
    → Ler <!-- @runtime-placeholders: ... --> se presente
    → Classificar cada placeholder como kickoff ou runtime
```

### 2. Classificar Placeholders

```
Para cada placeholder {{VAR}} encontrado em um arquivo:
  Se VAR está listado no @runtime-placeholders desse arquivo:
    → Classificar como RUNTIME (ignorar na validação)
  Senão:
    → Classificar como KICKOFF (deve ter sido preenchido)
    → Adicionar à lista de não-preenchidos
```

### 3. Verificar Consistência

```
Para cada placeholder kickoff que foi preenchido em ALGUM arquivo mas não em TODOS:
  → Reportar inconsistência
  Exemplo: {{PROJECT_NAME}} = "Monitor Fundos" em README.md
           {{PROJECT_NAME}} ainda como placeholder em documents/README.md
```

### 4. Verificar Comentários de Instrução

```
Escanear por blocos <!-- que contenham:
  - "INSTRUÇÃO" / "INSTRUÇÕES"
  - "PREENCHER" / "Preencher"
  - "Substitua" / "substitua"
  → Estes deveriam ter sido removidos após o kickoff
```

### 5. Gerar Relatório

```markdown
# Kickoff Validation Report

**Data:** [YYYY-MM-DD HH:MM]
**Status Geral:** COMPLETO | INCOMPLETO | INCONSISTENTE

## Sumário

- Arquivos escaneados: X
- Arquivos excluídos (@kickoff-exclude): Y
- Placeholders kickoff encontrados: Z (não preenchidos)
- Placeholders runtime (ignorados): W
- Inconsistências: N
- Comentários de instrução restantes: M

## Placeholders Não Preenchidos

### CRITICAL (identidade do projeto)

| Placeholder | Arquivo(s) | Linha(s) |
|-------------|-----------|----------|
| {{PROJECT_NAME}} | .agents/AGENTS.md | 1, 3 |
| {{RESPONSIBLE_NAME}} | documents/core/Projeto.md | 20 |

### HIGH (comandos de stack)

| Placeholder | Arquivo(s) | Linha(s) |
|-------------|-----------|----------|
| {{TEST_COMMAND}} | .agents/skills/pre-commit-check/SKILL.md | 97, 162 |
| {{LINT_COMMAND}} | .agents/skills/pre-commit-check/SKILL.md | 50, 154 |

### MEDIUM (conteúdo de documentação)

| Placeholder | Arquivo(s) | Linha(s) |
|-------------|-----------|----------|
| {{MAIN_OBJECTIVE}} | documents/core/Projeto.md | 45 |

## Inconsistências

| Placeholder | Valor em... | Ainda placeholder em... |
|-------------|------------|------------------------|
| {{PROJECT_NAME}} | README.md → "Meu Projeto" | documents/README.md → {{PROJECT_NAME}} |

## Comentários de Instrução Restantes

| Arquivo | Linha | Trecho |
|---------|-------|--------|
| .agents/AGENTS.md | 259 | <!-- Preencher com os scopes... |

## Placeholders Runtime (Referência)

Estes placeholders foram corretamente ignorados (são templates dinâmicos):

| Arquivo | Placeholders Runtime |
|---------|---------------------|
| .agents/skills/agent-team/SKILL.md | MILESTONE_ID, TASK_DESCRIPTION, FILE_1, ... |

## Próximos Passos

[ ] Preencher X placeholders CRITICAL restantes
[ ] Preencher Y placeholders HIGH restantes
[ ] Resolver N inconsistências
[ ] Remover M comentários de instrução
[ ] Re-executar validate-kickoff para confirmar
```

## Severidade dos Placeholders

A severidade é determinada pelo tipo do placeholder:

| Severidade | Critério | Exemplos |
|-----------|----------|----------|
| **CRITICAL** | Identidade do projeto (aparecem em múltiplos arquivos, afetam operação diária) | `PROJECT_NAME`, `RESPONSIBLE_NAME`, `COMMIT_SCOPES`, `AUTHOR_NAME`, `ORGANIZATION_NAME` |
| **HIGH** | Comandos de stack (bloqueiam skills operacionais se não preenchidos) | `TEST_COMMAND`, `LINT_COMMAND`, `FORMAT_COMMAND`, `COVERAGE_COMMAND`, `TYPECHECK_COMMAND`, `DEPS_UPGRADE_COMMAND` |
| **MEDIUM** | Conteúdo de documentação (importante mas não bloqueia operação) | `MAIN_OBJECTIVE`, `PROJECT_DESCRIPTION`, `MILESTONE_NAME`, `RISK_NAME`, etc. |
| **LOW** | Metadata e datas (fáceis de preencher, baixo impacto) | `DATE`, `START_DATE`, `END_DATE` |

## Comandos de Apoio

Para execução manual dos passos do scan:

```bash
# Listar TODOS os arquivos com placeholders (exceto kickoff-exclude)
grep -rl '{{' --include='*.md' --include='*.json' --include='*.toml' --include='*.sh' . \
  | xargs grep -lL '@kickoff-exclude' 2>/dev/null

# Contar placeholders não preenchidos por arquivo
grep -rn '{{[A-Z_]*}}' --include='*.md' --include='*.json' --include='*.toml' . \
  | grep -v '@kickoff-exclude' \
  | grep -v '@runtime-placeholders'

# Listar apenas placeholders únicos
grep -roh '{{[A-Z_]*}}' --include='*.md' --include='*.json' --include='*.toml' . \
  | sort -u

# Buscar comentários de instrução restantes
grep -rn 'INSTRUÇÃO\|PREENCHER\|Preencher\|Substitua' --include='*.md' . \
  | grep '<!--'
```

## Regras

1. **Todo `{{...}}` é kickoff por default** — Se não está declarado como `@runtime-placeholders`, deve ser preenchido
2. **Sem mapa central** — A classificação é distribuída (cada arquivo declara seus runtime placeholders)
3. **Novos arquivos são automaticamente cobertos** — Qualquer arquivo adicionado com `{{...}}` será detectado
4. **Consistência é obrigatória** — Mesmo placeholder deve ter mesmo valor em todos os arquivos
5. **Comentários de instrução devem ser removidos** — `<!-- INSTRUÇÕES DE PREENCHIMENTO -->` são helpers do template, não do projeto final

## Integração com Outros Skills

| Skill | Relação |
|-------|---------|
| `kickoff-prompt` (prompt) | Executar antes do validate-kickoff |
| `validate-docs-links` | Complementar: validate-kickoff valida placeholders, validate-docs-links valida links |
| `pre-commit-check` | Se validate-kickoff reporta CRITICAL, pre-commit-check deveria bloquear |
| `audit-rules` | Complementar: audit-rules valida integridade de regras, validate-kickoff valida preenchimento |

## Convenção para Novos Arquivos

Ao adicionar novos arquivos ao template com placeholders `{{...}}`:

1. **Se todos os placeholders são kickoff-time:** Nenhuma anotação necessária (default)
2. **Se alguns placeholders são runtime:** Adicionar `<!-- @runtime-placeholders: VAR_1, VAR_2 -->` no final do arquivo
3. **Se o arquivo documenta placeholders sem usá-los:** Adicionar `<!-- @kickoff-exclude -->` no início do arquivo

## Exemplo de Uso

```
User: validate-kickoff

Claude:
# Kickoff Validation Report

**Data:** 2026-02-07 15:30
**Status Geral:** INCOMPLETO

## Sumário
- Arquivos escaneados: 33
- Arquivos excluídos: 3
- Placeholders kickoff não preenchidos: 12
- Placeholders runtime ignorados: 14
- Inconsistências: 1
- Comentários de instrução restantes: 4

## Placeholders Não Preenchidos

### CRITICAL (2)
| Placeholder | Arquivo(s) |
|-------------|-----------|
| {{COMMIT_SCOPES}} | .agents/AGENTS.md, .agents/AGENTS.md, README.md |
| {{ORGANIZATION_NAME}} | README.md, documents/core/Projeto.md |

### HIGH (4)
| Placeholder | Arquivo(s) |
|-------------|-----------|
| {{TEST_COMMAND}} | pre-commit-check/SKILL.md, validate-testing/SKILL.md, security-best-practices.md |
| {{LINT_COMMAND}} | pre-commit-check/SKILL.md |
| {{FORMAT_COMMAND}} | pre-commit-check/SKILL.md |
| {{COVERAGE_COMMAND}} | pre-commit-check/SKILL.md, validate-testing/SKILL.md |

### MEDIUM (6)
...

## Próximos Passos
[ ] Definir COMMIT_SCOPES baseado na arquitetura do projeto
[ ] Configurar comandos de stack (TEST_COMMAND, LINT_COMMAND, etc.)
[ ] Preencher 6 placeholders de documentação restantes
[ ] Remover 4 comentários de instrução
[ ] Re-executar validate-kickoff
```

---

**Versao:** 1.0.0
**Ultima atualizacao:** Template
