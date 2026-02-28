require 'minitest/autorun'
require_relative '../lib/caas_sdk'

class CaasSdkClientTest < Minitest::Test
  def test_canonical_headers
    client = CaasSdk::Client.new(gateway_base_url: 'http://gateway:3000', api_key: 'k1', project_id: 'p1')
    headers = client.canonical_headers
    assert_equal 'k1', headers['x-api-key']
    assert_equal 'p1', headers['x-project-id']
    assert headers['x-correlation-id'].start_with?('sdkruby_')
  end
end
