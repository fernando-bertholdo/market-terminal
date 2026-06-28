---
name: fresh-context
description: Gerar ou atualizar documento CONTEXT.md para handoff entre sessões ou subagentes. Use quando sessão >150k tokens, ao iniciar novo milestone, ao handoff para subagente, ou quando context rot degradar qualidade. Cria documento self-contained para continuação em janela limpa.
---

# Fresh Context - Handoff Document Generator

Gera documento CONTEXT.md self-contained para permitir continuação de trabalho em contexto limpo.

## Regra de Ouro

> **"Contexto fresco > contexto acumulado com noise"**

Sessões longas (>150k tokens) degradam qualidade. CONTEXT.md permite recomeço limpo sem perda de informação essencial.

## Quando Usar

- **Sessão >150k tokens** - Context rot detectado
- **Iniciar novo milestone** - Criar CONTEXT.md antes de começar
- **Handoff para subagente** - Fornecer contexto focado
- **Retomada após pausa** - Em vez de reler toda sessão anterior
- **Transição entre fases** - Capturar estado atual

## Escopo

O `fresh-context` existe para **continuidade/handoff** (retomar trabalho em contexto limpo). O output deve ser **curto** e apontar para fontes (Roadmap/TODO/Projeto), não duplicar documentação.

**Inclua no CONTEXT.md:**
- Escopo (DoR/DoD) com referência ao `Roadmap.md`
- Progresso e próximos passos com referência ao `TODO.md`
- Decisões locked mínimas para continuar sem re-debater

**Não inclua no CONTEXT.md:**
- Walkthrough detalhado de implementação, logs longos, lista completa de diffs
- Procedimentos reutilizáveis (isso vai para `documents/guides/`)
- Decisões “fonte de verdade” que deveriam estar em `Projeto.md` (o CONTEXT é derivado)

## Workflow de Geração

```bash
1. Receber milestone-id (ex: M1.2) ou detectar atual via Roadmap.md

2. Resolver path do CONTEXT.md:
   - Se milestone MX.X:
     a. Glob .planning/milestones/MX.X-*/CONTEXT.md
     b. Se encontrado → usar como contexto vivo
     c. Se NÃO encontrado → verificar _archive/milestones/MX.X-*/
     d. Se nem lá → fallback legado: _archive/<initiative>/CONTEXT.md
     e. Se nada → perguntar ao usuário
   - Se detour:
     a. Tentar .planning/detours/<nome>/CONTEXT.md
     b. Fallback: _archive/detours/<nome>/CONTEXT.md
     c. Fallback legado: _archive/<nome>/CONTEXT.md
   - Se SEM milestone (dump sob demanda) → usar .planning/scratch/
   Nota: Para conteúdo arquivado, ler CONTEXT.md do _archive/ mas salvar
   novos handoffs em .planning/scratch/ (não reescrever dentro do _archive/).

3. Ler documentos fonte:
   - Roadmap.md → Escopo (DoR/DoD do milestone)
   - TODO.md → Progresso e tarefas pendentes
   - Projeto.md → Decisões técnicas já tomadas (se aplicável)
   - CONTEXT.md resolvido no step 2 → Contexto vivo (se existir)
   - Sessão atual → Decisões e discussões recentes

4. Preencher template CONTEXT.md:
   - <domain> → Escopo fixo do Roadmap.md
   - <decisions> → Decisões locked + discretion areas
   - <specifics> → Referências específicas do usuário
   - <deferred> → Ideias adiadas para evitar scope creep

5. Salvar em (conforme tipo):
   - COM milestone → .planning/milestones/MX.X-nome/handoff/MX.X-CONTEXT.md
   - COM detour → .planning/detours/<nome>/handoff/<nome>-CONTEXT.md
   - SEM milestone → .planning/scratch/{slug}-CONTEXT.md

6. Gerar prompt de continuação (opcional):
   - Sugerir /clear com rationale
   - Incluir referências mínimas
```

## Template de Seções

### `<domain>` - Escopo Imutável

```markdown
<domain>
## Escopo do Milestone

**O que ESTÁ no scope:**
- [Extrair de DoR/DoD do Roadmap.md]

**O que NÃO ESTÁ no scope:**
- [Listar explicitamente para evitar scope creep]

**Referência:** Roadmap.md seção [MILESTONE-ID]
</domain>
```

### `<decisions>` - Decisões e Discretion

```markdown
<decisions>
## Decisões Locked

[Decisões já tomadas que NÃO devem ser re-questionadas]

- **Selenium vs Playwright:** Selenium escolhido
  - Motivo: Maior estabilidade com portais legados

## Claude's Discretion

[Áreas onde o agente pode decidir autonomamente]

- Estrutura interna de classes
- Nomes de variáveis locais
- Ordem de implementação de subtarefas
</decisions>
```

### `<specifics>` - Referências do Usuário

```markdown
<specifics>
## Referências Específicas

- "Quero e-mail similar ao relatório semanal Lass atual"
- "Formato de % DC deve ter 2 casas decimais"

[Pode estar vazio se não há referências específicas]
</specifics>
```

### `<deferred>` - Ideias Adiadas

```markdown
<deferred>
## Ideias Adiadas

| Ideia | Fase Sugerida | Notas |
|-------|---------------|-------|
| Dashboard histórico | Fase 4 | Mencionado na discussão inicial |
| Alertas Slack | Backlog | Usuário não tem Slack ainda |
</deferred>
```

## Exemplo de Uso

### Cenário: Sessão longa, iniciar M1.2

**Input:** `fresh-context M1.2`

**Output:** Arquivo `.planning/btg-collectors/handoff/M1.2-CONTEXT.md`

```markdown
# CONTEXT: M1.2 - Coletor Básico

**Fase:** Fase 1 - PoV
**Gerado em:** 27/Janeiro/2026
**Última atualização:** 27/Janeiro/2026

---

<domain>
## Escopo do Milestone

**O que ESTÁ no scope:**
- Login automatizado no Portal BTG
- Download de relatórios (carteira + extrato) para 1-2 fundos piloto
- Parsing básico dos arquivos baixados
- Validação de completude dos dados

**O que NÃO ESTÁ no scope:**
- Todos os fundos (apenas 1-2 piloto)
- Motor de alertas (Fase 2)
- Persistência de histórico (M2.4)

**Referência:** Roadmap.md seção M1.2
</domain>

---

<decisions>
## Decisões Locked

### Tecnologia
- **Scraping:** Selenium
  - Alternativas: Playwright
  - Motivo: Maior maturidade com portais bancários

### Formato de Dados
- **Fonte:** XML ISO20022 (decidido em Fase 0)
  - Alternativas: Excel, PDF
  - Motivo: Estruturado, padrão internacional

## Claude's Discretion

- Estrutura interna de classes do scraper
- Nomes de métodos auxiliares
- Estratégia de waits (explicit/implicit)
</decisions>

---

<specifics>
## Referências Específicas

- Credenciais BTG em `.env` (BTG_USERNAME, BTG_PASSWORD)
- Timeout padrão: 30 segundos
- Retry: 3 tentativas com backoff
</specifics>

---

<deferred>
## Ideias Adiadas

| Ideia | Fase Sugerida | Notas |
|-------|---------------|-------|
| Tratamento 2FA | M3.1 | Hardening |
| Download paralelo | Fase 4 | Otimização futura |
</deferred>

---

## Próximos Passos

1. Implementar BTGScraper.login()
2. Implementar BTGScraper.download_carteira()
3. Implementar Parser básico

**Skills aplicáveis:**
- `pre-commit-check` - Antes de commits
- `validate-testing` - Após implementar testes
```

### Prompt de Continuação Gerado

```markdown
/clear

Vamos continuar M1.2 (Coletor Básico).

**Contexto:** Ver .planning/btg-collectors/handoff/M1.2-CONTEXT.md

**Decisões locked:** Selenium, XML ISO20022

**Próxima tarefa:** Implementar BTGScraper.login()

**Referências:**
- @.planning/btg-collectors/handoff/M1.2-CONTEXT.md (handoff)
- @documents/core/TODO.md (tracking)
- @rules/api-integration-patterns.md (BTG portal)
```

## Parâmetros

### Milestone ID (obrigatório ou auto-detectado)

```bash
# Especificar milestone
fresh-context M1.2

# Auto-detectar do Roadmap.md
fresh-context

# Contexto de fase inteira
fresh-context Fase0
```

### Opções

| Opção | Descrição |
|-------|-----------|
| `--update` | Atualiza CONTEXT.md existente |
| `--prompt` | Gera também prompt de continuação |
| `--subagent` | Formato otimizado para subagente |

## Integração com generate-session-prompt

O skill `fresh-context` complementa `generate-session-prompt`:

| Skill | Propósito | Output |
|-------|-----------|--------|
| `generate-session-prompt` | Prompt para retomada (3 níveis: brief/standard/detailed) | Texto para copiar |
| `fresh-context` | Documento persistente (~300-500 tokens) | Arquivo CONTEXT.md |

**Quando usar qual:**
- Pausa curta, continuação simples → `generate-session-prompt brief`
- Retomada após pausa, troca de ferramenta → `generate-session-prompt` (standard)
- Handoff complexo com conclusões/análises → `generate-session-prompt detailed`
- Sessão longa/subagente (context file persistente) → `fresh-context`
- Novo milestone → `fresh-context` primeiro, depois `generate-session-prompt` se precisar

## Referências

- **Hub de Iniciativas:** `.planning/README.md` (mapeamento milestone → initiative)
- **Milestones:** `.planning/milestones/MX.X-nome/` (CONTEXT.md, handoff/)
- **Detours:** `.planning/detours/<nome>/` (CONTEXT.md, handoff/)
- **Roadmap:** `documents/core/Roadmap.md`
- **TODO:** `documents/core/TODO.md`

## Skills Relacionadas

- `generate-session-prompt` - Prompt para retomada (brief/standard/detailed)
- `validate-dor` - Validar DoR antes de iniciar
- `validate-dod` - Validar DoD ao concluir
- `update-docs` - Atualizar docs (Projeto/Roadmap/TODO/arquitetura)
