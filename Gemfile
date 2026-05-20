# frozen_string_literal: true

source 'https://rubygems.org'

ruby '>= 3.1.0'

# Web framework
gem 'sinatra',       '~> 3.1'
gem 'sinatra-contrib', '~> 3.1'  # reloader, json helpers, etc.
gem 'puma',          '~> 6.4'   # production-grade server

# Database
gem 'sequel',        '~> 5.80'  # ORM / query builder
gem 'sqlite3',       '~> 1.7'   # SQLite adapter

# Utility
gem 'rack-cors',     '~> 2.0'   # CORS headers — enables external API consumers
gem 'dotenv',        '~> 3.1'   # .env support for environment variables
gem 'json',          '~> 2.7'

group :development do
  gem 'rerun', '~> 0.14'        # auto-reload on file changes
end

group :test do
  gem 'minitest',    '~> 5.21'
  gem 'rack-test',   '~> 2.1'
end
