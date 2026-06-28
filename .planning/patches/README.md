# Patches

Correções rápidas (≤2 sessões) que merecem planning leve, mas não justificam um milestone ou detour com toda a estrutura.

Cada patch é um **subdiretório próprio** com `plan.md` (e, opcionalmente, `CONTEXT.md`/`handoff/`). Esta é a estrutura simétrica a `milestones/` e `detours/`.

> **Origem da decisão (DL15):** O modelo anterior usava um único arquivo `patches.md` agregando todos os patches. Migrado para `patches/` como diretório porque a estrutura simétrica facilita o lifecycle (criação, handoff, arquivamento) e elimina edits concorrentes em um único arquivo quando há múltiplos patches simultâneos.

---

## Estrutura por Patch

```
patches/
└── {slug}/
    ├── plan.md           — Descrição, escopo, status, commits
    ├── CONTEXT.md        — (opcional) Diário de rodadas se >1 sessão
    └── handoff/          — (opcional) Notes para retomada
```

## Template de `plan.md`

```markdown
# Patch: {slug}

- **Descrição:** [O que precisa ser corrigido]
- **Iniciativa relacionada:** [milestone, detour ou N/A]
- **Criado em:** [YYYY-MM-DD]
- **Status:** [em andamento | aguardando review | mergeado]
- **Commits:** [hashes]

## Contexto

[Por que esse patch existe; problema raiz que ele endereça]

## Escopo

[O que ESTÁ no scope]
[O que NÃO ESTÁ no scope]

## Critérios de Aceite

- [ ] [Critério verificável 1]
- [ ] [Critério verificável 2]
```

---

## Lifecycle

1. **Criação:** `mkdir patches/{slug}` + escrever `plan.md`
2. **Desenvolvimento:** commits referenciam o slug; atualizar `plan.md` Status conforme avança
3. **Reconciliação:** quando mergeado, atualizar `documents/core/` (Roadmap/TODO) se a entrega for visível ao roadmap
4. **Arquivamento:** opcional — `archive-initiative` move para `_archive/{slug}/` se houver valor em preservar; senão pode deletar (git log é o registro permanente)

---

## Regras

- **Máximo ~10 patches ativos** simultâneos. Se acumular, fazer cleanup ou promover para detour.
- **Se escalar (>2 sessões):** promover para `detours/{slug}/` (manter slug, migrar `plan.md`, ajustar referências).
- **Slug com kebab-case:** `fix-vite-config`, `align-tags-truncation`, `bump-typescript-5-6`.

---

## Patches Ativos

_Listar aqui patches em andamento (cleanup quando concluir)._
