# scripts/ — Índice

> Atualizar **na mesma operação** que cria/move/remove script.
> Governança: ver [`.claude/rules/scripts-governance.md`](../.claude/rules/scripts-governance.md).
> Auditoria: invocar skill `audit-scripts`.

> **Nota de origem (2026-09-12, TECH-220):** este índice nasceu junto com o
> primeiro script sob governança neste repositório. Os dois `.mjs` abaixo são
> anteriores a ele e foram inventariados retroativamente, sem serem tocados.
> O glossário de categorias que a rule manda consultar vive em
> `scripts/README.md` no template de origem e **não existe aqui** — as
> categorias usadas são as do template (`validate`, `release`, `setup`),
> nomeadas pelo diretório. Trazer o glossário é trabalho próprio.

---

## Active

| Script | Categoria | Linguagem | Adicionado | Por quê |
|---|---|---|---|---|
| `validate/fecho-todo-patch.sh` | validate | bash | 2026-09-12 | Gate de fecho da TECH-220 (detour TECH-210): prova por execução que o TODO de `documents/core/` e o terceiro tipo de trabalho saíram do repositório e não voltaram. São nove asserções — as quatro do piso da régua, mais a ausência do arquivo, a ausência do nome do tipo, a ausência de citação ao arquivo, a ausência do limiar de duração que era a definição operacional do tipo, e a ausência do termo nu ao lado de outro documento core — classe coberta por construção, e não por enumeração de vetores: documento core (`Roadmap`, `Projeto`, `Project`, `CONTEXT`) × grafia nua ou com `.md` × markup inline nenhum, crase ou negrito × oito separadores, nas duas ordens. Vive como script, e não como regex na descrição da issue, porque o allowlist diverge sozinho entre repositórios quando é copiado em prosa: cada cópia sai exit 0 contra o seu próprio derivado. Isenção é por linha, com a razão declarada |
| `scheduler.mjs` | — (anterior ao índice) | node | 2026-06-28 | Tick interno do Ciclo 1: substitui o Cloudflare Worker no self-hosting — loop de 60s chamando `GET /api/market` e `POST /api/sim {action:'tick'}` com `Bearer CRON_SECRET`, mais o retrain diário opcional do `news-nlp` |
| `migrate-sim-state.mjs` | — (anterior ao índice) | node | 2026-06-28 | Migração pontual do paper book entre formatos de estado do simulador |

---

## Archived

_(vazio)_
