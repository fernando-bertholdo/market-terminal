# Claude Code - Regras do Projeto Market Terminal

Este arquivo contém as **regras operacionais sempre ativas** para o projeto Market Terminal.

> **Arquitetura Single Source of Truth:**
> - Regras operacionais → Este arquivo
> - Contexto de negócio e arquitetura → @documents/core/Projeto.md
> - Detalhes técnicos → `rules/*.md` (path-targeted via frontmatter `paths:`)
> - Workflows → @skills/*/SKILL.md

---

## 1. Acompanhamento de Roadmap e TODO

### Responsabilidade Contínua

**Antes de começar qualquer tarefa:**
- Consultar @documents/core/Roadmap.md para verificar a initiative atual (milestone ou detour)
- **Invocar skill `init-milestone [milestone-id]`** ou **`init-detour [detour-name]`** para criar infraestrutura de planning (se diretório não existe)
- **Invocar skill `validate-dor [initiative-id]`** para validar pré-requisitos
- Se DoR não estiver completo, PARE e trabalhe nas dependências primeiro
- Consultar @documents/core/TODO.md para tarefas granulares

**Durante o desenvolvimento:**
- Consultar periodicamente o **DoD (Definition of Done)** no Roadmap
- **Invocar skill `validate-testing`** para validar cobertura de testes
- Marcar checkboxes no TODO.md conforme avança
- Usar formato `- verify:` nas tarefas para verificações programáticas

**Antes de commit:**
- **Invocar skill `pre-commit-check`** (inclui code quality, testing, security)
- **Invocar skill `organize-commits`** se múltiplas mudanças pendentes

**Ao completar uma tarefa:**
- **Invocar skill `validate-dod [initiative-id]`** para validar conclusão
  - Executa `verify:` steps do TODO.md automaticamente
  - Gera Verification Report com PASS/FAIL
  - Se PASS e último milestone da initiative: `validate-dod` aciona `reconcile-initiative` automaticamente
- **Invocar skill `update-docs task [milestone-id]`** para atualizar `documents/core/Projeto.md` (incl. Changelog) e manter referência curta no `documents/core/Roadmap.md`
- Se decisões mudarem a ordem/dependências, **invocar `update-docs roadmap`** para revisar `Roadmap.md` + `TODO.md`
- Verificar se `reconcile-initiative` foi executado antes de marcar initiative como concluída
- Atualizar checkboxes no TODO.md
- Documentar evidências (testes, screenshots, métricas)

**Ao completar uma fase:**
- **Invocar skill `validate-docs-links check`** para validar links
- **Invocar skill `audit-rules full`** para auditar regras
- **Invocar skill `audit-architecture`** para verificar redundâncias (inclui revisão de seeds)
- **Revisar a seção Seeds** do `.planning/README.md` — consumir, promover ou deletar; nenhum seed atravessa a fase sem decisão (§1.7)
- **Invocar skill `archive-initiative --phase <fase>`** para arquivar initiatives concluídas

### Regra de Ouro

**"Se DoR não está completo, NÃO comece. Se DoD não está 100% atendido, NÃO está done."**

---

## 1.5 Manutenção de `scripts/`

### Responsabilidade Contínua

**Antes de criar, mover ou arquivar script:**
- Auto-load da rule [`.claude/rules/scripts-governance.md`](rules/scripts-governance.md) orienta categoria e checklist
- Atualizar `scripts/INDEX.md` na MESMA operação (commit único)
- Categoria deve sair do glossário em `scripts/README.md` (não chutar)

**Periodicamente (fim de fase, antes de release):**
- **Invocar skill `audit-scripts`** para detectar drift, cruft, scripts stale

### Anti-pattern Crítico

Script criado sem entrada no `scripts/INDEX.md` deve ser **reprovado em review** — INDEX desatualizado quebra a Regra de Ouro de scripts-governance.

---

## 1.7 Registro Contínuo de Descobertas (Nenhuma Pendência Órfã)

### Regra de Ouro

**"Todo 'vale confirmar', 'investigar depois', 'na retomada', requisito ou decisão que emergir num turno DEVE ganhar endereço de registro no MESMO turno."**

Compromissos que vivem só na prosa da conversa evaporam. Registro faz parte da resposta, não é tarefa posterior. Esta regra cobre o buraco entre trabalho formal (gates de DoR/DoD/commit) e **descoberta conversacional** — exploração, diagnóstico e design que acontecem fora de initiative formal.

### Destinos

| O que emergiu | Destino |
|---|---|
| Decisão/requisito de initiative formal existente | `CONTEXT.md` da initiative (milestone ou detour) |
| Requisito de initiative AINDA NÃO formalizada | Seed: `.planning/scratch/seed-<slug>.md` + linha na seção Seeds do `.planning/README.md` |
| Decisão consolidada de negócio/arquitetura | `update-docs` → `documents/core/Projeto.md` |
| Fato operacional de ambiente/infra durável | Runbook/doc operacional em `documents/` |

**Harness-agnóstico:** memória nativa do harness (ex.: auto-memory do Claude Code), quando existir, é **cache pessoal do agente** — acelera recall, mas nunca é registro canônico. Nenhuma skill ou regra pode depender de conteúdo que só exista na memória de um harness.

**Lifecycle dos seeds:** duráveis até decisão, com exatamente 3 saídas — **consumido** (`init-detour`/`init-milestone` step 2.5, fonte primária do CONTEXT.md), **promovido/mesclado** em initiative existente, ou **deletado** com justificativa. Revisão obrigatória no fechamento de fase e na `audit-architecture` (check 6); nenhum seed atravessa uma fase sem decisão.

### Contrato de Resposta

Turnos que produziram descobertas terminam com um bloco curto (antes da linha de status final):

```
📌 Registros deste turno:
- <item> → <destino>
```

Turnos triviais (respostas diretas, sem descobertas) ficam isentos.

---

## 2. Context Engineering e Uso de Subagentes

### Otimização de Contexto

Você tem 200,000 tokens de contexto. Para maximizar performance:

**Trigger de Fresh Context (>150k tokens):**
- Quando sessão ultrapassar **150k tokens**, invocar skill `fresh-context`
- Gera CONTEXT.md self-contained para handoff limpo
- Previne "context rot" que degrada qualidade
- **Paths por tipo:**
  - COM milestone → `.planning/milestones/MX.X-nome/handoff/MX.X-CONTEXT.md`
  - SEM milestone → `.planning/scratch/{slug}-CONTEXT.md`

**Reduza Noise no Contexto:**
- **Leia apenas docs relevantes** para a tarefa atual
- **Use `documents/README.md` como índice** - não leia todos os docs de uma vez
- **Consulte documentos específicos (Roadmap/TODO/Projeto/architecture/walkthrough/Fresh Context)** ao invés de explorar todo o codebase

### Salvaguardas de Documentação (IA)

- `documents/core/Projeto.md` é a **fonte de verdade** para decisões de negócio e arquitetura.
- `documents/technical/` e `documents/strategy/` são **suplementares**; qualquer decisão final deve ser refletida em `Projeto.md`.
- Se houver conflito, **`Projeto.md` prevalece**. Adicione backlinks quando usar docs suplementares.

**Use Subagentes Estrategicamente (Task Tool):**
- Pesquisas exploratórias extensas
- Análise de múltiplos arquivos para decisões de design
- Investigação de bugs complexos
- Comparação de abordagens alternativas

### Regra "Docs First"

**Antes de qualquer grep, glob ou leitura extensiva:**
1. Consulte `documents/README.md` primeiro
2. Se docs estão atualizados → Use diretamente
3. Se docs desatualizados → Use Task tool (subagente) para pesquisa

### Regra "Planning First" (retomada e handoff)

**Antes de iniciar trabalho em milestone ou detour:**
1. Consulte `.planning/README.md` para identificar a initiative
2. Leia o CONTEXT.md da initiative:
   - Milestone: `.planning/milestones/MX.X-<nome>/CONTEXT.md`
   - Detour: `.planning/detours/<nome>/CONTEXT.md`
3. Se retomando, leia handoff em `.planning/<tipo>/<nome>/handoff/`
4. Se nenhum CONTEXT existe, use skill `fresh-context` para criar

**Para patches (correções rápidas, ≤2 sessões):**
- Crie `.planning/patches/{slug}/` com `plan.md` (estrutura simétrica a milestones/detours)
- Se escalar (>2 sessões), promova para detour mantendo o slug
- Ver `.planning/patches/README.md` para template e lifecycle

**Tipos de trabalho:** milestone | detour | patch
- Ver `.planning/README.md` para árvore de decisão e mapeamento

---

## 3. Agent Teams — Orquestração Multi-Agente

### Quando Usar Agent Teams

**Claude pode propor** criação de equipe quando detectar que a tarefa beneficiaria de trabalho paralelo. **Você confirma** antes de prosseguir.

**Você pode solicitar** equipe explicitamente. Exemplos:
- `Crie um time para pesquisar abordagens em paralelo antes de implementar`
- `Execute este milestone com 3 teammates: implementador, testador, revisor`

**Critérios para propor equipe (Claude deve avaliar):**
- Tarefa tem **3+ subtarefas independentes** (sem dependência entre si)
- Tarefa envolve **pesquisa + implementação** (fases distintas e paralelizáveis)
- Milestone tem tasks que **tocam arquivos diferentes** (sem conflito de merge)

**NÃO usar equipe quando:**
- Tarefa é simples (<100 linhas, 1-2 arquivos)
- Tasks têm dependência sequencial forte
- Milestone requer decisões arquiteturais incrementais

### Regras de Segurança para Teammates

**CRÍTICO — Teammates NÃO podem:**
- Fazer `git commit` ou `git add` → **Apenas o Lead commita**
- Editar `documents/core/TODO.md` ou `Roadmap.md` → **Apenas o Lead atualiza docs core**
- Editar `documents/core/Projeto.md` → **Single Source of Truth protegido**
- Invocar skills de documentação (`update-docs`, `organize-commits`) → **Lead only**
- Fazer `git push` → **Lead only, após consolidação**

**Teammates PODEM:**
- Ler qualquer arquivo do projeto (inclusive docs)
- Criar/editar código nos diretórios designados pelo Lead (ex.: `src/`, `tests/`, ou equivalente do stack)
- Executar testes (`pytest`, `npm test`, etc.)
- Reportar findings via mensagem ao Lead
- Ler Roadmap.md/TODO.md para entender contexto

### Delegate Mode

Ativar com **Shift+Tab** após criar equipe. Restringe o Lead a:
- Spawnar e gerenciar teammates
- Distribuir e acompanhar tasks
- Revisar e aprovar planos
- Consolidar resultados e commitar

**Usar quando:** Sprint com 3+ teammates para evitar que o Lead implemente ao invés de coordenar.

### Níveis, Composição e Spawn Prompts

> **Referência completa:** Invocar skill `agent-team` para os 3 níveis de orquestração (Research/Sprint/Pipeline), composição de equipe por nível e templates de spawn prompt (single source — não duplicar aqui).

### Quality Gates Automáticos

Hooks configurados em `.claude/settings.json`:
- **TaskCompleted:** Roda testes antes de permitir conclusão de task
- **TeammateIdle:** Verifica se teammate reportou status antes de parar

> **Detalhes dos hooks:** `.claude/hooks/check-task-completed.sh` e `.claude/hooks/check-teammate-idle.sh`

---

## 4. Princípios de Desenvolvimento

### Chunks Gerenciáveis
- **Máximo 100 linhas** por implementação
- **Quebrar** funcionalidades complexas em partes menores

### Explicação Contínua
- **Sempre explicar** o "porquê" das decisões técnicas
- **Documentar** trade-offs e alternativas consideradas

### Prova de Correção
- **Validar** implementação contra requisitos
- **Testar** com dados reais quando possível

---

## 5. Segurança - Regras Essenciais

### Regra de Ouro

**NUNCA commitar dados sensíveis no repositório.**

### Checklist Obrigatório

- [ ] Nenhum secret hardcoded no código
- [ ] Todas credenciais via environment variables
- [ ] .env no .gitignore
- [ ] .env.example documentado
- [ ] Error handling não expõe credenciais

> **Detalhes técnicos:** `rules/security-best-practices.md` (carrega ao editar src/, *.py, .env*)

---

## 6. Commit Strategy

### Regra de Ouro

**"1 task = 1 commit. NUNCA use git add . ou git add -A"**

Commits atômicos permitem:
- Git bisect eficiente (encontrar bugs)
- Reverts cirúrgicos (desfazer apenas uma mudança)
- Code review focado (revisar por contexto)

### Protocolo Atomic Commits

1. **NUNCA** usar `git add .` ou `git add -A`
2. **SEMPRE** stage arquivos individualmente por task
3. **MÁXIMO** 100 linhas por commit
4. **FORMATO:** `{type}({milestone}-{task}): {descricao-em-pt-br}`
5. **RASTREAR** hashes em TODO.md seção "Commits do Milestone"

### Triggers para Commits

1. Após completar DoR de milestone → `chore(milestone): prepara ambiente para M1.X`
2. Após implementar task (≤100 linhas) → `feat(M1.X-NN): implementa X`
3. Após testes passarem → `test(M1.X-NN): adiciona testes para X`
4. Após completar DoD → `docs(milestone): finaliza M1.X`

### Conventional Commits

**Formato:** `<type>(<scope>): <assunto-em-pt-br>`

`type` e `scope` seguem o padrão Conventional Commits. `subject`, `body` e qualquer texto descritivo adicional devem ser sempre em português do Brasil.

**Types:** feat, fix, docs, refactor, test, chore, perf, style, ci, build

**Scopes:** web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning

> **Scope reservado pelo template:** `scripts` (manutenção de `scripts/**`) — sempre disponível como scope válido, independente de `web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning` do projeto.

<!--
Preencher com os scopes específicos do projeto.
Exemplo para projeto de automação: collector, processor, storage, alerting, config, docs, milestone
Exemplo para API: api, auth, db, models, routes, middleware, docs
-->

### Política de Atribuição

1. **NUNCA** mencionar assistentes de IA (Claude, Codex, Cursor AI agents, etc.)
2. **NUNCA** incluir co-autoria com IA
3. **SEMPRE** apresentar como trabalho do desenvolvedor
4. **SEMPRE** usar conventional commits padrão

---

## 8. Governança de Changelog (Diretórios de Agentes)

### Regra de Ouro

**Toda alteração em `.claude/`, `.codex/` ou `.agents/` EXIGE uma entrada no `README.md` do subdiretório afetado.**

### Quando Aplicar

- Alterou uma skill? → Atualize `skills/README.md` do diretório correspondente
- Alterou uma regra? → Atualize `rules/README.md` do diretório correspondente
- Criou workflow/prompt? → Atualize o README do subdiretório pai

### Formato da Tabela

```markdown
## Changelog Local

| Data       | Commit   | Sync-ID           | Arquivo                | Descrição                      |
|------------|----------|--------------------|------------------------|--------------------------------|
| 2026-03-06 | 64c7142  | SYNC-20260306-001  | CLAUDE.md              | Padroniza commits em pt-BR     |
| 2026-03-05 | a1b2c3d  | SYNC-20260305-001  | validate-dod/SKILL.md  | Reconciliation gate no step 6  |
| 2026-03-04 | e4f5g6h  | —                  | organize-commits/...   | Fix edge case em mono-repos    |
```

### Campos

- **Data:** ISO 8601 (YYYY-MM-DD)
- **Commit:** Hash curto (7 chars) do commit que contém a alteração
- **Sync-ID:** Identificador `SYNC-YYYYMMDD-NNN` gerado ao espelhar para outro repositório. `—` = pendente de sincronização.
- **Arquivo:** Path relativo ao subdiretório (ex: `validate-dod/SKILL.md`)
- **Descrição:** Resumo contextual da alteração (~80 chars)

### Integração com Skills de Sync

As skills `mirror-upstream` e `sync-downstream` utilizam estas tabelas para:
1. Identificar entradas pendentes (Sync-ID = `—`)
2. Obter o hash do commit para `git show <hash>` e extrair o diff exato
3. Registrar o Sync-ID após aplicar, criando rastreabilidade bidirecional

---

## 9. Referências

### Contexto do Projeto

Para regras de negócio, arquitetura e decisões técnicas:
@documents/core/Projeto.md

### Detalhes Técnicos (Path-Targeted)

Os seguintes arquivos são carregados automaticamente conforme contexto (via frontmatter `paths:` de cada rule — sem `@` aqui, que forçaria import ansioso):
- `rules/code-quality-standards.md` → Quando editando src/**/*
- `rules/security-best-practices.md` → Quando editando src/**/*
- `rules/testing-requirements.md` → Quando editando tests/**/*

### Timeline e Gestão

- @documents/core/Roadmap.md → Fases, milestones, DoR/DoD
- @documents/core/TODO.md → Tarefas granulares

### Planning e Iniciativas

- @.planning/README.md → Hub: registry de milestones, detours, patches
- `.planning/milestones/MX.X-<nome>/` → Diretório do milestone (CONTEXT.md, verification/, handoff/, plans/)
- `.planning/detours/<nome>/` → Diretório do detour (CONTEXT.md, verification/, handoff/, plans/)
- `.planning/patches/{slug}/` → Patches ativos (correções rápidas, ≤2 sessões; um diretório por patch)
- `.planning/scratch/` → Context dumps sob demanda (efêmeros)
- Skills de inicialização: `init-milestone` (milestones) | `init-detour` (detours)

### Plugins Externos

- **Marketplace:** [`4-successful-ai-life`](https://github.com/fernando-bertholdo/4-successful-AI-life) → Plugin `ui-excellence` (13 skills UI/UX)
- **Instalação:** Configurado via `extraKnownMarketplaces` + `enabledPlugins` em `.claude/settings.json` (auto-prompt em novos projetos)
- **Invocação:** `/ui-excellence:coordinator` (triage), `/ui-excellence:animation-motion`, etc.
- **Replicação flat:** `.codex/skills/ui-*/` e `.agents/skills/ui-*/` sincronizadas via `scripts/release/sync-ui-from-marketplace.sh`
- **Validação:** `scripts/validate/validate-ui-plugin.sh` (schema + drift) e `scripts/validate/validate-ui-parity.sh` (G-ISONOMIA)

---

**Versão:** 2.12.0
**Última atualização:** 2026-08-05
**Autor:** Fernando Bertholdo

**Changelog v2.12.0:**
- Rules path-targeted de fato: frontmatter `paths:` adicionado às rules de `.claude/rules/` (sem frontmatter, carregavam em TODA sessão — ~12k tokens residentes)
- Seções 1 (header), 5 e 9: referências a rules sem `@` — o prefixo `@` é import ansioso e anulava o path-targeting
- Seção 3: níveis de orquestração, composição por nível e spawn prompts vivem na skill `agent-team` (single source)
- Sync downstream do tech-product-template `239d146` (SYNC-20260803-003)

**Changelog v2.11.0:**
- Seção 1.7: nova seção "Registro Contínuo de Descobertas (Nenhuma Pendência Órfã)" — registro no mesmo turno, tabela de destinos, contrato do bloco "📌 Registros deste turno" (numeração 1.6 reservada)
- Convenção de seeds pré-initiative em `.planning/scratch/seed-<slug>.md` + lifecycle de 3 saídas (consumir/promover/deletar)
- Princípio harness-agnóstico: memória nativa do harness é cache pessoal, nunca registro canônico
- Gap consciente: v2.9/v2.10 do template (design flow / Claude Design) NÃO aplicados nesta leva
- Sync downstream do tech-product-template `ec3b7a9` (SYNC-20260803-002)

**Changelog v2.8.0:**
- Seção 1.5: Nova seção "Manutenção de `scripts/`" referenciando rule scripts-governance.md e skill audit-scripts
- Seção 6: Adicionado scope `scripts` como reservado pelo template (sempre válido)
- Detour `scripts-governance` aplicado: rule path-targeted, skill, hook check-scripts-cruft, INDEX vivo

**Changelog v2.7.0:**
- Seção 9: Adicionada subseção "Plugins Externos" referenciando marketplace `4-successful-ai-life` e plugin `ui-excellence`
- Seção 9: Documenta invocação, replicação flat, e scripts de validação
- Skills UI standalone removidas de `.claude/skills/` (migradas para plugin marketplace)
- Rule `ui-excellence-standards.md` aposentada (path-targeting via frontmatter do plugin)

**Changelog v2.6.0:**
- Seção 1: `init-detour` como alternativa a `init-milestone` para detours
- Seção 1: `validate-dor`/`validate-dod` aceitam initiative-id (milestone ou detour)
- Seção 2: "Planning First" unificada — milestones e detours com mesma estrutura (CONTEXT.md, sem README separado)
- Seção 9: Detours com mesma estrutura de diretório que milestones; referência a `init-detour`

**Changelog v2.4.0:**
- Seção 1: `init-milestone` como step obrigatório antes de `validate-dor`
- Seção 2: Paths atualizados para modelo milestone-centric (milestones/MX.X-nome/, detours/nome/)
- Seção 7: Planning e Iniciativas refatorado para nova estrutura

**Changelog v1.2.0:**
- Adicionada Seção 8: Governança de Changelog para diretórios de agentes
- Formato padronizado com Sync-ID para rastreabilidade entre repositórios
- Referência às skills mirror-upstream e sync-downstream

**Changelog v1.1.0:**
- Adicionado reconcile-initiative ao workflow de conclusão de tarefa (Section 1)
- Adicionado archive-initiative ao workflow de conclusão de fase (Section 1)
- validate-dod aciona reconcile-initiative automaticamente quando último milestone da initiative

<!--
INSTRUÇÕES DE PREENCHIMENTO:

1. Substitua Market Terminal pelo nome do projeto
2. Substitua web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning pelos scopes específicos do projeto
3. Substitua 2026-06-28 pela data atual
4. Substitua Fernando Bertholdo pelo responsável
5. Remova todos os comentários <!-- --> após preencher
-->
