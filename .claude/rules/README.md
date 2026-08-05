---
paths:
  - ".claude/rules/**/*"
---

# Regras do Projeto (Claude)

Este diretorio contem regras path-targeted e politicas de execucao para sessoes Claude Code:
- `code-quality-standards.md`
- `testing-requirements.md`
- `security-best-practices.md`
- `api-integration-patterns.md`
- `artifact-governance.md`
- `documentation-templates.md`
- `scripts-governance.md`

As regras complementam `CLAUDE.md` e devem permanecer semanticamente alinhadas ao diretorio `.codex/rules/`.
`artifact-governance.md` usa modelo 3-camadas: arvore de decisao com 3 perguntas (Layer 1 portavel) + mapeamento local (Layer 2 projeto-especifico).
`scripts-governance.md` define taxonomia fechada para diretório `scripts/`: 8 categorias canônicas, lifecycle, INDEX vivo e checklist.

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descricao |
|------|--------|---------|---------|-----------|
| 2026-08-05 | `PENDING` | `SYNC-20260803-001` | todas as rules + `README.md` | Frontmatter `paths:` em todas as rules — path-targeting real (antes carregavam sempre); sync downstream do tech-product-template `47ef5a3` |
| 2026-05-23 | `bd3bb0f` | `SYNC-20260523-001` | `scripts-governance.md`, `README.md` | Adiciona rule path-targeted para governança de scripts/ (taxonomia fechada, lifecycle, anti-patterns); propagado para lass (`0ac7015`) e monitor-fundos (`5f455c4`) |
| 2026-03-10 | `PENDING` | `SYNC-20260310-001` | `artifact-governance.md`, `README.md` | Adiciona regra de governanca de artefatos (modelo 3-camadas portavel) |
| 2026-03-30 | `1accbb6` | SYNC-20260330-001/002 | `ui-excellence-standards.md`, `README.md` | Adiciona regra path-targeted para UI; propagado para lass (f069711) e monitor-fundos (ae63986) |
| 2026-04-10 | `PENDING` | — | `ui-excellence-standards.md` (DELETADO), `README.md` | Rule aposentada: path-targeting migrou para frontmatter `paths:` do coordinator no plugin ui-excellence (marketplace `4-successful-ai-life`) |
