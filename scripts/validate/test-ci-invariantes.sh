#!/usr/bin/env bash
# test-ci-invariantes.sh — prova que o passo "Invariantes do repositório" do
# `.github/workflows/ci.yml` reprova por CADA uma das suas linhas (TECH-842).
#
# Por que ele existe: o GitHub Actions roda o `run:` com `bash -e`, e o `set -e`
# ignora comando negado com `!`. Com as linhas escritas `! grep …`, das linhas
# negadas só a última decidia o passo, e o marcador de conflito nunca reprovou. A forma
# `! grep … || exit 1` fecha esse caso e abre outro: o `grep` saindo 2, erro de
# leitura, vira sucesso pelo `!`. Os dois só aparecem executando o passo.
#
# Como ele mede: extrai o corpo do `run:` do próprio `ci.yml`, monta uma árvore
# git descartável por cenário, quebra a árvore de propósito e roda o corpo com
# `bash -e`, como o Actions. Confere o exit code e a razão: a saída tem de citar
# o arquivo que o cenário plantou, senão o passo reprovou por outro motivo.
#
# Uso: bash scripts/validate/test-ci-invariantes.sh [--ci <caminho do ci.yml>] [--help]
#   --ci  mede outro `ci.yml`; é o controle negativo, contra o arquivo de antes
#         da TECH-842 (`git show 4e775d5:.github/workflows/ci.yml`)
# Exit codes: 0 = todos os cenários batem; 1 = algum diverge; 2 = erro de uso
#             ou de ambiente (passo não encontrado, cenário impossível de montar).

set -euo pipefail

RAIZ_REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
CI="$RAIZ_REPO/.github/workflows/ci.yml"

while [ $# -gt 0 ]; do
  case "$1" in
    --ci)
      [ $# -ge 2 ] && [ -f "$2" ] || { echo "uso: --ci <arquivo existente>" >&2; exit 2; }
      CI="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"; shift 2 ;;
    --help|-h) sed -n '2,/^$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "argumento desconhecido: $1 (use --help)" >&2; exit 2 ;;
  esac
done

TMP=$(mktemp -d)
trap 'chmod -R u+rwX "$TMP" 2>/dev/null; rm -rf "$TMP"' EXIT

# O bloco literal do `run: |` do passo, sem a indentação do YAML.
awk '
  /^[[:space:]]*- name: Invariantes do repositório[[:space:]]*$/ { achou = 1; next }
  achou && !dentro && /^[[:space:]]*run: \|[[:space:]]*$/ {
    match($0, /^[[:space:]]*/); ind = RLENGTH; dentro = 1; next
  }
  achou && !dentro && /^[[:space:]]*- / { exit }
  dentro {
    if ($0 ~ /^[[:space:]]*$/) { print ""; next }
    match($0, /^[[:space:]]*/)
    if (RLENGTH <= ind) exit
    if (!corte) corte = RLENGTH
    print substr($0, corte + 1)
  }' "$CI" > "$TMP/corpo.sh"
grep -q '[^[:space:]]' "$TMP/corpo.sh" || { echo "passo 'Invariantes do repositório' sem run: | em $CI" >&2; exit 2; }

# Árvore mínima que satisfaz as invariantes; o `git add` põe tudo no índice,
# que é o que o `git ls-files` do passo lê.
arvore() {
  local d="$TMP/$1"
  mkdir -p "$d/documents/core"
  printf '%s\n' '# Projeto' > "$d/documents/core/Projeto.md"
  printf '%s\n' 'ok' > "$d/README.md"
  git -C "$d" init -q
  git -C "$d" add documents/core/Projeto.md README.md
  printf '%s' "$d"
}

falhas=0; n=0
confere() {  # <nome> <dir> <exit esperado> <ERE da razão, vazia no positivo>
  local saida rc=0
  saida=$(cd "$2" && GIT_CEILING_DIRECTORIES="$TMP" bash -e "$TMP/corpo.sh" 2>&1) || rc=$?
  n=$((n + 1))
  if [ "$rc" -ne "$3" ]; then
    echo "FAIL  $1: saiu $rc, esperado $3"; falhas=$((falhas + 1)); return
  fi
  if [ -n "$4" ] && ! printf '%s\n' "$saida" | grep -qE "$4"; then
    echo "FAIL  $1: saiu $rc, mas a saída não cita '$4'"; falhas=$((falhas + 1)); return
  fi
  echo "PASS  $1 (exit $rc)"
}

d=$(arvore limpa)
confere 'árvore limpa' "$d" 0 ''

d=$(arvore marcador)
marca=$(printf '%7s' '' | tr ' ' '<')   # sem o literal aqui: o próprio passo varre este arquivo
printf '%s\n' 'a' "$marca HEAD" 'b' > "$d/conflito.txt"
confere 'marcador de conflito plantado' "$d" 1 'conflito\.txt'

d=$(arvore multica)
mkdir -p "$d/.multica"
printf '%s\n' '{}' > "$d/.multica/estado.json"
git -C "$d" add .multica/estado.json
confere '.multica/ rastreado' "$d" 1 '\.multica/estado\.json'

d=$(arvore ilegivel)
printf '%s\n' 'x' > "$d/ilegivel.txt"
chmod 000 "$d/ilegivel.txt"
if cat "$d/ilegivel.txt" >/dev/null 2>&1; then
  echo "não mediu: 'grep saindo 2' pede arquivo ilegível, e este usuário lê com chmod 000 (root?)" >&2
  exit 2
fi
confere 'grep saindo 2 (arquivo ilegível)' "$d" 1 'ilegivel\.txt'

# Nome não-ASCII sai entre aspas e com escape octal no `git ls-files`
# (`".multica/estado-\303\251.json"`), e um `grep '^\.multica/'` não o via.
d=$(arvore multica-acento)
mkdir -p "$d/.multica"
printf '%s\n' '{}' > "$d/.multica/estado-é.json"
git -C "$d" add .multica
confere '.multica/ rastreado com nome não-ASCII' "$d" 1 'multica/estado-'

# Fora de repositório o `git ls-files` morre, e sem `pipefail` o `grep` lia
# entrada vazia e saía 1, "nenhuma ocorrência" (TECH-842).
d=$(arvore sem-git)
rm -rf "$d/.git"
confere 'git ls-files falhando (fora de repositório)' "$d" 1 'fatal'

d=$(arvore sem-projeto)
rm "$d/documents/core/Projeto.md"
confere 'documents/core/Projeto.md ausente' "$d" 1 ''

echo "$n cenários, $falhas falhas (ci: $CI)"
[ "$falhas" -eq 0 ]
