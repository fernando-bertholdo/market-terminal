---
name: reconcile-initiative
description: Reconciliar docs core (Roadmap, Projeto) com learnings de uma initiative concluida. Use ao completar todos milestones de uma initiative, antes de arquivar, ou sob demanda para verificar se decisoes/deferred items foram propagados.
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
   - Projeto.md -> decisoes de negocio/arquitetura

5. Analise em 4 dimensoes:

   5a. Roadmap: Para milestones futuros que dependem desta initiative:
       - DoR reflete pre-condicoes criadas? Milestones faltando? Ordem correta?
       - Para detours: aplicar a dimensão 4a.1 — o plano mudou? Se mudou, alterar
         o Roadmap onde a sequência vive (a fase, o milestone); se não mudou, não
         tocar o Roadmap. O índice do detour vive no `.planning/README.md`.

   5b. Deferred: Para cada <deferred> item:
       - Ja coberto por milestone do Roadmap ou por initiative registrada?
         Se nao -> registrar como sugestao no report

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

### 4a.1 O plano mudou? (detour)

Ler no `CONTEXT.md` do detour o campo **O que muda no plano**, gravado pela
pergunta de entrada do `init-detour`, e confrontá-lo com o que o trabalho de fato
entregou.

- **Mudou** → alterar o `documents/core/Roadmap.md` **onde a sequência vive**: a
  fase é reescrita, o milestone entra, sai ou troca de lugar. O identificador da
  issue vai **no commit**, não numa linha de log no documento.
- **Não mudou** → o `Roadmap.md` não é tocado. `documents/README.md` manda
  atualizá-lo quando o plano muda e **nunca para registrar avanço**. Registrar
  aqui que não houve mudança é suficiente.
- **Não mudou e o detour tinha 3 sinais fracos** → sinalizar ao humano que a
  classificação pode ter sido generosa. Não reclassificar sozinho.

> **Mudou em 14/09/2026 (TECH-574).** Antes, esta dimensão exigia uma linha de
> delta datada no `Roadmap.md`, "sem a qual o detour não fecha", verificada por
> `grep <ID>`. Medição: **66 detours** na linhagem e **zero** linhas cumpridas. A
> obrigação vinha de uma definição de detour que já não era a régua, criava um
> sétimo lugar de status e nunca funcionou como gate.


**Gate:** depois de escrever, confirmar com

```bash
grep <ID> documents/core/Roadmap.md
```

Exit 0 é a evidência; exit 1 significa que o detour não está reconciliado e não
pode ser arquivado. `archive-initiative` recebe este skill como gate justamente
para que a linha exista antes do arquivamento.

Milestone não contrai essa dívida: ele já estava no plano, e fechá-lo faz o
Roadmap andar pelo caminho normal (`update-docs task`).

### 4b. Deferred

**O que verificar:**
- Para cada item em `<deferred>`: ja esta coberto por um milestone do Roadmap
  ou por uma initiative registrada em `.planning/README.md`?
- Se nao esta: registrar como sugestao no proprio Reconciliation Report

**Formato de sugestao:**
```markdown
- [Descricao do deferred item]
  - origin: initiative <id>, deferred
  - destino sugerido: <milestone do Roadmap | nova initiative>
```

**Limites:** o report e o registro. O deferred item nao vira checkbox de status
em documento core — DL-4 tirou o tracking de status do repositorio.

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
- **Cap em top 10 sugestoes**; para o resto, uma sugestao catch-all no report
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

## Deferred (4b)

| Deferred Item | Ja coberto? | Destino sugerido |
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

## O plano mudou? (4a.1 — detour)

| Verificacao | Evidencia |
|------------|-----------|
| Campo "O que muda no plano" lido do CONTEXT.md | <resposta registrada na criação> |
| Confrontado com o entregue | MUDOU / NAO MUDOU |
| Se MUDOU: Roadmap alterado onde a sequencia vive | <fase ou milestone tocado> / n/a |

---

## Resultado: LIMPO | REQUER ATENCAO

[Resumo das acoes necessarias]
```

## Quando NAO Usar

- Para atualizar docs de milestone individual -> use `update-docs task`
- Para reordenar o Roadmap -> use `update-docs roadmap`
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
- `documents/core/Projeto.md` — Decisoes de negocio/arquitetura
- `.planning/README.md` — Hub: mapeamento initiative->diretório

## Skills Relacionadas

- `validate-dod [milestone]` — Valida DoD (trigger para este skill)
- `archive-initiative [initiative-id]` — Arquivar initiative (requer este skill como gate)
- `update-docs task [milestone]` — Atualizar docs de milestone individual
- `update-docs roadmap` — Reordenar o Roadmap

---

## Changelog

### v3.0.0 (14/Set/2026 — TECH-574)
- **BREAKING:** a dimensão 4a.1 deixa de escrever linha de delta no `Roadmap.md` e passa a perguntar se o plano mudou, lendo o campo gravado na criação do detour
- Se mudou, o `Roadmap.md` é alterado onde a sequência vive e o identificador vai no commit; se não mudou, o Roadmap não é tocado
- Some o gate `grep <ID> documents/core/Roadmap.md` — medição: 66 detours na linhagem, zero linhas cumpridas

### v1.1.0 (Agosto/2026)

**Linha de delta do detour:**
- Nova dimensão 4a.1: ao fechar um detour, o skill escreve em `documents/core/Roadmap.md` uma linha de delta com o identificador da issue e confirma por `grep <ID> documents/core/Roadmap.md`
- Sem a confirmação o detour não fecha — a obrigação passa a ser verificável em vez de retórica
- Report ganha a seção de evidência correspondente

### v1.0.0 (Fevereiro/2026)

**Criacao Inicial:**
- Analise em 4 dimensoes (Roadmap, deferred, Projeto.md, .planning/README.md)
- Reconciliation Report estruturado
- Gate obrigatorio para archive-initiative
- Integracao com validate-dod v3.0.0
- Cap em top 10 sugestoes
- Suporte a initiatives em _archive/

**Autor:** Fernando Bertholdo
**Contexto:** Lifecycle completo de initiatives (reconciliacao + arquivamento)
