# Templates — documents/design/REGISTRY.md e DECISIONS.md (schema v2)

Criados na **primeira reconciliação** do projeto. Mantidos via `--reconcile` (upsert; edição manual permitida — a reconciliação detecta divergências).

## Template: REGISTRY.md

```markdown
# Design Registry — Market Terminal

> Índice vivo do design do produto. Mantido pela skill `claude-design-flow` (`--reconcile`).
> Autoridade: Projeto.md > DECISIONS.md > projeto Claude Design (artefatos).
> registry_schema_version: 2

## Infraestrutura Claude Design

| Item | Valor |
|---|---|
| Projeto Design System | `<Produto> — Design System` — projectId `<uuid>` — org: `<pessoal|org>` |
| Write check (canário) | `ok|failed` em `YYYY-MM-DD` (projeto sandbox: `<uuid>` se houver) |
| Último `/design-sync` | `YYYY-MM-DD` — render-check: total `N`, bad `N`, thin `N`, variantsIdentical `N` |

## Unidades de Design

| Unidade | Iniciativa | Bundle | Etapas | Artefatos locais | Estado | last_published |
|---|---|---|---|---|---|---|
| `<unidade>` | `<initiative-id>` | B1/B2/B3 | 2,3,… | `design/hifi-<unidade>/` | `local-draft|local-approved|publication-pending|published|remote-divergent` | `<hash> YYYY-MM-DD` |

## Cards Publicados

| Path no projeto | Grupo | Origem local | last_published |
|---|---|---|---|
| `hifi-onboarding/01-landing.html` | `Hi-fi — onboarding` | `.planning/<...>/design/hifi-onboarding/01-landing.html` | `<hash> YYYY-MM-DD` |

## Boards (Excalidraw)

| Board | Cena (repo) | Última iteração |
|---|---|---|
| `<nome>` | `.planning/<...>/design/boards/<nome>.excalidraw` | YYYY-MM-DD |

## Handoff Bundles

| Unidade | Data | Telas incluídas | last_published na geração | Spec local |
|---|---|---|---|---|

## Legacy (migrações de executor)

<!-- Preservar aqui registros de executores anteriores (ex.: file keys Figma) ao migrar. -->
```

## Template: DECISIONS.md

```markdown
# Design Decisions — Market Terminal

> Registro ADR de decisões de design. Append-only (superseder com nova entrada, nunca editar).
> Decisões de negócio ficam em Projeto.md — aqui entra o detalhe de design, com backlink.

## DD-001: <Título>

- **Data:** YYYY-MM-DD · **Status:** Aceita | Substituída por DD-XXX · **Iniciativa:** <id>
- **Contexto:** <por que decidir>
- **Decisão:** <o que foi decidido — paleta, tipografia, padrão de navegação…>
- **Alternativas:** <o que perdeu e por quê — explorações perdedoras vivem em zz_archive/ do projeto>
- **→ Projeto.md:** <seção relacionada, se houver implicação de negócio>
```

## Regras

- Paths locais relativos à raiz do repo; `projectId` completo
- Uma linha por unidade (upsert); histórico no git
- REGISTRY nunca contém decisão (só estado/links); decisão é DECISIONS.md
- `remote-divergent` em qualquer linha → resolver antes de novo publish (ver [reconciliacao.md](reconciliacao.md))
