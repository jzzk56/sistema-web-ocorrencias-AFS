# frozen_string_literal: true

require 'dotenv'
Dotenv.load('.env')

require_relative 'app'

run Sinatra::Application
