# Claude Code - Regras do Projeto Market Terminal

Este arquivo contém as **regras operacionais sempre ativas** para o projeto Market Terminal.

Template de origem: tech-product-template@2.21.0

> **Marcador de linhagem.** A linha acima é o sinal canônico, legível por máquina: o
> template de origem e a versão dele que este repositório contém — é ela que diz à
> propagação qual é o gap. Gravada em 2026-09-14 (TECH-540) com a versão **medida por
> conteúdo**, não pelo número que o rodapé declarava: verificou-se a presença das marcas
> de 2.10 (`claude-design-flow`), 2.11 (§1.7), 2.12 (`paths:` nas rules) e 2.13 (registro
> de horizontes). O número de versão local do `CLAUDE.md` segue numeração própria e **não**
> é o mesmo eixo — três repositórios da linhagem chegaram a "2.13.0" com conteúdos
> diferentes, e foi isso que motivou o marcador.


> **Arquitetura Single Source of Truth:**
> - Regras operacionais → Este arquivo
> - Contexto de negócio e arquitetura → @documents/core/Projeto.md
> - Detalhes técnicos → `rules/*.md` (path-targeted via frontmatter `paths:`)
> - Workflows → @skills/*/SKILL.md

---

## 1. Acompanhamento de Roadmap

### Responsabilidade Contínua

**Antes de começar qualquer tarefa:**
- Consultar @documents/core/Roadmap.md para verificar a initiative atual (milestone ou detour)
- **Invocar skill `init-milestone [milestone-id]`** ou **`init-detour [detour-name]`** para criar infraestrutura de planning (se diretório não existe)
- **Invocar skill `validate-dor [initiative-id]`** para validar pré-requisitos
- Se DoR não estiver completo, PARE e trabalhe nas dependências primeiro

**Durante o desenvolvimento:**
- Consultar periodicamente o **DoD (Definition of Done)** no Roadmap
- **Invocar skill `validate-testing`** para validar cobertura de testes
- Usar formato `- verify:` nos critérios de DoD para verificações programáticas

**Antes de commit:**
- **Invocar skill `pre-commit-check`** (inclui code quality, testing, security)
- **Invocar skill `organize-commits`** se múltiplas mudanças pendentes

**Ao completar uma tarefa:**
- **Invocar skill `validate-dod [initiative-id]`** para validar conclusão
  - Executa `verify:` steps do DoD automaticamente
  - Gera Verification Report com PASS/FAIL
  - Se PASS e último milestone da initiative: `validate-dod` aciona `reconcile-initiative` automaticamente
- **Invocar skill `update-docs task [milestone-id]`** para atualizar `documents/core/Projeto.md` (incl. Changelog) e manter referência curta no `documents/core/Roadmap.md`
- Se decisões mudarem a ordem/dependências, **invocar `update-docs roadmap`** para revisar o `Roadmap.md`
- Verificar se `reconcile-initiative` foi executado antes de marcar initiative como concluída
- Documentar evidências (testes, screenshots, métricas)

**Ao completar uma fase:**
- **Invocar skill `validate-docs-links check`** para validar links
- **Invocar skill `audit-rules full`** para auditar regras
- **Invocar skill `audit-architecture`** para verificar redundâncias (inclui revisão de seeds)
- **Revisar a seção Seeds** do `.planning/README.md` — consumir, promover ou deletar; nenhum seed atravessa a fase sem decisão (§1.7)
- **Invocar skill `archive-initiative --phase <fase>`** para arquivar initiatives concluídas
- **Invocar skill `scope-horizons review`** para dar veredito aos horizontes de escopo vivos — **não é gate bloqueador**: "continua engavetado" é resposta válida para todos

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
| **Ampliação do escopo do produto**, fora do plano, fundamentada em evidência linkável | `scope-horizons capture` → `documents/strategy/scope-horizons.md`. Três testes obrigatórios: amplia o produto · está fora do plano · nasceu de evidência. Três de três, ou não é horizonte — e o agente **propõe, nunca grava sozinho**, no máximo uma proposta por turno |
| Trabalho emergente que cruza a veia principal | **Classifique antes de criar** (ver abaixo): apara, fatia ou detour — o destino é diferente nos três casos |
| Achado, pendência ou decisão que surgiu num **comentário no rastreador** (thread de issue, veredito de revisão, nota) | Checkbox com `verify:` na descrição da issue, ou issue própria. **Comentário no rastreador não é destino**: quem retoma lê a descrição e o repositório, não a thread — em 18/09/2026 uma correção que vivia só num comentário virou defeito no deploy seguinte |

**Classificar antes de criar issue.** O destino de uma descoberta que virou trabalho depende da
classe dela, e a classe é decidida ANTES de a issue existir. Duas perguntas, nesta ordem:

1. **É apara?** Deriva de uma revisão **e conserta o mesmo diff que o revisor leu** → nasce sob a
   issue cuja fatia foi criticada, nunca sob a issue-pai de topo. Para aqui. Não é apara se o
   trabalho vai para arquivo que o escopo negativo da issue criticada proibia, ou para uma lacuna
   do repositório inteiro: aí siga para a pergunta 2.
2. **Dois destes três sinais fazem um detour**, não uma fatia: nasce **fora do plano** escrito da
   pai · entrega **artefato ou ferramenta própria** que passa a ser mantida · corre **em paralelo**
   à veia principal sem ser insumo do DoD de outra fatia. Um sinal só é fatia; dois ou mais pedem
   `init-detour <nome> --parent-issue <ID-da-milestone>`.

O número de issues derivadas **não** entra na decisão de criar — quando você sabe que o trabalho
rendeu três issues, elas já nasceram no lugar errado. Ele serve para **reclassificar**: cluster com
3 derivadas, ou que atravessa mais de uma sessão em paralelo, pede reavaliação, e quem percebe
**propõe e para**. O critério em extenso vive no `AGENTS.md` da raiz (§ 2, "Classificar antes
de criar issue"), que carrega as regras do template desde a TECH-668; aqui fica a versão curta.

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
- **Consulte documentos específicos (Roadmap/Projeto/architecture/walkthrough/Fresh Context)** ao invés de explorar todo o codebase

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

**Tipos de trabalho:** milestone | detour — a taxonomia é pela **relação com o
plano escrito**, não por tamanho, e a régua é a do `AGENTS.md` da raiz, §2. Milestone já
estava no Roadmap. Detour satisfaz **dois de três sinais** — nasce fora do plano ·
entrega artefato próprio mantido · corre em paralelo. **Alterar o plano não é um
dos sinais:** um detour pode alterar e muitos alteram, mas não é isso que o
define. Um sinal só é fatia; nenhum é **issue avulsa**, sem tipo, sem diretório em
`.planning/` e sem reconciliação.
Ao criar um detour, `init-detour` pergunta **o que ele muda no plano** e grava a
resposta. Ao fechar, se mudou, o `Roadmap.md` muda **onde a sequência vive** e o
identificador vai no commit; se não mudou, o Roadmap não é tocado.

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
- Editar `documents/core/Roadmap.md` → **Apenas o Lead atualiza docs core**
- Editar `documents/core/Projeto.md` → **Single Source of Truth protegido**
- Invocar skills de documentação (`update-docs`, `organize-commits`) → **Lead only**
- Fazer `git push` → **Lead only, após consolidação**

**Teammates PODEM:**
- Ler qualquer arquivo do projeto (inclusive docs)
- Criar/editar código nos diretórios designados pelo Lead (ex.: `src/`, `tests/`, ou equivalente do stack)
- Executar testes (`pytest`, `npm test`, etc.)
- Reportar findings via mensagem ao Lead
- Ler Roadmap.md para entender contexto

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

### Horas e datas

A regra inteira, com a linha única que declara o fuso do dono do repositório, está no
`AGENTS.md`, §4, "Horas e datas". Este arquivo não repete o fuso: ele fica escrito num lugar só,
que é o que o kickoff de um derivado de outro dono troca. Em resumo:
- **Texto para gente** leva hora e data do fuso do dono, com o rótulo dele, medidas logo antes de
  escrever com `TZ=<fuso do dono> date`
- **Hora cruzada com carimbo de API** leva o UTC ao lado, entre parênteses, e a data dia/mês quando
  o UTC cai em outro dia
- **Segundos** só entram copiados de um carimbo de máquina, com a zona dele, nunca lidos do relógio
  na hora de escrever: a hora medida para no minuto
- **Carimbo de máquina** fica em UTC, com `Z` ou `+00:00`
- **Hora sem zona é defeito**

---

## 5. Segurança e Fidelidade de Dados

### Regra de Ouro — segredo

**NUNCA commitar segredo no repositório.**

Segredo é credencial, token, chave e senha. A proibição é absoluta e não tem
exceção, e a razão é específica: uma credencial num repositório privado continua
sendo vulnerabilidade, porque quem obtém o repositório ganha a **capacidade de
agir**.

### Checklist Obrigatório

- [ ] Nenhum secret hardcoded no código
- [ ] Todas credenciais via environment variables
- [ ] .env no .gitignore
- [ ] .env.example documentado
- [ ] Error handling não expõe credenciais

### Regra de Ouro — dado de trabalho

**Um valor medido viaja exatamente como medido, rastreável à fonte.**

O dado que o projeto processa — registro, documento, medição — é o **material de
trabalho**, e não um risco a mitigar, quando o repositório é privado e a
organização detém o dado ou tem autorização declarada para usá-lo. Nesse caso o
valor entra no artefato durável como a fonte o traz.

Redigir, arredondar, parafrasear ou substituir por equivalente são a **mesma
classe de defeito**: quebram a cadeia de auditoria e nenhum se anuncia ao leitor
seguinte. Onde a transformação for necessária, declare qual foi e como voltar ao
valor de origem.

**Por que é regra de correção e não de conveniência:** um pipeline que se apoia
em dados de referência e trabalha com equivalência nunca permite confiar no
resultado nem nas etapas intermediárias — cada aproximação silenciosa é um ponto
onde a conferência deixa de ser possível.

> ⚠️ **Os dois casos são opostos, não graus do mesmo caso.** Confundi-los é o
> defeito que esta divisão corrige: a frase genérica "dados sensíveis" fundia
> credencial e dado de trabalho, e o checklist acima — 5 de 5 sobre credencial —
> mostra qual dos dois ela sempre significou.

> 📌 **O projeto instanciado declara a própria base.** Quem detém o dado, sob que
> autorização, e qual é o perímetro: isso é decisão do projeto e vive no
> `documents/core/Projeto.md`, não aqui. **Sem essa declaração, não presuma
> autorização** — trate dado de terceiro com cautela e registre a lacuna, em vez
> de decidir sozinho.

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

> **Bloqueio por mecanismo:** o Claude Code (`deny` do `.claude/settings.json`) e o Codex
> (`.codex/rules/comandos.rules`) bloqueiam por prefixo as formas proibidas no item 1, como guarda
> contra acidente e não contra contorno; as que escapam estão em `.codex/README.md`, "Limite da
> regra de comando". O gate `scripts/validate/check-regra-comandos.sh` cobre só o lado do Codex,
> e só o comando entre crases numa linha desta seção que traga a palavra em maiúsculas do item 1:
> sob outra palavra (PROIBIDO, Nunca, Não use) o comando passa calado. O `deny` do Claude Code
> nenhum gate confere: ele entra à mão no `.claude/settings.json`.

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

<!-- @kickoff-instrucao
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
- Alterou uma regra? → Atualize `.claude/rules/README.md`, o único diretório de rules
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

- **Data:** ISO 8601 (YYYY-MM-DD), do calendário do fuso do dono (§4, "Horas e datas")
- **Commit:** Hash curto (7 chars) do commit que contém a alteração
- **Sync-ID:** Identificador `SYNC-YYYYMMDD-NNN` gerado ao espelhar para outro repositório, com a data do calendário do fuso do dono. `—` = pendente de sincronização.
- **Arquivo:** Path relativo ao subdiretório (ex: `validate-dod/SKILL.md`)
- **Descrição:** Resumo contextual da alteração (~80 chars)
- **Ordem:** a mais recente primeiro, como no exemplo acima; no mesmo dia, a ordem segue a dos commits que as linhas citam (o mais recente primeiro). Quem cobra é `scripts/validate/check-changelog-local.sh` (5 colunas, data ISO, ordem entre dias), no CI e no `audit-rules`; a ordem dentro do dia ele não confere, porque não vê o git

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

### Planning e Iniciativas

- @.planning/README.md → Hub: registry de milestones e detours
- `.planning/milestones/MX.X-<nome>/` → Diretório do milestone (CONTEXT.md, verification/, handoff/, plans/)
- `.planning/detours/<nome>/` → Diretório do detour (CONTEXT.md, verification/, handoff/, plans/)
- `.planning/scratch/` → Context dumps sob demanda (efêmeros)
- Skills de inicialização: `init-milestone` (milestones) | `init-detour` (detours)

### Plugins Externos

- **Marketplace:** [`4-successful-ai-life`](https://github.com/fernando-bertholdo/4-successful-AI-life) → Plugin `ui-excellence` (13 skills UI/UX)
- **Instalação:** Configurado via `extraKnownMarketplaces` + `enabledPlugins` em `.claude/settings.json` (auto-prompt em novos projetos)
- **Invocação:** `/ui-excellence:coordinator` (triage), `/ui-excellence:animation-motion`, etc.
- **Replicação flat:** `.agents/skills/ui-*/` sincronizadas via `scripts/release/sync-ui-from-marketplace.sh`
- **Validação:** `scripts/validate/validate-ui-plugin.sh` (schema + drift) e `scripts/validate/validate-ui-parity.sh` (G-ISONOMIA)

---

**Versão:** 2.14.0
**Última atualização:** 2026-10-04
**Autor:** Fernando Bertholdo

**Changelog v2.14.0:**
- Sync downstream do tech-product-template de 2.18.0 a 2.21.0 (`6a60a5b`, merge do PR #85 da origem), por mescla em três vias, com a base da mescla em `b51dbf9` (TECH-1020, pai TECH-1015). Arquivo a arquivo, a base foi a versão da origem mais próxima da deste repositório. Referência na origem: o changelog v2.19.0 a v2.21.0 do template; os Sync-IDs pendentes dela estão citados nas linhas de Changelog Local de cada camada
- Camadas: saem `.codex/skills/`, `.codex/rules/*.md`, `.codex/prompts/`, `.agents/rules/` e `.agents/prompts/`, que a origem aposentou na 2.19.0 (TECH-852); entra `.codex/rules/comandos.rules`, a regra de comando da §6, e o `.codex/config.toml` perde os `[profiles.*]` e o `[mcp_servers.chrome-devtools]` e aponta `[paths] skills` para `.agents/skills`
- Seção 4: nova subseção "Horas e datas", que resume a regra do fuso do dono e aponta o `AGENTS.md`, §4. Seção 6: o bloqueio por mecanismo das formas proibidas de `git add`, com o limite dele. Seção 8: a ordem do Changelog Local dentro do mesmo dia segue a dos commits, e o gate roda também no CI (a frase da propagação anterior dizia "quando o projeto tiver CI", e o CI existe desde a TECH-567)
- Gates de `scripts/validate/`: `check-versao-linhagem.sh`, `check-changelog-local.sh`, `validate-clean-tree.sh` e `test-gates-validate.sh` passam à versão da origem no SHA; entram `check-agents-md-teto.sh`, `check-skill-frontmatter.sh`, `check-regra-comandos.sh`, `test-ci-invariantes.sh`, `test-hook-task-completed.sh` com o arquivo de assuntos e `test-entrega-clipboard.sh`. O `ci.yml` acompanha a origem, com as adaptações declaradas por linha `adaptacao-local` no cabeçalho dele
- Hooks: os quatro que eram cópia literal de uma versão da origem (`check-commit-message.sh`, `check-planning-index.sh`, `check-task-completed.sh`, `check-teammate-idle.sh`) passam à do SHA (régua do Passo 5 da `propagar-template`); o `check-scripts-cruft.sh` já era o do SHA, e o `check-pending-archival.sh`, que só a origem tem, não entra
- `AGENTS.md`: acompanha a origem de v2.5.0 a v2.8.0, com o rodapé dela. Depois da mescla o arquivo media 50124 bytes (42042 na `main`, medido em 04/10/2026), acima do teto de 32768 do `check-agents-md-teto.sh`. Por decisão do Fernando (opção (b) da `Decisão:` da TECH-1015), ficam `Project Overview`, `Dev Commands` e `Environment Variables` e um ponteiro para o `CLAUDE.md` da raiz; o bloco `Changelog v1.0.0` local virou ponteiro (`git show abbcdec:AGENTS.md`); e as demais seções do projeto, que eram cópia do `CLAUDE.md` da raiz, ficam só nele, com a linha *Live exit layer*, que só o `AGENTS.md` tinha, movida para lá. O arquivo mede 32224 bytes. Na rodada de correção da revisão, o topo do arquivo passou a descrever a parte do projeto como o resumo de três seções que ela é; a frase do pareamento das skills diz que o gate da origem não existe aqui (TECH-810); e o placeholder de data do Changelog v2.7.0 deixou de ser literal. O bloco `@kickoff-instrucao` do `AGENTS.md`, que este repositório removeu ao preencher, não volta
- Fora desta propagação, por decisão declarada ou por ser de outro mecanismo: `check-pareamento-instrucoes.sh` e a lista de exceções (linha `sem-pareamento` do `ci.yml`), `validate-ui-parity.sh` e `validate-ui-plugin.sh`, `test-fecho-regua.sh` (`export-ignore`, DL-5), `test-hooks-sessionstart.sh` (lê o `check-pending-archival.sh`, que este repositório não tem), `test-ci-testes-python.sh` (lê o passo "Testes Python" do `ci.yml`, que este repositório não tem: `sem-testes-de-aplicacao`), `.github/copilot-instructions.md` (este repositório não o tem), os workflows `entrega-clipboard.yml`, `hooks-matriz.yml`, `propagar-template.yml` e `vigia-pos-merge.yml` (DL-5), `.gitignore`, `.gitattributes`, `KICKOFF_GUIDE.md`, `documents/`, `scripts/setup/` e `scripts/release/`

**Changelog v2.13.0:**
- Sync downstream do tech-product-template de 2.14.0 a 2.18.0 (`b51dbf9`), por mescla em três vias com base em `08538b4` (TECH-668). Referência na origem: entradas SYNC-20260915-001, SYNC-20260915-002, SYNC-20260920-001/002 e SYNC-20260920-003 do changelog do template
- Seção 5 renomeada para "Segurança e Fidelidade de Dados", com duas Regras de Ouro: segredo e dado de trabalho
- Seção 1.7: linha "comentário no rastreador não é destino" e a condição de exclusão da apara na pergunta 1
- Seção 8: a ordem das tabelas Changelog Local passa a ser declarada e cobrada por `scripts/validate/check-changelog-local.sh`; os blocos de instrução do kickoff ganham o marcador `@kickoff-instrucao`
- Camada `.codex/` criada a partir da origem 2.18.0: o marcador de linhagem passa a valer nas três camadas
- Aplicado à mão, fora do sync: hooks `check-commit-message.sh` e `check-planning-index.sh` (este, da 2.14.0, faltava aqui) versionados em `.claude/hooks/`; o registro no `settings.json` é passo local, porque o arquivo é ignorado pelo git aqui (`.gitignore`)
- `AGENTS.md` da raiz: recebe, antes do conteúdo do projeto, as regras do `AGENTS.md` do template 2.18.0, adaptadas (o Codex lê só os primeiros 32768 bytes); as referências da §1.7 e da §2 ao `AGENTS.md` passam a apontar para ele

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

<!-- @kickoff-instrucao
INSTRUÇÕES DE PREENCHIMENTO:

1. Substitua Market Terminal pelo nome do projeto
2. Substitua web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning pelos scopes específicos do projeto
3. Substitua 2026-06-28 pela data atual do calendário do fuso do dono (§4, "Horas e datas")
4. Substitua Fernando Bertholdo pelo responsável
5. Remova deste arquivo todo bloco marcado com @kickoff-instrucao após preencher
-->
