# .agents/ — Orquestração de Agentes de Desenvolvimento

Diretório agnóstico de configuração para agentes de desenvolvimento IA. Compatível com qualquer ferramenta que suporte os padrões [AGENTS.md](https://agents.md), [Agent Skills](https://agentskills.io), ou diretórios `.agents/`.

Template de origem: tech-product-template@2.13.0

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
├── rules/                          # Regras path-targeted
│   ├── README.md
│   ├── code-quality-standards.md
│   ├── security-best-practices.md
│   ├── testing-requirements.md
│   ├── api-integration-patterns.md
│   └── documentation-templates.md
├── skills/                         # Agent Skills (agentskills.io)
│   ├── README.md
│   ├── archive-initiative/SKILL.md
│   ├── audit-architecture/SKILL.md
│   ├── audit-roadmap-refs/SKILL.md
│   ├── audit-rules/SKILL.md
│   ├── fresh-context/SKILL.md
│   ├── generate-session-prompt/SKILL.md
│   ├── generate-tap/SKILL.md
│   ├── organize-commits/SKILL.md
│   ├── pre-commit-check/SKILL.md
│   ├── reconcile-initiative/SKILL.md
│   ├── update-docs/SKILL.md
│   ├── validate-docs-links/SKILL.md
│   ├── validate-dod/SKILL.md
│   ├── validate-dor/SKILL.md
│   ├── validate-kickoff/SKILL.md
│   ├── validate-testing/SKILL.md
│   └── agent-team/SKILL.md
├── workflows/                      # Workflows invocáveis (via /nome)
│   ├── kickoff.md
│   ├── pre-commit.md
│   ├── validate-milestone.md
│   └── fresh-context.md
├── prompts/                        # Prompts reutilizáveis
│   ├── kickoff-prompt.md
│   └── tap-template.md
└── stacks/                         # Starter packs por stack
    └── python/
```

## Compatibilidade

| Ferramenta | Mapeamento |
|------------|-----------|
| **Antigravity** | `.agents/rules/`, `.agents/workflows/`, `.agents/skills/` |
| **Claude Code** | `.agents/` (mirror separado) |
| **Codex / Cursor** | `.agents/` (mirror separado) |
| **Aider** | Lê `AGENTS.md` na raiz |
| **Jules, Gemini CLI** | Lê `AGENTS.md` na raiz |
| **VS Code Copilot** | Lê `AGENTS.md` na raiz |

## Padrões Seguidos

- [AGENTS.md](https://agents.md) — Formato aberto para guiar agentes (60k+ projetos)
- [Agent Skills](https://agentskills.io) — Formato aberto para skills (Anthropic + comunidade)
- [MCP](https://modelcontextprotocol.io) — Model Context Protocol (referência)

## Relação com `.agents/` e `.agents/`

Os diretórios `.agents/` e `.agents/` contêm configurações específicas para suas respectivas ferramentas (settings, hooks, permissions). O `.agents/` é a versão **agnóstica** e **canônica** das regras, skills e workflows — os diretórios específicos podem referenciar ou espelhar este conteúdo.

---

**Versão:** 1.0.0
**Template:** v1.1.0
