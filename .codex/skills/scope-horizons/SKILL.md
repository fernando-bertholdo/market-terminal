---
name: scope-horizons
description: Registrar e triar horizontes de escopo — ampliações do produto que surgem no meio do trabalho, ficam fora do plano e não têm prazo. Use `capture` quando uma evidência produzida pelo trabalho sugerir que o produto pode crescer para além do escopo atual, e `review` ao completar uma fase para dar veredito aos horizontes vivos. Mantém `documents/strategy/scope-horizons.md`.
---

# scope-horizons

Mantém [`documents/strategy/scope-horizons.md`](../../../documents/strategy/scope-horizons.md) —
o sinal oposto do `constraints-no-goals.md`.

## Regra de Ouro

**"Três de três, ou não é horizonte. E horizonte registrado não é dívida de ninguém."**

## Quando Usar

- **`capture`** — quando o trabalho produz uma evidência que sugere ampliação do produto para
  além do escopo atual, e você não pretende trazer isso para dentro agora
- **`review`** — ao completar uma fase (passo do bloco "Ao completar uma fase" do `CLAUDE.md`)

## Quando NÃO Usar

- Ideia técnica ou operacional ("esse script podia virar CLI") — não entra aqui e não tem
  destino neste repositório; se virar trabalho, nasce como issue pelo caminho normal
- Trabalho que você pretende fazer — isso é issue ou milestone, não horizonte
- Raciocínio que antecedeu uma decisão — isso é `.planning/scratch/`

## Parâmetros

```
scope-horizons capture      # registrar um horizonte
scope-horizons review       # triagem de fim de fase
```

---

## Os três testes

Todos obrigatórios. Aplique **em voz alta**; se algum falhar, diga qual e **pare** — não
negocie, não registre "parcialmente".

| # | Teste | Passa | Falha |
|---|-------|-------|-------|
| 1 | Amplia o **escopo do produto** para usuário ou negócio — não é melhoria interna nem ferramenta | "o produto pode cobrir também a etapa X da cadeia" | "esse script podia virar CLI" |
| 2 | Está **fora do plano** e não há intenção de trazer para dentro agora | "fora do perímetro da v1" | "isso é a M2.3" |
| 3 | Nasceu de **evidência concreta produzida pelo trabalho**, com artefato linkável | um mapa, um relatório, um PR | palpite de corredor |

O teste 3 é o que mantém o documento vivo: ele amarra o volume à taxa de produção de evidência
do projeto — naturalmente baixa — e não à taxa de produção de pensamento, que é infinita.

---

## Modo `capture`

1. **Aplicar os três testes em voz alta.** Falhou um? Diga qual e pare.
2. **Extrair o link da evidência** — PR, documento de iniciativa, relatório. Sem link, o teste
   3 falhou.
3. **Identificar a decisão de escopo tensionada** — a decisão que mantém a ideia fora. `—` se o
   projeto não tiver uma. Qualifique-a pelo projeto quando houver risco de colisão de
   numeração entre iniciativas.
4. **`grep` por entrada equivalente** no documento. Se houver, proponha **emendar a existente**
   em vez de abrir `H-N+1`.
5. **Apresentar a entrada pronta e formatada** para aprovação. Gravar só após o "sim".

### Guardrails de ruído

- **Propor, nunca gravar sozinho.** A entrada só existe depois do aval humano.
- **Máximo uma proposta de horizonte por turno.** Detectou duas? Escolha a mais forte e
  descarte a outra.
- A proposta **se resolve no mesmo turno** — aceita ou descartada. Isso satisfaz a §1.7 do
  `CLAUDE.md` sem criar pendência órfã: o custo de recusar é uma palavra.

---

## Modo `review`

Triagem de fim de fase. Percorra `## Horizontes` e, para cada entrada, proponha **um** veredito
com justificativa de uma linha:

| # | Veredito | O que acontece |
|---|----------|----------------|
| 1 | **Virou trabalho** | Nasce issue no board pelo caminho normal, classificada pelo `AGENTS.md` §2 como qualquer outra. A entrada migra para `## Desfechos` com o identificador. |
| 2 | **Virou recusa** | Migra para `constraints-no-goals.md` como no-goal, reaproveitando a justificativa já escrita em "Por que não agora". A entrada migra para `## Desfechos` apontando o no-goal. |
| 3 | **Continua engavetado** | Permanece. Sem culpa, sem contador, sem cutucada. |

**Isto não é gate bloqueador.** Diferente de `validate-dod`, esta skill não impede nada:
"continua engavetado" é resposta válida para todos os itens, inclusive todos de uma vez.

O veredito 2 é o **dreno** que torna o documento sustentável. Um registro que só recebe
entradas cresce para sempre; aqui, a cada fase algumas ideias amadurecem o bastante para se
dizer "não" com convicção — e saem tendo **produzido** um no-goal justificado, que protege o
foco das fases seguintes.

---

## Integração com Skills Existentes

| Skill | Relação |
|---|---|
| `update-docs` | Leva ao `Projeto.md` o horizonte que virou trabalho (veredito 1) |
| `audit-architecture` | A exceção de `scope-horizons.md` à salvaguarda de `strategy/` está nomeada no `strategy/README.md`; não é violação |
| `archive-initiative` | Não toca este documento — `strategy/` é perene e nunca é arquivado |
| `init-milestone` / `init-detour` | A tabela "Ideias Adiadas" do `CONTEXT.md` continua existindo para o que é **da iniciativa**; horizonte é do **produto** |

---

**Versão:** 1.0.0
**Última atualização:** {{DATE}}

## Changelog

### v1.0.0
- Versão inicial: modos `capture` e `review`, três testes de admissão, três vereditos de
  triagem, guardrails de ruído
