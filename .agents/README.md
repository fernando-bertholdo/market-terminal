# .agents/ — Orquestração de Agentes de Desenvolvimento

Diretório agnóstico de configuração para agentes de desenvolvimento IA. Compatível com qualquer ferramenta que suporte os padrões [AGENTS.md](https://agents.md), [Agent Skills](https://agentskills.io), ou diretórios `.agents/`.

Template de origem: tech-product-template@2.21.0

> **Marcador de linhagem.** A linha acima é o sinal canônico, legível por máquina: o
> template de origem e a versão dele que este repositório contém — é ela que diz à
> propagação qual é o gap. Gravada em 2026-09-14 (TECH-540) com a versão **medida por
> conteúdo**, não pelo número que o rodapé declarava: verificou-se a presença das marcas
> de 2.10 (`claude-design-flow`), 2.11 (§1.7), 2.12 (`paths:` nas rules) e 2.13 (registro
> de horizontes). O número de versão local do `CLAUDE.md` segue numeração própria e **não**
> é o mesmo eixo — três repositórios da linhagem chegaram a "2.13.0" com conteúdos
> diferentes, e foi isso que motivou o marcador.


## Estrutura

```
.agents/
├── README.md                       # ← Este arquivo
├── skills/                         # Agent Skills (agentskills.io): README.md e uma pasta por skill
├── workflows/                      # Roteiros em Markdown (kickoff, pre-commit, validate-milestone, fresh-context)
└── stacks/                         # Starter packs por stack
    └── python/
```

## Compatibilidade

O `.agents/` é uma **convenção de pasta na raiz, lida por vários harnesses**, e não a camada de
uma ferramenta: quem segue os padrões [AGENTS.md](https://agents.md) e
[Agent Skills](https://agentskills.io) procura aqui as skills, e o `AGENTS.md` na raiz. A tabela
diz só o que foi medido ou declarado neste template:

| Harness | O que lê | Fonte |
|---------|----------|-------|
| **Codex** (0.145) | `AGENTS.md` da raiz e `skills/` desta pasta; nenhuma rule em Markdown relatada (recorte da medição no `AGENTS.md`, §6) | TECH-699, 30/09/2026: o `AGENTS.md` e as rules por canário relatado pelo modelo (um modelo, por auto-relato); `skills/` pelo stderr da primeira tentativa (21:41:33Z), que listou as skills que falharam ao carregar |
| **Claude Code** | `.claude/` (`CLAUDE.md`, `rules/`, `skills/`), não esta pasta | a cópia das skills que ele usa é a de `.claude/skills/` |

Outro harness que siga as mesmas convenções pode ler o `AGENTS.md` e `skills/`, mas nenhum foi
medido neste template. `workflows/` e `stacks/` são lidos sob pedido: nenhuma medição deste
template mostrou harness que os carregue sozinho.

## Padrões Seguidos

- [AGENTS.md](https://agents.md) — Formato aberto para guiar agentes
- [Agent Skills](https://agentskills.io) — Formato aberto para skills
- [MCP](https://modelcontextprotocol.io) — Model Context Protocol (referência)

## Relação com `.claude/` e `.codex/`

`.claude/` guarda `CLAUDE.md`, settings e hooks, que são do Claude Code, as rules de código e os
prompts, que as skills das duas cópias citam ali, e a outra cópia das skills. `.codex/` guarda
`config.toml` e `rules/comandos.rules`, que o Codex lê, e `stacks/`, cópia idêntica de
`.agents/stacks/` sem gate (tabela de diretórios do `AGENTS.md`, §3). As skills existem aqui e em `.claude/skills/`, e o
`scripts/validate/check-pareamento-instrucoes.sh` cobra que as duas cópias fiquem iguais, salvo a
diferença declarada; as rules vivem só em `.claude/rules/`, e os prompts só em `.claude/prompts/`
(TECH-852).

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|------|--------|---------|---------|-----------|
| 2026-10-04 | `—` | — | `README.md`, `workflows/kickoff.md`, `workflows/pre-commit.md` | O marcador `Template de origem` sobe a `tech-product-template@2.21.0` e a árvore e o texto seguem a origem na 2.19.0: sem `rules/` nem `prompts/` (TECH-852), e o `.agents/` descrito como convenção lida por vários harnesses. A seção `## Changelog Local` passa a existir neste README só com esta linha: as linhas datadas que a origem tem nela descrevem a origem. As linhas do `rules/README.md` que saiu com a pasta ficam em `git show abbcdec:.agents/rules/README.md`, e os Sync-IDs que só ele registrava seguem como referência da origem: SYNC-20260330-003/004/005 (a UI Excellence na camada `.agents`), SYNC-20260523-001, SYNC-20260830-001 e SYNC-20260915-001 (as rules desta camada). Propagação do `tech-product-template` de 2.18.0 a 2.21.0 neste repositório (TECH-1020, SHA `6a60a5b` da origem, base da mescla `b51dbf9`) |

---

**Versão:** 1.0.0
**Template:** v1.1.0
