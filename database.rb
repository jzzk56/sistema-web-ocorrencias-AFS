# frozen_string_literal: true

require 'sequel'
require 'sqlite3'
require 'json'
require 'fileutils'
require 'time'

# → Caminhos
_db_url   = ENV.fetch('DATABASE_URL', 'db/ocorrencias.sqlite3')
DB_PATH   = _db_url.start_with?('postgres') ? 'db/ocorrencias.sqlite3' : _db_url
JSON_PATH = ENV.fetch('JSON_PATH', 'ocorrencias.json')

FileUtils.mkdir_p(File.dirname(DB_PATH))

# → Conexão
DB = Sequel.connect("sqlite://#{DB_PATH}", max_connections: 10, timeout: 5000)

DB.run('PRAGMA journal_mode=WAL')
DB.run('PRAGMA foreign_keys=ON')

# → Esquema
DB.create_table?(:ocorrencias) do
  primary_key :id
  String   :nome_aluno,      null: false, size: 255
  String   :matricula,       size: 30
  String   :curso,           null: false, size: 100
  String   :ano,             null: false, size: 20
  String   :data_ocorrencia, null: false, size: 10
  Text     :descricao,       null: false
  String   :gravidade,       null: false, size: 10
  String   :foto_path,       size: 500
  DateTime :created_at
  DateTime :updated_at
  index [:curso, :ano]
  index [:nome_aluno]
  index [:gravidade]
end

# → Migração de colunas (para tabelas já existentes)
existing = DB.schema(:ocorrencias).map(&:first)
DB.alter_table(:ocorrencias) { add_column :matricula,  String, size: 30  } unless existing.include?(:matricula)
DB.alter_table(:ocorrencias) { add_column :foto_path,  String, size: 500 } unless existing.include?(:foto_path)

# → Sincronização JSON
module JsonSync
  def self.write!
    rows = DB[:ocorrencias].order(:id).all.map do |row|
      row.transform_values { |v| v.respond_to?(:iso8601) ? v.iso8601 : v }
    end
    File.write(JSON_PATH, JSON.pretty_generate(rows))
  rescue => e
    warn "[JsonSync] #{e.message}"
  end

  def self.import_if_empty!
    return unless DB[:ocorrencias].count.zero?
    return unless File.exist?(JSON_PATH)

    rows = JSON.parse(File.read(JSON_PATH), symbolize_names: true)
    rows.each { |row| DB[:ocorrencias].insert(row.except(:id)) }
    warn "[JsonSync] Importados #{rows.size} registros."
  rescue => e
    warn "[JsonSync] Falha na importação: #{e.message}"
  end
end

File.write(JSON_PATH, '[]') unless File.exist?(JSON_PATH)
JsonSync.import_if_empty!

# → Constantes de domínio
CURSOS_VALIDOS = [
  'Administração',
  'Enfermagem',
  'Informática',
  'Logística',
  'Desenvolvimento de Sistemas'
].freeze

ANOS_VALIDOS       = ['1º Ano', '2º Ano', '3º Ano'].freeze
GRAVIDADES_VALIDAS = %w[Leve Média Grave].freeze
