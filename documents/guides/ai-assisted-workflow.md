# Workflow Completo de Desenvolvimento Assistido por IA

Guia end-to-end para desenvolver projetos usando este template com Claude Code ou Codex. Cobre todo o ciclo de vida — da preparação pré-kickoff ao fechamento do projeto.

> **Fonte de verdade:** Este guia é suplementar. Para decisões de negócio e arquitetura, consulte sempre `documents/core/Projeto.md`.

---

## Visão Geral do Ciclo de Vida

```
PRÉ-KICKOFF ──→ KICKOFF ──→ FASE 0 ──→ FASES 1..N ──→ FECHAMENTO
  Preparar        Setup      Planejar    Desenvolver     Concluir
  documentos      template   decisões    milestones      projeto
```

Cada etapa tem: **o que o usuário faz**, **o que o agente de IA faz**, e **quais skills/docs usar**.

---

## Etapa 1 — Pré-Kickoff (Preparação)

### O Que Você Precisa Ter

Antes de iniciar o kickoff, reúna:

| Tipo de Documento | Exemplos | Onde Colocar |
|-------------------|----------|-------------|
| **Termo de Abertura (TAP)** | PDF, Word, TXT com objetivos e escopo | `documents/archive/` |
| **Transcrições de reuniões** | Discovery sessions, alinhamentos | `documents/archive/` |
| **Especificações técnicas** | Requisitos, mockups, diagramas | `documents/archive/` |
| **Definição de stack** | Linguagem, frameworks, ferramentas | Pode estar no TAP ou separado |
| **Informações do responsável** | Nome, email, organização | Pode estar no TAP |

### Gerar TAP a Partir dos Materiais (Recomendado)

Se você tem múltiplos materiais brutos (transcrições, PDFs, specs), use a skill `generate-tap` **antes** do kickoff:

```
generate-tap
```

A skill:
1. Escaneia `documents/archive/` automaticamente
2. Extrai informações com rastreabilidade (cada dado ligado à fonte)
3. Gera TAP dual-layer: executivo (para stakeholders) + estruturado (para kickoff)
4. Inclui **Mapa de Extração** (Apêndice B) — tabela direta Placeholder -> Valor
5. Reporta gaps e perguntas pendentes

**Fluxo completo:**
```
Materiais em documents/archive/
    |  generate-tap
    v
TAP com Mapa de Extração
    |  kickoff-prompt.md
    v
Projeto configurado
    |  validate-kickoff
    v
Pronto para Fase 0
```

O TAP pode ser gerado na mesma sessão do kickoff ou em sessão separada. Se gerado separadamente, o arquivo fica em `documents/archive/TAP_{slug}.md` pronto para o kickoff consumir.

### Seu Comportamento

1. **Reúna o máximo de contexto possível.** Quanto mais informação nos documentos de archive, melhor o agente de IA preencherá os templates.
2. **Não se preocupe com formato perfeito.** O agente extrai informações de documentos em qualquer formato (PDF, TXT, Word, transcrições brutas).
3. **Inclua decisões de stack.** Saber se o projeto é Python, Node.js, Go, etc. é crucial — determina quais comandos de teste, lint e format serão configurados nas skills.

### Informações que Frequentemente Faltam

Se alguma dessas estiver faltando, você pode fornecer ao agente durante o kickoff:

- **Scopes de commit** — baseados na arquitetura (ex.: `api, auth, db, docs`)
- **Comandos de stack** — test, lint, format, typecheck (ex.: `pytest`, `ruff check src/`)
- **Timeline** — mesmo que estimada, necessária para o Roadmap
- **Estrutura de diretórios** — onde ficará o código fonte e os testes

---

## Etapa 2 — Kickoff (Setup do Projeto)

### Criar o Repositório

```bash
# Via GitHub CLI
gh repo create org/nome-projeto --template fernando-bertholdo/{{TEMPLATE_REPO}} --private
cd nome-projeto
```

Ou use "Use this template" no GitHub UI.

### Executar o Kickoff

Abra o Claude Code no repositório e forneça o conteúdo de `.claude/prompts/kickoff-prompt.md` como prompt. O prompt usa **discovery dinâmico** — escaneia todos os arquivos por `{{...}}` e preenche automaticamente, sem depender de uma lista fixa.

**Exemplo de interação:**

```
Você: [cola o conteúdo de .claude/prompts/kickoff-prompt.md]
      Aqui estão os documentos de archive: [referencia documents/archive/]

IA:   Vou analisar os documentos e preencher os templates...
      [preenche 30+ arquivos com placeholders]
      [configura comandos de stack nas skills]
      [remove comentários de instrução do template]
```

### O Que o Agente Faz

1. Lê todos os documentos em `documents/archive/`
2. Extrai: nome do projeto, stack, objetivos, fases, riscos
3. Escaneia TODOS os arquivos por `{{...}}`
4. Respeita `@kickoff-exclude` (ignora arquivos de referência)
5. Respeita `@runtime-placeholders` (não preenche templates dinâmicos)
6. Preenche por prioridade: CRITICAL (identidade) > HIGH (stack) > MEDIUM (docs) > LOW (datas)

### Seu Comportamento

- **Revise o output.** O agente pode inventar informações se não encontrar nos docs. Verifique especialmente: objetivos, regras de negócio, fases do roadmap.
- **Forneça informações complementares.** Se o agente perguntar sobre algo que não está nos docs, responda diretamente em vez de mandá-lo procurar.
- **Valide comandos de stack.** Confirme que `npm run type-check`, `npm run lint`, etc. foram preenchidos corretamente.

### Situações Comuns

**"O agente não encontrou informação suficiente para o Roadmap"**
→ Forneça fases e timeline estimadas diretamente no chat. Exemplo:
```
Fase 0: Planejamento (1 semana)
Fase 1: PoV com 3 milestones (3 semanas)
Fase 2: MVP (4 semanas)
```

**"Não sei quais scopes de commit usar"**
→ Use exemplos por tipo de projeto:
- API REST: `api, auth, db, models, routes, middleware, docs`
- CLI: `cli, commands, config, utils, docs`
- Web App: `frontend, backend, api, auth, components, pages`

**"O projeto usa um stack que o template não exemplifica"**
→ Informe os comandos do stack:
```
TEST_COMMAND: cargo test
LINT_COMMAND: clippy
FORMAT_COMMAND: rustfmt --check src/
```

---

## Etapa 3 — Validação Pós-Kickoff

### Executar validate-kickoff

```
validate-kickoff
```

A skill escaneia dinamicamente todos os arquivos e reporta:
- **Placeholders não preenchidos** (por severidade)
- **Inconsistências** (mesmo placeholder com valores diferentes entre arquivos)
- **Comentários de instrução** restantes (que deveriam ter sido removidos)

### Interpretar o Relatório

| Severidade | O que significa | O que fazer |
|-----------|----------------|-------------|
| **CRITICAL** | `PROJECT_NAME`, `RESPONSIBLE_NAME` faltando | Preencher imediatamente — bloqueia tudo |
| **HIGH** | `TEST_COMMAND`, `LINT_COMMAND` faltando | Preencher ao definir stack — bloqueia skills operacionais |
| **MEDIUM** | Conteúdo de docs (objetivos, riscos) | Preencher com informações do TAP |
| **LOW** | Datas, metadata | Preencher com data atual |

### Seu Comportamento

- **Re-execute até zero CRITICAL/HIGH.** Esses bloqueiam o funcionamento de skills como `pre-commit-check` e `validate-testing`.
- **MEDIUM pode esperar.** Se informações de negócio estão incompletas, preencha durante a Fase 0.
- **Faça o commit inicial** após validação limpa:

```bash
git add -A
git commit -m "chore(init): setup projeto nome-do-projeto a partir do template"
git push origin main
```

---

## Etapa 4 — Fase 0: Planejamento e Decisões Técnicas

### Objetivo da Fase 0

Completar todas as decisões técnicas necessárias para iniciar o desenvolvimento. Ao final, o projeto deve ter: stack definido, arquitetura documentada, ambiente configurado, e TODO.md com tasks da primeira fase de desenvolvimento.

### Validar Pré-Requisitos

```
validate-dor Fase0
```

Se DoR falhar, o agente reportará quais pré-requisitos estão faltando. Trabalhe neles antes de prosseguir.

### Decisões que Precisam Ser Tomadas

| Decisão | Onde Documentar | Exemplo |
|---------|----------------|---------|
| Stack tecnológico | `Projeto.md` seção Arquitetura | Python 3.11 + FastAPI + PostgreSQL |
| Estrutura de diretórios | `Projeto.md` + criar dirs em `src/` | `src/{api,models,services}` |
| Padrões de API | `Projeto.md` | REST, versionado, JSON |
| Estratégia de testes | `Roadmap.md` DoD do milestone | >80% coverage, pytest |
| Integrações externas | `Projeto.md` | API de pagamento, SMTP |

### Seu Comportamento

- **Documente decisões em Projeto.md.** O agente sabe que Projeto.md é a fonte de verdade.
- **Use o agente para pesquisa.** Exemplo: "Pesquise as melhores práticas para autenticação JWT com FastAPI e recomende uma abordagem."
- **Revise o Roadmap.** Ajuste fases, milestones, DoR/DoD conforme as decisões tomadas.

### Situações Comuns

**"Não tenho certeza sobre qual abordagem usar para X"**
→ Peça ao agente uma pesquisa comparativa:
```
Preciso decidir entre SQLAlchemy e Tortoise ORM para este projeto.
Analise prós/contras considerando nossos requisitos em Projeto.md
e recomende uma abordagem.
```

**"O ambiente de desenvolvimento precisa ser configurado"**
→ O agente pode ajudar a criar scripts de setup, Dockerfiles, ou configurações de CI baseados nas decisões em Projeto.md.

### Completar Fase 0

```
validate-dod Fase0
update-docs task Fase0
```

---

## Etapa 5 — Fases de Desenvolvimento (Fases 1..N)

### Ritual de Início de Milestone

**Sempre** antes de começar um milestone:

```
validate-dor M1.1
```

Se DoR falhar:
1. Leia o relatório para entender quais dependências faltam
2. Resolva as dependências (pode ser outro milestone, decisão técnica, ou recurso externo)
3. Re-execute `validate-dor` até passar

### Fluxo de Desenvolvimento Diário

```
1. Ler TODO.md → identificar task atual
2. Implementar em chunks ≤100 linhas
3. Testar
4. pre-commit-check
5. Commitar (1 task = 1 commit)
6. Atualizar checkbox no TODO.md
7. Repetir
```

### Interagindo com o Agente Durante Desenvolvimento

**Para implementar uma feature:**
```
Implemente a feature X do milestone M1.2.
Consulte Roadmap.md para o escopo e Projeto.md para as regras de negócio.
Trabalhe em chunks de no máximo 100 linhas.
```

**Para corrigir um bug:**
```
Há um bug em [descreva o comportamento].
Antes de propor correção, investigue a causa raiz.
Escreva um teste que reproduza o bug primeiro.
```

**Para refatorar:**
```
Refatore [componente] seguindo os padrões em code-quality-standards.md.
Garanta que todos os testes continuam passando.
```

### Quando Usar Agent Teams

O agente pode **propor** criação de equipe quando detectar que a tarefa beneficiaria de trabalho paralelo. Você também pode solicitar explicitamente:

**Critérios para equipe:**
- Tarefa tem 3+ subtarefas independentes
- Tasks tocam arquivos diferentes (sem conflito de merge)
- Pesquisa paralela antes de implementar

**Exemplos de solicitação:**
```
# Pesquisa paralela (Nível 1)
Crie um time de pesquisa para avaliar abordagens
de cache antes de implementar M2.1.

# Sprint paralelo (Nível 2)
Execute as 3 tasks de M1.3 em paralelo
com 2 implementadores e 1 testador.

# Pipeline completo (Nível 3)
Execute M2.1 como pipeline: pesquisa primeiro,
depois implementação paralela, depois review.
```

**Seu papel durante Agent Teams:**
- Aprove a composição da equipe antes do Lead spawnar teammates
- Monitore progresso via task list (Ctrl+T no Claude Code)
- O Lead coordena e commita; teammates implementam e reportam

### Qualidade e Validação

**Antes de cada commit:**
```
pre-commit-check
```

A skill verifica: formatação, lint, type checking, testes, segurança, e status git.

**Se pre-commit-check falhar:**
1. Leia o relatório — identificará exatamente o que precisa ser corrigido
2. Corrija os problemas apontados
3. Re-execute `pre-commit-check` até passar
4. Só então faça o commit

**Se houver múltiplas mudanças pendentes:**
```
organize-commits
```

A skill agrupa mudanças em commits atômicos seguindo Conventional Commits.

### Commits

**Regras essenciais:**
- 1 task = 1 commit
- Máximo 100 linhas por commit
- **NUNCA** `git add .` ou `git add -A` (exceto no commit inicial)
- Formato: `{type}({scope}): {description}`

**Exemplos:**
```
feat(M1.2-01): implementa endpoint de autenticação
test(M1.2-01): adiciona testes para autenticação JWT
fix(M1.3-02): corrige validação de email duplicado
docs(milestone): finaliza M1.2
```

### Completar Milestone

```
validate-dod M1.2
```

Se DoD passar:
```
update-docs task M1.2
```

A skill atualiza `Projeto.md` (Changelog) e mantém referência no `Roadmap.md`.

Se DoD **não** passar:
1. Leia quais critérios falharam
2. Implemente o que falta (cada gap é uma mini-task)
3. Re-execute `validate-dod` até 100%
4. **Não** marque milestone como completo com DoD parcial

### Situações Comuns no Desenvolvimento

**"A sessão está ficando lenta / contexto muito grande"**
→ Quando sessão ultrapassar ~150k tokens:
```
fresh-context M1.2
```
Gera um CONTEXT.md self-contained. Abra nova sessão e forneça o CONTEXT.md como ponto de partida.

**"Preciso retomar o trabalho amanhã"**
→ No final da sessão:
```
generate-session-prompt
```
Gera prompt otimizado para retomada. Use-o ao iniciar a próxima sessão.

**"Descobri que preciso mudar a arquitetura"**
→ Documente a mudança antes de implementar:
```
Preciso mudar a estratégia de [X] para [Y].
Atualize Projeto.md com a nova decisão e justificativa,
depois ajuste o Roadmap se impactar timeline.
```
Após a mudança:
```
update-docs system
```

**"Stakeholder pediu para adicionar feature que não estava no escopo"**
→ Avalie o impacto antes de aceitar:
```
Avalie o impacto de adicionar [feature] ao projeto.
Considere: timeline atual (Roadmap.md), dependências
entre milestones, e carga de trabalho.
Apresente opções: implementar agora, deferir para Fase N,
ou rejeitar com justificativa.
```
Se aceito, atualize Roadmap.md e TODO.md:
```
update-docs roadmap
```

**"Encontrei um problema de segurança no código"**
→ Corrija imediatamente, antes de qualquer outra task:
```
Encontrei [descreva o problema de segurança].
Corrija seguindo security-best-practices.md.
Se envolve credenciais expostas, rotacione-as imediatamente.
```

---

## Etapa 6 — Transição Entre Fases

### Ao Completar uma Fase

Antes de iniciar a próxima fase, execute validações abrangentes:

```
validate-docs-links check
audit-rules full
audit-architecture
```

Estas skills verificam:
- **Links entre documentos** — nenhum link quebrado
- **Integridade de regras** — rules completas e consistentes
- **Redundância** — sem duplicação entre docs core e suplementares

### Retrospectiva de Fase

Após completar cada fase, reflita sobre o que funcionou e o que não funcionou. Peça ao agente:

```
Faça uma retrospectiva da Fase 1.
Analise: timeline planejado vs real (Roadmap.md),
tasks que bloquearam outras (TODO.md),
decisões técnicas que mudaram durante a fase (Projeto.md).
Documente lições aprendidas em documents/strategy/.
```

**O que capturar:**
- Timeline planejado vs real
- Bottlenecks identificados
- Decisões que mudaram e por quê
- O que acelerar/mudar na próxima fase
- Dívida técnica acumulada que precisa ser endereçada

### Atualizar Roadmap Para Próxima Fase

Se a retrospectiva revelar que estimativas precisam ser ajustadas:
```
update-docs roadmap
```

---

## Etapa 7 — Fases Avançadas (Hardening, Otimização, Estabilização)

### Diferença de Comportamento

Fases avançadas focam menos em features novas e mais em:
- Performance e otimização
- Segurança aprofundada
- Testes end-to-end
- Documentação final
- Preparação para deploy

### Performance

Ao iniciar trabalho de performance:
```
Estabeleça baseline de performance para [componente/endpoint].
Meça: tempo de resposta, throughput, uso de memória.
Documente os números atuais antes de otimizar.
```

Após otimizações:
```
Compare com baseline. Documente ganhos em Projeto.md
seção Performance. Só aceite otimizações com melhoria mensurável.
```

### Auditoria de Segurança Pré-Release

Antes de ir para produção:
```
Execute uma auditoria de segurança completa.
Verifique: nenhum secret hardcoded (bandit/semgrep),
dependências sem vulnerabilidades conhecidas (pip-audit/npm audit),
inputs validados em todas as boundaries,
error handling não expõe detalhes internos.
Gere relatório de segurança.
```

### Preparação de Release

Quando o projeto estiver pronto para deploy:

```
Prepare o release do projeto.
Gere: changelog final (de Projeto.md),
checklist de deployment (env vars necessárias, migrations, monitoring),
valide que todos os DoD de todos os milestones estão PASS,
tag de versão no git.
```

**Checklist manual de release:**
- [ ] Todos os milestones com DoD 100%
- [ ] Todos os testes passando
- [ ] Segurança auditada
- [ ] `.env.example` atualizado com todas as variáveis necessárias
- [ ] README.md com instruções de setup para novos desenvolvedores
- [ ] Changelog atualizado em Projeto.md
- [ ] Tag de versão criada no git

---

## Etapa 8 — Manutenção e Operação

### Atualizações de Dependências

Periodicamente, especialmente se o projeto é de longa duração:

```
Verifique dependências desatualizadas e vulnerabilidades.
Atualize incrementalmente com testes entre cada update.
Documente breaking changes.
```

### Onboarding de Novos Contribuidores

Se um novo desenvolvedor entrar no projeto:

1. Compartilhe: `documents/core/Projeto.md` (visão geral + decisões)
2. Compartilhe: `documents/core/Roadmap.md` (onde o projeto está)
3. Gere contexto atualizado: `fresh-context [milestone-atual]`
4. Use o CONTEXT.md gerado como briefing para o novo desenvolvedor
5. Atribua task pequena para familiarização

### Incidentes em Produção

Se algo quebrar em produção:

```
Documente o incidente:
1. O que aconteceu (sintomas)
2. Quando começou
3. Impacto (quem foi afetado)
4. Causa raiz (após investigação)
5. Correção aplicada
6. Ações preventivas

Armazene em documents/strategy/ para referência futura.
```

---

## Etapa 9 — Fechamento do Projeto

### Quando o Projeto Está "Done"

Um projeto está concluído quando:
- Todos os milestones do Roadmap têm DoD 100%
- Ou quando uma decisão de negócio determina que o escopo atual é suficiente

### Ritual de Fechamento

```
O projeto está sendo encerrado. Execute as seguintes validações finais:

1. validate-dod para o último milestone ativo
2. validate-docs-links check — garantir zero links quebrados
3. audit-architecture — garantir zero redundância
4. Gerar relatório final com:
   - O que foi construído (lista de milestones e entregas)
   - O que foi deferido (backlog não implementado)
   - Decisões técnicas tomadas e justificativas
   - Métricas (cobertura de testes, performance)
   - Recomendações para manutenção futura
```

### Documentação Final

- **Projeto.md:** Deve refletir o estado final do projeto, não o planejado
- **README.md:** Atualizar com instruções de uso (não mais linguagem de template)
- **Roadmap.md:** Marcar fase final como concluída
- **TODO.md:** Seção "Backlog Deferido" com itens não implementados e justificativas

### Handoff

Se o projeto será mantido por outra equipe:
```
Gere um documento de handoff contendo:
- Visão geral da arquitetura (de Projeto.md)
- Como rodar o projeto (setup, env vars, comandos)
- Como fazer deploy
- Pontos de atenção (dívida técnica, limitações conhecidas)
- Contatos do time original
```

---

## Referência Rápida — Qual Skill Usar Quando

### Decisão por Situação

| Eu quero... | Skill/Ação |
|-------------|-----------|
| Gerar TAP a partir de materiais brutos | `generate-tap` |
| Iniciar projeto a partir do template | Usar `kickoff-prompt.md` como prompt |
| Validar que kickoff está completo | `validate-kickoff` |
| Iniciar um milestone | `validate-dor [id]` |
| Implementar código | Trabalhar em chunks ≤100 linhas |
| Fazer commit | `pre-commit-check` → commit |
| Organizar múltiplas mudanças em commits | `organize-commits` |
| Validar cobertura de testes | `validate-testing` |
| Completar um milestone | `validate-dod [id]` → `update-docs task [id]` |
| Atualizar documentação de arquitetura | `update-docs system` |
| Reavaliar roadmap/prioridades | `update-docs roadmap` |
| Verificar links na documentação | `validate-docs-links check` |
| Auditar regras do projeto | `audit-rules full` |
| Auditar redundância em docs | `audit-architecture` |
| Sessão ficou longa (>150k tokens) | `fresh-context [milestone]` |
| Retomar trabalho amanhã | `generate-session-prompt` |
| Paralelizar trabalho com múltiplos agentes | `agent-team [nível] [milestone]` |
| Completar uma fase | `validate-docs-links` + `audit-rules` + `audit-architecture` |

### Sequência de Skills por Momento

**Ao completar um milestone:**
```
validate-dod [id]           # Validar critérios
→ update-docs task [id]     # Atualizar Projeto.md + Roadmap.md
→ organize-commits          # Agrupar commits pendentes
→ pre-commit-check          # Validar qualidade
→ commit final              # docs(milestone): finaliza [id]
```

**Ao completar uma fase:**
```
validate-dod [último-milestone]
→ update-docs task [último-milestone]
→ validate-docs-links check
→ audit-rules full
→ audit-architecture
→ [retrospectiva manual]
→ organize-commits
→ pre-commit-check
→ commit
```

**Antes de iniciar novo milestone:**
```
validate-dor [id]           # Verificar pré-requisitos
→ [se falhar: resolver dependências]
→ [se passar: iniciar desenvolvimento]
```

---

## Ferramenta Ativa

O template suporta múltiplas ferramentas de IA:

| Ferramenta | Arquivos de Configuração | Notas |
|-----------|------------------------|-------|
| **Claude Code** | `.claude/CLAUDE.md`, `.claude/rules/`, `.claude/skills/` | Suporte completo, inclui Agent Teams |
| **Codex/Cursor** | `.codex/AGENTS.md`, `.codex/rules/`, `.codex/skills/` | Mirror de `.claude/`, mesmas regras |

Ambos os conjuntos devem ser mantidos alinhados. Ao fazer kickoff, o prompt preenche ambos automaticamente.

---

## Dicas Gerais

### Para Melhores Resultados com o Agente

1. **Seja específico.** "Implemente autenticação JWT" é melhor que "adicione login".
2. **Referencie documentos.** "Conforme Projeto.md seção 3.2" dá contexto ao agente.
3. **Divida tarefas grandes.** Se a feature é complexa, quebre em subtasks e implemente uma por vez.
4. **Revise sempre.** O agente é poderoso mas não é infalível. Valide regras de negócio e decisões arquiteturais.
5. **Use o Roadmap como norte.** Ao invés de pedir features avulsas, trabalhe milestone por milestone.

### O Que NÃO Fazer

1. **Não pule validate-dor.** Iniciar milestone sem pré-requisitos leva a retrabalho.
2. **Não marque milestone como completo sem validate-dod.** "Quase done" não é done.
3. **Não use `git add .`** Commits atômicos por task, sempre.
4. **Não ignore pre-commit-check.** A qualidade do código é cumulativa — problemas pequenos viram dívida grande.
5. **Não edite Projeto.md de forma casual.** É a fonte de verdade — mudanças devem ser deliberadas e documentadas.
6. **Não deixe sessões muito longas sem fresh-context.** Após ~150k tokens, a qualidade degrada.

---

## Gaps Conhecidos e Soluções Manuais

O template cobre ~80% do ciclo de vida com skills automatizadas. Para os ~20% restantes, siga estas orientações manuais:

| Cenário | Status | O Que Fazer |
|---------|--------|-------------|
| **Retrospectiva de fase** | Manual | Peça ao agente para analisar timeline planejado vs real e documentar lições em `documents/strategy/` |
| **Mudança de escopo** | Manual | Peça ao agente para avaliar impacto no Roadmap, depois use `update-docs roadmap` |
| **Release/deploy** | Manual | Siga o checklist na Etapa 7 deste guia |
| **Fechamento de projeto** | Manual | Siga o ritual na Etapa 9 deste guia |
| **Atualização de dependências** | Manual | Peça ao agente para listar desatualizadas e atualizar incrementalmente com testes |
| **Incident postmortem** | Manual | Documente timeline, causa raiz e ações em `documents/strategy/` |
| **Onboarding de contribuidor** | Manual | Gere `fresh-context` e compartilhe Projeto.md + Roadmap.md |
| **Demo para stakeholders** | Manual | Peça ao agente para gerar script de demo baseado no DoD dos milestones concluídos |

> Skills dedicadas para estes cenários podem ser adicionadas em versões futuras do template.

---

**Versão:** 2.0.0
**Última atualização:** Template
**Referências:** [CLAUDE.md](../../.claude/CLAUDE.md) | [Projeto.md](../core/Projeto.md) | [Roadmap.md](../core/Roadmap.md) | [Skills README](../../.claude/skills/README.md)
