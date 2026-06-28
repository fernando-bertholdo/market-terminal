---
name: init-milestone
description: Inicializar infraestrutura de planning para um milestone. Cria diretório dedicado em .planning/milestones/ com CONTEXT.md unificado e subpastas (verification/, handoff/, plans/). Use antes de iniciar trabalho em qualquer milestone novo. validate-dor bloqueia se diretório não existir.
---

# Init Milestone

Cria a infraestrutura de planning para um milestone, garantindo que o diretório dedicado existe antes de qualquer trabalho começar.

## Regra de Ouro

> **"Nenhum milestone deve começar sem infraestrutura de planning."**

`validate-dor` verifica a existência do diretório e **bloqueia** se ausente, sugerindo este skill.

## Quando Usar

- Antes de iniciar qualquer milestone novo
- Quando `validate-dor` reportar BLOQUEADOR por falta de diretório
- Ao planejar próximo milestone (preparação antecipada)

## Parâmetros

### milestone-id (obrigatório)

```bash
# Inicializar milestone
init-milestone M2.4

# Com nome explícito
init-milestone M2.4 --name daily-email-reporting
```

### --name (opcional)

Slug kebab-case para o diretório. Se omitido:
1. Extrair do título no Roadmap.md
2. Se não encontrado, perguntar ao usuário

## Procedimento

```bash
1. Validar formato do milestone-id (MX.X ou MX.X.X)

2. Verificar idempotência:
   - Glob .planning/milestones/MX.X-*/
   - Se encontrado → reportar "Diretório já existe" e sair

3. Resolver nome:
   a. Se --name fornecido → usar
   b. Se não → ler Roadmap.md, buscar título do milestone
   c. Se não encontrado → perguntar ao usuário
   - Converter para kebab-case (max 4 palavras)

4. Criar estrutura:
   mkdir -p .planning/milestones/MX.X-nome/
   mkdir -p .planning/milestones/MX.X-nome/verification/
   mkdir -p .planning/milestones/MX.X-nome/handoff/
   mkdir -p .planning/milestones/MX.X-nome/plans/

   Criar .planning/milestones/MX.X-nome/CONTEXT.md:
   ```markdown
   # CONTEXT: MX.X — [Título]

   | Campo | Valor |
   |-------|-------|
   | **Tipo** | milestone |
   | **Status** | (ativo) |
   | **Fase** | [Fase] |
   | **Criado em** | YYYY-MM-DD |
   | **Última atualização** | YYYY-MM-DD |
   | **Referência Roadmap** | Roadmap.md § MX.X |

   <domain>
   ## Escopo

   **O que ESTÁ no scope:**
   - [Extrair do DoR do Roadmap.md]

   **O que NÃO ESTÁ no scope:**
   - [Listar explicitamente]

   **Referência:** Roadmap.md seção MX.X
   </domain>

   <decisions>
   ## Decisões Locked

   [Extrair decisões relevantes do Projeto.md/Roadmap.md]

   ## Claude's Discretion

   [Áreas de autonomia]
   </decisions>

   <specifics>
   ## Referências Específicas

   [Preferências do usuário, exemplos concretos, requisitos verbais]
   </specifics>

   ## Próximos Passos

   [Extrair do TODO.md]

   <deferred>
   ## Ideias Adiadas

   | Ideia | Fase Sugerida | Notas |
   |-------|---------------|-------|
   </deferred>

   ## Diário de Rodadas
   ```

5. Registrar em .planning/README.md:
   - Adicionar linha na tabela de milestones
   - Formato: | MX.X | MX.X-nome | (ativo) | .planning/milestones/MX.X-nome/CONTEXT.md |

6. Sugerir commit:
   chore(planning): inicializa infraestrutura para MX.X
```

## Integração com validate-dor

O skill `validate-dor` adiciona um step pré-checklist:
1. Glob `.planning/milestones/MX.X-*/`
2. Se não encontrar → **BLOQUEADOR**
3. Mensagem: "Execute `init-milestone MX.X` antes de prosseguir"

## Quando NÃO Usar

- Para detours → usar skill `init-detour` (cria estrutura equivalente em `.planning/detours/`)
- Para patches → criar `.planning/patches/{slug}/plan.md`
- Para milestone já existente → idempotente (reporta e sai)

## Referências

- `.planning/README.md` — Hub de initiatives
- `.planning/milestones/` — Diretório raiz de milestones
- `documents/core/Roadmap.md` — Definição de milestones (DoR/DoD)
- `documents/core/TODO.md` — Tarefas granulares

## Skills Relacionadas

- `init-detour [nome]` — Equivalente para detours transversais
- `validate-dor [milestone]` — Gate que verifica existência do diretório
- `validate-dod [milestone]` — Salva reports em verification/
- `fresh-context [milestone]` — Salva handoffs em handoff/

---

## Changelog

### v2.0.0 (Março/2026)

**Unificação de Initiatives:**
- Remove criação de README.md (CONTEXT.md unificado com metadata table)
- Adiciona seção `<specifics>` ao template CONTEXT.md
- Adiciona seção "Diário de Rodadas" ao template
- "Quando NÃO Usar" referencia `init-detour` ao invés de criação manual
- Acentuação corrigida em todo o documento

### v1.0.0 (Março/2026)

**Criação Inicial:**
- Criação idempotente de diretório de milestone
- CONTEXT.md com templates e XML tags
- Subdiretórios: verification/, handoff/, plans/
- Registro automático em .planning/README.md
- Integração com validate-dor como BLOQUEADOR

**Autor:** Fernando Bertholdo
**Contexto:** Reestruturação .planning/ para modelo milestone-cêntrico
