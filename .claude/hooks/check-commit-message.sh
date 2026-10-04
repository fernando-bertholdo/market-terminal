#!/usr/bin/env bash
# check-commit-message.sh — Hook PreToolUse (Bash) que varre a mensagem de `git commit` por
# quantificador sem medição e numeral sem fonte na mesma linha (pre-commit-check, seção 7).
#
# Trigger: PreToolUse matcher "Bash". Fast-exit (exit 0) se o comando não for `git commit`.
# Comportamento: AVISO (não bloqueia; exit 0 com o achado no stderr, salvo erro do próprio hook). É aviso e não blocker
# porque a régua é "fonte ao lado", que só quem escreve sabe conferir — o hook aponta a linha,
# a skill decide. Hooks são CWD-only e o sync entre templates não os carrega: o gate de skill vale
# em todo derivado; este hook, onde o `settings.json` o liga. O Propagador o atualiza no derivado em
# que ele é cópia literal (conteúdo e modo) de alguma versão da origem até a propagada; com diferença
# local, ou no derivado que ainda não o tem, ele segue à mão.
# Limites declarados: só o `\n` do payload é decodificado (`\t`, `\\` e `\uXXXX` ficam literais), e um
# `\n` que seja texto da mensagem também vira quebra; a varredura é por linha, então um numeral pode
# perder o marcador que o filtrava na linha vizinha — aviso a mais, nunca a menos.
set -euo pipefail
input=$(cat)
command=$(printf '%s' "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"' | head -1 | sed 's/^"command"[[:space:]]*:[[:space:]]*"//; s/"$//' || true)
command=${command//\\\"/\"}
# Opção global entre `git` e `commit` (`git -C <dir> commit`, `git -c k=v commit`) não tira o
# comando do alcance: antes só `git commit` colado casava (TECH-793).
printf '%s' "$command" | grep -qE '(^|[[:space:];&|])git([[:space:]]+(-[Cc][[:space:]]+("[^"]*"|'"'"'[^'"'"']*'"'"'|[^[:space:]]+)|--?[[:alnum:]][^[:space:]]*))*[[:space:]]+commit([[:space:];&|]|$)' || exit 0
# A mensagem: cada -m/--message (um commit pode ter vários: subject e body), mais o conteúdo de
# -F/--file quando for arquivo legível. Opção curta agrupada conta (`-am`, `-aF`): o `m` e o `F`
# levam argumento, então fecham o grupo, que começa depois de espaço e com um traço só, para
# `--platform x` não virar mensagem (TECH-793). Heredoc por `-F -`, `--amend --no-edit` e
# commit sem -m ficam fora: o hook não vê stdin do comando, e nesses casos a varredura é a da skill, à mão.
msg=$(printf '%s' "$command" | grep -oE -- '[[:space:]](-[[:alpha:]]*m|--message)[[:space:]=]+("([^"\\]|\\.)*"|'"'"'[^'"'"']*'"'"'|[^[:space:]]+)' \
  | sed -E 's/^[[:space:]](-[[:alpha:]]*m|--message)[[:space:]=]+//; s/^["'"'"']//; s/["'"'"']$//' || true)
msg=${msg//\\n/$'\n'}   # o payload traz a quebra como \n literal; sem isto a mensagem inteira vira uma linha
f=$(printf '%s' "$command" | grep -oE -- '[[:space:]](-[[:alpha:]]*F|--file)[[:space:]=]+[^[:space:]]+' | head -1 | sed -E 's/^[[:space:]](-[[:alpha:]]*F|--file)[[:space:]=]+//' || true)
[[ -n "$f" && "$f" != "-" && -f "$f" ]] && msg="$msg
$(cat "$f" 2>/dev/null || true)"
[[ -z "$msg" ]] && exit 0
quant=$(printf '%s\n' "$msg" | grep -nEi '\b(nenhum|nenhuma|todas|todos|cada|sempre|nunca|únic[oa]|em ordem|não se reproduziu)\b' || true)
nums=$(printf '%s\n' "$msg" | grep -vE '`|\.(md|sh|py|json|csv|ya?ml)\b|§|#[0-9]+|\b[A-Z]+-[0-9]+\b|\b(19|20)[0-9]{2}\b|https?://|^\|' | grep -nE '\b[0-9]+\b' || true)
if [[ -n "$quant" || -n "$nums" ]]; then
  echo "⚠️  check-commit-message: quantificador ou numeral na mensagem sem a fonte ao lado (pre-commit-check §7):" >&2
  [[ -n "$quant" ]] && printf '%s\n' "$quant" | sed 's/^/  quantificador: /' >&2
  [[ -n "$nums" ]] && printf '%s\n' "$nums" | sed 's/^/  numeral:       /' >&2
  echo "   Fica com o comando que mediu (body) ou a fonte na frase; senão sai. Medição com >2 números vai em tabela." >&2
fi
exit 0
