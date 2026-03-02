/**
 * RT-EVT-004: Event Ownership, RFC Workflow, And Automated Changelogging
 *
 * Provides:
 *  - Owner assignment matrix per event namespace and event family
 *  - RFC/change-request template integration
 *  - Automated changelog generation from registry deltas
 *  - Governance rules linking events to test cases and rollout flags
 */

import {
  SOCKET_EVENT_REGISTRY,
  SocketNamespace,
  SocketEventRegistryEntry,
  SOCKET_SCHEMA_VERSION,
} from './index';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface EventOwnerEntry {
  namespace: SocketNamespace;
  familyPattern: string;
  owner: string;
  escalationContact: string;
  teamSlackChannel: string;
}

export interface RFCEntry {
  rfcId: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'implemented';
  author: string;
  createdAt: string;
  affectedEvents: string[];
  changeType: 'new_event' | 'breaking_change' | 'deprecation' | 'non_breaking';
  migrationNotes: string;
  approvedBy?: string;
  implementedAt?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changeType: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed';
  eventId: string;
  description: string;
  migrationNotes?: string;
  rfcId?: string;
}

export interface GovernanceRule {
  eventId: string;
  testCaseIds: string[];
  rolloutFlag: string;
  requiredApprovals: number;
  breakingChangeBlockedWithoutRFC: boolean;
}

/* ------------------------------------------------------------------ */
/* Owner Assignment Matrix                                             */
/* ------------------------------------------------------------------ */

export const EVENT_OWNER_MATRIX: EventOwnerEntry[] = [
  {
    namespace: 'chat',
    familyPattern: 'sendMessage|joinRoom|leaveRoom|message_*|messages_*|delivery_*|conversation_*|unread_*',
    owner: 'messaging-team',
    escalationContact: 'messaging-lead@caas.io',
    teamSlackChannel: '#team-messaging',
  },
  {
    namespace: 'chat',
    familyPattern: 'typing_*',
    owner: 'collaboration-team',
    escalationContact: 'collab-lead@caas.io',
    teamSlackChannel: '#team-collaboration',
  },
  {
    namespace: 'chat',
    familyPattern: 'moderate:*',
    owner: 'trust-safety-team',
    escalationContact: 'trust-safety-lead@caas.io',
    teamSlackChannel: '#team-trust-safety',
  },
  {
    namespace: 'chat',
    familyPattern: 'message_react|message_pin|message_save|message_forward|message_archive|thread_reply',
    owner: 'messaging-team',
    escalationContact: 'messaging-lead@caas.io',
    teamSlackChannel: '#team-messaging',
  },
  {
    namespace: 'chat',
    familyPattern: 'group_*',
    owner: 'messaging-team',
    escalationContact: 'messaging-lead@caas.io',
    teamSlackChannel: '#team-messaging',
  },
  {
    namespace: 'chat',
    familyPattern: 'planner_*',
    owner: 'collaboration-team',
    escalationContact: 'collab-lead@caas.io',
    teamSlackChannel: '#team-collaboration',
  },
  {
    namespace: 'presence',
    familyPattern: '*',
    owner: 'presence-team',
    escalationContact: 'presence-lead@caas.io',
    teamSlackChannel: '#team-presence',
  },
  {
    namespace: 'webrtc',
    familyPattern: '*',
    owner: 'media-rtc-team',
    escalationContact: 'rtc-lead@caas.io',
    teamSlackChannel: '#team-rtc',
  },
  {
    namespace: 'media',
    familyPattern: '*',
    owner: 'media-rtc-team',
    escalationContact: 'media-lead@caas.io',
    teamSlackChannel: '#team-media',
  },
  {
    namespace: 'search',
    familyPattern: '*',
    owner: 'search-team',
    escalationContact: 'search-lead@caas.io',
    teamSlackChannel: '#team-search',
  },
];

/* ------------------------------------------------------------------ */
/* Governance rules (auto-generated from registry)                     */
/* ------------------------------------------------------------------ */

export function buildGovernanceRules(): GovernanceRule[] {
  return Object.values(SOCKET_EVENT_REGISTRY).map((entry) => ({
    eventId: entry.eventId,
    testCaseIds: [`e2e:${entry.namespace}:${entry.event}`, `unit:${entry.namespace}:${entry.event}`],
    rolloutFlag: `REALTIME_ENABLE_${entry.namespace.toUpperCase()}_${entry.event.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    requiredApprovals: entry.domain === 'moderation' ? 2 : 1,
    breakingChangeBlockedWithoutRFC: true,
  }));
}

/* ------------------------------------------------------------------ */
/* Event owner lookup                                                  */
/* ------------------------------------------------------------------ */

export function getEventOwner(namespace: SocketNamespace, event: string): EventOwnerEntry | null {
  for (const entry of EVENT_OWNER_MATRIX) {
    if (entry.namespace !== namespace) continue;
    if (entry.familyPattern === '*') return entry;
    const patterns = entry.familyPattern.split('|');
    for (const pattern of patterns) {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      if (regex.test(event)) return entry;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* RFC template generator                                              */
/* ------------------------------------------------------------------ */

export function generateRFCTemplate(params: {
  title: string;
  author: string;
  affectedEvents: string[];
  changeType: RFCEntry['changeType'];
}): RFCEntry {
  return {
    rfcId: `RFC-${Date.now()}`,
    title: params.title,
    status: 'draft',
    author: params.author,
    createdAt: new Date().toISOString(),
    affectedEvents: params.affectedEvents,
    changeType: params.changeType,
    migrationNotes: '',
  };
}

/* ------------------------------------------------------------------ */
/* Changelog generation from registry snapshots                        */
/* ------------------------------------------------------------------ */

export function generateChangelog(
  previousRegistry: Record<string, SocketEventRegistryEntry>,
  currentRegistry: Record<string, SocketEventRegistryEntry> = SOCKET_EVENT_REGISTRY,
): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const now = new Date().toISOString().slice(0, 10);

  // Detect added events
  for (const [key, entry] of Object.entries(currentRegistry)) {
    if (!previousRegistry[key]) {
      entries.push({
        version: entry.version,
        date: now,
        changeType: 'added',
        eventId: entry.eventId,
        description: `New event added: ${entry.namespace}:${entry.event} (domain: ${entry.domain})`,
      });
    }
  }

  // Detect removed events
  for (const [key, entry] of Object.entries(previousRegistry)) {
    if (!currentRegistry[key]) {
      entries.push({
        version: entry.version,
        date: now,
        changeType: 'removed',
        eventId: entry.eventId,
        description: `Event removed: ${entry.namespace}:${entry.event}`,
      });
    }
  }

  // Detect changed events (version bump, lifecycle change)
  for (const [key, current] of Object.entries(currentRegistry)) {
    const previous = previousRegistry[key];
    if (!previous) continue;

    if (current.version !== previous.version) {
      entries.push({
        version: current.version,
        date: now,
        changeType: 'changed',
        eventId: current.eventId,
        description: `Event version changed: ${previous.version} → ${current.version}`,
        migrationNotes: `Consumers should update to schema ${current.payloadSchemaRef}`,
      });
    }

    if (current.lifecycle === 'deprecated' && previous.lifecycle === 'active') {
      entries.push({
        version: current.version,
        date: now,
        changeType: 'deprecated',
        eventId: current.eventId,
        description: `Event deprecated: ${current.namespace}:${current.event}`,
        migrationNotes: 'Migrate to replacement event before removal deadline.',
      });
    }
  }

  return entries;
}

/**
 * Validate that a new event can be added — enforces governance rules:
 * - Must have an owner
 * - Breaking changes require RFC
 */
export function validateEventAddition(
  entry: SocketEventRegistryEntry,
  rfcId?: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const owner = getEventOwner(entry.namespace, entry.event);
  if (!owner) {
    errors.push(`No owner defined for ${entry.namespace}:${entry.event}. Add an owner to EVENT_OWNER_MATRIX.`);
  }

  if (!entry.payloadSchemaRef) {
    errors.push('Payload schema reference is required.');
  }

  if (!entry.responseSchemaRef) {
    errors.push('Response schema reference is required.');
  }

  if (entry.accessRoles.length === 0) {
    errors.push('At least one access role must be specified.');
  }

  if (entry.permissions.length === 0) {
    errors.push('At least one permission must be specified.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Export the current event registry state for changelog diffing.
 * Call this before making changes and save the snapshot.
 */
export function snapshotRegistry(): Record<string, SocketEventRegistryEntry> {
  return { ...SOCKET_EVENT_REGISTRY };
}
