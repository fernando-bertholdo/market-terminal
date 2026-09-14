---
name: init-detour
description: Inicializar infraestrutura de planning para um detour transversal. Cria diretório dedicado em .planning/detours/ com CONTEXT.md unificado e subpastas (verification/, handoff/, plans/). Registra automaticamente em .planning/README.md e Roadmap.md (seção Desvios). Use quando surgir trabalho emergente que cruza milestones.
---

# Init Detour

Cria a infraestrutura de planning para um detour, garantindo que o diretório dedicado existe e que o detour é registrado nos docs core.

## Regra de Ouro

> **"Detours têm a mesma disciplina de milestones — DoR/DoD rigoroso e bloqueante."**

`validate-dor` e `validate-dod` aceitam detour IDs e validam com o mesmo rigor que milestones.

## A Dívida que o Detour Contrai

O detour é o tipo que **não estava no plano e o altera**. Por isso, no momento em
que ele nasce, esta skill escreve no `CONTEXT.md` a dívida que ele assume: **ao
fechar, uma linha de delta no `Roadmap.md` com o identificador da issue**,
produzida por `reconcile-initiative` e verificável por
`grep <ID> documents/core/Roadmap.md`. Sem essa linha, o detour não fecha.

A dívida fica escrita onde quem trabalha vai ler — no contexto vivo da própria
iniciativa —, não só no `.planning/README.md`.

## Quando Usar

- Quando surge trabalho emergente que cruza múltiplos milestones
- Quando `validate-dor` reportar BLOQUEADOR por falta de diretório de detour
- Quando trabalho avulso se revela alterando o plano e precisa virar detour

## Parâmetros

### detour-name (obrigatório)

```bash
# Inicializar detour
init-detour fee-intelligence

# Com milestones relacionados
init-detour fee-intelligence --related M1.6,M2.2
```

### --related (opcional)

Lista de milestone IDs relacionados (separados por vírgula). Registrados na metadata do CONTEXT.md e na seção Desvios do Roadmap.md.

### --parent-issue (opcional)

Identificador da issue-pai no rastreador (ex.: `LAS-40`, `TECH-459`) sob a qual este detour
nasce aninhado. Registrado no CONTEXT.md como **Issue-pai no board**.

O diretório do detour continua plano — `.planning/detours/<nome>/`, irmão dos outros, nunca
dentro da pasta de uma milestone. O aninhamento é do **board**, não do filesystem: um detour
pode ser filho de uma milestone lá e continuar sendo um diretório de primeiro nível aqui. Este
campo é o que liga os dois, e é o que permite responder "de quem este detour é filho?" sem
abrir o rastreador.

Omita o argumento quando o detour não se ata a nenhuma milestone — desvio exploratório, de
depuração ou de investigação nasce de topo, e isso é normal.

## Procedimento

```bash
1. Validar formato do detour-name:
   - Deve ser kebab-case (ex: fee-intelligence, jira-tracker-sync)
   - NÃO pode ter formato MX.X (isso é milestone → sugerir init-milestone)
   - Strip prefixo D- se presente (D-fee-intelligence → fee-intelligence)

2. Verificar idempotência:
   - Glob .planning/detours/<nome>/
   - Se encontrado → reportar "Diretório já existe" e sair

3. Criar estrutura:
   mkdir -p .planning/detours/<nome>/
   mkdir -p .planning/detours/<nome>/verification/
   mkdir -p .planning/detours/<nome>/handoff/
   mkdir -p .planning/detours/<nome>/plans/

   Criar .planning/detours/<nome>/CONTEXT.md:
   ```markdown
   # CONTEXT: <Nome Humanizado>

   | Campo | Valor |
   |-------|-------|
   | **Tipo** | detour |
   | **Status** | (ativo) |
   | **Criado em** | YYYY-MM-DD |
   | **Última atualização** | YYYY-MM-DD |
   | **Trigger** | [Perguntar ao usuário o que motivou] |
   | **Milestones relacionados** | [M1.6, M2.2, ...] |
   | **Issue-pai no board** | [--parent-issue, ou "nenhuma (detour de topo)"] |
   | **Referência Roadmap** | Roadmap.md § Desvios — <Nome> |
   | **Dívida de reconciliação** | Ao fechar: linha de delta em `documents/core/Roadmap.md` com o identificador da issue — `grep <ID> documents/core/Roadmap.md` |

   <domain>
   ## Escopo

   **O que ESTÁ no scope:**
   - [Perguntar ao usuário ou extrair do contexto]

   **O que NÃO ESTÁ no scope:**
   - [Listar explicitamente]
   </domain>

   <decisions>
   ## Decisões Locked

   [Decisões já tomadas sobre este detour]

   ## Claude's Discretion

   [Áreas de autonomia]
   </decisions>

   <specifics>
   ## Referências Específicas

   [Preferências do usuário, exemplos concretos, requisitos verbais]
   </specifics>

   ## Próximos Passos

   [Listar ações imediatas]

   <deferred>
   ## Ideias Adiadas

   | Ideia | Fase Sugerida | Notas |
   |-------|---------------|-------|
   </deferred>

   ## Diário de Rodadas
   ```

4. Registrar em .planning/README.md:
   - Adicionar linha na tabela de detours
   - Formato: | <nome> | (ativo) | .planning/detours/<nome>/CONTEXT.md |

5. Registrar em documents/core/Roadmap.md (seção Desvios):
   - Adicionar bloco na seção "## 🔀 Desvios e Iniciativas Apartadas"
   ```markdown
   ### <Nome Humanizado>

   **Status:** 🔄 ATIVO
   **Iniciado em:** YYYY-MM-DD
   **Trigger:** [O que motivou]
   **Milestones relacionados:** M1.6, M2.2

   #### DoR
   - [x] Trigger documentado
   - [x] Scope definido (CONTEXT.md)
   - [x] Milestones afetados identificados

   #### DoD
   - [ ] [Perguntar critérios de aceite ao usuário]
   - verify: `[comando de verificação, se aplicável]`
   - [ ] Delta do plano registrado neste Roadmap com o identificador da issue
   - verify: `grep <ID> documents/core/Roadmap.md`

   #### Entregas
   [A preencher conforme progresso]

   **Referência:** `.planning/detours/<nome>/CONTEXT.md`
   ```

6. Sugerir commit:
   chore(planning): inicializa infraestrutura para detour <nome>
```

## Integração com validate-dor

O skill `validate-dor` detecta tipo automaticamente:
- Formato MX.X → milestone → busca em `.planning/milestones/`
- Outro formato → detour → busca em `.planning/detours/`
- Se não encontrar → **BLOQUEADOR** com sugestão de `init-detour`

## Quando NÃO Usar

- Para milestones → usar skill `init-milestone`
- Para trabalho avulso (não altera o plano) → sem estrutura em `.planning/`; o registro é o histórico do git
- Para detour já existente → idempotente (reporta e sai)

## Referências

- `.planning/README.md` — Hub de initiatives
- `.planning/detours/` — Diretório raiz de detours
- `documents/core/Roadmap.md` — Seção Desvios (DoR/DoD)

## Skills Relacionadas

- `init-milestone [MX.X]` — Equivalente para milestones planejados
- `validate-dor [detour-name]` — Gate que verifica existência do diretório
- `validate-dod [detour-name]` — Salva reports em verification/
- `fresh-context [detour-name]` — Salva handoffs em handoff/

---

## Changelog

### v1.1.0 (Agosto/2026)

**Taxonomia por obrigação:**
- O tipo `patch` deixou de existir; trabalho que não altera o plano é issue avulsa, sem estrutura em `.planning/`
- CONTEXT.md e DoD do Roadmap passam a registrar, na criação, a dívida de reconciliação do detour: linha de delta no `Roadmap.md` com o identificador da issue

### v1.0.0 (Março/2026)

**Criação Inicial:**
- Criação idempotente de diretório de detour
- CONTEXT.md unificado com metadata table + XML tags
- Subdiretórios: verification/, handoff/, plans/
- Registro automático em .planning/README.md e Roadmap.md
- Template DoR/DoD na seção Desvios do Roadmap
- Integração com validate-dor/validate-dod como initiative unificada

**Autor:** Fernando Bertholdo
**Contexto:** Padronização de estrutura entre milestones e detours
