#!/usr/bin/env bash
# test-gates-validate.sh — prova que os gates de `scripts/validate/` REPROVAM.
#
# Por que ele existe: em 14/09/2026 mediu-se que nove defeitos distintos
# atravessaram gates que disseram "ok". A causa comum não foi um gate com a
# regra errada — foi que nenhum deles jamais tinha sido visto reprovando. Gate
# exercido só pelo caminho feliz é indistinguível de gate quebrado: os dois
# saem 0 na árvore saudável, que é a única árvore em que alguém os roda.
#
# A disciplina que pega essa classe já existia neste repositório, em
# `test-fecho-regua.sh`: montar um fixture descartável, quebrá-lo de propósito,
# e FALHAR se o gate aprovar. Este harness generaliza aquele padrão para os
# gates que o repositório roda contra si mesmo.
#
# Por que ele confere a razão, e não só o exit code: um fixture mal montado
# reprova pelo motivo errado e o exit code bate igual. O cenário que queria
# medir "rodapé divergente" mede, sem avisar, "camada ausente" — e um gate que
# perdesse a asserção do rodapé continuaria verde aqui. Cada cenário declara o
# ERE da violação que espera, casado contra a saída combinada do gate.
#
# Por que ele copia o gate para dentro do fixture: os gates resolvem a raiz do
# repositório a partir do próprio caminho (`dirname "$0"`). Rodar o script
# versionado com o cwd no fixture faria ele auditar o repositório REAL e
# devolver o veredito de sempre. A cópia byte a byte é o que põe o gate de
# verdade sobre a árvore de mentira.
#
# As três classes de cenário:
#   positivo  entrada boa           → o gate aprova (exit 0)
#   negativo  entrada quebrada      → o gate reprova, pela razão declarada
#   lacuna    entrada que DEVERIA reprovar e que o gate aprova hoje
#
# `lacuna` é o registro executável de um buraco já medido e já decidido. O
# harness assevera o comportamento ATUAL e imprime LACUNA em toda rodada, para
# que o buraco não sumia de vista; no dia em que o gate for corrigido, o
# cenário falha e manda atualizar o harness. É o oposto de silenciar: silenciar
# seria não ter o cenário.
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
                  ui-parity ou changelog
  --help, -h      mostra esta ajuda e sai

Exit codes
  0   todos os cenários batem
  1   algum cenário diverge (relatório item a item no stdout)
  2   erro de uso, ou pré-requisito de ambiente ausente

Ambiente
  git no PATH. Os fixtures são repositórios git próprios em mktemp -d, porque
  os gates auditados iteram `git ls-files` e resolvem a raiz por `rev-parse`.
  Os cenários de ui-parity pedem python3, e todos pedem que o gate exista neste
  repositório: faltando qualquer um dos dois, os cenários saem como SKIP e
  nunca como PASS — o harness viaja no template e não presume o inventário do
  derivado, mas também não certifica o que não rodou.
AJUDA
}

GATE_FILTRO=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --gate)    GATE_FILTRO="${2:-}"; shift 2 ;;
    --gate=*)  GATE_FILTRO="${1#*=}"; shift ;;
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
# normativa que não subiu a versão. Ele compara DUAS DECLARAÇÕES ENTRE SI (o
# marcador de linhagem e o rodapé), e as duas estavam coerentes — e coerentemente
# velhas. O cenário `L8` é esse buraco, escrito como cenário.

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
# Este gate vigia `.claude/` e `.agents/`. A camada `.codex/` está fora do array
# de famílias, e o cenário `P10` mede o tamanho disso: um drift em `.codex/`
# passa. Não é bug de implementação — é o alcance declarado do gate, e estendê-lo
# é decisão de quem governa o desenho das camadas, não deste harness. O cenário
# existe para que o buraco tenha número e não dependa de alguém lembrar dele.

readonly EXC_PAREAMENTO='scripts/validate/pareamento-instrucoes-excecoes.txt'

escrever_excecoes() {
  # $1 = raiz; $2.. = linhas extras. As três primeiras são o estado saudável.
  local raiz="$1"; shift
  printf '%s\n' \
    '# exceções do fixture — tipo | caminho | motivo' \
    'solo        | .claude/settings.json      | configuração exclusiva do Claude Code' \
    'solo        | .agents/workflows/fluxo.md | workflows são superfície só do cross-client' \
    'divergencia | skills/exemplo/SKILL.md    | runtimes diferentes: cada um cita as ferramentas que tem' \
    "$@" \
    > "$raiz/$EXC_PAREAMENTO"
}

montar_pareamento() {
  local raiz="$1"
  mkdir -p "$raiz/.claude/rules" "$raiz/.claude/skills/exemplo" \
           "$raiz/.agents/rules" "$raiz/.agents/skills/exemplo" \
           "$raiz/.agents/workflows" "$raiz/.codex/rules"

  # par idêntico: o caso que o gate deve deixar passar em silêncio
  printf '%s\n' '# Segurança' '' 'Nenhum secret no repositório.' \
    | tee "$raiz/.claude/rules/seguranca.md" > "$raiz/.agents/rules/seguranca.md"

  # par divergente COM exceção declarada
  printf '%s\n' '# Exemplo' '' 'Invoque a skill pelo nome.' \
    > "$raiz/.claude/skills/exemplo/SKILL.md"
  printf '%s\n' '# Exemplo' '' 'Invoque o workflow pelo caminho.' \
    > "$raiz/.agents/skills/exemplo/SKILL.md"

  # solos COM exceção declarada
  printf '%s\n' '{ "permissions": {} }' > "$raiz/.claude/settings.json"
  printf '%s\n' '# Fluxo' > "$raiz/.agents/workflows/fluxo.md"

  # terceira camada, fora do alcance do gate — ver P10
  printf '%s\n' '# Segurança' '' 'Nenhum secret no repositório.' \
    > "$raiz/.codex/rules/seguranca.md"

  instalar_gate "$raiz" check-pareamento-instrucoes.sh
  escrever_excecoes "$raiz"
}

mutar_pareamento() {
  local raiz="$1" cenario="$2"
  case "$cenario" in
    P1|P9) : ;;
    P2) printf '%s\n' '# Segurança' '' 'Secrets só por variável de ambiente.' \
          > "$raiz/.claude/rules/seguranca.md" ;;
    P3) printf '%s\n' '# Regra nova' > "$raiz/.claude/rules/nova.md" ;;
    P4) # o par volta a ser idêntico e a exceção `divergencia` fica obsoleta
        printf '%s\n' '# Exemplo' '' 'Invoque a skill pelo nome.' \
          > "$raiz/.agents/skills/exemplo/SKILL.md" ;;
    P5) # o `solo` deixa de ser solo; conteúdo idêntico para que a única razão
        # de reprovar seja a exceção obsoleta, e não um drift por cima
        printf '%s\n' '{ "permissions": {} }' > "$raiz/.agents/settings.json" ;;
    P6) escrever_excecoes "$raiz" 'divergencia | rules/seguranca.md |' ;;
    P7) escrever_excecoes "$raiz" 'excecao | rules/seguranca.md | tipo que não existe' ;;
    P8) escrever_excecoes "$raiz" \
          'divergencia | .claude/rules/seguranca.md | prefixo de família onde o gate quer o caminho relativo' ;;
    P10) printf '%s\n' '# Segurança' '' 'Regra que só a camada do Codex tem.' \
          > "$raiz/.codex/rules/seguranca.md" ;;
    *) printf 'cenário desconhecido: %s\n' "$cenario" >&2; return 2 ;;
  esac
}

pos_semear_pareamento() {
  # Mutação que precisa ficar FORA do index. O gate itera `git ls-files` e nunca
  # o filesystem (DL-2), porque o workdir do runtime Multica injeta um `.claude/`
  # próprio e varrer o disco contaminaria a comparação. P9 é o controle disso:
  # um drift real, gritante, e invisível para o gate por desenho.
  local raiz="$1" cenario="$2"
  [[ "$cenario" == 'P9' ]] || return 0
  printf '%s\n' '# Não rastreado' '' 'Versão do Claude Code.' \
    > "$raiz/.claude/rules/injetado.md"
  printf '%s\n' '# Não rastreado' '' 'Versão cross-client, diferente de propósito.' \
    > "$raiz/.agents/rules/injetado.md"
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

  local camada nome
  for camada in .codex .agents; do
    for nome in ui-excellence ui-alfa; do
      skill_fixture "$raiz/$camada/skills/$nome/SKILL.md" "$nome"
    done
  done

  instalar_gate "$raiz" validate-ui-parity.sh
}

mutar_ui_parity() {
  local raiz="$1" cenario="$2"
  case "$cenario" in
    U1) : ;;
    U2) rm -rf "$raiz/.codex/skills/ui-alfa" ;;
    U3) rm -rf "$raiz/.agents/skills/ui-alfa" ;;
    U4) skill_fixture "$raiz/.codex/skills/ui-extra/SKILL.md" 'extra' ;;
    U5) skill_fixture "$raiz/.agents/skills/ui-extra/SKILL.md" 'extra' ;;
    U6) # diretório `ui-*` sem SKILL.md: o gate exige o arquivo, não a pasta.
        # Sem este cenário, trocar a asserção por uma contagem de diretórios
        # passaria despercebida.
        mkdir -p "$raiz/.codex/skills/ui-vazio" ;;
    *) printf 'cenário desconhecido: %s\n' "$cenario" >&2; return 2 ;;
  esac
}

# ---------------------------------------------------------------------------
# Gate 4 — check-changelog-local.sh
# ---------------------------------------------------------------------------
# A §8 definiu o formato das tabelas "Changelog Local" e nenhum gate o cobrava:
# a inversão de datas existia no próprio template e viajou aos derivados
# (TECH-651, 19/09/2026). O fixture é um README com a seção e três linhas boas.

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
  esac
}

# ---------------------------------------------------------------------------
# Tabela de cenários
# ---------------------------------------------------------------------------
# id | gate | classe | exit esperado | ERE da razão esperada | descrição
CENARIOS=(
  "L1|linhagem|positivo|0||as três camadas coerentes entre si e com o rodapé"
  "L2|linhagem|negativo|2|suba os dois juntos|rodapé sobe de versão e marcador fica para trás"
  "L3|linhagem|negativo|2|marcador divergente em \.codex/README\.md|marcador diferente numa das camadas"
  "L4|linhagem|negativo|2|sem linha 'Template de origem:' — \.agents/README\.md|camada sem a linha de linhagem"
  "L5|linhagem|negativo|2|camada ausente: \.codex/README\.md|camada inteira ausente"
  "L6|linhagem|negativo|2|marcador sem versão após '@'|marcador sem versão nas três camadas"
  "L7|linhagem|negativo|2|sem rodapé '\*\*Versão:\*\*'|ponto de entrada sem o rodapé canônico"
  "L8|linhagem|lacuna|0||LACUNA: regra normativa muda, marcador e rodapé coerentes e velhos"
  "L9|linhagem|positivo|0||derivado: rodapé divergente NÃO reprova — a regra 3 vale só no canônico"

  "P1|pareamento|positivo|0||pares idênticos, drift declarado e solos declarados"
  "P2|pareamento|negativo|2|DRIFT NÃO DECLARADO|homônimo com conteúdo diferente e sem declaração"
  "P3|pareamento|negativo|2|SOLO NÃO DECLARADO|arquivo numa família só, sem declaração"
  "P4|pareamento|negativo|2|o par voltou a ser byte a byte idêntico|exceção obsoleta: drift declarado que sumiu"
  "P5|pareamento|negativo|2|deixou de ser exclusivo|exceção obsoleta: solo que ganhou par"
  "P6|pareamento|negativo|3|motivo ausente|exceção sem motivo não é auditável"
  "P7|pareamento|negativo|3|tipo desconhecido: 'excecao'|tipo de exceção que não existe"
  "P8|pareamento|negativo|3|usa o caminho relativo à família|divergência declarada com prefixo de família"
  "P9|pareamento|positivo|0||DL-2: drift em arquivo não rastreado é invisível por desenho"
  "P10|pareamento|lacuna|0||LACUNA: drift em .codex/ passa — a camada está fora do gate"

  "U1|ui-parity|positivo|0|All 3 layers converge|as três camadas convergem — e são procuradas na raiz"
  "U2|ui-parity|negativo|2|Missing in \.codex/skills/: ui-alfa|skill do manifesto não replicada em .codex/"
  "U3|ui-parity|negativo|2|Missing in \.agents/skills/: ui-alfa|skill do manifesto não replicada em .agents/"
  "U4|ui-parity|negativo|2|Extra in \.codex/skills/|skill em .codex/ que o manifesto não declara"
  "U5|ui-parity|negativo|2|Extra in \.agents/skills/|skill em .agents/ que o manifesto não declara"
  "U6|ui-parity|positivo|0|All 3 layers converge|diretório ui-* sem SKILL.md não conta como skill"

  "C1|changelog|positivo|0|íntegra|tabela com 5 colunas, datas ISO, a mais recente primeiro, empate no mesmo dia"
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
    *) printf 'gate sem montagem: %s\n' "$2" >&2; return 2 ;;
  esac
}

mutar() {
  case "$2" in
    linhagem)   mutar_linhagem "$1" "$3" ;;
    pareamento) mutar_pareamento "$1" "$3" ;;
    ui-parity)  mutar_ui_parity "$1" "$3" ;;
    changelog)  mutar_changelog "$1" "$3" ;;
    *) printf 'gate sem mutação: %s\n' "$2" >&2; return 2 ;;
  esac
}

pos_semear() {
  # Mutações que precisam ficar fora do index — a maioria dos gates não tem.
  case "$2" in
    pareamento) pos_semear_pareamento "$1" "$3" ;;
    *) return 0 ;;
  esac
}

arquivo_do_gate() {
  case "$1" in
    linhagem)   printf 'check-versao-linhagem.sh' ;;
    pareamento) printf 'check-pareamento-instrucoes.sh' ;;
    ui-parity)  printf 'validate-ui-parity.sh' ;;
    changelog)  printf 'check-changelog-local.sh' ;;
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
  ( cd "$raiz" && bash "scripts/validate/$script" "${args[@]}" ) \
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
  # $1 = gate. Devolve a razão de pular, ou nada se o cenário deve rodar.
  local gate="$1" script
  script=$(arquivo_do_gate "$gate")
  [[ -f "$RAIZ_REPO/scripts/validate/$script" ]] || { printf 'gate ausente'; return 0; }
  [[ "$gate" == 'ui-parity' && "$TEM_PYTHON3" -eq 0 ]] && { printf 'python3 ausente'; return 0; }
  return 0
}

# O gate de paridade lê o manifesto com python3. Sem ele, os cenários não são
# reprovados — são declarados não rodados, porque um cenário que não roda não
# tem veredito e contá-lo como PASS seria exatamente o vício que este harness
# existe para tirar do repositório.
TEM_PYTHON3=1
command -v python3 >/dev/null 2>&1 || TEM_PYTHON3=0

falhas=0
rodados=0
lacunas=0
pulados=0

for linha in "${CENARIOS[@]}"; do
  IFS='|' read -r id gate classe quero ere desc <<<"$linha"
  [[ -n "$GATE_FILTRO" && "$GATE_FILTRO" != "$gate" ]] && continue

  razao_pular=$(pular_cenario "$gate")
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
  # template CANÔNICO: desde a TECH-608 a regra 3 (marcador × rodapé) vale só
  # lá, porque num derivado o rodapé versiona o `CLAUDE.md` local, que é outro
  # eixo. Por isso a raiz nasce com o nome do template — e o L9, que mede
  # justamente a regra sendo pulada, é a exceção nomeada.
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

  # A razão só é conferida quando o cenário declara uma. Cenário positivo e
  # cenário de lacuna não declaram: neles, o que se confere é o exit 0.
  razao_bate=1
  if [[ -n "$ere" ]]; then
    grep -qE -- "$ere" "$raiz/saida" || razao_bate=0
  fi

  if [[ "$obtido" -eq "$quero" && "$razao_bate" -eq 1 ]]; then
    case "$classe" in
      lacuna)
        lacunas=$((lacunas + 1))
        printf 'LACUNA  %-4s %-11s exit %s  %s\n' "$id" "$gate" "$obtido" "$desc" ;;
      *)
        printf 'PASS    %-4s %-11s exit %s  %s\n' "$id" "$gate" "$obtido" "$desc" ;;
    esac
  else
    falhas=$((falhas + 1))
    printf 'FAIL    %-4s %-11s exit %s (esperado %s)  %s\n' \
      "$id" "$gate" "$obtido" "$quero" "$desc"
    if [[ "$razao_bate" -eq 0 ]]; then
      printf '        razão esperada (ERE): %s\n' "$ere"
      printf '        não casou em nenhuma linha da saída do gate:\n'
      sed 's/^/          /' "$raiz/saida"
    fi
    if [[ "$classe" == 'lacuna' ]]; then
      printf '        este cenário registra uma LACUNA conhecida. Se o gate passou\n'
      printf '        a reprová-la, a lacuna foi fechada: reclassifique o cenário\n'
      printf '        como negativo, com o ERE da razão, em vez de removê-lo.\n'
    fi
  fi
done

printf '\n'
if [[ "$falhas" -ne 0 ]]; then
  printf '%s de %s cenários divergem.\n' "$falhas" "$rodados"
  exit 1
fi
printf 'Os %s cenários batem (%s lacuna(s) conhecida(s) e ainda aberta(s)' \
  "$rodados" "$lacunas"
[[ "$pulados" -gt 0 ]] && printf ', %s não rodado(s)' "$pulados"
printf ').\n'
