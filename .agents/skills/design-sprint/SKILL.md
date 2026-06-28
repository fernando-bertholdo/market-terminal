---
name: design-sprint
description: Exploracao colaborativa de design de produto/sistema. Guia criacao progressiva de documentos estrategicos a partir de uma ideia rough. Use antes de generate-tap quando nao ha materiais brutos existentes. Produz documentos individuais em documents/strategy/ a medida que cada dimensao e explorada, com revisao de consistencia ao final.
---

# Skill: design-sprint

Explorar colaborativamente o design de um produto/sistema, gerando documentos estrategicos individuais para cada dimensao analisada.

## Pipeline

```
Ideia rough (conversa com usuario)
    |
    v
design-sprint (exploracao + geracao progressiva)
    |
    v
documents/strategy/*.md (Tier 1 sempre, Tier 2 se aplicavel)
    |
    v
generate-tap (consolida em TAP estruturado)
    |
    v
kickoff-prompt (preenche placeholders do template)
```

## Quando Usar

- **Antes de generate-tap** -- quando o usuario tem uma ideia mas nao ha materiais brutos
- **Inicio de projeto** -- para explorar design antes de qualquer implementacao
- **Pivotagem** -- quando o projeto muda de direcao e precisa repensar fundamentos

## Quando NAO Usar

- Se materiais brutos ja existem em `documents/archive/` -- use `generate-tap` direto
- Se os documentos de estrategia ja foram preenchidos -- va direto ao kickoff
- Se o projeto e trivial (script, PoC descartavel) -- preencha kickoff diretamente

## Input Esperado

```
design-sprint
```
Inicia exploracao interativa completa.

```
design-sprint --dimension vision-strategy
```
Explora uma dimensao especifica (para sessoes de refinamento).

```
design-sprint --review-only
```
Executa apenas o pass de consistencia sobre docs existentes.

## Output

- **Tier 1 (sempre):** 4 documentos em `documents/strategy/`
  - `vision-strategy.md`
  - `constraints-no-goals.md`
  - `risk-assumptions.md`
  - `success-metrics.md`
- **Tier 2 (condicional):** ate 3 documentos adicionais
  - `user-personas.md` (se user-facing)
  - `business-model.md` (se ambicao comercial)
  - `competitive-landscape.md` (se mercado competitivo)
- **Relatorio final** de consistencia

## Workflow

### 0. Classificar Projeto

```
Antes de explorar dimensoes, fazer 3 perguntas classificatorias:

Q1: "Este projeto tem usuarios finais alem de voce?"
    SIM → flag USER_FACING = true → Tier 2: user-personas.md
    NAO → flag USER_FACING = false

Q2: "Ha ambicao comercial (mesmo que no futuro)?"
    SIM → flag COMMERCIAL = true → Tier 2: business-model.md
    NAO → flag COMMERCIAL = false

Q3: "Existem competidores ou alternativas conhecidas?"
    SIM → flag COMPETITIVE = true → Tier 2: competitive-landscape.md
    NAO → flag COMPETITIVE = false

Reportar ao usuario:
  "Classificacao: [personal/user-facing] + [non-commercial/commercial] + [greenfield/competitive]"
  "Documentos planejados: Tier 1 (4) + Tier 2 (N)"
```

### 1-4. Explorar Dimensoes Tier 1

Para cada dimensao, seguir o ciclo:
1. **Explorar** via perguntas guiadas (ver Guia de Exploracao abaixo)
2. **Sintetizar** o que foi discutido
3. **Gerar** o documento correspondente em `documents/strategy/`
4. **Confirmar** com o usuario antes de prosseguir para proxima dimensao

**Ordem obrigatoria (dependencias):**
```
1. vision-strategy.md     (fundacional — tudo deriva daqui)
2. constraints-no-goals.md (limites do escopo — informa riscos e metricas)
3. success-metrics.md      (como medir sucesso — informa risk assessment)
4. risk-assumptions.md     (riscos e premissas — referencia as 3 anteriores)
```

### 5-7. Explorar Dimensoes Tier 2 (se aplicavel)

Mesma mecanica. Ordem sugerida:
```
5. user-personas.md         (se USER_FACING)
6. business-model.md        (se COMMERCIAL)
7. competitive-landscape.md (se COMPETITIVE)
```

### 8. Review de Consistencia

```
Apos gerar TODOS os documentos:

a) Reler todos os docs gerados na sessao
b) Para cada documento, verificar:
   - Cross-references apontam para documentos que existem?
   - Terminologia e consistente? (mesmo conceito, mesmo nome)
   - Decisoes em docs posteriores contradizem docs anteriores?
   - Secao "→ Projeto.md" esta preenchida com ancora correta?
c) Corrigir inconsistencias detectadas
d) Reportar ao usuario:
   "Review de consistencia: N docs revisados, M correcoes aplicadas"
   [Lista de correcoes, se houver]
```

### 9. Proximos Passos

```
Reportar ao usuario:

## Design Sprint Concluido

**Documentos gerados:**
- [lista com links]

**Proximos passos sugeridos:**
1. Revisar documentos gerados (especialmente premissas e riscos)
2. Se ha materiais brutos adicionais → generate-tap
3. Se pronto para configurar template → kickoff-prompt
4. Se precisa refinar uma dimensao → design-sprint --dimension <nome>
```

---

## Guia de Exploracao por Dimensao

### Dimensao 1: Vision & Strategy

**Objetivo:** Articular por que o projeto existe e para onde vai.

**Perguntas guia:**
- Qual problema especifico este projeto resolve?
- Para quem? (mesmo que seja "para mim")
- Qual seria o "estado ideal" se tudo der certo?
- Ha um horizonte de evolucao? (fases, versoes, expansoes?)
- Qual e o diferencial em relacao a fazer isso manualmente ou nao fazer?

**Sinais de profundidade suficiente:**
- O problema esta articulado sem jargao
- Ha uma visao de curto E longo prazo
- O usuario consegue explicar o "por que agora"

### Dimensao 2: Constraints & No-Goals

**Objetivo:** Definir explicitamente o que NAO sera construido.

**Perguntas guia:**
- O que parece estar no escopo mas voce nao quer fazer (agora)?
- Ha limitacoes tecnicas, orcamentarias ou de tempo?
- Quais features voce explicitamente descarta?
- Ha dependencias externas que limitam o design?
- Qual e o "corte" entre MVP e versao ideal?

**Sinais de profundidade suficiente:**
- Ha pelo menos 3 "no-goals" explicitamente nomeados
- Constraints tecnicas e de negocio estao separadas
- O usuario reconhece trade-offs

### Dimensao 3: Success Metrics

**Objetivo:** Definir como saber se o projeto esta tendo sucesso.

**Perguntas guia:**
- Se o projeto estiver "funcionando perfeitamente", o que voce veria?
- Ha metricas quantitativas que indicam sucesso?
- Quais sao os indicadores de que NAO esta funcionando?
- Qual e o criterio para decidir "vale a pena continuar"?
- Metricas de curto prazo (validacao) vs longo prazo (valor)?

**Sinais de profundidade suficiente:**
- Ha pelo menos 1 metrica quantificavel
- Metricas de input (esforco) vs output (resultado) identificadas
- Criterio de "kill" ou "pivot" articulado

### Dimensao 4: Risk & Assumptions

**Objetivo:** Mapear o que pode dar errado e o que deve ser verdade.

**Perguntas guia:**
- O que deve ser verdade para o projeto funcionar? (premissas)
- Quais premissas voce ainda nao validou?
- O que acontece se [premissa X] for falsa?
- Quais sao os maiores riscos tecnicos?
- Quais sao os maiores riscos de negocio/operacionais?
- Ha dependencias externas que podem falhar?

**Sinais de profundidade suficiente:**
- Premissas e riscos estao separados
- Cada risco tem impacto + mitigacao
- Premissas nao-validadas identificam como serao testadas

### Dimensao 5: User Personas (Tier 2 — se USER_FACING)

**Objetivo:** Entender quem usa e que resultado espera.

**Perguntas guia:**
- Quem sao os usuarios primarios? E os secundarios?
- Qual e o "job to be done" principal de cada persona?
- O que cada persona faz HOJE sem este produto?
- Quais sao as frustraccoes com a solucao atual?
- Qual e o nivel tecnico de cada persona?

### Dimensao 6: Business Model (Tier 2 — se COMMERCIAL)

**Objetivo:** Articular como o projeto pode gerar valor capturavel.

**Perguntas guia:**
- Qual seria o modelo de monetizacao? (assinatura, freemium, one-time, API?)
- Quem paga? (usuario final, empresa, anunciante?)
- Qual e o tamanho estimado do mercado?
- Qual e o custo de operacao (infra, APIs, equipe)?
- Ha consideracoes legais/regulatorias?

### Dimensao 7: Competitive Landscape (Tier 2 — se COMPETITIVE)

**Objetivo:** Mapear alternativas e posicionamento.

**Perguntas guia:**
- Quais sao as alternativas existentes?
- O que elas fazem bem? O que fazem mal?
- Onde este projeto se diferencia?
- Ha barreiras de entrada ou vantagens competitivas?
- Qual e o posicionamento: premium, acessivel, nicho?

---

## Formato dos Documentos Gerados

Cada documento DEVE seguir a estrutura do template correspondente em `documents/strategy/`.

Se o template Tier 1 existe: usar como base, preencher secoes.
Se o template Tier 2 nao existe: criar arquivo com a estrutura definida no guia de exploracao.

**Regras obrigatorias para todos os documentos:**
1. Metadata com versao, data, status
2. Secao "→ Projeto.md" com link para secao correspondente
3. Cross-references para outros strategy docs quando relevante
4. Tag `[PREMISSA]` para informacao assumida, nao confirmada
5. Tag `[A VALIDAR]` para items que precisam de verificacao futura

---

## Regras de Qualidade

### Nao Inventar

- Se o usuario nao disse, nao assume — pergunte
- Use `[PREMISSA]` quando inferir algo nao explicitado
- Use `[A VALIDAR]` para items que precisam de pesquisa ou teste

### Exploracao, Nao Interrogatorio

- Perguntas devem ser conversacionais, nao formulario
- Aprofundar quando o usuario demonstra incerteza
- Oferecer exemplos e alternativas quando o usuario trava
- Compartilhar perspectivas e provocar reflexao

### Profundidade Adaptativa

- Projeto pessoal simples: 1-2 perguntas por dimensao bastam
- Produto com ambicao comercial: explorar ate sinais de profundidade
- Se o usuario quer ir rapido: gerar docs com mais `[A VALIDAR]`

### Progressao Visivel

Ao concluir cada dimensao, reportar:
```
Dimensao N/T concluida: [nome]
Documento gerado: documents/strategy/[arquivo].md
Proxima: [nome da proxima dimensao]
```

---

## Integracao com Outras Skills

| Skill | Relacao |
|-------|---------|
| `generate-tap` | Strategy docs alimentam o TAP; Mapa de Extracao incorpora dados |
| `kickoff-prompt` | Apos design-sprint + TAP, preenche template completo |
| `validate-kickoff` | Valida que placeholders foram preenchidos (incluindo strategy docs) |
| `fresh-context` | Strategy docs servem como input para CONTEXT.md inicial |
| `validate-docs-links` | Verifica cross-links entre strategy docs e Projeto.md |
| `update-docs` | Ao concluir milestone, propaga decisoes de volta aos strategy docs |
| `enhanced-planning` | Strategy docs informam guardrails do plano de implementacao |

---

## Exemplo de Uso

```
User: design-sprint

Claude:
Vou guiar a exploracao do design do seu projeto. Primeiro, 3 perguntas
para classificar o tipo de projeto:

1. Este projeto tem usuarios finais alem de voce?
2. Ha ambicao comercial (mesmo que no futuro)?
3. Existem competidores ou alternativas conhecidas?

User: 1. Sim, outros analistas. 2. Sim, possivelmente. 3. Bloomberg, mas caro.

Claude:
Classificacao: user-facing + commercial + competitive
Documentos planejados: Tier 1 (4) + Tier 2 (3) = 7 documentos

Vamos comecar pela Dimensao 1: Vision & Strategy.
Qual problema especifico este projeto resolve?

[... exploracao interativa ...]

Claude:
Dimensao 1/7 concluida: Vision & Strategy
Documento gerado: documents/strategy/vision-strategy.md
Proxima: Constraints & No-Goals

[... continua para cada dimensao ...]

Claude:
## Review de Consistencia
7 docs revisados, 2 correcoes aplicadas:
- risk-assumptions.md: atualizada referencia a metrica de success-metrics.md
- competitive-landscape.md: terminologia alinhada com vision-strategy.md

## Design Sprint Concluido

**Documentos gerados:**
- documents/strategy/vision-strategy.md
- documents/strategy/constraints-no-goals.md
- documents/strategy/success-metrics.md
- documents/strategy/risk-assumptions.md
- documents/strategy/user-personas.md
- documents/strategy/business-model.md
- documents/strategy/competitive-landscape.md

**Proximos passos sugeridos:**
1. Revisar documentos (especialmente premissas e riscos)
2. Executar generate-tap para consolidar em TAP estruturado
3. Executar kickoff-prompt para preencher template
```

---

**Versao:** 1.0.0
**Ultima atualizacao:** Template
