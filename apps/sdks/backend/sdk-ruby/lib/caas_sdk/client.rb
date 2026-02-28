module CaasSdk
  class Client
    attr_reader :gateway_base_url, :api_key, :project_id

    def initialize(gateway_base_url:, api_key:, project_id: nil)
      @gateway_base_url = gateway_base_url
      @api_key = api_key
      @project_id = project_id
    end

    def canonical_headers
      headers = {
        'x-api-key' => api_key,
        'x-correlation-id' => "sdkruby_#{(Time.now.to_f * 1000).to_i}"
      }
      headers['x-project-id'] = project_id if project_id
      headers
    end
  end
end
