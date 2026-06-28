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
- Se o stack/tooling **não** estiver definido: **BLOQUEIE o commit** e registre a tarefa na **Fase 0** (Roadmap/TODO).

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
      - Formato: type(scope): subject
      - Referência: organize-commits

5. Validações opcionais:
   - Se alterou .agents/rules/: audit-rules quick
   - Se alterou documents/: validate-docs-links check

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
   M  documents/core/TODO.md

Ação recomendada: git add documents/core/TODO.md

## 5. Mensagem de Commit 💡
Use conventional commit:
   feat(module): implementa feature básica

---

✅ READY TO COMMIT

Próximo passo:
git commit -m "type(scope): subject"

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

## Quando Bloquear Commit

**Bloqueadores (❌ NOT READY):**
- Code quality FAIL
- Testing FAIL (testes falhando ou coverage baixa)
- .env staged
- Secrets hardcoded encontrados

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

- `@rules/code-quality-standards.md` - Detalhes de padrões Python
- `@rules/testing-requirements.md` - Requisitos de testes
- `@rules/security-best-practices.md` - Práticas de segurança

## Skills Relacionadas

**Antes de commit:**
- `organize-commits` - Se múltiplas mudanças
- `pre-commit-check` - Validar (você está aqui)

**Validação adicional:**
- `audit-rules` - Se alterou regras
- `validate-docs-links` - Se alterou docs
- `audit-architecture` - Se alterou documentação estrutural
