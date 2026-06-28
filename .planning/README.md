# `.planning/` — Organização de Iniciativas e Evidências

Este diretório agrupa **iniciativas** (planos, validações e handoffs) que suportam o desenvolvimento do projeto, sem competir com a "fonte de verdade" em `documents/`.

Princípios:
- Cada iniciativa tem seu **próprio diretório** dentro da pasta apropriada por tipo (`milestones/`, `detours/`, `patches/`), com `README.md`, `CONTEXT.md` e subpastas (`plans/`, `validation/`, `handoff/`).
- Evidências (screenshots, exports, logs) ficam dentro da initiative correspondente.
- Artefatos potencialmente sensíveis (exports, dados baixados) devem ficar **gitignored**.

---

## Mapeamento Milestone <> Iniciativa

<!-- Esta tabela é mantida ao longo do projeto.
     Cada milestone deve ser associado a uma iniciativa (diretório em .planning/milestones/).
     Use `update-docs task [milestone-id]` para manter esta tabela atualizada.
     O skill `fresh-context` consulta esta tabela para resolver onde salvar handoffs. -->

| Milestone | Iniciativa | Status | Path Handoff |
|-----------|------------|--------|--------------|
| _M1.X_ | _milestones/M1.X-nome/_ | _(ativo)_ | `.planning/milestones/M1.X-nome/handoff/M1.X-CONTEXT.md` |

## Desvios (Detours)

| Detour | Milestones Relacionados | Status | Path |
|--------|------------------------|--------|------|
| scripts-governance | — (transversal) | (arquivado) | `.planning/_archive/2026-05-scripts-governance/` |
| template-sync-audit | — (transversal, meta-work) | (ativo) | `.planning/detours/template-sync-audit/` |
| ui-excellence-plugin | — (transversal, meta-work) | (arquivado) | `.planning/_archive/ui-excellence-plugin.md` |

---

## Tipos de Trabalho

| Tipo | Quando | `.planning/`? | Tracking |
|------|--------|---------------|----------|
| **milestone** | No Roadmap (M1.X) | `milestones/M1.X-nome/handoff/<id>-CONTEXT.md` | Roadmap + TODO |
| **detour** | >2 sessões, precisa evidências | `detours/<detour-name>/` (mesma estrutura) | Roadmap "Desvios" + TODO |
| **patch** | <=2 sessões, correção rápida | `patches/<slug>/` (`plan.md` em diretório próprio) | Opcional (lifecycle leve; ver `patches/README.md`) |

### Árvore de Decisão

```
No Roadmap como milestone? ──────────────→ milestone → `milestones/M1.X-nome/`
                                ↓ não
>2 sessões ou precisa evidências? ───────→ detour   → `detours/<detour-name>/`
                                ↓ não
                              → patch    → `patches/<slug>/` (com `plan.md`)
```

---

## Convenção de Nomenclatura

- **kebab-case**, substantivos descrevendo escopo (máx 4 palavras)
- `api-integration` (não `implementar-integracao-api`)
- `user-auth` (não `fix-auth-session`)
- Milestones prefixados com ID do Roadmap: `M1.2-api-integration`, `M2.1-user-auth`

---

## Ciclo de Vida de Iniciativas

| Estado | Indicador (na tabela acima) | Trigger |
|--------|-----------------------------|---------|
| **(ativo)** | Trabalho em andamento | Criação do diretório |
| **(concluido)** | Milestone(s) finalizados | `validate-dod` passa para último milestone da initiative |
| **(arquivado)** | Movido para `_archive/` | Início de nova fase OU solicitação do usuário |

**Archiving:** Invocar `reconcile-initiative <id>` (gate obrigatório) + `archive-initiative <id>`.
Skill reference: `.claude/skills/archive-initiative/SKILL.md`

---

## Procedimento de Conclusão de Initiative

Ao completar todos os milestones de uma initiative (último DoD PASS):

1. `validate-dod <ultimo-milestone>` → PASS
   - Aciona automaticamente `reconcile-initiative <initiative-id>` (step 6)

2. `update-docs task <ultimo-milestone>` → atualiza Projeto.md + Roadmap.md

3. `reconcile-initiative <initiative-id>` (se não foi acionado pelo validate-dod)
   - Gera `.planning/audit-reports/reconcile-<id>-<data>.md`
   - Aplica atualizações aprovadas em Roadmap.md, TODO.md, Projeto.md

4. `archive-initiative <initiative-id>` (ao iniciar nova fase OU sob demanda)
   - Move para `.planning/_archive/<id>/`
   - Atualiza INDEX.md e este README

**Sequência obrigatória:** validate-dod → update-docs → reconcile → archive

---

## Índice de Iniciativas

<!-- Listar initiatives conforme criadas durante desenvolvimento.
     Formato: `<tipo>/<nome>/` (status) — Breve descrição do escopo.
     Tipos: milestones/, detours/, patches/. -->

_Nenhuma initiative criada ainda. Use `init-milestone <id>` para criar a primeira (ou `fresh-context [milestone-id]` para retomar uma existente)._

---

## Infraestrutura Compartilhada

- `milestones/` — Iniciativas ligadas a milestones do Roadmap. Criadas via `init-milestone`.
- `detours/` — Iniciativas fora do Roadmap (>2 sessões, transversais). Criação manual seguindo mesma estrutura de milestones.
- `patches/` — Diretório de patches ativos (correções rápidas, ≤2 sessões). Cada patch tem seu próprio subdir com `plan.md`. Ver `patches/README.md` para template e lifecycle.
- `handoff/` — Template e padrão do CONTEXT.md (uso transversal; não é "iniciativa").
- `verification-reports/` — Relatórios de verificação (DoR/DoD, pre-commit, etc.).
- `audit-reports/` — Auditorias pontuais (arquitetura/drift) e reconciliation reports.
- `scratch/` — Context dumps sob demanda (efêmeros, sem vínculo a initiative).
- `_archive/` — Initiatives concluídas e arquivadas. `INDEX.md` contém sumário temporal. Criado pelo skill `archive-initiative` ao primeiro arquivamento.

---

## Protocolo de Leitura (Nova Sessão)

1. Agente consulta **este README** para identificar a initiative do milestone atual
2. Lê `.planning/milestones/<id>-<nome>/CONTEXT.md` (contexto vivo, ponto de entrada)
3. Se retomando milestone → lê `.planning/milestones/<id>-<nome>/handoff/<id>-CONTEXT.md`
4. Se nenhum CONTEXT existe → `Roadmap.md` + `TODO.md` como fallback
5. Se veio de `generate-session-prompt` com ref a scratch → lê `.planning/scratch/<slug>-CONTEXT.md`

---

## Papéis dos CONTEXT.md

| Arquivo | Papel | Ciclo de Vida |
|---------|-------|---------------|
| `milestones/<id>-<nome>/CONTEXT.md` | **Contexto vivo** — estado atual, decisões, próximo passo | Atualizado durante trabalho ativo |
| `milestones/<id>-<nome>/handoff/<id>-CONTEXT.md` | **Snapshot frozen** — handoff para sessão limpa | Criado por `fresh-context`, frozen ao completar |
| `detours/<nome>/CONTEXT.md` | **Contexto vivo de detour** — equivalente para iniciativas fora do Roadmap | Atualizado durante trabalho ativo |
| `.planning/scratch/<slug>-CONTEXT.md` | **Dump sob demanda** — contexto avulso | Efêmero; migra para initiative quando se concretiza |

---

## Estrutura por Initiative (criada em runtime)

Quando uma initiative é criada, seguir a estrutura apropriada ao tipo:

### Milestone — criado por `init-milestone <id>`

```
.planning/milestones/<id>-<nome>/
├── CONTEXT.md         # Contexto vivo (estado atual)
├── README.md          # Descrição da initiative (opcional)
├── handoff/           # Snapshots frozen por milestone
│   └── <id>-CONTEXT.md
├── plans/             # Planos de implementação
└── validation/        # Relatórios de validação específicos
```

### Detour — criação manual

```
.planning/detours/<nome>/
├── CONTEXT.md         # Contexto vivo (estado atual)
├── README.md          # Descrição da initiative
├── handoff/           # Snapshots frozen
│   └── <id>-CONTEXT.md
├── plans/             # Planos de implementação
└── validation/        # Relatórios de validação específicos
```

### Patch — ver `patches/README.md`

```
.planning/patches/<slug>/
└── plan.md            # Plano leve (lifecycle simplificado)
```

---

**Última atualização:** {{DATE}}
