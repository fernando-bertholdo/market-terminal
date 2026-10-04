# AGENTS.md — Market Terminal (regras do template)

> **Ordem deste arquivo:** as regras vêm primeiro porque o Codex lê só os primeiros 32768 bytes do `AGENTS.md` (`project_doc_max_bytes`, padrão; a chave não é lida do `.codex/config.toml` do repositório, medido com `codex debug prompt-input` na TECH-668). A parte do projeto vem depois e pode não chegar inteira ao Codex: o guia do projeto está no `CLAUDE.md` da raiz, que ela repete com uma linha a mais (a do *Live exit layer*, em "Quant Simulator").

Regras operacionais do projeto para agentes de desenvolvimento IA, vindas do `tech-product-template` (marcador em `.claude/CLAUDE.md`, `.agents/README.md` e `.codex/README.md`). A visão do produto, a arquitetura e os comandos do projeto estão na segunda parte deste arquivo, depois destas regras.

> **Single Source of Truth:**
> - Regras operacionais → Este arquivo
> - Contexto de negócio e arquitetura → `documents/core/Projeto.md`
> - Detalhes técnicos → `.claude/rules/*.md` (uma rule por glob; ver §6)
> - Skills → `.agents/skills/*/SKILL.md`
> - Workflows → `.agents/workflows/*.md`

---

## 1. Setup

### Ambiente

```bash
# Clonar e entrar no projeto
git clone <repo-url>
cd market-terminal

# Instalar dependências (adaptar ao stack)
npm install

# Copiar variáveis de ambiente
cp .env.local.example .env.local
# Preencher .env.local com credenciais necessárias (ver "Environment Variables", acima)
```

### Estrutura do Projeto

```
.
├── AGENTS.md                   # ← Este arquivo (projeto + regras para agentes)
├── CLAUDE.md                   # Visão do projeto para o Claude Code
├── .agents/                    # Convenção lida por vários harnesses
│   ├── skills/                 # Agent Skills (agentskills.io)
│   ├── workflows/              # Workflows invocáveis
│   └── stacks/                 # Configuração por stack
├── .claude/                    # Claude Code: CLAUDE.md, rules/, skills/, prompts/
├── .codex/                     # Codex: config.toml, rules/comandos.rules, stacks/
├── documents/
│   ├── core/                   # Projeto.md, Roadmap.md
│   ├── technical/              # Docs técnicos suplementares
│   ├── strategy/               # Documentos de estratégia e método
│   └── archive/                # Materiais brutos
├── .planning/                  # Gestão de initiatives e handoffs
├── deploy/                     # Deploy (cloudflare-worker do tick periódico)
├── docs/                       # Documentos avulsos (dados de mercado, planos de ML, handoff)
├── public/                     # Assets estáticos do Next.js
├── research/                   # Pesquisa (news-bootstrap)
├── scripts/                    # Scripts (índice em scripts/INDEX.md)
├── services/                   # Serviços Python (model-engine, news-nlp)
└── src/                        # Código-fonte Next.js
```

---

## 2. Acompanhamento de Roadmap e Iniciativas

### Responsabilidade Contínua

**Antes de começar qualquer tarefa:**
- Consultar `documents/core/Roadmap.md` para verificar o milestone atual
- Invocar skill `init-milestone [milestone-id]` para criar infraestrutura de planning (se diretório não existe)
- Invocar skill `validate-dor [milestone-id]` para validar pré-requisitos
- Se DoR não estiver completo, PARE e trabalhe nas dependências primeiro
- Consultar o CONTEXT.md da initiative em `.planning/` para o recorte de trabalho

**Durante o desenvolvimento:**
- Consultar periodicamente o **DoD (Definition of Done)** no Roadmap
- Invocar skill `validate-testing` para validar cobertura de testes
- Fechar as tarefas no rastreador do projeto conforme avança
- Usar formato `- verify:` nas tarefas para verificações programáticas

**Antes de commit:**
- Invocar skill `pre-commit-check` (inclui code quality, testing, security)
- Invocar skill `organize-commits` se múltiplas mudanças pendentes

**Ao completar uma tarefa:**
- Invocar skill `validate-dod [milestone-id]` para validar conclusão
  - Executa os `verify:` do DoD e dos critérios de aceite automaticamente
  - Gera Verification Report com PASS/FAIL
  - Se PASS e último milestone da initiative: aciona `reconcile-initiative` automaticamente
- Invocar skill `update-docs task [milestone-id]` para atualizar documentação
- Documentar evidências (testes, screenshots, métricas)

**Ao completar uma fase:**
- Invocar skill `validate-docs-links check` para validar links
- Invocar skill `audit-rules full` para auditar regras
- Invocar skill `audit-architecture` para verificar redundâncias
- Invocar skill `archive-initiative --phase <fase>` para arquivar initiatives concluídas
- Invocar skill `scope-horizons review` para dar veredito aos horizontes de escopo vivos — não é gate bloqueador

### Registro Contínuo de Descobertas (Nenhuma Pendência Órfã)

**"Todo 'vale confirmar', 'investigar depois', 'na retomada', requisito ou decisão que emergir
num turno DEVE ganhar endereço de registro no MESMO turno."**

Compromissos que vivem só na prosa da conversa evaporam. Registro faz parte da resposta, não é
tarefa posterior. A regra cobre o buraco entre trabalho formal (gates de DoR/DoD/commit) e
**descoberta conversacional** — exploração, diagnóstico e design fora de initiative formal.

| O que emergiu | Destino |
|---|---|
| Decisão/requisito de initiative formal existente | `CONTEXT.md` da initiative |
| Requisito de initiative AINDA NÃO formalizada | Seed: `.planning/scratch/seed-<slug>.md` + linha na seção Seeds do `.planning/README.md` |
| Decisão consolidada de negócio/arquitetura | `update-docs` → `documents/core/Projeto.md` |
| Fato operacional de ambiente/infra durável | Runbook/doc operacional em `documents/` |
| **Ampliação do escopo do produto**, fora do plano, com evidência linkável | `scope-horizons capture` → `documents/strategy/scope-horizons.md` (ver abaixo) |
| Trabalho emergente que cruza a veia principal | **Classifique antes de criar** — apara, fatia ou detour; o destino é diferente nos três casos (§2, "Classificar antes de criar issue") |
| Achado, pendência ou decisão que surgiu num **comentário no rastreador** (thread de issue, veredito de revisão, nota) | Checkbox com `verify:` na descrição da issue, ou issue própria. **Comentário no rastreador não é destino**: quem retoma lê a descrição e o repositório, não a thread — em 18/09/2026 uma correção que vivia só num comentário virou defeito no deploy seguinte |

**Harness-agnóstico:** memória nativa do harness, quando existir, é **cache pessoal do agente** —
acelera recall, mas nunca é registro canônico. Nenhuma skill ou regra pode depender de conteúdo
que só exista na memória de um harness.

**Regra de `scratch`:** `.planning/scratch/` é **trilha de raciocínio, não fila de trabalho**.
Quando um rascunho gera trabalho, o trabalho nasce como issue e o arquivo fica como registro de
como se chegou lá. Não existe arquivo em `scratch/` esperando alguém notar.

**Contrato de resposta:** turnos que produziram descobertas terminam com um bloco curto listando
`<item> → <destino>`. Turnos triviais ficam isentos.

> Esta é a mesma tabela da §1.7 do `.claude/CLAUDE.md`, e as duas **não podem divergir**. Ela
> passou a existir aqui em 14/09/2026 (TECH-552): até então o `AGENTS.md` não tinha equivalente,
> e todo o roteamento de descobertas era invisível para quem lesse apenas este arquivo.

### Horizonte de escopo — a ideia que ainda não é trabalho

Quando o trabalho produz uma evidência que sugere que o **produto pode crescer para além do
escopo atual**, e não há intenção de trazer isso para dentro agora, o destino é
`documents/strategy/scope-horizons.md`, pela skill `scope-horizons capture`.

Três testes, todos obrigatórios — **três de três, ou não é horizonte**:

1. **Amplia o escopo do produto** para usuário ou negócio; não é melhoria interna nem ferramenta.
2. **Está fora do plano** e não há intenção de trazer para dentro agora.
3. **Nasceu de evidência concreta produzida pelo trabalho**, com artefato linkável.

O agente **propõe, nunca grava sozinho**, e no máximo **uma proposta por turno**. A proposta se
resolve no mesmo turno — aceita ou descartada —, então não gera pendência órfã.

Ideia técnica ou operacional não entra: se virar trabalho, nasce como issue pelo caminho normal.

### Classificar antes de criar issue

**Toda issue nova passa por duas perguntas, nesta ordem, antes de a primeira seção ser escrita.**
O formato vem da classe; a classe não é escolha de estilo.

**1. É apara?** Trabalho que deriva de uma revisão **e conserta o mesmo diff que o revisor leu**
é apara. Nasce sob a issue cuja fatia foi criticada — nunca sob a issue-pai de topo — e para
aqui: não vira detour por volume. Se o trabalho vai para arquivo que o escopo negativo da issue
criticada proibia tocar, ou para uma lacuna do repositório inteiro, não é apara: siga.

**2. Dois destes três sinais fazem um detour**, não uma fatia da milestone:

- **Origem** — nasce fora do plano escrito da pai: não corresponde a nenhuma fatia nem stage previsto.
- **Artefato** — entrega script, ferramenta, derivado ou diretório que passa a existir e a ser mantido.
- **Paralelo** — corre ao mesmo tempo que a veia principal sem ser insumo do DoD de outra fatia.

Um sinal só é fatia. Dois ou mais: invoque `init-detour <nome> --parent-issue <ID-da-milestone>`
e declare a classe na primeira linha da descrição da issue — quem executa classifica por sinal
POSITIVO, e ausência de declaração não é sinal de nada.

**O número de issues derivadas NÃO entra nesta decisão.** Ele é real e chega tarde: quando você
sabe que o trabalho rendeu três issues, elas já nasceram no lugar errado. Ele serve para
**reclassificar**: um cluster que acumula 3 derivadas, ou atravessa mais de uma sessão em
paralelo, pede reavaliação — e quem percebe **propõe e para**, porque reorganizar o board é
decisão de quem o governa.

### Regra de Ouro

**"Se DoR não está completo, NÃO comece. Se DoD não está 100% atendido, NÃO está done."**

---

## 3. Context Engineering

### Otimização de Contexto

**Trigger de Fresh Context (>150k tokens):**
- Quando sessão ultrapassar **150k tokens**, invocar skill `fresh-context`
- Gera CONTEXT.md self-contained para handoff limpo
- **Paths por tipo:**
  - COM milestone → `.planning/milestones/MX.X-nome/handoff/MX.X-CONTEXT.md`
  - SEM milestone → `.planning/scratch/{slug}-CONTEXT.md`

**Reduza Noise no Contexto:**
- Leia apenas docs relevantes para a tarefa atual
- Use `documents/README.md` como índice
- Consulte documentos específicos ao invés de explorar todo o codebase

### Salvaguardas de Documentação

- `documents/core/Projeto.md` é a **fonte de verdade** para decisões de negócio e arquitetura
- `documents/technical/` e `documents/strategy/` são suplementares
- Se houver conflito, `Projeto.md` prevalece

### Regra "Docs First"

**Antes de qualquer busca extensiva:**
1. Consulte `documents/README.md` primeiro
2. Se docs estão atualizados → Use diretamente
3. Se docs desatualizados → Use subagente para pesquisa

### Regra "Planning First"

**Antes de iniciar trabalho em milestone ou detour:**
1. Consulte `.planning/README.md` para identificar o milestone/detour
2. Invoque `init-milestone MX.X` para criar infraestrutura (se diretório não existe)
3. Leia `.planning/milestones/MX.X-nome/CONTEXT.md` (contexto vivo)
4. Para detours transversais: `.planning/detours/nome/CONTEXT.md`
5. Se retomando milestone, leia `.planning/milestones/MX.X-nome/handoff/MX.X-CONTEXT.md`
6. Se nenhum CONTEXT existe, use skill `fresh-context` para criar

**Tipos de trabalho:** milestone | detour — a taxonomia é pela **relação com o
plano escrito**, não por tamanho, e a régua é a do `AGENTS.md` §2. Milestone já
estava no Roadmap. Detour satisfaz **dois de três sinais** — nasce fora do plano ·
entrega artefato próprio mantido · corre em paralelo. **Alterar o plano não é um
dos sinais:** um detour pode alterar e muitos alteram, mas não é isso que o
define. Um sinal só é fatia; nenhum é **issue avulsa**, sem tipo, sem diretório em
`.planning/` e sem reconciliação.
Ao criar um detour, `init-detour` pergunta **o que ele muda no plano** e grava a
resposta. Ao fechar, se mudou, o `Roadmap.md` muda **onde a sequência vive** e o
identificador vai no commit; se não mudou, o Roadmap não é tocado.
- Ver `.planning/README.md` para árvore de decisão

### Governança de Artefatos

Antes de criar artefato ou diretório:
1. É doc/planning ou output operacional? (doc → `documents/`, planning → `.planning/`, output → pergunta 2)
2. É durável ou efêmero? (durável = catalog, efêmero = runtime)
3. Já existe diretório para isso? (sim → use-o; não → NÃO crie, registre bloqueio)

Moratória: NÃO criar novo diretório raiz. Referência: `.claude/rules/artifact-governance.md`

### Diretórios de Agentes

Cada diretório guarda o que algum harness em uso lê, mais `workflows/` e `stacks/`, que se leem sob
pedido, sem leitor automático medido (TECH-852):

| Diretório | Quem lê | Conteúdo |
|-----------|---------|----------|
| `.claude/` | Claude Code | `CLAUDE.md`, settings, hooks, skills, rules, prompts |
| `.codex/` | Codex CLI | `config.toml`, `rules/comandos.rules` (regra de comando da §8, Starlark), stacks |
| `.agents/` | vários harnesses (convenção de pasta; o Codex lê `skills/`) | skills (agentskills.io), workflows, stacks |

As regras deste arquivo (`AGENTS.md`) são o **denominador comum**. As rules de código vivem só em
`.claude/rules/`, e as skills em duas cópias, `.claude/skills/` e `.agents/skills/`, que o
`scripts/validate/check-pareamento-instrucoes.sh` mantém pareadas. Não há rule a replicar em
outro diretório. `.codex/stacks/` e `.agents/stacks/` são cópias idênticas que nenhum gate
compara (`diff -rq .codex/stacks .agents/stacks`, vazio em 02/10/2026).

**Teto de leitura do Codex:** o Codex CLI lê este arquivo até **32768 bytes** (32 KiB, o padrão de
`project_doc_max_bytes`) e corta o resto, então o que vier depois do teto não chega ao modelo.
Quem acrescentar regras aqui confere com `scripts/validate/check-agents-md-teto.sh`, que reprova o
arquivo acima do teto (TECH-803).

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

### Horas e datas — a zona sempre escrita

**Fuso do dono do repositório:** `America/Sao_Paulo`, rótulo `BRT`.

É o fuso de quem lê o que os agentes escrevem aqui. O kickoff de um derivado cujo dono vive em outro
fuso troca a linha acima, e só ela: skills e modelos dizem "fuso do dono" e apontam para esta seção,
sem repetir o fuso.

- **Texto para gente** (resposta, comentário, reporte, handoff, relatório, changelog): a hora sai
  de `TZ=<fuso do dono> date '+%d/%m/%Y %H:%M %z'`, medida logo antes de escrever, e se escreve
  `HH:MM` seguido do rótulo. O `%z` mostra a zona: o offset esperado é o do fuso do dono, e outro
  quer dizer que a hora não é dele. A data é a do calendário do fuso do dono (`TZ=<fuso do dono>
  date +%F` onde o formato é ISO).
- **Hora que vai ser cruzada com carimbo de API** (GitHub, git, board), que vem em UTC: o UTC entra
  ao lado, entre parênteses, de `date -u '+%d/%m %H:%MZ'` — `18:41 BRT (21:41Z)`. Quando o UTC cai
  em outro dia do calendário (as últimas horas do dia a oeste de Greenwich, as primeiras a leste),
  ele leva a data, na ordem dia/mês: `22:59 BRT (04/10 01:59Z)` é 4 de outubro, e sem a data quem
  cruza com o carimbo `2026-10-04T01:59Z` procura no dia errado. O `BRT` dos exemplos é exemplo: o
  rótulo acompanha o fuso do dono.
- **Segundos da hora escrita** só entram copiados de um carimbo de máquina (por exemplo GitHub,
  git, board, log), com a zona que ele traz (`Z`, `+00:00` ou o offset gravado nele), nunca lidos
  do relógio na hora de escrever: a hora medida para no minuto. Na hora do fuso do dono, os
  segundos vão com o UTC ao lado, os dois tirados do mesmo carimbo: `00:32:11 BRT (03:32:11Z)`.
  Duração medida (`52 s`) é conta entre dois carimbos, e a leitura do relógio que alimenta uma
  conta (duração, comparação com um `ts`) não é hora escrita: o segundo lido não vai para o
  texto. Segundo digitado sem fonte é número órfão.
- **Carimbo de máquina** (ISO de API, log, campo JSON, nome de arquivo que só a máquina lê): fica em
  UTC, com `Z` ou `+00:00` (`date -u`, ou o equivalente do stack).
- **Data em identificador ou nome de arquivo que gente lê** (`SYNC-YYYYMMDD-NNN`,
  `reconcile-<id>-YYYY-MM-DD.md`, a coluna Data do Changelog Local): a data do calendário do fuso do
  dono, a mesma do cabeçalho do artefato.
- **Hora sem zona é defeito.** `date` sem `TZ=` dá o relógio da máquina que roda, que pode não ser o
  do dono, e `date -u` dá a data seguinte nas últimas horas do dia a oeste de Greenwich, e a
  anterior nas primeiras horas a leste.

Por quê: hora sem zona não se ordena contra hora de outra fonte, e uma hora em UTC lida como local
chega horas adiantada a quem lê.

---

## 5. Build & Test

### Comandos (adaptar ao stack)

```bash
# Testes: sem comando — o package.json não tem script de teste

# Cobertura: sem comando — o package.json não tem script de cobertura

# Lint
npm run lint

# Formatação
npx prettier --check .

# Type checking
npm run type-check
```

> **Nota:** comandos dos scripts do `package.json` deste repositório. Não há suíte de teste
> ("No test suite exists", seção "Dev Commands" da parte do projeto): a verificação é
> `npm run type-check` mais `npm run lint`. Ver `.agents/stacks/` para starter packs por linguagem.

---

## 6. Code Style

Os padrões de código estão nas rules abaixo, em `.claude/rules/`, cada uma com os globs do `paths:` do frontmatter dela. O Claude Code carrega a rule ao editar arquivo do glob; para os outros harnesses isso não foi medido, e quem edita um arquivo que casa um desses globs lê a rule correspondente antes. As cópias que existiam em `.agents/` e em `.codex/` saíram na TECH-852. Na medição da TECH-699 (30/09/2026, Codex 0.145, um modelo, `gpt-5.6-luna`, esforço `low`, por auto-relato), o Codex não relatou o canário de nenhuma rule; o recorte: canários em 2 das 8 rules da cópia que ficava em `.codex/` (uma com `paths:`, uma sem frontmatter), nas chamadas A a D, e em 3 das 8 da cópia que ficava em `.agents/` (`paths:`, `trigger: always_on` e sem frontmatter), só na chamada D. Ausência relatada é evidência mais fraca que presença, e as outras superfícies que citam esta medição apontam para cá.

- `.claude/rules/code-quality-standards.md` → `src/**/*`, `**/*.py`
- `.claude/rules/security-best-practices.md` → `src/**/*`, `**/*.py`, `.env*`
- `.claude/rules/testing-requirements.md` → `tests/**/*`, `**/test_*.py`, `**/*_test.py`
- `.claude/rules/api-integration-patterns.md` → `src/collectors/**/*`, `src/alerting/**/*`, `src/integrations/**/*`
- `.claude/rules/documentation-templates.md` → `src/**/*`
- `.claude/rules/scripts-governance.md` → `scripts/**/*`

---

## 7. Segurança e Fidelidade de Dados

### Regra de Ouro — segredo

**NUNCA commitar segredo no repositório.**

Segredo é credencial, token, chave e senha. A proibição é absoluta e não tem
exceção, e a razão é específica: uma credencial num repositório privado continua
sendo vulnerabilidade, porque quem obtém o repositório ganha a **capacidade de
agir**.

### Checklist Obrigatório

- [ ] Nenhum secret hardcoded no código
- [ ] Todas credenciais via environment variables
- [ ] `.env` no `.gitignore`
- [ ] `.env.example` documentado
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

> **Detalhes:** `.claude/rules/security-best-practices.md`

---

## 8. Commit Strategy

### Regra de Ouro

**"1 task = 1 commit. NUNCA use git add . ou git add -A"**

### Protocolo Atomic Commits

1. **NUNCA** usar `git add .` ou `git add -A` — o Claude Code (`deny` do `.claude/settings.json`) e o Codex (`.codex/rules/comandos.rules`) bloqueiam essas formas por prefixo, como guarda contra acidente e não contra contorno; as que escapam estão em `.codex/README.md`, "Limite da regra de comando"
2. **SEMPRE** stage arquivos individualmente por task
3. **MÁXIMO** 100 linhas por commit
4. **FORMATO:** `{type}({milestone}-{task}): {description}`
5. **RASTREAR** hashes no CONTEXT.md da initiative em `.planning/`

### Conventional Commits

**Formato:** `<type>(<scope>): <assunto-em-pt-br>`

`type` e `scope` seguem o padrão Conventional Commits (en). Subject, body e texto descritivo devem ser sempre em português do Brasil.

**Types:** feat, fix, docs, refactor, test, chore, perf, style, ci, build

**Scopes:** web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning

> **Scope reservado pelo template:** `scripts` (manutenção de `scripts/**`) — sempre disponível como scope válido, independente de `web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning` do projeto.

### Política de Atribuição

1. **NUNCA** mencionar assistentes de IA (Claude, Codex, Cursor, etc.)
2. **NUNCA** incluir co-autoria com IA
3. **SEMPRE** apresentar como trabalho do desenvolvedor
4. **SEMPRE** usar conventional commits padrão

---

## 9. Governança de Changelog (Diretórios de Agentes)

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

## 10. Referências

### Contexto do Projeto
- `documents/core/Projeto.md` → Regras de negócio, arquitetura, decisões

### Detalhes Técnicos (rules por glob)
- `.claude/rules/*.md` → uma rule por glob de arquivo; leia a rule ao editar arquivo do glob (§6)

### Timeline e Gestão
- `documents/core/Roadmap.md` → Plano de registro: fases, milestones, DoR/DoD

### Planning e Iniciativas
- `.planning/README.md` → Hub: registry de milestones e detours
- `.planning/milestones/MX.X-nome/` → Diretório do milestone (CONTEXT.md, verification/, handoff/)
- `.planning/detours/nome/` → Detour transversal
- `.planning/scratch/` → Context dumps sob demanda (efêmeros)

### Configuração por Ferramenta
- `.claude/` → Claude Code (CLAUDE.md, settings, hooks, skills, rules, prompts)
- `.codex/` → Codex CLI (config.toml, rules/comandos.rules, stacks)
- `.agents/` → convenção lida por vários harnesses (skills, workflows, stacks — agentskills.io)

---

**Versão:** 2.8.0
**Última atualização:** 2026-10-04
**Autor:** Fernando Bertholdo

**Changelog v2.8.0 (TECH-995, DL-5 do detour `fuso-horario`):**
- Seção 4: os segundos da hora escrita só entram copiados de um carimbo de máquina, com a zona que
  ele traz, nunca lidos do relógio na hora de escrever; no fuso do dono, vão com o UTC ao lado,
  tirados do mesmo carimbo. Duração medida e a leitura do relógio que alimenta uma conta não são
  hora escrita
- Seção 9: no mesmo dia, a ordem do Changelog Local segue a dos commits que as linhas citam, e o
  empate deixa de ser livre; o `check-changelog-local.sh` confere a ordem entre dias, e não a de
  dentro do dia, porque não vê o git

**Changelog v2.7.0 (TECH-970, TECH-958):**
- Seção 4: nova subseção "Horas e datas", com o fuso do dono do repositório numa linha só
  (`America/Sao_Paulo`, rótulo `BRT`) e a regra da zona sempre escrita — texto para gente no fuso
  do dono, com o `%z` conferindo a zona; UTC ao lado quando cruza com carimbo de API, com a data na
  ordem dia/mês quando o UTC cai em outro dia (`22:59 BRT (04/10 01:59Z)`); carimbo de máquina em
  UTC com `Z` ou `+00:00`; e data de identificador lido por gente no calendário do fuso do dono.
  Skills e modelos apontam para ela
- Seção 9: a coluna Data e o `YYYYMMDD` do Sync-ID saem do calendário do fuso do dono
- Instruções de preenchimento: `{{DATE}}` é a data do fuso do dono, e o kickoff confere a linha do
  fuso, trocando-a quando o dono do derivado vive em outro
- Seção 4 (TECH-958): o UTC em outro dia do calendário vale também para o dono a leste de
  Greenwich, nas primeiras horas do dia, e não só nas últimas a oeste

**Changelog v2.6.0 (TECH-852, TECH-894):**
- Seções 1, 3, 6, 7, 9 e 10: as rules vivem só em `.claude/rules/`, as skills em `.claude/skills/` e
  `.agents/skills/`, e `.codex/` guarda `config.toml`, `rules/comandos.rules` e `stacks/`; nenhuma
  seção manda mais replicar rule em outro diretório. O `.agents/` é descrito como convenção lida
  por vários harnesses
- Seção 3: os diretórios guardam também `workflows/` e `stacks/`, que se leem sob pedido, sem leitor
  automático medido; `.codex/stacks/` e `.agents/stacks/` são cópias idênticas sem gate, e o destino
  delas é a TECH-923
- Seção 6: a frase de medição da TECH-699 passa a trazer o recorte por cópia (canários em 2 das 8
  rules da cópia `.codex`, nas chamadas A a D, e em 3 das 8 da cópia `.agents`, só na chamada D),
  uma vez só, e as outras superfícies apontam para ela; deixa de afirmar que outro harness não
  carrega as rules de `.claude/rules/`, o que não foi medido
- Seção 8: o bloqueio de `git add .` e `git add -A` nos dois harnesses é guarda contra acidente; as
  formas que escapam ficam no `.codex/README.md`
- Seção 8: a lista de assistentes perde a ferramenta que o template deixou de usar (TECH-829)

**Changelog v1.0.0:**
- A parte de regras entra neste `AGENTS.md` na propagação do tech-product-template de 2.14.0 a 2.18.0 (TECH-668), **antes** do conteúdo do projeto, que fica como estava e passa para depois dela, porque o Codex lê só os primeiros 32768 bytes (nota no topo). Texto do `AGENTS.md` da origem em `b51dbf9` (versão 2.5.0 dele), com os placeholders preenchidos pelos valores que `.claude/`, `.agents/` e o `tap-template.md` daqui já usam, a estrutura da seção 1 descrita como o repositório é, e as convenções locais do `.claude/CLAUDE.md` daqui (seeds em `.planning/scratch/`, CI condicional). Os dois blocos de instrução do kickoff saem, porque não sobrou placeholder a preencher; ao lado dos scopes entra a nota do scope reservado `scripts`, como no `.claude/CLAUDE.md`. Testes e cobertura ficam sem comando, porque o `package.json` não tem script para eles. O histórico anterior deste texto é o da origem e fica no template. Referência na origem: SYNC-20260915-001

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Bloomberg-style FICC market terminal for personal use (FICC trading intern, Brazil focus), plus a **quant paper-trading simulator**. Dense, dark-themed, keyboard-navigable UI showing real-time Brazil/US/Global rates, FX, commodities, and news — and a research-backed strategy engine that simulates (never executes) trades.

## Dev Commands

```bash
npm run dev        # dev server at localhost:3000
npm run build      # production build
npm run lint       # ESLint
npm run type-check # tsc --noEmit
```

No test suite exists. Verify changes with `type-check` + `lint`, then smoke-test API routes against a running dev server (e.g. `Invoke-WebRequest http://localhost:3000/api/market`).

## Environment Variables

`.env.local` (gitignored). All are server-side — never use the `NEXT_PUBLIC_` prefix.

- `FRED_API_KEY=` — required for US rates/breakevens, free key from fredaccount.stlouisfed.org/apikeys. BCB, Yahoo, B3, and RSS need no auth.
- `DATABASE_URL=` — Neon Postgres connection string. Backs the paper book (`sim_state`) **and** authentication (`auth_credentials`, `auth_sessions`). Without it, auth is unavailable and the paper book falls back to a local `data/sim-state.json` file (dev only).
- `APP_USERNAME=` / `APP_PASSWORD=` — bootstrap the single login credential on first sign-in (then stored hashed in Postgres).
- `CRON_SECRET=` — shared secret for the periodic tick (sent as a `Bearer` token); the auth middleware lets matching requests through to `/api/sim` and `/api/market`.
- `ATLAS_BACKEND_URL=` (alias `MODEL_ENGINE_URL`) — base URL of the Python `model-engine`; when set, Next delegates heavy data/signals to it. Optional `ATLAS_BACKEND_TOKEN`/`MODEL_ENGINE_TOKEN` (Bearer) and `ATLAS_BACKEND_REQUIRED=true` (fail closed instead of falling back to the TypeScript fetchers).
- `NEWS_NLP_URL=` (optional `NEWS_NLP_TOKEN`) — base URL of the Python `news-nlp` service for ML headline classification; any error/timeout falls back to the deterministic regex classifier.

## Architecture

Source lives in `src/` (not `/app`). Front-end data flow: **fetchers → API routes → SWR hooks → widgets**, all rendered inside the ATLAS navigation shell. The Next app is now a **UI shell + session auth + paper-book executor + BFF**: when `ATLAS_BACKEND_URL`/`MODEL_ENGINE_URL` is set, the API routes delegate heavy data and signals to the Python `model-engine` (`src/lib/backend/pythonBackendClient.ts`); otherwise they fall back to the local TypeScript fetchers.

```
src/
  middleware.ts       — Edge auth gate: redirect to /login (401 for /api/*) unless a valid
                        `atlas_session` cookie exists; lets the `Bearer CRON_SECRET` tick through
  app/login/page.tsx  — login screen (auth API routes below)
  app/api/
    market/route.ts   — aggregates BCB + FRED + Yahoo + B3 via Promise.allSettled;
                        partial failures return null fields + per-source SourceStatus
    news/route.ts     — RSS aggregation (Bloomberg + Google News proxy for Reuters)
    history/route.ts  — daily closes per symbol (?symbols=BRL=X,CL=F&range=1y)
    sim/route.ts      — live quant model: signals + persistent paper book;
                        POST {action: tick|rebalance|reset} (cron token may only tick)
    macro/route.ts    — macro dashboard: FRED (CPI/core YoY computed from index
                        levels, UNRATE, HY OAS, NFCI, T10YIE, DFII10) + BCB IPCA
                        12m (SGS 13522) + BCB Focus survey medians (Olinda
                        Expectativas API, ExpectativasMercadoAnuais, no auth)
    auth/login|logout|credentials/route.ts — session login/logout + change credentials
  lib/
    fetchers/         — one adapter per source (bcb, fred, yahoo, yahooHistory, b3, news);
                        all return null on failure and log, never throw to callers
    backend/pythonBackendClient.ts — BFF client: delegates market/history/macro/news/
                        earnings/signals to the Python model-engine when configured
    auth.ts           — session auth (PBKDF2-SHA256, 210k iters) backed by Neon Postgres
    analytics.ts      — pure stats: returns, EWMA vol, z-score, Sharpe, max drawdown
    sim/strategies.ts — signal engine: TSMOM, CARRY, MACRO sleeves + vol targeting
    sim/stateStore.ts — paper-book persistence: Neon Postgres (sim_state) or JSON fallback
    sim/engine.ts     — paper portfolio (fills, costs, persistence); legacy research backtest is not routed
    constants.ts      — INSTRUMENTS, tickers/series codes, PanelId, colors, refresh rates
    widgetRegistry.ts — widget metadata (title, category, default spans)
  hooks/              — useMarketData/useNews/useSim/useHistory (SWR polling),
                        useTerminalWorkspace (presets + localStorage), useTerminalPreferences
  components/
    terminal/         — TerminalLayout (global keyboard handler, CSS-var theming),
                        WorkspaceGrid, WidgetRenderer, CommandPalette, PreferencesDrawer, StatusBar
    widgets/          — one panel per widget: Rates, FX, Commodity, News, Chart,
                        Watchlist, Analytics, Sim
```

Outside `src/`: `services/model-engine` + `services/news-nlp` (Python FastAPI backends, see below), `deploy/cloudflare-worker` (periodic tick), `DEPLOY.md` (deploy notes).

### Backend services, auth & persistence

- **Python backends** (`services/`, FastAPI): `model-engine` (`atlas-backend`, port 8010) serves market data, history, macro, news and the quant signal engine (`compute_signals`) via `GET /health|/market|/market/terminal|/history|/macro|/news|/earnings` + `POST /signals`; `news-nlp` (`atlas-news-nlp`, port 8000) classifies headlines (`POST /classify`, `POST /retrain`, `GET /retrain/status`). Next reaches them through `src/lib/backend/pythonBackendClient.ts` (`ATLAS_BACKEND_URL`/`MODEL_ENGINE_URL`, `NEWS_NLP_URL`); a TypeScript fetcher fallback keeps the app working if a service is down, and `ATLAS_BACKEND_REQUIRED=true` makes data/signal routes fail closed instead.
- **Authentication** (`src/lib/auth.ts`, `src/middleware.ts`, `src/app/api/auth/*`, `src/app/login`, `AccountSettings`): cookie session `atlas_session`, password hashed with PBKDF2-SHA256 (210k iterations), 30-day sessions. The Edge middleware validates the session against Postgres on every request (redirect to `/login`, or 401 for `/api/*`) and lets the `Bearer CRON_SECRET` tick through. **Single-tenant today**: one global credential (`CREDENTIAL_ID = 'primary'`) and one global book (`STATE_ID = 'paper-book'`).
- **Persistence — Neon Postgres** (`@neondatabase/serverless`, Edge-compatible): tables `sim_state`, `auth_credentials`, `auth_sessions`. The paper book is the JSONB `sim_state` row with optimistic version checks; if `DATABASE_URL` is absent it falls back to `data/sim-state.json` (dev only) and `/api/sim` reports `"persistence": "file"` instead of `"postgres"`.

### Key patterns

- **Adding a widget** requires touching 4 places: `WidgetType` union in `useTerminalWorkspace.ts`, `WIDGET_REGISTRY` in `widgetRegistry.ts`, the render branch in `WidgetRenderer.tsx`, and `PanelId`/`PANELS` in `constants.ts`. Workspaces are presets in `WORKSPACE_PRESETS` (12-column grid cells).
- **Macro/regime layer**: `MacroPanel` computes four regime reads (RISK from SPX momentum + VIX + HY OAS trend; USD from DXY momentum + real yields; US INFL from CPI direction + breakevens; BCB from Focus SELIC vs current + DI slope). `CorrelationPanel` renders a rolling 30/60/120d correlation heatmap using `alignedReturns` + `correlation` from `lib/analytics.ts` (returns aligned on shared trading dates — never correlate raw arrays of different calendars). MACRO workspace shortcut: `E`.
- **Instrument catalog** (`lib/instrumentCatalog.ts`) is the single registry of instruments with accessors into the `/api/market` payload. It powers click-to-chart (rows call `useTerminalActions().openChart(id)` from `TerminalContext`), the editable watchlist (`useWatchlist`, localStorage), price alerts (`useAlerts`, evaluated client-side on each market refresh, banner in TerminalLayout), and `CHART <name>` commands in the palette. The chart overlay (`InstrumentChartOverlay`, lightweight-charts) only works for catalog entries with a Yahoo `symbol`; US yields chart via CBOE indices `^FVX`/`^TNX`/`^TYX`. When adding an instrument, add a catalog entry too.
- **API responses** always use `ApiResponse<T>` (`src/types/market.ts`): `{ data, fetchedAt, error, sources }`, HTTP 200 even on data failure — the UI renders nulls as `---` and shows source health in the StatusBar.
- **Panels** use inline styles with shared color constants (`#111111` bg, `#e8640c` orange, `#c8a45a` values, `#4caf72`/`#e05252` up/down) and CSS vars (`--terminal-row-height`, `--terminal-text-size`) set by TerminalLayout from preferences. Copy an existing panel (e.g. `RatesPanel.tsx`) when building a new one. Yields use inverted colors: rate up = red.
- **Keyboard**: workspace shortcuts (M/B/X/C/N/T/Q/W or 1–9), `/` or Ctrl+K command palette, `P` preferences, `F` focus mode, `R` refresh — handled centrally in `TerminalLayout.tsx`.

## Quant Simulator (`/api/sim`, Quant page)

Paper trading only — never sends real orders. Three sleeves, grounded in published research:

- **TSMOM** — time-series momentum (Moskowitz/Ooi/Pedersen, JFE 2012): sign of trailing 12m return blended with 3m, each position scaled by `volTarget / exAnteEWMAVol`.
- **CARRY** — Koijen/Moskowitz/Pedersen/Vrugt (JFE 2017): FX carry from rate differentials; implemented for USD/BRL using SELIC (BCB 1178) vs FEDFUNDS (FRED). Positive differential → short `BRL=X`.
- **MACRO** — economic trend / macro momentum (Brooks, AQR "A Half Century of Macro Momentum" 2017 + "Economic Trend" 2023): factor reads computed from prices only (walk-forward safe) — risk sentiment (VIX vs 1y median + SPX 3m trend), growth (copper/gold ratio trend), USD trend (DXY 3m) — mapped per asset with economic signs (gold anti-dollar/haven, JPY haven, EM hurt by strong USD…). Non-traded `CONTEXT_SYMBOLS` (`^VIX`, `DX-Y.NYB`, `^TNX`, `ITA`, `SOXX`, `XLU`) must be fetched alongside the universe.

Risk layer: **regime conditioning** (book de-grosses ×0.6 in RISK-OFF, ×1.1 in RISK-ON) and **covariance-based portfolio vol targeting** (weights scaled so √(wᵀΣw) over trailing-90d covariance hits 10% — correlations size the book, not per-asset vol alone). Caps: 40% per asset, 3x gross; single-name thematic equities are further capped at 5% per name and 8% per theme (`THEMATIC_EQUITY_THEME_CAP`). Universe: **27 tradable assets** in `SIM_UNIVERSE` (4 FX, 5 commodities, 8 equity index/ETF, 10 single-name thematic equities), plus non-traded `CONTEXT_SYMBOLS` (`^VIX`, `DX-Y.NYB`, `^TNX`, `ITA`, `SOXX`, `XLU`) read by the macro sleeve and regime filter.

`computeSignals` internally combines price trend, rate differentials, economic context/news, regime and risk scaling into one live portfolio. `/api/sim` exposes this as `decisions[]` with one final `LONG`/`SHORT`/`FLAT` decision, conviction, target weight and rationale per asset; internal components are not presented as separate strategies. `lib/sim/scenarios.ts` stress-tests the live book through correlation betas.

- **Explicit hedges**: `lib/sim/hedging.ts` builds auditable trade expressions for WTI/Brent, Ibovespa/SPX + BRL FX, and BRL carry vs a USD basket. Hedge ratios use `beta=-cov/var` over the trailing 120 observations (minimum 60, capped ±2), using only data available at decision time. Legs are netted back into the existing asset targets; the API also returns `expressions` for attribution. DV01 is explicitly unsupported until the universe has proper rates instruments and contract metadata.
- **Fixed-income risk dashboard**: `lib/fixedIncomeRisk.ts` calculates DI1 theoretical PU, business days, Macaulay/modified duration, convexity, and DV01 per contract using the B3 zero-coupon convention. US Treasury rows are explicitly labeled par-bond proxies, assuming semiannual coupons equal to current FRED constant-maturity yields, with DV01 per USD 1m face. Results are returned in `/api/market.data.fixedIncomeRisk` and shown on the Markets page.
- **News intelligence**: `lib/news/` classifies live headlines deterministically into themes, macro factors, and asset impacts with confidence and time decay. `/api/news` has per-source memory cache, single-flight refresh, stale-if-error, source health, and freshness metadata. The live model applies a capped news overlay to the macro decision layer.
- **Live-only product**: `/api/sim` and the Quant page expose only the live model, current paper book, P&L, hedged expressions, scenarios and rationale. Historical closes remain inputs for live momentum, volatility, covariance and hedge ratios; no backtest is computed or returned.
- **Live mode**: every GET fetches real-time Yahoo quotes (10s module micro-cache, `getLivePrices`) and splices them into the daily closes (`closesWithLive` — replaces today's partial bar or appends, never double-counts), so signals, marks, fills and scenarios all run off the live tape. The Quant page polls every 15s.
- **Paper book**: persisted to **Neon Postgres** (`sim_state` JSONB row, optimistic version checks, via `lib/sim/stateStore.ts`); falls back to `data/sim-state.json` (gitignored) only when `DATABASE_URL` is unset, and `/api/sim` reports the active backend as `"persistence": "postgres"` or `"file"`. Marked to market at live prices each request. Trading: full rebalance once/day (daily anchor) + **intraday tolerance-band rebalancing** (asset trades only when |target−actual| > 2% of equity — `driftBandPct`). `state.intradayEquity` keeps a rolling ~400-mark tape (≥1min spacing) for the live P&L chart; older state shapes are migrated on load. `POST /api/sim` accepts `{action: "tick"}` (advance/mark, used by the cron), `{action: "rebalance"}` and `{action: "reset"}`; the cron token may only `tick`.
- **Live exit layer**: `lib/sim/barriers.ts` applies volatility-adjusted stop-loss, take-profit, trailing-stop and 30-day time barriers before target rebalancing. Exits are persisted with an auditable reason. Same-direction re-entry requires a six-hour cooldown and a material change in the live target; an opposite decision clears the block. This is risk management for the one live strategy, not another model.
- When changing strategy logic, always keep the no-lookahead invariant: signals at t must never see prices after t.

## Verified Data Sources (do not "fix" these — they were researched)

- **BCB SGS**: `api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/1?formato=json` — SELIC `1178`, CDI `4392`, IPCA monthly `433`. Latest value only (no previous → change is null).
- **BCB PTAX Olinda**: `CotacaoDolarDia` / `CotacaoMoedaDia` (EUR); published ~13:00 BRT — fetchers walk back up to 7 days for the latest fix.
- **B3 DI futures**: `cotacao.b3.com.br/mds/api/v1/instrumentQuotation/{symbol}`, field `curPrc` = annual rate %. Symbols `DI1N26`, `DI1F27`, `DI1F28`, `DI1F30` — **contract codes expire; update in `constants.ts` and `api/market/route.ts`**. Returns `NOK` outside trading windows (data absence, not an error).
- **FRED**: `DGS2/5/10/30`, `FEDFUNDS`, breakevens `T5YIE`/`T10YIE`. Needs `FRED_API_KEY`.
- **Yahoo Finance**: direct v8 chart API with browser User-Agent (the `yahoo-finance2` package is installed but fetchers call the API directly). Server-side only (CORS). `BRL=X`, `EURBRL=X`, `DX-Y.NYB`, `CL=F`, `BZ=F`, `GC=F`, `TIO=F`, `ZS=F`, `HG=F`, `^GSPC`, `^BVSP`, `^VIX`, etc.
- **News RSS**: Bloomberg `feeds.bloomberg.com/markets/news.rss` works; Reuters only via Google News RSS proxy (direct Reuters RSS dead since 2020; FT/Valor blocked).
- **NTN-B**: no free public API (ANBIMA requires scraping) — manual entry only.

## Deploy & Cron (current state)

Currently deployed on **Vercel** (Next app + API routes) with **Neon Postgres** for the paper book and auth; `DEPLOY.md` has the full setup. Because serverless functions can't run a loop, a **Cloudflare Worker** (`deploy/cloudflare-worker/`) provides the periodic tick: every minute (`crons = ["* * * * *"]`) it calls `GET /api/market` and `POST /api/sim {action:'tick'}` with `Authorization: Bearer ${CRON_SECRET}`, and optionally fires a daily `POST /retrain` on `news-nlp` (gated by `RETRAIN_HOUR_UTC`, default 06:00 UTC). The two Python services (`services/model-engine`, `services/news-nlp`) deploy separately and are wired in through `ATLAS_BACKEND_URL`/`NEWS_NLP_URL`. (A planned migration to a self-hosted Docker Compose stack with an internal scheduler is tracked in `documents/core/Projeto.md` — not yet in place.)

## App Shell (ATLAS v2 — current UI)

`src/app/page.tsx` renders `src/components/atlas/AtlasShell.tsx`: a sidebar-navigation app with five **pages** (not panel grids) — Overview (auto-written briefing + hero sparkline cards + movers + policy stack + headlines), Markets (clickable instrument tiles by asset class + curves + correlations), Macro (regime meters + indicator tiles + Focus survey), Quant (KPIs, equity curve, signal matrix, paper book), News (filterable reading list). Shared primitives live in `src/components/atlas/ui.tsx` (Card, ChangeChip, Sparkline, SignedBar, RegimeMeter, StatTile). Keyboard: `1–5` pages, `Ctrl+K`/`/` palette, `R` refresh. The shell owns the data hooks and provides `TerminalActionsContext` so any tile can `openChart(id)` into `InstrumentChartOverlay`. Legacy widget components under `components/widgets/` are partially reused (ChartPanel, CorrelationPanel inside the Markets page); the old `TerminalLayout` workspace UI is no longer routed but still compiles — its sizing CSS vars now have `:root` defaults in `globals.css`.

## Design System ("ATLAS")

- All colors are CSS custom properties defined in `globals.css` `:root`: `--bg #0a0d13`, `--surface #10141d`, `--surface-2 #151a26`, `--surface-3 #1b2230`, `--border #1f2735`, `--border-strong #2c3750`, `--text-1/-2/-3`, `--value #dde3ef`, `--accent #5e8bff` (blue), `--up #34c98e`, `--down #f0647a`, `--warn #e8a13c`, `--radius 10px`. Themes (classic/contrast/soft) override these at the shell level in `TerminalLayout.tsx`.
- Typography: Inter for UI (`--font-ui`), JetBrains Mono **only for numerals** — the `.tabular-nums` class sets both `font-variant-numeric` and the mono font family, so wrap every numeric span in it.
- Panels: rounded cards (`borderRadius: var(--radius)`, soft shadow) on `var(--surface)`, headers on `var(--surface-2)`, title pattern `Title` + grey subtitle span (no bracket titles). Copy `RatesPanel.tsx` when building a new panel.
- **Canvas/SVG cannot resolve CSS vars** — lightweight-charts options and SVG presentation attributes need concrete palette hexes (see `InstrumentChartOverlay.tsx`, `ChartPanel.tsx`, `SimPanel.tsx` sparkline).
- Tailwind config legacy names (`accent-orange`, `up`, `down`, `dim`, `panel-border`...) are remapped in place to the new palette — old class names render new colors.

## UX Conventions

- Dense, minimal whitespace; Inter UI text with mono numerals via `.tabular-nums`.
- News: titles only, max 50, newest first, keyword-filtered (`NEWS_FILTER_KEYWORDS`), opens in new tab with `noopener,noreferrer`.
- Every panel shows a status dot + relative last-update time; data refresh cadence per `REFRESH_INTERVALS`.
