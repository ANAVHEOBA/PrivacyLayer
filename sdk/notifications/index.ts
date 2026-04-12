// ============================================================
// PrivacyLayer SDK — Notifications Module
// ============================================================
// Re-exports all public types and the NotificationService class.
// ============================================================

export {
  // Service
  NotificationService,

  // Enums
  EventType,
  ChannelType,

  // Interfaces — config
  type EmailConfig,
  type WebhookConfig,
  type InAppConfig,
  type ChannelConfig,
  type NotificationServiceConfig,

  // Interfaces — subscriber
  type Subscriber,

  // Interfaces — notification
  type NotificationPayload,
  type NotificationResult,
  type NotificationTemplate,
  type StoredNotification,

  // Interfaces — transports (pluggable)
  type EmailTransport,
  type HttpClient,
} from './notification-service';
