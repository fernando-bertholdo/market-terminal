---
name: pre-commit-check
description: Checklist completo de qualidade e validações antes de git commit. Use SEMPRE antes de fazer commit, incluindo validações de code quality, testing, security, e git status. Este é um gate de qualidade obrigatório para garantir que apenas código bem estruturado e testado seja commitado.
---

# Pre-Commit Check

Checklist completo de qualidade antes de git commit.

## Quando Usar

- ✅ **SEMPRE** antes de git commit
- ✅ Automatizado via git hooks (futuro)

## O Que Valida

### 0. Stack / Tooling (OBRIGATÓRIO)

- **Fonte de verdade:** `documents/core/Projeto.md` (stack + comandos oficiais de tooling).
- Confirme arquivos “marcadores” do stack no repo (ex.: `pyproject.toml`, `package.json`, `go.mod`, `Cargo.toml`, etc.).
- Se o stack/tooling **não** estiver definido: **BLOQUEIE o commit** e reporte a lacuna — definir o stack é trabalho de Fase 0, e o gate reporta, não escreve documento core.

### 1. Code Quality

Validação completa de qualidade de código (por stack).

> **Python (quando aplicável):** se o projeto usa o stack Python (ex.: `pyproject.toml` + `.agents/stacks/python/`),
> o baseline recomendado é `ruff + mypy` (evita drift entre formatter/imports/lint).

**Comandos:**

```bash
# Formatação (deve passar sem erros)
ruff format --check src/ tests/

# Lint + imports (inclui organização de imports e regras de modernização)
ruff check src/ tests/

# Type checking (recomendado)
mypy src/
```

**Outros stacks (obrigatório):**
- Execute o **formatter**, **linter** e (se aplicável) **typecheck** definidos em `documents/core/Projeto.md` (ou no starter pack do stack).
- Se ainda não existir comando oficial do stack, defina primeiro (Fase 0) — **não** “chute” ferramentas.

Exemplo (preencher):
```bash
{{FORMAT_COMMAND}}
{{LINT_COMMAND}}
{{TYPECHECK_COMMAND}}
```

**Critérios de Aprovação:**

| Validação | Meta | Bloqueador |
|-----------|------|------------|
| ruff format --check | 0 diffs | ✅ Sim |
| ruff check | 0 violations | ✅ Sim |
| mypy | 0 errors | ✅ Sim |
| docstrings | 100% públicas | ⚠️ MVP: >80% |
| type hints | 100% públicas | ⚠️ MVP: >80% |
| secrets | 0 hardcoded | ✅ Sim (crítico) |

**Auto-fix disponível:**

```bash
ruff format src/ tests/         # Formatar código
ruff check src/ tests/ --fix    # Auto-fix de lint/imports
```

**Busca de secrets (CRÍTICO):**

```bash
# Patterns que NUNCA devem existir
rg -n "password\\s*=\\s*['\\\"]" src/
rg -n "api_key\\s*=\\s*['\\\"]" src/
rg -n "SECRET\\s*=\\s*['\\\"]" -S src/
```

### 2. Testing

Executa a suíte de testes e valida cobertura conforme o DoD (metas do projeto/milestone).

**Comandos:**

```bash
# Python (quando aplicável) — exemplo
pytest
pytest --cov=src --cov-report=term-missing
pytest --cov=src --cov-fail-under=80
```

**Outros stacks — execute os comandos definidos em `documents/core/Projeto.md`:**

```bash
{{TEST_COMMAND}}
{{COVERAGE_COMMAND}}
```

**Critérios de Aprovação:**

| Validação | Meta | Bloqueador |
|-----------|------|------------|
| Testes passam | 100% | ✅ Sim |
| Coverage overall | >80% | ✅ Sim |
| Coverage business logic | >90% | ✅ Sim |

### 3. Security
Validações de segurança.

**Verifica:**
- .env não staged (git status)
- .env.example atualizado (se necessário)
- Nenhum credential em código (já validado em code-quality)
- Manifesto de dependências do stack atualizado (ex.: `requirements*.txt`, `package*.json`, `go.mod/go.sum`, etc.)

### 4. Git Status
Valida estado do repositório.

**Verifica:**
- Arquivos corretos staged
- Nenhum arquivo sensível staged (.env, credentials)
- Mensagem de commit planejada (conventional)

### 5. Opcional (Recomendado)
Validações adicionais conforme contexto.

**Se alterou regras:**
```bash
audit-rules quick
```

**Se alterou docs:**
```bash
validate-docs-links check
```

### 6. Scripts Governance

Se o commit toca `scripts/**`, validar:

**Comandos:**

```bash
# Cruft check (mesmo do hook check-scripts-cruft.sh)
git diff --cached --name-only | grep -E '^scripts/.*(__pycache__|\.DS_Store|\.pyc)$' && echo "❌ Cruft detectado" || echo "✅ Sem cruft"

# Drift check: scripts novos no commit que não estão em INDEX
# INDEX usa paths relativos a scripts/ (ex: `setup/init-from-template.sh`),
# por isso stripamos o prefixo "scripts/" antes de comparar.
git diff --cached --name-only --diff-filter=A | grep -E '^scripts/.+\.(sh|py)$' | while read f; do
  rel="${f#scripts/}"
  grep -q "\`$rel\`" scripts/INDEX.md || echo "⚠️  $f não está em scripts/INDEX.md"
done
```

**Critérios de Aprovação:**

| Validação | Meta | Bloqueador |
|-----------|------|------------|
| Cruft em scripts/** | 0 arquivos | ✅ Sim |
| Scripts novos em INDEX | 100% | ✅ Sim |
| Categoria correta | Glossário do README | ⚠️ Review |

> **Referência:** rule [`.claude/rules/scripts-governance.md`](../../../.claude/rules/scripts-governance.md) — o Claude Code a carrega ao editar `scripts/**`; noutro harness, leia-a antes.
> **Auditoria completa:** invocar skill `audit-scripts`.

### 7. Quantificador e número órfão

Vale para a **mensagem de commit**, o **corpo do PR** e as **linhas adicionadas** do diff
staged. Portado do gate "número órfão: falha" da skill `verificar-entrega` do
`case-project-template`; é a mesma varredura que o revisor adversarial roda como primeira
hipótese — feita antes, por quem escreve.

**Comandos:**

```bash
# 1. Afirmação totalizadora ou de frequência: nas linhas adicionadas e na mensagem planejada
git diff --cached -U0 | grep -E '^\+' | grep -vE '^\+\+\+' \
  | grep -nEi '\b(nenhum|nenhuma|todas|todos|cada|sempre|nunca|únic[oa]|em ordem|não se reproduziu)\b'
printf '%s\n' "$MSG" | grep -nEi '\b(nenhum|nenhuma|todas|todos|cada|sempre|nunca|únic[oa]|em ordem|não se reproduziu)\b'

# 2. Numeral sem fonte na mesma linha (fonte = comando, arquivo, seção, issue, PR ou célula de tabela;
#    ano e URL não contam; o filtro de linha de tabela vem ANTES do -n, senão o prefixo n: o cega)
git diff --cached -U0 | grep -E '^\+' | grep -vE '^\+\+\+|^\+\|' \
  | grep -vE '`|\.(md|sh|py|json|csv|ya?ml)\b|§|#[0-9]+|\b[A-Z]+-[0-9]+\b|\b(19|20)[0-9]{2}\b|https?://' \
  | grep -nE '\b[0-9]+\b'
```

**Critérios de Aprovação:**

| Validação | Meta | Bloqueador |
|-----------|------|------------|
| Quantificador com o comando que o mediu ao lado | 100% dos casados | ✅ Sim |
| Numeral com fonte na mesma frase | 100% dos casados | ✅ Sim |
| Medição com mais de dois números | tabela com fonte por célula, nunca frase | ⚠️ Review |

Cada linha que o `grep` devolve é hipótese: fica se a fonte está ao lado, sai ou vira "não
medido" se não está. Número órfão numa mensagem de commit ou num corpo de PR é falha, não
aviso. Medido em 18–19/09/2026 no `multica-playbook` (PRs #81 e #84) e no `lab-contratos`
(PRs #22 e #23): "47 formas" sem dizer 47 de quê e "nenhum recorte dá 47" (falso) custaram
esses quatro PRs de conserto, e os dois teriam caído nesta varredura antes do commit. O hook
`check-commit-message.sh` roda os mesmos dois padrões sobre a mensagem passada por `-m` (todos
os `-m`) ou `-F <arquivo>`, como aviso, no Claude Code; heredoc por `-F -`, `--amend --no-edit`
e `git commit` sem `-m` ficam fora dele — nesses casos a varredura é a desta seção, à mão. Hooks
são CWD-only. O Propagador atualiza no derivado só o hook que é cópia literal (conteúdo e modo) de
alguma versão da origem até a propagada; o hook com diferença local, o hook novo da origem, que o
derivado ainda não tem, a remoção do hook que a origem apagou e o `settings.json`, que liga os
hooks, seguem à mão.

## Procedimento Completo

```bash
0. Confirmar stack/tooling
   - Ler documents/core/Projeto.md (fonte de verdade)

1. Validar Code Quality (conforme stack)
   a. Python (se aplicável):
      - ruff format --check src/ tests/
      - ruff check src/ tests/
      - mypy src/
      - Se FAIL: ruff format src/ tests/ e/ou ruff check src/ tests/ --fix

   b. Outros stacks:
      - Executar {{FORMAT_COMMAND}}
      - Executar {{LINT_COMMAND}}
      - Executar {{TYPECHECK_COMMAND}} (se aplicável)

   c. Buscar secrets hardcoded
      - Se encontrado: BLOQUEAR commit

2. Validar Testes (conforme stack)
   a. Python (se aplicável): pytest --cov=src --cov-fail-under=80
   b. Outros stacks: {{TEST_COMMAND}} e/ou {{COVERAGE_COMMAND}}

3. Validar segurança:
   a. git status | grep .env
      - Se .env staged: git reset .env

   b. Verificar .env.example atualizado
      - Se mudou variáveis: Atualizar .env.example

   c. Verificar manifesto de dependências do stack
      - Atualizar conforme o padrão do stack (evitar lockfiles/updates sem intenção)

4. Validar git status:
   a. git status
      - Revisar arquivos staged
      - Confirmar que são os corretos

   b. Planejar mensagem de commit
      - Formato: type(scope): assunto-em-pt-br
      - `subject` e `body` sempre em português do Brasil
      - Referência: organize-commits

5. Validações opcionais:
   - Se alterou .claude/rules/: audit-rules quick
   - Se alterou documents/: validate-docs-links check

5b. Varrer quantificador e número órfão (seção 7):
   - Linhas adicionadas, mensagem planejada e corpo do PR
   - Cada linha casada: fonte ao lado, ou sai

6. Gerar relatório final: ✅ READY ou ❌ NOT READY
```

## Exemplo de Output (Python)

```
✔️  Pre-Commit Checklist
========================

## 1. Code Quality ✅
✅ ruff format: PASSED
✅ ruff check: PASSED
✅ mypy: PASSED
✅ docstrings: 95% cobertura
✅ secrets: Nenhum hardcoded

## 2. Testing ✅
✅ pytest: 42 testes PASSED
✅ coverage: 88% (meta: >80%) ✅

## 3. Security ✅
✅ .env não staged
✅ .env.example atualizado
✅ Nenhum credential hardcoded
✅ manifesto de dependências do stack atualizado

## 4. Git Status ✅
📁 Arquivos staged (5):
   M  src/module/feature.py
   A  tests/unit/test_feature.py
   M  (manifesto de deps do stack)

⚠️  Arquivos não staged (1):
   M  README.md

Ação recomendada: git add README.md

## 5. Mensagem de Commit 💡
Use conventional commit:
   feat(module): implementa feature básica

---

✅ READY TO COMMIT

Próximo passo:
git commit -m "type(scope): assunto-em-pt-br"

Ou organize commits complexos:
organize-commits
```

## Checklist Completo

### Code Quality
- [ ] Formatter do stack (ex.: `ruff format --check`)
- [ ] Lint do stack (ex.: `ruff check`)
- [ ] Typecheck do stack (ex.: `mypy`)
- [ ] Docstrings / docs de API (quando aplicável)
- [ ] Nenhum secret hardcoded

### Testing
- [ ] Test command do stack (todos passam)
- [ ] Coverage >= meta do projeto (quando aplicável)

### Security
- [ ] .env não commitado
- [ ] .env.example atualizado
- [ ] Nenhum credential em código
- [ ] Manifesto de dependências do stack atualizado

### Git
- [ ] Arquivos corretos staged
- [ ] Nenhum arquivo sensível staged
- [ ] Mensagem planejada (conventional)

### Opcional
- [ ] audit-rules quick (se alterou regras)
- [ ] validate-docs-links check (se alterou docs)

### Quantificador e número órfão
- [ ] Nenhuma linha devolvida pela varredura 7 sem a fonte ao lado
- [ ] Medição com mais de dois números em tabela com fonte por célula

## Quando Bloquear Commit

**Bloqueadores (❌ NOT READY):**
- Code quality FAIL
- Testing FAIL (testes falhando ou coverage baixa)
- .env staged
- Secrets hardcoded encontrados
- Quantificador sem medição ou número órfão na mensagem, no corpo do PR ou nas linhas adicionadas

**Warnings (⚠️  Revisar):**
- Arquivos não staged (revisar se devem ser incluídos)
- .env.example desatualizado
- Manifesto de dependências do stack desatualizado

## Auto-Fix Disponível

```bash
# Python (quando aplicável)
ruff format src/ tests/
ruff check src/ tests/ --fix

# Outros stacks (use os comandos definidos em Projeto.md)
{{FORMAT_FIX_COMMAND}}
{{LINT_FIX_COMMAND}}

# Unstage .env
git reset .env
```

## Integração com Organize Commits

Se múltiplas mudanças pendentes:

```bash
organize-commits  # Primeiro organize
pre-commit-check  # Depois valide cada commit
```

## Integração Futura (Git Hooks)

### .git/hooks/pre-commit

```bash
#!/bin/bash
# Execute pre-commit check
pre-commit-check || exit 1
```

Benefícios:
- Validação automática
- Previne commits problemáticos
- Reduz carga cognitiva

## Exemplo de Uso

### Caso 1: Tudo OK

```bash
$ pre-commit-check

✔️  Pre-Commit Checklist
========================
✅ Code Quality: PASS
✅ Testing: PASS
✅ Security: PASS
✅ Git Status: OK

✅ READY TO COMMIT

$ git commit -m "feat(module): implementa feature"
[main abc123] feat(module): implementa feature
 5 files changed, 450 insertions(+), 20 deletions(-)
```

### Caso 2: Issues Encontrados

```bash
$ pre-commit-check

✔️  Pre-Commit Checklist
========================
❌ Code Quality: FAIL
   - (ex.: ruff/mypy para Python) violations/errors

✅ Testing: PASS
❌ Security: FAIL
   - .env está staged!

❌ NOT READY TO COMMIT

Ações necessárias:
1. Corrigir erros de ruff/mypy
2. Unstage .env: git reset .env
3. Re-executar: pre-commit-check

$ # Corrigir issues
$ git reset .env
$ # Fix code
$ pre-commit-check
✅ READY TO COMMIT
```

## Referências

- `.claude/rules/code-quality-standards.md` - Detalhes de padrões Python
- `.claude/rules/testing-requirements.md` - Requisitos de testes
- `.claude/rules/security-best-practices.md` - Práticas de segurança

## Skills Relacionadas

**Antes de commit:**
- `organize-commits` - Se múltiplas mudanças
- `pre-commit-check` - Validar (você está aqui)

**Validação adicional:**
- `audit-rules` - Se alterou regras
- `validate-docs-links` - Se alterou docs
- `audit-architecture` - Se alterou documentação estrutural
