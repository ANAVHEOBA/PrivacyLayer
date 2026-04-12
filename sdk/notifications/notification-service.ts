// ============================================================
// PrivacyLayer SDK — Notification Service
// ============================================================
// Production-grade notification system for PrivacyLayer events.
//
// Features:
//   - Email notifications (deposit confirmed, withdrawal ready, proof generated)
//   - Webhook support (POST to user-configured URLs with HMAC signatures)
//   - Event type enumeration aligned with on-chain contract events
//   - Subscriber management (add / remove / list)
//   - Rate limiting (max 10 notifications per minute per subscriber)
//   - Customizable templates for each event type
// ============================================================

// ──────────────────────────────────────────────────────────────
// Event Types — mirrors on-chain contract events
// ──────────────────────────────────────────────────────────────

export enum EventType {
  /** A deposit commitment was confirmed on-chain */
  DEPOSIT_CONFIRMED = 'DEPOSIT_CONFIRMED',
  /** A withdrawal is ready to be claimed */
  WITHDRAWAL_READY = 'WITHDRAWAL_READY',
  /** A zero-knowledge proof was successfully generated */
  PROOF_GENERATED = 'PROOF_GENERATED',
  /** The privacy pool was paused by admin */
  POOL_PAUSED = 'POOL_PAUSED',
  /** The privacy pool was unpaused by admin */
  POOL_UNPAUSED = 'POOL_UNPAUSED',
  /** The verifying key was updated */
  VK_UPDATED = 'VK_UPDATED',
}

// ──────────────────────────────────────────────────────────────
// Notification Channel Types
// ──────────────────────────────────────────────────────────────

export enum ChannelType {
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  IN_APP = 'IN_APP',
}

// ──────────────────────────────────────────────────────────────
// Core Interfaces
// ──────────────────────────────────────────────────────────────

export interface EmailConfig {
  /** SMTP host (e.g. "smtp.gmail.com") */
  host: string;
  /** SMTP port (e.g. 587 for TLS) */
  port: number;
  /** Use TLS */
  secure: boolean;
  /** SMTP auth credentials */
  auth: {
    user: string;
    pass: string;
  };
  /** Sender address shown in From: header */
  from: string;
}

export interface WebhookConfig {
  /** URL to POST event payloads to */
  url: string;
  /** Optional HMAC-SHA256 secret for payload signing */
  secret?: string;
  /** Custom headers to include in the POST request */
  headers?: Record<string, string>;
  /** Timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
  /** Number of retry attempts on failure (default: 3) */
  retries?: number;
}

export interface InAppConfig {
  /** Maximum number of notifications to retain in memory */
  maxRetained: number;
}

export interface ChannelConfig {
  type: ChannelType;
  email?: EmailConfig;
  webhook?: WebhookConfig;
  inApp?: InAppConfig;
}

export interface Subscriber {
  /** Unique subscriber identifier */
  id: string;
  /** Human-readable label */
  name: string;
  /** Delivery channels configured for this subscriber */
  channels: ChannelConfig[];
  /** Event types this subscriber is interested in */
  events: EventType[];
  /** Whether the subscriber is currently active */
  enabled: boolean;
  /** ISO-8601 timestamp of when the subscriber was created */
  createdAt: string;
}

export interface NotificationPayload {
  /** The event that triggered this notification */
  eventType: EventType;
  /** ISO-8601 timestamp of when the event occurred */
  timestamp: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

export interface NotificationResult {
  subscriberId: string;
  channel: ChannelType;
  success: boolean;
  error?: string;
  /** ISO-8601 timestamp of delivery attempt */
  attemptedAt: string;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  /** Optional HTML body for email */
  htmlBody?: string;
}

// ──────────────────────────────────────────────────────────────
// Rate Limiter
// ──────────────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
}

class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly entries: Map<string, RateLimitEntry> = new Map();

  constructor(maxRequests: number = 10, windowMs: number = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a notification is allowed for the given subscriber.
   * Returns true if within rate limit, false if throttled.
   */
  isAllowed(subscriberId: string): boolean {
    const now = Date.now();
    const entry = this.entries.get(subscriberId);

    if (!entry) {
      this.entries.set(subscriberId, { timestamps: [now] });
      return true;
    }

    // Evict timestamps outside the sliding window
    entry.timestamps = entry.timestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    if (entry.timestamps.length >= this.maxRequests) {
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }

  /**
   * Returns the number of remaining notifications allowed in the current window.
   */
  remaining(subscriberId: string): number {
    const now = Date.now();
    const entry = this.entries.get(subscriberId);

    if (!entry) {
      return this.maxRequests;
    }

    const active = entry.timestamps.filter(
      (ts) => now - ts < this.windowMs
    ).length;

    return Math.max(0, this.maxRequests - active);
  }

  /**
   * Reset rate limit state for a specific subscriber (or all).
   */
  reset(subscriberId?: string): void {
    if (subscriberId) {
      this.entries.delete(subscriberId);
    } else {
      this.entries.clear();
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Notification Templates
// ──────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<EventType, NotificationTemplate> = {
  [EventType.DEPOSIT_CONFIRMED]: {
    subject: 'PrivacyLayer: Deposit Confirmed',
    body: [
      'Your deposit has been confirmed on the PrivacyLayer privacy pool.',
      '',
      'Commitment: {{commitment}}',
      'Leaf Index: {{leafIndex}}',
      'Merkle Root: {{root}}',
      '',
      'Your funds are now shielded. Keep your note secret — it is required to withdraw.',
    ].join('\n'),
    htmlBody: [
      '<h2>Deposit Confirmed</h2>',
      '<p>Your deposit has been confirmed on the PrivacyLayer privacy pool.</p>',
      '<table style="border-collapse:collapse;margin:16px 0">',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Commitment</td><td style="padding:4px 12px;font-family:monospace">{{commitment}}</td></tr>',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Leaf Index</td><td style="padding:4px 12px">{{leafIndex}}</td></tr>',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Merkle Root</td><td style="padding:4px 12px;font-family:monospace">{{root}}</td></tr>',
      '</table>',
      '<p><strong>Keep your note secret</strong> — it is required to withdraw.</p>',
    ].join('\n'),
  },

  [EventType.WITHDRAWAL_READY]: {
    subject: 'PrivacyLayer: Withdrawal Ready',
    body: [
      'Your withdrawal is ready to be claimed.',
      '',
      'Nullifier Hash: {{nullifierHash}}',
      'Recipient: {{recipient}}',
      'Amount: {{amount}}',
      'Fee: {{fee}}',
      '',
      'The funds will be sent to the recipient address above.',
    ].join('\n'),
    htmlBody: [
      '<h2>Withdrawal Ready</h2>',
      '<p>Your withdrawal is ready to be claimed.</p>',
      '<table style="border-collapse:collapse;margin:16px 0">',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Nullifier Hash</td><td style="padding:4px 12px;font-family:monospace">{{nullifierHash}}</td></tr>',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Recipient</td><td style="padding:4px 12px;font-family:monospace">{{recipient}}</td></tr>',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Amount</td><td style="padding:4px 12px">{{amount}}</td></tr>',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Fee</td><td style="padding:4px 12px">{{fee}}</td></tr>',
      '</table>',
    ].join('\n'),
  },

  [EventType.PROOF_GENERATED]: {
    subject: 'PrivacyLayer: Proof Generated',
    body: [
      'A zero-knowledge proof has been successfully generated.',
      '',
      'Proof ID: {{proofId}}',
      'Circuit: {{circuit}}',
      'Generation Time: {{generationTimeMs}}ms',
      '',
      'You can now proceed with your withdrawal.',
    ].join('\n'),
    htmlBody: [
      '<h2>Proof Generated</h2>',
      '<p>A zero-knowledge proof has been successfully generated.</p>',
      '<table style="border-collapse:collapse;margin:16px 0">',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Proof ID</td><td style="padding:4px 12px;font-family:monospace">{{proofId}}</td></tr>',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Circuit</td><td style="padding:4px 12px">{{circuit}}</td></tr>',
      '  <tr><td style="padding:4px 12px;font-weight:bold">Generation Time</td><td style="padding:4px 12px">{{generationTimeMs}}ms</td></tr>',
      '</table>',
      '<p>You can now proceed with your withdrawal.</p>',
    ].join('\n'),
  },

  [EventType.POOL_PAUSED]: {
    subject: 'PrivacyLayer: Pool Paused',
    body: [
      'The privacy pool has been paused by the administrator.',
      '',
      'Admin: {{admin}}',
      '',
      'Deposits and withdrawals are temporarily disabled.',
    ].join('\n'),
  },

  [EventType.POOL_UNPAUSED]: {
    subject: 'PrivacyLayer: Pool Resumed',
    body: [
      'The privacy pool has been unpaused by the administrator.',
      '',
      'Admin: {{admin}}',
      '',
      'Deposits and withdrawals are now active again.',
    ].join('\n'),
  },

  [EventType.VK_UPDATED]: {
    subject: 'PrivacyLayer: Verifying Key Updated',
    body: [
      'The verifying key for the privacy pool has been updated.',
      '',
      'Admin: {{admin}}',
      '',
      'This is a critical security event. Ensure this was authorized.',
    ].join('\n'),
  },
};

// ──────────────────────────────────────────────────────────────
// Template Renderer
// ──────────────────────────────────────────────────────────────

function renderTemplate(
  template: string,
  data: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = data[key];
    if (value === undefined || value === null) return `{{${key}}}`;
    return String(value);
  });
}

// ──────────────────────────────────────────────────────────────
// Transport Interfaces (pluggable)
// ──────────────────────────────────────────────────────────────

export interface EmailTransport {
  send(options: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void>;
}

export interface HttpClient {
  post(
    url: string,
    body: string,
    options: {
      headers: Record<string, string>;
      timeoutMs: number;
    }
  ): Promise<{ status: number; body: string }>;
}

// ──────────────────────────────────────────────────────────────
// HMAC Signing Utility
// ──────────────────────────────────────────────────────────────

async function computeHmacSha256(
  secret: string,
  payload: string
): Promise<string> {
  // Use Web Crypto API (available in Node 18+ and modern browsers)
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(payload);

    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await globalThis.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      msgData
    );

    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback: return empty string (caller should provide a crypto implementation)
  return '';
}

// ──────────────────────────────────────────────────────────────
// Notification Service Configuration
// ──────────────────────────────────────────────────────────────

export interface NotificationServiceConfig {
  /** Maximum notifications per minute per subscriber (default: 10) */
  rateLimitMax?: number;
  /** Rate limit window in milliseconds (default: 60000) */
  rateLimitWindowMs?: number;
  /** Custom templates to override defaults */
  templates?: Partial<Record<EventType, NotificationTemplate>>;
  /** Optional email transport implementation */
  emailTransport?: EmailTransport;
  /** Optional HTTP client for webhooks */
  httpClient?: HttpClient;
  /** Logger function (default: console.log) */
  logger?: (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
}

// ──────────────────────────────────────────────────────────────
// In-App Notification Store
// ──────────────────────────────────────────────────────────────

export interface StoredNotification {
  id: string;
  subscriberId: string;
  eventType: EventType;
  payload: NotificationPayload;
  read: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────
// Notification Service
// ──────────────────────────────────────────────────────────────

export class NotificationService {
  private subscribers: Map<string, Subscriber> = new Map();
  private readonly rateLimiter: RateLimiter;
  private readonly templates: Record<EventType, NotificationTemplate>;
  private readonly emailTransport?: EmailTransport;
  private readonly httpClient?: HttpClient;
  private readonly inAppStore: Map<string, StoredNotification[]> = new Map();
  private readonly logger: (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;

  constructor(config: NotificationServiceConfig = {}) {
    this.rateLimiter = new RateLimiter(
      config.rateLimitMax ?? 10,
      config.rateLimitWindowMs ?? 60_000
    );

    this.templates = {
      ...DEFAULT_TEMPLATES,
      ...(config.templates ?? {}),
    };

    this.emailTransport = config.emailTransport;
    this.httpClient = config.httpClient;

    this.logger = config.logger ?? ((level, message, meta) => {
      const ts = new Date().toISOString();
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      // eslint-disable-next-line no-console
      console[level](`[${ts}] [NotificationService] [${level.toUpperCase()}] ${message}${metaStr}`);
    });
  }

  // ────────────────────────────────────────────────────────────
  // Subscriber Management
  // ────────────────────────────────────────────────────────────

  /**
   * Register a new subscriber.
   * @throws Error if a subscriber with the same ID already exists.
   */
  addSubscriber(subscriber: Omit<Subscriber, 'createdAt'>): Subscriber {
    if (this.subscribers.has(subscriber.id)) {
      throw new Error(`Subscriber with id "${subscriber.id}" already exists`);
    }

    const full: Subscriber = {
      ...subscriber,
      createdAt: new Date().toISOString(),
    };

    this.subscribers.set(full.id, full);
    this.logger('info', `Subscriber added: ${full.id}`, { name: full.name });
    return full;
  }

  /**
   * Remove a subscriber by ID.
   * @returns true if the subscriber was found and removed, false otherwise.
   */
  removeSubscriber(subscriberId: string): boolean {
    const removed = this.subscribers.delete(subscriberId);
    if (removed) {
      this.inAppStore.delete(subscriberId);
      this.rateLimiter.reset(subscriberId);
      this.logger('info', `Subscriber removed: ${subscriberId}`);
    }
    return removed;
  }

  /**
   * Get a subscriber by ID.
   */
  getSubscriber(subscriberId: string): Subscriber | undefined {
    return this.subscribers.get(subscriberId);
  }

  /**
   * List all subscribers, optionally filtered by event type.
   */
  listSubscribers(eventFilter?: EventType): Subscriber[] {
    const all = Array.from(this.subscribers.values());
    if (!eventFilter) return all;
    return all.filter((s) => s.events.includes(eventFilter));
  }

  /**
   * Update subscriber preferences (events, channels, enabled state).
   * @throws Error if the subscriber is not found.
   */
  updateSubscriber(
    subscriberId: string,
    updates: Partial<Pick<Subscriber, 'events' | 'channels' | 'enabled' | 'name'>>
  ): Subscriber {
    const existing = this.subscribers.get(subscriberId);
    if (!existing) {
      throw new Error(`Subscriber "${subscriberId}" not found`);
    }

    const updated: Subscriber = {
      ...existing,
      ...updates,
    };

    this.subscribers.set(subscriberId, updated);
    this.logger('info', `Subscriber updated: ${subscriberId}`);
    return updated;
  }

  // ────────────────────────────────────────────────────────────
  // Notification Dispatch
  // ────────────────────────────────────────────────────────────

  /**
   * Send a notification to all subscribers interested in the given event.
   * Respects rate limits and subscriber preferences.
   */
  async notify(
    eventType: EventType,
    data: Record<string, unknown>
  ): Promise<NotificationResult[]> {
    const payload: NotificationPayload = {
      eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    const interested = this.listSubscribers(eventType).filter((s) => s.enabled);

    if (interested.length === 0) {
      this.logger('info', `No subscribers for event ${eventType}`);
      return [];
    }

    const results: NotificationResult[] = [];

    for (const subscriber of interested) {
      // Rate limit check
      if (!this.rateLimiter.isAllowed(subscriber.id)) {
        this.logger('warn', `Rate limit exceeded for subscriber ${subscriber.id}`, {
          eventType,
          remaining: this.rateLimiter.remaining(subscriber.id),
        });

        results.push({
          subscriberId: subscriber.id,
          channel: ChannelType.IN_APP,
          success: false,
          error: 'Rate limit exceeded (max 10 notifications/minute)',
          attemptedAt: new Date().toISOString(),
        });
        continue;
      }

      // Dispatch to each configured channel
      for (const channel of subscriber.channels) {
        const result = await this.dispatchToChannel(
          subscriber,
          channel,
          payload
        );
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Dispatch a notification to a single channel.
   */
  private async dispatchToChannel(
    subscriber: Subscriber,
    channel: ChannelConfig,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    const attemptedAt = new Date().toISOString();

    try {
      switch (channel.type) {
        case ChannelType.EMAIL:
          await this.sendEmail(subscriber, channel, payload);
          break;

        case ChannelType.WEBHOOK:
          await this.sendWebhook(channel, payload);
          break;

        case ChannelType.IN_APP:
          this.storeInApp(subscriber, channel, payload);
          break;

        default: {
          const _exhaustive: never = channel.type;
          throw new Error(`Unknown channel type: ${_exhaustive}`);
        }
      }

      this.logger('info', `Notification delivered`, {
        subscriberId: subscriber.id,
        channel: channel.type,
        eventType: payload.eventType,
      });

      return {
        subscriberId: subscriber.id,
        channel: channel.type,
        success: true,
        attemptedAt,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger('error', `Notification delivery failed`, {
        subscriberId: subscriber.id,
        channel: channel.type,
        eventType: payload.eventType,
        error: errorMessage,
      });

      return {
        subscriberId: subscriber.id,
        channel: channel.type,
        success: false,
        error: errorMessage,
        attemptedAt,
      };
    }
  }

  // ────────────────────────────────────────────────────────────
  // Email Channel
  // ────────────────────────────────────────────────────────────

  private async sendEmail(
    subscriber: Subscriber,
    channel: ChannelConfig,
    payload: NotificationPayload
  ): Promise<void> {
    if (!this.emailTransport) {
      throw new Error('Email transport not configured');
    }

    if (!channel.email) {
      throw new Error('Email channel config missing');
    }

    const template = this.templates[payload.eventType];
    const subject = renderTemplate(template.subject, payload.data);
    const text = renderTemplate(template.body, payload.data);
    const html = template.htmlBody
      ? renderTemplate(template.htmlBody, payload.data)
      : undefined;

    await this.emailTransport.send({
      to: channel.email.auth.user, // subscriber's email
      from: channel.email.from,
      subject,
      text,
      html,
    });
  }

  // ────────────────────────────────────────────────────────────
  // Webhook Channel
  // ────────────────────────────────────────────────────────────

  private async sendWebhook(
    channel: ChannelConfig,
    payload: NotificationPayload
  ): Promise<void> {
    if (!this.httpClient) {
      throw new Error('HTTP client not configured');
    }

    const webhookConfig = channel.webhook;
    if (!webhookConfig) {
      throw new Error('Webhook channel config missing');
    }

    const body = JSON.stringify(payload);
    const timeoutMs = webhookConfig.timeoutMs ?? 5_000;
    const retries = webhookConfig.retries ?? 3;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-PrivacyLayer-Event': payload.eventType,
      'X-PrivacyLayer-Timestamp': payload.timestamp,
      ...(webhookConfig.headers ?? {}),
    };

    // HMAC signature if secret is configured
    if (webhookConfig.secret) {
      const signature = await computeHmacSha256(webhookConfig.secret, body);
      headers['X-PrivacyLayer-Signature'] = `sha256=${signature}`;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.httpClient.post(
          webhookConfig.url,
          body,
          { headers, timeoutMs }
        );

        if (response.status >= 200 && response.status < 300) {
          return; // Success
        }

        lastError = new Error(
          `Webhook returned status ${response.status}: ${response.body}`
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      // Exponential backoff before retry
      if (attempt < retries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10_000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError ?? new Error('Webhook delivery failed');
  }

  // ────────────────────────────────────────────────────────────
  // In-App Channel
  // ────────────────────────────────────────────────────────────

  private storeInApp(
    subscriber: Subscriber,
    channel: ChannelConfig,
    payload: NotificationPayload
  ): void {
    const maxRetained = channel.inApp?.maxRetained ?? 100;

    const notification: StoredNotification = {
      id: `${subscriber.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subscriberId: subscriber.id,
      eventType: payload.eventType,
      payload,
      read: false,
      createdAt: new Date().toISOString(),
    };

    let store = this.inAppStore.get(subscriber.id);
    if (!store) {
      store = [];
      this.inAppStore.set(subscriber.id, store);
    }

    store.push(notification);

    // Evict oldest if over limit
    while (store.length > maxRetained) {
      store.shift();
    }
  }

  /**
   * Retrieve in-app notifications for a subscriber.
   * @param unreadOnly If true, only return unread notifications.
   */
  getInAppNotifications(
    subscriberId: string,
    unreadOnly: boolean = false
  ): StoredNotification[] {
    const store = this.inAppStore.get(subscriberId) ?? [];
    if (unreadOnly) {
      return store.filter((n) => !n.read);
    }
    return [...store];
  }

  /**
   * Mark specific in-app notifications as read.
   */
  markAsRead(subscriberId: string, notificationIds: string[]): number {
    const store = this.inAppStore.get(subscriberId);
    if (!store) return 0;

    const idSet = new Set(notificationIds);
    let count = 0;

    for (const notification of store) {
      if (idSet.has(notification.id) && !notification.read) {
        notification.read = true;
        count++;
      }
    }

    return count;
  }

  /**
   * Mark all in-app notifications as read for a subscriber.
   */
  markAllAsRead(subscriberId: string): number {
    const store = this.inAppStore.get(subscriberId);
    if (!store) return 0;

    let count = 0;
    for (const notification of store) {
      if (!notification.read) {
        notification.read = true;
        count++;
      }
    }

    return count;
  }

  // ────────────────────────────────────────────────────────────
  // Rate Limit Inspection
  // ────────────────────────────────────────────────────────────

  /**
   * Check how many notifications a subscriber can still send in the current window.
   */
  getRateLimitRemaining(subscriberId: string): number {
    return this.rateLimiter.remaining(subscriberId);
  }

  /**
   * Reset rate limit counters for a subscriber.
   */
  resetRateLimit(subscriberId?: string): void {
    this.rateLimiter.reset(subscriberId);
  }

  // ────────────────────────────────────────────────────────────
  // Template Management
  // ────────────────────────────────────────────────────────────

  /**
   * Get the current template for an event type.
   */
  getTemplate(eventType: EventType): NotificationTemplate {
    return this.templates[eventType];
  }

  /**
   * Override the template for a specific event type.
   */
  setTemplate(eventType: EventType, template: NotificationTemplate): void {
    this.templates[eventType] = template;
    this.logger('info', `Template updated for event: ${eventType}`);
  }

  // ────────────────────────────────────────────────────────────
  // Convenience Methods — Privacy Pool Events
  // ────────────────────────────────────────────────────────────

  /**
   * Notify subscribers that a deposit has been confirmed on-chain.
   */
  async notifyDepositConfirmed(data: {
    commitment: string;
    leafIndex: number;
    root: string;
  }): Promise<NotificationResult[]> {
    return this.notify(EventType.DEPOSIT_CONFIRMED, data);
  }

  /**
   * Notify subscribers that a withdrawal is ready to claim.
   */
  async notifyWithdrawalReady(data: {
    nullifierHash: string;
    recipient: string;
    amount: string;
    fee: string;
    relayer?: string;
  }): Promise<NotificationResult[]> {
    return this.notify(EventType.WITHDRAWAL_READY, data);
  }

  /**
   * Notify subscribers that a ZK proof was generated.
   */
  async notifyProofGenerated(data: {
    proofId: string;
    circuit: string;
    generationTimeMs: number;
  }): Promise<NotificationResult[]> {
    return this.notify(EventType.PROOF_GENERATED, data);
  }

  /**
   * Notify subscribers that the pool was paused.
   */
  async notifyPoolPaused(data: {
    admin: string;
  }): Promise<NotificationResult[]> {
    return this.notify(EventType.POOL_PAUSED, data);
  }

  /**
   * Notify subscribers that the pool was unpaused.
   */
  async notifyPoolUnpaused(data: {
    admin: string;
  }): Promise<NotificationResult[]> {
    return this.notify(EventType.POOL_UNPAUSED, data);
  }

  /**
   * Notify subscribers that the verifying key was updated.
   */
  async notifyVkUpdated(data: {
    admin: string;
  }): Promise<NotificationResult[]> {
    return this.notify(EventType.VK_UPDATED, data);
  }
}

// ──────────────────────────────────────────────────────────────
// Default export
// ──────────────────────────────────────────────────────────────

export default NotificationService;
