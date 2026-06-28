# Instruções para Documentação (Codex)

Este diretório contém documentação do projeto. **Siga estas regras ao trabalhar aqui.**

## Fonte de verdade
- `documents/core/Projeto.md` é a **fonte única de verdade** para decisões de negócio e arquitetura.
- `documents/technical/` e `documents/strategy/` são **suplementares**.
- Se houver conflito, **Projeto.md prevalece**.

## Salvaguardas
- Todo documento em `technical/` ou `strategy/` deve **linkar** para a seção correspondente em `Projeto.md`.
- Nenhuma decisão final deve existir apenas fora de `core/`.
- Evite duplicação de conteúdo entre `core/` e `technical/`/`strategy/`.

## Fluxo de uso
- Use `documents/README.md` como índice.
- Atualize `Roadmap.md` e `TODO.md` quando decisões ou status mudarem.

## Contexto e IA
- Ao editar documentação extensa, prefira mudanças pequenas e claras.
- Mantenha links atualizados; use `validate-docs-links` quando necessário.
