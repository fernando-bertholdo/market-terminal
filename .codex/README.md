# .codex/ — Configuração do Codex

Este diretório guarda a configuração do Codex no projeto Market Terminal: o `config.toml`, a
`rules/comandos.rules` e as `stacks/`, cópia de `.agents/stacks/` sem gate. As skills que o Codex
usa ficam em `.agents/skills/`, e as rules de código, em `.claude/rules/` (ver `AGENTS.md`, §6).

Template de origem: tech-product-template@2.21.0

> **Marcador de linhagem.** A linha acima é o sinal canônico, legível por máquina: o
> template de origem e a versão dele que este repositório contém — é ela que diz à
> propagação qual é o gap. Esta camada foi criada em 2026-09-30 (TECH-668) a partir do
> `tech-product-template` em 2.18.0 (`b51dbf9`), e o marcador nasce idêntico ao de
> `.claude/CLAUDE.md` e `.agents/README.md`, como o `scripts/validate/check-versao-linhagem.sh`
> exige. O número de versão local do `CLAUDE.md` segue numeração própria e **não** é o
> mesmo eixo.

## Estrutura

- `config.toml`: configuração do projeto, sem perfis de sessão. O Codex só lê o arquivo em projeto marcado como confiável (ver "O que o Codex lê deste repositório")
- `rules/comandos.rules`: a regra de comando do §6 do `.claude/CLAUDE.md` (§8 do `AGENTS.md`) no execpolicy do Codex, escrita à mão e cobrada por `scripts/validate/check-regra-comandos.sh` (ver "Limite da regra de comando")
- `stacks/`: presets por stack, idênticos aos de `.agents/stacks/` em 02/10/2026 (`diff -r .codex/stacks .agents/stacks`), sem gate que os compare (`AGENTS.md`, §3)

Não há mais `skills/`, rules em Markdown nem `prompts/` aqui: saíram na TECH-852 (as skills e as
rules no PR-1, os prompts na TECH-894), e o Codex lê as skills em `.agents/skills/`.

## Modelo Multi-Agente

- O runtime atual do Codex deve ser tratado como **lead + subagentes especializados**.
- Os papéis operacionais são `explorer`, `worker`, `awaiter` e `default`.
- A lógica de orquestração fica em `.agents/skills/agent-team/SKILL.md`.
- Perfis de sessão (`[profiles.*]`), onde valerem, configuram a sessão inteira e **não** criam teammates por si só; o `config.toml` deste repositório não declara nenhum.

## O que o Codex lê deste repositório

Medido com `codex-cli 0.147.0`, na data que acompanha o item:

- **O `config.toml` versionado só é lido em projeto confiável, e não inteiro** (01/10/2026,
  TECH-793). Sem a marca de confiança no `~/.codex/config.toml` (`[projects."<caminho>"]` com
  `trust_level = "trusted"`), um `.codex/config.toml` no repositório não muda o prompt
  (`codex debug prompt-input`) e não habilita servidor MCP (`codex mcp list`). Com a marca, o
  Codex honra do arquivo `developer_instructions`, `project_doc_max_bytes` e `[mcp_servers.*]`:
  **um servidor MCP ativo no arquivo versionado fica habilitado para quem confiar no projeto**, e
  por isso o template não versiona nenhum. Quem quiser um o declara no próprio
  `~/.codex/config.toml`, com versão fixa (`<pacote>@<versão>`, nunca `@latest`). Os
  `[profiles.*]` o Codex ignora mesmo com a marca, e avisa (`codex doctor --all`: "Ignored
  unsupported project-local config keys … profiles"). As demais seções do arquivo não foram
  medidas. A medição da TECH-803, de 30/09/2026, se reproduz sem a marca.
- **O `AGENTS.md` da raiz é lido até 32768 bytes (32 KiB)**, o padrão de `project_doc_max_bytes`
  (30/09/2026, TECH-803).
  O que passar do teto não chega ao modelo, e quem anexar regras ao arquivo decide pela ordem
  qual parte fica de fora. O gate `scripts/validate/check-agents-md-teto.sh` reprova o arquivo
  acima do teto.

## Perfis de Sessão

O `.codex/config.toml` do template não declara `[profiles.*]` (C-1 da TECH-852): no arquivo do
repositório o Codex os ignora, mesmo em projeto confiável, com um aviso de inicialização
(`codex doctor --all`; seção acima). Se eles valem no `~/.codex/config.toml` de quem usa o
Codex não foi medido.

## Limite da regra de comando

A regra "NUNCA `git add .` nem `git add -A`" é bloqueada por mecanismo nos dois harnesses: no
Claude Code pelo `deny` do `.claude/settings.json`, no Codex pela `rules/comandos.rules`, que ele
só carrega em projeto confiável. É **guarda contra acidente, não contra contorno**: quem escreve
uma forma equivalente passa por ela. O Codex casa os tokens do comando por prefixo; o Claude Code
também nega atribuição de ambiente e comando composto, e ainda assim deixa passar formas
equivalentes. O `deny` do Claude Code não pode dizer isso no próprio arquivo, porque JSON não tem
comentário, e o limite dos dois lados fica escrito aqui.

A tabela traz o que foi medido, e não tudo o que escapa: outras formas equivalentes podem passar.
Claude Code: `claude -p` 2.1.285, no veredito do PR #59 (TECH-893, 02/10/2026 01:19:43Z). Codex:
`codex execpolicy check --rules .codex/rules/comandos.rules <comando>`, codex-cli 0.147.0, no mesmo
veredito e de novo em 02/10/2026 02:29Z; ele avalia o comando dado, e se o runtime desmonta o
`bash -c` antes de aplicar a política não foi medido.

| Forma | Claude Code | Codex |
|-------|-------------|-------|
| `git add -A`, `git add .`, `git add --all` | negada | negada |
| `FOO=1 git add -A`, `git status && git add -A` | negada | não medida |
| `git add -f -A`, `git add -fA`, `git add -v .`, `git add -- .` | passa | passa |
| `git -C . add -A`, `bash -c 'git add -A'` | passa | passa |
| `git add src/ -A`, `git add -Av`, `git add ./`, `git add :/`, `git add -f .` | não medida | passa |
| `env git add -A`, `/usr/bin/git add -A` | não medida | passa |

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|------|--------|---------|---------|-----------|
| 2026-10-04 | `—` | — | `README.md`, `config.toml`, `rules/comandos.rules` | O marcador `Template de origem` sobe a `tech-product-template@2.21.0`. Saem `skills/`, `rules/*.md` e `prompts/`, as camadas sem leitor que a origem aposentou na 2.19.0 (TECH-852): o histórico fica no git (as tabelas de Changelog Local de `skills/README.md` e de `rules/README.md` estão em `git show abbcdec:.codex/skills/README.md` e `git show abbcdec:.codex/rules/README.md`, e os Sync-IDs que só elas registravam seguem como referência: SYNC-20260805-004, SYNC-20260915-001, SYNC-20260920-001/002 e SYNC-20260920-003). As 13 `ui-*` que o Codex descobria em `skills/` saem da descoberta dele neste repositório e não são repostas aqui: a origem as tem em `.agents/skills/ui-*`, este repositório nunca as teve ali, e repô-las é decisão do Fernando, pela TECH-797. Entra `rules/comandos.rules`, a regra de comando da §6 do `.claude/CLAUDE.md`; o `config.toml` perde os `[profiles.*]` e o `[mcp_servers.chrome-devtools]`, ganha o comentário do que o Codex lê dele e aponta `[paths] skills` para `.agents/skills`. O README passa a dizer o que a pasta guarda e o que o Codex lê do repositório. Referência na origem, Sync-IDs que ela registrou sobre a camada: SYNC-20260306-002 (regras e perfis do Codex para o runtime de multiagentes) e SYNC-20260310-002 (o `AGENTS.md` local sai e o Codex lê o da raiz). Propagação do `tech-product-template` de 2.18.0 a 2.21.0 neste repositório (TECH-1020, SHA `6a60a5b` da origem, base da mescla `b51dbf9`) |
| 2026-09-30 | `—` | — | `README.md`, `config.toml`, `prompts/`, `rules/`, `skills/`, `stacks/` | Camada criada neste repositório a partir do tech-product-template 2.18.0 (`b51dbf9`), por decisão de 29/09/2026 (TECH-668): composição da origem, placeholders de kickoff preenchidos com os valores que o `.agents/` daqui já usa, `config.toml` com nome e descrição do projeto, e a nota do marcador reescrita para derivado. O histórico anterior da camada é o da origem e fica nas tabelas do template. Referência na origem: SYNC-20260915-001, SYNC-20260915-002, SYNC-20260920-001/002 e SYNC-20260920-003 |
