# Verification Report: [MILESTONE-ID]

**Data:** [DATA]
**Status:** [PASS | FAIL | PARTIAL]
**Cobertura:** [X]/[Y] critérios ([%])

---

## Resumo Executivo

| Categoria | Status | Itens |
|-----------|--------|-------|
| Funcional | [PASS/FAIL] | [X]/[Y] |
| Qualidade | [PASS/FAIL] | [X]/[Y] |
| Documentação | [PASS/FAIL] | [X]/[Y] |
| Segurança | [PASS/FAIL] | [X]/[Y] |
| Integração | [PASS/FAIL] | [X]/[Y] |

---

## Verificações Programáticas

Comandos executados automaticamente via `verify:` steps do TODO.md.

### Testes

| Verificação | Comando | Resultado | Output |
|-------------|---------|-----------|--------|
| [Nome] | `[comando]` | PASS/FAIL | [snippet] |

```bash
# Comando executado:
[comando completo]

# Output:
[output truncado se muito longo]

# Exit code: [0/1]
```

### Code Quality

| Verificação | Comando | Resultado | Métricas |
|-------------|---------|-----------|----------|
| Ruff check | `ruff check src/ tests/` | PASS/FAIL | Violations: X |
| Ruff format | `ruff format --check src/ tests/` | PASS/FAIL | Diffs: X |
| Coverage | `pytest --cov` | PASS/FAIL | Coverage: X% |
| Type hints | `mypy src/` | PASS/FAIL | Errors: X |

### Segurança

| Verificação | Comando | Resultado | Findings |
|-------------|---------|-----------|----------|
| Secrets | `grep -r "password=" src/` | PASS/FAIL | [count] |
| Bandit | `bandit -r src/` | PASS/FAIL | Issues: X |

---

## Verificações Manuais (Humano)

Itens que requerem validação humana.

### Visual/UX

- [ ] **[Item 1]:** [Descrição do que verificar]
  - Como testar: [instruções]
  - Evidência: [screenshot/gravação]

### Comportamento

- [ ] **[Item 2]:** [Descrição do comportamento esperado]
  - Como testar: [passos]
  - Resultado esperado: [descrição]

---

## Detalhamento por Categoria

### 1. Funcional

| Critério | Status | Evidência |
|----------|--------|-----------|
| [Critério 1] | PASS/FAIL | [teste/output] |
| [Critério 2] | PASS/FAIL | [teste/output] |

**Notas:**
- [Observações relevantes]

### 2. Qualidade

| Critério | Status | Evidência |
|----------|--------|-----------|
| Coverage >80% | PASS/FAIL | [X]% |
| Ruff (lint/format) | PASS/FAIL | [ok/violations] |
| Type hints | PASS/FAIL | [X] funções |
| Docstrings | PASS/FAIL | [X] funções |

**Notas:**
- [Observações relevantes]

### 3. Documentação

| Critério | Status | Evidência |
|----------|--------|-----------|
| Inline docs | PASS/FAIL | [verificado] |
| README | PASS/FAIL | [seções atualizadas] |
| Projeto.md (milestone) | PASS/FAIL | [changelog/refs] |

### 4. Segurança

| Critério | Status | Evidência |
|----------|--------|-----------|
| No hardcoded secrets | PASS/FAIL | [grep output] |
| Input validation | PASS/FAIL | [código verificado] |
| Error handling | PASS/FAIL | [não expõe credenciais] |

### 5. Integração

| Critério | Status | Evidência |
|----------|--------|-----------|
| Git status limpo | PASS/FAIL | `git status` |
| Commits convencionais | PASS/FAIL | `git log --oneline` |
| Code review | PASS/FAIL/N/A | [aprovado por] |

---

## Resultado Final

### Status: [PASS | FAIL | PARTIAL]

**Se PASS:**
- Todos os [X] critérios atendidos
- Milestone pode ser marcado como ✅ completo

**Se FAIL:**

### Ações Necessárias

| # | Ação | Prioridade | Bloqueador? |
|---|------|------------|-------------|
| 1 | [Ação específica] | Alta/Média/Baixa | Sim/Não |
| 2 | [Ação específica] | Alta/Média/Baixa | Sim/Não |

**Próximo passo:** Corrigir itens bloqueadores e re-executar `validate-dod [MILESTONE-ID]`

---

## Histórico de Verificações

| Data | Status | Mudanças |
|------|--------|----------|
| [DATA] | [STATUS] | Verificação inicial |

---

*Gerado automaticamente por skill `validate-dod`*
*Template: `.claude/skills/validate-dod/templates/verification-report.md`*
