---
name: init-detour
description: Inicializar infraestrutura de planning para um detour transversal. Cria diretório dedicado em .planning/detours/ com CONTEXT.md unificado e subpastas (verification/, handoff/, plans/). Registra automaticamente em .planning/README.md, Roadmap.md (seção Desvios) e TODO.md. Use quando surgir trabalho emergente que cruza milestones.
---

# Init Detour

Cria a infraestrutura de planning para um detour, garantindo que o diretório dedicado existe e que o detour é registrado nos docs core.

## Regra de Ouro

> **"Detours têm a mesma disciplina de milestones — DoR/DoD rigoroso e bloqueante."**

`validate-dor` e `validate-dod` aceitam detour IDs e validam com o mesmo rigor que milestones.

## Quando Usar

- Quando surge trabalho emergente que cruza múltiplos milestones
- Quando `validate-dor` reportar BLOQUEADOR por falta de diretório de detour
- Quando um patch escala (>2 sessões) e precisa ser promovido a detour

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
   | **Referência Roadmap** | Roadmap.md § Desvios — <Nome> |

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

   #### Entregas
   [A preencher conforme progresso]

   **Referência:** `.planning/detours/<nome>/CONTEXT.md`
   ```

6. Registrar em documents/core/TODO.md:
   - Adicionar header na seção de desvios
   ```markdown
   ### <Nome Humanizado>

   **Commits do Detour:**
   | Hash | Tipo | Descrição |
   |------|------|-----------|

   - [ ] [Tarefas iniciais do detour]
   ```

7. Sugerir commit:
   chore(planning): inicializa infraestrutura para detour <nome>
```

## Integração com validate-dor

O skill `validate-dor` detecta tipo automaticamente:
- Formato MX.X → milestone → busca em `.planning/milestones/`
- Outro formato → detour → busca em `.planning/detours/`
- Se não encontrar → **BLOQUEADOR** com sugestão de `init-detour`

## Quando NÃO Usar

- Para milestones → usar skill `init-milestone`
- Para patches (≤2 sessões) → criar `.planning/patches/{slug}/plan.md`
- Para detour já existente → idempotente (reporta e sai)

## Referências

- `.planning/README.md` — Hub de initiatives
- `.planning/detours/` — Diretório raiz de detours
- `documents/core/Roadmap.md` — Seção Desvios (DoR/DoD)
- `documents/core/TODO.md` — Tarefas granulares

## Skills Relacionadas

- `init-milestone [MX.X]` — Equivalente para milestones planejados
- `validate-dor [detour-name]` — Gate que verifica existência do diretório
- `validate-dod [detour-name]` — Salva reports em verification/
- `fresh-context [detour-name]` — Salva handoffs em handoff/

---

## Changelog

### v1.0.0 (Março/2026)

**Criação Inicial:**
- Criação idempotente de diretório de detour
- CONTEXT.md unificado com metadata table + XML tags
- Subdiretórios: verification/, handoff/, plans/
- Registro automático em .planning/README.md, Roadmap.md e TODO.md
- Template DoR/DoD na seção Desvios do Roadmap
- Integração com validate-dor/validate-dod como initiative unificada

**Autor:** Fernando Bertholdo
**Contexto:** Padronização de estrutura entre milestones e detours
