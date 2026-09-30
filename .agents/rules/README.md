# Rules (Path-Targeted)

Regras técnicas carregadas automaticamente baseadas no contexto do arquivo sendo editado.

## Regras Disponíveis

| Regra | Paths | Descrição |
|-------|-------|-----------|
| `code-quality-standards.md` | `src/**/*` | Padrões de código (Python baseline, adaptável) |
| `security-best-practices.md` | `src/**/*`, `.env*` | Segurança e secrets |
| `testing-requirements.md` | `tests/**/*` | Requisitos de testes |
| `api-integration-patterns.md` | `src/collectors/**/*` | Integração com APIs |
| `documentation-templates.md` | `*.md` | Templates de documentação |
| `ui-excellence-standards.md` | `*.tsx, *.jsx, *.vue, *.svelte, *.html, *.css, *.scss, src/components/**/*, src/pages/**/*, src/layouts/**/*, src/styles/**/*` | Padrões de excelência para UI (trigger para skill ui-excellence) |
| `scripts-governance.md` | `scripts/**/*` | Taxonomia fechada para diretório `scripts/`: 8 categorias canônicas, lifecycle, INDEX vivo, checklist |

## Como Funciona

As regras são carregadas automaticamente quando o agente edita arquivos nos paths especificados.
Isso garante que as práticas corretas sejam aplicadas ao contexto certo.

## Compatibilidade

- **Antigravity**: Regras em `.agents/rules/` são carregadas automaticamente
- **Claude Code**: Carrega regras em `.claude/rules/` (path-targeted via settings.json)
- **Codex/Cursor**: Carrega regras em `.codex/rules/` (path-targeted via config.toml)

---

**Versão:** 1.0.0

---

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|------|--------|---------|---------|-----------|
| 2026-09-30 | `—` | — | `security-best-practices.md`, `README.md` (este arquivo) | Sync downstream do tech-product-template 2.18.0 (`b51dbf9`) neste repositório, TECH-668: a Regra de Ouro deixa de dizer "dados sensíveis" e passa a dizer **segredo**, e o dado de trabalho ganha regra própria (vai a log e commit exato); o ponteiro para essa regra aponta para `.claude/CLAUDE.md` §5, porque o `AGENTS.md` da raiz deste repositório é documento do projeto e não tem a §7 que a origem cita. A tabela foi reordenada com a mais recente primeiro, só movendo linhas. Referência na origem: SYNC-20260915-001 |
| 2026-09-02 | `PENDING` | `SYNC-20260830-001` | `security-best-practices.md`, `code-quality-standards.md` | Propagação do tech-product-template: corrige o título truncado "Security Best Practice" e o link `../AGENTS.md` (alvo inexistente `.agents/AGENTS.md`) para `../../AGENTS.md`; ambos eram resíduo da replicação `badaa31` |
| 2026-05-23 | `bd3bb0f` | `SYNC-20260523-001` | `scripts-governance.md`, `README.md` | Adiciona rule path-targeted para governança de scripts/ (replicação flat de .claude/); propagado para lass (`0ac7015`) e monitor-fundos (`5f455c4`) |
| 2026-03-30 | `5b9eae4` | SYNC-20260330-003/004/005 | `ui-excellence-standards.md`, `README.md` | Adiciona regra path-targeted para UI; propagado para lass (6a1e474) e monitor-fundos (94ff40d) |
| 2026-03-05 | `badaa31` | — | (criação inicial - 5 regras) | Espelhado de lass-project-template |

