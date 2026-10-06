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
- `afirmacao-de-ausencia.md`

As regras complementam `CLAUDE.md` e vivem só neste diretório desde a TECH-852: não há cópia a manter alinhada em `.agents/` nem em `.codex/`, cujo `rules/` guarda só a `comandos.rules`, a regra de comando da §6 do `.claude/CLAUDE.md` (Commit Strategy). Quem usa outro harness acha a rule de cada glob pela §6 do `AGENTS.md` (Code Style).
`artifact-governance.md` usa modelo 3-camadas: arvore de decisao com 3 perguntas (Layer 1 portavel) + mapeamento local (Layer 2 projeto-especifico).
`scripts-governance.md` define taxonomia fechada para diretório `scripts/`: 8 categorias canônicas, lifecycle, INDEX vivo e checklist.
`afirmacao-de-ausencia.md` define a linha `Cobertura:` que acompanha toda afirmação de ausência sobre fonte estruturada, com globs em `documents/` e `.planning/`; a varredura 3 da §7 do `pre-commit-check` a cobra como aviso.

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descricao |
|------|--------|---------|---------|-----------|
| 2026-10-06 | `—` | — | `documentation-templates.md` | Propagação do `tech-product-template` 2.21.0 neste repositório (TECH-1107, SHA `cb209ce` da origem): a comparação da árvore inteira (Passo 3.2) achou a rule igual à versão `77ecc43` da origem, sem o frontmatter `paths:`. Passa à versão do SHA, mesmo blob, com `paths: src/**/*`, o glob que a §6 do `AGENTS.md` deste repositório já declara para ela. A propagação de 04/10 reportou esse frontmatter sem levá-lo; a base do script de delta (`da099ecf7ead`) é posterior a ele |
| 2026-10-06 | `—` | — | `afirmacao-de-ausencia.md`, este README | Propagação do `tech-product-template` 2.21.0 neste repositório (TECH-1107, SHA `cb209ce` da origem, base da mescla `6a60a5b`, a propagação de 04/10): a rule `afirmacao-de-ausencia.md` entra como cópia da origem, com globs em `documents/**` e `.planning/**`, e passa a constar da lista e do parágrafo descritivo deste README. Quem afirma que uma fonte estruturada não tem algo declara quanto dela leu, na linha `Cobertura: <lido> de <total> <unidade>`; sem ela a marca é `[NÃO DEFINIDO]`. O marcador não sobe: a origem registra a série sem bump de versão |
| 2026-10-04 | `—` | — | `api-integration-patterns.md`, `code-quality-standards.md`, `scripts-governance.md`, `security-best-practices.md`, `testing-requirements.md`, este README | Propagação do `tech-product-template` de 2.18.0 a 2.21.0 neste repositório (TECH-1020, SHA `6a60a5b` da origem, base da mescla `b51dbf9`): a `scripts-governance.md` ganha a seção "Afirmação sobre outro artefato" e a descrição do timestamp do `_runtime.py` em UTC; o cabeçalho das rules de código perde os placeholders de responsável e de data que o kickoff tinha preenchido, como a origem os escreve: a linha `Responsável` sai de `code-quality-standards.md`, `scripts-governance.md`, `security-best-practices.md` e `testing-requirements.md`, e `Última atualização` volta a `Template` em `api-integration-patterns.md` e `scripts-governance.md`; a `security-best-practices.md` perde o exemplo `processar_item` ("sem logar PII"), que contradizia a régua de exatidão da 2.15.0, e mantém os comandos do stack que o kickoff preencheu (`npm update`, `npm run type-check`); o README diz que as rules vivem só neste diretório desde a TECH-852, sem cópia em `.agents/` nem em `.codex/`. Referência na origem: SYNC-20260830-001 (triagem das rules pareadas; o frontmatter `paths:` já vive aqui desde a SYNC-20260803-001) |
| 2026-09-30 | `—` | — | `security-best-practices.md`, `README.md` (este arquivo) | Sync downstream do tech-product-template 2.18.0 (`b51dbf9`) neste repositório, TECH-668: a Regra de Ouro deixa de dizer "dados sensíveis" e passa a dizer **segredo**, e o dado de trabalho ganha regra própria (vai a log e commit exato). A tabela foi reordenada com a mais recente primeiro, só movendo linhas. Referência na origem: SYNC-20260915-001 |
| 2026-09-02 | `PENDING` | — | `.gitignore` (fora das camadas) | Divergência deliberada contra o bloco de runtime de agente do tech-product-template: a linha `/CLAUDE.md` NÃO foi propagada, porque aqui o arquivo é rastreado e gitignore não alcança arquivo no índice — a linha só criaria ilusão de proteção. Mesmo motivo do `/AGENTS.md`, que já é exceção declarada no bloco de origem. Não reintroduzir em propagação futura |
| 2026-09-02 | `PENDING` | `SYNC-20260805-003` | `artifact-governance.md` | Propagação do tech-product-template: adiciona `documents/design/**/*` ao frontmatter `paths:` e à lista do corpo — a rule já governava o diretório na tabela de mapeamento mas não era carregada ao editá-lo |
| 2026-08-05 | `PENDING` | `SYNC-20260803-001` | todas as rules + `README.md` | Frontmatter `paths:` em todas as rules — path-targeting real (antes carregavam sempre); sync downstream do tech-product-template `47ef5a3` |
| 2026-05-23 | `bd3bb0f` | `SYNC-20260523-001` | `scripts-governance.md`, `README.md` | Adiciona rule path-targeted para governança de scripts/ (taxonomia fechada, lifecycle, anti-patterns); propagado para lass (`0ac7015`) e monitor-fundos (`5f455c4`) |
| 2026-04-10 | `PENDING` | — | `ui-excellence-standards.md` (DELETADO), `README.md` | Rule aposentada: path-targeting migrou para frontmatter `paths:` do coordinator no plugin ui-excellence (marketplace `4-successful-ai-life`) |
| 2026-03-30 | `1accbb6` | SYNC-20260330-001/002 | `ui-excellence-standards.md`, `README.md` | Adiciona regra path-targeted para UI; propagado para lass (f069711) e monitor-fundos (ae63986) |
| 2026-03-10 | `PENDING` | `SYNC-20260310-001` | `artifact-governance.md`, `README.md` | Adiciona regra de governanca de artefatos (modelo 3-camadas portavel) |
