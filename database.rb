# frozen_string_literal: true

require 'sequel'
require 'sqlite3'
require 'json'
require 'fileutils'
require 'time'

# ── Paths ──────────────────────────────────────────────────────────────────────
DB_PATH   = ENV.fetch('DATABASE_URL', 'db/ocorrencias.sqlite3')
JSON_PATH = ENV.fetch('JSON_PATH', 'ocorrencias.json')

FileUtils.mkdir_p(File.dirname(DB_PATH))

# ── Connection ─────────────────────────────────────────────────────────────────
DB = Sequel.connect(
  "sqlite://#{DB_PATH}",
  max_connections: 10,
  timeout: 5000
)

# Enable WAL mode for concurrent reads (important for web server)
DB.run('PRAGMA journal_mode=WAL')
DB.run('PRAGMA foreign_keys=ON')

# ── Schema ─────────────────────────────────────────────────────────────────────
DB.create_table?(:ocorrencias) do
  primary_key :id
  String  :nome_aluno,      null: false, size: 255
  String  :curso,           null: false, size: 100
  String  :ano,             null: false, size: 20
  String  :data_ocorrencia, null: false, size: 10   # ISO-8601 date YYYY-MM-DD
  Text    :descricao,       null: false
  String  :gravidade,       null: false, size: 10
  DateTime :created_at
  DateTime :updated_at
  index   [:curso, :ano]
  index   [:nome_aluno]
  index   [:gravidade]
end

# ── JSON sync helper ───────────────────────────────────────────────────────────
# Keeps ocorrencias.json in sync after every write operation.
# Rows are serialised with ISO-8601 timestamps so the file is human-readable.
module JsonSync
  def self.write!
    rows = DB[:ocorrencias].order(:id).all.map do |row|
      row.transform_values { |v| v.respond_to?(:iso8601) ? v.iso8601 : v }
    end
    File.write(JSON_PATH, JSON.pretty_generate(rows))
  rescue => e
    warn "[JsonSync] Failed to write #{JSON_PATH}: #{e.message}"
  end

  # Seed SQLite from ocorrencias.json when the DB is empty (disaster recovery)
  def self.import_if_empty!
    return unless DB[:ocorrencias].count.zero?
    return unless File.exist?(JSON_PATH)

    rows = JSON.parse(File.read(JSON_PATH), symbolize_names: true)
    rows.each { |row| DB[:ocorrencias].insert(row.except(:id)) }
    warn "[JsonSync] Imported #{rows.size} records from #{JSON_PATH}"
  rescue => e
    warn "[JsonSync] Import failed: #{e.message}"
  end
end

# Initialise JSON file if missing
File.write(JSON_PATH, '[]') unless File.exist?(JSON_PATH)
JsonSync.import_if_empty!

# ── Domain constants ──────────────────────────────────────────────────────────
CURSOS_VALIDOS = [
  'Administração',
  'Enfermagem',
  'Informática',
  'Logística',
  'Desenvolvimento de Sistemas'
].freeze

ANOS_VALIDOS      = ['1º Ano', '2º Ano', '3º Ano'].freeze
GRAVIDADES_VALIDAS = %w[Leve Média Grave].freeze
