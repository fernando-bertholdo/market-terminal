# Patch: rename-node-homelab

- **Descrição:** Desacoplar a identidade da máquina Windows do nome do projeto, renomeando o nó Tailscale `market-terminal` → `homelab` sem perder o acesso público nem o direto.
- **Iniciativa relacionada:** Ciclo 1 (fundação self-hosted) — correção pontual pós-entrega
- **Criado em:** 2026-07-26
- **Status:** mergeado
- **Commits:** ver `git log --grep=homelab`

## Contexto

O Ciclo 1 renomeou o nó Tailscale do host Windows para `market-terminal` para produzir uma URL de Funnel legível. O efeito colateral: a máquina pessoal do usuário — que hospeda várias coisas além deste projeto — passou a aparecer como "market-terminal" em toda lista de dispositivos da tailnet, como se o projeto definisse a máquina.

**O nome do Windows nunca foi alterado** e continua `DESKTOP-0MV2IE1`. O acoplamento era exclusivamente no Tailscale.

### Por que não havia solução "elegante"

Investigação registrada para não ser refeita:

| Alternativa | Veredito | Evidência |
|---|---|---|
| Tailscale Services (`svc:`) + Funnel | ❌ Impossível | `tailscale funnel --service=svc:x` → `flag provided but not defined: -service`. A flag existe só no `serve`. Services são intra-tailnet; a doc não menciona Funnel. |
| Alias/CNAME do nó dentro de `.ts.net` | ❌ Não existe | "editing the machine name also edits the MagicDNS domain name" |
| Domínio próprio direto no Funnel | ❌ Não suportado | Funnel só aceita nomes do próprio tailnet (FR tailscale/tailscale#11563, aberta) |
| Mover o Funnel para o nó WSL2 | ❌ Regressão conhecida | É o bug de NAT do WSL2 corrigido no Ciclo 1 (ping passa, TLS não) |
| Servir por `tailscale serve` (como o `educlaw`) | ❌ Não atende | `serve` é intra-tailnet: `educlaw.tailb4f665.ts.net` não tem registro DNS público (verificado em 8.8.8.8 e 1.1.1.1). O João acessa sem Tailscale. |

Sobraram dois caminhos: nome agnóstico no nó (custo zero) ou domínio próprio via Cloudflare Tunnel (~R$50/ano). **Escolhido: nome agnóstico**, com o domínio próprio registrado como melhoria futura.

**Nome escolhido:** `homelab` — descreve o que a máquina *é* (servidor pessoal multiuso), não o que ela roda; não expõe a identidade do usuário numa URL pública; e continua verdadeiro quando um segundo projeto subir na mesma máquina.

## Escopo

**Está no escopo:**
- Rename do nó Windows `market-terminal` → `homelab`
- Rename do nó WSL2 `market-terminal-wsl` → `homelab-wsl`
- Reprovisionamento de certificado e rearme do Funnel no nome novo
- Atualização de `DEPLOY.md`, `Roadmap.md`, handoff do Ciclo 2 e nota histórica no CONTEXT do Ciclo 1

**NÃO está no escopo:**
- Renomear o computador Windows (`DESKTOP-0MV2IE1` permanece — nunca foi o problema)
- Migração para domínio próprio / Cloudflare Tunnel (melhoria futura)
- Qualquer mudança na aplicação, nos containers ou na persistência

## Procedimento aplicado

A ordem importa: `funnel reset` **antes** do rename. A serve config é chaveada pelo nome DNS completo, então renomear com o Funnel ligado deixa config presa a um nome inexistente (tailscale/tailscale#7086).

```powershell
tailscale funnel reset
tailscale set --hostname=homelab                    # host Windows
wsl -d Ubuntu -u root -- tailscale set --hostname=homelab-wsl
tailscale cert homelab.tailb4f665.ts.net            # rodado em %TEMP%, arquivos deletados depois
tailscale funnel --bg --yes 3000
```

## Critérios de Aceite

- [x] `tailscale debug prefs` mostra `"Hostname": "homelab"` (persistido — sobrevive a reboot pelo mesmo mecanismo validado no PR-3)
- [x] `tailscale serve status --json` tem **apenas** a chave `homelab.tailb4f665.ts.net:443` (zero resíduo do nome antigo)
- [x] DNS público resolve em dois resolvers independentes: `homelab.tailb4f665.ts.net` → `209.177.145.97` / `209.177.145.192` (ingress)
- [x] MagicDNS resolve o caminho direto: `homelab.tailb4f665.ts.net` → `100.83.237.24`
- [x] HTTP público responde: `307 → /login` em ~90ms; `/login` serve `<title>ATLAS · FICC Terminal</title>`
- [x] Verificação visual: tela de login renderiza pela URL nova, com certificado válido e sem aviso do navegador
- [x] SSH inalterado (`anderr@100.83.237.24` — o IP da tailnet é estável no rename)
- [x] Docs atualizados
- [ ] Verificação visual autenticada (dashboard com dados ao vivo) — **pendente do usuário**, requer login
- [ ] Admin console: desmarcar "Auto-generate from OS hostname" — **reforço opcional**, o hostname já está nas prefs do cliente
- [ ] João notificado da URL nova

## Rollback

Reverte em ~2 min, sem tocar na aplicação:

```powershell
tailscale funnel reset
tailscale set --hostname=market-terminal
tailscale cert market-terminal.tailb4f665.ts.net
tailscale funnel --bg --yes 3000
```

Backup da config original: `serve-config-backup.json` (chaveada por `market-terminal.tailb4f665.ts.net:443`, handler `/` → `http://127.0.0.1:3000`, `AllowFunnel: true`).

## Impacto para usuários

- **URL nova:** `https://homelab.tailb4f665.ts.net`. A antiga está morta (HTTP 000).
- **Novo login:** o cookie `atlas_session` é escopado por host, então a sessão anterior não migra.
- **Nada mais muda:** containers, scheduler (`TERMINAL_URL: http://web:3000`, rede interna do Docker), `.env` (zero referências a `ts.net`), Neon e o paper book seguem intocados.
