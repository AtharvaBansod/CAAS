# Search Feature

## Overview
Full-text search for messages and conversations using Elasticsearch.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| `01-search-indexing.json` | SEARCH-001 to SEARCH-003 | Search index setup and message indexing |
| `02-search-api.json` | SEARCH-004 to SEARCH-006 | Search API and filtering |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Search Pipeline                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Message Created ──► Kafka ──► Search Consumer ──► Elastic  │
│                                                               │
│   Client ──► Gateway ──► Search Service ──► Elasticsearch    │
│                              │                                │
│                              └──► Results with highlighting   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Search Capabilities

### Message Search
- Full-text search across message content
- Filter by conversation, sender, date range
- Highlight matching terms
- Fuzzy matching for typos
- Language-aware stemming

### Conversation Search
- Search by participant names
- Search by group name
- Filter by type (1:1, group)

### Media Search
- Search by filename
- Search by extracted text (documents)
- Filter by media type

## Elasticsearch Index Schema

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "conversation_id": { "type": "keyword" },
      "tenant_id": { "type": "keyword" },
      "sender_id": { "type": "keyword" },
      "content": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "exact": { "type": "keyword" }
        }
      },
      "mentions": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

## Dependencies

- MSG-003: Message Service (for indexing)
- Elasticsearch 8.x

## Estimated Effort

- Total Tasks: 6
- Total Hours: ~24 hours
- Priority: Medium (enhancement feature)
