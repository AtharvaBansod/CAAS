# CaaS Ruby Backend SDK — Hardened
# SDKBE-REL-001: Typed Error Hierarchy, Retry/Backoff, Circuit Breaker

require 'net/http'
require 'json'
require 'uri'

module CaasSdk
  # ═══ Error Hierarchy ═══
  class SdkError < StandardError
    attr_reader :code, :status, :retryable, :details

    def initialize(message, code:, status: nil, retryable: false, details: {})
      super(message)
      @code = code
      @status = status
      @retryable = retryable
      @details = details
    end
  end

  class SdkNetworkError < SdkError
    def initialize(message, details: {})
      super(message, code: 'NETWORK_ERROR', retryable: true, details: details)
    end
  end

  class SdkTimeoutError < SdkError
    def initialize(message, timeout_s:)
      super(message, code: 'TIMEOUT_ERROR', retryable: true, details: { timeout_s: timeout_s })
    end
  end

  class SdkAuthError < SdkError
    def initialize(message, status:)
      super(message, code: 'AUTH_ERROR', status: status, retryable: false)
    end
  end

  class SdkValidationError < SdkError
    def initialize(message, status:)
      super(message, code: 'VALIDATION_ERROR', status: status, retryable: false)
    end
  end

  class SdkThrottleError < SdkError
    attr_reader :retry_after_s

    def initialize(message, retry_after_s: nil)
      super(message, code: 'THROTTLE_ERROR', status: 429, retryable: true, details: { retry_after_s: retry_after_s })
      @retry_after_s = retry_after_s
    end
  end

  class SdkServerError < SdkError
    def initialize(message, status:)
      super(message, code: 'SERVER_ERROR', status: status, retryable: true)
    end
  end

  class SdkCircuitOpenError < SdkError
    def initialize(reset_after_s:)
      super('Circuit breaker is open — requests blocked', code: 'CIRCUIT_OPEN', retryable: false,
            details: { reset_after_s: reset_after_s })
    end
  end

  # ═══ Circuit Breaker ═══
  class CircuitBreaker
    def initialize(threshold: 5, reset_timeout_s: 30)
      @state = :closed
      @failures = 0
      @last_failure_time = 0
      @threshold = threshold
      @reset_timeout_s = reset_timeout_s
    end

    def state
      if @state == :open && (Time.now.to_f - @last_failure_time) >= @reset_timeout_s
        @state = :half_open
      end
      @state
    end

    def record_success
      @failures = 0
      @state = :closed
    end

    def record_failure
      @failures += 1
      @last_failure_time = Time.now.to_f
      @state = :open if @failures >= @threshold
    end

    def allow_request?
      %i[closed half_open].include?(state)
    end
  end

  # ═══ Main SDK ═══
  RETRYABLE_STATUSES = [429, 500, 502, 503, 504].freeze
  NON_IDEMPOTENT_METHODS = %w[POST PATCH].freeze

  class Client
    attr_reader :gateway_base_url, :api_key, :project_id

    def initialize(gateway_base_url:, api_key:, project_id: nil,
                   timeout: 10, max_retries: 3, base_delay: 0.3, max_delay: 10,
                   cb_threshold: 5, cb_reset_timeout: 30)
      @gateway_base_url = gateway_base_url
      @api_key = api_key
      @project_id = project_id
      @timeout = timeout
      @max_retries = max_retries
      @base_delay = base_delay
      @max_delay = max_delay
      @cb = CircuitBreaker.new(threshold: cb_threshold, reset_timeout_s: cb_reset_timeout)
    end

    def circuit_state
      @cb.state
    end

    def canonical_headers
      headers = {
        'x-api-key' => api_key,
        'x-correlation-id' => "sdkruby_#{(Time.now.to_f * 1000).to_i}",
        'Content-Type' => 'application/json'
      }
      headers['x-project-id'] = project_id if project_id
      headers
    end

    # Public API

    def health
      do_request('GET', '/api/v1/sdk/health', headers: canonical_headers, idempotent: true)
    end

    def capabilities
      do_request('GET', '/api/v1/sdk/capabilities', headers: canonical_headers, idempotent: true)
    end

    def create_session(user_external_id, project_id: nil)
      now = (Time.now.to_f * 1000).to_i
      headers = canonical_headers.merge(
        'idempotency-key' => "idem_#{now}",
        'x-timestamp' => (now / 1000).to_s,
        'x-nonce' => "n_#{now}"
      )
      body = { user_external_id: user_external_id }
      body[:project_id] = project_id || @project_id if project_id || @project_id
      do_request('POST', '/api/v1/sdk/session', headers: headers, body: body)
    end

    def refresh(refresh_token)
      now = (Time.now.to_f * 1000).to_i
      headers = {
        'Content-Type' => 'application/json',
        'x-correlation-id' => "sdkruby_#{now}",
        'idempotency-key' => "idem_ref_#{now}"
      }
      do_request('POST', '/api/v1/sdk/refresh', headers: headers, body: { refresh_token: refresh_token })
    end

    def logout(access_token)
      now = (Time.now.to_f * 1000).to_i
      headers = {
        'Authorization' => "Bearer #{access_token}",
        'x-correlation-id' => "sdkruby_#{now}",
        'idempotency-key' => "idem_logout_#{now}"
      }
      do_request('POST', '/api/v1/sdk/logout', headers: headers)
    end

    private

    def classify_http_error(status, body, retry_after)
      case status
      when 401, 403 then SdkAuthError.new("Auth failed (#{status})", status: status)
      when 400, 422 then SdkValidationError.new("Validation error (#{status})", status: status)
      when 429
        ra = retry_after ? retry_after.to_f : nil
        SdkThrottleError.new('Rate limited (429)', retry_after_s: ra)
      when 500..599 then SdkServerError.new("Server error (#{status})", status: status)
      else SdkError.new("Request failed (#{status})", code: 'UNKNOWN_ERROR', status: status)
      end
    end

    def do_request(method, path, headers: {}, body: nil, idempotent: false)
      raise SdkCircuitOpenError.new(reset_after_s: @max_delay) unless @cb.allow_request?

      has_idem_key = headers.key?('idempotency-key')
      can_retry = idempotent || !NON_IDEMPOTENT_METHODS.include?(method) || has_idem_key
      max_attempts = can_retry ? @max_retries + 1 : 1
      last_err = nil

      max_attempts.times do |attempt|
        begin
          uri = URI("#{@gateway_base_url}#{path}")
          http = Net::HTTP.new(uri.host, uri.port)
          http.open_timeout = @timeout
          http.read_timeout = @timeout

          req = case method
                when 'GET' then Net::HTTP::Get.new(uri)
                when 'POST' then Net::HTTP::Post.new(uri)
                end

          headers.each { |k, v| req[k] = v }
          req.body = JSON.generate(body) if body

          response = http.request(req)
          status = response.code.to_i

          if status >= 200 && status < 400
            @cb.record_success
            return nil if status == 204
            return JSON.parse(response.body)
          end

          retry_after = response['Retry-After']
          err = classify_http_error(status, response.body, retry_after)

          unless err.retryable && RETRYABLE_STATUSES.include?(status)
            @cb.record_failure
            raise err
          end
          last_err = err

          if err.is_a?(SdkThrottleError) && err.retry_after_s
            sleep(err.retry_after_s)
            next
          end
        rescue SdkError => e
          raise unless e.retryable
          last_err = e
        rescue Net::OpenTimeout, Net::ReadTimeout => e
          last_err = SdkTimeoutError.new("Timeout on #{path}", timeout_s: @timeout)
          unless can_retry
            @cb.record_failure
            raise last_err
          end
        rescue StandardError => e
          last_err = SdkNetworkError.new("Network error: #{e.message}")
          unless can_retry
            @cb.record_failure
            raise last_err
          end
        end

        if attempt < max_attempts - 1
          delay = [@base_delay * (2**attempt) * (0.5 + rand), @max_delay].min
          sleep(delay)
        end
      end

      @cb.record_failure
      raise last_err || SdkError.new('Request failed after retries', code: 'UNKNOWN_ERROR')
    end
  end
end
