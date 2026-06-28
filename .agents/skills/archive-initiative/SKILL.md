---
name: archive-initiative
description: Arquivar initiative concluida em .planning/_archive/ com dados temporais e INDEX.md. Use ao completar fase, sob demanda, ou apos reconcile-initiative. Requer reconcile-initiative como gate obrigatorio.
---

# Archive Initiative

Move initiative concluida para `.planning/_archive/`, gera entrada no INDEX.md com dados temporais, e atualiza referencias no `.planning/README.md`.

## Regra de Ouro

> **"Toda initiative arquivada deve ter sido reconciliada primeiro."**

`reconcile-initiative` e **pre-requisito obrigatorio** (gate). Sem reconciliation report, o arquivamento e bloqueado.

## Quando Usar

- Ao iniciar nova fase (arquivar initiatives concluidas da fase anterior)
- Sob demanda, apos `reconcile-initiative`
- Ao limpar `.planning/` de initiatives concluidas acumuladas

## Parametros

### initiative-id (obrigatorio)

```bash
# Arquivar initiative especifica
archive-initiative api-integration

# Arquivar initiative com dry-run (preview sem mover)
archive-initiative api-integration --dry-run
```

### --phase (alternativo)

```bash
# Arquivar todas initiatives concluidas de uma fase
archive-initiative --phase Fase0
```

### --dry-run (opcional)

```bash
# Preview: mostra o que seria feito sem executar
archive-initiative api-integration --dry-run
```

## Procedimento

```bash
1. Verificar pre-condicoes (BLOQUEADORES):
   a. Initiative existe em .planning/<id>/
   b. Status = (concluido) no .planning/README.md
   c. reconcile-initiative foi executado (buscar reconcile-<id>-*.md
      em .planning/audit-reports/)
      -> Se nao: avisar e sugerir executar primeiro
      -> BLOQUEADOR: nao prosseguir sem reconciliation

2. Extrair dados temporais:
   - Data inicio (do CONTEXT.md/handoff mais antigo)
   - Data conclusao (hoje ou data do ultimo handoff)
   - Milestones cobertos (da tabela em .planning/README.md)
   - Outcomes e decisoes chave (do CONTEXT.md)

3. Criar/atualizar .planning/_archive/INDEX.md:
   - Criar diretorio _archive/ se nao existir
   - Adicionar entrada estruturada (ver template abaixo)
   - Links apontam para .planning/_archive/<id>/ (path final)

4. Mover diretorio:
   mkdir -p .planning/_archive/
   mv .planning/<id>/ .planning/_archive/<id>/

5. Atualizar .planning/README.md:
   - Status: (concluido) -> (arquivado)
   - Path Handoff: atualizar para .planning/_archive/<id>/handoff/...
   - Adicionar link para INDEX.md#<id> na entrada (se aplicavel)

6. Commit: chore(planning): arquiva initiative <id> em _archive/
```

## Pre-condicoes Detalhadas

### a. Initiative existe

```bash
# Verificar
ls .planning/<id>/
# Deve existir CONTEXT.md e/ou handoff/
```

### b. Status = (concluido)

Verificar na tabela de mapeamento do `.planning/README.md`:
- Milestones: coluna "Status" = `(concluido)`
- Detours: coluna "Status" = `(concluido)`

Se status != `(concluido)`: **BLOQUEADOR** — initiative ainda ativa.

### c. Reconciliation executada

```bash
# Buscar reconciliation report
ls .planning/audit-reports/reconcile-<id>-*.md
```

Se nao encontrado:
```
AVISO: reconcile-initiative nao foi executado para <id>.
Sugestao: Executar primeiro:
  reconcile-initiative <id>
```

**BLOQUEADOR:** Nao prosseguir sem reconciliation report.

## Template INDEX.md

```markdown
# Archive Index — .planning/_archive/

Initiatives concluidas e arquivadas. Cada entrada contem contexto
suficiente para entender o que a initiative entregou sem precisar
abrir o diretorio.

---

## <initiative-id>

| Campo | Valor |
|-------|-------|
| **Tipo** | milestone / detour |
| **Fase** | Fase0 / Fase1 / ... |
| **Inicio** | YYYY-MM-DD |
| **Conclusao** | YYYY-MM-DD |
| **Duracao** | N dias / N semanas |
| **Milestones** | M1.1, M1.2 (ou "N/A" para detours) |

**Outcomes:**
- [Outcome 1]
- [Outcome 2]

**Decisoes Chave:**
- [Decisao 1]
- [Decisao 2]

**Links:**
- CONTEXT.md: `.planning/_archive/<id>/CONTEXT.md`
- Handoffs: `.planning/_archive/<id>/handoff/`
- Reconciliation: `.planning/audit-reports/reconcile-<id>-YYYY-MM-DD.md`

---
```

## Exemplo de Execucao

### Arquivar initiative concluida

```bash
# 1. Verificar pre-condicoes
# -> .planning/api-integration/ existe
# -> Status = (concluido) no README.md
# -> reconcile-api-integration-2026-XX-XX.md existe

# 2. Extrair dados
# -> Inicio: 2026-01-15 (primeiro handoff)
# -> Conclusao: 2026-02-01
# -> Milestones: M1.1, M1.2
# -> Outcomes: Integracao com API externa, autenticacao automatizada

# 3. Criar INDEX.md
# -> .planning/_archive/INDEX.md criado com entrada

# 4. Mover
# -> mv .planning/api-integration/ .planning/_archive/api-integration/

# 5. Atualizar README.md
# -> api-integration: (concluido) -> (arquivado)
# -> Path: .planning/_archive/api-integration/handoff/M1.2-CONTEXT.md

# 6. Commit
# -> chore(planning): arquiva initiative api-integration em _archive/
```

### Arquivar por fase

```bash
archive-initiative --phase Fase0

# Identifica initiatives concluidas da Fase0:
# -> setup-initial (concluido) -> arquiva
# -> api-integration (concluido) -> arquiva
# -> data-pipeline (ativo) -> pula
# -> session-management (ativo) -> pula
```

## Comportamento do --dry-run

```
DRY RUN: archive-initiative api-integration

Pre-condicoes:
  .planning/api-integration/ existe
  Status = (concluido) no README.md
  reconcile-api-integration-2026-XX-XX.md encontrado

Acoes planejadas:
  1. Criar .planning/_archive/INDEX.md (nova entrada)
  2. Mover .planning/api-integration/ -> .planning/_archive/api-integration/
  3. Atualizar .planning/README.md:
     - Status: (concluido) -> (arquivado)
     - Path: .planning/_archive/api-integration/handoff/M1.2-CONTEXT.md

Nenhuma acao executada (dry-run).
```

## Quando NAO Usar

- Para reconciliar docs core -> use `reconcile-initiative` primeiro
- Para atualizar docs de milestone -> use `update-docs task`
- Para mover arquivos avulsos -> operacao manual
- Para initiatives ainda ativas -> complete primeiro, depois reconcile, depois archive

## Path Resolution apos Archival

Apos arquivamento, skills que resolvem paths de initiative usam fallback em 3 niveis:
1. `.planning/<id>/` (ativo)
2. `.planning/_archive/<id>/` (arquivado)
3. Perguntar ao usuario (nao encontrado)

Para novas escritas em initiatives arquivadas: usar `.planning/scratch/` (nao reescrever dentro do `_archive/`).

## Referências

- `.planning/README.md` — Hub: mapeamento milestone->initiative, status
- `.planning/_archive/INDEX.md` — Indice de initiatives arquivadas (criado por este skill)
- `.planning/audit-reports/` — Reconciliation reports (gate)

## Skills Relacionadas

- `reconcile-initiative [initiative-id]` — Gate obrigatorio antes de arquivar
- `validate-dod [milestone]` — Valida DoD (trigger upstream)
- `update-docs task [milestone]` — Atualizar docs de milestone
- `fresh-context` — Fallback para paths arquivados
- `generate-session-prompt` — Fallback para paths arquivados

---

## Changelog

### v1.0.0

**Criacao Inicial:**
- Procedimento completo de arquivamento com pre-condicoes
- INDEX.md com dados temporais (tipo, fase, datas, duracao, milestones, outcomes)
- Suporte a --phase (arquivar batch por fase)
- Suporte a --dry-run (preview sem executar)
- Gate obrigatorio: reconcile-initiative
- Atualizacao automatica de .planning/README.md
- Path resolution: fallback de 3 niveis

**Contexto:** Lifecycle completo de initiatives (reconciliacao + arquivamento)
