# .codex/ — Configuração do Codex

Este diretório concentra a camada específica do Codex para o projeto Market Terminal.

Template de origem: tech-product-template@2.18.0

> **Marcador de linhagem.** A linha acima é o sinal canônico, legível por máquina: o
> template de origem e a versão dele que este repositório contém — é ela que diz à
> propagação qual é o gap. Esta camada foi criada em 2026-09-30 (TECH-668) a partir do
> `tech-product-template` em 2.18.0 (`b51dbf9`), e o marcador nasce idêntico ao de
> `.claude/CLAUDE.md` e `.agents/README.md`, como o `scripts/validate/check-versao-linhagem.sh`
> exige. O número de versão local do `CLAUDE.md` segue numeração própria e **não** é o
> mesmo eixo.

## Estrutura

- `config.toml`: configuração do projeto e perfis de sessão (aponta para `AGENTS.md` na raiz)
- `skills/`: workflows especializados consumidos sob demanda
- `rules/`: regras path-targeted e políticas executáveis
- `prompts/`: prompts auxiliares do template
- `stacks/`: presets por stack

## Modelo Multi-Agente

- O runtime atual do Codex deve ser tratado como **lead + subagentes especializados**.
- Os papéis operacionais são `explorer`, `worker`, `awaiter` e `default`.
- A lógica de orquestração fica em `AGENTS.md (raiz — lido nativamente pelo Codex CLI)` e `skills/agent-team/SKILL.md`.
- Os perfis de `config.toml` são presets de sessão inteira; eles **não** criam teammates por si só.

## Perfis de Sessão

| Perfil | Uso principal | Sandbox | Notas |
|--------|---------------|---------|-------|
| `research` | pesquisa read-only | `read-only` | reasoning alto, verbosidade baixa |
| `review` | review read-only | `read-only` | findings concisos e priorizados |
| `implementation` | código e testes | `workspace-write` | modo padrão para execução |
| `docs` | documentação e planning | `workspace-write` | edições textuais controladas |

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|------|--------|---------|---------|-----------|
| 2026-09-30 | `—` | — | `README.md`, `config.toml`, `prompts/`, `rules/`, `skills/`, `stacks/` | Camada criada neste repositório a partir do tech-product-template 2.18.0 (`b51dbf9`), por decisão de 29/09/2026 (TECH-668): composição da origem, placeholders de kickoff preenchidos com os valores que o `.agents/` daqui já usa, `config.toml` com nome e descrição do projeto, e a nota do marcador reescrita para derivado. O histórico anterior da camada é o da origem e fica nas tabelas do template. Referência na origem: SYNC-20260915-001, SYNC-20260915-002, SYNC-20260920-001/002 e SYNC-20260920-003 |
