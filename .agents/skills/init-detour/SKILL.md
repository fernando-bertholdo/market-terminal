---
name: init-detour
description: Inicializar infraestrutura de planning para um detour transversal. Cria diretório dedicado em .planning/detours/ com CONTEXT.md unificado e subpastas (verification/, handoff/, plans/). Registra automaticamente em .planning/README.md (tabela de Desvios e Índice de Iniciativas). Use quando surgir trabalho emergente que cruza milestones.
---

# Init Detour

Cria a infraestrutura de planning para um detour, garantindo que o diretório dedicado existe e que o detour é registrado nos docs core.

## Regra de Ouro

> **"Detours têm a mesma disciplina de milestones — DoR/DoD rigoroso e bloqueante."**

`validate-dor` e `validate-dod` aceitam detour IDs e validam com o mesmo rigor que milestones.

## A Pergunta de Entrada

O detour é o tipo que satisfaz **dois de três sinais** — nasce fora do plano
escrito · entrega artefato próprio que passa a ser mantido · corre em paralelo à
veia principal. Alterar o plano **não** é um dos sinais: um detour pode alterar e
muitos alteram, mas não é isso que o define.

Por isso, no momento em que o detour nasce, esta skill faz **uma pergunta** e
registra a resposta no `CONTEXT.md`:

> **O que este trabalho muda no plano?**
> — Se a resposta for "nada", confira a classificação antes de seguir: pode ser
>   fatia da milestone (um sinal só) ou issue avulsa (nenhum).
> — Se for algo, escreva o quê. Ao fechar, é isso que o `Roadmap.md` recebe **na
>   fase ou milestone que muda** — nunca como linha de log datada.

O teste vale na **entrada**, onde reclassificar custa um minuto. Se o plano não
mudou ao fechar, o `Roadmap.md` não é tocado: `documents/README.md` manda
atualizá-lo quando o plano muda e **nunca para registrar avanço**.

> **Mudou em 14/09/2026 (TECH-574).** A versão anterior contraía uma dívida de
> saída — uma linha de delta datada no `Roadmap.md`, "sem a qual o detour não
> fecha". Medição: **66 detours** na linhagem e **zero** linhas cumpridas. Esta
> skill mandava escrevê-la numa seção do `Roadmap.md` que nunca existiu.

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

Lista de milestone IDs relacionados (separados por vírgula). Registrados na metadata do CONTEXT.md e na tabela de Desvios do `.planning/README.md`.

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
   | **Índice** | `.planning/README.md` — tabela de Desvios e Índice de Iniciativas |
   | **O que muda no plano** | [Resposta da pergunta de entrada; "nada" exige reconferir a classificação] |

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

5. Responder a pergunta de entrada e gravá-la no CONTEXT.md:
   - Perguntar ao usuário: **"O que este trabalho muda no plano?"**
   - Se a resposta for "nada": avisar que a classificação pode estar errada
     (um sinal = fatia; nenhum = issue avulsa) e confirmar antes de seguir
   - Gravar a resposta no campo **O que muda no plano** da metadata
   - **Não** escrever no `documents/core/Roadmap.md`: o índice do detour vive no
     `.planning/README.md` (passo 4), e o Roadmap só muda se a sequência de fases
     mudar de fato, ao fechar, onde ela vive

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
- `.planning/README.md` — tabela de Desvios e Índice de Iniciativas (é aqui que o detour é indexado)

## Skills Relacionadas

- `init-milestone [MX.X]` — Equivalente para milestones planejados
- `validate-dor [detour-name]` — Gate que verifica existência do diretório
- `validate-dod [detour-name]` — Salva reports em verification/
- `fresh-context [detour-name]` — Salva handoffs em handoff/

---

## Changelog

### v2.0.0 (14/Set/2026 — TECH-574)
- **BREAKING:** a dívida de saída é substituída por pergunta de entrada. O detour não escreve mais linha de delta no `Roadmap.md` ao fechar
- A definição de detour passa a ser a mesma do `AGENTS.md` §2 (dois de três sinais); alterar o plano deixa de ser definidor
- Sai o passo que registrava na seção "🔀 Desvios e Iniciativas Apartadas" do `Roadmap.md` — seção que nunca existiu no template
- O índice do detour vive só no `.planning/README.md`
- Medição que motivou: 66 detours na linhagem, zero linhas de delta cumpridas

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
