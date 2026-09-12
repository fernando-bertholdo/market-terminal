# `.planning/` — Organização de Iniciativas e Evidências

Este diretório agrupa **iniciativas** (planos, validações e handoffs) que suportam o desenvolvimento do projeto, sem competir com a "fonte de verdade" em `documents/`.

Princípios:
- Cada iniciativa tem seu **próprio diretório** dentro da pasta apropriada por tipo (`milestones/`, `detours/`), com `README.md`, `CONTEXT.md` e subpastas (`plans/`, `validation/`, `handoff/`).
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

São dois, e o que os distingue não é tamanho nem duração — é a obrigação que
cada um tem com o plano.

| Tipo | Obrigação com o plano | `.planning/`? | Tracking |
|------|-----------------------|---------------|----------|
| **milestone** | Avança o plano: já estava no Roadmap (M1.X) | `milestones/M1.X-nome/handoff/<id>-CONTEXT.md` | Roadmap |
| **detour** | Não estava no plano e o altera | `detours/<detour-name>/` (mesma estrutura) | Roadmap "Desvios" |

Trabalho que não altera o plano é **issue avulsa**: sem tipo, sem estrutura em
`.planning/`, sem obrigação de reconciliar. Quem abre uma avulsa que altera o
plano está errando de tipo — é detour.

### Árvore de Decisão

```
No Roadmap como milestone? ──────────────→ milestone → `milestones/M1.X-nome/`
                                ↓ não
Altera o plano? ─────────────────────────→ detour    → `detours/<detour-name>/`
                                ↓ não
                              → issue avulsa (sem estrutura em `.planning/`)
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
   - Aplica atualizações aprovadas em Roadmap.md e Projeto.md

4. `archive-initiative <initiative-id>` (ao iniciar nova fase OU sob demanda)
   - Move para `.planning/_archive/<id>/`
   - Atualiza INDEX.md e este README

**Sequência obrigatória:** validate-dod → update-docs → reconcile → archive

---

## Índice de Iniciativas

<!-- Listar initiatives conforme criadas durante desenvolvimento.
     Formato: `<tipo>/<nome>/` (status) — Breve descrição do escopo.
     Tipos: milestones/, detours/. -->

- `_archive/rename-node-homelab/` (arquivado) — desacopla a identidade da máquina
  Windows do nome do projeto: nó Tailscale `market-terminal` → `homelab`. Shipado
  em 2026-07-26; arquivado em 2026-09-12 pela TECH-220, junto com a revogação do
  terceiro tipo de trabalho, sob o qual ele nasceu. O que o diretório preserva é
  a tabela de alternativas descartadas; a razão do arquivamento está em
  `_archive/rename-node-homelab/NOTE.md`.

_Demais initiatives: usar `init-milestone <id>` para criar (ou `fresh-context [milestone-id]` para retomar uma existente)._

---

## Infraestrutura Compartilhada

- `milestones/` — Iniciativas ligadas a milestones do Roadmap. Criadas via `init-milestone`.
- `detours/` — Iniciativas fora do Roadmap (>2 sessões, transversais). Criação manual seguindo mesma estrutura de milestones.
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
4. Se nenhum CONTEXT existe → `Roadmap.md` como fallback
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

---

**Última atualização:** {{DATE}}
