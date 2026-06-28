---
name: reconcile-initiative
description: Reconciliar docs core (Roadmap, TODO, Projeto) com learnings de uma initiative concluida. Use ao completar todos milestones de uma initiative, antes de arquivar, ou sob demanda para verificar se decisoes/deferred items foram propagados.
---

# Reconcile Initiative

Analisa os artefatos de uma initiative concluida e verifica se suas descobertas (decisoes, deferred items, dependencias) foram propagados para os documentos core do projeto.

## Regra de Ouro

> **"Nenhuma initiative deve ser arquivada sem que seus learnings tenham sido propagados para docs core."**

Este skill e **pre-requisito obrigatorio** (gate) para `archive-initiative`.

## Quando Usar

- Apos `validate-dod` PASS do ultimo milestone de uma initiative
- Antes de `archive-initiative` (gate obrigatorio)
- Sob demanda, para auditar propagacao de learnings
- Ao iniciar nova fase, para verificar initiatives concluidas pendentes

## Parametros

### initiative-id (obrigatorio)

```bash
# Reconciliar initiative especifica
reconcile-initiative btg-endpoint-ops

# Reconciliar initiative de milestone
reconcile-initiative btg-collectors
```

## Procedimento

```bash
1. Receber initiative-id (ex: M2.3, fee-intelligence, D-fee-intelligence)

2. Detectar tipo de initiative:
   - Se formato MX.X ou MX.X.X → MILESTONE
     Path: .planning/milestones/MX.X-*/
   - Se outro formato → DETOUR (strip prefixo D- se presente)
     Path: .planning/detours/<nome>/

3. Ler documentos da initiative:
   - Milestone: .planning/milestones/MX.X-nome/CONTEXT.md -> <decisions>, <deferred>, <dependencies>
   - Milestone handoffs: .planning/milestones/MX.X-nome/handoff/*.md
   - Detour: .planning/detours/<nome>/CONTEXT.md -> <decisions>, <deferred>, <dependencies>
   - Detour handoffs: .planning/detours/<nome>/handoff/*.md
   - Fallback legado: _archive/milestones/MX.X-*/ -> _archive/detours/<nome>/ -> _archive/<id>/

4. Ler documentos core:
   - Roadmap.md -> milestones futuros, DoR/DoD + seção Desvios para detours
   - TODO.md -> tarefas pendentes
   - Projeto.md -> decisoes de negocio/arquitetura

5. Analise em 4 dimensoes:

   5a. Roadmap: Para milestones futuros que dependem desta initiative:
       - DoR reflete pre-condicoes criadas? Milestones faltando? Ordem correta?
       - Para detours: seção Desvios atualizada?

   5b. TODO: Para cada <deferred> item:
       - Existe tarefa no TODO.md? Se nao -> sugerir com verify: step

   5c. Projeto.md: Para cada decisao locked:
       - Esta refletida? Conflita? Enriquece?

   5d. .planning/README.md: Status e entradas coerentes?

6. Gerar Reconciliation Report:
   .planning/audit-reports/reconcile-<id>-<YYYY-MM-DD>.md

7. Em modo interativo: apresentar sugestoes, aplicar com confirmacao

8. Commit: docs(planning): reconcilia docs core apos conclusao de <id>
```

## Dimensoes de Analise

### 4a. Roadmap

**O que verificar:**
- Milestones futuros que dependem da initiative concluida
- DoR desses milestones reflete pre-condicoes criadas pela initiative?
- Milestones faltando que deveriam existir?
- Ordem dos milestones ainda faz sentido?

**Exemplo:**
```
Initiative btg-endpoint-ops descobriu 37 endpoints.
Milestones M1.6, M2.5, M3.2 dependem desses endpoints.
-> Verificar se DoR de M1.6 menciona endpoints como pre-requisito.
-> Verificar se M2.5 referencia o inventario de endpoints.
```

### 4b. TODO

**O que verificar:**
- Para cada item em `<deferred>`: existe tarefa correspondente no TODO.md?
- Se nao existe: sugerir criacao com `verify:` step quando aplicavel

**Formato de sugestao:**
```markdown
- [ ] [Descricao do deferred item]
  - origin: initiative <id>, deferred
  - verify: `[comando de verificacao]`
```

### 4c. Projeto.md

**O que verificar:**
- Decisoes locked da initiative estao refletidas no Projeto.md?
- Alguma decisao conflita com o que esta documentado?
- Alguma decisao enriquece/complementa o que esta documentado?

**Limites:** Apenas flagear o que NAO esta em Projeto.md. Nao reescrever Projeto.md automaticamente.

### 4d. .planning/README.md

**O que verificar:**
- Status da initiative na tabela de mapeamento
- Entradas coerentes com estado real
- Links de handoff validos

## Limites de Escopo

- **Foco em `<deferred>` e `<dependencies>`** (finitos/estruturados)
- Para `<decisions>`, apenas flagear o que NAO esta em Projeto.md
- **Cap em top 10 sugestoes**; para o resto, criar tarefa catch-all no TODO.md
- Nao reescrever documentos core automaticamente — apresentar sugestoes

## Template de Reconciliation Report

```markdown
# Reconciliation Report: <initiative-id>

**Data:** <YYYY-MM-DD>
**Initiative:** <initiative-id>
**Status da Initiative:** (concluido)
**Milestones cobertos:** <lista>

---

## Resumo

- Deferred items analisados: N
- Dependencias verificadas: N
- Decisoes auditadas: N
- Sugestoes geradas: N

---

## Roadmap (4a)

| Milestone Futuro | Dependencia | Status | Sugestao |
|-----------------|-------------|--------|----------|
| M1.6 | Inventario endpoints | OK / FALTA | [acao] |

## TODO (4b)

| Deferred Item | Existe no TODO? | Sugestao |
|--------------|-----------------|----------|
| [item] | Sim / Nao | [acao] |

## Projeto.md (4c)

| Decisao Locked | Refletida? | Acao |
|---------------|------------|------|
| [decisao] | Sim / Nao / Parcial | [acao] |

## .planning/README.md (4d)

| Verificacao | Status |
|------------|--------|
| Status na tabela | OK / CORRIGIR |
| Links de handoff | OK / QUEBRADO |

---

## Resultado: LIMPO | REQUER ATENCAO

[Resumo das acoes necessarias]
```

## Quando NAO Usar

- Para atualizar docs de milestone individual -> use `update-docs task`
- Para reordenar Roadmap/TODO -> use `update-docs roadmap`
- Para arquivar initiative -> use `archive-initiative` (apos este skill)
- Para auditar links -> use `validate-docs-links`

## Integracao com validate-dod

O skill `validate-dod` v3.0.0 invoca automaticamente `reconcile-initiative` quando:
- DoD PASS
- Milestone e o ultimo da initiative (todos os milestones concluidos)

Sequencia automatica: `validate-dod` -> PASS -> `reconcile-initiative` -> report

## Detecção de Tipo

```
Input: initiative-id

Se formato MX.X ou MX.X.X → MILESTONE
  Path: .planning/milestones/MX.X-*/

Se outro formato → DETOUR (strip D- se presente)
  Path: .planning/detours/<nome>/
```

## Referências

- `.planning/milestones/MX.X-nome/CONTEXT.md` — Contexto vivo de milestone
- `.planning/detours/<nome>/CONTEXT.md` — Contexto vivo de detour
- `.planning/*/handoff/*.md` — Handoff snapshots
- `.planning/_archive/` — Initiatives arquivadas
- `documents/core/Roadmap.md` — Milestones futuros, DoR/DoD + seção Desvios
- `documents/core/TODO.md` — Tarefas pendentes
- `documents/core/Projeto.md` — Decisoes de negocio/arquitetura
- `.planning/README.md` — Hub: mapeamento initiative->diretório

## Skills Relacionadas

- `validate-dod [milestone]` — Valida DoD (trigger para este skill)
- `archive-initiative [initiative-id]` — Arquivar initiative (requer este skill como gate)
- `update-docs task [milestone]` — Atualizar docs de milestone individual
- `update-docs roadmap` — Reordenar Roadmap/TODO

---

## Changelog

### v1.0.0 (Fevereiro/2026)

**Criacao Inicial:**
- Analise em 4 dimensoes (Roadmap, TODO, Projeto.md, .planning/README.md)
- Reconciliation Report estruturado
- Gate obrigatorio para archive-initiative
- Integracao com validate-dod v3.0.0
- Cap em top 10 sugestoes
- Suporte a initiatives em _archive/

**Autor:** Fernando Bertholdo
**Contexto:** Lifecycle completo de initiatives (reconciliacao + arquivamento)
