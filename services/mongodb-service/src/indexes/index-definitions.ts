export const PlatformIndexes = {
  clients: [
    { key: { company_name: 1 }, options: { unique: true } },
    { key: { status: 1 } }
  ],
  applications: [
    { key: { client_id: 1, name: 1 }, options: { unique: true } }
  ],
  api_keys: [
    { key: { key_hash: 1 }, options: { unique: true } },
    { key: { client_id: 1, status: 1 } }
  ]
};

export const TenantIndexes = {
  users: [
    { key: { tenant_id: 1, external_user_id: 1 }, options: { unique: true, sparse: true } },
    { key: { tenant_id: 1, email: 1 }, options: { sparse: true } },
    { key: { tenant_id: 1, status: 1 } }
  ],
  conversations: [
    { key: { tenant_id: 1, 'participants.user_id': 1 } },
    { key: { tenant_id: 1, updated_at: -1 } }
  ],
  messages: [
    { key: { tenant_id: 1, conversation_id: 1, created_at: -1 } },
    { key: { tenant_id: 1, sender_id: 1 } }
  ]
};
