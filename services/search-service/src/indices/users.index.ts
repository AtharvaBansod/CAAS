export const usersIndexMapping = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      tenant_id: { type: 'keyword' },
      name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
          autocomplete: {
            type: 'text',
            analyzer: 'autocomplete',
            search_analyzer: 'standard',
          },
        },
      },
      email: { type: 'keyword' },
      avatar_url: { type: 'keyword' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        autocomplete: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'edge_ngram'],
        },
      },
      filter: {
        edge_ngram: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 10,
        },
      },
    },
  },
};
