# `.claude/hooks/` — Hooks de Harness

Enforcement **de máquina** (Claude Code executa; não depende do modelo obedecer prosa).

> ⚠️ **Hooks são CWD-only:** o `settings.json` (e portanto os hooks) carrega **apenas do
> diretório onde a sessão inicia** — diferente de `CLAUDE.md`/rules/skills, que herdam de
> diretórios-pai. Num monorepo, cada camada registra os próprios hooks no `settings.json`
> **da sua camada** (o script pode ser compartilhado). Além disso, o sync entre templates e
> projetos (`mirror-upstream`/`sync-downstream`, scope `skills|rules|workflows|prompts`)
> **não carrega hooks/settings** — mudanças aqui exigem aplicação manual nos repos vivos.

## Inventário

| Script | Evento | Comportamento |
|---|---|---|
| `check-planning-index.sh` | `SessionStart` | Detector de iniciativas em disco (`.planning/milestones/`, `detours/`, `initiatives/`) e ausentes do índice de `.planning/README.md`. Não-bloqueante (`exit 0` sempre); silencioso sem pendências; respeita o opt-out `<!-- no-index: <motivo> -->` no CONTEXT.md. Backstop da entrada (`init-detour`/`init-milestone` indexam por construção). |
| `check-scripts-cruft.sh` | `PreToolUse` (Bash) | Em `git commit`: bloqueia cruft em `scripts/**` (exit 2) e avisa drift do INDEX. |
| `check-commit-message.sh` | `PreToolUse` (Bash) | Em `git commit`: varre a mensagem passada por `-m` (todos) ou `-F <arquivo>` por quantificador sem medição e numeral sem fonte na linha (pre-commit-check §7); heredoc, `--amend` e commit sem `-m` ficam fora; o `\n` do payload é decodificado. Aviso, não bloqueia. Viaja à mão: o sync não carrega hooks. |
| `check-task-completed.sh` | `TaskCompleted` | Gate de qualidade: roda a suíte por stack antes de concluir task de teammate. |
| `check-teammate-idle.sh` | `TeammateIdle` | Avisa teammate idle com >5 arquivos não commitados. |

## Registro local — `settings.json` fora do git

Neste repositório o `.claude/settings.json` é ignorado pelo git (`.gitignore`, seção
Editor), então o registro dos hooks é passo local de cada máquina, e não viaja por PR.
Para ligar o `check-commit-message.sh`, acrescente ao `.claude/settings.json` local, em
`hooks.PreToolUse`, no bloco de `"matcher": "Bash"` (crie o bloco se ele não existir):

```json
{ "type": "command", "command": ".claude/hooks/check-commit-message.sh" }
```

Sem esse passo o script existe e não roda; a varredura continua valendo pela §7 do
`pre-commit-check`, à mão.

Para ligar o `check-planning-index.sh`, acrescente ao mesmo arquivo, em `hooks.SessionStart`,
dentro de `hooks` do primeiro bloco (crie o bloco sem `matcher` se ele não existir). Na origem
ele fica ao lado do `check-pending-archival.sh`, que este repositório não tem:

```json
{ "type": "command", "command": ".claude/hooks/check-planning-index.sh" }
```

Sem esse passo, uma iniciativa montada à mão fora do índice só aparece quando alguém a nota.

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|---|---|---|---|---|
| 2026-10-04 | `—` | — | `check-commit-message.sh`, `check-planning-index.sh`, `check-task-completed.sh`, `check-teammate-idle.sh` | Quatro hooks acompanham a origem no SHA `6a60a5b` (Passo 5 da `propagar-template`, régua do hook cópia literal; TECH-1020): cada um tinha o mesmo blob e o mesmo modo de uma versão da origem (`check-commit-message.sh` em `eda505f`, `check-planning-index.sh` em `60735e2`, `check-task-completed.sh` e `check-teammate-idle.sh` em `77ecc43`) e passa a ter o do SHA, `100755`. O `check-scripts-cruft.sh` já era o do SHA. O `check-pending-archival.sh`, que só a origem tem, não entra, e com ele ficam sem referência aqui SYNC-20260706-001 e SYNC-20260707-001, os dois Sync-IDs que a origem registra sobre esse hook. O `.claude/settings.json` não é versionado neste repositório e não muda; a tabela deste README fica como o derivado a tem |
| 2026-09-30 | `—` | — | `check-planning-index.sh`, este README | Aplicação manual do hook de SessionStart que a origem trouxe na 2.14.0 (`60735e2`) e que faltava aqui desde aquela onda, na mesma propagação (TECH-668): cópia literal da origem em `b51dbf9`, com o registro local documentado na seção "Registro local", porque o `settings.json` é ignorado pelo git aqui. O par dele na origem, `check-pending-archival.sh`, não existe neste repositório e não entrou. Referência na origem: linha `check-planning-index.sh` de 2026-09-14 do changelog de hooks do template |
| 2026-09-30 | `—` | — | `check-commit-message.sh`, este README | Aplicação manual na propagação do `tech-product-template` 2.14.0 → 2.18.0 neste repositório (TECH-668): o hook entra como cópia literal da origem, já com a decodificação do `\n` da 2.17.1; o registro no `settings.json` fica documentado na seção "Registro local", porque o arquivo é ignorado pelo git aqui; este inventário nasce com os hooks deste repositório, sem os da origem que não estão aqui. Referência na origem: entradas SYNC-20260920-001/002 e SYNC-20260920-003 |
