import { randomUUID } from 'crypto';

export { evaluateAccessControl, getRateLimitForEvent, getAccessibleEvents, exportAccessControlMatrix, RATE_LIMIT_SPECS } from './access-control';
export type { AccessControlDecision, AccessControlContext, RateLimitSpec } from './access-control';
export { EVENT_OWNER_MATRIX, buildGovernanceRules, getEventOwner, generateRFCTemplate, generateChangelog, validateEventAddition, snapshotRegistry } from './governance';
export type { EventOwnerEntry, RFCEntry, ChangelogEntry, GovernanceRule } from './governance';
export {
  SCHEMA_REGISTRY, REALTIME_ENVELOPE_SCHEMA,
  MESSAGE_CREATED_PAYLOAD_SCHEMA, REACTION_PAYLOAD_SCHEMA,
  THREAD_REPLY_PAYLOAD_SCHEMA, GROUP_EVENT_PAYLOAD_SCHEMA,
  PLANNER_TASK_PAYLOAD_SCHEMA, SOCIAL_POST_PAYLOAD_SCHEMA,
  PRESENCE_PAYLOAD_SCHEMA, MODERATION_PAYLOAD_SCHEMA,
  validatePayload, validateEnvelope, deserializeWithFallback,
} from './schemas';
export type { SchemaRegistryEntry, ValidationResult } from './schemas';

export const SOCKET_SCHEMA_VERSION = '1.0.0';
export const REALTIME_ENVELOPE_SCHEMA_VERSION = '1.0.0';
export const SOCKET_EVENT_OWNER_DEFAULT = 'platform-realtime';

export type SocketNamespace = 'chat' | 'presence' | 'webrtc' | 'media' | 'search' | 'social';
export type SocketEventDomain =
  | 'messaging'
  | 'moderation'
  | 'collaboration'
  | 'social'
  | 'notification'
  | 'planner';
export type SocketAccessRole = 'tenant_admin' | 'member' | 'moderator' | 'viewer' | 'system';
export type SocketLifecycleStatus = 'active' | 'deprecated' | 'planned';
export type RateLimitProfile = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface SocketEventRegistryEntry {
  namespace: SocketNamespace;
  event: string;
  eventId: string;
  version: string;
  lifecycle: SocketLifecycleStatus;
  domain: SocketEventDomain;
  owner: string;
  ackRequired: boolean;
  projectScoped: boolean;
  accessRoles: SocketAccessRole[];
  permissions: string[];
  rateLimitProfile: RateLimitProfile;
  payloadSchemaRef: string;
  responseSchemaRef: string;
  deprecatedNames?: string[];
}

const defineSocketEvent = (
  entry: Omit<SocketEventRegistryEntry, 'eventId' | 'version' | 'owner'> & {
    version?: string;
    owner?: string;
  }
): SocketEventRegistryEntry => ({
  version: entry.version || SOCKET_SCHEMA_VERSION,
  owner: entry.owner || SOCKET_EVENT_OWNER_DEFAULT,
  eventId: `${entry.namespace}:${entry.event}@${entry.version || SOCKET_SCHEMA_VERSION}`,
  ...entry,
});

export const SOCKET_EVENT_REGISTRY: Record<string, SocketEventRegistryEntry> = Object.freeze({
  'chat:joinRoom': defineSocketEvent({
    namespace: 'chat',
    event: 'joinRoom',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.join-room.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:leaveRoom': defineSocketEvent({
    namespace: 'chat',
    event: 'leaveRoom',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'chat.leave-room.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:sendMessage': defineSocketEvent({
    namespace: 'chat',
    event: 'sendMessage',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'chat.send-message.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:message_delivered': defineSocketEvent({
    namespace: 'chat',
    event: 'message_delivered',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.message-delivered.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:messages_delivered': defineSocketEvent({
    namespace: 'chat',
    event: 'messages_delivered',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'chat.messages-delivered.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:delivery_status': defineSocketEvent({
    namespace: 'chat',
    event: 'delivery_status',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'chat.delivery-status.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:typing_start': defineSocketEvent({
    namespace: 'chat',
    event: 'typing_start',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.typing-start.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:typing_stop': defineSocketEvent({
    namespace: 'chat',
    event: 'typing_stop',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.typing-stop.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:typing_query': defineSocketEvent({
    namespace: 'chat',
    event: 'typing_query',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'chat.typing-query.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:message_read': defineSocketEvent({
    namespace: 'chat',
    event: 'message_read',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.message-read.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:messages_read': defineSocketEvent({
    namespace: 'chat',
    event: 'messages_read',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'chat.messages-read.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:conversation_read': defineSocketEvent({
    namespace: 'chat',
    event: 'conversation_read',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.conversation-read.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:unread_query': defineSocketEvent({
    namespace: 'chat',
    event: 'unread_query',
    lifecycle: 'active',
    domain: 'notification',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'chat.unread-query.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:moderate:kick': defineSocketEvent({
    namespace: 'chat',
    event: 'moderate:kick',
    lifecycle: 'active',
    domain: 'moderation',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.moderate-kick.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:moderate:ban': defineSocketEvent({
    namespace: 'chat',
    event: 'moderate:ban',
    lifecycle: 'active',
    domain: 'moderation',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.moderate-ban.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:moderate:unban': defineSocketEvent({
    namespace: 'chat',
    event: 'moderate:unban',
    lifecycle: 'active',
    domain: 'moderation',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.moderate-unban.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:moderate:mute': defineSocketEvent({
    namespace: 'chat',
    event: 'moderate:mute',
    lifecycle: 'active',
    domain: 'moderation',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.moderate-mute.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:moderate:unmute': defineSocketEvent({
    namespace: 'chat',
    event: 'moderate:unmute',
    lifecycle: 'active',
    domain: 'moderation',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.moderate-unmute.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),

  /* ── RT-SOCK-001: Advanced Chat Interaction Events ── */

  'chat:message_react': defineSocketEvent({
    namespace: 'chat',
    event: 'message_react',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'chat.message-react.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:message_pin': defineSocketEvent({
    namespace: 'chat',
    event: 'message_pin',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.message-pin.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:message_save': defineSocketEvent({
    namespace: 'chat',
    event: 'message_save',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:read'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.message-save.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:message_forward': defineSocketEvent({
    namespace: 'chat',
    event: 'message_forward',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.message-forward.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:message_archive': defineSocketEvent({
    namespace: 'chat',
    event: 'message_archive',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.message-archive.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:thread_reply': defineSocketEvent({
    namespace: 'chat',
    event: 'thread_reply',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'chat.thread-reply.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:group_create': defineSocketEvent({
    namespace: 'chat',
    event: 'group_create',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:create'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'chat.group-create.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:group_settings_update': defineSocketEvent({
    namespace: 'chat',
    event: 'group_settings_update',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'chat.group-settings-update.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:group_member_role_update': defineSocketEvent({
    namespace: 'chat',
    event: 'group_member_role_update',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'chat.group-member-role-update.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:group_invite_link': defineSocketEvent({
    namespace: 'chat',
    event: 'group_invite_link',
    lifecycle: 'active',
    domain: 'messaging',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['moderator', 'tenant_admin'],
    permissions: ['conversation:moderate'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'chat.group-invite-link.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:planner_task_create': defineSocketEvent({
    namespace: 'chat',
    event: 'planner_task_create',
    lifecycle: 'active',
    domain: 'planner',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.planner-task-create.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'chat:planner_task_update': defineSocketEvent({
    namespace: 'chat',
    event: 'planner_task_update',
    lifecycle: 'active',
    domain: 'planner',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['conversation:write'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'chat.planner-task-update.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),

  /* ── RT-SOCK-002: Presence/Privacy Event Upgrades ── */

  'presence:presence_mode_set': defineSocketEvent({
    namespace: 'presence',
    event: 'presence_mode_set',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['presence:write'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'presence.mode-set.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:last_seen_policy_set': defineSocketEvent({
    namespace: 'presence',
    event: 'last_seen_policy_set',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['presence:write'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'presence.last-seen-policy-set.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:notification_preference_set': defineSocketEvent({
    namespace: 'presence',
    event: 'notification_preference_set',
    lifecycle: 'active',
    domain: 'notification',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['presence:write'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'presence.notification-preference-set.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:user_block': defineSocketEvent({
    namespace: 'presence',
    event: 'user_block',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['presence:write'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'presence.user-block.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:user_unblock': defineSocketEvent({
    namespace: 'presence',
    event: 'user_unblock',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['presence:write'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'presence.user-unblock.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:user_report': defineSocketEvent({
    namespace: 'presence',
    event: 'user_report',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['presence:write'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'presence.user-report.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),

  /* ── RT-SOCK-003: Media/Social Interaction Events ── */

  'media:post_like': defineSocketEvent({
    namespace: 'media',
    event: 'post_like',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['media:interact'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'media.post-like.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:post_comment': defineSocketEvent({
    namespace: 'media',
    event: 'post_comment',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['media:interact'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'media.post-comment.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:post_save': defineSocketEvent({
    namespace: 'media',
    event: 'post_save',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['media:interact'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'media.post-save.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:post_share': defineSocketEvent({
    namespace: 'media',
    event: 'post_share',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['media:interact'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'media.post-share.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:story_view': defineSocketEvent({
    namespace: 'media',
    event: 'story_view',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['media:read'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'media.story-view.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:story_react': defineSocketEvent({
    namespace: 'media',
    event: 'story_react',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['media:interact'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'media.story-react.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:media_viewer_sync': defineSocketEvent({
    namespace: 'media',
    event: 'media_viewer_sync',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['media:read'],
    rateLimitProfile: 'critical',
    payloadSchemaRef: 'media.viewer-sync.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:presence_update': defineSocketEvent({
    namespace: 'presence',
    event: 'presence_update',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['presence:write'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'presence.update.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:presence_subscribe': defineSocketEvent({
    namespace: 'presence',
    event: 'presence_subscribe',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['presence:read'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'presence.subscribe.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:presence_unsubscribe': defineSocketEvent({
    namespace: 'presence',
    event: 'presence_unsubscribe',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['presence:read'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'presence.unsubscribe.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'presence:presence_subscriptions_query': defineSocketEvent({
    namespace: 'presence',
    event: 'presence_subscriptions_query',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['presence:read'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'presence.subscriptions-query.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:webrtc:get-ice-servers': defineSocketEvent({
    namespace: 'webrtc',
    event: 'webrtc:get-ice-servers',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:connect'],
    rateLimitProfile: 'low',
    payloadSchemaRef: 'webrtc.get-ice-servers.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:webrtc:offer': defineSocketEvent({
    namespace: 'webrtc',
    event: 'webrtc:offer',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:signal'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'webrtc.offer.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:webrtc:answer': defineSocketEvent({
    namespace: 'webrtc',
    event: 'webrtc:answer',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:signal'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'webrtc.answer.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:webrtc:ice-candidate': defineSocketEvent({
    namespace: 'webrtc',
    event: 'webrtc:ice-candidate',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:signal'],
    rateLimitProfile: 'critical',
    payloadSchemaRef: 'webrtc.ice-candidate.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:call:initiate': defineSocketEvent({
    namespace: 'webrtc',
    event: 'call:initiate',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:call'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'webrtc.call-initiate.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:call:answer': defineSocketEvent({
    namespace: 'webrtc',
    event: 'call:answer',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:call'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'webrtc.call-answer.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:call:reject': defineSocketEvent({
    namespace: 'webrtc',
    event: 'call:reject',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:call'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'webrtc.call-reject.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:call:hangup': defineSocketEvent({
    namespace: 'webrtc',
    event: 'call:hangup',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:call'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'webrtc.call-hangup.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:screen:start': defineSocketEvent({
    namespace: 'webrtc',
    event: 'screen:start',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:screen-share'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'webrtc.screen-start.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:screen:stop': defineSocketEvent({
    namespace: 'webrtc',
    event: 'screen:stop',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:screen-share'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'webrtc.screen-stop.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:screen:offer': defineSocketEvent({
    namespace: 'webrtc',
    event: 'screen:offer',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:screen-share'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'webrtc.screen-offer.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'webrtc:screen:answer': defineSocketEvent({
    namespace: 'webrtc',
    event: 'screen:answer',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['webrtc:screen-share'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'webrtc.screen-answer.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:media:request-upload': defineSocketEvent({
    namespace: 'media',
    event: 'media:request-upload',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['media:upload'],
    rateLimitProfile: 'high',
    payloadSchemaRef: 'media.request-upload.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:media:upload-complete': defineSocketEvent({
    namespace: 'media',
    event: 'media:upload-complete',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['media:upload'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'media.upload-complete.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:media:get-download-url': defineSocketEvent({
    namespace: 'media',
    event: 'media:get-download-url',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['media:read'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'media.get-download-url.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'media:media:delete': defineSocketEvent({
    namespace: 'media',
    event: 'media:delete',
    lifecycle: 'active',
    domain: 'social',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['member', 'moderator', 'tenant_admin'],
    permissions: ['media:delete'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'media.delete.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'search:search:messages': defineSocketEvent({
    namespace: 'search',
    event: 'search:messages',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['search:messages'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'search.messages.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'search:search:conversations': defineSocketEvent({
    namespace: 'search',
    event: 'search:conversations',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: true,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['search:conversations'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'search.conversations.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
  'search:search:users': defineSocketEvent({
    namespace: 'search',
    event: 'search:users',
    lifecycle: 'active',
    domain: 'collaboration',
    ackRequired: true,
    projectScoped: false,
    accessRoles: ['viewer', 'member', 'moderator', 'tenant_admin'],
    permissions: ['search:users'],
    rateLimitProfile: 'medium',
    payloadSchemaRef: 'search.users.v1',
    responseSchemaRef: 'socket.ack.v1',
  }),
});

export const SOCKET_EVENT_DEPRECATIONS: Record<string, string[]> = Object.freeze({
  'presence_subscribe': ['presence:presence_subscribe'],
  'presence_unsubscribe': ['presence:presence_unsubscribe'],
});

export interface SocketAckEnvelope<T = unknown> {
  status: 'ok' | 'error';
  code: string;
  message: string;
  correlation_id: string;
  event_id: string;
  retryable: boolean;
  schema_version: string;
  data?: T;
  details?: Record<string, unknown>;
}

export interface BuildSocketAckParams<T> {
  eventId: string;
  correlationId: string;
  code?: string;
  message?: string;
  retryable?: boolean;
  data?: T;
  details?: Record<string, unknown>;
}

export function buildSocketAckEnvelope<T = unknown>(
  params: BuildSocketAckParams<T>
): SocketAckEnvelope<T> {
  return {
    status: 'ok',
    code: params.code || 'OK',
    message: params.message || 'Request completed',
    correlation_id: params.correlationId,
    event_id: params.eventId,
    retryable: params.retryable || false,
    schema_version: SOCKET_SCHEMA_VERSION,
    ...(params.data !== undefined ? { data: params.data } : {}),
    ...(params.details ? { details: params.details } : {}),
  };
}

export function buildSocketErrorEnvelope<T = unknown>(
  params: BuildSocketAckParams<T>
): SocketAckEnvelope<T> {
  return {
    status: 'error',
    code: params.code || 'INTERNAL_ERROR',
    message: params.message || 'Request failed',
    correlation_id: params.correlationId,
    event_id: params.eventId,
    retryable: params.retryable || false,
    schema_version: SOCKET_SCHEMA_VERSION,
    ...(params.data !== undefined ? { data: params.data } : {}),
    ...(params.details ? { details: params.details } : {}),
  };
}

export function getSocketEventDefinition(
  namespace: SocketNamespace,
  event: string
): SocketEventRegistryEntry {
  const key = `${namespace}:${event}`;
  const definition = SOCKET_EVENT_REGISTRY[key];
  if (!definition) {
    throw new Error(`Unregistered socket event: ${key}`);
  }
  return definition;
}

export interface RealtimeEnvelopeMetadata {
  user_id?: string;
  conversation_id?: string;
  room_id?: string;
  request_ip?: string;
  replay?: {
    replay_id: string;
    replayed_at: string;
    replay_window_start: string;
    replay_window_end: string;
  };
  dlq?: {
    reason: string;
    diagnostics?: Record<string, unknown>;
  };
  dedupe_key?: string;
  [key: string]: unknown;
}

export interface RealtimeEnvelope<T = unknown> {
  event_id: string;
  event_type: string;
  schema_version: string;
  tenant_id: string;
  project_id?: string;
  correlation_id: string;
  occurred_at: string;
  producer_id: string;
  partition_key: string;
  payload: T;
  metadata?: RealtimeEnvelopeMetadata;
}

export interface BuildRealtimeEnvelopeParams<T> {
  eventId?: string;
  eventType: string;
  tenantId: string;
  projectId?: string;
  correlationId?: string;
  producerId: string;
  partitionKey: string;
  payload: T;
  metadata?: RealtimeEnvelopeMetadata;
  occurredAt?: Date | string;
}

export function buildRealtimeEnvelope<T>(
  params: BuildRealtimeEnvelopeParams<T>
): RealtimeEnvelope<T> {
  return {
    event_id: params.eventId || randomUUID(),
    event_type: params.eventType,
    schema_version: REALTIME_ENVELOPE_SCHEMA_VERSION,
    tenant_id: params.tenantId,
    ...(params.projectId ? { project_id: params.projectId } : {}),
    correlation_id: params.correlationId || randomUUID(),
    occurred_at:
      typeof params.occurredAt === 'string'
        ? params.occurredAt
        : (params.occurredAt || new Date()).toISOString(),
    producer_id: params.producerId,
    partition_key: params.partitionKey,
    payload: params.payload,
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };
}

export function isRealtimeEnvelope(value: unknown): value is RealtimeEnvelope<Record<string, unknown>> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.event_id === 'string' &&
    typeof candidate.event_type === 'string' &&
    typeof candidate.schema_version === 'string' &&
    typeof candidate.tenant_id === 'string' &&
    typeof candidate.correlation_id === 'string' &&
    typeof candidate.occurred_at === 'string' &&
    typeof candidate.producer_id === 'string' &&
    typeof candidate.partition_key === 'string' &&
    'payload' in candidate
  );
}

export function getRealtimeTopicForEvent(eventType: string): string {
  if (eventType.startsWith('message.')) {
    return 'chat.messages';
  }
  if (eventType.startsWith('conversation.')) {
    return 'conversation-events';
  }
  if (eventType.startsWith('moderation.')) {
    return 'moderation-events';
  }
  if (eventType.startsWith('media.')) {
    return 'media-events';
  }
  if (eventType.startsWith('search.')) {
    return 'search-events';
  }
  if (eventType.startsWith('presence.')) {
    return 'presence-events';
  }
  if (eventType.startsWith('webrtc.') || eventType.startsWith('call.')) {
    return 'rtc-events';
  }
  if (eventType.startsWith('reaction.')) {
    return 'chat.messages';
  }
  if (eventType.startsWith('thread.')) {
    return 'chat.messages';
  }
  if (eventType.startsWith('group.')) {
    return 'conversation-events';
  }
  if (eventType.startsWith('planner.')) {
    return 'planner-events';
  }
  if (eventType.startsWith('social.') || eventType.startsWith('post.') || eventType.startsWith('story.')) {
    return 'social-events';
  }
  if (eventType.startsWith('privacy.') || eventType.startsWith('block.') || eventType.startsWith('report.')) {
    return 'moderation-events';
  }
  return 'message-events';
}

// ── RT-KAF-001: Event-to-Topic Routing Table ──

export interface EventRoutingEntry {
  event_family: string;
  topic: string;
  partition_key: 'conversation_id' | 'user_id' | 'tenant_id' | 'random';
  retry_policy: 'standard' | 'aggressive' | 'none';
  max_retries: number;
  retry_delays_ms: number[];
  dlq_on_exhaust: boolean;
}

export const EVENT_ROUTING_TABLE: EventRoutingEntry[] = [
  {
    event_family: 'message.*',
    topic: 'chat.messages',
    partition_key: 'conversation_id',
    retry_policy: 'standard',
    max_retries: 3,
    retry_delays_ms: [1000, 5000, 30000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'reaction.*',
    topic: 'chat.messages',
    partition_key: 'conversation_id',
    retry_policy: 'standard',
    max_retries: 2,
    retry_delays_ms: [1000, 5000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'thread.*',
    topic: 'chat.messages',
    partition_key: 'conversation_id',
    retry_policy: 'standard',
    max_retries: 3,
    retry_delays_ms: [1000, 5000, 30000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'conversation.*',
    topic: 'conversation-events',
    partition_key: 'conversation_id',
    retry_policy: 'standard',
    max_retries: 3,
    retry_delays_ms: [1000, 5000, 30000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'group.*',
    topic: 'conversation-events',
    partition_key: 'conversation_id',
    retry_policy: 'standard',
    max_retries: 3,
    retry_delays_ms: [1000, 5000, 30000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'moderation.*',
    topic: 'moderation-events',
    partition_key: 'tenant_id',
    retry_policy: 'aggressive',
    max_retries: 5,
    retry_delays_ms: [500, 1000, 5000, 15000, 60000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'presence.*',
    topic: 'presence-events',
    partition_key: 'user_id',
    retry_policy: 'none',
    max_retries: 0,
    retry_delays_ms: [],
    dlq_on_exhaust: false,
  },
  {
    event_family: 'media.*',
    topic: 'media-events',
    partition_key: 'conversation_id',
    retry_policy: 'standard',
    max_retries: 3,
    retry_delays_ms: [1000, 5000, 30000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'webrtc.*',
    topic: 'rtc-events',
    partition_key: 'user_id',
    retry_policy: 'none',
    max_retries: 0,
    retry_delays_ms: [],
    dlq_on_exhaust: false,
  },
  {
    event_family: 'planner.*',
    topic: 'planner-events',
    partition_key: 'conversation_id',
    retry_policy: 'standard',
    max_retries: 3,
    retry_delays_ms: [1000, 5000, 30000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'social.*',
    topic: 'social-events',
    partition_key: 'user_id',
    retry_policy: 'standard',
    max_retries: 2,
    retry_delays_ms: [1000, 5000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'post.*',
    topic: 'social-events',
    partition_key: 'user_id',
    retry_policy: 'standard',
    max_retries: 2,
    retry_delays_ms: [1000, 5000],
    dlq_on_exhaust: true,
  },
  {
    event_family: 'story.*',
    topic: 'social-events',
    partition_key: 'user_id',
    retry_policy: 'standard',
    max_retries: 2,
    retry_delays_ms: [1000, 5000],
    dlq_on_exhaust: true,
  },
];

export function getRoutingEntry(eventType: string): EventRoutingEntry | undefined {
  const family = eventType.split('.')[0] + '.*';
  return EVENT_ROUTING_TABLE.find(e => e.event_family === family);
}

export function getPartitionKey(
  eventType: string,
  envelope: { tenant_id?: string; project_id?: string; correlation_id?: string; [key: string]: any }
): string | null {
  const entry = getRoutingEntry(eventType);
  if (!entry) return null;
  switch (entry.partition_key) {
    case 'conversation_id': return envelope.correlation_id || envelope.tenant_id || null;
    case 'user_id': return envelope.correlation_id || null;
    case 'tenant_id': return envelope.tenant_id || null;
    case 'random': return null;
    default: return null;
  }
}
