# Etapa 4 — Design System (núcleo da migração)

**Bundle:** B2 e B3. **Per-produto:** primeiro uso cria; seguintes estendem. **1 projeto `DESIGN_SYSTEM` por produto** (`<Produto> — Design System`).

## O que produz

A biblioteca de design do produto **no repo**, publicada no Claude Design para que o agente de design gere telas **com os componentes compilados reais** — a vantagem estrutural deste executor: não existe representação paralela a manter em sincronia.

## Pipeline canônico (unidirecional — única fonte por camada)

```
design-tokens.md  (FONTE: tabela nome→valor→papel; decisões de identidade)
      ↓ gera
tokens.css        (CSS custom properties; modos light/dark via atributo)
      ↓ consomem
componentes       (HTML autocontido por componente, estilos inline ou
                   <style> local consumindo as custom properties;
                   variantes exercitadas no mesmo card)
      ↓ header
@dsCard           (<!-- @dsCard group="…" viewport="…" name="…" -->)
      ↓ publica
Projeto DESIGN_SYSTEM no Claude Design
```

**Derivados não se editam à mão** — mudou identidade → editar `design-tokens.md` e regenerar a cadeia. Decisões de identidade (paleta escolhida, tipografia) → `DECISIONS.md` na reconciliação.

## Localização

- Em desenvolvimento: `.planning/<tipo>/<nome>/design/ds/` (tokens + componentes)
- Estabilizado (produto com front-end real): a biblioteca converge para o código-fonte (`src/`), e o `/design-sync` passa a operar direto do codebase — caminho nativo da skill oficial

## Insumos (ordem de precedência)

1. **REGISTRY** — DS existe? → modo extensão (nunca recriar; nunca coleção paralela)
2. **Codebase** — se já existe front-end (React/Storybook), a skill oficial `/design-sync` extrai e converte os componentes reais; esta etapa então só orquestra e valida
3. **`documents/design/DECISIONS.md`** — identidade já decidida
4. **Dia zero** — plano de tokens compacto (paleta 4-6 cores nomeadas, 2 typefaces por papel, escala de espaçamento) validado com o usuário ANTES de construir

## Protocolo

1. Consultar REGISTRY (criar × estender); validar direção com usuário se DS novo
2. Construir/estender a cadeia local (tokens → css → componentes com variantes)
3. Gate local: revisar cards no browser → `local-approved`
4. **Publicar:** biblioteca completa → skill oficial **`/design-sync`** (conversão fiel + **render-check por card** + upload incremental + âncora `_ds_sync.json`); ajustes pontuais de poucos cards → `--publish` (DesignSync direto)
5. **Contrato do render-check (aceite externo):** cards esperados == renderizados; zero `bad`; ≤2 iterações de correção — persistindo contagens no REGISTRY; falhou de novo → parar e reportar
6. REGISTRY: `projectId`, grupos, contagens, `last_published`, estado `published`

## Critério de done

- [ ] `local-approved`: tokens definidos, componentes com variantes exercitadas, zero valor hardcoded fora de `design-tokens.md`
- [ ] `published` (quando publicado): render-check dentro do contrato; REGISTRY atualizado

## Segurança e consumo

- Security gate pré-sync ([reconciliacao.md](reconciliacao.md)): sem secrets/PII; confirmar projeto+org
- `/design-sync` de repo grande pode levar horas no 1º sync — avisar o usuário; excluir `.git`/`node_modules`
