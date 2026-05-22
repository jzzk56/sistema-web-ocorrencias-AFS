# frozen_string_literal: true

source 'https://rubygems.org'

ruby '>= 3.1.0'

# → Web framework
gem 'sinatra',         '~> 3.1'
gem 'sinatra-contrib', '~> 3.1'  # → reloader, json helpers, etc.
gem 'puma',            '~> 6.4'  # → servidor de produção

# → Banco de dados
gem 'sequel',  '~> 5.80'  # → ORM / query builder
gem 'sqlite3', '~> 1.7'   # → adaptador SQLite

# → Utilitários
gem 'rack-cors', '~> 2.0'  # → CORS headers
gem 'dotenv',    '~> 3.1'  # → variáveis de ambiente
gem 'json',      '~> 2.7'

group :development do
  gem 'rerun', '~> 0.14'  # → auto-reload em mudanças
end

group :test do
  gem 'minitest',  '~> 5.21'
  gem 'rack-test', '~> 2.1'
end
