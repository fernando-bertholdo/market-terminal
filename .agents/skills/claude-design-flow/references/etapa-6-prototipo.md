# Etapa 6 — Protótipo Interativo

**Bundle:** B3. **Pré-condição:** telas da unidade (hi-fi; ou lo-fi para protótipo de conceito).

## O que produz

Protótipo navegável e testável **com código real** — não simulação de transições: navegação multi-tela, estados vivos (React `useState`), formulários com validação, modais, animações, device frame de iPhone pixel-accurate quando o alvo é mobile.

## Executor (dois níveis)

- **Local (sempre):** click-through HTML — as telas da etapa 5 ligadas por `<a>` + transições CSS simples; jornada documentada em `design/prototipo-<unidade>.md` (jornadas, passos, estados exercitados). Suficiente para validar sequência e completude.
- **Claude Design (protótipo rico):** gerar protótipo interativo no app ancorado no DS publicado — estados React, lógica condicional, fluxos multi-step, device frame. Brief menciona "mobile app"/"iOS" → frame de iPhone automático. Compartilhar via link org-scoped para teste com pessoas.

**Consumo:** protótipo rico é geração — vale a regra da etapa 5 (curado, ≤2 tentativas, confirmar antes).

## Protocolo

1. Mapear jornadas a testar (do flow da etapa 2): caminho feliz + 1-2 desvios críticos
2. Nível local primeiro: ligar as telas, percorrer no browser, corrigir becos sem saída
3. Se B3 pleno: gerar protótipo rico no Claude Design (uma jornada por vez), ancorado no DS
4. **Teste de usabilidade:** compartilhar link org-scoped; no device alvo real (mobile → abrir no celular). Fricções → anotar no CONTEXT; mudanças de layout voltam à etapa 3/5 — nunca se corrige "no protótipo"
5. Gate: jornadas percorridas + fricções registradas → `local-approved`

## Critério de done (`local-approved`)

- [ ] Caminho feliz navegável de ponta a ponta em cada jornada mapeada
- [ ] Voltar/fechar funcionam — sem becos sem saída
- [ ] Estados vivos relevantes exercitados (form com erro, toggle, modal)
- [ ] Testado no device alvo; fricções registradas
- [ ] `design/prototipo-<unidade>.md` documenta jornadas e onde o protótipo vive (paths locais + link org-scoped se houver)

## Ledger (v2→v3)

Substitui reactions/Smart Animate do executor anterior por código real — ganho em fidelidade de comportamento (lógica de verdade), perda parcial em gestos nativos de protótipo (drag/keyboard triggers dedicados). Interações por gesto que forem críticas → registrar como spec no handoff (etapa 7) para validação na implementação.
