# Python Stack (opcional)

Este diretório contém um “starter pack” de tooling para projetos **Python**.

## Como usar

Copie estes arquivos para a raiz do seu projeto (ou use como referência):

- `pyproject.toml`
- `requirements-dev.txt`
- `.pre-commit-config.yaml`

## Comandos

```bash
pip install -r requirements.txt -r requirements-dev.txt
pre-commit install
pre-commit run -a
pytest -q
mypy src/
ruff check src/ tests/ --fix
ruff format src/ tests/
```
