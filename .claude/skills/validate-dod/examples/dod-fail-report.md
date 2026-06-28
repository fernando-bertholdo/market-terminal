# Exemplo: Relatório DoD — ❌ FAIL

Exemplo de Verification Report para milestone com DoD incompleto.
Use como referência para estrutura do plano de correção.

---

````
❌ Verification Report - M1.3: {{MILESTONE_NAME}}
===========================================

**Data:** 27/Janeiro/2026
**Status:** ❌ FAIL (13/15 = 87%)

---

## Verificações Programáticas (5/6 PASS)

| # | Verificação | Comando | Resultado |
|---|-------------|---------|-----------|
| 1 | Test feature A | `pytest ...::test_feature_a` | ✅ PASS |
| 2 | Test feature B | `pytest ...::test_feature_b` | ✅ PASS |
| 3 | Coverage | `pytest --cov-fail-under=80` | ✅ PASS (88%) |
| 4 | Ruff | `ruff check src/ tests/` | ✅ PASS |
| 5 | Mypy | `mypy src/` | ❌ FAIL |
| 6 | Import check | `python -c "from src..."` | ✅ PASS |

**Detalhes de Falha:**

```bash
# Verify step 5 - Mypy
$ mypy src/processors/
src/processors/module_a.py:45: error: Missing type annotation for "process_data"
src/processors/module_a.py:89: error: Missing type annotation for "validate_schema"
src/processors/module_b.py:23: error: Missing type annotation for "classify_item"
Found 3 errors in 2 files
# Exit code: 1 → FAIL ❌
```

---

## Funcional ✅ (4/4)
[Todos completos - verify steps passaram]

## Qualidade ⚠️ (3/5)

✅ Testes >80% coverage (88%)
✅ Code quality OK (ruff check PASS)
❌ **Type hints faltando** (mypy FAIL)
   - src/processors/module_a.py:process_data()
   - src/processors/module_a.py:validate_schema()
   - src/processors/module_b.py:classify_item()

❌ **Tratamento de erro incompleto**
   - Falta tratar ValueError em process_data()

## Documentação ⚠️ (3/4)

✅ Docstrings OK
✅ README atualizado
❌ **Projeto.md / Roadmap.md não atualizados** (critério FAIL)

---

## Resultado: ❌ FAIL

**Verify steps:** 5/7 PASS (71%)
**Critérios:** 13/15 (87%)

### Plano de Correção (3 itens bloqueadores)

| # | Ação | Comando para Verificar |
|---|------|------------------------|
| 1 | Adicionar type hints (3 funções) | `mypy src/processors/` |
| 2 | Adicionar try/except em process_data | `pytest ...::test_process_error` |
| 3 | Atualizar Projeto.md + Roadmap.md | `update-docs task M1.3` |

**Re-executar após correções:**
```bash
validate-dod M1.3
```
````
