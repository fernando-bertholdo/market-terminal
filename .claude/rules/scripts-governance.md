---
paths:
  - "scripts/**/*"
---

# Scripts Governance

## Metadata

- **Versão:** 1.0.0
- **Status:** ✅ Template (Path-targeted)
- **Última atualização:** 2026-06-28
- **Responsável:** Fernando Bertholdo
- **Paths:** scripts/**/*

---

## Regra de Ouro

**"Todo script vive numa das 8 categorias canônicas e está registrado em `scripts/INDEX.md` no mesmo commit que o cria."**

---

## Quando Aplicar

**SEMPRE** — Auto-loaded quando agente lê/edita qualquer arquivo em `scripts/**`.

Em especial:
- Antes de criar script novo
- Antes de mover/renomear script
- Antes de arquivar/deletar script
- Antes de criar subdiretório novo em `scripts/`

---

## Referências

- [`scripts/README.md`](../../scripts/README.md) — Taxonomia completa + glossário operacional (consultar para decisão de categoria)
- [`scripts/INDEX.md`](../../scripts/INDEX.md) — Índice vivo (atualizar a cada criação/move/archive)
- [`.claude/skills/audit-scripts/SKILL.md`](../skills/audit-scripts/SKILL.md) — Auditoria periódica (drift, órfãos, cruft)
- [`artifact-governance.md`](artifact-governance.md) — Por que `scripts/` é exceção formal

---

## 1. Taxonomia (8 categorias canônicas)

| Categoria | Resumo (consultar README para glossário) |
|---|---|
| `setup/` | Configuração inicial (1x) |
| `dev/` | Helpers de desenvolvimento (N vezes localmente) |
| `validate/` | Validações idempotentes (CI-friendly, 0/1) |
| `diagnose/` | Probes investigativos não-destrutivos |
| `backfill/` | Operações one-shot que modificam dados/estado |
| `analysis/` | Output para análise humana |
| `release/` | Build, version, sign, publish, tag |
| `ops/` | Executado por scheduler/produção |

**Fronteiras ambíguas:** Consultar glossário em `scripts/README.md` (`diagnose vs validate`, `backfill vs ops`, `setup vs dev`, `release vs ops`).

---

## 2. Regras Estruturais (invariantes)

1. **Sem scripts soltos na raiz de `scripts/`** — todo script vive numa categoria.
2. **Subdir só existe se contém ≥1 script** — não pré-criar vazio.
3. **Sub-categorias permitidas** dentro das canônicas (ex: `diagnose/btg_discovery/`) para subprojetos coesos.
4. **`__pycache__/`, `.DS_Store`, `*.pyc` SEMPRE em `.gitignore`** — sem exceção.
5. **Módulos Python importáveis NÃO ficam em `scripts/`** — vão para `tests/fixtures/`, `src/_helpers/`, ou similar.
6. **Scripts NÃO escrevem artefatos persistentes em `scripts/`** — outputs vão para `data/`, `output/`, ou tmp dirs (ver `artifact-governance.md`).
7. **Paths no `INDEX.md` são relativos a `scripts/`** — usar `setup/init-from-template.sh`, NÃO `scripts/setup/init-from-template.sh`. Evita repetição visual e facilita scan; o hook `check-scripts-cruft.sh` e a skill `audit-scripts` adicionam o prefixo automaticamente ao comparar com disco.

---

## 3. Lifecycle (criar / arquivar / auditar)

### Criar script novo

```
1. Decidir categoria (consultar glossário em README se em dúvida)
2. Criar arquivo em scripts/<categoria>/<nome>.{sh,py}
3. Atualizar scripts/INDEX.md (seção Active) — MESMA OPERAÇÃO
4. Commitar tudo junto (Conventional Commits)
```

### Mover/renomear script

```
1. Atualizar path em scripts/INDEX.md
2. Se mudou categoria, atualizar coluna Categoria
3. Commit único (move + INDEX update)
```

### Arquivar script

```
1. Identificar (ou criar) subcategoria semântica em scripts/_archived/<subcategoria>/
   (ex: backfills-and-imports/, demos-and-previews-dated/, audits-of-closed-detours/)
2. mv scripts/<cat>/<nome>.ext scripts/_archived/<subcategoria>/<nome>.ext
   (ou simplesmente scripts/_archived/<nome>.ext se for caso isolado, sem subcategoria)
3. Mover linha em INDEX.md (Active → Archived) + preencher "Por quê arquivado"
4. NUNCA deletar direto — archive preserva contexto histórico
5. Deleção definitiva: apenas via `audit-scripts` com aprovação humana explícita
```

**Subcategorias em `_archived/`:** organize scripts arquivados por **motivo/temática**
(não data). Subcategorias emergem do uso real — ver
`scripts/_archived/README.md` para convenção e exemplos de subcategorias comuns
(`backfills-and-imports/`, `demos-and-previews-dated/`, `audits-of-closed-detours/`,
`legacy-tests-and-extracts/`, `one-shot-cleanup/`, etc).

### Auditar (periódico)

```
→ Invocar skill audit-scripts
   - Detecta scripts em disco fora do INDEX (drift)
   - Detecta entradas no INDEX sem arquivo correspondente (órfãos)
   - Detecta cruft (__pycache__, .DS_Store, .pyc)
   - Sugere archives de scripts não modificados há >6 meses
```

---

## 4. Padrões Técnicos (todo script)

### Universais

- **`--help` funcional** — descreve propósito, args, exit codes
- **Exit code coerente** — 0 sucesso, 1 erro genérico, ≥2 categorias específicas
- **Idempotente onde aplicável** — backfill/validate especialmente
- **`--dry-run` em scripts destrutivos** — backfill obrigatório

### Bash

```bash
#!/usr/bin/env bash
set -euo pipefail
```

### Python

```python
"""<Propósito do script em 1-2 linhas.>

Usage:
    python scripts/<cat>/<nome>.py [args]
"""
```

---

## 5. Checklist (ao criar/modificar script)

- [ ] Script tem propósito único e claro (não duplica outro do INDEX)
- [ ] Categoria escolhida com base no glossário (não chute)
- [ ] Adicionado ao `scripts/INDEX.md` (Active) na MESMA operação
- [ ] Campo "Por quê" do INDEX é específico (não genérico tipo "script auxiliar")
- [ ] Tem `--help` funcional
- [ ] Idempotente se aplicável; `--dry-run` se destrutivo
- [ ] Não cria artefatos persistentes em `scripts/`
- [ ] `__pycache__/`, `.DS_Store` não estão sendo commitados
- [ ] Commit segue Conventional Commits (`feat(scripts): adiciona X em <categoria>`)

---

## 6. Anti-patterns (reprovar em review)

| Anti-pattern | Por quê é problema | Correção |
|---|---|---|
| Script solto na raiz "porque não encaixava" | Quebra Regra de Ouro; sinal de propósito difuso | Releia propósito; escolha categoria |
| Subdir vazio pré-criado | Polui visualmente sem motivo | Remover; criar só quando primeiro script aparecer |
| `__pycache__/` commitado | Cruft do Python; rastreia binários | `git rm -rf --cached` + adicionar ao `.gitignore` |
| INDEX desatualizado | Index morto perde valor; vira documentação falsa | Atualizar na MESMA operação que criou script |
| Script duplicando funcionalidade existente | Fragmentação; futura confusão sobre qual usar | Releia INDEX antes de criar; estender existente se possível |
| `rm scripts/<nome>` direto | Perde contexto histórico | Sempre archive primeiro |
| Categoria nova criada ad-hoc | Bypass do glossário | Propor mudança via PR no `tech-product-template` |

---

## 7. Opt-in: Tracking de Execução de Scripts

Para projetos onde scripts são executados frequentemente por agentes IA, cron/launchd, ou automação contínua, considere instrumentar tracking estruturado:

- **`scripts/_runtime.py`** — função `track(__file__)` chamada no topo de cada script registra timestamp/agente/host/exit code/duração em `data/script-runs.jsonl` (append-only). Não-bloqueante, idempotente, fail-safe.
- **`scripts/audit_script_usage.py`** — minera transcripts de agentes IA (Claude Code em `~/.claude/projects/**/*.jsonl`, Codex em `~/.codex/.../rollout-*.jsonl`) para detectar "última execução real" — sinal fiel quando atime/zsh history não servem.

**Quando ativar:**
- Projeto tem ≥10 scripts ativos com ≥3 meses de uso
- Scripts são invocados por agentes IA mais do que por humanos (mineração de transcripts vira sinal dominante)
- Dor real: "não sei mais quais scripts são usados / quando rodou pela última vez"

**Quando NÃO ativar:**
- Projeto novo (~5 scripts manuais)
- Execução só por humanos (zsh history e atime são suficientes)

**Como ativar:** templates prontos estão em [`scripts/_optional/`](../../scripts/_optional/):
- `runtime-tracking.py.example` → copiar para `scripts/_runtime.py`
- `audit-script-usage.py.example` → copiar para `scripts/validate/audit-script-usage.py` + ajustar placeholders `TODO PROJECT`

Ver [`scripts/_optional/README.md`](../../scripts/_optional/README.md) para guia passo-a-passo (incluindo quando ativar / quando NÃO ativar, custos de manutenção, e instrumentação incremental).

A skill `audit-scripts` detecta automaticamente se `scripts/_runtime.py` + `data/script-runs.jsonl` existem e prefere dados reais sobre heurística mtime para Classe 3 (Stale).

> **Aviso:** `_runtime.py` e `audit-script-usage.py` (uma vez copiados) são **módulos importáveis** dentro de `scripts/`, exceção explícita à Regra Estrutural §5. Documentar a exceção no `scripts/INDEX.md` é obrigatório se você optar pelo opt-in.

---

## Quando Atualizar Esta Regra

- Nova categoria canônica é adicionada (raro; via PR upstream no template)
- Novo padrão técnico universal é adotado (ex: `--json` output obrigatório)
- Anti-pattern recorrente identificado em code reviews

---

## Changelog

### v1.1.0 (template — Camada 1)
- §3 Lifecycle/Arquivar: documenta subcategorias semânticas em `_archived/`
- §7: Nova seção "Opt-in: Tracking de Execução de Scripts" (referência ao sistema do monitor-fundos)
- Promoção de aprendizados do monitor-fundos via mirror-upstream parcial

### v1.0.0 (template)
- Versão inicial: 8 categorias canônicas, lifecycle, padrões técnicos, checklist
