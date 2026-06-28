# Exemplo: Relatório DoD — ✅ PASS

Exemplo de Verification Report completo para milestone com DoD 100% atendido.
Use como referência ao calibrar o formato ou validar se um relatório está correto.

---

```
✅ Verification Report - M1.2: {{MILESTONE_NAME}}
==============================================

**Milestone:** M1.2 - {{MILESTONE_NAME}}
**Data:** 27/Janeiro/2026
**Status:** ✅ PASS (100%)

---

## Verificações Programáticas (8/8 PASS)

| # | Verificação | Comando | Resultado |
|---|-------------|---------|-----------|
| 1 | Test feature A | `pytest ...::test_feature_a` | ✅ PASS |
| 2 | Test feature B | `pytest ...::test_feature_b` | ✅ PASS |
| 3 | Test integration | `pytest ...::test_integration` | ✅ PASS |
| 4 | Coverage | `pytest --cov-fail-under=80` | ✅ PASS (85%) |
| 5 | Ruff | `ruff check src/ tests/` | ✅ PASS |
| 6 | Mypy | `mypy src/` | ✅ PASS |
| 7 | No secrets | `grep -r "password=" src/` | ✅ PASS (0 found) |
| 8 | Import | `python -c "from src..."` | ✅ PASS |

---

## Verificações Humanas (Checkpoint)

✅ **Confirmado pelo usuário:**
- [x] Funcionalidade testada manualmente e operacional
- [x] Output validado contra critérios de aceite

---

## Funcional

✅ Feature A implementada
   - Verify: test_feature_a PASSED

✅ Feature B implementada
   - Verify: test_feature_b PASSED

✅ Integração entre componentes OK
   - Verify: test_integration PASSED

---

## Qualidade

✅ Testes unitários >80% coverage
   - Verify: pytest --cov-fail-under=80 → 85.3% ✅

✅ Code quality OK
   - Verify: ruff check src/ tests/ → ✅

---

## Resultado: ✅ MILESTONE COMPLETO

**Critérios:** 16/16 (100%)
**Verify steps:** 8/8 PASS
**Human checkpoints:** 2/2 confirmados

Próximas Ações:
1. Atualizar TODO.md: Marcar M1.2 como completo ✅
2. Commitar: `docs(milestone): completa M1.2`
3. Validar DoR do próximo: validate-dor M1.3
4. Se último milestone: reconcile-initiative <initiative-id>
5. Se nova fase: archive-initiative --phase <fase>
```
