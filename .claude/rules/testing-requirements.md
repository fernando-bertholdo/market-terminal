---
paths:
  - "tests/**/*"
  - "**/test_*.py"
  - "**/*_test.py"
---

# Testing Requirements

## Metadata

- **Versão:** 1.0.0
- **Status:** Template (Path-targeted)
- **Última atualização:** Template
- **Responsável:** Fernando Bertholdo
- **Paths:** tests/**/*, test_*.py, *_test.py

---

## Escopo

Esta regra contém exemplos em **Python** (pytest) porque é path-targeted para padrões `test_*.py`/`*_test.py`.  
Se o projeto não for Python, substitua por uma regra equivalente do stack escolhido e ajuste `Paths` e exemplos.

---

## Quando Aplicar Esta Regra

**SEMPRE** - Testes devem ser escritos:
- Antes ou durante implementação (TDD ou test-after)
- Para toda funcionalidade nova
- Para todo bug fix (reproduzir bug primeiro)
- Ao refatorar (garantir não-regressão)

**NUNCA:**
- Pular testes porque "é simples"
- Testar apenas o "happy path"
- Commitar código sem testes

---

## Referências

- [Projeto.md](../../documents/core/Projeto.md) - Regras de negócio a testar
- [code-quality-standards.md](code-quality-standards.md) - Qualidade de código
- [Roadmap.md](../../documents/core/Roadmap.md) - DoD por milestone (cobertura mínima)

---

## Cobertura Mínima

### Por Tipo de Código

| Tipo | Cobertura Mínima | Rationale |
|------|------------------|-----------|
| **Core Business Logic** | **>90%** | Regras críticas do negócio |
| **Integrações** | **>80%** | APIs, e-mail, persistência |
| **Utilitários** | **>80%** | Normalização, parsing, validações |
| **Overall (projeto)** | **>80%** | Meta geral do projeto |

---

## Estrutura de Testes

### Organização de Diretórios

```
tests/
├── unit/                    # Testes unitários (funções isoladas)
│   ├── test_calculator.py
│   ├── test_processor.py
│   ├── test_normalizer.py
│   └── test_validator.py
├── integration/             # Testes de integração (componentes juntos)
│   ├── test_pipeline.py
│   ├── test_api_client.py
│   └── test_email_sender.py
├── fixtures/                # Fixtures e mocks
│   ├── sample_data.py
│   └── mock_responses.py
└── conftest.py              # Configuração global do pytest
```

### Naming Convention

```python
# tests/unit/test_calculator.py

def test_calcular_metrica_caso_normal():
    """Testa cálculo de métrica em caso normal."""
    pass

def test_calcular_metrica_quando_valor_zero_deve_lancar_erro():
    """Testa ValueError quando valor é zero."""
    pass

def test_calcular_metrica_quando_valor_negativo_deve_retornar_zero():
    """Testa comportamento com valor negativo."""
    pass
```

**Formato:** `test_<function>_<scenario>_<expected>`

---

## AAA Pattern (Arrange-Act-Assert)

**Regra de Ouro:** Todo teste deve seguir AAA pattern.

### Exemplo Correto

```python
import pytest
from src.processors.calculator import calcular_metrica

def test_calcular_metrica_caso_normal():
    """Testa cálculo de métrica em caso normal."""
    # Arrange (preparar dados)
    valor_base = 750.0
    fator = 1.5
    esperado = 1125.0

    # Act (executar função)
    resultado = calcular_metrica(
        valor_base=valor_base,
        fator=fator
    )

    # Assert (validar resultado)
    assert resultado == esperado


def test_calcular_metrica_quando_valor_zero_deve_lancar_erro():
    """Testa ValueError quando valor é zero."""
    # Arrange
    valor_base = 0.0
    fator = 1.5

    # Act & Assert (usando pytest.raises)
    with pytest.raises(ValueError, match="valor deve ser positivo"):
        calcular_metrica(
            valor_base=valor_base,
            fator=fator
        )
```

---

## Fixtures e Mocks

### Fixtures (Dados de Teste Reutilizáveis)

```python
# tests/conftest.py
import pytest
from typing import Dict, List

@pytest.fixture
def dados_exemplo() -> Dict[str, any]:
    """Dados de exemplo para testes."""
    return {
        "id": "ITEM_001",
        "nome": "Item Teste",
        "valor": 1000.0,
        "categoria": "A"
    }


@pytest.fixture
def lista_items() -> List[Dict]:
    """Lista de items para testes."""
    return [
        {"id": "ITEM_001", "valor": 100.0},
        {"id": "ITEM_002", "valor": 200.0},
        {"id": "ITEM_003", "valor": 300.0},
    ]


# Uso
def test_processar_item(dados_exemplo):
    """Testa processamento de item."""
    # Arrange (usa fixture)
    item = dados_exemplo

    # Act
    from src.processors.processor import processar_item
    resultado = processar_item(item)

    # Assert
    assert resultado is not None
```

### Mocks (Simular Dependências Externas)

```python
from unittest.mock import patch, MagicMock
import pytest

def test_buscar_dados_quando_api_indisponivel_deve_retornar_none():
    """Testa comportamento quando API está indisponível."""
    # Arrange
    item_id = "ITEM_001"

    # Act (mock de requests.get)
    with patch('requests.get') as mock_get:
        mock_get.side_effect = ConnectionError("API indisponível")

        from src.services.api import buscar_dados
        resultado = buscar_dados(item_id)

    # Assert
    assert resultado is None  # Deve retornar None ao invés de crashar


def test_enviar_email_quando_smtp_falha_deve_logar_erro(caplog):
    """Testa log de erro quando SMTP falha."""
    # Arrange
    destinatarios = ["teste@exemplo.com"]
    assunto = "Teste"
    corpo = "Corpo do e-mail"

    # Act (mock de smtplib)
    with patch('smtplib.SMTP') as mock_smtp:
        mock_smtp.return_value.__enter__.return_value.send_message.side_effect = Exception("SMTP falhou")

        from src.services.email import enviar_email
        resultado = enviar_email(destinatarios, assunto, corpo)

    # Assert
    assert resultado is False
    assert "Erro ao enviar e-mail" in caplog.text
```

---

## Testes Parametrizados

**Use para testar múltiplos casos com mesma lógica.**

```python
import pytest

@pytest.mark.parametrize("valor,fator,esperado", [
    (100.0, 1.0, 100.0),      # Fator 1 (sem mudança)
    (100.0, 1.5, 150.0),      # Fator 1.5
    (100.0, 2.0, 200.0),      # Fator 2
    (0.0, 1.5, 0.0),          # Valor zero
])
def test_calcular_metrica_casos_diversos(valor, fator, esperado):
    """Testa cálculo de métrica em diversos cenários."""
    resultado = calcular_metrica(valor, fator)
    assert resultado == pytest.approx(esperado, rel=1e-2)


@pytest.mark.parametrize("categoria,esperado", [
    ("A", True),
    ("B", True),
    ("C", False),
    ("D", False),
])
def test_validar_categoria(categoria, esperado):
    """Testa validação de categorias."""
    resultado = validar_categoria(categoria)
    assert resultado == esperado
```

---

## Casos de Borda e Edge Cases

**Obrigatório testar:**

### 1. Valores Extremos
```python
def test_calcular_quando_valor_zero_deve_retornar_zero():
    """Resultado = 0 quando valor é zero."""
    assert calcular(valor=0, fator=1.5) == 0


def test_calcular_quando_fator_none_deve_retornar_none():
    """Resultado = None quando fator é None."""
    assert calcular(valor=100, fator=None) is None
```

### 2. Inputs Inválidos
```python
def test_calcular_quando_valor_negativo_deve_lancar_erro():
    """ValueError quando valor é negativo."""
    with pytest.raises(ValueError):
        calcular(valor=-100, fator=1.5)


def test_processar_quando_id_vazio_deve_lancar_erro():
    """ValueError quando ID está vazio."""
    with pytest.raises(ValueError):
        processar("")
```

### 3. Estados Não Esperados
```python
def test_processar_quando_dados_incompletos_deve_flagear():
    """Flag de qualidade quando dados estão incompletos."""
    dados = {"id": "ITEM_001"}  # Falta 'valor'
    resultado = processar(dados)
    assert resultado["qualidade"] == "INCOMPLETO"
```

---

## Testes de Integração

**Testar componentes trabalhando juntos.**

```python
# tests/integration/test_pipeline.py

def test_pipeline_completo():
    """Testa pipeline completo: coleta → processamento → saída."""
    # Arrange
    item_id = "ITEM_001"

    # Act
    with patch('src.services.api.buscar_dados') as mock_buscar:
        mock_buscar.return_value = {
            "id": "ITEM_001",
            "valor": 1000.0,
            "categoria": "A"
        }

        from src.main import processar_pipeline
        resultado = processar_pipeline(item_id)

    # Assert
    assert resultado["processado"] is True
    assert resultado["valor_calculado"] == 1500.0
```

---

## Execução de Testes

### Comandos

```bash
# Executar todos os testes
pytest

# Executar com cobertura
pytest --cov=src --cov-report=html --cov-report=term

# Executar apenas unit tests
pytest tests/unit/

# Executar apenas integration tests
pytest tests/integration/

# Executar testes de um módulo específico
pytest tests/unit/test_calculator.py

# Executar teste específico
pytest tests/unit/test_calculator.py::test_calcular_metrica_caso_normal

# Modo verbose
pytest -v

# Parar no primeiro erro
pytest -x

# Executar apenas testes marcados (ex: @pytest.mark.slow)
pytest -m slow
```

### Configuração (pyproject.toml)

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = """
    --strict-markers
    --cov=src
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80
"""
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests as integration tests",
]

[tool.coverage.run]
source = ["src"]
omit = [
    "*/tests/*",
    "*/venv/*",
    "*/__pycache__/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "if TYPE_CHECKING:",
]
```

---

## Ferramentas

### Obrigatórias
- **pytest** - Framework de testes
- **pytest-cov** - Cobertura de código
- **pytest-mock** - Mocks e patches

### Recomendadas
- **pytest-xdist** - Execução paralela
- **faker** - Geração de dados fake
- **freezegun** - Mock de datetime

### Instalação

```bash
pip install pytest pytest-cov pytest-mock pytest-xdist faker freezegun
```

---

## Quando Atualizar Esta Regra

Atualize esta regra quando:

- Cobertura mínima é ajustada (ex: business logic 90% → 95%)
- Novos tipos de testes são adicionados (ex: performance tests)
- Ferramentas de teste evoluem (ex: pytest plugins novos)
- Padrões de teste mudam (ex: novo naming convention)

---

**Última atualização:** Template
**Versão:** 1.0.0
