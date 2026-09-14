# Documentos de Estrategia

Este diretorio contem documentos estrategicos que informam decisoes de design e negocio do projeto.
A **fonte de verdade** do projeto continua sendo `documents/core/Projeto.md`.

## Salvaguardas

- Todo documento aqui deve **linkar** para a secao correspondente em `Projeto.md` (secao "→ Projeto.md")
- Nenhuma decisao final deve existir apenas aqui; sempre refletir no `Projeto.md`
- Se houver conflito, **Projeto.md prevalece**

> **Exceção nomeada — [`scope-horizons.md`](scope-horizons.md).** Um horizonte é, por
> definição, a **ausência** de decisão final: refletí-lo no `Projeto.md` enquanto está
> engavetado inventaria um compromisso não assumido. A salvaguarda volta a valer no desfecho —
> horizonte que vira trabalho chega ao `Projeto.md` por `update-docs`; o que vira recusa chega
> pelo `constraints-no-goals.md`. A exceção é temporária e autolimitada, e esta nota existe
> para que a `audit-architecture` não a leia como violação.

## Referencia principal

- [Projeto.md](../core/Projeto.md)

---

## Estrutura

### Tier 1 — Sempre Presentes

Documentos fundamentais para qualquer projeto nao-trivial. Criados via `design-sprint` ou preenchimento manual.

| Documento | Proposito | Living Doc? |
|-----------|-----------|-------------|
| [vision-strategy.md](vision-strategy.md) | Por que o projeto existe e para onde vai | Nao |
| [constraints-no-goals.md](constraints-no-goals.md) | O que NAO sera construido + limitacoes | Nao |
| [success-metrics.md](success-metrics.md) | Como medir sucesso (validacao + valor + operacional) | Nao |
| [risk-assumptions.md](risk-assumptions.md) | Riscos, premissas e dependencias externas | **Sim** |
| [scope-horizons.md](scope-horizons.md) | O que pode vir a ser, e por que ainda nao | **Sim** |

### Tier 2 — Condicionais

Criados por `design-sprint` somente quando aplicaveis. NAO existem como template no repositorio.

| Documento | Quando Criar | Trigger |
|-----------|-------------|---------|
| `user-personas.md` | Projeto tem usuarios finais | `design-sprint` classifica USER_FACING |
| `business-model.md` | Ha ambicao comercial | `design-sprint` classifica COMMERCIAL |
| `competitive-landscape.md` | Existem competidores | `design-sprint` classifica COMPETITIVE |

---

## Fluxo de Criacao

```
design-sprint                    → Gera Tier 1 + Tier 2 (se aplicavel)
    ↓
generate-tap                     → Consolida strategy docs em TAP
    ↓
kickoff-prompt                   → Preenche placeholders restantes
    ↓
validate-kickoff                 → Verifica completude
```

## Como Manter

- **Risk & Assumptions:** Atualizar ao longo do projeto (premissas validadas/invalidadas, riscos resolvidos)
- **Demais docs:** Atualizar quando decisoes fundamentais mudam (pivotagem, mudanca de escopo)
- **Consistencia:** Usar `design-sprint --review-only` para verificar cross-links

## Skills Relacionadas

- `design-sprint` — Cria documentos via exploracao colaborativa
- `validate-docs-links` — Valida integridade de links
- `update-docs` — Propaga decisoes de milestones de volta para strategy docs
- `audit-architecture` — Detecta redundancia entre strategy docs e Projeto.md

---

**Ultima atualizacao:** 2026-06-28
