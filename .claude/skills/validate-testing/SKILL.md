---
name: validate-testing
description: Validar cobertura de testes e estrutura de testes do projeto. Use após implementar feature, antes de commits, durante validação de DoD, ou após refactoring para garantir que os testes estão adequados e a cobertura atende aos padrões estabelecidos.
---

# Validate Testing (Stack-aware)

Valida execução de testes e (quando aplicável) cobertura, conforme o stack do projeto e as metas do Roadmap/DoD.

## Pré-condição: Stack / Tooling

- **Fonte de verdade:** `documents/core/Projeto.md` (stack + comandos oficiais).
- Se o stack/tooling não estiver definido, **BLOQUEIE** a validação e registre a tarefa na **Fase 0** (Roadmap/TODO).

## O Que Valida

### 1) Execução da suíte de testes (por stack)

**Meta:** 100% dos testes passando (0 failures).

**Python (quando aplicável) — exemplo:**
```bash
pytest -q
```

**Outros stacks — execute o comando definido em `documents/core/Projeto.md`:**
```bash
{{TEST_COMMAND}}
```

### 2) Cobertura (quando aplicável)

**Meta:** conforme o DoD (ou meta mínima do projeto).

**Python (exemplo):**
```bash
pytest --cov=src --cov-report=term-missing
pytest --cov=src --cov-fail-under=80
```

**Outros stacks:**
```bash
{{COVERAGE_COMMAND}}
```

### 3) Estrutura mínima de `tests/`

Estrutura sugerida (adapte ao stack):
```
tests/
  unit/
  integration/
  fixtures/
  smoke/
```

Regras:
- Preferir testes determinísticos (sem flakiness).
- Usar AAA (Arrange-Act-Assert) quando fizer sentido.
- Evitar depender de secrets em unit tests (integrações que exigem secrets devem ser explicitadas no DoD).

### 4) Metas recomendadas (ajustáveis)

| Categoria | Meta | Observação |
|----------|------|------------|
| Overall | >80% | Meta geral do projeto |
| Core business logic | >90% | Definir o que é “core” em `Projeto.md` |
| Integrações | >80% | I/O e dependências externas |
| Utils | >80% | Suporte e validações |

## Procedimento de Validação

```bash
1. Rodar a suíte de testes (stack)
   - Python: pytest -q
   - Outros: {{TEST_COMMAND}}

2. Rodar cobertura (se aplicável)
   - Python: pytest --cov=...
   - Outros: {{COVERAGE_COMMAND}}

3. Checar metas do Roadmap/DoD
   - Failures = 0
   - Coverage >= metas definidas

4. Reportar: ✅ PASS ou ❌ FAIL
```

## Output

- ✅ **PASS**: testes 100% passando e metas atendidas
- ❌ **FAIL**: failures e/ou metas abaixo do esperado (listar gaps e próximos passos)

## Integração com outros skills

- `validate-dod` (gate final do milestone)
- `pre-commit-check` (antes de commit)

## Referências

- `@rules/testing-requirements.md` - Requisitos de testes (quando aplicável ao stack)
