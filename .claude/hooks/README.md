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

## Changelog Local

| Data | Commit | Sync-ID | Arquivo | Descrição |
|---|---|---|---|---|
| 2026-09-30 | `—` | — | `check-commit-message.sh`, este README | Aplicação manual na propagação do `tech-product-template` 2.14.0 → 2.18.0 neste repositório (TECH-668): o hook entra como cópia literal da origem, já com a decodificação do `\n` da 2.17.1; o registro no `settings.json` fica documentado na seção "Registro local", porque o arquivo é ignorado pelo git aqui; este inventário nasce com os hooks deste repositório, sem os da origem que não estão aqui. Referência na origem: entradas SYNC-20260920-001/002 e SYNC-20260920-003 |
