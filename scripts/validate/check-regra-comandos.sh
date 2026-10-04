#!/usr/bin/env bash
#
# check-regra-comandos.sh
#
# G-REGRA-COMANDOS: todo comando que a §6 do `.claude/CLAUDE.md` proíbe tem
# `prefix_rule` com `decision = "forbidden"` num `.codex/rules/*.rules`
# versionado, e toda `prefix_rule` proibitiva cita a seção do `CLAUDE.md` de
# onde a norma vem.
#
# Por que existe: a regra de comando nasce no Claude, na prosa da §6, e o
# Codex só a cumpre por mecanismo se o execpolicy dele tiver a regra (DL-4 da
# TECH-852, desenho na TECH-846). A `.rules` é escrita à mão; sem este gate, a
# §6 ganharia um comando e o Codex seguiria deixando rodar, sem ninguém ver.
#
# O que é "comando que a §6 proíbe": todo trecho em crase de uma linha da §6
# (do título `## 6.` ao próximo `## `) que traz a palavra `NUNCA`, fora de
# bloco de código. A §6 é lida como está, sem marcador. Na origem, em
# 2026-10-02 (`77c50c0`), eram `git add .` e `git add -A`, da linha 1 do
# "Protocolo Atomic Commits":
#   bash scripts/validate/check-regra-comandos.sh | grep -- '→ forbidden'
#
# Regras — o gate falha em qualquer uma:
#   1. O `.claude/CLAUDE.md` não tem a seção `## 6.`, ou ela não tem nenhum
#      comando em crase numa linha `NUNCA` (falha fechada: um título
#      renumerado não pode virar aprovação por vacuidade).
#   2. Um comando da §6 não é casado por nenhuma `prefix_rule` com
#      `decision = "forbidden"`. O casamento é o do Codex: por prefixo de
#      tokens, cada posição do `pattern` igual ao token ou a uma das
#      alternativas da lista.
#   3. Uma `prefix_rule` com `decision = "forbidden"` sem `§<n>` e
#      `CLAUDE.md` na `justification`.
#   4. Um `.rules` que não se lê como chamadas `prefix_rule(...)` de valores
#      literais (sai 3, arquivo malformado): arquivo versionado que não abre
#      porque o caminho não leva a um arquivo (symlink pendente, em laço, para
#      diretório ou que atravessa um arquivo; arquivo removido da árvore; diretório
#      versionado como submódulo, o gitlink), que não é UTF-8 ou que traz byte
#      nulo; entrada que estoura o parser; sintaxe quebrada; valor que não é literal
#      (nome, chamada); literal que o Python recusa montar (chave de dict ou item de
#      set não hasheável); `pattern` que não é lista, com ou sem
#      `decision = "forbidden"`. O gitlink sai 3 pelo mesmo ramo do symlink, só no
#      index (`ENOENT`) ou com o diretório no disco (`EISDIR`). Medido em
#      2026-10-04; rodado da raiz, o comando imprime `rc=3` duas vezes:
#        d=$(mktemp -d); git ls-files -z | tar --null -T - -cf - | tar -x -C "$d"; git -C "$d" init -q; git -C "$d" add .claude/CLAUDE.md .codex/rules/comandos.rules
#        git -C "$d" update-index --add --cacheinfo "160000,$(git rev-parse HEAD),.codex/rules/sub.rules"
#        (cd "$d" && for i in 1 2; do bash scripts/validate/check-regra-comandos.sh | grep -o '(.*);'; echo "rc=${PIPESTATUS[0]}"; mkdir -p .codex/rules/sub.rules; done); rm -rf "$d"
#      O Codex recusa a política inteira quando o `pattern` é tupla, string,
#      inteiro, `None` ou dict. Medido na tupla em 2026-10-03 e nos cinco em
#      2026-10-04, codex-cli 0.147.0: o comando roda os cinco, cada um sai `rc=1`,
#      e a linha de erro da tupla é, literal,
#        error: Type of parameter `pattern` doesn't match, expected `list`, actual `tuple (repr: ("git", "add"))`
#      e a dos outros quatro termina em `string (repr: "git add")`, `int (repr: 5)`,
#      `NoneType (repr: None)` e `dict (repr: {})`:
#        d=$(mktemp -d); for p in '("git","add")' '"git add"' 5 None '{}'; do printf 'prefix_rule(pattern = %s)\n' "$p" > "$d/t.rules"; codex execpolicy check --rules "$d/t.rules" git status; echo "rc=$?"; done 2>&1 | grep -E '^ *error: |^rc='; rm -rf "$d"
#
# Limites, declarados:
#   - Comando sem crase numa linha `NUNCA` não é visto. Na origem, em
#     2026-10-02 (`77c50c0`), a "Regra de Ouro" da §6 repetia os dois comandos
#     sem crase, e quem os cobria era a linha 1 do protocolo:
#       grep -n 'NUNCA use git add' .claude/CLAUDE.md
#   - Todo trecho em crase de uma linha `NUNCA` é lido como comando, mesmo quando
#     não é: a §6 que ganhar "NUNCA commitar o `.env`" reprova com
#     `SEM REGRA: `.env``, e a saída não diz que foi a crase que se leu como comando.
#   - Comando novo sob outra palavra passa sem ser visto: o critério é `NUNCA`, em
#     maiúsculas. `PROIBIDO`, `Nunca` e `Não use` saem 0, em silêncio (medido em
#     2026-10-02, `3e28a6f`, com uma linha acrescentada à §6 numa cópia).
#   - O gate lê a `.rules` como texto de Starlark com sintaxe de Python
#     (`ast`), não roda o Codex: o teste embutido (`match`/`not_match`) só é
#     exercido por `codex execpolicy check`.
#   - `MemoryError` sem mensagem sai 1 com traceback, e não 3: o gate só trata como
#     malformado o estouro do parser que traz a mensagem dele, porque a falta de
#     memória real também levanta `MemoryError()` sem argumentos, e erro do ambiente
#     não vira "arquivo malformado" (TECH-941). O parser do python3 3.12 em diante
#     traz a mensagem; o do 3.9, do 3.10 e do 3.11 não, e o estouro dele sai 1.
#     Medido em 2026-10-03, um comando por versão, a última linha da saída é a
#     mensagem ou só `MemoryError`: 3.14.4, 3.13.15, 3.12.14 e 3.11.16 por quem
#     escreveu o gate, e 3.9.25 e 3.10.21 pelo Revisor, no veredito da TECH-941:
#       python3 -c 'import ast; ast.parse("[" + "-" * 100000 + "1]")' 2>&1 | tail -1
#     A falta de memória real, aqui sob `ulimit -v 250000` no Linux e dentro do
#     `ast.parse`, levanta `MemoryError()` sem argumentos nas quatro versões que o
#     autor mediu (2026-10-03); o comando imprime `MemoryError ()`:
#       f=$(mktemp); python3 -c 'print("x = 1\n" * 4000000, end="")' > "$f"
#       (ulimit -v 250000; python3 -c 'import ast, sys; sys.excepthook = lambda t, e, b: print(t.__name__, e.args); ast.parse(open(sys.argv[1]).read())' "$f"); rm -f "$f"
#     O R12 afirma o exit 3 do 3.12 em diante, e o R12b o exit 1 abaixo disso. O
#     R22 afirma o exit 1 em qualquer versão: um `sitecustomize.py` no `PYTHONPATH`
#     do cenário troca o `ast.parse` da `.rules` por um `MemoryError()` sem
#     argumentos (TECH-989).
#   - `.rules` que o `open` recusa por errno de ambiente (`EACCES`: sem permissão de
#     leitura) sai 1 com traceback, por desenho: o gate trata como malformado o
#     caminho que não leva a um arquivo, e deixa subir o errno de ambiente. O R21
#     afirma o exit 1 e sai SKIP como root, que lê o arquivo. Medido em 2026-10-03:
#       bash scripts/validate/test-gates-validate.sh --gate comandos | grep ' R21 '
#   - `.rules` que o Codex recusa por outro motivo e o python3 lê sem problema passa:
#     `prefix_rule` sem `pattern`, com `pattern = []` ou com elemento que não é
#     string nem lista de strings (`pattern = [5]`). O gate sai 0 com a regra a mais
#     anexada à `.rules` versionada, e o Codex recusa a política inteira. Medido em
#     2026-10-03, codex-cli 0.147.0, com o gate da TECH-941: o Codex sai 1 e o gate
#     sai 0, numa cópia da árvore que a `.rules` versionada não sofre:
#       d=$(mktemp -d); git ls-files -z | tar --null -T - -cf - | tar -x -C "$d"
#       echo 'prefix_rule(pattern = [5])' >> "$d/.codex/rules/comandos.rules"
#       codex execpolicy check --rules "$d/.codex/rules/comandos.rules" git add -A
#       git -C "$d" init -q && git -C "$d" add .claude/CLAUDE.md .codex/rules/comandos.rules
#       (cd "$d" && bash scripts/validate/check-regra-comandos.sh); rm -rf "$d"
#   - O lado do Claude Code (`permissions.deny` do `.claude/settings.json`) não
#     é conferido: o `settings.json` do derivado não se propaga (passo 5 da
#     `propagar-template`), e o gate viaja para os derivados.
#   - Itera `git ls-files`: `.rules` não rastreado não conta.
#
# Uso:
#   scripts/validate/check-regra-comandos.sh
#
# Exit codes:
#   0  todo comando da §6 tem `prefix_rule` proibitiva que cita a seção
#   1  erro de argumento
#   2  violação
#   3  `.rules` malformado
#   5  pré-requisito de ambiente ausente

set -euo pipefail

log() { printf '[regra-comandos] %s\n' "$*"; }
die() { printf '[regra-comandos] ERRO: %s\n' "$1" >&2; exit "${2:-1}"; }

[[ $# -eq 0 ]] || { [[ "$1" == "-h" || "$1" == "--help" ]] && { sed -n '3,/^set -euo/{/^set -euo/!p;}' "$0"; exit 0; } || die "argumento desconhecido: $1" 1; }
command -v git >/dev/null 2>&1 || die "git não encontrado no PATH." 5
command -v python3 >/dev/null 2>&1 || die "python3 não encontrado no PATH (lê a .rules por ast)." 5
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO_ROOT" ]] || die "fora de um repositório git." 5
cd "$REPO_ROOT"

[[ -f .claude/CLAUDE.md ]] || { log "sem .claude/CLAUDE.md: não há §6 a ler."; exit 2; }

regras=()
while IFS= read -r -d '' f; do regras+=("$f"); done \
  < <(git ls-files -z -- '.codex/rules/*.rules')

python3 - .claude/CLAUDE.md ${regras[@]+"${regras[@]}"} <<'PY'
import ast, errno, re, sys

def log(msg):
    print(f"[regra-comandos] {msg}")

claude, regras = sys.argv[1], sys.argv[2:]

# §6: do título `## 6.` ao próximo `## `, pulando bloco de código.
comandos, na_secao, cerca, achou_secao = [], False, None, False
with open(claude, encoding="utf-8") as fh:
    for n, linha in enumerate(fh, 1):
        linha = linha.rstrip("\n")
        if cerca is None and re.match(r"^## ", linha):
            na_secao = bool(re.match(r"^## 6\.", linha))
            achou_secao = achou_secao or na_secao
            continue
        if not na_secao:
            continue
        m = re.match(r"^\s*(`{3,}|~{3,})", linha)
        if m:
            marca = m.group(1)
            if cerca is None:
                cerca = marca
            elif marca[0] == cerca[0] and len(marca) >= len(cerca):
                cerca = None
            continue
        if cerca is not None or not re.search(r"\bNUNCA\b", linha):
            continue
        for span in re.findall(r"`([^`]+)`", linha):
            comandos.append((n, span.strip()))

if not achou_secao:
    log(f"{claude} sem a seção '## 6.': não há regra de comando a ler.")
    sys.exit(2)
if not comandos:
    log(f"a §6 de {claude} não tem comando em crase numa linha NUNCA: o gate não sabe o que ler.")
    sys.exit(2)

# `.rules`: chamadas `prefix_rule(...)` com valores literais.
proibitivas, malformados, violacoes = [], 0, 0
for caminho in regras:
    # Cada `try` captura só o que a ENTRADA causa. Sem `except Exception`: erro do
    # próprio gate não se engole.
    try:
        with open(caminho, "rb") as fh:
            bruto = fh.read()
    except OSError as e:
        # O `git ls-files` lista o symlink pendente (ENOENT), em laço (ELOOP), para
        # diretório (EISDIR) ou que atravessa um arquivo (ENOTDIR), o arquivo removido da
        # árvore (ENOENT) e o gitlink de submódulo (ENOENT só no index, EISDIR com o
        # diretório no disco); o `open` não os abre. Outro errno (EACCES, E/S) é do
        # ambiente e sobe com traceback, por desenho.
        if e.errno not in (errno.ENOENT, errno.ELOOP, errno.EISDIR, errno.ENOTDIR):
            raise
        log(f"MALFORMADO {caminho}: versionado e não se abre ({e.strerror}); symlink que não resolve a um arquivo, arquivo removido da árvore ou diretório versionado como submódulo (gitlink).")
        malformados += 1
        continue
    try:
        texto = bruto.decode("utf-8")
    except UnicodeDecodeError as e:
        linha = bruto.count(b"\n", 0, e.start) + 1
        log(f"MALFORMADO {caminho}:{linha}: não é UTF-8 válido (byte 0x{bruto[e.start]:02x} no deslocamento {e.start}).")
        malformados += 1
        continue
    if "\0" in texto:
        # O `ast.parse` recusa o byte nulo sem `lineno` (`SyntaxError` do 3.11 ao 3.14,
        # medido em 2026-10-03; o Revisor mediu `ValueError` no 3.9.25): a linha sai
        # daqui, e não de `e.lineno`, e vale nas duas versões. Imprime `SyntaxError None`:
        #   python3 -c 'import ast, sys; sys.excepthook = lambda t, e, b: print(t.__name__, e.lineno); ast.parse("x\0")'
        linha = texto.count("\n", 0, texto.index("\0")) + 1
        log(f"MALFORMADO {caminho}:{linha}: byte nulo.")
        malformados += 1
        continue
    try:
        arvore = ast.parse(texto, filename=caminho)
    except SyntaxError as e:
        log(f"MALFORMADO {caminho}:{e.lineno}: não se lê como Starlark de valores literais ({e.msg}).")
        malformados += 1
        continue
    except (MemoryError, RecursionError) as e:
        # O estouro do parser é entrada malformada; a falta de memória do ambiente não, e
        # o que as separa é a mensagem: o parser do 3.12 em diante a traz, e a falta de
        # memória real levanta `MemoryError()` sem argumentos, que sobe com traceback.
        if isinstance(e, MemoryError) and not e.args:
            raise
        log(f"MALFORMADO {caminho}: o parser do python3 estoura ({e}).")
        malformados += 1
        continue
    for no in ast.walk(arvore):
        if not (isinstance(no, ast.Call) and getattr(no.func, "id", None) == "prefix_rule"):
            continue
        try:
            args = {k.arg: ast.literal_eval(k.value) for k in no.keywords}
        except (ValueError, TypeError) as e:
            # ValueError: o nó não é literal (nome, chamada). TypeError: é literal na
            # sintaxe, mas o Python recusa montá-lo (chave de dict ou item de set não
            # hasheável). Sem `except Exception`: erro do próprio gate não se engole.
            motivo = "valor que não é literal" if isinstance(e, ValueError) else f"literal que o Python recusa ({e})"
            log(f"MALFORMADO {caminho}:{no.lineno}: prefix_rule com {motivo}.")
            malformados += 1
            continue
        # Antes do filtro do `decision`: o Codex recusa a política inteira por um
        # `pattern` que não é lista, seja qual for o `decision` (medição, com data e
        # versão, na regra 4 do cabeçalho).
        if "pattern" in args and not isinstance(args["pattern"], list):
            log(f"MALFORMADO {caminho}:{no.lineno}: prefix_rule com pattern que não é lista ({type(args['pattern']).__name__}).")
            malformados += 1
            continue
        if args.get("decision") != "forbidden":
            continue
        padrao = [p if isinstance(p, list) else [p] for p in args.get("pattern", [])]
        justificativa = str(args.get("justification", ""))
        if not (re.search(r"§\d", justificativa) and "CLAUDE.md" in justificativa):
            log(f"SEM CITAÇÃO {caminho}:{no.lineno}: prefix_rule forbidden sem '§<n>' e 'CLAUDE.md' na justification.")
            violacoes += 1
        proibitivas.append((caminho, no.lineno, padrao))

if malformados:
    sys.exit(3)

def casa(padrao, tokens):
    return bool(padrao) and len(tokens) >= len(padrao) and all(t in alt for t, alt in zip(tokens, padrao))

for n, cmd in comandos:
    regra = next((r for r in proibitivas if casa(r[2], cmd.split())), None)
    if regra is None:
        alvo = ", ".join(regras) if regras else "nenhum .codex/rules/*.rules versionado"
        log(f"SEM REGRA: `{cmd}` ({claude}:{n}, §6) não tem prefix_rule com decision = \"forbidden\" em {alvo}.")
        violacoes += 1
    else:
        log(f"`{cmd}` ({claude}:{n}) → forbidden em {regra[0]}:{regra[1]}")

if violacoes:
    log(f"{violacoes} violação(ões): a §6 proíbe o que o Codex deixa rodar, ou a regra não diz de onde vem.")
    sys.exit(2)
log(f"{len(comandos)} comando(s) da §6 com prefix_rule forbidden em {len(regras)} .rules, todas citando a seção.")
PY
