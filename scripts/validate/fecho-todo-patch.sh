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
  Isenção é propriedade de LINHA, nunca de arquivo nem de diretório, e cada
  entrada declara `arquivo:linha` e a razão daquela linha. Ver os blocos
  ALLOWLIST_* abaixo.

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

# --- Allowlist da asserção 4 (caminho do diretório apagado) -----------------
# `.claude/skills/README.md:523` e `.agents/skills/README.md:567` — entrada de
# Changelog Local de 2026-09-02 que registra a propagação `SYNC-20260805-005`;
# o caminho aparece ali como o que a adaptação local citava naquela data. É
# registro histórico datado, e §9.7 da régua proíbe apagá-lo para o gate passar.
ALLOWLIST_CAMINHO='^\./\.(claude|agents)/skills/README\.md:(523|567):'

# --- Allowlist da asserção 6 (`TODO.md`) ------------------------------------
# `.claude/skills/README.md:524-525` e `.agents/skills/README.md:568-569` —
#     Changelog Local: a entrada da TECH-209, reescrita para declarar a
#     divergência encerrada, e a entrada desta migração. Ambas precisam nomear
#     o arquivo para que o registro diga o que saiu.
# `documents/core/Roadmap.md:135` — critério de DoD do SP0, riscado e anotado
#     com a data da revogação. Foi verdade na data; apagar seria editar o DoD.
# `.planning/ciclo-1-fundacao/CONTEXT.md:14` — diário de rodadas do PR-0, que
#     registra que aquele PR criou o arquivo. Fato datado.
# `documents/superpowers/plans/2026-06-28-ciclo1-selfhost-foundation.md:124`,
#     `:157`, `:167`, `:198`, `:632`, `:700` — plano de implementação do Ciclo
#     1, de 28/06/2026, ciclo já encerrado. Três delas (`:167`, `:198`, `:700`)
#     são checkbox `- [ ]` nunca marcado; `:632` é célula de status `[ ]` numa
#     tabela, não item de lista — mesma leitura, outra forma; `:124` e `:157`
#     são prosa. O artefato que descrevem foi criado na época e depois
#     aposentado por esta própria migração (TECH-220) — o checkbox aberto não é
#     pendência viva, é o registro de um plano de ciclo fechado. Plano
#     histórico não se reescreve; o equivalente na origem são os
#     `.claude/plans/`, que a iniciativa declarou fora de escopo.
ALLOWLIST_TODO='^\./\.(claude|agents)/skills/README\.md:(524|525|568|569):|^\./documents/core/Roadmap\.md:135:|^\./\.planning/ciclo-1-fundacao/CONTEXT\.md:14:|^\./documents/superpowers/plans/2026-06-28-ciclo1-selfhost-foundation\.md:(124|157|167|198|632|700):'

# --- Allowlist da asserção 7 (nome do tipo) ---------------------------------
# `.claude/skills/generate-session-prompt/SKILL.md:654`, `:675` e os pares em
#     `.agents/` — Changelog Local da própria skill, em paridade byte a byte
#     com a v4.0.0 do template. Corrigir aqui cria drift com a origem; se a
#     linha estiver errada, o conserto é upstream.
# `.claude/skills/claude-design-flow/SKILL.md:131`,
#     `references/reconciliacao.md:50`, `references/etapa-5-hifi.md:29` e os
#     pares em `.agents/` — homônimo de domínio: ali a palavra quer dizer diff
#     de design voltando do canvas, não tipo de iniciativa.
# `.claude/rules/testing-requirements.md:196`, `:205`, `:223`, `:323`, `:419`
#     e os pares em `.agents/` (`:189`, `:198`, `:216`, `:316`, `:412`) —
#     homônimo de código: `unittest.mock.patch` e o pacote `pytest-mock`.
# `.claude/skills/README.md:523`, `:525` e `.agents/skills/README.md:567`,
#     `:569` — Changelog Local: a entrada de 02/09 é histórica, e a desta
#     migração cita o nome deste script.
# `documents/core/Projeto.md:620` — `MAJOR.MINOR.PATCH`, o versionamento
#     semântico do documento.
# `scripts/INDEX.md:21` — a entrada de índice deste próprio gate: o nome do
#     arquivo é prescrito pelo critério de aceite da TECH-220 e carrega o termo.
#     Auto-casamento, não vocabulário vivo. O caminho do script não entra por
#     `--exclude-dir`: cegar `scripts/` inteiro trocaria um auto-casamento por
#     um ponto cego num diretório real deste repositório.
ALLOWLIST_TIPO='^\./scripts/INDEX\.md:21:|^\./\.(claude|agents)/skills/generate-session-prompt/SKILL\.md:(654|675):|^\./\.(claude|agents)/skills/claude-design-flow/SKILL\.md:131:|^\./\.(claude|agents)/skills/claude-design-flow/references/reconciliacao\.md:50:|^\./\.(claude|agents)/skills/claude-design-flow/references/etapa-5-hifi\.md:29:|^\./\.claude/rules/testing-requirements\.md:(196|205|223|323|419):|^\./\.agents/rules/testing-requirements\.md:(189|198|216|316|412):|^\./\.(claude|agents)/skills/README\.md:(523|525|567|569):|^\./documents/core/Projeto\.md:620:'

falhou() { printf 'FAIL · %s\n' "$1" >&2; exit 1; }

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
vivas=$(printf '%s' "$caminho" | command grep -vE "$ALLOWLIST_CAMINHO" | command grep -c . || true)
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
vivas=$(printf '%s' "$todos" | command grep -vE "$ALLOWLIST_TODO" | command grep -c . || true)
test "$vivas" -eq 0 || falhou "asserção 6: $vivas citação(ões) viva(s) de TODO.md fora do allowlist"

# --- 7. Nenhum texto vivo cita o nome do tipo fora do allowlist --------------
rc=0; tipo=$(command grep -RniIE '\bpatch(es)?\b' . \
  --include='*.md' --include='.gitattributes' --include='*.html' \
  --exclude-dir=.git --exclude-dir=_archive \
  --exclude-dir=node_modules --exclude-dir=audit-reports) || rc=$?
test "$rc" -le 1 || falhou 'asserção 7: a varredura não conseguiu olhar (exit 2)'
vivas=$(printf '%s' "$tipo" | command grep -vE "$ALLOWLIST_TIPO" | command grep -c . || true)
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
# ser o allowlist — que as nomeia por `arquivo:linha` — em vez de um recorte de
# padrão que, para isentá-las, isentava junto todo ponto final.
#
# Custo aceito e declarado, em duas dimensões. Fragilidade de numeração: a
# asserção 9 herda o allowlist ancorado em `arquivo:linha` (§9.5 da régua), que
# tem endereço próprio na TECH-512 e não se conserta aqui. E alcance: o filtro
# isenta as 12 âncoras do `ALLOWLIST_TODO`, das quais o vetor com extensão
# precisava de 6 — as outras 6 (skills README duas vezes, o CONTEXT do Ciclo 1
# e três linhas do plano de 28/06) passaram a ficar isentas também do termo nu
# sem que nada pedisse isso. Efeito medido hoje: nulo, nenhuma delas cita o
# termo nu. É ponto cego latente, não erro ativo, e some junto com a TECH-512.
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
vivas=$(printf '%s' "$nu" | command grep -vE "$ALLOWLIST_TODO" | command grep -c . || true)
test "$vivas" -eq 0 || falhou "asserção 9: $vivas citação(ões) pelo termo nu ao lado de documento core"

printf 'PASS · as 9 asserções do fecho passam\n'
