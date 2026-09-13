# Nota de arquivamento — `rename-node-homelab`

**Arquivado em:** 2026-09-12, pela TECH-220 (detour `aposentar-todo-md-e-patch`, TECH-210).

**Por que está aqui e não foi deletado.** Esta iniciativa nasceu sob o tipo de
trabalho `patch`, que o detour aposentou. O tipo saiu do vocabulário de
`.planning/`; o registro do trabalho, não. O que este diretório guarda de mais
caro não é o patch em si: é a **tabela de alternativas descartadas** do
`plan.md` — Tailscale Services, alias/CNAME dentro de `.ts.net`, domínio
próprio direto no Funnel, Funnel no nó WSL2 e `tailscale serve` —, cada uma com
o veredito e a evidência que o produziu. Sem ela, a próxima pessoa que quiser
uma URL branded refaz a mesma investigação.

**Estado na data do arquivamento:** `Status: mergeado`, declarado pelo próprio
`plan.md`. Conferido antes de mover.

**Data de ship:** 2026-07-26. Evidência, por comando — sem o corte de data o
`--grep=homelab` também acha commits de PRs posteriores que citam este
arquivamento (inclusive desta própria migração TECH-220), então o `--until`
é o que reproduz exatamente o ship original:

```bash
git log --format='%h %ad %s' --date=short --grep=homelab --until=2026-07-31
# 0dddbee 2026-07-26 chore(planning): fecha critério de verificação visual do patch rename-node-homelab
# 4602861 2026-07-26 chore(planning): registra patch rename-node-homelab e atualiza referências de URL
# f9460a8 2026-07-26 docs(docs): atualiza URL pública na arquitetura-alvo do Ciclo 1
```

A verificação visual autenticada está registrada no `plan.md` e foi confirmada
pelo usuário em 26/07/2026.

**Dois checkboxes do `plan.md` ficaram abertos, e ficam como estão** — registro
histórico não se reescreve para caber em arquivamento:

- *"Admin console: desmarcar 'Auto-generate from OS hostname'"*, que o próprio
  plano declara **reforço opcional**;
- *"João notificado da URL nova"*, que é comunicação externa e não tem artefato
  no repositório.

Nenhum dos dois desfaz o `Status: mergeado`: a URL `https://homelab.tailb4f665.ts.net`
está em produção desde 26/07/2026 e o `DEPLOY.md` já descreve o estado novo.
