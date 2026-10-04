#!/usr/bin/env bash
#
# check-skill-frontmatter.sh
#
# G-FRONTMATTER: todo `SKILL.md` versionado em `.claude/skills/`,
# `.codex/skills/` ou `.agents/skills/` abre com frontmatter YAML — `---` na
# linha 1 e outro `---` depois dela, qualquer um, a régua horizontal do corpo
# inclusa.
#
# Por que existe: o Codex não carrega a skill cujo frontmatter não começa na
# linha 1. Medido em 30/09/2026 (TECH-834, Codex 0.145, numa worktree de
# `6d0fe9c`): 27 linhas `failed to load skill <caminho>: missing YAML
# frontmatter delimited by ---` no stderr do `codex exec`, contadas com
# `grep -c 'failed to load skill'`. Eram as 26 `ui-*` de `.codex/` e
# `.agents/`, que abriam com a linha de proveniência do
# `sync-ui-from-marketplace.sh` antes do `---`, e o
# `.codex/skills/audit-roadmap-refs/SKILL.md`, que não tinha frontmatter. A
# skill some sem aviso para quem não lê o stderr.
#
# Regras — o gate falha em qualquer uma:
#   1. A linha 1 do `SKILL.md` não é exatamente `---`.
#   2. Depois da linha 1, nenhuma linha é exatamente `---` (frontmatter aberto
#      e nunca fechado).
#
# A comparação é literal, na linha 1 e no fecho: `---` seguido de espaço ou de
# `\r` (fim de linha CRLF) reprova, porque não foi medido se o Codex aceita
# esses casos. Cenários do harness: F5 (CRLF) e F8 (espaço) na linha 1, F9
# (espaço) no fecho; o fecho com `\r` não tem cenário. Não valida o YAML de
# dentro nem exige `name:` ou `description:`. Itera `git ls-files`: `SKILL.md`
# não rastreado não é olhado.
#
# Por que as três camadas entram na varredura. O Codex 0.147.0 descobre
# `.agents/skills/` e `.codex/skills/` e não descobre `.claude/skills/`
# (medido em 02/10/2026: um `SKILL.md` de sonda em cada pasta de um
# repositório git descartável, e a lista de skills do prompt do Codex):
#     for p in .claude .agents .codex; do mkdir -p $p/skills/sonda-${p#.}
#       printf -- '---\nname: sonda-%s\ndescription: d\n---\n' ${p#.} \
#         > $p/skills/sonda-${p#.}/SKILL.md; done
#     codex debug prompt-input | grep -o 'sonda-[a-z]*' | sort -u
# Saem `sonda-agents` e `sonda-codex`.
#   .agents/skills/  o Codex lê, e foi nela e em `.codex/skills/` que a
#                    TECH-834 mediu o `failed to load skill`.
#   .codex/skills/   o Codex lê. Saiu do template na TECH-852 (no
#                    tech-product-template, em 02/10/2026,
#                    `git ls-files -- .codex/skills` não lista arquivo nenhum)
#                    e continua varrida porque pelo menos quatro derivados
#                    ainda a têm (medição abaixo). Em 30/09/2026 (TECH-834) o
#                    MonoScribe e o ticktick-assistant a tinham com a linha de
#                    proveniência na linha 1; em 01/10/2026 o revisor achou o
#                    mesmo no Market-Terminal e no my-sm-persona, e a medição
#                    repetida em 02/10/2026 deu os quatro. No
#                    case-project-template e no learning-project-template a
#                    pasta não existe em 02/10/2026: o `gh api` sobre ela dá
#                    HTTP 404 e o da raiz, legível, lista sem `.codex`
#                    (`false`). A medição cobre estes seis repositórios, os
#                    quatro do primeiro bloco de comandos e os dois do
#                    segundo, e só eles.
#                      f=.codex/skills/ui-accessibility/SKILL.md
#                      for r in MonoScribe ticktick-assistant \
#                        Market-Terminal my-sm-persona; do
#                        gh api repos/fernando-bertholdo/$r/contents/$f \
#                          --jq .content | base64 -d | head -1; done
#                      d=.codex/skills
#                      for r in case-project-template \
#                        learning-project-template; do
#                        gh api repos/fernando-bertholdo/$r/contents/$d \
#                          2>&1 | grep -o 'HTTP [0-9]*'
#                        gh api repos/fernando-bertholdo/$r/contents/ \
#                          --jq 'any(.[]; .name==".codex")'; done
#   .claude/skills/  o Codex não lê. Entra pelo par: o gate de pareamento
#                    compara `.claude/skills/` e `.agents/skills/` byte a byte,
#                    salvo exceção declarada, e por isso o `SKILL.md` quebrado
#                    num par homônimo aparece nos dois caminhos do relatório,
#                    não só no que o Codex carrega. O alcance do pareamento, em
#                    02/10/2026: `check-pareamento-instrucoes.sh --help |
#                    grep Alcance`.
# Sem `SKILL.md` nas três camadas, passa por vacuidade e diz isso.
#
# Uso:
#   scripts/validate/check-skill-frontmatter.sh
#
# Exit codes:
#   0  todo `SKILL.md` tem `---` na linha 1 e outro `---` depois dela (ou não
#      há `SKILL.md`)
#   1  erro de argumento
#   2  violação
#   5  pré-requisito de ambiente ausente

set -euo pipefail

log() { printf '[skill-frontmatter] %s\n' "$*"; }
die() { printf '[skill-frontmatter] ERRO: %s\n' "$1" >&2; exit "${2:-1}"; }

[[ $# -eq 0 ]] || { [[ "$1" == "-h" || "$1" == "--help" ]] && { sed -n '3,/^set -euo/{/^set -euo/!p;}' "$0"; exit 0; } || die "argumento desconhecido: $1" 1; }
command -v git >/dev/null 2>&1 || die "git não encontrado no PATH." 5
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO_ROOT" ]] || die "fora de um repositório git." 5
cd "$REPO_ROOT"

total=0
violacoes=0
while IFS= read -r -d '' f; do
  [[ "${f##*/}" == 'SKILL.md' ]] || continue
  total=$((total + 1))
  # O `|| true` cobre o arquivo sem quebra de linha final, em que o `read`
  # preenche a variável e sai 1.
  primeira=''
  IFS= read -r primeira < "$f" || true
  if [[ "$primeira" == $'---\r' ]]; then
    log "linha 1 é '---' com fim de linha CRLF: $f"
    violacoes=$((violacoes + 1))
  elif [[ "$primeira" != '---' ]]; then
    log "sem '---' na linha 1: $f (a linha 1 é: ${primeira:0:80})"
    violacoes=$((violacoes + 1))
  # `awk` e não `tail | grep -q`: sob `pipefail`, o `grep -q` que acha cedo
  # mata o `tail` por SIGPIPE, e o 141 viraria "nunca fechado" num arquivo bom.
  elif ! awk 'NR > 1 && $0 == "---" { achou = 1; exit } END { exit !achou }' "$f"; then
    log "frontmatter aberto na linha 1 e nunca fechado: $f"
    violacoes=$((violacoes + 1))
  fi
done < <(git ls-files -z -- .claude/skills .codex/skills .agents/skills)

if (( violacoes > 0 )); then
  log "$violacoes de $total SKILL.md sem frontmatter válido na linha 1: nas camadas que o Codex lê (.agents/skills e .codex/skills), ele não carrega essas skills (failed to load skill … missing YAML frontmatter delimited by ---)."
  exit 2
fi
if (( total == 0 )); then
  log "nenhum SKILL.md versionado em .claude/skills, .codex/skills ou .agents/skills: nada a conferir."
  exit 0
fi
log "$total SKILL.md conferidos, todos com '---' na linha 1 e outro '---' depois dela."
