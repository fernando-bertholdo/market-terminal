---
name: update-docs
description: Atualizar documentação do projeto (Projeto/Roadmap/TODO e arquitetura). Use ao completar milestone, após decisão técnica significativa, após reprioritização, ou após refactoring estrutural.
---

# Update Documentation

Atualiza ou cria documentação técnica do projeto, mantendo sincronização com o código e decisões.

## Tipos de Documentação

### System (architecture.md)
Documentação de arquitetura do sistema.

**Quando usar:**
- Após completar milestone que mudou arquitetura
- Após decisão técnica significativa
- Após refactoring estrutural
- Quando Projeto.md for atualizado com mudanças técnicas

**O que atualiza:**
- `documents/technical/architecture.md`
- Diagramas (mermaid)
- Descrição de componentes
- Fluxos de dados
- Decisões arquiteturais (ADRs inline)

### Task (registro do milestone)
Atualizar o `Projeto.md` com decisões/entregas do milestone e manter o `Roadmap.md` como índice (refs) para localizar esse registro.

**Quando usar:**
- Ao completar milestone (parte do DoD)
- Preferencialmente após `validate-dod [milestone-id]`
- Quando uma decisão técnica relevante foi tomada durante o milestone (para não perder)

**O que atualiza:**
- `documents/core/Projeto.md` (seções relevantes + Changelog)
- `documents/core/Roadmap.md` (adicionar referência/keywords apontando para o registro no Projeto.md)
- (Opcional) `documents/core/TODO.md` (checkboxes/verify/commits, se ainda não estiver atualizado)

> **Nota:** `documents/guides/` fica reservado para **playbooks/guias reutilizáveis**.  
> Se algo virar procedimento recorrente, documente em `documents/guides/<slug>.md` e indexe em `documents/README.md`.

### Roadmap/TODO (reprioritização)
Revisar e atualizar o **ordenamento planejado** e dependências no Roadmap/TODO após decisões novas.

**Quando usar:**
- Quando adiantar uma etapa futura do Roadmap
- Quando surgir tarefa com impacto em milestones futuros
- Quando uma decisão anterior muda (ou uma decisão pendente é fechada)
- Quando um bloqueio/dependência invalida a ordem atual

**O que atualiza:**
- `documents/core/Roadmap.md`
- `documents/core/TODO.md`

## Procedimento por Tipo

### Update System

```bash
1. Ler Projeto.md (fonte de verdade atual)

2. Identificar mudanças desde última atualização

3. Atualizar documents/technical/architecture.md:
   - Diagramas (mermaid)
   - Descrição de componentes
   - Fluxos de dados
   - Decisões arquiteturais (ADRs inline)

4. Atualizar metadata (versão, data)

5. Adicionar changelog entry

6. Sugerir commit:
   docs(technical): atualiza arquitetura após [contexto]
```

### Save Task (Projeto.md + Roadmap refs)

```bash
1. Identificar initiative ID (ex: M1.2 para milestone, fee-intelligence para detour)

2. Ler DoD da initiative:
   - Milestone: Roadmap.md § DoD do milestone
   - Detour: Roadmap.md § Desvios — Nome (DoD)

3. Atualizar documents/core/Projeto.md:
   - Atualizar seções relevantes (decisões, arquitetura, regras de negócio, etc.)
   - Adicionar entrada no Changelog citando o milestone (ex.: "M1.2 — ...")

4. Atualizar documents/core/Roadmap.md:
   - Milestone: seção do milestone — adicionar referência ao Projeto.md
   - Detour: seção Desvios — Nome — adicionar referência ao Projeto.md
   - Preferir referência de Changelog (ex.: "Projeto.md: v1.0.19 (M1.2 — requests-first)")

5. (Opcional) Atualizar documents/core/TODO.md:
   - Checkboxes / verify: steps / "Commits do milestone"

6. Verificar .planning/README.md:
   - Status do milestone na tabela de mapeamento (ativo/concluido)
   - Se milestone concluiu: atualizar status para (concluido)
   - Se initiative não existe na tabela: adicionar entrada

7. Se milestone é o último da initiative (verificar .planning/README.md):
   - Lembrar: invocar reconcile-initiative <id> após este update-docs
   - Nota: validate-dod já orquestra a sequência; se chamado independentemente, lembrar

8. Sugerir commit:
   docs(core): atualiza Projeto/Roadmap após {milestone-id}
```

### Reorder Roadmap & TODO

```bash
1. Capturar mudanças relevantes da sessão:
   - Decisões novas (Projeto.md / CONTEXT.md / SUMMARY.md)
   - Descobertas de integração (ex.: limites, anti-bot, dependências)
   - Novas tarefas ou bloqueios

2. Ler documents/core/Roadmap.md:
   - Milestone atual e próximos
   - Dependências explícitas (DoR)
   - Critérios de entrega (DoD)

3. Ler documents/core/TODO.md:
   - Tarefas do milestone atual + próximos milestones
   - Tarefas bloqueadas/deferred

4. Mapear impacto:
   - O que precisa ser adiantado/adiado?
   - O que virou pré-requisito (DoR) de outro milestone?
   - O que precisa virar tarefa no TODO (com verify: quando aplicável)?

5. Atualizar Roadmap.md e TODO.md mantendo consistência:
   - Não apagar histórico (preservar concluídos)
   - Registrar motivo em notas curtas / changelog
   - Manter referências cruzadas coerentes (milestones, seções, links)

6. Atualizar metadata/changelog em Roadmap.md e TODO.md

7. Verificar .planning/README.md:
   - Tabela de mapeamento milestone→initiative reflete mudanças
   - Desvios (detours) registrados se aplicável
   - Status de initiatives coerente com Roadmap

8. (Opcional) Se mexeu em links/refs:
   - validate-docs-links check
   - audit-roadmap-refs

9. Sugerir commit:
   docs(core): reprioritiza Roadmap/TODO após [contexto]
```

## Templates

### Architecture.md Structure

```markdown
# Arquitetura do Sistema - [Projeto]

## Metadata
- **Versão:** 1.X.0
- **Status:** ✅ Atualizado
- **Última atualização:** [DATA]
- **Baseado em:** Projeto.md v[X]

## Visão Geral
[Diagrama mermaid de alto nível]

## Componentes
### 1. [Nome Componente]
[Descrição detalhada]

## Fluxos de Dados
[Diagramas de sequência]

## Decisões Arquiteturais (ADRs)
### ADR-001: [Título]
[Contexto, alternativas, decisão, consequências]

## Changelog
### v1.X.0 ([DATA])
- [Mudança]
```

### Projeto.md - Changelog (Milestone)

```markdown
### vX.Y.Z ([DATA])

**{milestone-id} — [Título curto]:**
- ✅ [Decisão/entrega 1] (keywords úteis para busca)
- ✅ [Decisão/entrega 2]

**Autor:** [NOME]
**Contexto:** [1 linha]
```

## Quando NÃO Usar

**Não use para:**
- ❌ Atualizar conteúdo core de negócio em `documents/core/Projeto.md` (faça edição manual)
- ❌ Criar documentação de código (docstrings, comments)
- ❌ Criar/atualizar documentos de handoff/retomada (use `fresh-context`)
- ❌ Atualizar regras (.claude/rules/)
- ❌ Criar ADRs standalone
- ❌ Reconciliar docs com learnings da initiative → use `reconcile-initiative`
- ❌ Arquivar initiatives concluídas → use `archive-initiative`

**Use ao invés:**
- Projeto.md → Edição manual + commit
  - Roadmap.md/TODO.md → Use este skill apenas no procedimento “Reorder Roadmap & TODO” (caso contrário, edição manual)
- Criar regra → Seguir ciclo de vida de regras
- Docstrings → Responsabilidade do desenvolvedor

## Estrutura de Diretórios

```
.planning/
├── README.md                        # Hub: registry de milestones, detours, patches
├── patches/                          # Patches ativos (um subdir por patch)
├── milestones/                      # 1 dir por milestone (OBRIGATÓRIO)
│   └── MX.X-nome/
│       ├── CONTEXT.md               # Contexto vivo (unificado, sem README separado)
│       ├── verification/            # DoR/DoD reports co-localizados
│       ├── handoff/                 # Snapshots frozen (fresh-context)
│       └── plans/                   # Planos de implementação
├── detours/                         # 1 dir por detour (mesma estrutura)
│   └── nome/
│       ├── CONTEXT.md               # Contexto vivo (unificado)
│       ├── verification/            # DoR/DoD reports co-localizados
│       ├── handoff/                 # Snapshots frozen (fresh-context)
│       └── plans/                   # Planos de implementação
├── audit-reports/                   # Reconciliation + architecture audits
├── scratch/                         # Context dumps sob demanda (efêmeros)
└── _archive/                        # Conteúdo legado INTOCADO

documents/
├── README.md                    # Índice de documentação do projeto
├── core/                        # Fonte de verdade (negócio/decisões)
│   ├── Projeto.md
│   ├── Roadmap.md
│   └── TODO.md
├── technical/                   # Documentação técnica suplementar
│   └── architecture.md
└── guides/                      # Guias reutilizáveis (playbooks)
    └── chrome-devtools-mcp-macos.md
```

## Dependências

### Arquivos que devem existir:
- `documents/core/Projeto.md` - Fonte de verdade
- `documents/core/Roadmap.md` - Milestones e DoD

### Diretórios criados automaticamente:
- (nenhum)

## Referências

- `documents/core/Projeto.md` - Fonte de verdade de arquitetura
- `documents/core/Roadmap.md` - Milestones e fases
- `documents/core/TODO.md` - Tarefas granulares
- `.planning/milestones/MX.X-nome/` - Diretório do milestone (CONTEXT.md, verification/, handoff/)
- `.planning/detours/<nome>/` - Diretório do detour (CONTEXT.md, verification/, handoff/)
- `.planning/README.md` - Hub: mapeamento milestone→initiative
- `documents/README.md` - Índice de documentação

## Comandos Relacionados

**Após atualizar:**
- `/validate-docs-links check` - Validar links corretos
- `/audit-rules quick` - Validar regras aplicáveis

**Durante milestones:**
- `validate-dod [milestone]` - Validar DoD (inclui documentação)
- `/update-docs task [milestone]` - Atualizar Projeto.md + refs no Roadmap
- `/update-docs roadmap` - Reordenar/atualizar Roadmap & TODO

**Ao completar initiative:**
- `reconcile-initiative [initiative-id]` - Reconciliar docs core
- `archive-initiative [initiative-id]` - Arquivar initiative concluída
