export const conversationsIndexMapping = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      tenant_id: { type: 'keyword' },
      type: { type: 'keyword' },
      name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      participant_ids: { type: 'keyword' },
      participant_names: { type: 'text' },
      created_at: { type: 'date' },
      last_message_at: { type: 'date' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
  },
};
