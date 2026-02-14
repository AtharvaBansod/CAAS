export const messagesIndexMapping = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      conversation_id: { type: 'keyword' },
      tenant_id: { type: 'keyword' },
      sender_id: { type: 'keyword' },
      type: { type: 'keyword' },
      content: {
        type: 'text',
        analyzer: 'content_analyzer',
        fields: {
          exact: { type: 'keyword', ignore_above: 256 },
        },
      },
      mentions: { type: 'keyword' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
  settings: {
    number_of_shards: 3,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        content_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'stemmer'],
        },
      },
    },
  },
};
