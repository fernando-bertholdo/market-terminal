# Scope Horizons — O que pode vir a ser, e por que ainda não

## Metadata

- **Versao:** 1.0.0
- **Status:** Template
- **Ultima atualizacao:** {{DATE}}
- **Responsavel:** {{RESPONSIBLE_NAME}}
- **Mantido por:** skill `scope-horizons` (modos `capture` e `review`)

---

## O que é este documento

O **sinal oposto** do [`constraints-no-goals.md`](constraints-no-goals.md). As duas frases são
a mesma frase, com sinais trocados:

> **No-goal:** "isso está fora do escopo." → recusa justificada; **protege o foco**.
> **Horizonte:** "isso é a expansão natural deste produto." → adiamento com valor reconhecido;
> **preserva a visão**.

O `Roadmap.md` sabe dizer *"sim, na fase 2"*. O `constraints-no-goals.md` sabe dizer *"não"*.
Este documento existe para dizer **"sim, algum dia, e eis por quê"** — sem que isso vire
compromisso, prazo ou fila.

Um horizonte registrado aqui **não é dívida**. Ninguém deve nada por ele estar escrito.

---

## O que entra — três testes, todos obrigatórios

| # | Teste | Passa | Falha |
|---|-------|-------|-------|
| 1 | Amplia o **escopo do produto** para usuário ou negócio — não é melhoria interna nem ferramenta | "o produto pode cobrir também a etapa X da cadeia" | "esse script podia virar CLI" |
| 2 | Está **fora do plano** e não há intenção de trazer para dentro agora | "fora do perímetro da v1" | "isso é a M2.3" |
| 3 | Nasceu de **evidência concreta produzida pelo trabalho**, com artefato linkável | um mapa, um relatório, um PR | palpite de corredor |

**Três de três, ou não é horizonte.** O teste 3 é o que mantém o documento vivo: sem artefato
para linkar, a entrada não existe. Isso amarra o volume à taxa de produção de evidência do
projeto — naturalmente baixa — e não à taxa de produção de pensamento, que é infinita.

Ideia técnica ou operacional **não entra aqui** e não tem destino neste repositório: se um dia
virar trabalho, nasce como issue pelo caminho normal.

---

## Formato

IDs são `H-N`, sequenciais e **nunca reaproveitados** — uma entrada despachada mantém o número.

<!-- MODELO — copie a estrutura abaixo para cada horizonte novo.
     Campos obrigatórios: Origem, Por que não agora, Estado.
     "Tensiona" recebe `—` quando o projeto não tem decisão de escopo identificável.

## H-1 — <título curto do horizonte>

- **Registrado em:** AAAA-MM-DD
- **Origem:** [<artefato>](<link>) → <caminho do entregável, se houver>
- **Tensiona:** <decisão de escopo que o mantém fora, qualificada pelo projeto>
- **Estado:** engavetado, sem prazo

<2 a 5 linhas: o que a evidência mostrou e que ampliação ela sugere.>

**Por que não agora:** <a razão, escrita enquanto ela está fresca.>
-->

---

## Horizontes

<!-- Entradas vivas. Vazio é o estado normal de um projeto novo:
     horizonte não se preenche no kickoff, é produzido pelo trabalho. -->

_Nenhum horizonte registrado._

---

## Desfechos

<!-- Entradas despachadas pela triagem (`scope-horizons review`), com para onde foram.
     Três vereditos possíveis:
       1. virou trabalho  → issue no board pelo caminho normal; anotar o identificador
       2. virou recusa    → migra para constraints-no-goals.md; anotar o no-goal
       3. continua engavetado → permanece em `## Horizontes`, não desce para cá -->

_Nenhum desfecho registrado._

---

## → Projeto.md

Enquanto um horizonte está engavetado **não há o que refletir** em
[`Projeto.md`](../core/Projeto.md): ele é, por definição, a ausência de decisão final, e
registrá-lo lá inventaria um compromisso não assumido.

A salvaguarda do diretório volta a valer no **desfecho**: horizonte que vira trabalho chega ao
`Projeto.md` por `update-docs`; horizonte que vira recusa chega pelo `constraints-no-goals.md`.
