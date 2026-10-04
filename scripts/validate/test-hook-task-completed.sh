#!/usr/bin/env bash
# test-hook-task-completed.sh — mede quando o hook `TaskCompleted` pula o gate de
# testes: assunto com tipo `docs`, ou que abre com verbo de documentação,
# revisão, pesquisa ou planejamento sem coordenação depois dele (` e `, `,`,
# `:`…) (TECH-809). O que ainda pula sem dever fica declarado como `LIMITE`.
#
# Por que ele existe: o filtro de `.claude/hooks/check-task-completed.sh` até a
# 2.18.0 era `grep -qiE '(review|research|document|plan|analys)'` sobre o
# assunto, por substring e em inglês, contra assunto que o `CLAUDE.md` pede em
# pt-BR. `implementa parser de planilha` casava `plan` e a task saía sem rodar a
# suíte; `fix(planning): …` também. Pular por engano é o erro que custa, porque
# entrega implementação sem teste; rodar à toa custa só tempo.
#
# Como ele observa a decisão: roda o hook num diretório descartável, sem marcador
# de stack, com `PROJECT_TEST_COMMAND` apontado para um comando que só cria um
# arquivo-marca. Marca presente: o hook não pulou e chegou ao gate. Marca
# ausente: pulou. O canal é o mesmo no hook antigo, e é isso que deixa o
# controle negativo (`--hook <hook antigo>`) reprovar pelo motivo certo.
#
# Modos:
#   (padrão)  casos nos dois sentidos, escritos aqui; FAIL em qualquer divergência
#   --medir   assuntos reais de `test-hook-task-completed-assuntos.txt`, rotulados
#             um a um; imprime quantos o filtro antigo (o padrão acima, aplicado
#             literalmente) e o hook sob teste classificam errado. A linha `novo:`
#             é sempre a do hook sob teste, inclusive com `--hook`.
#
# Uso: bash scripts/validate/test-hook-task-completed.sh [--medir] [--hook <caminho>] [--help]
# Exit codes: 0 = tudo bate (no `--medir`, o hook sob teste erra zero);
#             1 = alguma divergência; 2 = erro de uso ou de ambiente.

set -euo pipefail

RAIZ_REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
HOOK="$RAIZ_REPO/.claude/hooks/check-task-completed.sh"
FIXTURE="$RAIZ_REPO/scripts/validate/test-hook-task-completed-assuntos.txt"
FILTRO_ANTIGO='(review|research|document|plan|analys)'
MODO=casos

while [ $# -gt 0 ]; do
  case "$1" in
    --medir) MODO=medir; shift ;;
    --hook)
      [ $# -ge 2 ] && [ -f "$2" ] || { echo "uso: --hook <arquivo existente>" >&2; exit 2; }
      HOOK="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"; shift 2 ;;
    --help|-h) sed -n '2,/^$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "argumento desconhecido: $1 (use --help)" >&2; exit 2 ;;
  esac
done
command -v jq >/dev/null 2>&1 || { echo "jq ausente: o hook depende dele" >&2; exit 2; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Imprime `pula` ou `roda`; sai 2 se o hook devolver outra coisa que não 0.
decisao_do_hook() {
  local rc=0
  rm -f "$TMP/marca"
  jq -n --arg s "$1" '{task_id:"t1",task_subject:$s,task_description:"",teammate_name:"harness",team_name:"harness"}' \
    | (cd "$TMP" && PROJECT_TEST_COMMAND='touch marca' bash "$HOOK") >/dev/null 2>&1 || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "o hook saiu $rc com o assunto: $1" >&2
    exit 2
  fi
  if [ -f "$TMP/marca" ]; then echo roda; else echo pula; fi
}

if [ "$MODO" = medir ]; then
  [ -f "$FIXTURE" ] || { echo "fixture ausente: $FIXTURE" >&2; exit 2; }
  total=0; antigo_pula=0; antigo_roda=0; novo_erros=0
  while IFS="$(printf '\t')" read -r rotulo assunto; do
    case "$rotulo" in ''|'#'*) continue ;; pula|roda) ;; *) echo "rótulo inválido: $rotulo" >&2; exit 2 ;; esac
    total=$((total + 1))
    if printf '%s\n' "$assunto" | grep -qiE "$FILTRO_ANTIGO"; then antigo=pula; else antigo=roda; fi
    if [ "$antigo" != "$rotulo" ]; then
      if [ "$antigo" = pula ]; then antigo_pula=$((antigo_pula + 1)); else antigo_roda=$((antigo_roda + 1)); fi
    fi
    novo=$(decisao_do_hook "$assunto")
    if [ "$novo" != "$rotulo" ]; then
      novo_erros=$((novo_erros + 1))
      echo "  erro do hook sob teste: rótulo $rotulo, decidiu $novo — $assunto"
    fi
  done < "$FIXTURE"
  [ "$total" -gt 0 ] || { echo "fixture sem assunto rotulado" >&2; exit 2; }
  echo "fonte: $(basename "$FIXTURE") — assunto de commit é aproximação de assunto de task"
  echo "antigo: $((antigo_pula + antigo_roda)) erros em $total assuntos"
  echo "  pulou o que devia rodar: $antigo_pula"
  echo "  rodou o que podia pular: $antigo_roda"
  echo "novo: $novo_erros erros em $total assuntos"
  [ "$novo_erros" -eq 0 ]
  exit
fi

falhas=0; n=0; limites=0
NL=$'\n'
confere() {  # <esperado> <assunto>
  local obtido
  obtido=$(decisao_do_hook "$2")
  n=$((n + 1))
  if [ "$obtido" = "$1" ]; then
    echo "PASS  $1  ${2//"$NL"/\\n}"
  else
    echo "FAIL  esperado $1, decidiu $obtido  ${2//"$NL"/\\n}"
    falhas=$((falhas + 1))
  fi
}

limite() {  # <comportamento atual> <assunto>: assevera o atual e o imprime como LIMITE
  local obtido
  obtido=$(decisao_do_hook "$2")
  n=$((n + 1)); limites=$((limites + 1))
  if [ "$obtido" = "$1" ]; then
    echo "LIMITE  $1  $2"
  else
    echo "FAIL  limite mudou: era $1, decidiu $obtido  $2 (atualize o harness)"
    falhas=$((falhas + 1))
  fi
}

# Implementação com `plan`, `document`, `review`, `research` ou `analys` como
# pedaço de outra palavra, ou no escopo do tipo: roda. Os quatro primeiros foram
# medidos em 17/09/2026, numa sessão de exploração, e o filtro antigo pulava os
# quatro; a TECH-809 os remediu em 30/09/2026.
confere roda 'implementa parser de planilha'
confere roda 'revisa o planejamento de rotas'
confere roda 'cria plantao de alertas'
confere roda 'implementa documentacao inline no coletor'
confere roda 'corrige o cálculo do planejador de rotas'
confere roda 'adiciona endpoint de reviews de produto'
confere roda 'Implement document upload endpoint'
confere roda 'implement researcher dashboard'
confere roda 'add analyser for csv imports'
confere roda 'plan-template: ajusta o parser'
confere roda 'fix(planning): corrige o índice de iniciativas'
confere roda 'refactor(skills): extrai o planner de rotas'
confere roda 'test(review): cobre o fluxo de aprovação'
confere roda 'feat(docs): gera documentação OpenAPI a partir do schema'
# Substantivo que também nomeia funcionalidade de produto: na dúvida, roda.
confere roda 'Plano de assinatura premium no checkout'
confere roda 'Pesquisa por texto no catálogo'
confere roda 'Análise de crédito no onboarding'
confere roda 'Revisão de pedido no checkout'
confere roda 'Documentação do cliente: aba de anexos'
confere roda 'Revisão adversarial do PR #40'
confere roda 'Documentação do contrato de eventos'
# Coordenação depois do verbo da lista (` e `, ` ou `, `,`, `:`, `+`…) roda: o
# assunto declara mais de um trabalho, e não há como saber se o outro é código
# (TECH-809). Cobre a coordenação lexical, não qualquer conector (ver LIMITE).
confere roda 'Planejar e desenvolver o importador'
confere roda 'Revisar e atualizar o parser'
confere roda 'Revisar, testar e publicar o parser'
confere roda 'Pesquisar e trocar o cache'
confere roda 'Revisar ou reescrever o parser'
confere roda 'Review and update the parser'
confere roda 'Plan, build and ship the importer'
confere roda 'Documentar + migrar o banco'
confere roda 'Planejar e implementar o parser'
confere roda 'Documenta e implementa o parser de planilha'
confere roda 'Revisar e corrigir o parser'
confere roda 'Pesquisar e implementar cache'
confere roda 'Revisão de contrato: implementa o fluxo de aprovação'
confere roda 'Documentação interativa: implementa o editor'
confere roda 'Plan and implement the importer'
confere roda 'Review and fix the parser'
confere roda 'Research assistant agent: implement tool calls'
confere roda 'Analysis dashboard: add export button'
# Substantivo fora da lista, em inglês e em pt-BR.
confere roda 'Documentation search endpoint'
confere roda 'Planning poker feature'
confere roda 'Analysis of credit scoring in onboarding'
# Só a primeira linha decide.
confere roda "$(printf 'implementa o importador\ndocs: atualiza o README')"

# Documentação, revisão, pesquisa ou planejamento, em pt-BR e em inglês: pula.
confere pula 'Revisar o PR #12 do módulo de auth'
confere pula 'Pesquisar alternativas de cache distribuído'
confere pula 'Documentar a API pública'
confere pula 'documenta o fluxo de deploy'
confere pula 'Revisar a criação de contas'
confere pula 'Documentar a implementação do parser'
confere pula 'Planejar a migração do banco'
confere pula 'planeja a fatia 2 do detour'
confere pula 'Analisar os logs de erro de produção'
confere pula 'docs: atualiza o README'
confere pula 'docs(planning): registra o handoff da sessão'
confere pula 'Review auth module'
confere pula 'Research caching options'
confere pula 'Document the public API'
confere pula 'Plan database migration'
confere pula 'Analyze error logs'

# LIMITE: em inglês, `plan`, `review`, `research` e `document` são verbo e
# substantivo, e a primeira palavra não distingue um do outro. Estes pulam hoje,
# e não deviam; ficam aqui para que mudar o filtro mexa neles de propósito.
limite pula 'Review moderation queue UI'
limite pula 'Plan limit enforcement in billing'
limite pula 'Document viewer component with zoom'
limite pula 'Plan selector component for pricing page'
# LIMITE: oração subordinada não é coordenação, e o verbo dela não é lido.
limite pula 'Revisar o parser que atualiza o cache'
# LIMITE: conector fora do conjunto do veto não é lido como coordenação.
limite pula 'Planejar depois implementar o parser'
limite pula 'Plan then implement the importer'
limite pula 'Revisar para corrigir o parser'
limite pula 'Revisar antes de reescrever o parser'

# O filtro decide só se pula; o gate depois dele continua reprovando.
rc=0
jq -n '{task_subject:"implementa parser de planilha",teammate_name:"harness"}' \
  | (cd "$TMP" && PROJECT_TEST_COMMAND='false' bash "$HOOK") >/dev/null 2>&1 || rc=$?
n=$((n + 1))
if [ "$rc" -eq 2 ]; then
  echo "PASS  gate intacto: suíte vermelha numa task de implementação sai 2"
else
  echo "FAIL  gate intacto: suíte vermelha numa task de implementação saiu $rc, esperado 2"
  falhas=$((falhas + 1))
fi

echo "$n casos, $falhas falhas, $limites limites declarados (hook: $HOOK)"
[ "$falhas" -eq 0 ]
