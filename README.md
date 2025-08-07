# Banco de Horas - Aplicação Web

Esta é uma aplicação web completa para gerenciamento de banco de horas de funcionários, construída com Python (Flask) e um frontend simples em HTML, CSS e JavaScript.

## Funcionalidades

- **Cadastro de Funcionários:** Permite adicionar novos funcionários com nome e tipo de escala (ex: Normal, 12/36).
- **Controle de Ponto:** Funcionários podem registrar seus horários de entrada e saída.
- **Registro de Almoço:** O sistema permite registrar o início e o fim do intervalo de almoço.
- **Cálculo de Duração:** A duração total do trabalho é calculada automaticamente, já descontando o tempo de almoço.
- **Histórico Completo:** A aplicação mantém e exibe um histórico detalhado dos registros de ponto para cada funcionário.
- **Entrada Manual:** Permite adicionar registros de tempo manualmente para corrigir esquecimentos ou erros.

## Stack Tecnológica

- **Backend:** Python com [Flask](https://flask.palletsprojects.com/)
- **Banco de Dados:** [SQLite](https://www.sqlite.org/index.html)
- **ORM:** [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/)
- **Frontend:** HTML, CSS, e JavaScript (sem frameworks)

## Como Executar o Projeto

### Pré-requisitos

- Python 3.x
- `pip` (gerenciador de pacotes do Python)

### Passos para Instalação

1.  **Clone o repositório (ou baixe os arquivos):**
    ```bash
    # Exemplo com git
    git clone <url-do-repositorio>
    cd <pasta-do-projeto>
    ```

2.  **Crie e ative um ambiente virtual (recomendado):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # No Windows, use `venv\Scripts\activate`
    ```

3.  **Instale as dependências:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Execute a aplicação:**
    ```bash
    python app.py
    ```

5.  **Acesse no navegador:**
    Abra seu navegador e acesse `http://127.0.0.1:5000`.

### Observação Importante sobre o Banco de Dados

Para garantir a compatibilidade com diferentes ambientes de execução, esta aplicação foi configurada para criar e usar o arquivo de banco de dados (`bancodehoras.db`) no diretório temporário do sistema (`/tmp`). Isso evita potenciais problemas com permissões de escrita no diretório do projeto.
