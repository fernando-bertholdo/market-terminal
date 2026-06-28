---
description: Validar milestone completo com DoR, desenvolvimento, DoD e atualização de docs
---

# Workflow: Validate Milestone

Fluxo completo de validação de um milestone, do início à conclusão.

## Passos

### Antes de Iniciar

1. **Validar Definition of Ready**
   ```
   → validate-dor [milestone-id]
   ```
   - Se DoR incompleto: PARE e trabalhe nas dependências

2. **Preparar contexto**
   ```
   → fresh-context [milestone-id]
   ```
   - Gera CONTEXT.md para handoff limpo (se sessão longa)

### Durante Desenvolvimento

3. **Validar testes periodicamente**
   ```
   → validate-testing
   ```

4. **Pre-commit antes de cada commit**
   ```
   → pre-commit-check
   → organize-commits  # Se múltiplas mudanças
   ```

### Ao Completar

5. **Validar Definition of Done**
   ```
   → validate-dod [milestone-id]
   ```
   - Deve ser 100% atendido para marcar como completo

6. **Atualizar documentação**
   ```
   → update-docs task [milestone-id]
   → update-docs roadmap  # Se decisões mudaram o plano
   → update-docs system    # Se arquitetura mudou
   ```

7. **Reconciliar (se último milestone da initiative)**
   ```
   → reconcile-initiative <initiative-id>
   ```

8. **Validar links**
   ```
   → validate-docs-links check
   ```

9. **Organizar e commitar**
   ```
   → organize-commits
   git commit -m "docs(milestone): finaliza [milestone-id]"
   ```

10. **Arquivar (ao início da próxima fase)**
    ```
    → archive-initiative <initiative-id>
    ```

## Referências

- `.agents/skills/validate-dor/SKILL.md` — Validação de DoR
- `.agents/skills/validate-dod/SKILL.md` — Validação de DoD
- `documents/core/Roadmap.md` — Milestones e fases
