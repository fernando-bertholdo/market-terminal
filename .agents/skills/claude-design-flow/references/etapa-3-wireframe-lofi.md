# Etapa 3 — Wireframe Lo-fi (conteúdo original desta skill)

**Bundle:** todos. **Pré-condição:** nenhuma (o flow da etapa 2 orienta quais telas wireframar).

## O que produz

Blueprint navegável em grayscale: valida layout, hierarquia e sequência de telas ANTES de investir em estética. Deliberadamente feio — a discussão aqui é espacial, não visual.

## Executor

HTML local (meio primário). Uma página autocontida por tela em `.planning/<tipo>/<nome>/design/lofi-<unidade>/NN-<tela>.html`, navegável no browser via `file://` — sem servidor, sem build, sem dependência externa.

## Kit de primitivas lo-fi (só isto — restrição é a feature)

| Primitiva | Construção (CSS inline) |
|---|---|
| **Container de tela** | `<main>` no tamanho do device alvo (390×844 mobile; 1440×900 desktop), fundo branco, flex column, gap 16 |
| **Bloco/placeholder** | div `background:#d9d9d9; border-radius:4px` |
| **Imagem placeholder** | bloco cinza + X em gradiente (convenção universal) |
| **Texto** | Inter/system-ui; títulos 24-28, corpo 14-16, cor `#666` |
| **Botão/CTA** | `background:#8c8c8c`, texto branco, radius 8 — sempre um `<a>` para a tela destino |
| **Input** | borda `1px solid #bbb`, radius 4, label acima 13px |
| **Nav/tab bar** | flex horizontal com blocos iguais |

**Proibido nesta etapa:** cores de marca, imagens reais, ícones elaborados, sombras, gradientes decorativos. Estética deriva para as etapas 4/5 — anotar e voltar ao layout.

## Protocolo

1. Um arquivo por tela do flow (etapa 2), nomeado `NN-<tela>.html` (NN = ordem no caminho feliz)
2. Marcador na 1ª linha: `<!-- claude-design-flow: local-draft | etapa 3 | <unidade> | YYYY-MM-DD -->`
3. Clicável: CTAs e links `<a href="NN-....html">` cobrindo caminho feliz + desvios do flow (inclusive voltar)
4. Estados relevantes anotados inline (comentário visível em cinza no próprio wireframe quando ajudar a conversa)
5. Gate: usuário navega no browser → aprovação → marcador vira `local-approved`

## Critério de done (`local-approved`)

- [ ] Toda tela do flow tem wireframe correspondente
- [ ] Hierarquia legível em grayscale (o olho acha o principal sem cor)
- [ ] Navegação clicável percorre o caminho feliz de ponta a ponta, sem becos sem saída
- [ ] Zero decisões estéticas tomadas

## Publicação (opcional nesta etapa)

Wireframes raramente merecem publicação (são meio, não fim). Se a unidade for referência durável (ex.: blueprint de navegação do produto), publicar via `--publish` seguindo o **contrato de publicabilidade** de [modo-local.md](modo-local.md) (1 card autocontido por tela, header `@dsCard group="Wireframes"`).
