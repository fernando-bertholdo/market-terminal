---
name: generate-session-prompt
description: Gerar prompt para retomada de desenvolvimento em nova sessão. Use quando sessão >150k tokens, ao retomar trabalho após pausa, ao trocar de ferramenta, ou em mudança de contexto. Aceita argumento de detalhe (brief, standard, detailed).
---

# Generate Session Prompt

Gera prompt para continuidade de trabalho em nova sessão, adaptando nível de detalhe ao contexto.

## Quando Usar

- Sessão atual >150k tokens (performance degradada)
- Retomar trabalho após pausa (dias/semanas)
- Trocar de ferramenta (ex: Cursor → Claude Code)
- Mudança de contexto (ex: finalizou detour, vai retomar milestone)
- Handoff de tarefas complexas com conclusões a preservar

## Níveis de Detalhe

A skill aceita um argumento que define a profundidade do prompt gerado:

| Nível | Invocação | Tokens | Quando Usar |
|-------|-----------|--------|-------------|
| **brief** | `generate-session-prompt brief` | 200-500 | Continuação imediata, mesmo contexto, próximo dia |
| **standard** | `generate-session-prompt` (default) | 800-1500 | Retomada após pausa, troca de ferramenta, complexidade moderada |
| **detailed** | `generate-session-prompt detailed` | 1500-3000+ | Handoff complexo, múltiplas tarefas pendentes, conclusões/análises a preservar |

### Quando usar cada nível

**brief** — Quando o contexto da próxima sessão é simples:
- Mesma iniciativa, continuando de onde parou
- Poucas tarefas restantes, caminho claro
- Sem análises ou conclusões a transportar

**standard** (default) — Para a maioria dos casos:
- Retomada após dias/semanas
- Troca de ferramenta (Cursor → Claude Code)
- Iniciativa com progresso parcial e próximos passos claros
- Algumas decisões ou conclusões a registrar

**detailed** — Quando o prompt precisa carregar contexto rico:
- Múltiplas tarefas pendentes com sub-itens e pontos de atenção
- Conclusões de análises (monitoramento, arquitetura, roadmap) que a próxima sessão deve executar
- Handoff de sessão longa com descobertas técnicas (ex: APIs, convenções, bugs)
- Transição entre fases ou reconciliação de roadmap
- Quando o usuário pede "contexto completo" ou "prompt detalhado"

### Seleção automática (quando o usuário não especifica nível)

Se o usuário não indicar nível explicitamente, **inferir** com base no contexto:

```
Sessão curta + mesma iniciativa + poucas tarefas     → brief
Caso geral / sem indicação clara                     → standard
Sessão com análises, conclusões ou múltiplas tarefas → detailed
Usuário pediu "contexto completo" ou similar         → detailed
```

## Princípios

1. **Contexto proporcional** — O detalhe do prompt deve ser proporcional à complexidade do handoff
2. **Referências @** — Facilita navegação do agente (links diretos a arquivos)
3. **Conclusões inline** — Carregar conclusões/análises no prompt quando a próxima sessão precisa agir sobre elas (nível standard e detailed)
4. **Iniciativa-agnóstico** — Funciona para milestones, detours, patches, ajustes de roadmap, ou trabalho avulso
5. **Skills contextuais** — Indicar skills relevantes para a próxima sessão

## Procedimento de Geração

```bash
1. Identificar tipo de trabalho
   - Ler .planning/README.md para identificar tipo (milestone / detour / patch)
   - Se milestone → localizar .planning/milestones/MX.X-nome/
   - Se detour → localizar .planning/detours/<nome>/
   - Se patch → verificar .planning/patches/{slug}/plan.md
   - Se avulso (sem vínculo) → verificar .planning/scratch/

2. Coletar estado atual
   - Resolver path do CONTEXT.md:
     a. Milestone: .planning/milestones/MX.X-*/CONTEXT.md (glob)
     b. Detour: .planning/detours/<nome>/CONTEXT.md
     c. Fallback legado: _archive/<id>/CONTEXT.md
     d. Se nada → prosseguir sem CONTEXT.md (usar Roadmap/TODO)
   - Ler CONTEXT.md resolvido (contexto vivo, se existir)
   - Ler Roadmap.md (milestone/fase atual, DoR/DoD)
   - Ler TODO.md (tarefas pendentes e progresso)
   - Ler plans em .claude/plans/ (se existir)
   - Verificar últimos commits (git log --oneline -5)
   - Verificar git status (mudanças pendentes)
   - Ler Projeto.md (regras de negócio, se relevante)
   - Coletar conclusões/análises da sessão atual (se houver)

3. Determinar nível de detalhe
   - Usar argumento explícito se fornecido
   - Caso contrário, inferir (ver seção "Seleção automática")

4. Gerar prompt seguindo guidelines do nível escolhido
   - Usar seções estruturais flexíveis (ver abaixo)
   - Número de referências, bullets e tarefas proporcional ao nível

5. Validar contra checklist do nível
```

## Estrutura por Nível

### Brief (200-500 tokens)

**Seções:**
- Linha de abertura (iniciativa + tipo)
- Referências (3-5)
- Objetivo (1 linha)
- Contexto atual (3-5 bullets)
- Tarefas (3-4 ações)

**Formato:**
```markdown
Vamos continuar o desenvolvimento do Monitor de Fundos Lass
na [TIPO: milestone|detour|ajuste] [ID] ([NOME]).

**Referências principais:**
- @[arquivo1] (contexto sobre X)
- @[arquivo2] (tarefas e checklist)
- @[arquivo3] (se aplicável)

**Objetivo:** [Descrição concisa — 1 frase]

**Contexto atual:**
- [Progresso — N% ou X/Y tarefas]
- [Estado — o que foi feito]
- [Próximo — o que falta]

**Por favor:**
1. [Tarefa 1]
2. [Tarefa 2]
3. [Tarefa 3]
4. [Tarefa 4 — atualizar docs/tracking]
```

### Standard (800-1500 tokens — default)

**Seções:**
- Linha de abertura (iniciativa + tipo + contexto breve)
- Referências (5-8)
- Objetivo (1-2 frases)
- Contexto/Progresso (5-8 bullets, organizados por tema)
- Decisões/Conclusões relevantes (se houver — resumo de 2-5 bullets)
- Tarefas (4-6 ações com sub-detalhes quando necessário)
- Skills sugeridas

**Formato:**
```markdown
Vamos continuar o desenvolvimento do Monitor de Fundos Lass
na [TIPO] [ID] ([NOME]). [1 frase de contexto situacional]

**Referências principais:**
- @[arquivo1] (contexto — detalhe)
- @[arquivo2] (tarefas — detalhe)
- @[arquivo3] (plano/evidência — detalhe)
- ... (até 8 refs)

**Objetivo:** [Descrição — 1-2 frases]

**Contexto atual:**
- [Progresso quantitativo]
- [Estado das entregas]
- [Decisões pendentes ou recentes]
- [Bloqueios/dependências se houver]

**Conclusões da sessão anterior:** (se aplicável)
- [Conclusão 1 — resumo]
- [Conclusão 2 — resumo]
- [Impacto/próximos passos derivados]

**Por favor:**
1. [Tarefa 1 — com contexto mínimo]
2. [Tarefa 2 — com skill sugerida]
3. [Tarefa 3 — com critério de completude]
4. [Tarefa 4 — atualizar docs/tracking]
```

### Detailed (1500-3000+ tokens)

**Seções:**
- Linha de abertura (iniciativa + tipo)
- Referências (sem limite arbitrário — todas as relevantes)
- Objetivo + sub-objetivos
- Contexto expandido (situação, progresso, estado de cada frente)
- Seções por tarefa/frente pendente com:
  - Conclusões/análises da sessão (inline, não referenciadas)
  - Pontos de atenção identificados
  - Ações sugeridas com detalhes
- Tarefas consolidadas (lista final acionável)
- Skills e validações

**Formato:**
```markdown
Vamos continuar o desenvolvimento do Monitor de Fundos Lass
com foco em [DESCRIÇÃO DO FOCO]. [2-3 frases de contexto situacional]

**Referências principais:**
- @[arquivo1] (detalhe)
- @[arquivo2] (detalhe)
- ... (todas as referências relevantes, sem limite)

**Objetivo:** [Parágrafo descrevendo o objetivo principal e sub-objetivos]

---

### Contexto: [Frente/Iniciativa 1]

[Parágrafo descrevendo estado, progresso, entregas]
[Dados quantitativos: commits, testes, cobertura]
[Referências a evidências]

---

### TAREFA A — [Nome da tarefa]

**Conclusão da análise anterior:**
- [Ponto 1 — com justificativa]
- [Ponto 2 — com alternativas descartadas]
- [Ponto 3 — com recomendação]

**Ação sugerida:**
1. [Sub-ação 1 — detalhada]
2. [Sub-ação 2 — detalhada]
3. [Sub-ação 3 — detalhada]

---

### TAREFA B — [Nome da tarefa]

**Pontos de atenção identificados:**

**Ponto 1: [Título]**
- Estado real: [descrição]
- Ação: [o que fazer]

**Ponto 2: [Título]**
- Estado real: [descrição]
- Ação: [o que fazer]

(... quantos pontos forem necessários)

---

**Por favor:**
1. [Tarefa consolidada 1 — com referências]
2. [Tarefa consolidada 2 — com skills sugeridas]
3. [Tarefa consolidada 3 — com critérios de completude]
4. [Tarefa consolidada 4 — com referências a seções acima]
5. [Tarefa consolidada N — atualizar docs/tracking]
```

## Templates por Tipo de Trabalho

### Milestone (qualquer nível)

**Abertura:** `Vamos continuar a implementação do milestone [ID] ([NOME]).`
**Referências obrigatórias:** Roadmap.md (DoR/DoD), TODO.md (seção do milestone), CONTEXT.md da initiative
**Contexto:** Progresso quantitativo (X/Y tarefas, N% DoD), próxima tarefa, bloqueios
**Skills:** validate-dor, validate-dod, pre-commit-check, validate-testing

### Detour (qualquer nível)

**Abertura:** `Vamos continuar o detour [NOME] (relacionado a [MILESTONES]).`
**Referências obrigatórias:** .planning/detours/<nome>/CONTEXT.md, Roadmap.md (seção Desvios), TODO.md
**Contexto:** Fases do detour, entregas já concluídas, impacto em milestones futuros
**Skills:** pre-commit-check, organize-commits, update-docs

### Ajuste de Roadmap / Documentação (qualquer nível)

**Abertura:** `Vamos continuar os ajustes de roadmap e documentação do Monitor de Fundos Lass.`
**Referências obrigatórias:** Roadmap.md, TODO.md, Projeto.md, .planning/README.md
**Contexto:** O que motivou os ajustes, quais milestones são afetados, decisões a registrar
**Skills:** update-docs, validate-docs-links, audit-architecture

### Troubleshooting (qualquer nível)

**Abertura:** `Vamos resolver o issue [DESCRIÇÃO] no contexto de [INICIATIVA].`
**Referências obrigatórias:** Arquivo com erro, log/evidência, TODO.md
**Contexto:** Sintoma, esperado, tentativas anteriores, impacto
**Skills:** pre-commit-check, validate-testing

### Trabalho Avulso / Sem Milestone (qualquer nível)

**Abertura:** `Vamos trabalhar em [DESCRIÇÃO] no projeto Monitor de Fundos Lass.`
**Referências:** .planning/scratch/<slug>-CONTEXT.md (se existir), arquivos relevantes
**Contexto:** Motivação, escopo, relação com roadmap (se houver)

## Regras de Geração

### SEMPRE:

1. Adaptar detalhe ao nível solicitado/inferido
2. Usar referências @ (facilita navegação do agente)
3. Incluir métricas quando disponíveis (progresso %, coverage, commits)
4. Referenciar skills aplicáveis à próxima sessão
5. Incluir conclusões/análises inline quando a próxima sessão precisa agir sobre elas
6. Identificar tipo de trabalho (milestone, detour, patch, ajuste, avulso)
7. Incluir validações e critérios de completude

### NUNCA:

1. Incluir histórico completo da sessão (resumir, não copiar)
2. Duplicar conteúdo extenso dos arquivos referenciados (resumir e apontar)
3. Usar descrições genéricas ("continue o trabalho")
4. Omitir referências aos arquivos principais
5. Forçar formato de milestone quando o trabalho não é milestone
6. Ignorar conclusões/análises relevantes da sessão atual em níveis standard/detailed

## Validação por Nível

### Brief

- [ ] Tokens: 200-500
- [ ] Referências: 3-5
- [ ] Objetivo: 1 frase clara
- [ ] Contexto: 3-5 bullets
- [ ] Tarefas: 3-4 ações específicas
- [ ] Tipo de trabalho identificado

### Standard

- [ ] Tokens: 800-1500
- [ ] Referências: 5-8
- [ ] Objetivo: 1-2 frases
- [ ] Contexto: 5-8 bullets organizados
- [ ] Conclusões: inline se houver (2-5 bullets)
- [ ] Tarefas: 4-6 ações com sub-detalhes
- [ ] Skills sugeridas
- [ ] Tipo de trabalho identificado

### Detailed

- [ ] Tokens: 1500-3000+
- [ ] Referências: todas as relevantes (sem limite)
- [ ] Objetivo: parágrafo com sub-objetivos
- [ ] Contexto: expandido por frente/iniciativa
- [ ] Conclusões/Análises: seções dedicadas por tarefa
- [ ] Pontos de atenção: listados com estado real + ação
- [ ] Tarefas: consolidadas com referências às seções
- [ ] Skills e validações sugeridas
- [ ] Tipo de trabalho identificado

## Fluxo de Uso

### Cenário 1: Continuação simples

```bash
# Mesmo milestone, próximo dia
generate-session-prompt brief
# ou: generate-session-prompt brief M1.5
```

### Cenário 2: Retomada após pausa

```bash
# Após dias/semanas sem tocar no projeto
generate-session-prompt
# Gera prompt standard (default)
```

### Cenário 3: Handoff complexo

```bash
# Sessão com análises, conclusões e múltiplas tarefas pendentes
generate-session-prompt detailed
# Prompt carrega conclusões, pontos de atenção, ações detalhadas
```

### Cenário 4: Troca de ferramenta

```bash
# Cursor → Claude Code (precisa contexto suficiente)
generate-session-prompt
# ou detailed se houver muito contexto a preservar
```

### Cenário 5: Sem milestone

```bash
# Trabalho avulso, sem vínculo direto
generate-session-prompt
# Detecta automaticamente que não há milestone ativo
# Busca em .planning/scratch/ e sessão atual
```

## Troubleshooting

### Problema: Prompt muito genérico

**Causa:** Tipo de trabalho não identificado ou docs desatualizados
**Solução:** Especificar tipo/ID ou atualizar TODO.md/CONTEXT.md antes

### Problema: Prompt detalhado quando queria conciso

**Causa:** Inferência automática optou por mais detalhe
**Solução:** Usar argumento explícito: `generate-session-prompt brief`

### Problema: Conclusões da sessão não aparecem no prompt

**Causa:** Nível brief não inclui conclusões; ou sessão não teve análises explícitas
**Solução:** Usar nível standard ou detailed

### Problema: Referências quebradas

**Causa:** Arquivos movidos ou renomeados
**Solução:** Executar `validate-docs-links` primeiro

## Referências

- `.planning/README.md` — Hub: mapeamento milestone→initiative, tipos de trabalho
- `.planning/milestones/MX.X-nome/CONTEXT.md` — Contexto vivo de milestone
- `.planning/detours/<nome>/CONTEXT.md` — Contexto vivo de detour
- `.planning/scratch/` — Context dumps avulsos (sem milestone)
- `documents/core/Roadmap.md` — Milestones, desvios, DoR/DoD
- `documents/core/TODO.md` — Tarefas granulares e progresso
- `documents/core/Projeto.md` — Regras de negócio e decisões
- `CLAUDE.md` — Regras operacionais

## Skills Relacionadas

- `fresh-context` — Gerar CONTEXT.md para handoff (complementar: context file vs. prompt)
- `validate-dor` — Validar DoR antes de iniciar milestone
- `validate-dod` — Validar DoD antes de fechar milestone
- `update-docs` — Atualizar documentação (Projeto/Roadmap/TODO)
- `pre-commit-check` — Qualidade antes de commit

---

## Changelog

### v3.0.0 (19/Fevereiro/2026)

**Evolução para níveis de detalhe dinâmicos:**
- Três níveis: brief (200-500 tokens), standard (800-1500, default), detailed (1500-3000+)
- Substituição de "formato obrigatório" por guidelines flexíveis por nível
- Suporte a iniciativa-agnóstico (milestone, detour, patch, ajuste, avulso)
- Templates por tipo de trabalho (5 tipos vs. 4 milestone-only anteriores)
- Procedimento expandido para cobrir todos os tipos de .planning/
- Conclusões/análises inline nos níveis standard e detailed
- Remoção do hard cap de 250 tokens e limites fixos de referências/tarefas
- Inferência automática de nível quando não especificado
- Validação por nível (checklists separados)

**Autor:** Fernando Bertholdo
**Contexto:** Feedback de uso real — prompts curtos demais perdiam contexto de análises,
formato milestone-only não cobria detours e ajustes de roadmap

### v2.0.0 (27/Janeiro/2026)

- Criação dos templates por tipo (Planejamento, Implementação, Testes, Troubleshooting)
- Integração com skills (validate-dor, validate-dod, etc.)
- Limite de 250 tokens

### v1.0.0 (22/Janeiro/2026)

- Criação inicial
