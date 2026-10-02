#!/usr/bin/env bash
# fecho-todo-patch.sh — gate de fecho da aposentadoria do `documents/core/TODO.md`
# e do terceiro tipo de trabalho neste derivado (TECH-220, detour TECH-210).
#
# Por que ele é um script versionado, e não um regex colado na issue: o allowlist
# cresce a cada rodada de revisão, e repetido em prosa numa descrição de issue ele
# diverge sozinho entre repositórios sem que ninguém perceba — cada cópia sai
# exit 0 contra o seu próprio derivado. O `verify:` da issue invoca este arquivo.
#
# Uso: bash scripts/validate/fecho-todo-patch.sh [--help]
# Exit codes: 0 = as nove asserções passam; 1 = alguma falhou (a mensagem diz
#             qual); 2 = erro de uso.
# Ambiente: host Linux com GNU grep. As varreduras chamam `command grep`, que
#           desvia de função de shell (`ugrep` com `--ignore-files`, que esconde
#           ocorrência viva) sem fixar caminho de binário — `/usr/bin/grep` é BSD
#           grep em macOS e pode nem existir numa imagem Alpine.

set -euo pipefail

ajuda() {
  cat <<'AJUDA'
fecho-todo-patch.sh — gate de fecho da TECH-220 (detour TECH-210).

Propósito
  Prova, por execução, que o `documents/core/TODO.md` e o terceiro tipo de
  trabalho saíram deste repositório — e que não voltaram. São nove asserções:

  1. o arquivo não existe
  2. o diretório do tipo não existe
  3. a forma de arquivo único do tipo não existe
  4. nenhum texto vivo aponta para o caminho do diretório apagado
  5. o `.planning/README.md` não declara mais o tipo no vocabulário
  6. nenhum texto vivo cita `TODO.md` fora do allowlist
  7. nenhum texto vivo cita o nome do tipo fora do allowlist
  8. nenhum texto define iniciativa pelo limiar de duração (a definição
     operacional do tipo revogado — trocar a palavra não aposenta o tipo)
  9. nenhum texto cita o documento pelo **termo nu** ao lado de outro
     documento core. A classe coberta é o produto cartesiano: documento core
     (`Roadmap`, `Projeto`, `Project`, `CONTEXT`) × grafia nua ou com `.md` ×
     markup inline nenhum, crase ou negrito × separador (`,` `/` `+` `|` `&`
     `&amp;`, ` e `, ` and `), **nas duas ordens** — `TODO` antes ou depois do
     outro documento. São 384 formas, e a asserção pega as 384; o que ela não
     guarda é a citação com extensão, que é da asserção 6

Allowlist
  Isenção é propriedade de LINHA, nunca de arquivo nem de diretório. Cada
  entrada de scripts/validate/fecho-todo-patch-allowlist.txt declara o
  caminho e o texto literal da linha inteira, sem número de linha, e o
  comentário do bloco diz a razão. Linha reescrita perde a isenção.

  O `--exclude-dir` das cinco varreduras não é allowlist, é alcance:
  `_archive/` guarda registro histórico deliberadamente fora do texto vivo que
  o gate audita, e `audit-reports/` hoje tem 0 ocorrências dos termos
  varridos — os dois diretórios ficam de fora da varredura por escopo, não
  isentos linha a linha dentro dela.

Argumentos
  --help, -h   mostra esta ajuda e sai
  (nenhum)     roda as nove asserções

Exit codes
  0   todas passam
  1   alguma falhou (a saída diz qual)
  2   erro de uso
AJUDA
}

case "${1-}" in
  --help|-h) ajuda; exit 0 ;;
  '') : ;;
  *) printf 'argumento desconhecido: %s (use --help)\n' "$1" >&2; exit 2 ;;
esac

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

falhou() { printf 'FAIL · %s\n' "$1" >&2; exit 1; }

# --- Allowlist: texto literal da linha inteira (§9.5 da régua, TECH-512) ----
# As entradas e a razão de cada bloco vivem em
# `scripts/validate/fecho-todo-patch-allowlist.txt`, uma por linha, no formato
# `<lista>\t<caminho>\t<texto literal da linha>`. Cada entrada vira a ERE
# `^\./<caminho>:[0-9]+:<texto escapado>$` sobre a saída de `grep -n`: o número
# de linha é curinga, e o texto vai até o fim da linha.
#
# Até a TECH-537 a isenção era por `arquivo:linha`, e nas tabelas de Changelog Local
# pelo começo literal da linha (TECH-668). O veredito de 01/10/2026 da TECH-537
# mediu neste repositório os dois defeitos da âncora por posição: uma linha
# nova no topo do `Projeto.md` derrubava a asserção 7 (falso vermelho), e a
# linha isenta do `Roadmap.md` reescrita como instrução viva, sem sair do lugar,
# seguia isenta (falso verde). Ancorar só no começo também não bastava: o fim
# de uma linha isenta aceitava texto vivo injetado (TECH-668).
ALLOWLIST_FILE='scripts/validate/fecho-todo-patch-allowlist.txt'
test -r "$ALLOWLIST_FILE" || falhou "allowlist ilegível: $ALLOWLIST_FILE"

ere_escape() { printf '%s' "$1" | sed 's/[][\\.^$*+?(){}|]/\\&/g'; }

ALLOWLIST_CAMINHO='' ALLOWLIST_TODO='' ALLOWLIST_TIPO=''
while IFS=$'\t' read -r lista caminho texto; do
  case "$lista" in ''|'#'*) continue ;; esac
  { [ -n "${caminho:-}" ] && [ -n "${texto:-}" ]; } || falhou "allowlist: entrada malformada na lista '$lista'"
  pat="^\\./$(ere_escape "$caminho"):[0-9]+:$(ere_escape "$texto")\$"
  case "$lista" in
    caminho) ALLOWLIST_CAMINHO="${ALLOWLIST_CAMINHO:+$ALLOWLIST_CAMINHO|}$pat" ;;
    todo)    ALLOWLIST_TODO="${ALLOWLIST_TODO:+$ALLOWLIST_TODO|}$pat" ;;
    tipo)    ALLOWLIST_TIPO="${ALLOWLIST_TIPO:+$ALLOWLIST_TIPO|}$pat" ;;
    *)       falhou "allowlist: lista desconhecida '$lista'" ;;
  esac
done < "$ALLOWLIST_FILE"

# Lista vazia vira `^$`, que não casa nenhuma linha de `grep -n`. Sem isso o
# `grep -vE ''` das asserções casaria tudo e isentaria a varredura inteira.
[ -n "$ALLOWLIST_CAMINHO" ] || ALLOWLIST_CAMINHO='^$'
[ -n "$ALLOWLIST_TODO" ] || ALLOWLIST_TODO='^$'
[ -n "$ALLOWLIST_TIPO" ] || ALLOWLIST_TIPO='^$'

# --- 1. O arquivo não existe -------------------------------------------------
# `test !`, e não `! test`: o `!` do shell isenta o comando de `set -e`, e aí a
# asserção não aborta o script quando falha.
test ! -f documents/core/TODO.md || falhou 'asserção 1: documents/core/TODO.md voltou a existir'

# --- 2 e 3. O tipo não tem casa ---------------------------------------------
test ! -d .planning/patches || falhou 'asserção 2: o diretório do tipo voltou a existir'
test ! -f .planning/patches.md || falhou 'asserção 3: a forma de arquivo único do tipo voltou a existir'

# --- 4. Nenhum texto vivo aponta para o caminho apagado ----------------------
# Divergência declarada em relação ao piso da régua (§9.7), que prescreve esta
# asserção sem allowlist: este derivado tem duas linhas de Changelog Local
# datadas de 02/09 que citam o caminho como registro do que a adaptação local
# fazia. Cumprir o piso literal exigiria reescrevê-las — que é exatamente o que
# a régua proíbe. A dimensão medida é a mesma; o que entra é a isenção por
# linha de §9.5, com a razão escrita acima.
rc=0; caminho=$(command grep -RnI 'planning/patches' . \
  --include='*.md' --include='.gitattributes' --include='*.html' \
  --exclude-dir=.git --exclude-dir=_archive \
  --exclude-dir=node_modules --exclude-dir=audit-reports) || rc=$?
test "$rc" -le 1 || falhou 'asserção 4: a varredura não conseguiu olhar (exit 2)'
# O filtro do allowlist também tem as três saídas do `grep`, e o exit dele é
# conferido à parte: dentro de `… | command grep -c . || true` um filtro que
# falha (regex inválida, exit 2, saída vazia) virava "zero linhas vivas" e a
# asserção passava. Exit 1 aqui é legítimo — o allowlist isentou tudo.
rc=0; filtradas=$(printf '%s' "$caminho" | command grep -vE "$ALLOWLIST_CAMINHO") || rc=$?
test "$rc" -le 1 || falhou 'asserção 4: o filtro do allowlist não conseguiu olhar (regex inválida?)'
vivas=$(printf '%s' "$filtradas" | command grep -c . || true)
test "$vivas" -eq 0 || falhou "asserção 4: $vivas linha(s) viva(s) apontam para o caminho apagado"

# --- 5. O vocabulário do `.planning/README.md` não declara mais o tipo -------
# Exit 1 exigido, e não a mera negação: o `grep` tem três saídas, e `!` funde
# "não achou" com "não consegui olhar" — com o arquivo ausente ele sai 2, e a
# forma negada daria PASS.
rc=0; command grep -qE '\*\*Patch\*\*|patches/' .planning/README.md || rc=$?
test "$rc" -eq 1 || falhou 'asserção 5: o .planning/README.md declara o tipo, ou está ausente/ilegível'

# --- 6. Nenhum texto vivo cita `TODO.md` fora do allowlist -------------------
# Sem `-i`: o nome tem grafia fixa nas instruções que o citavam, e a diferença
# foi medida neste repositório em 12/09/2026 — o mesmo conjunto de arquivos com
# e sem `-i`. O alcance inclui `*.html` porque é onde `documents/strategy/`
# guarda os dois documentos de método deste derivado.
rc=0; todos=$(command grep -RnI 'TODO\.md' . \
  --include='*.md' --include='.gitattributes' --include='*.html' \
  --exclude-dir=.git --exclude-dir=_archive \
  --exclude-dir=node_modules --exclude-dir=audit-reports) || rc=$?
test "$rc" -le 1 || falhou 'asserção 6: a varredura não conseguiu olhar (exit 2)'
rc=0; filtradas=$(printf '%s' "$todos" | command grep -vE "$ALLOWLIST_TODO") || rc=$?
test "$rc" -le 1 || falhou 'asserção 6: o filtro do allowlist não conseguiu olhar (regex inválida?)'
vivas=$(printf '%s' "$filtradas" | command grep -c . || true)
test "$vivas" -eq 0 || falhou "asserção 6: $vivas citação(ões) viva(s) de TODO.md fora do allowlist"

# --- 7. Nenhum texto vivo cita o nome do tipo fora do allowlist --------------
rc=0; tipo=$(command grep -RniIE '\bpatch(es)?\b' . \
  --include='*.md' --include='.gitattributes' --include='*.html' \
  --exclude-dir=.git --exclude-dir=_archive \
  --exclude-dir=node_modules --exclude-dir=audit-reports) || rc=$?
test "$rc" -le 1 || falhou 'asserção 7: a varredura não conseguiu olhar (exit 2)'
rc=0; filtradas=$(printf '%s' "$tipo" | command grep -vE "$ALLOWLIST_TIPO") || rc=$?
test "$rc" -le 1 || falhou 'asserção 7: o filtro do allowlist não conseguiu olhar (regex inválida?)'
vivas=$(printf '%s' "$filtradas" | command grep -c . || true)
test "$vivas" -eq 0 || falhou "asserção 7: $vivas citação(ões) viva(s) do tipo fora do allowlist"

# --- 8. Ninguém define iniciativa pelo limiar de duração --------------------
# Trocar a palavra não aposenta o tipo: o que o definia operacionalmente era o
# limiar de sessões — `<=2 sessões` dispensando plano, `>2 sessões` promovendo a
# detour. Enquanto o limiar viver, o tipo vive com outro nome.
#
# O padrão para em `sess` de propósito, e isso cobre os dois idiomas: `sessões`,
# `sessoes`, `session` e `sessions` começam todos por ali. A lição é da linhagem
# Lass, medida em 12/09/2026 no `lab-contratos` — `detour (>2 sessions, needs
# evidence)`, instrução em inglês, sobrevivia a qualquer varredura por
# `sess(ões|oes)`. Estreitar o padrão para uma lista de sufixos reintroduziria o
# buraco pelo idioma seguinte.
rc=0; limiar=$(command grep -RnIE '(<=|≤|>) ?2 sess' . \
  --include='*.md' --include='.gitattributes' --include='*.html' \
  --exclude-dir=.git --exclude-dir=_archive \
  --exclude-dir=node_modules --exclude-dir=audit-reports) || rc=$?
test "$rc" -le 1 || falhou 'asserção 8: a varredura não conseguiu olhar (exit 2)'
vivas=$(printf '%s' "$limiar" | command grep -c . || true)
test "$vivas" -eq 0 || falhou "asserção 8: $vivas linha(s) ainda definem iniciativa por limiar de duração"

# --- 9. Ninguém cita o documento pelo termo nu ------------------------------
# O vetor que escapa de toda varredura por `TODO\.md`: o termo **sem extensão**,
# numa lista ao lado dos outros documentos core — `documents/core/ (TODO,
# Roadmap, Projeto)`, `Roadmap/TODO`, `CONTEXT.md/Roadmap/TODO`. Medido em
# 12/09/2026 na linhagem Lass: no `lab-contratos` uma ocorrência dessas
# atravessou duas rodadas de revisão adversarial sem ser vista. Aqui ele existia
# em três lugares — os dois `spawn-*.md` do `agent-team` e o handoff do Ciclo 2.
#
# O padrão exige o termo **em caixa alta** e **colado a um separador de lista**
# com outro documento core: sem as duas condições ele acusaria a palavra
# portuguesa "todo" e o placeholder `TODO PROJECT` da rule de scripts. `Project`
# entra ao lado de `Projeto` pelo mesmo motivo da asserção 8 — instrução em
# inglês é um vetor medido, não hipótese.
#
# O separador aceita `&amp;` além de `&` porque dois dos documentos de método
# deste derivado são HTML, e ali o `&` vem escapado: `Roadmap &amp; TODO` era
# uma das três ocorrências que esta fatia limpou. Sem a entidade no padrão, o
# gate passaria por cima dela — medido nos dois sentidos em 12/09/2026.
#
# `+` e `\|` entraram no separador, e `core/TODO\b` entrou como ramo próprio,
# depois de o veredito do PR #7 medir que a forma-path (`documents/core/TODO`,
# sem extensão, ao lado de "para o backlog") e os separadores `+`/`|`
# atravessavam o padrão anterior — o mesmo vetor que este script foi escrito
# para fechar.
#
# O ramo já foi uma classe negada de `.`, escrita para não caçar `core/TODO.md`
# sem precisar de allowlist. A rodada seguinte mediu o preço disso: a classe
# excluía **todo** caractere `.`, não só a extensão, e com ela
# `- Consulte o backlog em documents/core/TODO.` — o termo nu em fim de frase,
# a forma mais natural em prosa portuguesa — saía PASS. A asserção 6 também não
# pegava, porque não há `.md` ali para casar.
#
# Por isso o ramo volta ao `\b` e a asserção passa a filtrar a saída pelo
# `ALLOWLIST_TODO`, como as asserções 4, 6 e 7 já filtram as suas: o `\b`
# também caça `core/TODO.md`, e quem isenta as seis linhas históricas passa a
# ser o allowlist — que as nomeia pelo texto literal da linha — em vez de um
# recorte de padrão que, para isentá-las, isentava junto todo ponto final.
#
# Custo aceito e declarado: alcance. O filtro isenta as 12 entradas da lista
# `todo`, das quais o vetor com extensão precisava de 6 — as outras 6 (skills
# README duas vezes, o CONTEXT do Ciclo 1 e três linhas do plano de 28/06)
# ficam isentas também do termo nu sem que nada pedisse isso. Como a âncora é o
# texto inteiro da linha, isso só alcança aquelas linhas como estão escritas
# hoje: reescrita, a linha sai da isenção nas duas asserções. A fragilidade de
# numeração que este parágrafo também declarava saiu com a TECH-537.
#
# Por que o padrão é CONSTRUÇÃO e não mais um remendo. As rodadas 1, 2 e 3
# acharam cada uma uma forma nova da mesma linha — forma-path, ponto final,
# extensão do lado esquerdo — e as três foram fechadas acrescentando ao padrão
# a forma achada. Isso é enumerar vetor, e enumerar vetor rende um CRÍTICO por
# rodada: medido no head da 3ª, o padrão cobria 80 das 384 formas que a
# asserção dizia cobrir. Duas dimensões independentes faltavam.
#
# (i) SIMETRIA. Os dois ramos não carregavam o mesmo conjunto de documentos nem
# a mesma grafia: à esquerda `(Roadmap|Projeto|Project)` sem `CONTEXT` e sem
# extensão, à direita `CONTEXT` com extensão obrigatória. O mesmo par era pego
# numa ordem e escapava na outra. O `$DOC` é derivado uma vez e usado nos dois.
#
# (ii) MARKUP INLINE. O `SEP` só admitia espaço, então `` `Roadmap.md`, `TODO` ``
# escapava: entre a vírgula e o termo há uma crase. É a forma dominante deste
# repositório — a linha `:198` do plano do Ciclo 1, a ocorrência viva que
# motivou a 4ª rodada, é literalmente ``- [ ] `Projeto.md`, `Roadmap.md`,
# `TODO.md` criados.``. O `[\`*_]*` de cada lado do separador absorve crase,
# negrito e sublinhado adjacentes.
#
# Medido nos dois sentidos, nas 384 formas (4 documentos × 2 grafias × 3
# markups × 8 separadores × 2 ordens): o padrão anterior pegava 80; só a
# simetria levaria a 128, deixando vivas as 256 com markup; só o markup não
# fecharia as formas assimétricas. Juntos, 384/384. Repositório limpo segue
# PASS, e os dois controles da régua — a palavra portuguesa "todo" e o
# placeholder `TODO PROJECT` — seguem sem ser acusados.
SEP=' *[`*_]* *([,/+]|\||&(amp;)?| e | and ) *[`*_]* *'
DOC='(Roadmap|Projeto|Project|CONTEXT)(\.md)?'
rc=0; nu=$(command grep -RnIE "\bTODO\b$SEP$DOC|$DOC$SEP\bTODO\b|core/ *\(TODO|core/TODO\b" . \
  --include='*.md' --include='.gitattributes' --include='*.html' \
  --exclude-dir=.git --exclude-dir=_archive \
  --exclude-dir=node_modules --exclude-dir=audit-reports) || rc=$?
test "$rc" -le 1 || falhou 'asserção 9: a varredura não conseguiu olhar (exit 2)'
rc=0; filtradas=$(printf '%s' "$nu" | command grep -vE "$ALLOWLIST_TODO") || rc=$?
test "$rc" -le 1 || falhou 'asserção 9: o filtro do allowlist não conseguiu olhar (regex inválida?)'
vivas=$(printf '%s' "$filtradas" | command grep -c . || true)
test "$vivas" -eq 0 || falhou "asserção 9: $vivas citação(ões) pelo termo nu ao lado de documento core"

printf 'PASS · as 9 asserções do fecho passam\n'
