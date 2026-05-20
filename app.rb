# frozen_string_literal: true

require 'sinatra'
require 'sinatra/json'
require 'sinatra/reloader' if development?
require 'json'
require 'time'
require 'rack/cors'
require_relative 'database'

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allows any external client (React app, Postman, mobile app) to consume the API.
use Rack::Cors do
  allow do
    origins ENV.fetch('CORS_ORIGINS', '*')
    resource '/api/*',
             headers: :any,
             methods: %i[get post put patch delete options head],
             expose: ['Content-Type', 'X-Total-Count']
  end
end

# ── Configuration ─────────────────────────────────────────────────────────────
configure do
  set :public_folder, File.join(__dir__, 'public')
  set :port,          ENV.fetch('PORT', 3000).to_i
  set :bind,          '0.0.0.0'
  set :show_exceptions, development?
  set :logging, true
  enable :static
end

configure :development do
  register Sinatra::Reloader
  also_reload 'database.rb'
end

# ── Helpers ───────────────────────────────────────────────────────────────────
helpers do
  # Parse JSON request body, halt 400 on malformed input
  def json_body
    request.body.rewind
    JSON.parse(request.body.read, symbolize_names: true)
  rescue JSON::ParserError
    halt 400, json(error: 'Corpo da requisição com JSON inválido.')
  end

  # Validate occurrence payload; halts with 422 + error list on failure
  def validate_ocorrencia!(params)
    errors = []

    nome = params[:nome_aluno].to_s.strip
    errors << 'Nome do aluno é obrigatório.' if nome.empty?
    errors << 'Nome deve ter ao menos 3 caracteres.' if nome.length.positive? && nome.length < 3

    errors << "Curso inválido. Opções: #{CURSOS_VALIDOS.join(', ')}." \
      unless CURSOS_VALIDOS.include?(params[:curso].to_s)

    errors << "Ano inválido. Opções: #{ANOS_VALIDOS.join(', ')}." \
      unless ANOS_VALIDOS.include?(params[:ano].to_s)

    data = params[:data_ocorrencia].to_s.strip
    errors << 'Data da ocorrência é obrigatória.' if data.empty?
    if data.match?(/\A\d{4}-\d{2}-\d{2}\z/)
      begin; Date.parse(data); rescue ArgumentError; errors << 'Data da ocorrência inválida.'; end
    elsif data.present? rescue nil
      errors << 'Data deve estar no formato AAAA-MM-DD.'
    end

    errors << 'Descrição é obrigatória (mínimo 10 caracteres).' \
      if params[:descricao].to_s.strip.length < 10

    errors << "Gravidade inválida. Opções: #{GRAVIDADES_VALIDAS.join(', ')}." \
      unless GRAVIDADES_VALIDAS.include?(params[:gravidade].to_s)

    halt 422, json(errors: errors) unless errors.empty?
  end

  # Convenience: find or 404
  def find_ocorrencia!(id)
    record = DB[:ocorrencias].first(id: id.to_i)
    halt 404, json(error: 'Ocorrência não encontrada.') unless record
    record
  end

  # Build dataset with optional filters
  def filtered_dataset
    ds = DB[:ocorrencias].order(Sequel.desc(:created_at))
    ds = ds.where(Sequel.ilike(:nome_aluno, "%#{params[:aluno]}%"))  if params[:aluno]&.length&.positive?
    ds = ds.where(curso:     params[:curso])     if params[:curso]&.length&.positive?
    ds = ds.where(ano:       params[:ano])       if params[:ano]&.length&.positive?
    ds = ds.where(gravidade: params[:gravidade]) if params[:gravidade]&.length&.positive?
    ds
  end

  # Serialize datetime fields for JSON output
  def serialize(row_or_rows)
    serialise = ->(row) {
      row.transform_values { |v| v.respond_to?(:iso8601) ? v.iso8601 : v }
    }
    row_or_rows.is_a?(Array) ? row_or_rows.map(&serialise) : serialise.call(row_or_rows)
  end
end

# ── SPA Catch-all ─────────────────────────────────────────────────────────────
get '/' do
  send_file File.join(settings.public_folder, 'index.html')
end

# ─────────────────────────────────────────────────────────────────────────────
#  API — Ocorrências
# ─────────────────────────────────────────────────────────────────────────────

# GET /api/ocorrencias
# Query params: aluno, curso, ano, gravidade, page, per_page
get '/api/ocorrencias' do
  content_type :json

  ds       = filtered_dataset
  total    = ds.count
  per_page = (params[:per_page] || 50).to_i.clamp(1, 200)
  page     = [(params[:page] || 1).to_i, 1].max
  offset   = (page - 1) * per_page

  headers 'X-Total-Count'  => total.to_s,
          'X-Page'         => page.to_s,
          'X-Per-Page'     => per_page.to_s,
          'X-Total-Pages'  => (total.to_f / per_page).ceil.to_s

  rows = ds.limit(per_page, offset).all
  json serialize(rows)
end

# GET /api/ocorrencias/:id
get '/api/ocorrencias/:id' do
  content_type :json
  json serialize(find_ocorrencia!(params[:id]))
end

# POST /api/ocorrencias
post '/api/ocorrencias' do
  content_type :json
  data = json_body
  validate_ocorrencia!(data)

  now = Time.now
  id  = DB[:ocorrencias].insert(
    nome_aluno:      data[:nome_aluno].strip,
    curso:           data[:curso],
    ano:             data[:ano],
    data_ocorrencia: data[:data_ocorrencia],
    descricao:       data[:descricao].strip,
    gravidade:       data[:gravidade],
    created_at:      now,
    updated_at:      now
  )

  JsonSync.write!
  status 201
  json serialize(DB[:ocorrencias].first(id: id))
end

# PUT /api/ocorrencias/:id  (full update)
put '/api/ocorrencias/:id' do
  content_type :json
  find_ocorrencia!(params[:id])   # ensure exists
  data = json_body
  validate_ocorrencia!(data)

  DB[:ocorrencias].where(id: params[:id].to_i).update(
    nome_aluno:      data[:nome_aluno].strip,
    curso:           data[:curso],
    ano:             data[:ano],
    data_ocorrencia: data[:data_ocorrencia],
    descricao:       data[:descricao].strip,
    gravidade:       data[:gravidade],
    updated_at:      Time.now
  )

  JsonSync.write!
  json serialize(DB[:ocorrencias].first(id: params[:id].to_i))
end

# PATCH /api/ocorrencias/:id  (partial update)
patch '/api/ocorrencias/:id' do
  content_type :json
  record = find_ocorrencia!(params[:id])
  data   = json_body

  updates = {}
  %i[nome_aluno curso ano data_ocorrencia descricao gravidade].each do |field|
    updates[field] = data[field].is_a?(String) ? data[field].strip : data[field] if data.key?(field)
  end
  updates[:updated_at] = Time.now

  DB[:ocorrencias].where(id: params[:id].to_i).update(updates)
  JsonSync.write!
  json serialize(DB[:ocorrencias].first(id: params[:id].to_i))
end

# DELETE /api/ocorrencias/:id
delete '/api/ocorrencias/:id' do
  content_type :json
  find_ocorrencia!(params[:id])
  DB[:ocorrencias].where(id: params[:id].to_i).delete
  JsonSync.write!
  json message: 'Ocorrência excluída com sucesso.', id: params[:id].to_i
end

# ─────────────────────────────────────────────────────────────────────────────
#  API — Stats / Dashboard
# ─────────────────────────────────────────────────────────────────────────────

get '/api/stats' do
  content_type :json

  total = DB[:ocorrencias].count

  # Counts per severity
  por_gravidade = DB[:ocorrencias]
    .select_group(:gravidade)
    .select_append { count(id).as(:total) }
    .all
    .each_with_object({ 'Leve' => 0, 'Média' => 0, 'Grave' => 0 }) do |r, h|
      h[r[:gravidade]] = r[:total]
    end

  # Counts per course (sorted desc)
  por_curso = DB[:ocorrencias]
    .select_group(:curso)
    .select_append { count(id).as(:total) }
    .order(Sequel.desc(:total))
    .all

  # Counts per class (course + year)
  por_turma = DB[:ocorrencias]
    .select_group(:curso, :ano)
    .select_append { count(id).as(:total) }
    .order(Sequel.desc(:total))
    .all

  # Last 5 occurrences
  recentes = DB[:ocorrencias].order(Sequel.desc(:created_at)).limit(5).all

  # Monthly trend (last 6 months)
  tendencia = DB[:ocorrencias]
    .select { [strftime('%Y-%m', data_ocorrencia).as(:mes), count(id).as(:total)] }
    .group { strftime('%Y-%m', data_ocorrencia) }
    .order(:mes)
    .limit(6)
    .all

  json(
    total:         total,
    por_gravidade: por_gravidade,
    por_curso:     serialize(por_curso),
    por_turma:     serialize(por_turma),
    recentes:      serialize(recentes),
    tendencia:     tendencia
  )
end

# ─────────────────────────────────────────────────────────────────────────────
#  API — Meta / Health
# ─────────────────────────────────────────────────────────────────────────────

get '/api/health' do
  content_type :json
  json(
    status:   'ok',
    database: DB.test_connection ? 'connected' : 'error',
    version:  '1.0.0',
    time:     Time.now.iso8601
  )
end

get '/api/meta' do
  content_type :json
  json(
    cursos:     CURSOS_VALIDOS,
    anos:       ANOS_VALIDOS,
    gravidades: GRAVIDADES_VALIDAS
  )
end

# ─────────────────────────────────────────────────────────────────────────────
#  Error Handlers
# ─────────────────────────────────────────────────────────────────────────────

error 400 do
  content_type :json
  json error: 'Requisição inválida.'
end

error 404 do
  content_type :json
  # If request expects HTML (browser navigation), serve SPA
  if request.accept.include?('text/html')
    send_file File.join(settings.public_folder, 'index.html')
  else
    json error: 'Recurso não encontrado.'
  end
end

error 405 do
  content_type :json
  json error: 'Método não permitido.'
end

error 422 do
  # already handled inline with halt + json body
  pass
end

error 500 do
  content_type :json
  json error: 'Erro interno do servidor. Tente novamente.'
end
