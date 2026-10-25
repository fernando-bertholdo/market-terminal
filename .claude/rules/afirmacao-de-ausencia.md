---
paths:
  - "documents/**/*"
  - ".planning/**/*"
---

# Afirmação de Ausência

## Metadata

- **Versão:** 1.0.0
- **Status:** ✅ Template (Path-targeted)
- **Última atualização:** Template
- **Origem:** TECH-1098. Um documento de varredura afirmou como `[FATO]` que uma planilha não
  tinha linha para um dado, e as abas que o registravam já existiam na data da varredura: nenhuma
  leitura tinha passado por elas. No mesmo documento, 7 dos 12 parágrafos `[FATO]` afirmavam
  ausência e nenhum dizia o que tinha sido lido (contagem por parágrafo separado por linha em
  branco).

## Regra de Ouro

**"Ausência só se afirma sobre o que foi lido. Quem diz que a fonte não tem, diz quanto da fonte leu."**

Presença se prova com uma ocorrência; ausência, só com a leitura inteira. Uma busca que não acha,
uma planilha aberta na primeira aba, um PDF lido até a página 20 e um `ls` que esconde arquivo
oculto produzem o mesmo "não tem", e o leitor não distingue um do outro se o texto não disser.

## O que é afirmação de ausência

Toda frase que diz que uma fonte **não contém** algo: "não tem", "não há", "não traz", "não
consta", "nenhum", "sem aba", "zero ocorrências", "não foi encontrado", "falta". Vale para fonte
estruturada, que tem partes contáveis:

| Fonte | Unidade da cobertura |
|---|---|
| Planilha | abas; linhas de cada aba lida |
| PDF ou documento paginado | páginas |
| Pasta ou repositório | itens, ocultos inclusive, e o ref ou a data da listagem |
| Busca (sistema, conector, `grep`) | resultados lidos; termos e idiomas buscados |
| Base, tabela, log | registros ou linhas; filtro aplicado |

## A linha de cobertura

A afirmação traz, no mesmo parágrafo, item de lista ou célula, uma linha neste formato:

```
Cobertura: <lido> de <total> <unidade>[; <lido> de <total> <unidade>] (<como foi medido>)
```

- `<lido>` é um número ou um intervalo (`linhas 1–200`); `<total>` é o que a fonte tem, medido
  na fonte, não estimado.
- Uma unidade por segmento, separados por `;`, da maior para a menor: abas antes de linhas.
- `(<como foi medido>)` é o comando, a ferramenta ou a leitura que deu os números, entre crases
  quando for comando ou arquivo. É a fonte do numeral (varredura 2 da §7 do `pre-commit-check`).

Exemplos:

```
Cobertura: 40 de 40 abas; linhas 1–106 de 106 na aba `Conferência` (`inventario.py relatorio.xlsx`)
Cobertura: páginas 1–20 de 64 (`pdftotext -l 20 contrato.pdf`)
Cobertura: 214 de 214 itens, ocultos inclusive (`git ls-tree -r origin/main docs/`)
Cobertura: 48 de 48 resultados; termos "fatura" e "invoice" (busca no sistema de arquivos, 06/10)
```

## Sem cobertura, a marca é `[NÃO DEFINIDO]`

Afirmação de ausência sem a linha de cobertura é `[NÃO DEFINIDO]`, não `[FATO]` (vocabulário de
marcas da skill `generate-tap`). Com cobertura parcial (`<lido>` menor que `<total>`), a ausência
vale para a parte lida, e a frase diz isso: "nas 12 abas lidas não há…". Sobre a fonte inteira, a
afirmação continua `[NÃO DEFINIDO]`. Quando o total não se mede (contagem de busca que oscila entre
chamadas iguais), escreva `de ? resultados`: a ausência é ordem de grandeza, nunca `[FATO]`.

## Antes de escrever "não tem"

- [ ] A fonte foi enumerada inteira: todas as abas, todas as páginas, a listagem com ocultos
- [ ] O total saiu da fonte, e a leitura cobriu o total ou o texto diz qual parte cobriu
- [ ] Busca negativa rodou em todos os idiomas da fonte e com as variantes do termo
- [ ] A linha `Cobertura:` está no mesmo parágrafo da afirmação

## Onde é cobrada

- **Antes do commit:** `pre-commit-check`, §7, varredura 3 — aviso, não bloqueio, sobre
  parágrafo, item de lista ou linha de tabela marcado `[FATO]` que afirma ausência sem `Cobertura:`
- **Mensagem de commit e corpo de PR:** a varredura 1 da mesma §7 já casa `nenhum`; a pergunta que
  esta regra acrescenta é quanto foi lido, não só quem mediu
