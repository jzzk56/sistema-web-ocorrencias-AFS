# frozen_string_literal: true
# → Execute com: bundle exec ruby test/api_test.rb

ENV['RACK_ENV']    = 'test'
ENV['DATABASE_URL'] = 'db/test.sqlite3'
ENV['JSON_PATH']    = 'ocorrencias_test.json'

require 'minitest/autorun'
require 'rack/test'
require_relative '../app'

class ApiTest < Minitest::Test
  include Rack::Test::Methods

  def app = Sinatra::Application

  def setup
    DB[:ocorrencias].delete
    File.write(ENV['JSON_PATH'], '[]')
  end

  def teardown
    File.delete(ENV['JSON_PATH']) rescue nil
  end

  # → Health
  def test_health
    get '/api/health'
    assert_equal 200, last_response.status
    body = JSON.parse(last_response.body)
    assert_equal 'ok', body['status']
  end

  # → Meta
  def test_meta_returns_constants
    get '/api/meta'
    body = JSON.parse(last_response.body)
    assert_includes body['cursos'], 'Informática'
    assert_includes body['anos'],   '1º Ano'
    assert_includes body['gravidades'], 'Grave'
  end

  # → Create
  def test_create_ocorrencia
    post '/api/ocorrencias', valid_payload.to_json, 'CONTENT_TYPE' => 'application/json'
    assert_equal 201, last_response.status
    body = JSON.parse(last_response.body)
    assert_equal 'Ana Paula Souza', body['nome_aluno']
    assert File.exist?(ENV['JSON_PATH'])
    json_data = JSON.parse(File.read(ENV['JSON_PATH']))
    assert_equal 1, json_data.size
  end

  def test_create_fails_blank_name
    post '/api/ocorrencias', valid_payload.merge(nome_aluno: '').to_json,
         'CONTENT_TYPE' => 'application/json'
    assert_equal 422, last_response.status
    body = JSON.parse(last_response.body)
    assert body['errors'].any? { |e| e.include?('Nome') }
  end

  def test_create_fails_invalid_curso
    post '/api/ocorrencias', valid_payload.merge(curso: 'Matemática').to_json,
         'CONTENT_TYPE' => 'application/json'
    assert_equal 422, last_response.status
  end

  def test_create_fails_short_description
    post '/api/ocorrencias', valid_payload.merge(descricao: 'curto').to_json,
         'CONTENT_TYPE' => 'application/json'
    assert_equal 422, last_response.status
  end

  # → Read
  def test_list_ocorrencias
    2.times { |i| create_record(nome_aluno: "Aluno #{i}") }
    get '/api/ocorrencias'
    assert_equal 200, last_response.status
    body = JSON.parse(last_response.body)
    assert_equal 2, body.size
    assert_equal '2', last_response.headers['X-Total-Count']
  end

  def test_filter_by_aluno
    create_record(nome_aluno: 'João Silva')
    create_record(nome_aluno: 'Maria Souza')
    get '/api/ocorrencias?aluno=João'
    body = JSON.parse(last_response.body)
    assert_equal 1, body.size
    assert_equal 'João Silva', body.first['nome_aluno']
  end

  def test_filter_by_curso
    create_record(curso: 'Informática')
    create_record(curso: 'Enfermagem')
    get '/api/ocorrencias?curso=Informática'
    body = JSON.parse(last_response.body)
    assert_equal 1, body.size
  end

  def test_filter_by_gravidade
    create_record(gravidade: 'Leve')
    create_record(gravidade: 'Grave')
    get '/api/ocorrencias?gravidade=Grave'
    body = JSON.parse(last_response.body)
    assert_equal 1, body.size
  end

  def test_get_single_ocorrencia
    id = create_record
    get "/api/ocorrencias/#{id}"
    assert_equal 200, last_response.status
  end

  def test_get_nonexistent_returns_404
    get '/api/ocorrencias/99999'
    assert_equal 404, last_response.status
  end

  # → Update
  def test_update_ocorrencia
    id = create_record
    put "/api/ocorrencias/#{id}", valid_payload.merge(gravidade: 'Grave').to_json,
        'CONTENT_TYPE' => 'application/json'
    assert_equal 200, last_response.status
    body = JSON.parse(last_response.body)
    assert_equal 'Grave', body['gravidade']
    # → Verificar sync JSON
    json_data = JSON.parse(File.read(ENV['JSON_PATH']))
    assert_equal 'Grave', json_data.first['gravidade']
  end

  # → Delete
  def test_delete_ocorrencia
    id = create_record
    delete "/api/ocorrencias/#{id}"
    assert_equal 200, last_response.status
    assert_equal 0, DB[:ocorrencias].count
    json_data = JSON.parse(File.read(ENV['JSON_PATH']))
    assert_empty json_data
  end

  # → Stats
  def test_stats
    create_record(gravidade: 'Leve')
    create_record(gravidade: 'Grave')
    get '/api/stats'
    body = JSON.parse(last_response.body)
    assert_equal 2, body['total']
    assert_equal 1, body['por_gravidade']['Leve']
    assert_equal 1, body['por_gravidade']['Grave']
  end

  private

  def valid_payload
    {
      nome_aluno:      'Ana Paula Souza',
      curso:           'Informática',
      ano:             '2º Ano',
      data_ocorrencia: '2025-05-15',
      descricao:       'Aluna se recusou a realizar as atividades em sala.',
      gravidade:       'Leve'
    }
  end

  def create_record(overrides = {})
    DB[:ocorrencias].insert(valid_payload.merge(overrides).merge(
      created_at: Time.now, updated_at: Time.now
    ))
  end
end
