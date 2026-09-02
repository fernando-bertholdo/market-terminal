# Etapa 7 — Dev Handoff

**Bundle:** B3. **Pré-condição:** telas da unidade `local-approved` (protótipo, se houve etapa 6).

## O que produz

Pacote de implementação: **handoff bundle** do Claude Design (design files + histórico do chat + README — preserva intenção, escolhas de componente e decisões) + **spec local complementar** com o que o bundle não sabe.

## Modelo (diferente do handoff clássico)

Não há painel de inspect/medidas: **o protótipo já é código** (HTML/React) e o design system publicado É a biblioteca compilada do repo. O handoff transfere intenção e contexto, não medidas.

## Protocolo

1. **Organização prévia:** reconciliação da unidade em dia ([reconciliacao.md](reconciliacao.md)) — grupos corretos, sem `remote-divergent` pendente (divergência **bloqueia** Ready-for-Dev)
2. **Status por tela** no REGISTRY: `✅ Ready for Dev` | `🚧 In Progress` | `🗄️ Explorado/Arquivado` (só estes três — G-CANONICAL)
3. **Handoff bundle:** no Claude Design, Export → "Hand off to Claude Code" do que está Ready. Registrar no REGISTRY: projectId, data do bundle, telas incluídas, `last_published` correspondente (provenance — sem isso não se sabe se o bundle é atual)
4. **Spec local complementar** (`design/handoff-<unidade>.md`) — o bundle NÃO sabe: contratos de backend, permissões, analytics, requisitos de acessibilidade, edge cases, validações de negócio, fontes reais da marca (se diferirem das do canvas). Uma seção por tela Ready
5. **Consumo na implementação:** o milestone de UI referencia bundle + spec no seu DoR; o Claude Code implementa a partir dos dois

## Critério de done (`local-approved` da etapa)

- [ ] Toda tela da unidade tem status; nenhuma solta
- [ ] Bundle gerado e registrado com provenance (ou `publication-pending` documentado, se sem acesso ao app)
- [ ] Spec local cobre backend/permissões/analytics/a11y/edge cases por tela Ready
- [ ] Milestone de implementação referencia bundle + spec

## Fallback sem app

Sem acesso ao Claude Design nesta máquina: o handoff é o **spec local + paths dos artefatos** (`design/hifi-<unidade>/`, protótipo local) — o formato local já é código implementável; o bundle fica `publication-pending` no publication request.
