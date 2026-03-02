require 'minitest/autorun'
require_relative '../lib/caas_sdk'

class CaasSdkClientTest < Minitest::Test
  def test_canonical_headers
    client = CaasSdk::Client.new(gateway_base_url: 'http://gateway:3000', api_key: 'k1', project_id: 'p1')
    headers = client.canonical_headers
    assert_equal 'k1', headers['x-api-key']
    assert_equal 'p1', headers['x-project-id']
    assert headers['x-correlation-id'].start_with?('sdkruby_')
    assert_equal 'application/json', headers['Content-Type']
  end

  def test_error_hierarchy_codes_stable
    auth_err = CaasSdk::SdkAuthError.new('fail', status: 401)
    assert_equal 'AUTH_ERROR', auth_err.code
    assert_equal 401, auth_err.status
    refute auth_err.retryable

    throttle_err = CaasSdk::SdkThrottleError.new('rate', retry_after_s: 5)
    assert_equal 'THROTTLE_ERROR', throttle_err.code
    assert throttle_err.retryable
    assert_equal 5, throttle_err.retry_after_s

    server_err = CaasSdk::SdkServerError.new('down', status: 502)
    assert_equal 'SERVER_ERROR', server_err.code
    assert server_err.retryable

    net_err = CaasSdk::SdkNetworkError.new('timeout')
    assert_equal 'NETWORK_ERROR', net_err.code
    assert net_err.retryable

    circuit_err = CaasSdk::SdkCircuitOpenError.new(reset_after_s: 30)
    assert_equal 'CIRCUIT_OPEN', circuit_err.code
    refute circuit_err.retryable
  end

  def test_validation_error_codes_stable
    val_err = CaasSdk::SdkValidationError.new('bad payload', status: 400)
    assert_equal 'VALIDATION_ERROR', val_err.code
    assert_equal 400, val_err.status
    refute val_err.retryable
  end

  def test_timeout_error_codes_stable
    timeout_err = CaasSdk::SdkTimeoutError.new('timed out', timeout_s: 30)
    assert_equal 'TIMEOUT_ERROR', timeout_err.code
    assert timeout_err.retryable
  end

  def test_circuit_breaker_opens_after_threshold
    cb = CaasSdk::CircuitBreaker.new(threshold: 3, reset_timeout_s: 0.01)
    assert_equal :closed, cb.state
    3.times { cb.record_failure }
    assert_equal :open, cb.state
    refute cb.allow_request?
  end

  def test_circuit_breaker_resets
    cb = CaasSdk::CircuitBreaker.new(threshold: 2, reset_timeout_s: 0.01)
    2.times { cb.record_failure }
    assert_equal :open, cb.state
    sleep(0.02)
    assert_equal :half_open, cb.state
    assert cb.allow_request?
    cb.record_success
    assert_equal :closed, cb.state
  end

  def test_initial_circuit_state
    client = CaasSdk::Client.new(gateway_base_url: 'http://gateway:3000', api_key: 'k1')
    assert_equal :closed, client.circuit_state
  end

  def test_all_errors_inherit_from_sdk_error
    assert CaasSdk::SdkNetworkError < CaasSdk::SdkError
    assert CaasSdk::SdkTimeoutError < CaasSdk::SdkError
    assert CaasSdk::SdkAuthError < CaasSdk::SdkError
    assert CaasSdk::SdkValidationError < CaasSdk::SdkError
    assert CaasSdk::SdkThrottleError < CaasSdk::SdkError
    assert CaasSdk::SdkServerError < CaasSdk::SdkError
    assert CaasSdk::SdkCircuitOpenError < CaasSdk::SdkError
  end

  def test_error_branching_with_rescue
    err = CaasSdk::SdkAuthError.new('unauthorized', status: 401)
    assert_kind_of CaasSdk::SdkAuthError, err
    assert_kind_of CaasSdk::SdkError, err
    refute_kind_of CaasSdk::SdkThrottleError, err
  end

  def test_correlation_id_prefix
    client = CaasSdk::Client.new(gateway_base_url: 'http://gateway:3000', api_key: 'k1')
    headers = client.canonical_headers
    assert headers['x-correlation-id'].start_with?('sdkruby_'), "Expected sdkruby_ prefix"
  end
end
