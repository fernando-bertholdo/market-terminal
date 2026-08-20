# Auditoria de UI/UX — shell ATLAS

> **Data de origem: 2026-07-23.** Este documento é a transposição fiel de um
> relatório produzido naquela data — não foi reescrito, reordenado nem
> revalidado contra o código de hoje.
>
> | | |
> |---|---|
> | Produzido em | 2026-07-23, sessão `3e8ad4d6-6ff1-4681-9635-28856e7b0970` |
> | Processo | `audit-shell` — auditoria automatizada, **modo somente-leitura** |
> | Transposto em | 2026-08-20, issue TECH-31 |
> | Escopo do resgate | transposição literal; nenhum finding foi corrigido |
>
> **Como ler.** Os caminhos e números de linha apontam para o estado do código
> em 2026-07-23. Parte pode ter mudado — confira antes de agir. Um finding aqui
> é registro histórico, não tarefa aberta: a decisão sobre o que vira trabalho
> ainda não foi tomada (P2 da TECH-31).

---

Relatório final de auditoria UI/UX do shell ATLAS (read-only, por código). Findings por severidade Nielsen (4→1), notas por eixo, arquitetura de informação e pontos fortes.

## FINDINGS

### Severidade 3 — Major

[S3 · Heurística #1 visibilidade] Estado stale/erro dos dados nunca é exibido no shell. useMarketData.ts:45 calcula isStale e expõe error/lastUpdated, mas AtlasShell.tsx não renderiza nenhum deles. Os dots de fonte na sidebar (AtlasShell.tsx:310-321) são binários ok/não-ok — sem estado stale, sem timestamp de última atualização, sem mensagem de erro. Se /api/market falhar, o usuário vê "Waiting for live data…" (OverviewPage.tsx:139) para sempre. Fix: renderizar relTime(lastUpdated) + badge stale/erro no header ou StatusBar, e propagar market.error.

[S3 · A11y navegação por teclado] Modais sem focus trap nem restauração de foco. Palette (AtlasShell.tsx:102-198), CommandPalette.tsx, InstrumentChartOverlay.tsx:169, AccountSettings.tsx:68: definem aria-modal mas nenhum contém o Tab dentro do diálogo nem devolve foco ao gatilho no fechamento. Teclado vaza para a página atrás. Fix: focus-trap + restaurar foco no unmount.

[S3 · A11y] Overlay de gráfico não move foco para o diálogo ao abrir. InstrumentChartOverlay.tsx só registra ESC (linha 139); ao abrir, o foco permanece na página, então usuário de teclado "não entra" no modal. Fix: focar o container/primeiro controle no mount.

### Severidade 2 — Minor

[S2 · A11y] Sem regiões aria-live para dados que atualizam. Preços atualizam a cada 3s (AtlasShell.tsx:206) e o banner de alerta disparado (AtlasShell.tsx:386-400) surge sem role="alert"/aria-live. Leitores de tela não anunciam o evento crítico de alerta. Fix: role="alert" no banner; aria-live="polite" em KPIs-chave.

[S2 · Microinterações/A11y] prefers-reduced-motion ignorado em todo o app (0 ocorrências). animate-ping contínuo (QuantPage.tsx:116), animate-pulse (QuantPage.tsx:71, InstrumentChartOverlay.tsx:253, .status-dot-live em globals.css:148), hover -translate-y (OverviewPage.tsx:165, MarketsPage.tsx:143). Fix: media query global desativando animações.

[S2 · Consistência] Dois command palettes divergentes. O ativo é o Palette inline (AtlasShell.tsx:102, tokens corretos). O legado CommandPalette.tsx:151-201 usa nomes de cor antigos (text-accent-orange, border-panel-border) e vocabulário diferente (LAYOUT/RATES/MY TAPE) — código morto que, se roteado, mostra cores e termos errados. Fix: remover CommandPalette.tsx ou realinhar.

[S2 · Hierarquia/design system] Estilos de "box" inline duplicados em vez das primitivas. O padrão backgroundColor:var(--surface)+border+boxShadow é reescrito à mão em hero cards (OverviewPage.tsx:166), tiles de Markets (MarketsPage.tsx:144-149), cards de regime (MacroPage.tsx:140), tiles de News (NewsPage.tsx:80) e strips do Quant (QuantPage.tsx:112), em vez de reusar Card/StatTile de ui.tsx. Fix: extrair um <Panel>/<Tile> e reusar.

[S2 · Hierarquia] Tamanhos de fonte one-off proliferam sem escala tipográfica. text-[13.5px], text-[12.5px], text-[10.5px], text-[9.5px], text-[8.5px], text-[11.5px] espalhados — ~10 tamanhos arbitrários em vez de uma escala definida em tokens. Fix: escala tipográfica canônica.

[S2 · Feedback] Botão de refresh não dá feedback de operação em curso. AtlasShell.tsx:354-364: ícone estático, nunca gira/desabilita durante fetch, embora isValidating exista nos hooks. Fix: spin/disabled enquanto revalida.

[S2 · Arquitetura de informação] Superfícies duplicadas entre páginas. (a) Status do modelo de News aparece completo em NewsPage.tsx:62-125 e resumido em QuantPage.tsx:157-173. (b) Regime de risco é computado e rotulado de forma independente em MacroPage.tsx:21-49 (RISK-ON/OFF) e QuantPage.tsx:192-227 (regime.label) — dois "regimes" possivelmente divergentes para o mesmo usuário. Fix: unificar a leitura de regime numa fonte única.

[S2 · Estados] Loading inconsistente e sem skeletons. Quant substitui a página inteira por texto centralizado (QuantPage.tsx:69-75) causando layout shift; Overview/Markets usam placeholders inline — (melhor); nenhum lugar usa skeleton — conteúdo "pipoca". Fix: skeletons com a forma final; evitar full-page swap.

[S2 · A11y] Botões só-ícone com rótulo fraco/ausente. "×" de fechar em AccountSettings.tsx:76 sem aria-label; dots de fonte (AtlasShell.tsx:314) sem texto alternativo/anúncio; refresh usa title (não é nome acessível confiável). Fix: aria-label explícito.

### Severidade 1 — Cosmético

[S1 · Keyboard UX] Item selecionado do palette não faz scroll-into-view (AtlasShell.tsx:162-164) — com a lista longa de instrumentos, ArrowDown pode mover a seleção para fora da viewport.

[S1 · Descoberta] Atalho R (refresh) só descobrível via title; 1–5 e Ctrl K têm kbd visível (bom), mas R e / não são anunciados na UI.

[S1 · Consistência tipográfica] Números fora de .tabular-nums nos headers de ano da tabela Focus (MacroPage.tsx:190). Cobertura geral de tabular-nums é excelente no resto.

## (a) NOTAS POR EIXO (0-10)

1. Heurísticas de usabilidade — 6/10. Empty states e briefing em linguagem natural são fortes, mas a ausência total de visibilidade de stale/erro e de feedback no refresh derruba a nota.
2. Hierarquia visual e design system — 7/10. Tokens e disciplina de tabular-nums muito consistentes; perde por tamanhos px one-off e "box" inline duplicado em vez das primitivas.
3. Acessibilidade — 4/10. HTML semântico correto (button/a), mas sem focus trap/restauração, sem aria-live, reduced-motion ignorado e ícones sem rótulo.
4. Estados e microinterações — 6/10. Pulse "LIVE" e hover-lift agradáveis, mas sem skeletons, sem reduced-motion e sem estado de refresh em curso.
5. Arquitetura de informação — 7/10. Divisão em 5 páginas é limpa e legível; perde por regime/news-status duplicados e baixa descoberta de alguns atalhos.

## (b) ARQUITETURA DE INFORMAÇÃO (5 páginas)

- Overview (OverviewPage.tsx): briefing auto-escrito em prosa + 4 hero cards com sparkline 3m (click→chart) + board de movers ranqueado + Brazil policy stack (SELIC/CDI/DI) + 8 headlines.
- Markets (MarketsPage.tsx): todo o catálogo em tiles clicáveis por classe (FX/Rates BR/Rates US/Cmdty/Index) + tabela de risco de renda fixa (DV01/duration) + curvas + heatmap de correlação.
- Macro (MacroPage.tsx): 4 medidores de regime com leitura em linguagem natural + tiles de indicadores US (FRED) e Brasil + tabela Focus (SELIC/IPCA) vs política atual.
- Quant (QuantPage.tsx): simulador paper-trading — strip LIVE + executor + P&L do dia, banner de regime, KPIs, gatilhos de news pré-mercado, expressões hedgeadas, matriz de decisão, paper book, cenários e racional.
- News (NewsPage.tsx): status do modelo ML + freshness + leitura macro ao vivo + chips de filtro por fonte + busca textual + lista de headlines com timestamp/tema/impacto.

## (c) 5 PONTOS FORTES

1. Disciplina de tokens e numerais: cores 100% via CSS vars e .tabular-nums (fonte mono) aplicado quase universalmente a números — leitura tabular consistente.
2. HTML semântico correto: <button>/<a> reais em toda navegação e tiles (não div onClick), com rel="noopener noreferrer" nos links externos.
3. Empty states genuínos e contextuais: movers, posições, hedges, cenários, gatilhos e news todos têm mensagens explicativas (não telas em branco), várias educando o usuário (ex.: "NOK não é erro").
4. Briefing e racional em linguagem natural: Overview e "Why the strategy is positioned this way" traduzem dados densos em frases — excelente para orientação e onboarding.
5. Responsividade pensada: sidebar→bottom-tab no mobile (AtlasShell.tsx:412), Account promovido ao header quando a sidebar some, tabelas largas com overflow-x-auto e safe-area-inset respeitado.
