# scripts/ — Índice

> Atualizar **na mesma operação** que cria/move/remove script.
> Governança: ver [`.claude/rules/scripts-governance.md`](../.claude/rules/scripts-governance.md).
> Auditoria: invocar skill `audit-scripts`.
> Datas novas da coluna Adicionado: calendário do fuso do dono (`AGENTS.md`, "Horas e datas").

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
| `validate/fecho-todo-patch.sh` | validate | bash | 2026-09-12 | Gate de fecho da TECH-220 (detour TECH-210): prova por execução que o TODO de `documents/core/` e o terceiro tipo de trabalho saíram do repositório e não voltaram. São nove asserções — as quatro do piso da régua, mais a ausência do arquivo, a ausência do nome do tipo, a ausência de citação ao arquivo, a ausência do limiar de duração que era a definição operacional do tipo, e a ausência do termo nu ao lado de outro documento core — classe coberta por construção, e não por enumeração de vetores: documento core (`Roadmap`, `Projeto`, `Project`, `CONTEXT`) × grafia nua ou com `.md` × markup inline nenhum, crase ou negrito × oito separadores, nas duas ordens. Vive como script, e não como regex na descrição da issue, porque o allowlist diverge sozinho entre repositórios quando é copiado em prosa: cada cópia sai exit 0 contra o seu próprio derivado. Isenção é por linha, com a razão declarada, em `validate/fecho-todo-patch-allowlist.txt`: cada entrada é o caminho mais o texto literal da linha inteira, sem número de linha, porque a âncora por posição dava falso vermelho quando uma linha entrava acima e falso verde quando a linha isenta era reescrita (TECH-512, TECH-668, TECH-537) |
| `validate/check-versao-linhagem.sh` | validate | bash | 2026-09-30 | G-LINHAGEM: o marcador `Template de origem: <nome>@<versão>` existe e é idêntico nas três camadas (`.claude/CLAUDE.md`, `.agents/README.md`, `.codex/README.md`); a comparação com o rodapé `**Versão:**` só roda no template canônico, porque aqui o rodapé versiona o `CLAUDE.md` local, que é outro eixo. Trazido do tech-product-template 2.18.0 pela TECH-668, cópia literal; atualizado à 2.21.0 pela TECH-1020. |
| `validate/check-changelog-local.sh` | validate | bash | 2026-09-30 | G-CHANGELOG: toda tabela "Changelog Local" de `.claude/`, `.codex/` e `.agents/` tem 5 colunas, data ISO na primeira e a mais recente primeiro (§8 do `.claude/CLAUDE.md`). Itera `git ls-files`, então arquivo fora do índice não é conferido. Cobrado pelo `audit-rules` e por um passo do `ci.yml`. Trazido do tech-product-template 2.18.0 pela TECH-668, cópia literal; atualizado à 2.21.0 pela TECH-1020. |
| `validate/test-gates-validate.sh` | validate | bash | 2026-09-30 | Controle negativo dos gates de `validate/`: um fixture descartável por cenário, a árvore quebrada de propósito, e a conferência do exit code e da razão da reprovação. Gate ausente neste repositório vira "não rodado", não FAIL. Trazido do tech-product-template 2.18.0 pela TECH-668, cópia literal; atualizado à 2.21.0 pela TECH-1020. |
| `validate/validate-clean-tree.sh` | validate | bash | 2026-09-30 | Árvore de trabalho limpa desconsiderando os artefatos que os runtimes de agente injetam no checkout (inclusive `.claude/worktrees/`), excluídos por pathspec. Trazido do tech-product-template 2.18.0 pela TECH-668, cópia literal; atualizado à 2.21.0 pela TECH-1020. |
| `validate/check-agents-md-teto.sh` | validate | bash | 2026-10-04 | G-AGENTS-TETO: o `AGENTS.md` da raiz tem no máximo 32768 bytes, o padrão de `project_doc_max_bytes` do Codex, que corta o arquivo no teto. Mede bytes, não caracteres; sem `AGENTS.md` na raiz, passa por vacuidade. Roda no `ci.yml`. Trazido do tech-product-template 2.21.0 pela TECH-1020 (2026-10-04). |
| `validate/check-skill-frontmatter.sh` | validate | bash | 2026-10-04 | G-FRONTMATTER: todo `SKILL.md` versionado em `.claude/skills/`, `.codex/skills/` ou `.agents/skills/` precisa de `---` na linha 1 e de outro `---` depois dela, porque o Codex não carrega a skill sem isso e só avisa no stderr. A comparação é literal e o YAML de dentro não é validado. Roda no `ci.yml`. Trazido do tech-product-template 2.21.0 pela TECH-1020 (2026-10-04). |
| `validate/check-regra-comandos.sh` | validate | bash | 2026-10-04 | G-REGRA-COMANDOS: o comando em crase de uma linha `NUNCA` da §6 do `.claude/CLAUDE.md` é casado por uma `prefix_rule` com `decision = "forbidden"` em `.codex/rules/comandos.rules`, e a regra proibitiva cita a seção na `justification`. Lê a `.rules` por `ast` do python3, sem rodar o Codex, e não confere o `deny` do `.claude/settings.json`. Roda no `ci.yml`. Trazido do tech-product-template 2.21.0 pela TECH-1020 (2026-10-04). |
| `validate/test-ci-invariantes.sh` | validate | bash | 2026-10-04 | Prova que o passo "Invariantes do repositório" do `ci.yml` reprova quando qualquer uma das linhas dele é quebrada: extrai o corpo do `run:` do próprio `ci.yml` e o roda com `bash -e` numa árvore git descartável por cenário. `--ci <arquivo>` mede outro `ci.yml`, que é o controle negativo. Roda no `ci.yml`. Trazido do tech-product-template 2.21.0 pela TECH-1020 (2026-10-04). |
| `validate/test-hook-task-completed.sh` | validate | bash | 2026-10-04 | Mede quando o hook `TaskCompleted` (`.claude/hooks/check-task-completed.sh`) pula o gate de testes: tipo `docs`, ou verbo de documentação, revisão, pesquisa ou planejamento na primeira palavra, sem coordenação depois dele. `--medir` aplica o filtro antigo e o hook sob teste aos assuntos rotulados de `validate/test-hook-task-completed-assuntos.txt`, arquivo de dados versionado ao lado. Roda no `ci.yml`. Trazido do tech-product-template 2.21.0 pela TECH-1020 (2026-10-04). |
| `validate/test-entrega-clipboard.sh` | validate | bash | 2026-10-04 | Roda os comandos da seção "Entrega" do `generate-session-prompt/SKILL.md` como o texto os escreve: o comparador e a ida e volta pela área de transferência. Sem área de transferência sai PULADO, que só reprova com `--exigir`. O `ci.yml` não o roda: a matriz da origem, `entrega-clipboard.yml`, não viaja ao derivado. Trazido do tech-product-template 2.21.0 pela TECH-1020 (2026-10-04). |
| `scheduler.mjs` | — (anterior ao índice) | node | 2026-06-28 | Tick interno do Ciclo 1: substitui o Cloudflare Worker no self-hosting — loop de 60s chamando `GET /api/market` e `POST /api/sim {action:'tick'}` com `Bearer CRON_SECRET`, mais o retrain diário opcional do `news-nlp` |
| `migrate-sim-state.mjs` | — (anterior ao índice) | node | 2026-06-28 | Migração pontual do paper book entre formatos de estado do simulador |

---

## Archived

_(vazio)_
