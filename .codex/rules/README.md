# Rules (Path-Targeted)

Regras técnicas carregadas automaticamente baseadas no contexto do arquivo.

## Regras Disponíveis

| Regra | Paths | Descrição |
|-------|-------|-----------|
| `code-quality-standards.md` | `src/**/*` | Padrões de código Python |
| `security-best-practices.md` | `src/**/*`, `.env*` | Segurança e secrets |
| `testing-requirements.md` | `tests/**/*` | Requisitos de testes |
| `api-integration-patterns.md` | `src/collectors/**/*` | Integração com APIs |
| `documentation-templates.md` | `*.md` | Templates de documentação |
| `ui-excellence-standards.md` | `*.tsx, *.jsx, *.vue, *.svelte, *.html, *.css, *.scss, src/components/**/*, src/pages/**/*, src/layouts/**/*, src/styles/**/*` | Padrões de excelência para UI (trigger para skill ui-excellence) |
| `scripts-governance.md` | `scripts/**/*` | Taxonomia fechada para diretório `scripts/`: 8 categorias canônicas, lifecycle, INDEX vivo, checklist |

## Como Funciona

As regras são carregadas automaticamente quando você edita arquivos nos paths especificados.
Isso garante que as práticas corretas sejam aplicadas ao contexto certo.

---

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|------|--------|---------|---------|-----------|
| 2026-09-30 | `—` | — | todas as rules + `README.md` | Camada `.codex/rules/` criada neste repositório a partir do tech-product-template 2.18.0 (`b51dbf9`), TECH-668, com a `security-best-practices.md` já dividida em segredo e dado de trabalho e os placeholders de kickoff preenchidos com os valores que o `.agents/` daqui já usa; o ponteiro da `security-best-practices.md` para a regra de dado de trabalho aponta para `.claude/CLAUDE.md` §5, porque o `.codex/README.md` que a origem cita não tem essa seção. O histórico anterior destas rules é o da origem e fica na tabela do template. Referência na origem: SYNC-20260915-001 |

