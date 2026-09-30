---
description: Templates para documentação de código, decisões técnicas e explicações
---

# Documentation Templates

Templates estruturados para explicar decisões técnicas no código seguindo abordagem Karpathy.

## Princípio

**Explicação > Descrição**

Não apenas descrever o que o código faz, mas explicar por que existe, por que foi implementado assim, e quais são as implicações.

## Template de Docstring Completo

```python
def funcao_exemplo(
    param1: int,
    param2: str,
    param3: Optional[float] = None
) -> bool:
    """
    [Linha resumo de uma sentença terminada em ponto.]

    CONTEXTO:
        Por que este código existe?
        Qual problema de negócio resolve?
        Referência: [TAP, Projeto.md, etc.]

    DECISÕES TÉCNICAS:
        1. Por que esta implementação?
           - Decisão: [O que foi escolhido]
           - Alternativas: [O que foi considerado]
           - Trade-off: [Prós vs contras]

    SUPOSIÇÕES:
        1. [Suposição 1] - [Impacto se falsa]
        2. [Suposição 2] - [Como mitigar]

    LIMITAÇÕES:
        - ❌ [O que NÃO faz]
        - ❌ [Cenários não cobertos]

    Args:
        param1: Descrição clara do parâmetro
        param2: Descrição com exemplo se útil
        param3: Opcional - Descrição incluindo default

    Returns:
        Descrição do valor de retorno

    Raises:
        ValueError: Quando e por que

    Example:
        >>> funcao_exemplo(42, "teste", 3.14)
        True
    """
    pass
```

## Exemplo Genérico

```python
def calcular_metrica(
    valor_principal: float,
    valor_secundario: float
) -> float:
    """
    Calcula métrica de negócio.

    CONTEXTO:
        Métrica CRÍTICA para [objetivo de negócio].
        [Descrição da importância]

        Referência: Projeto.md Seção X

    DECISÕES TÉCNICAS:

        1. Por que esta fórmula?
           - [Justificativa técnica]

        2. Por que permitir casos especiais?
           - [Cenário válido]
           - [Prática de domínio]

    SUPOSIÇÕES:
        1. valor_secundario sempre positivo
        2. Valores na mesma unidade
        3. Valores em moeda local

    LIMITAÇÕES:
        - Não valida relação entre valores
        - Não considera timing

    Args:
        valor_principal: Valor principal (unidade)
        valor_secundario: Valor secundário (unidade)

    Returns:
        Resultado calculado

    Raises:
        ValueError: Se valor_secundario ≤ 0

    Example:
        >>> calcular_metrica(750_000.0, 1_000_000.0)
        75.0
    """
    if valor_secundario <= 0:
        raise ValueError(f"valor_secundario deve ser positivo (recebido: {valor_secundario})")

    return (valor_principal / valor_secundario) * 100
```

## Template ADR (Architecture Decision Record)

```markdown
# ADR-001: [Título da Decisão]

## Status
[Proposto | Aceito | Rejeitado | Substituído]

## Contexto
[Por que precisamos decidir?]

## Decisão
[O que foi decidido?]

## Alternativas Consideradas
1. [Opção 1] - Pros/Cons
2. [Opção 2] - Pros/Cons

## Consequências
- Positivas: [Lista]
- Negativas: [Lista]

## Referências
[Links para docs, POCs, benchmarks]
```

## Checklist de Explicação

Ao documentar código, garantir:

- [ ] Contexto documentado
- [ ] Decisões técnicas justificadas
- [ ] Alternativas mencionadas
- [ ] Trade-offs explícitos
- [ ] Suposições listadas
- [ ] Limitações documentadas
- [ ] Referências incluídas
- [ ] Exemplos de uso (happy + edge + error)

## Sinais de Documentação Insuficiente

### ❌ Ruim

```python
def calc_perc(dc, pl):
    """Calcula %."""
    return (dc / pl) * 100
```

**Problemas:**
- Nomes abreviados
- Docstring vazia
- Sem type hints
- Sem tratamento de erro
- Sem contexto de negócio

### ✅ Bom

Ver exemplo completo acima.

---

**Versão:** 1.0.0
