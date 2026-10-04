#!/usr/bin/env bash
# test-gates-validate.sh — prova que os gates de `scripts/validate/` REPROVAM.
#
# Por que ele existe: em 14/09/2026 mediu-se que nove defeitos distintos
# atravessaram gates que disseram "ok". A causa comum não foi um gate com a
# regra errada — foi que nenhum deles jamais tinha sido visto reprovando. Gate
# exercido só pelo caminho feliz é indistinguível de gate quebrado: os dois
# saem 0 na árvore saudável, que é a única árvore em que alguém os roda.
#
# A disciplina que pega essa classe já existia no template de origem, em
# `test-fecho-regua.sh`: montar um fixture descartável, quebrá-lo de propósito,
# e FALHAR se o gate aprovar. Este harness generaliza aquele padrão para os
# gates de `scripts/validate/`, que viajam byte a byte para os derivados.
#
# Por que ele confere a razão, e não só o exit code: um fixture mal montado
# reprova pelo motivo errado e o exit code bate igual. O cenário que queria
# medir "rodapé divergente" mede, sem avisar, "camada ausente" — e um gate que
# perdesse a asserção do rodapé continuaria verde aqui. Cada cenário declara o
# ERE da violação que espera, casado contra a saída combinada do gate — e TODO
# cenário declara, o positivo também (TECH-695): um gate que sai 0 por não ter
# olhado nada passaria pelo exit, e cenário sem razão é FAIL. Várias EREs
# separadas por `&&` têm de casar todas, cada uma em alguma linha da saída; é o
# que deixa a razão discriminar quando uma linha só não basta (U2, U3).
#
# Por que ele copia o gate para dentro do fixture e o invoca de lá: os gates não
# resolvem a raiz do mesmo jeito. Os de pareamento e de paridade de UI partem do
# lugar onde o script mora; os de linhagem (desde a 2.16.0), de changelog, do
# teto do `AGENTS.md`, do frontmatter das skills e da regra de comando partem
# do diretório corrente, por `git rev-parse --show-toplevel`. Rodar o script
# versionado daqui faria os primeiros auditarem o repositório REAL e devolverem
# o veredito de sempre. A cópia byte a byte, invocada com o cwd no fixture, põe
# os dois tipos — e o gate novo, seja qual for a regra dele —
# sobre a árvore de mentira.
#
# As quatro classes de cenário:
#   positivo  entrada boa           → o gate aprova (exit 0)
#   negativo  entrada quebrada      → o gate reprova, pela razão declarada
#   lacuna    entrada que DEVERIA reprovar e que o gate aprova hoje
#   limite    entrada fora do alcance que o gate DECLARA no cabeçalho → ele
#             aprova, e a razão confere que ele diz que não olhou
#
# `lacuna` é o registro executável de um buraco já medido e já decidido. O
# harness assevera o comportamento ATUAL e imprime LACUNA em toda rodada, para
# que o buraco não sumia de vista; no dia em que o gate for corrigido, o
# cenário falha e manda atualizar o harness. É o oposto de silenciar: silenciar
# seria não ter o cenário. `limite` é o mesmo registro para o que não é buraco
# a fechar, e sim alcance decidido e escrito no gate (P22, o par isento por
# inteiro): imprime LIMITE em toda rodada, e a razão confere a linha em que o
# gate lista o par isento.
#
# Uso: bash scripts/validate/test-gates-validate.sh [--gate <nome>] [--help]
# Exit codes: 0 = todos os cenários batem; 1 = algum diverge, com relatório
#             item a item; 2 = erro de uso ou de ambiente.

set -euo pipefail

RAIZ_REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
readonly RAIZ_REPO

# Marcador do fixture, propositalmente diferente do que o repositório declara:
# se um gate escapar para a árvore real, o cenário que depende dele diverge em
# vez de passar por acidente.
readonly TEMPLATE_FIXTURE='template-de-fixture'
readonly VERSAO_FIXTURE='9.9.9'

ajuda() {
  cat <<'AJUDA'
test-gates-validate.sh — controle negativo dos gates de `scripts/validate/`.

Propósito
  Monta um fixture descartável por cenário, copia o gate versionado para dentro
  dele, quebra a árvore de propósito e confere DUAS coisas: o exit code e a
  razão pela qual o gate reprovou. Acertar o exit code pela razão errada é FAIL.

Argumentos
  --gate <nome>   roda só os cenários de um gate: linhagem, pareamento,
                  ui-parity, changelog, agents-teto, frontmatter,
                  comandos ou execpolicy. Nome vazio, ou que nenhum
                  cenário usa, é erro de uso (exit 2), e não zero cenário
                  aprovado
  --help, -h      mostra esta ajuda e sai

Exit codes
  0   todos os cenários batem
  1   algum cenário diverge (relatório item a item no stdout)
  2   erro de uso, ou pré-requisito de ambiente ausente

Ambiente
  git no PATH. Os fixtures são repositórios git próprios em mktemp -d, porque
  os gates auditados iteram `git ls-files` e resolvem a raiz por `rev-parse`.
  Os cenários de ui-parity e de comandos pedem python3; os de execpolicy pedem
  o `codex` no PATH, que o CI não tem. Todos pedem que o gate exista neste
  repositório: faltando qualquer um dos dois, os cenários saem como SKIP e
  nunca como PASS — o harness viaja no template e não presume o inventário do
  derivado, mas também não certifica o que não rodou.
AJUDA
}

GATE_FILTRO=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --gate)
      [[ $# -ge 2 && -n "$2" ]] || { printf -- '--gate pede um nome (use --help)\n' >&2; exit 2; }
      GATE_FILTRO="$2"; shift 2 ;;
    --gate=*)
      GATE_FILTRO="${1#*=}"
      [[ -n "$GATE_FILTRO" ]] || { printf -- '--gate pede um nome (use --help)\n' >&2; exit 2; }
      shift ;;
    --help|-h) ajuda; exit 0 ;;
    *) printf 'argumento desconhecido: %s (use --help)\n' "$1" >&2; exit 2 ;;
  esac
done

command -v git >/dev/null 2>&1 || { printf 'git não encontrado no PATH.\n' >&2; exit 2; }

TMP=''
limpar() { [[ -n "$TMP" ]] && rm -rf "$TMP"; }
trap limpar EXIT
TMP=$(mktemp -d)

# ---------------------------------------------------------------------------
# Utilitários de fixture
# ---------------------------------------------------------------------------

semear_git() {
  # Repositório git próprio: os gates resolvem a raiz por `rev-parse` e um deles
  # lê o inventário por `git ls-files`, que enxerga o index — daí o `add` sem
  # commit. A lista de arquivos é explícita porque o repositório proíbe
  # `git add .` e `git add -A`, e a proibição vale também aqui: a lista declara
  # o que o inventário do gate vai enxergar.
  local raiz="$1" f
  local -a arquivos=()
  git -C "$raiz" init -q -b main >/dev/null 2>&1
  while IFS= read -r f; do arquivos+=("${f#./}"); done \
    < <(cd "$raiz" && find . -type f -not -path './.git/*' | sort)
  [[ ${#arquivos[@]} -gt 0 ]] && git -C "$raiz" add -- "${arquivos[@]}"
}

instalar_gate() {
  # $1 = raiz do fixture, $2 = nome do arquivo do gate em scripts/validate/.
  local raiz="$1" gate="$2"
  mkdir -p "$raiz/scripts/validate"
  cp "$RAIZ_REPO/scripts/validate/$gate" "$raiz/scripts/validate/$gate"
}

# ---------------------------------------------------------------------------
# Gate 1 — check-versao-linhagem.sh
# ---------------------------------------------------------------------------
# O silêncio deste gate já custou um PR: ele aprovou uma mudança de regra
# normativa que não subiu a versão. Ele comparava só DUAS DECLARAÇÕES ENTRE SI
# (o marcador de linhagem e o rodapé), e as duas estavam coerentes — e
# coerentemente velhas. O cenário `L8` era esse buraco, registrado como lacuna;
# desde a TECH-695 a regra 4 do gate o reprova, e o cenário é negativo.

montar_linhagem() {
  local raiz="$1"
  mkdir -p "$raiz/.claude" "$raiz/.agents" "$raiz/.codex"

  printf '%s\n' \
    '# Claude Code — Regras do Projeto' \
    '' \
    "Template de origem: $TEMPLATE_FIXTURE@$VERSAO_FIXTURE" \
    '' \
    '## 6. Commit Strategy' \
    '' \
    'Máximo 100 linhas por commit.' \
    '' \
    "**Versão:** $VERSAO_FIXTURE" \
    > "$raiz/.claude/CLAUDE.md"

  # O rodapé desta camada versiona o PRÓPRIO documento, não o template — e é por
  # isso que ele diverge de propósito aqui. Gate que tomasse qualquer rodapé
  # como canônico reprovaria o cenário positivo.
  printf '%s\n' \
    '# .agents/' '' "Template de origem: $TEMPLATE_FIXTURE@$VERSAO_FIXTURE" '' \
    '**Versão:** 1.0.0' \
    > "$raiz/.agents/README.md"

  printf '%s\n' \
    '# .codex/' '' "Template de origem: $TEMPLATE_FIXTURE@$VERSAO_FIXTURE" \
    > "$raiz/.codex/README.md"

  instalar_gate "$raiz" check-versao-linhagem.sh

  # A regra 4 compara o `CLAUDE.md` com o commit que fixou a versão do rodapé:
  # sem um commit de base ela não teria referência e diria que não rodou. A
  # mutação vem depois, na árvore de trabalho, como vem num PR de verdade.
  git -C "$raiz" init -q -b main >/dev/null 2>&1
  git -C "$raiz" add -- .claude/CLAUDE.md .agents/README.md .codex/README.md
  git -C "$raiz" -c user.name=fixture -c user.email=fixture@fixture.invalid \
    -c commit.gpgsign=false commit -q --no-verify -m 'base do fixture' >/dev/null
}

mutar_linhagem() {
  local raiz="$1" cenario="$2"
  case "$cenario" in
    L1) : ;;
    L2) # o rodapé sobe e o marcador fica para trás
        printf '%s\n' \
          '# Claude Code — Regras do Projeto' '' \
          "Template de origem: $TEMPLATE_FIXTURE@$VERSAO_FIXTURE" '' \
          '## 6. Commit Strategy' '' 'Máximo 100 linhas por commit.' '' \
          '**Versão:** 9.10.0' \
          > "$raiz/.claude/CLAUDE.md" ;;
    L3) printf '%s\n' '# .codex/' '' \
          "Template de origem: $TEMPLATE_FIXTURE@9.8.0" \
          > "$raiz/.codex/README.md" ;;
    L4) printf '%s\n' '# .agents/' '' '**Versão:** 1.0.0' \
          > "$raiz/.agents/README.md" ;;
    L5) rm -f "$raiz/.codex/README.md" ;;
    L6) # sem versão após o '@' nas TRÊS camadas: numa só, o gate acusaria
        # divergência entre camadas e o cenário mediria outra asserção
        printf '%s\n' '# Claude Code' '' "Template de origem: $TEMPLATE_FIXTURE" '' \
          "**Versão:** $VERSAO_FIXTURE" > "$raiz/.claude/CLAUDE.md"
        printf '%s\n' '# .agents/' '' "Template de origem: $TEMPLATE_FIXTURE" \
          > "$raiz/.agents/README.md"
        printf '%s\n' '# .codex/' '' "Template de origem: $TEMPLATE_FIXTURE" \
          > "$raiz/.codex/README.md" ;;
    L7) printf '%s\n' '# Claude Code' '' \
          "Template de origem: $TEMPLATE_FIXTURE@$VERSAO_FIXTURE" '' 'Sem rodapé.' \
          > "$raiz/.claude/CLAUDE.md" ;;
    L9) # mesmo defeito do L2 — rodapé sobe, marcador fica para trás —, mas a
        # raiz é um DERIVADO. A regra 3 não se aplica e o gate passa: num
        # derivado o rodapé versiona o CLAUDE.md local, não o template.
        printf '%s\n' \
          '# Claude Code — Regras do Projeto' '' \
          "Template de origem: $TEMPLATE_FIXTURE@$VERSAO_FIXTURE" '' \
          '## 6. Commit Strategy' '' 'Máximo 100 linhas por commit.' '' \
          '**Versão:** 9.10.0' \
          > "$raiz/.claude/CLAUDE.md" ;;
    L8) # regra normativa muda; marcador e rodapé ficam coerentes entre si e
        # velhos em relação ao conteúdo. É o defeito que passou pelo gate.
        printf '%s\n' \
          '# Claude Code — Regras do Projeto' '' \
          "Template de origem: $TEMPLATE_FIXTURE@$VERSAO_FIXTURE" '' \
          '## 6. Commit Strategy' '' 'Máximo 50 linhas por commit.' '' \
          "**Versão:** $VERSAO_FIXTURE" \
          > "$raiz/.claude/CLAUDE.md" ;;
    *) printf 'cenário desconhecido: %s\n' "$cenario" >&2; return 2 ;;
  esac
}

# ---------------------------------------------------------------------------
# Gate 2 — check-pareamento-instrucoes.sh
# ---------------------------------------------------------------------------
# Este gate compara `.claude/skills/` × `.agents/skills/` e nada mais das duas
# famílias (TECH-852). O fixture traz arquivos fora de `skills/`, de uma família
# só e sem exceção, e o P1 passa com eles: é o alcance declarado no cabeçalho.
# P10, P28, P29, P33 e P35 são o controle negativo da regra 5, uma camada
# aposentada por cenário; P34 mostra que em `.agents/rules/` reprova até
# arquivo sem `.md`, e P30 que o `.rules` em `.codex/rules/` não é acusado. O
# P33 traz o par `prompts/` inteiro, e o gate acusa só a cópia `.agents`: a de
# `.claude/prompts/` é a que fica (TECH-894, decisão (a) do Fernando registrada
# na TECH-852 em 02/10/2026).

readonly EXC_PAREAMENTO='scripts/validate/pareamento-instrucoes-excecoes.txt'
readonly COMUNS=('' 'Linha comum às duas camadas, 1.' 'Linha comum às duas camadas, 2.' \
  'Linha comum às duas camadas, 3.' 'Linha comum às duas camadas, 4.' \
  'Linha comum às duas camadas, 5.' 'Linha comum às duas camadas, 6.')

escrever_excecoes() {
  # $1 = raiz; $2.. = linhas extras. As cinco primeiras são o estado saudável: a
  # `divergencia` diz por que o par difere, e os dois `trecho` dizem ONDE, e de
  # que lado — o resto do arquivo segue comparado.
  local raiz="$1"; shift
  printf '%s\n' \
    '# exceções do fixture — tipo | caminho | motivo (ou literal, em trecho e secao)' \
    'solo        | .claude/skills/exemplo/spawn.md  | prompt de spawn que só o Claude Code lê' \
    'solo        | .agents/skills/ui-fluxo/SKILL.md | skill do plugin, que o Claude Code recebe instalado' \
    'divergencia | skills/exemplo/SKILL.md    | runtimes diferentes: cada um cita as ferramentas que tem' \
    'trecho .claude | skills/exemplo/SKILL.md | a skill pelo nome' \
    'trecho .agents | skills/exemplo/SKILL.md | o workflow pelo caminho' \
    "$@" \
    > "$raiz/$EXC_PAREAMENTO"
}

montar_secao() {
  # $1 = raiz, $2 = o parágrafo da seção `## Depois` no lado .agents. A seção
  # `## Ferramentas` é a declarada, e traz um bloco de código com uma linha que
  # parece título: se o gate a lesse como título, a seção acabaria ali e a
  # diferença que vem depois do bloco seria comparada.
  local raiz="$1" lado texto
  for lado in .claude .agents; do
    [[ "$lado" == .claude ]] && texto='Use a ferramenta do Claude Code.' || texto='Use a ferramenta do harness.'
    mkdir -p "$raiz/$lado/skills/secao"
    printf '%s\n' '# Seção' '' '## Ferramentas' '' '```bash' '# comentário, não título' '```' '' \
      "$texto" '' '## Depois' '' 'Texto comum.' "${COMUNS[@]}" > "$raiz/$lado/skills/secao/SKILL.md"
  done
  [[ "$2" == 'Texto comum.' ]] || sed -i.bak -e "s/^Texto comum\.\$/$2/" "$raiz/.agents/skills/secao/SKILL.md"
  rm -f "$raiz/.agents/skills/secao/SKILL.md.bak"
  escrever_excecoes "$raiz" \
    'divergencia | skills/secao/SKILL.md | cada camada nomeia o próprio harness' \
    'secao       | skills/secao/SKILL.md | ## Ferramentas'
}

montar_pareamento() {
  local raiz="$1"
  mkdir -p "$raiz/.claude/rules" "$raiz/.claude/skills/exemplo" "$raiz/.claude/skills/seguranca" \
           "$raiz/.agents/skills/exemplo" "$raiz/.agents/skills/seguranca" \
           "$raiz/.agents/skills/ui-fluxo" "$raiz/.agents/workflows"

  # par idêntico: o caso que o gate deve deixar passar em silêncio
  printf '%s\n' '# Segurança' '' 'Nenhum secret no repositório.' \
    | tee "$raiz/.claude/skills/seguranca/SKILL.md" > "$raiz/.agents/skills/seguranca/SKILL.md"

  # par divergente COM exceção declarada. As linhas comuns existem por causa do
  # piso de texto comparado do gate (50%): com três linhas só, a parte declarada
  # já seria metade do arquivo, e nenhum par real é assim
  printf '%s\n' '# Exemplo' '' 'Invoque a skill pelo nome.' "${COMUNS[@]}" \
    > "$raiz/.claude/skills/exemplo/SKILL.md"
  printf '%s\n' '# Exemplo' '' 'Invoque o workflow pelo caminho.' "${COMUNS[@]}" \
    > "$raiz/.agents/skills/exemplo/SKILL.md"

  # solos COM exceção declarada
  printf '%s\n' '# Spawn' > "$raiz/.claude/skills/exemplo/spawn.md"
  printf '%s\n' '# Fluxo' > "$raiz/.agents/skills/ui-fluxo/SKILL.md"

  # fora do alcance (skills/): uma família só e sem exceção, e o gate não os vê
  printf '%s\n' '{ "permissions": {} }' > "$raiz/.claude/settings.json"
  printf '%s\n' '# Segurança' '' 'Nenhum secret no repositório.' > "$raiz/.claude/rules/seguranca.md"
  printf '%s\n' '# Fluxo' > "$raiz/.agents/workflows/fluxo.md"

  instalar_gate "$raiz" check-pareamento-instrucoes.sh
  escrever_excecoes "$raiz"
}

mutar_pareamento() {
  local raiz="$1" cenario="$2"
  case "$cenario" in
    P1|P9) : ;;
    P2) printf '%s\n' '# Segurança' '' 'Secrets só por variável de ambiente.' \
          > "$raiz/.claude/skills/seguranca/SKILL.md" ;;
    P3) mkdir -p "$raiz/.claude/skills/nova"
        printf '%s\n' '# Skill nova' > "$raiz/.claude/skills/nova/SKILL.md" ;;
    P4) # o par volta a ser idêntico e a exceção `divergencia` fica obsoleta
        cp "$raiz/.claude/skills/exemplo/SKILL.md" "$raiz/.agents/skills/exemplo/SKILL.md" ;;
    P5) # o `solo` deixa de ser solo; conteúdo idêntico para que a única razão
        # de reprovar seja a exceção obsoleta, e não um drift por cima
        printf '%s\n' '# Spawn' > "$raiz/.agents/skills/exemplo/spawn.md" ;;
    P6) escrever_excecoes "$raiz" 'divergencia | skills/seguranca/SKILL.md |' ;;
    P7) escrever_excecoes "$raiz" 'excecao | skills/seguranca/SKILL.md | tipo que não existe' ;;
    P8) escrever_excecoes "$raiz" \
          'divergencia | .claude/skills/seguranca/SKILL.md | prefixo de família onde o gate quer o caminho relativo' ;;
    P10|P28|P29|P34|P35) # uma camada aposentada volta a ter arquivo versionado (regra 5)
        local volta
        case "$cenario" in
          P10) volta='.codex/rules/seguranca.md' ;;
          P28) volta='.codex/skills/exemplo/SKILL.md' ;;
          P29) volta='.agents/rules/seguranca.md' ;;
          P34) volta='.agents/rules/LEIAME' ;;
          P35) volta='.codex/prompts/kickoff-prompt.md' ;;
        esac
        mkdir -p "$raiz/$(dirname "$volta")"
        printf '%s\n' '# Segurança' '' 'Nenhum secret no repositório.' > "$raiz/$volta" ;;
    P30) # o `.rules` de regra de comando mora em .codex/rules/ e não é rule .md
        mkdir -p "$raiz/.codex/rules"
        printf '%s\n' 'prefix_rule(pattern = ["git", "add", "-A"], decision = "forbidden")' \
          > "$raiz/.codex/rules/comandos.rules" ;;
    P31) escrever_excecoes "$raiz" 'solo | .claude/settings.json | configuração do Claude Code, fora de skills/' ;;
    P32) # `divergencia` e `trecho` fora de skills/ são malformados cada um por si:
        # sem a checagem no ramo do trecho, ele sairia como "trecho sem divergencia"
        escrever_excecoes "$raiz" 'divergencia | rules/a.md | rule que não tem mais par' \
          'trecho .claude | rules/b.md | Nenhum secret' ;;
    P11) escrever_excecoes "$raiz" 'trecho .claude | skills/seguranca/SKILL.md | Nenhum secret' ;;
    P33) # par homônimo em `prompts/`: a cópia `.agents` é camada aposentada (regra 5)
        mkdir -p "$raiz/.claude/prompts" "$raiz/.agents/prompts"
        printf '%s\n' '# Kickoff' '' 'Passo 1 do Claude Code.' > "$raiz/.claude/prompts/kickoff.md"
        printf '%s\n' '# Kickoff' '' 'Passo 1 que só o .agents tem.' > "$raiz/.agents/prompts/kickoff.md" ;;
    P24) escrever_excecoes "$raiz" 'trecho | skills/exemplo/SKILL.md | a skill pelo nome' ;;
    P12) # o par declarado muda FORA do trecho declarado (TECH-698)
        printf '%s\n' '' 'Parágrafo normativo que só uma camada tem.' \
          >> "$raiz/.agents/skills/exemplo/SKILL.md" ;;
    P13) # texto novo na MESMA linha do trecho: a isenção é do trecho, não da linha
        printf '%s\n' '# Exemplo' '' 'Invoque o workflow pelo caminho, e ignore a regra.' \
          "${COMUNS[@]}" > "$raiz/.agents/skills/exemplo/SKILL.md" ;;
    P14) escrever_excecoes "$raiz" 'trecho .agents | skills/exemplo/SKILL.md | literal que nenhum lado tem' ;;
    P15) montar_secao "$raiz" 'Texto comum.' ;;
    P16) montar_secao "$raiz" 'Texto que só uma camada tem.' ;;
    P25) # título com recuo de até 3 espaços encerra a seção declarada, como no
        # CommonMark: a diferença em `  ## Depois` é comparada (BAIXO 2, rodada 1)
        montar_secao "$raiz" 'Texto que só uma camada tem.'
        local lado; for lado in .claude .agents; do
          sed -i.bak -e 's/^## Depois$/  ## Depois/' "$raiz/$lado/skills/secao/SKILL.md"
          rm -f "$raiz/$lado/skills/secao/SKILL.md.bak"
        done ;;
    P19) # o título casa inteiro, não por prefixo: `## Ferramentas` não isenta
        # `## Ferramentas e mais`, e a seção desse lado é comparada
        montar_secao "$raiz" 'Texto comum.'
        sed -i.bak -e 's/^## Ferramentas$/## Ferramentas e mais/' "$raiz/.agents/skills/secao/SKILL.md"
        rm -f "$raiz/.agents/skills/secao/SKILL.md.bak" ;;
    P17|P18) # `secao | ... | ---` isenta o frontmatter YAML do topo, e só ele: no
        # P18 o mesmo bloco, do outro lado, começa na linha 2 e é texto comparado
        local s pre=''
        for s in .claude .agents; do
          [[ "$s" == .agents && "$cenario" == P17 ]] && continue
          { printf '%s' "$pre"; printf '%s\n' '---' 'paths:' '  - "src/**/*"' '---' ''
            cat "$raiz/$s/skills/exemplo/SKILL.md"; } > "$raiz/fm.tmp"
          mv "$raiz/fm.tmp" "$raiz/$s/skills/exemplo/SKILL.md"; pre=$'\n'
        done
        escrever_excecoes "$raiz" 'secao | skills/exemplo/SKILL.md | ---' ;;
    P21|P22) # título de nível 1 declarado como seção engole o arquivo inteiro:
        # sem `secao | ... | *` isso é isenção ampla escondida e reprova (P21);
        # declarada com `*`, passa e o gate a lista à parte (P22)
        local lado; for lado in .claude .agents; do
          mkdir -p "$raiz/$lado/skills/indice"
          printf '%s\n' "# Índice $lado" '' "Texto que só $lado tem." > "$raiz/$lado/skills/indice/SKILL.md"
        done
        if [[ "$cenario" == P21 ]]; then
          escrever_excecoes "$raiz" 'divergencia | skills/indice/SKILL.md | um índice por camada' \
            'secao | skills/indice/SKILL.md | # Índice .claude' 'secao | skills/indice/SKILL.md | # Índice .agents'
        else
          escrever_excecoes "$raiz" 'divergencia | skills/indice/SKILL.md | um índice por camada' \
            'secao | skills/indice/SKILL.md | *'
        fi ;;
    P23) # as duas cópias ganham uma linha que, na .claude, cita o texto da .claude;
        # a .agents traz o MESMO texto, que é a troca de camada. Tirado só do lado
        # que o declara, o trecho deixa a cópia .agents diferente e o gate acusa;
        # tirado dos dois lados, as cópias ficariam iguais (MÉDIO 1, rodada 1)
        local lado; for lado in .claude .agents; do
          printf '%s\n' '' 'Use a skill pelo nome.' >> "$raiz/$lado/skills/exemplo/SKILL.md"
        done ;;
    P26) # o mesmo título de nível 1 declarado como seção, agora com frontmatter
        # idêntico nos dois lados: sobra o frontmatter para comparar, o lado não
        # fica vazio, e ainda assim é isenção ampla — reprova pelo piso (MÉDIO 1,
        # rodada 2)
        local lado; for lado in .claude .agents; do
          mkdir -p "$raiz/$lado/skills/indice"
          printf '%s\n' '---' 'name: indice' 'description: índice de fixture' '---' '' \
            "# Índice $lado" '' "Linha 1 de $lado." "Linha 2 de $lado." "Linha 3 de $lado." \
            "Linha 4 de $lado." "Linha 5 de $lado." "Linha 6 de $lado." "Linha 7 de $lado." \
            > "$raiz/$lado/skills/indice/SKILL.md"
        done
        escrever_excecoes "$raiz" 'divergencia | skills/indice/SKILL.md | um índice por camada' \
          'secao | skills/indice/SKILL.md | # Índice .claude' 'secao | skills/indice/SKILL.md | # Índice .agents' ;;
    P27) # fronteira do piso: a seção declarada leva exatamente metade das linhas
        # de texto de cada lado (4 de 8), e o par passa — o piso é "pelo menos 50%"
        local lado; for lado in .claude .agents; do
          mkdir -p "$raiz/$lado/skills/fronteira"
          printf '%s\n' '# Fronteira' '' '## Declarada' '' "Linha de $lado." "Mais uma de $lado." \
            "Outra de $lado." '' '## Depois' '' 'Comum 1.' 'Comum 2.' \
            > "$raiz/$lado/skills/fronteira/SKILL.md"
        done
        escrever_excecoes "$raiz" 'divergencia | skills/fronteira/SKILL.md | uma seção por camada' \
          'secao | skills/fronteira/SKILL.md | ## Declarada' ;;
    P20) # divergencia sem trecho nem secao não isenta mais o par inteiro
        mkdir -p "$raiz/.claude/skills/outra" "$raiz/.agents/skills/outra"
        printf '%s\n' '# Outra' '' 'Versão do Claude Code.' > "$raiz/.claude/skills/outra/SKILL.md"
        printf '%s\n' '# Outra' '' 'Versão cross-client.' > "$raiz/.agents/skills/outra/SKILL.md"
        escrever_excecoes "$raiz" 'divergencia | skills/outra/SKILL.md | motivo sem trecho declarado' ;;
    *) printf 'cenário desconhecido: %s\n' "$cenario" >&2; return 2 ;;
  esac
}

pos_semear_pareamento() {
  # Mutação que precisa ficar FORA do index. O gate itera `git ls-files` e nunca
  # o filesystem (está no cabeçalho dele), porque o workdir do runtime Multica
  # injeta um `.claude/` próprio e varrer o disco contaminaria a comparação. P9 é o
  # controle disso: um drift real, gritante, e invisível para o gate por desenho.
  local raiz="$1" cenario="$2"
  [[ "$cenario" == 'P9' ]] || return 0
  mkdir -p "$raiz/.claude/skills/injetado" "$raiz/.agents/skills/injetado"
  printf '%s\n' '# Não rastreado' '' 'Versão do Claude Code.' \
    > "$raiz/.claude/skills/injetado/SKILL.md"
  printf '%s\n' '# Não rastreado' '' 'Versão cross-client, diferente de propósito.' \
    > "$raiz/.agents/skills/injetado/SKILL.md"
}

# ---------------------------------------------------------------------------
# Gate 3 — validate-ui-parity.sh
# ---------------------------------------------------------------------------
# O cenário `U1` é o que teria pego o defeito que este gate carregava: a raiz do
# repositório era resolvida um nível acima de `scripts/validate/`, parava em
# `scripts/`, e as duas camadas comparadas eram procuradas lá dentro, onde nunca
# existiram. As 13 skills de cada camada apareciam como 0 e o gate reprovava com
# 26 violações fantasma. Nenhum caso positivo jamais o exercitou, e o gate não
# está no `ci.yml`: o falso positivo não quebrou nada e também não apareceu.
#
# Este gate precisa de um manifesto de plugin, que vive num marketplace externo.
# O fixture traz um marketplace mínimo próprio — duas skills — em vez de clonar
# o real: o harness não pode depender de rede, e o que está sob teste é a
# comparação entre camadas, não o conteúdo do marketplace.

readonly MERCADO_FIXTURE='mercado'

skill_fixture() {
  # $1 = caminho do SKILL.md, $2 = valor do campo `name` no frontmatter.
  mkdir -p "$(dirname "$1")"
  printf '%s\n' '---' "name: $2" 'description: skill de fixture' '---' '' '# Fixture' > "$1"
}

montar_ui_parity() {
  local raiz="$1"
  local plugin="$raiz/$MERCADO_FIXTURE/plugins/ui-excellence"

  mkdir -p "$plugin/.claude-plugin"
  printf '%s\n' \
    '{' \
    '  "name": "ui-excellence",' \
    '  "version": "0.0.0-fixture",' \
    '  "skills": [' \
    '    "./skills/_coordinator/",' \
    '    "./skills/foundations/alfa/"' \
    '  ]' \
    '}' \
    > "$plugin/.claude-plugin/plugin.json"

  # `coordinator` é o único nome que não recebe o prefixo: vira `ui-excellence`.
  skill_fixture "$plugin/skills/_coordinator/SKILL.md" 'coordinator'
  skill_fixture "$plugin/skills/foundations/alfa/SKILL.md" 'alfa'

  local nome
  for nome in ui-excellence ui-alfa; do
    skill_fixture "$raiz/.agents/skills/$nome/SKILL.md" "$nome"
  done

  instalar_gate "$raiz" validate-ui-parity.sh
}

mutar_ui_parity() {
  local raiz="$1" cenario="$2"
  case "$cenario" in
    U1) : ;;
    U3) rm -rf "$raiz/.agents/skills/ui-alfa" ;;
    U5) skill_fixture "$raiz/.agents/skills/ui-extra/SKILL.md" 'extra' ;;
    U6) # diretório `ui-*` sem SKILL.md: o gate exige o arquivo, não a pasta.
        # Sem este cenário, trocar a asserção por uma contagem de diretórios
        # passaria despercebida.
        mkdir -p "$raiz/.agents/skills/ui-vazio" ;;
    *) printf 'cenário desconhecido: %s\n' "$cenario" >&2; return 2 ;;
  esac
}

# ---------------------------------------------------------------------------
# Gate 4 — check-changelog-local.sh
# ---------------------------------------------------------------------------
# A §8 definiu o formato das tabelas "Changelog Local" e nenhum gate o cobrava:
# a inversão de datas existia no próprio template e viajou aos derivados
# (medido em 19/09/2026). O fixture é um README com a seção e três linhas boas.

montar_changelog() {
  local raiz="$1"
  instalar_gate "$raiz" check-changelog-local.sh
  mkdir -p "$raiz/.claude/skills"
  cat > "$raiz/.claude/skills/README.md" <<'FIM'
# Skills

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|---|---|---|---|---|
| 2026-09-14 | `abc1234` | — | alfa/SKILL.md | terceira |
| 2026-09-14 | `abc1233` | SYNC-20260914-001 | beta/SKILL.md | segunda, mesmo dia |
| 2026-03-05 | `abc1232` | — | gama/SKILL.md | primeira |

## Outra seção
FIM
}

# Insere o stdin logo antes da primeira linha do README que casa a ERE `$2`. É POSIX awk escrevendo
# um arquivo novo, sem `sed -i` nem `r /dev/stdin`, cuja forma no BSD sed não foi medida. A ERE vai
# por `-v`, que processa escapes: escreva `[|]`, e não `\|`, para o pipe literal.
inserir_antes() {
  local readme="$1"
  cat > "$readme.ins"
  [[ -s "$readme.ins" ]] || { rm -f "$readme.ins"; return 1; }
  awk -v pat="$2" 'NR == FNR { ins = ins $0 "\n"; next } !feito && $0 ~ pat { printf "%s", ins; feito = 1 } { print }' \
    "$readme.ins" "$readme" > "$readme.novo" && mv "$readme.novo" "$readme" && rm -f "$readme.ins"
}

mutar_changelog() {
  local raiz="$1" readme="$raiz/.claude/skills/README.md"
  case "$2" in
    C1) ;;
    C2) printf '| 2026-09-19 | `abc1235` | — | delta/SKILL.md | mais nova no fim |\n' | sed -i.bak -e '/^| 2026-03-05/r /dev/stdin' "$readme" && rm -f "$readme.bak" ;;
    C3) sed -i.bak -e 's/^| 2026-09-14 | `abc1233` | SYNC-20260914-001 | beta\/SKILL.md | segunda, mesmo dia |$/| 2026-09-14 | `abc1233` | beta\/SKILL.md | quatro colunas |/' "$readme" && rm -f "$readme.bak" ;;
    C4) sed -i.bak -e 's/^| 2026-03-05 |/| 05\/03\/2026 |/' "$readme" && rm -f "$readme.bak" ;;
    C5) rm -f "$readme"; mkdir -p "$raiz/.claude/rules"; printf '# Rules\n\nsem tabela\n' > "$raiz/.claude/rules/README.md" ;;
    C6) # fence (crases e tildes) com exemplo antes da tabela real, mais uma segunda tabela na seção: tudo íntegro
        sed -i.bak -e 's/^## Changelog Local$/## Changelog Local\
\
```markdown\
| Data | Commit | Sync-ID | Arquivo | Descrição |\
|---|---|---|---|---|\
| 2026-01-01 | `x` | — | y | exemplo em fence |\
```\
\
~~~\
| 2026-12-31 | `x` | — | y | exemplo em tildes |\
~~~\
/' "$readme" && rm -f "$readme.bak"
        printf '\nOutra tabela:\n\n| Data | Commit | Sync-ID | Arquivo | Descrição |\n|---|---|---|---|---|\n| 2026-08-01 | `abc1236` | — | eps/SKILL.md | segunda tabela |\n' | sed -i.bak -e '/^| 2026-03-05/r /dev/stdin' "$readme" && rm -f "$readme.bak" ;;
    C7) # linha em branco no meio da tabela e, depois dela, uma inversão: a ordem continua sendo cobrada
        printf '\n| 2026-09-19 | `abc1235` | — | delta/SKILL.md | mais nova depois da linha em branco |\n' | sed -i.bak -e '/^| 2026-03-05/r /dev/stdin' "$readme" && rm -f "$readme.bak" ;;
    C8) # fence aberto e nunca fechado ANTES da seção, e uma inversão dentro dela: o gate ainda confere
        sed -i.bak -e 's/^# Skills$/# Skills\
\
```/' "$readme" && rm -f "$readme.bak"
        printf '| 2026-09-19 | `abc1235` | — | delta/SKILL.md | mais nova no fim |\n' | sed -i.bak -e '/^| 2026-03-05/r /dev/stdin' "$readme" && rm -f "$readme.bak" ;;
    C9) sed -i.bak -e '/^| 2026-/d' "$readme" && rm -f "$readme.bak" ;;
    C10) printf '| - | abc | — | a | sem data, hifen simples |\n| 2026-12-31 | `abc1237` | — | zeta/SKILL.md | mais nova depois do falso separador |\n' | sed -i.bak -e '/^| 2026-03-05/r /dev/stdin' "$readme" && rm -f "$readme.bak" ;;
    C11) printf '```\n' | sed -i.bak -e '/^|---|---|---|---|---|$/r /dev/stdin' "$readme" && rm -f "$readme.bak" ;;
    C12) sed -i.bak -e 's/^## Changelog Local$/## Changelog Local\
\
````markdown\
```bash\
| 2026-12-31 | `x` | — | y | exemplo aninhado |\
```\
````\
/' "$readme" && rm -f "$readme.bak" ;;
    C13) # a forma medida no tech-product-template em f432017 (TECH-985): heading, linha em branco, linhas de dados, cabeçalho colado
        printf '| 2026-09-20 | `abc1238` | — | eta/SKILL.md | acima do cabeçalho |\n| 2026-09-20 | `abc1239` | — | teta/SKILL.md | colada ao cabeçalho |\n' \
          | inserir_antes "$readme" '^[|] Data [|]' ;;
    C14) # a linha acima do cabeçalho, separada dele por linha em branco
        printf '| 2026-09-20 | `abc1238` | — | eta/SKILL.md | acima do cabeçalho, com linha em branco |\n\n' \
          | inserir_antes "$readme" '^[|] Data [|]' ;;
    C15) # o limite da regra 6: linha acima do cabeçalho de uma SEGUNDA tabela é lida como dado da primeira
        printf 'Outra tabela:\n\n| 2026-01-10 | `abc1240` | — | iota/SKILL.md | acima do cabeçalho da segunda |\n| Data | Commit | Sync-ID | Arquivo | Descrição |\n|---|---|---|---|---|\n| 2026-08-01 | `abc1241` | — | kapa/SKILL.md | segunda tabela |\n\n' \
          | inserir_antes "$readme" '^## Outra seção$' ;;
  esac
}

# ---------------------------------------------------------------------------
# Gate 5 — check-agents-md-teto.sh
# ---------------------------------------------------------------------------
# O Codex lê o `AGENTS.md` da raiz até 32768 bytes e corta o resto (TECH-803).
# O fixture tem exatamente o teto, escrito com `ã`, que tem dois bytes: um gate
# que contasse caracteres veria metade dos bytes (16384) e aprovaria o A2, que passa do
# teto por um byte só.

montar_agents_teto() {
  local raiz="$1" texto='ã' i
  instalar_gate "$raiz" check-agents-md-teto.sh
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do texto="$texto$texto"; done
  printf '%s' "$texto" > "$raiz/AGENTS.md"
}

mutar_agents_teto() {
  local raiz="$1"
  case "$2" in
    A1) ;;
    A2) printf 'x' >> "$raiz/AGENTS.md" ;;
    A3) rm -f "$raiz/AGENTS.md" ;;
  esac
}

# ---------------------------------------------------------------------------
# Gate 6 — check-skill-frontmatter.sh
# ---------------------------------------------------------------------------
# O Codex não carrega `SKILL.md` cujo frontmatter não começa na linha 1
# (TECH-834). O F2 é o caso real: a linha de proveniência do
# `sync-ui-from-marketplace.sh` antes do `---`. O F3 é o outro caso medido, o
# arquivo sem frontmatter nenhum, posto em `.codex/skills/` para provar que a
# camada aposentada continua varrida. O `notas.md` sem frontmatter ao lado da
# skill boa prova que o gate olha só `SKILL.md`: se olhasse tudo, o F1 reprovaria.
# A comparação literal que o cabeçalho do gate declara vale na linha 1 e no
# fecho. Na linha 1, o F5 mede `---` com CRLF e o F8 `---` com espaço no fim;
# no fecho, o F9 mede o espaço no fim, e o fecho com CRLF não tem cenário. O F8
# fecha o frontmatter logo abaixo, e o F9 abre certo, para que o delimitador
# testado seja o único defeito do fixture.

semear_skill() {
  # $1 = caminho do SKILL.md. Frontmatter aberto na linha 1 e fechado.
  mkdir -p "$(dirname "$1")"
  printf -- '---\nname: %s\ndescription: fixture\n---\n\n# Fixture\n' \
    "$(basename "$(dirname "$1")")" > "$1"
}

montar_frontmatter() {
  local raiz="$1"
  instalar_gate "$raiz" check-skill-frontmatter.sh
  semear_skill "$raiz/.claude/skills/alfa/SKILL.md"
  semear_skill "$raiz/.agents/skills/alfa/SKILL.md"
  semear_skill "$raiz/.agents/skills/beta/SKILL.md"
  printf '# Notas sem frontmatter\n' > "$raiz/.agents/skills/alfa/notas.md"
}

mutar_frontmatter() {
  local raiz="$1" f
  case "$2" in
    F1|F7) ;;
    F2) f="$raiz/.agents/skills/beta/SKILL.md"
        { printf '<!-- synced from dono/marketplace (abc1234) on 2026-04-10 -->\n'; cat "$f"; } > "$f.novo"
        mv "$f.novo" "$f" ;;
    F3) mkdir -p "$raiz/.codex/skills/gama"
        printf '# Skill: gama\n\nSem frontmatter.\n' > "$raiz/.codex/skills/gama/SKILL.md" ;;
    F4) printf -- '---\nname: alfa\ndescription: nunca fechado\n\n# Alfa\n' > "$raiz/.claude/skills/alfa/SKILL.md" ;;
    F5) printf -- '---\r\nname: alfa\r\ndescription: crlf\r\n---\r\n' > "$raiz/.claude/skills/alfa/SKILL.md" ;;
    F6) rm -rf "$raiz/.claude" "$raiz/.agents" ;;
    F8) printf -- '--- \nname: alfa\ndescription: espaco no fim\n---\n' > "$raiz/.claude/skills/alfa/SKILL.md" ;;
    F9) printf -- '---\nname: alfa\ndescription: fecho com espaco\n--- \n' > "$raiz/.claude/skills/alfa/SKILL.md" ;;
  esac
}

pos_semear_frontmatter() {
  # F7: SKILL.md quebrado criado DEPOIS do `add`. O gate itera `git ls-files`
  # e declara que não olha arquivo não rastreado.
  [[ "$2" == 'F7' ]] || return 0
  mkdir -p "$1/.agents/skills/delta"
  printf '<!-- sem frontmatter -->\n# Delta\n' > "$1/.agents/skills/delta/SKILL.md"
}

# ---------------------------------------------------------------------------
# Gate 7 — check-regra-comandos.sh
# ---------------------------------------------------------------------------
# A regra de comando da §6 nasce no Claude e o Codex só a cumpre se a `.rules`
# acompanhar (DL-4 da TECH-852). O fixture copia a `.rules` versionada, para
# que mexer nela sem cobrir a §6 apareça aqui, e monta uma §6 com as armadilhas
# que o gate declara não ler: a "Regra de Ouro" sem crase, um `NUNCA` em crase
# dentro de bloco de código e outro na seção seguinte. Se o gate lesse algum
# dos três, o R1 reprovaria por `git push --force` ou por `rm -rf /`.
#
# A família `execpolicy` não roda o gate: roda o `codex execpolicy check` sobre
# a `.rules` versionada, onde o binário existir, e prova que o teste embutido
# (`not_match`) está vivo. Sem o `codex`, os cenários saem SKIP declarado. Sem a
# `.rules` versionada (derivado que não a tem), as duas famílias saem SKIP: o
# `montar_comandos` copia dela, e o gate reprova sozinho no CI, que é o certo.

montar_comandos() {
  local raiz="$1"
  instalar_gate "$raiz" check-regra-comandos.sh
  mkdir -p "$raiz/.claude" "$raiz/.codex/rules"
  cp "$RAIZ_REPO/.codex/rules/comandos.rules" "$raiz/.codex/rules/comandos.rules"
  cat > "$raiz/.claude/CLAUDE.md" <<'MD'
# Fixture

## 6. Commit Strategy

**"1 task = 1 commit. NUNCA use git add . ou git add -A"**

1. **NUNCA** usar `git add .` ou `git add -A`
2. **SEMPRE** stage arquivos individualmente por task

```text
NUNCA rode `rm -rf /` (exemplo em bloco de código)
```

## 7. Outra seção

1. **NUNCA** usar `git push --force`
MD
}

mutar_comandos() {
  local raiz="$1" md="$1/.claude/CLAUDE.md" rules="$1/.codex/rules/comandos.rules"
  case "$2" in
    R1) ;;
    # `awk` e não `sed` com `\n` na substituição, que o sed do macOS não lê.
    R2) awk '/^2\. \*\*SEMPRE\*\*/ { print "3. **NUNCA** usar `git push --force`" } { print }' "$md" > "$md.novo" && mv "$md.novo" "$md" ;;
    R3) sed 's/decision = "forbidden"/decision = "prompt"/' "$rules" > "$rules.novo" && mv "$rules.novo" "$rules" ;;
    R4) sed 's/justification = "§6 do \.claude\/CLAUDE\.md/justification = "regra de commit/' "$rules" > "$rules.novo" && mv "$rules.novo" "$rules" ;;
    R5) rm -f "$rules" ;;
    R6) sed 's/^## 6\. Commit Strategy/## 5. Commit Strategy/' "$md" > "$md.novo" && mv "$md.novo" "$md" ;;
    R7) sed 's/^1\. \*\*NUNCA\*\* usar .*/1. **NUNCA** usar git add amplo/' "$md" > "$md.novo" && mv "$md.novo" "$md" ;;
    R8) printf 'prefix_rule(pattern = ["git", "add"\n' > "$raiz/.codex/rules/quebrada.rules" ;;
    # O R8 quebra a sintaxe (`SyntaxError`); o R9 mantém a sintaxe e quebra o literal
    # (`ValueError` do `literal_eval`); o R10 mantém os dois e põe um literal que o
    # Python recusa montar, chave de dict não hasheável (`TypeError` do
    # `literal_eval`). Do R11 em diante são as entradas cuja exceção nasce fora do
    # `try` do `literal_eval` (TECH-941), todas com exit 3 e sem traceback: o arquivo
    # que não decodifica (R11), o parser que estoura (R12, R13), o byte nulo com o
    # número da linha (R14), o `pattern` que não é lista (R15, R16) e o symlink que
    # não resolve a um arquivo: pendente, em laço, para diretório e atravessando um
    # arquivo (R17 a R20). O R16 não traz `decision = "forbidden"`: a validação do
    # `pattern` vem antes do filtro do `decision`. O R12b, o R21 e o R22 são `limite`:
    # o `MemoryError()` sem mensagem (o do parser abaixo do 3.12 no R12b, e o injetado
    # no `ast.parse` em qualquer versão no R22) e o errno de ambiente (`EACCES`, R21)
    # saem 1 por desenho.
    R9) printf 'prefix_rule(pattern = ["git", "add", ALGO], decision = "forbidden")\n' > "$raiz/.codex/rules/variavel.rules" ;;
    R10) printf 'prefix_rule(pattern = ["git", "add", {[1]: 2}], decision = "forbidden")\n' > "$raiz/.codex/rules/nao-hasheavel.rules" ;;
    R11) printf 'prefix_rule(pattern = ["git"], decision = "prompt")\n\nprefix_rule(pattern = ["\377"], decision = "forbidden")\n' > "$raiz/.codex/rules/utf8-invalido.rules" ;;
    R12|R12b) python3 -c "print('prefix_rule(pattern = [' + '-' * 100000 + '1])')" > "$raiz/.codex/rules/pilha.rules" ;;
    R13) python3 -c "print('prefix_rule(pattern = [' + '+'.join(['1'] * 100000) + '])')" > "$raiz/.codex/rules/recursao.rules" ;;
    R14) printf 'prefix_rule(pattern = ["git"], decision = "prompt")\nprefix_rule(pattern = ["git"])\000\n' > "$raiz/.codex/rules/nulo.rules" ;;
    R15) printf 'prefix_rule(pattern = 5, decision = "forbidden")\nprefix_rule(pattern = None, decision = "forbidden")\nprefix_rule(pattern = ("git", "add"), decision = "forbidden")\nprefix_rule(pattern = "git add", decision = "forbidden")\nprefix_rule(pattern = {}, decision = "forbidden")\n' > "$raiz/.codex/rules/nao-lista.rules" ;;
    R16) printf 'prefix_rule(pattern = 5)\nprefix_rule(pattern = 5, decision = "prompt")\n' > "$raiz/.codex/rules/nao-lista-sem-forbidden.rules" ;;
    R17) ln -s /nao-existe/pendente.rules "$raiz/.codex/rules/pendente.rules" ;;
    R18) ln -s laco.rules "$raiz/.codex/rules/laco.rules" ;;
    R19) ln -s . "$raiz/.codex/rules/dir.rules" ;;
    R20) ln -s comandos.rules/x "$raiz/.codex/rules/atravessa.rules" ;;
    R21) printf 'prefix_rule(pattern = ["git"], decision = "prompt")\n' > "$raiz/.codex/rules/sem-permissao.rules" ;;
    # R22: o `executar` põe `.injecao-python/` no `PYTHONPATH` quando o fixture a tem, e
    # o python3 importa o `sitecustomize.py` dela ao subir, antes do da distribuição. Só
    # a chamada sobre a `.rules` levanta: do 3.13 em diante o traceback chama o
    # `ast.parse` neste frame, e com a troca global a última linha da saída seria
    # `lost sys.stderr`, e não `MemoryError` (medido em 2026-10-04: 3.13.15 e 3.14.4;
    # do 3.9.25 ao 3.12.14 sai `MemoryError`). Sem a guarda do nome, o R22 diverge do
    # 3.13 em diante. O comando imprime a última linha da saída:
    #   printf 'import ast\nast.parse = lambda *a, **k: (_ for _ in ()).throw(MemoryError())\nraise MemoryError()\n' > t.py; python3 t.py 2>&1 | tail -1
    R22)
      mkdir -p "$raiz/.injecao-python"
      cat > "$raiz/.injecao-python/sitecustomize.py" <<'PY'
import ast

_parse = ast.parse

def _sem_memoria(fonte, filename="<unknown>", *a, **k):
    if str(filename).endswith(".rules"):
        raise MemoryError()
    return _parse(fonte, filename, *a, **k)

ast.parse = _sem_memoria
PY
      ;;
    X1) ;;
    X2) awk '{ print } /^ *"git status",$/ { print "        \"git add -A\"," }' "$rules" > "$rules.novo" && mv "$rules.novo" "$rules" ;;
  esac
}

pos_semear_comandos() {
  # R17 a R20: o `semear_git` lista com `find -type f`, que não vê symlink; os quatro
  # entram no index por aqui, e é o `git ls-files` do gate que os entrega ao `open`.
  # R21: a permissão cai DEPOIS do `add`, que não lê um arquivo sem permissão.
  case "$2" in
    R17) git -C "$1" add -- .codex/rules/pendente.rules ;;
    R18) git -C "$1" add -- .codex/rules/laco.rules ;;
    R19) git -C "$1" add -- .codex/rules/dir.rules ;;
    R20) git -C "$1" add -- .codex/rules/atravessa.rules ;;
    R21) chmod 000 "$1/.codex/rules/sem-permissao.rules" ;;
  esac
}

checar_execpolicy() {
  # $1 = raiz. Imprime "<decisão> <comando>" por comando; sai com o código do
  # `codex` quando ele recusa a política (teste embutido que falhou).
  local raiz="$1" cmd saida rc
  for cmd in 'git add -A' 'git add .' 'git add --all docs/' 'git add arquivo.txt' 'git add .claude/settings.json'; do
    rc=0
    # shellcheck disable=SC2086 # os tokens do comando vão separados, como o Codex os recebe
    saida=$(codex execpolicy check --rules "$raiz/.codex/rules/comandos.rules" $cmd 2>&1) || rc=$?
    if [[ "$rc" -ne 0 ]]; then printf '%s\n' "$saida"; return "$rc"; fi
    case "$saida" in
      *'"decision":"forbidden"}') printf 'forbidden: %s\n' "$cmd" ;;
      '{"matchedRules":[]}')      printf 'sem regra: %s\n' "$cmd" ;;
      *)                          printf 'outra: %s → %s\n' "$cmd" "$saida" ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# Tabela de cenários
# ---------------------------------------------------------------------------
# id | gate | classe | exit esperado | ERE da razão esperada | descrição
CENARIOS=(
  "L1|linhagem|positivo|0|coerente com o rodapé&&idêntico ao do commit [0-9a-f]+, que fixou a versão 9\.9\.9|as três camadas coerentes entre si e com o rodapé"
  "L2|linhagem|negativo|2|suba os dois juntos|rodapé sobe de versão e marcador fica para trás"
  "L3|linhagem|negativo|2|marcador divergente em \.codex/README\.md|marcador diferente numa das camadas"
  "L4|linhagem|negativo|2|sem linha 'Template de origem:' — \.agents/README\.md|camada sem a linha de linhagem"
  "L5|linhagem|negativo|2|camada ausente: \.codex/README\.md|camada inteira ausente"
  "L6|linhagem|negativo|2|marcador sem versão após '@'|marcador sem versão nas três camadas"
  "L7|linhagem|negativo|2|sem rodapé '\*\*Versão:\*\*'|ponto de entrada sem o rodapé canônico"
  "L8|linhagem|negativo|2|mudou depois de [0-9a-f]+, o commit que fixou a versão 9\.9\.9, e a versão não subiu|regra normativa muda, marcador e rodapé coerentes e velhos"
  "L9|linhagem|positivo|0|\(derivado — rodapé e conteúdo × versão não comparados\)|derivado: rodapé divergente NÃO reprova — a regra 3 vale só no canônico"

  "P1|pareamento|positivo|0|íntegro entre \.claude/skills \.agents/skills — 3 exceção\(ões\) declarada\(s\) e em uso; 2 trecho\(s\)|pares idênticos, divergência declarada por trecho, solos declarados e arquivos fora de skills/ sem par"
  "P2|pareamento|negativo|2|DRIFT NÃO DECLARADO|homônimo com conteúdo diferente e sem declaração"
  "P3|pareamento|negativo|2|SOLO NÃO DECLARADO|arquivo numa família só, sem declaração"
  "P4|pareamento|negativo|2|o par voltou a ser byte a byte idêntico|exceção obsoleta: drift declarado que sumiu"
  "P5|pareamento|negativo|2|deixou de ser exclusivo|exceção obsoleta: solo que ganhou par"
  "P6|pareamento|negativo|3|motivo ausente|exceção sem motivo não é auditável"
  "P7|pareamento|negativo|3|tipo desconhecido: 'excecao'|tipo de exceção que não existe"
  "P8|pareamento|negativo|3|usa o caminho relativo à família|divergência declarada com prefixo de família"
  "P9|pareamento|positivo|0|íntegro entre \.claude/skills \.agents/skills — 3 exceção\(ões\) declarada\(s\) e em uso; 2 trecho\(s\)|drift em arquivo não rastreado é invisível por desenho: o gate itera git ls-files"
  "P10|pareamento|negativo|2|CAMADA APOSENTADA +\.codex/rules/seguranca\.md|rule .md versionada em .codex/rules/, camada aposentada na TECH-852"
  "P11|pareamento|negativo|3|'trecho' sem 'divergencia' para o mesmo caminho|trecho sem divergencia não isenta nada"
  "P12|pareamento|negativo|2|DRIFT FORA DO TRECHO|par declarado muda fora do trecho declarado"
  "P13|pareamento|negativo|2|DRIFT FORA DO TRECHO|texto novo na linha do trecho: a isenção é do trecho, não da linha"
  "P14|pareamento|negativo|2|o literal não aparece no lado \.agents|trecho que não casa em nenhum lado é exceção obsoleta"
  "P15|pareamento|positivo|0|3 trecho\(s\) e seção\(ões\)|seção declarada isenta até o próximo título do mesmo nível, e bloco de código não é título"
  "P16|pareamento|negativo|2|DRIFT FORA DO TRECHO|diferença na seção seguinte à declarada"
  "P17|pareamento|positivo|0|3 trecho\(s\) e seção\(ões\)|frontmatter só de um lado, isento por secao ---"
  "P18|pareamento|negativo|2|DRIFT FORA DO TRECHO|bloco --- fora da linha 1 não é frontmatter, e é comparado"
  "P19|pareamento|negativo|2|DRIFT FORA DO TRECHO|secao casa o título inteiro: o mesmo título com texto a mais é comparado"
  "P20|pareamento|negativo|2|DRIFT FORA DO TRECHO|divergencia sem trecho nem secao não isenta o par"
  "P21|pareamento|negativo|2|ISENÇÃO AMPLA NÃO DECLARADA|seção de título nível 1 isenta o arquivo inteiro sem declarar"
  "P22|pareamento|limite|0|1 par\(es\) isento\(s\) por inteiro.*: skills/indice/SKILL\.md$|LIMITE: par isento por inteiro, declarado com secao * — o gate aprova e lista"
  "P23|pareamento|negativo|2|DRIFT FORA DO TRECHO|trecho de um lado que aparece na cópia do outro é comparado"
  "P24|pareamento|negativo|3|'trecho' exige o lado de onde o literal sai|trecho sem a família do lado é arquivo malformado"
  "P25|pareamento|negativo|2|DRIFT FORA DO TRECHO|título com recuo de até 3 espaços encerra a seção declarada"
  "P26|pareamento|negativo|2|ISENÇÃO AMPLA NÃO DECLARADA&&sobra para comparar \.claude 33% \(4 de 12\)|seção de nível 1 com frontmatter que sobra: o resíduo não desarma o piso"
  "P27|pareamento|positivo|0|3 trecho\(s\) e seção\(ões\) de divergência, todos casados|fronteira do piso: exatamente 50% do texto comparado passa"
  "P28|pareamento|negativo|2|CAMADA APOSENTADA +\.codex/skills/exemplo/SKILL\.md|skill versionada em .codex/skills/, camada aposentada na TECH-852"
  "P29|pareamento|negativo|2|CAMADA APOSENTADA +\.agents/rules/seguranca\.md|rule .md versionada em .agents/rules/, camada aposentada na TECH-852"
  "P30|pareamento|positivo|0|íntegro entre \.claude/skills \.agents/skills — 3 exceção\(ões\)|o .rules em .codex/rules/ não é camada aposentada: só o .md reprova"
  "P31|pareamento|negativo|3|caminho fora do alcance do gate \(skills/\): \.claude/settings\.json|solo fora de skills/ é arquivo malformado"
  "P32|pareamento|negativo|3|fora do alcance do gate \(skills/\): rules/a\.md&&fora do alcance do gate \(skills/\): rules/b\.md|divergencia e trecho fora de skills/ são malformados, cada um"
  "P33|pareamento|negativo|2|CAMADA APOSENTADA +\.agents/prompts/kickoff\.md&&1 violação|cópia de prompts/ em .agents/prompts/, camada aposentada na TECH-894; a de .claude/prompts/ não é acusada"
  "P34|pareamento|negativo|2|CAMADA APOSENTADA +\.agents/rules/LEIAME|arquivo sem .md em .agents/rules/: a pasta inteira é aposentada"
  "P35|pareamento|negativo|2|CAMADA APOSENTADA +\.codex/prompts/kickoff-prompt\.md|prompt versionado em .codex/prompts/, camada aposentada na TECH-894"

  "U1|ui-parity|positivo|0|manifest and \.agents/skills/ converge&&\.agents/skills/: 2 skills|manifesto e .agents/ convergem — e .agents/ é procurada na raiz"
  "U3|ui-parity|negativo|2|\.agents/ has 1 ui skills&&Missing in \.agents/skills/: ui-alfa|skill do manifesto não replicada em .agents/"
  "U5|ui-parity|negativo|2|Extra in \.agents/skills/|skill em .agents/ que o manifesto não declara"
  "U6|ui-parity|positivo|0|manifest and \.agents/skills/ converge&&\.agents/skills/: 2 skills|diretório ui-* sem SKILL.md não conta como skill"

  "C1|changelog|positivo|0|íntegra|tabela com 5 colunas, datas ISO, a mais recente primeiro, empate no mesmo dia aceito: a ordem dentro do dia, que a §8 tira dos commits, o gate não confere (ele não vê o git)"
  "C2|changelog|negativo|2|2026-09-19 vem depois de 2026-03-05|linha mais nova acrescentada no fim da tabela"
  "C3|changelog|negativo|2|4 coluna\(s\), esperadas 5|linha com quatro colunas"
  "C4|changelog|negativo|2|primeira coluna não é data ISO|data fora do formato YYYY-MM-DD"
  "C5|changelog|positivo|0|0 tabela|README sem a seção passa por vacuidade"
  "C6|changelog|positivo|0|2 tabela\(s\)|fence de crases e de tildes com exemplos, mais uma segunda tabela na seção: 2 tabelas, tudo íntegro"
  "C7|changelog|negativo|2|2026-09-19 vem depois de 2026-03-05|linha em branco no meio da tabela não reinicia a ordem"
  "C8|changelog|negativo|2|sem tabela conferida|fence desbalanceado antes da seção engole a seção — e a regra 4 acusa, em vez de calar"
  "C9|changelog|positivo|0|0 linha\(s\) conferida|tabela com cabeçalho e separador e ainda sem linha de dados é legítima"
  "C10|changelog|negativo|2|primeira coluna não é data ISO: -|linha de dados que começa com hífen não é separador"
  "C11|changelog|negativo|2|code fence aberto aqui e nunca fechado|fence aberto depois do separador engole linhas de dados — acusado, não calado"
  "C12|changelog|positivo|0|3 linha\(s\) conferida|fence de quatro crases com um de três aninhado é bloco válido e bem fechado: a tabela é conferida"
  "C13|changelog|negativo|2|:5: linha de dados acima do cabeçalho&&:6: linha de dados acima do cabeçalho&&\] 2 violação|heading, linha em branco e duas linhas boas, a última colada ao cabeçalho, a forma do f432017 no tech-product-template: fora da tabela"
  "C14|changelog|negativo|2|:5: linha de dados acima do cabeçalho&&\] 1 violação|linha boa acima do cabeçalho, separada dele por linha em branco: fora da tabela também"
  "C15|changelog|limite|0|2 tabela\(s\) Changelog Local íntegra&&5 linha\(s\) conferida|LIMITE: linha acima do cabeçalho de uma segunda tabela da seção é lida como dado da primeira e passa"

  "A1|agents-teto|positivo|0|AGENTS\.md com 32768 bytes, dentro do teto de 32768|AGENTS.md com exatamente o teto, em caractere de dois bytes"
  "A2|agents-teto|negativo|2|AGENTS\.md com 32769 bytes passa do teto de 32768 em 1 byte|um byte acima do teto reprova pelo teto"
  "A3|agents-teto|positivo|0|sem AGENTS\.md na raiz: nada a medir|sem AGENTS.md passa por vacuidade, e diz que não mediu"

  "F1|frontmatter|positivo|0|3 SKILL\.md conferidos, todos com '---' na linha 1 e outro '---' depois dela|frontmatter na linha 1 nas duas camadas; arquivo que não é SKILL.md não conta"
  "F2|frontmatter|negativo|2|sem '---' na linha 1: \.agents/skills/beta/SKILL\.md \(a linha 1 é: <!-- synced from&&1 de 3 SKILL\.md sem frontmatter válido|linha de proveniência antes do ---, o caso real da TECH-834"
  "F3|frontmatter|negativo|2|sem '---' na linha 1: \.codex/skills/gama/SKILL\.md \(a linha 1 é: # Skill: gama\)&&1 de 4 SKILL\.md|SKILL.md sem frontmatter em .codex/skills/, camada aposentada e ainda varrida"
  "F4|frontmatter|negativo|2|frontmatter aberto na linha 1 e nunca fechado: \.claude/skills/alfa/SKILL\.md|--- na linha 1 sem o --- que fecha"
  "F5|frontmatter|negativo|2|linha 1 é '---' com fim de linha CRLF: \.claude/skills/alfa/SKILL\.md|--- com CRLF reprova, e a razão diz que é o CRLF"
  "F6|frontmatter|positivo|0|nenhum SKILL\.md versionado em \.claude/skills, \.codex/skills ou \.agents/skills: nada a conferir|sem skills passa por vacuidade, e diz que não conferiu"
  "F7|frontmatter|limite|0|3 SKILL\.md conferidos|LIMITE: SKILL.md não rastreado não é olhado — o gate itera git ls-files"
  "F8|frontmatter|negativo|2|sem '---' na linha 1: \.claude/skills/alfa/SKILL\.md \(a linha 1 é: --- \)|--- com espaço no fim reprova, e a razão mostra o espaço: comparação por prefixo deixa de passar"
  "F9|frontmatter|negativo|2|frontmatter aberto na linha 1 e nunca fechado: \.claude/skills/alfa/SKILL\.md|--- com espaço no fim não fecha o frontmatter: o fecho também é comparado literal, e um fecho por prefixo deixa de passar"

  "R1|comandos|positivo|0|2 comando\(s\) da §6 com prefix_rule forbidden em 1 \.rules&&\`git add -A\` \(\.claude/CLAUDE\.md:[0-9]+\) → forbidden|a §6 e a .rules versionada coincidem; sem crase, bloco de código e §7 não contam"
  "R2|comandos|negativo|2|SEM REGRA: \`git push --force\` \(\.claude/CLAUDE\.md:[0-9]+, §6\)&&1 violação|controle negativo: a §6 ganha comando que a .rules não cobre"
  "R3|comandos|negativo|2|SEM REGRA: \`git add \.\`&&SEM REGRA: \`git add -A\`|a regra existe com decision prompt: só forbidden cobre"
  "R4|comandos|negativo|2|SEM CITAÇÃO \.codex/rules/comandos\.rules:[0-9]+|prefix_rule forbidden que não diz de que seção do CLAUDE.md vem"
  "R5|comandos|negativo|2|SEM REGRA: \`git add \.\`.*nenhum \.codex/rules/\*\.rules versionado|sem .rules versionada, a §6 fica sem mecanismo no Codex"
  "R6|comandos|negativo|2|sem a seção '## 6\.'|§6 renumerada: falha fechada, não vacuidade"
  "R7|comandos|negativo|2|não tem comando em crase numa linha NUNCA|§6 sem comando em crase: o gate diz que não sabe o que ler"
  "R8|comandos|negativo|3|MALFORMADO \.codex/rules/quebrada\.rules|.rules que não se lê como chamadas de valores literais"
  "R9|comandos|negativo|3|MALFORMADO \.codex/rules/variavel\.rules:[0-9]+: prefix_rule com valor que não é literal|.rules com variável no pattern: lê-se como Starlark, mas o valor não é literal"
  "R10|comandos|negativo|3|MALFORMADO \.codex/rules/nao-hasheavel\.rules:[0-9]+: prefix_rule com literal que o Python recusa \(.*unhashable type: 'list'|.rules com chave de dict não hasheável no pattern: o literal_eval levanta TypeError, e o gate sai 3 em vez de 1 com traceback (TECH-924)"
  "R11|comandos|negativo|3|MALFORMADO \.codex/rules/utf8-invalido\.rules:3: não é UTF-8 válido \(byte 0xff no deslocamento 77\)|.rules com byte que não é UTF-8 na linha 3: a decodificação levanta UnicodeDecodeError antes do parser, e o gate sai 3 com a linha e o deslocamento (TECH-941)"
  "R12|comandos|negativo|3|MALFORMADO \.codex/rules/pilha\.rules: o parser do python3 estoura \(Parser stack overflowed|.rules que estoura a pilha do parser: MemoryError com a mensagem do parser, python3 >= 3.12 (TECH-941)"
  "R12b|comandos|limite|1|MemoryError|.rules que estoura a pilha do parser abaixo do python3 3.12: MemoryError() sem mensagem, que o gate não distingue de falta de memória e deixa subir com traceback; espelho do SKIP do R12 (limite do cabeçalho, TECH-941)"
  "R13|comandos|negativo|3|MALFORMADO \.codex/rules/recursao\.rules|.rules com soma de 100000 termos: o parser levanta RecursionError, e o gate sai 3; com a pilha do processo maior o parser a lê e o gate sai 3 por valor não literal (TECH-941)"
  "R14|comandos|negativo|3|MALFORMADO \.codex/rules/nulo\.rules:2: byte nulo|.rules com byte nulo na linha 2: a mensagem traz o número da linha, e não o None do SyntaxError (TECH-941)"
  "R15|comandos|negativo|3|MALFORMADO \.codex/rules/nao-lista\.rules:1: prefix_rule com pattern que não é lista \(int\)&&MALFORMADO \.codex/rules/nao-lista\.rules:2: prefix_rule com pattern que não é lista \(NoneType\)&&MALFORMADO \.codex/rules/nao-lista\.rules:3: prefix_rule com pattern que não é lista \(tuple\)&&MALFORMADO \.codex/rules/nao-lista\.rules:4: prefix_rule com pattern que não é lista \(str\)&&MALFORMADO \.codex/rules/nao-lista\.rules:5: prefix_rule com pattern que não é lista \(dict\)|prefix_rule forbidden com pattern 5, None, tupla, string e dict, a mensagem dizendo o tipo, (int), (NoneType), (tuple), (str) e (dict): o laço que monta o padrão levantava TypeError com os dois primeiros, e aceitava os três últimos, que o Codex recusa (TECH-941, TECH-989)"
  "R16|comandos|negativo|3|MALFORMADO \.codex/rules/nao-lista-sem-forbidden\.rules:1: prefix_rule com pattern que não é lista \(int\)&&MALFORMADO \.codex/rules/nao-lista-sem-forbidden\.rules:2: prefix_rule com pattern que não é lista \(int\)|pattern 5 sem decision e com decision prompt: a validação vem antes do filtro do decision, e o Codex 0.147.0 recusa a política inteira, medido em 2026-10-03 com o comando da regra 4 do cabeçalho do gate (TECH-941)"
  "R17|comandos|negativo|3|MALFORMADO \.codex/rules/pendente\.rules: versionado e não se abre&&submódulo \(gitlink\)|.rules versionada que é symlink pendente: o open levantava FileNotFoundError (TECH-941)"
  "R18|comandos|negativo|3|MALFORMADO \.codex/rules/laco\.rules: versionado e não se abre|.rules versionada que é symlink para si mesma: o open levantava OSError com errno ELOOP (TECH-941)"
  "R19|comandos|negativo|3|MALFORMADO \.codex/rules/dir\.rules: versionado e não se abre|.rules versionada que é symlink para diretório: o open levantava IsADirectoryError, errno EISDIR (TECH-941)"
  "R20|comandos|negativo|3|MALFORMADO \.codex/rules/atravessa\.rules: versionado e não se abre|.rules versionada que é symlink atravessando um arquivo: o open levantava NotADirectoryError, errno ENOTDIR (TECH-941)"
  "R21|comandos|limite|1|PermissionError|.rules sem permissão de leitura: errno de ambiente sobe com traceback e não vira arquivo malformado (limite do cabeçalho; SKIP como root, que lê o arquivo, TECH-941)"
  "R22|comandos|limite|1|^MemoryError$&&in _sem_memoria|MemoryError() sem argumentos injetado no ast.parse por um sitecustomize.py, em qualquer versão do python3: o gate o trata como falta de memória do ambiente e o deixa subir com traceback; mede no CI o ramo que o R12b só mede abaixo do 3.12 (limite do cabeçalho, TECH-989)"

  "X1|execpolicy|positivo|0|forbidden: git add -A&&forbidden: git add \.$&&forbidden: git add --all docs/&&sem regra: git add arquivo\.txt&&sem regra: git add \.claude/settings\.json|codex execpolicy: os amplos são forbidden, o stage por arquivo não"
  "X2|execpolicy|negativo|1|failed to parse policy&&expected example to not match|codex execpolicy: not_match que casa derruba a política (o teste embutido está vivo)"
)

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

montar() {
  case "$2" in
    linhagem)   montar_linhagem "$1" ;;
    pareamento) montar_pareamento "$1" ;;
    ui-parity)  montar_ui_parity "$1" ;;
    changelog)  montar_changelog "$1" ;;
    agents-teto) montar_agents_teto "$1" ;;
    frontmatter) montar_frontmatter "$1" ;;
    comandos|execpolicy) montar_comandos "$1" ;;
    *) printf 'gate sem montagem: %s\n' "$2" >&2; return 2 ;;
  esac
}

mutar() {
  case "$2" in
    linhagem)   mutar_linhagem "$1" "$3" ;;
    pareamento) mutar_pareamento "$1" "$3" ;;
    ui-parity)  mutar_ui_parity "$1" "$3" ;;
    changelog)  mutar_changelog "$1" "$3" ;;
    agents-teto) mutar_agents_teto "$1" "$3" ;;
    frontmatter) mutar_frontmatter "$1" "$3" ;;
    comandos|execpolicy) mutar_comandos "$1" "$3" ;;
    *) printf 'gate sem mutação: %s\n' "$2" >&2; return 2 ;;
  esac
}

pos_semear() {
  # Mutações que precisam ficar fora do index — a maioria dos gates não tem.
  case "$2" in
    pareamento) pos_semear_pareamento "$1" "$3" ;;
    frontmatter) pos_semear_frontmatter "$1" "$3" ;;
    comandos) pos_semear_comandos "$1" "$3" ;;
    *) return 0 ;;
  esac
}

arquivo_do_gate() {
  case "$1" in
    linhagem)   printf 'check-versao-linhagem.sh' ;;
    pareamento) printf 'check-pareamento-instrucoes.sh' ;;
    ui-parity)  printf 'validate-ui-parity.sh' ;;
    changelog)  printf 'check-changelog-local.sh' ;;
    agents-teto) printf 'check-agents-md-teto.sh' ;;
    frontmatter) printf 'check-skill-frontmatter.sh' ;;
    comandos|execpolicy) printf 'check-regra-comandos.sh' ;;
    *) return 1 ;;
  esac
}

executar() {
  # $1 = raiz, $2 = gate. Devolve o exit code; saída combinada em $raiz/saida.
  local raiz="$1" gate="$2" script rc=0
  local -a args=()
  script=$(arquivo_do_gate "$gate")
  # Sem o caminho explícito, o gate de paridade clona o marketplace real do
  # GitHub: o harness passaria a depender de rede e a medir o conteúdo de
  # outro repositório.
  [[ "$gate" == 'ui-parity' ]] && args=(--marketplace-path "$raiz/$MERCADO_FIXTURE")
  if [[ "$gate" == 'execpolicy' ]]; then
    checar_execpolicy "$raiz" > "$raiz/saida" 2>&1 || rc=$?
    return "$rc"
  fi
  # O `env` só leva o `PYTHONPATH` quando o fixture traz `.injecao-python/` (R22).
  local -a ambiente=()
  [[ -d "$raiz/.injecao-python" ]] && ambiente=(PYTHONPATH="$raiz/.injecao-python")
  # `${args[@]+...}` e não `"${args[@]}"`: antes da 4.4 o bash trata array vazio
  # como variável não definida, e sob `set -u` o `/bin/bash` 3.2 do macOS
  # abortava aqui todo cenário fora do `ui-parity` (TECH-489).
  ( cd "$raiz" && env ${ambiente[@]+"${ambiente[@]}"} bash "scripts/validate/$script" ${args[@]+"${args[@]}"} ) \
    > "$raiz/saida" 2>&1 || rc=$?
  return "$rc"
}

# O gate de paridade lê o manifesto com python3. Sem ele, os cenários não são
# reprovados — são declarados não rodados, porque um cenário que não roda não
# tem veredito e contá-lo como PASS seria exatamente o vício que este harness
# existe para tirar do repositório. O mesmo vale para um gate que o derivado
# não tenha: o harness viaja no template e não pode presumir o inventário de lá.
TEM_PYTHON3=1
command -v python3 >/dev/null 2>&1 || TEM_PYTHON3=0

pular_cenario() {
  # $1 = gate, $2 = id do cenário. Devolve a razão de pular, ou nada se o cenário deve rodar.
  local gate="$1" script
  script=$(arquivo_do_gate "$gate")
  [[ -f "$RAIZ_REPO/scripts/validate/$script" ]] || { printf 'gate ausente'; return 0; }
  [[ "$gate" == 'ui-parity' && "$TEM_PYTHON3" -eq 0 ]] && { printf 'python3 ausente'; return 0; }
  [[ "$gate" == 'comandos' && "$TEM_PYTHON3" -eq 0 ]] && { printf 'python3 ausente'; return 0; }
  # R12 e R12b: no 3.11.16 o estouro de pilha do parser é um `MemoryError()` sem
  # mensagem, e o Revisor mediu o mesmo no 3.9.25 e no 3.10.21 (2026-10-03, comando no
  # cabeçalho do gate), que não o distingue de falta de memória. Por isso o R12 mede o
  # exit 3 só do 3.12 em diante e sai SKIP declarado abaixo disso, nunca PASS; o R12b
  # é o espelho, mede o exit 1 abaixo do 3.12 e sai SKIP do 3.12 em diante. O R22 mede
  # o mesmo exit 1 em toda versão, com o `MemoryError()` injetado (TECH-989).
  [[ "$2" == 'R12' && "$TEM_PYTHON3" -eq 1 ]] && ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 12))' && { printf 'python3 < 3.12'; return 0; }
  [[ "$2" == 'R12b' && "$TEM_PYTHON3" -eq 1 ]] && ! python3 -c 'import sys; sys.exit(sys.version_info >= (3, 12))' && { printf 'python3 >= 3.12'; return 0; }
  # R21: o root lê um arquivo sem permissão de leitura, e o cenário não teria o que medir.
  [[ "$2" == 'R21' && "$(id -u)" -eq 0 ]] && { printf 'root lê o arquivo'; return 0; }
  [[ "$gate" == 'comandos' || "$gate" == 'execpolicy' ]] && { [[ -f "$RAIZ_REPO/.codex/rules/comandos.rules" ]] || { printf 'sem .rules'; return 0; }; }
  [[ "$gate" == 'execpolicy' ]] && ! command -v codex >/dev/null 2>&1 && { printf 'codex ausente'; return 0; }
  return 0
}

# Um --gate que nenhum cenário usa rodaria zero cenário e sairia 0 com "Os 0
# cenários batem": erro de digitação aprovado como controle negativo. A lista
# de nomes válidos sai da própria CENARIOS, para não haver uma segunda lista a
# manter em dia.
if [[ -n "$GATE_FILTRO" ]]; then
  gate_conhecido=0
  for linha in "${CENARIOS[@]}"; do
    IFS='|' read -r _ gate _ <<<"$linha"
    if [[ "$gate" == "$GATE_FILTRO" ]]; then
      gate_conhecido=1
      break
    fi
  done
  if [[ "$gate_conhecido" -eq 0 ]]; then
    printf -- '--gate %s: nenhum cenário usa esse nome (use --help)\n' "$GATE_FILTRO" >&2
    exit 2
  fi
fi

falhas=0
rodados=0
lacunas=0
limites=0
pulados=0

for linha in "${CENARIOS[@]}"; do
  IFS='|' read -r id gate classe quero ere desc <<<"$linha"
  [[ -n "$GATE_FILTRO" && "$GATE_FILTRO" != "$gate" ]] && continue

  razao_pular=$(pular_cenario "$gate" "$id")
  if [[ -n "$razao_pular" ]]; then
    pulados=$((pulados + 1))
    printf 'SKIP    %-4s %-11s %-16s %s\n' "$id" "$gate" "$razao_pular" "$desc"
    continue
  fi

  # A ordem importa: a mutação vem ANTES da semeadura porque o gate de
  # pareamento lê o index, e um arquivo criado depois do `add` seria invisível
  # para ele — um cenário negativo que nasce sem dentes. `pos_semear` é a
  # exceção deliberada, para o cenário que mede justamente essa invisibilidade.
  # O basename da raiz decide se o gate de linhagem trata o fixture como o
  # template CANÔNICO: desde a correção (b) de 2026-09-15, no cabeçalho do gate,
  # a regra 3 (marcador × rodapé) vale só lá, porque num derivado o rodapé
  # versiona o `CLAUDE.md` local, que é outro eixo. Por isso a raiz nasce com o
  # nome do template — e o L9, que mede justamente a regra sendo pulada, é a
  # exceção nomeada.
  if [[ "$id" == "L9" ]]; then
    raiz="$TMP/$id/derivado-de-fixture"
  else
    raiz="$TMP/$id/$TEMPLATE_FIXTURE"
  fi
  mkdir -p "$raiz"
  montar "$raiz" "$gate"
  mutar "$raiz" "$gate" "$id"
  semear_git "$raiz"
  pos_semear "$raiz" "$gate" "$id"

  obtido=0
  executar "$raiz" "$gate" || obtido=$?
  rodados=$((rodados + 1))

  # Todo cenário declara a razão; sem ela, o exit 0 de um gate que não olhou
  # nada contaria como PASS. Partes separadas por `&&` casam todas.
  razao_bate=1; nao_casou="$ere"; resto="$ere"
  [[ -z "$ere" ]] && razao_bate=0
  while [[ -n "$resto" ]]; do
    parte="${resto%%&&*}"
    [[ "$resto" == *'&&'* ]] && resto="${resto#*&&}" || resto=''
    grep -qE -- "$parte" "$raiz/saida" || { razao_bate=0; nao_casou="$parte"; break; }
  done

  if [[ "$obtido" -eq "$quero" && "$razao_bate" -eq 1 ]]; then
    case "$classe" in
      lacuna)
        lacunas=$((lacunas + 1))
        printf 'LACUNA  %-4s %-11s exit %s  %s\n' "$id" "$gate" "$obtido" "$desc" ;;
      limite)
        limites=$((limites + 1))
        printf 'LIMITE  %-4s %-11s exit %s  %s\n' "$id" "$gate" "$obtido" "$desc" ;;
      *)
        printf 'PASS    %-4s %-11s exit %s  %s\n' "$id" "$gate" "$obtido" "$desc" ;;
    esac
  else
    falhas=$((falhas + 1))
    printf 'FAIL    %-4s %-11s exit %s (esperado %s)  %s\n' \
      "$id" "$gate" "$obtido" "$quero" "$desc"
    if [[ -z "$ere" ]]; then
      printf '        cenário sem razão declarada: todo cenário declara o ERE que o faz passar\n'
    elif [[ "$razao_bate" -eq 0 ]]; then
      printf '        razão esperada (ERE): %s\n' "$nao_casou"
      printf '        não casou em nenhuma linha da saída do gate:\n'
      sed 's/^/          /' "$raiz/saida"
    fi
    if [[ "$classe" == 'lacuna' ]]; then
      printf '        este cenário registra uma LACUNA conhecida. Se o gate passou\n'
      printf '        a reprová-la, a lacuna foi fechada: reclassifique o cenário\n'
      printf '        como negativo, com o ERE da razão, em vez de removê-lo.\n'
    fi
    if [[ "$classe" == 'limite' ]]; then
      printf '        este cenário registra um LIMITE DE DESENHO declarado no gate. Se\n'
      printf '        o gate passou a reprová-lo, o alcance mudou: reclassifique como\n'
      printf '        negativo, com o ERE da razão, e tire o limite do cabeçalho.\n'
    fi
  fi
done

printf '\n'
if [[ "$falhas" -ne 0 ]]; then
  printf '%s de %s cenários divergem.\n' "$falhas" "$rodados"
  exit 1
fi
printf 'Os %s cenários batem (%s lacuna(s) conhecida(s) e ainda aberta(s), %s limite(s) de desenho declarado(s)' \
  "$rodados" "$lacunas" "$limites"
[[ "$pulados" -gt 0 ]] && printf ', %s não rodado(s)' "$pulados"
printf ').\n'
