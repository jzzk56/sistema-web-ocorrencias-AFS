# AFS · Sistema de Ocorrências Escolares

> 1º Campeonato de Programação da AFS — Desafio Web  
> Stack: **Ruby · Sinatra · SQLite (Sequel) · Vanilla JS SPA**

---

## Funcionalidades

| Requisito | Status |
|---|---|
| Tela para cadastrar nova ocorrência | ✅ |
| Tela para visualizar todas as ocorrências | ✅ |
| Filtro por turma (curso + ano) | ✅ |
| Busca por nome do aluno | ✅ |
| Todos os campos obrigatórios (nome, matrícula, curso, ano, data, descrição, gravidade) | ✅ |
| Upload e exibição de foto do aluno | ✅ |
| Persistência em `ocorrencias.json` | ✅ |
| Persistência em SQLite (bonus) | ✅ |
| Validações e mensagens de erro | ✅ |
| CRUD completo (criar / ler / editar / excluir) | ✅ |
| API REST com suporte a CORS | ✅ |
| Paginação | ✅ |
| Dashboard com estatísticas | ✅ |
| Suite de testes automatizados | ✅ |


## Setup rápido

### Pré-requisitos
- Ruby >= 3.1
- Bundler (`gem install bundler`)

### Instalação

```bash
git clone <repo-url>
cd sistema-ocorrencias

# → Instalar dependências
bundle install

# → Configurar variáveis de ambiente
cp .env.example .env
# → edite .env se necessário (porta, caminhos, etc.)
```

### Executar

```bash
# → Modo desenvolvimento (com auto-reload)
bundle exec rerun 'ruby app.rb'

# → Ou via Rack (Puma)
bundle exec rackup config.ru

# → Produção
RACK_ENV=production bundle exec puma config.ru -p 3000
```

Acesse `http://localhost:3000` no navegador.


## Estrutura do projeto

```
sistema-ocorrencias/
├── app.rb              # → rotas da API (Sinatra)
├── database.rb         # → schema + JsonSync (Sequel / SQLite)
├── config.ru           # → entry point Rack (Puma)
├── Gemfile             # → dependências Ruby
├── ocorrencias.json    # → gerado automaticamente (sync a cada escrita)
├── db/
│   └── ocorrencias.sqlite3   # → banco SQLite (gerado automaticamente)
├── public/
│   ├── index.html      # → SPA shell
│   ├── css/style.css   # → design system
│   ├── js/app.js       # → router + API client + páginas
│   └── uploads/        # → fotos dos alunos
└── api_test.rb         # → suite Minitest
```

## API

Todos os endpoints retornam `application/json`.  
Base URL: `http://localhost:3000/api`

### Ocorrências

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`    | `/ocorrencias`         | Listar (paginado, filtrável) |
| `GET`    | `/ocorrencias/:id`     | Buscar por ID |
| `POST`   | `/ocorrencias`         | Criar nova ocorrência |
| `PUT`    | `/ocorrencias/:id`     | Atualizar (substituição total) |
| `PATCH`  | `/ocorrencias/:id`     | Atualizar (parcial) |
| `DELETE` | `/ocorrencias/:id`     | Excluir |
| `POST`   | `/ocorrencias/:id/foto`| Upload de foto do aluno |

#### Query params de `GET /ocorrencias`

| Param | Tipo | Exemplo |
|-------|------|---------|
| `aluno` | string | `?aluno=Maria` |
| `curso` | string | `?curso=Informática` |
| `ano` | string | `?ano=2º Ano` |
| `gravidade` | string | `?gravidade=Grave` |
| `page` | int | `?page=2` |
| `per_page` | int (max 200) | `?per_page=10` |

Cabeçalhos de paginação retornados: `X-Total-Count`, `X-Total-Pages`, `X-Page`, `X-Per-Page`.

#### Payload de criação / atualização

```json
{
  "nome_aluno":      "João da Silva",
  "matricula":       "2025001",
  "curso":           "Informática",
  "ano":             "2º Ano",
  "data_ocorrencia": "2025-05-20",
  "descricao":       "Aluno perturbou a aula de forma reiterada.",
  "gravidade":       "Média"
}
```

Cursos válidos: `Administração`, `Enfermagem`, `Informática`, `Logística`, `Desenvolvimento de Sistemas`  
Anos válidos: `1º Ano`, `2º Ano`, `3º Ano`  
Gravidades válidas: `Leve`, `Média`, `Grave`

### Dashboard / Meta

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/stats`  | Totais, por gravidade, por curso, recentes, tendência |
| `GET` | `/meta`   | Listas de cursos, anos e gravidades |
| `GET` | `/health` | Status da aplicação e do banco |


## Testes

```bash
bundle exec ruby api_test.rb
```

Os testes usam um banco SQLite separado (`db/test.sqlite3`) e arquivo JSON próprio para não interferir nos dados de desenvolvimento.


## Trocar SQLite por PostgreSQL / MySQL

`database.rb` usa [Sequel](https://sequel.jeremyevans.net/), que suporta múltiplos bancos.  
Basta mudar a string de conexão no `.env`:

```bash
# → PostgreSQL
DATABASE_URL=postgres://user:pass@localhost/afs_ocorrencias

# → MySQL
DATABASE_URL=mysql2://user:pass@localhost/afs_ocorrencias
```

E adicionar a gem correspondente ao `Gemfile`:

```ruby
gem 'pg'      # → PostgreSQL
gem 'mysql2'  # → MySQL
```


## Cursos e Turmas

| Curso | Anos |
|-------|------|
| Administração | 1º · 2º · 3º |
| Enfermagem | 1º · 2º · 3º |
| Informática | 1º · 2º · 3º |
| Logística | 1º · 2º · 3º |
| Desenvolvimento de Sistemas | 1º · 2º · 3º |
