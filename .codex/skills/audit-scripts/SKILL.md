---
name: audit-scripts
description: Auditar diretório `scripts/` detectando drift, scripts órfãos, cruft, scripts stale, e violações da taxonomia. Use periodicamente (fim de fase, antes de release), após cleanup massivo, ou quando suspeitar de divergência entre INDEX.md e disco. Sugere ações (archive, mover categoria, deletar cruft) mas NUNCA muta sem aprovação humana.
---

# audit-scripts

Skill de auditoria do diretório `scripts/` — detecta drift estrutural, cruft, scripts stale e violações da taxonomia definida em `.claude/rules/scripts-governance.md`.

## Quando Usar

- **Periodicamente:** ao completar fase, antes de release importante, mensalmente em projetos ativos
- **Sob demanda:** quando suspeitar de scripts soltos, INDEX desatualizado, ou cruft acumulado
- **Após cleanup massivo:** validar consistência depois de mover muitos scripts
- **Em handoff entre sessões:** garantir que o estado do diretório bate com o documentado

## Quando NÃO Usar

- Ao criar 1 script novo (use checklist da rule `scripts-governance.md`)
- Como substituto da rule (rule é always-on; skill é periódico)
- Para deletar scripts sem revisão (skill SEMPRE pede aprovação)

## O Que a Skill Verifica

### Classe 1 — Drift estrutural

| Check | Severidade | Ação sugerida |
|---|---|---|
| Script em disco fora do INDEX (Active) | **Blocker** | Adicionar ao INDEX ou archivar |
| Entrada em INDEX (Active) sem arquivo correspondente | **Blocker** | Remover entrada ou restaurar arquivo |
| Script na raiz de `scripts/` (não em categoria) | **Blocker** | Mover para categoria apropriada |
| Subdir vazio (sem scripts nem README local) | **Warning** | Remover subdir vazio |
| Subdir fora das 8 canônicas + fora de sub-categoria conhecida | **Warning** | Avaliar: mover ou propor categoria via upstream |
| Script em `_archived/<subcategoria>/` mas `_archived/README.md` não menciona a subcategoria | **Info** | Atualizar README local com nova subcategoria |
| `_archived/<subcategoria>/` é nome em `CamelCase` ou `snake_case` | **Warning** | Renomear para `kebab-case` (convenção do README) |

> **Sobre `_archived/`:** subcategorias semânticas são permitidas e encorajadas
> (`backfills-and-imports/`, `audits-of-closed-detours/`, etc) — ver
> `scripts/_archived/README.md` para convenção. A skill NÃO trata subcategorias
> como "subdir fora das 8 canônicas".

> **Sobre `_runtime.py` e `audit_script_usage.py`:** se presentes, são
> **exceções permitidas** à Regra Estrutural §5 (módulos importáveis em
> `scripts/`). A skill NÃO os reporta como drift; reconhece como infraestrutura
> opt-in documentada em `scripts-governance.md` §7.

### Classe 2 — Cruft (sempre Blocker)

| Check | Ação sugerida |
|---|---|
| `__pycache__/` rastreado em `scripts/**` | `git rm -rf --cached` + validar `.gitignore` |
| `.DS_Store` rastreado em `scripts/**` | `git rm --cached` + validar `.gitignore` |
| `*.pyc` rastreado em `scripts/**` | `git rm --cached` + validar `.gitignore` |
| `.env`, `.env.local` rastreado em `scripts/**` | **CRÍTICO**: rotacionar credenciais + remover do histórico |

### Classe 3 — Stale (Info, não bloqueia)

| Check | Severidade | Ação sugerida |
|---|---|---|
| Script não modificado há >6 meses | **Info** | Avaliar archive (preserva contexto) |
| Script não modificado há >12 meses | **Warning** | Sugerir archive ativamente |
| Campo "Por quê" no INDEX é genérico ("script auxiliar", "TODO") | **Warning** | Refinar descrição |

**Detecção avançada (se opt-in tracking ativo):** se o projeto tem
`scripts/_runtime.py` + `data/script-runs.jsonl` (sistema descrito em
`scripts-governance.md` §7), a skill PREFERE dados reais de invocação sobre
heurística mtime. Cláusulas substituídas:

| Check (com tracking) | Severidade | Critério |
|---|---|---|
| Script sem invocação real há >90 dias | **Info** | `data/script-runs.jsonl` consultado |
| Script sem invocação real há >180 dias + sem cross-refs | **Warning** | Combina tracking com análise estática |
| Script nunca invocado desde criação | **Warning** | Forte sinal de "criado mas nunca usado" |

Adicionalmente, se `scripts/audit_script_usage.py` existir, sugerir invocá-lo
como **complemento** (relatório com veredito MANTER/ARQUIVAR/DELETAR baseado em
mineração de transcripts AI + cross-refs + sinais semânticos).

### Classe 4 — Sanidade semântica (best-effort)

| Check | Severidade | Ação sugerida |
|---|---|---|
| Nome de arquivo sugere categoria diferente (ex: `analyze_*.py` em `validate/`) | **Warning** | Confirmar categoria ou renomear |
| Scripts com nomes muito similares (heurística: prefixo comum + propósito vago) | **Info** | Avaliar consolidação |
| Script sem `--help` detectável (grep simples) | **Warning** | Adicionar `--help` |
| Script bash sem `set -euo pipefail` | **Warning** | Adicionar |
| Módulo Python importável (`__init__.py`) em categoria que não é sub-categoria de subprojeto | **Warning** | Mover para `src/_helpers/` ou `tests/fixtures/` |

## Workflow

1. **Carregar contexto**
   - Ler `scripts/INDEX.md` (parsing das tabelas Active e Archived)
   - Listar arquivos reais em `scripts/**` via `git ls-files scripts/` (evita untracked)
   - Carregar `.gitignore` relevante

2. **Executar checks** (4 classes em paralelo)
   - Compor relatório estruturado por Classe + Severidade

3. **Apresentar relatório**
   - Resumo: contagem por severidade (Blockers / Warnings / Infos)
   - Detalhes por classe (apenas classes com hits)
   - Para cada hit: ação sugerida ESPECÍFICA (path exato, comando concreto)

4. **Gate: aprovação humana**
   - "Encontrei X blockers e Y warnings. Quer revisar 1-by-1, batch por classe, ou pular?"
   - NUNCA mutar arquivos sem confirmação explícita

5. **Aplicar mutações aprovadas**
   - Usar Edit/Bash/git mv conforme apropriado
   - Atualizar INDEX.md a cada mutação (não em batch)
   - Gerar commits granulares: 1 commit por classe de problema corrigida

6. **Relatório final**
   - O que foi corrigido, o que ficou pendente
   - Sugerir próximos passos (ex: "rodar pre-commit-check antes de push")

## Integração com Outras Skills

- **`organize-commits`** — depois de aplicar correções, sugerir invocação para granularizar commits se múltiplas classes foram tocadas
- **`pre-commit-check`** — sugerir invocação ao final, antes de push
- **`audit-architecture`** — complementar (uma audita docs/arquitetura, outra audita scripts/)
- **`validate-docs-links`** — se INDEX.md tem links para outros docs, validar integridade

## Output Esperado (formato do relatório)

```
═══════════════════════════════════════════════════
audit-scripts — Relatório
═══════════════════════════════════════════════════

Resumo:
  🔴 Blockers: 3
  🟡 Warnings: 7
  ℹ️  Infos:    12

───────────────────────────────────────────────────
Classe 1 — Drift estrutural (3 blockers, 1 warning)
───────────────────────────────────────────────────

🔴 Script em disco fora do INDEX:
  - scripts/analyze_despesas_estimadas.py
    → Sugerido: adicionar a INDEX (categoria: analysis)
       Por quê?: <skill propõe descrição inicial baseada em docstring/header>

🔴 Entrada INDEX sem arquivo:
  - scripts/diagnose/old_probe.py
    → Sugerido: remover linha do INDEX

[... resto por classe ...]

───────────────────────────────────────────────────
Próxima ação?
  [r] Revisar 1-by-1
  [b] Batch por classe (aprovação por classe)
  [s] Skip (apenas relatório, sem mutações)
  [q] Sair
```

## Limitações Conhecidas

- **Heurísticas de sanidade semântica são best-effort** — não detectam todos os casos de categoria errada; só os óbvios (prefixo de nome conflitante)
- **Detecção de duplicação** é por nome/prefixo, não por análise de código — pode ter falsos positivos/negativos
- **Não roda scripts** — só audita estado; testes de funcionalidade ficam para `validate-testing`

## Quando Atualizar Esta Skill

- Nova categoria canônica adicionada (atualizar mapas de validação)
- Novo anti-pattern recorrente detectado em projetos reais
- Heurística semântica melhorou (ex: parser que analisa imports/docstrings ao invés de só nome)
- Novo opt-in detection adicionado (ex: integração com outros sistemas de tracking)

---

## Changelog

### v1.1.0 (template — Camada 1)
- Classe 1: reconhece subcategorias em `_archived/` (não reporta como drift)
- Classe 1: reconhece `_runtime.py`/`audit_script_usage.py` como exceções permitidas
- Classe 3: detecção avançada se opt-in tracking está ativo (prefere dados reais sobre mtime)
- Integração com `audit_script_usage.py` quando presente

### v1.0.0 (template)
- Versão inicial: 4 classes de checks + gate humano + 6 etapas de workflow

---

**Versão:** 1.1.0
**Última atualização:** {{DATE}}
