# Etapa 5 — Hi-fi UI

**Bundle:** B2 e B3. **Pré-condição:** DS no REGISTRY (senão, oferecer etapa 4 mínima antes).

## O que produz

Telas hi-fi da unidade: wireframes aprovados "skinados" com os tokens e componentes reais do design system, conteúdo realista (inventário da etapa 2), estados relevantes.

## Executor (dois caminhos que se combinam)

- **Local (iteração grátis):** telas HTML em `design/hifi-<unidade>/NN-<tela>.html` consumindo `tokens.css`/custom properties do DS — iterar aqui até a direção estar certa.
- **Claude Design (geração ancorada + refino):** com o DS publicado (etapa 4), gerar/refinar telas no app (`/design` do terminal ou claude.ai/design) — o agente de design usa os componentes REAIS sincados, e o refino fino é WYSIWYG no canvas (clicar, redimensionar, ajustar espaçamento/cor ao vivo).

**Governança de consumo (pool compartilhado):** o caminho local é o default de iteração; a geração no app é para o curado. Máximo **2 tentativas** de geração por tela; antes de gerar, confirmar com o usuário. Nunca regenerar o que o REGISTRY marca `published`.

## Insumos

- Wireframes `local-approved` (etapa 3) — layout JÁ decidido; hi-fi não reabre layout (mudou layout → voltar à etapa 3)
- DS do REGISTRY (tokens + componentes)
- Inventário de conteúdo (etapa 2) — conteúdo realista, não lorem ipsum
- **Insumo de qualidade:** se o plugin `ui-excellence` estiver disponível, carregar `refactoring` (hierarquia/espaçamento) e `heuristics` (usabilidade) ao desenhar

## Protocolo

1. REGISTRY: telas da unidade já existem? (estender, nunca duplicar)
2. Uma tela por vez: montar local sobre o DS → gate (browser) → `local-approved`
3. Estados críticos por tela (vazio, erro, loading) como arquivos irmãos `NN-<tela>--<estado>.html`
4. Refino no Claude Design (opcional, curado): gerar ancorado no DS OU subir a tela local (`--publish`) e refinar no canvas
5. **Edição WYSIWYG no canvas NÃO é fonte:** o que for refinado lá deve ser **refeito no HTML local** antes de `local-approved`/`published` (contrato remoto-é-projeção) — ou entrar via handoff bundle como patch rastreável
6. Componente novo necessário → criar no DS (etapa 4), nunca local na tela

## Critério de done (`local-approved`)

- [ ] Toda cor/tipo/espaçamento vem de token (zero hardcoded)
- [ ] Componentes do DS instanciados (não redesenhados)
- [ ] Estados vazio/erro/loading das telas críticas presentes
- [ ] Fiel ao wireframe aprovado
- [ ] Repo contém a versão final (nenhum refino existente só no canvas)

## Convenções

- Arquivos `NN-<tela>.html`; card publicado: `@dsCard group="Hi-fi — <unidade>"`
- Limitação do executor: sem precisão vetorial/pixel-perfect — suficiente para produto; registrar no handoff o que exigir polish vetorial externo
