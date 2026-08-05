---
paths:
  - "data/**/*"
  - "output/**/*"
  - "reports/**/*"
  - "src/cli.py"
  - "src/storage/**/*"
  - "src/reports/**/*"
  - "scripts/**/*"
  - ".gitignore"
  - ".planning/**/*"
  - "documents/reports/**/*"
---

# Artifact Governance

Use esta regra quando a tarefa tocar em criacao, leitura, migracao, naming ou defaults de artefatos em:

- `data/**/*`
- `output/**/*`
- `reports/**/*`
- `src/cli.py`
- `src/storage/**/*`
- `src/reports/**/*`
- `scripts/**/*`
- `.gitignore`
- `.planning/**/*`
- `documents/reports/**/*`

## Regra de Ouro

**Nenhum artefato novo sem responder 3 perguntas.**

## Arvore de Decisao

**P1. E documentacao/planning ou output operacional?**
- Doc curada → `documents/`
- Tracking/handoff → `.planning/`
- Output operacional → P2

**P2. E duravel/reutilizavel ou efemero/execucional?**
- Duravel → catalog → P3
- Efemero → runtime → P3

**P3. Ja existe diretorio para este tipo de artefato?**
- Sim → use-o
- Nao → NAO crie novo; use `--output-dir` explicito ou registre bloqueio

## Classes de Referencia

| Classe | Familia | Definicao |
|---|---|---|
| record | catalog | Dado duravel com contrato explicito |
| derived | catalog | Derivado rebuildable: analise, cobertura, observabilidade |
| publication | catalog | Pacote de entrega humana (source/ + rendered/) |
| evidence | runtime | Captura de run para auditoria ou debugging |
| state | runtime | Estado resumable para retomar execucao |
| workspace | runtime | Espaco efemero para exploracao ou staging |

## Moratoria

- NAO criar novo diretorio raiz
- Nomes genericos (report, snapshot, output) nao sao categorias estruturais
- Diretorio persistente novo exige `README.md` com owner, classe e retencao
- Legado ambiguo: preservar e documentar

## Anti-ambiguidade

`report`, `snapshot`, `output`, `export`, `coverage` sao tipos internos de uma classe, nao categorias.

---

## Mapeamento Local (preencher ao instanciar o template)

| Diretorio | Classe | Notas |
|---|---|---|
| `data/` | — | Preencher conforme projeto |
| `output/` | publication/workspace | Artefatos gerados — nunca versionar |
| `reports/` | congelado | NAO usar para novos artefatos |
| `tmp/` | workspace (runtime) | Efemero |

---

## Exceções Documentadas

Diretórios raiz que ficam fora do escopo de artifact-governance por razão estrutural — fonte de código de tooling, não artefatos.

| Path | Tipo | Justificativa | Governança específica |
|---|---|---|---|
| `scripts/**/*` | source code / tooling | Código executável (bash, python, etc) usado para automação, validação, investigação e operação. Não produz artefatos persistentes neste diretório. | [`scripts-governance.md`](scripts-governance.md) |

A exceção implica:
- Scripts NÃO escrevem outputs persistentes em `scripts/` (vão para `data/`, `output/`, tmp dirs)
- Subdir taxonomia segue rule específica (8 categorias canônicas), não as 6 classes de artifact-governance
- Cada repo derivado mantém esta exceção; novos diretórios raiz fora deste registro continuam sob moratória
