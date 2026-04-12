// ============================================================
// PrivacyLayer SDK — Notification Service Tests
// ============================================================

import {
  NotificationService,
  EventType,
  ChannelType,
  type Subscriber,
  type HttpClient,
  type EmailTransport,
} from './notification-service';

// ──────────────────────────────────────────────────────────────
// Test Helpers
// ──────────────────────────────────────────────────────────────

function createMockHttpClient(): HttpClient & { calls: Array<{ url: string; body: string }> } {
  const calls: Array<{ url: string; body: string }> = [];
  return {
    calls,
    async post(url, body, _options) {
      calls.push({ url, body });
      return { status: 200, body: 'OK' };
    },
  };
}

function createMockEmailTransport(): EmailTransport & { calls: Array<{ to: string; subject: string }> } {
  const calls: Array<{ to: string; subject: string }> = [];
  return {
    calls,
    async send(options) {
      calls.push({ to: options.to, subject: options.subject });
    },
  };
}

function createService(overrides: Parameters<typeof NotificationService['prototype']['constructor']>[0] = {}) {
  return new NotificationService({
    logger: () => {}, // suppress logs in tests
    ...overrides,
  });
}

function makeSubscriber(
  id: string,
  channels: Subscriber['channels'] = [{ type: ChannelType.IN_APP }],
  events: EventType[] = [EventType.DEPOSIT_CONFIRMED]
): Omit<Subscriber, 'createdAt'> {
  return {
    id,
    name: `Test Subscriber ${id}`,
    channels,
    events,
    enabled: true,
  };
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe('NotificationService', () => {
  // ── Subscriber Management ──────────────────────────────────

  describe('subscriber management', () => {
    it('should add a subscriber', () => {
      const svc = createService();
      const sub = svc.addSubscriber(makeSubscriber('s1'));

      expect(sub.id).toBe('s1');
      expect(sub.createdAt).toBeDefined();
      expect(svc.getSubscriber('s1')).toEqual(sub);
    });

    it('should reject duplicate subscriber IDs', () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1'));

      expect(() => svc.addSubscriber(makeSubscriber('s1'))).toThrow(
        'already exists'
      );
    });

    it('should remove a subscriber', () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1'));

      expect(svc.removeSubscriber('s1')).toBe(true);
      expect(svc.getSubscriber('s1')).toBeUndefined();
    });

    it('should return false when removing non-existent subscriber', () => {
      const svc = createService();
      expect(svc.removeSubscriber('ghost')).toBe(false);
    });

    it('should list all subscribers', () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1'));
      svc.addSubscriber(
        makeSubscriber('s2', [{ type: ChannelType.IN_APP }], [
          EventType.WITHDRAWAL_READY,
        ])
      );

      expect(svc.listSubscribers()).toHaveLength(2);
    });

    it('should filter subscribers by event type', () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1', [{ type: ChannelType.IN_APP }], [EventType.DEPOSIT_CONFIRMED]));
      svc.addSubscriber(makeSubscriber('s2', [{ type: ChannelType.IN_APP }], [EventType.WITHDRAWAL_READY]));

      const filtered = svc.listSubscribers(EventType.DEPOSIT_CONFIRMED);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('s1');
    });

    it('should update subscriber preferences', () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1'));

      const updated = svc.updateSubscriber('s1', { enabled: false });
      expect(updated.enabled).toBe(false);
    });

    it('should throw when updating non-existent subscriber', () => {
      const svc = createService();
      expect(() => svc.updateSubscriber('ghost', { enabled: false })).toThrow(
        'not found'
      );
    });
  });

  // ── In-App Notifications ──────────────────────────────────

  describe('in-app notifications', () => {
    it('should store in-app notifications', async () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1'));

      await svc.notifyDepositConfirmed({
        commitment: '0xabc',
        leafIndex: 0,
        root: '0xdef',
      });

      const notifications = svc.getInAppNotifications('s1');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].eventType).toBe(EventType.DEPOSIT_CONFIRMED);
      expect(notifications[0].read).toBe(false);
    });

    it('should mark notifications as read', async () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1'));

      await svc.notifyDepositConfirmed({
        commitment: '0xabc',
        leafIndex: 0,
        root: '0xdef',
      });

      const notifications = svc.getInAppNotifications('s1');
      const count = svc.markAsRead('s1', [notifications[0].id]);
      expect(count).toBe(1);

      const unread = svc.getInAppNotifications('s1', true);
      expect(unread).toHaveLength(0);
    });

    it('should mark all as read', async () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1'));

      await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: 'a', leafIndex: 0, root: 'r' });
      await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: 'b', leafIndex: 1, root: 'r' });

      const count = svc.markAllAsRead('s1');
      expect(count).toBe(2);
      expect(svc.getInAppNotifications('s1', true)).toHaveLength(0);
    });

    it('should evict old notifications when maxRetained exceeded', async () => {
      const svc = createService();
      svc.addSubscriber(
        makeSubscriber('s1', [{ type: ChannelType.IN_APP, inApp: { maxRetained: 2 } }])
      );

      await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: '1', leafIndex: 0, root: 'r' });
      await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: '2', leafIndex: 1, root: 'r' });
      await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: '3', leafIndex: 2, root: 'r' });

      const notifications = svc.getInAppNotifications('s1');
      expect(notifications).toHaveLength(2);
      expect(notifications[0].payload.data.commitment).toBe('2');
    });
  });

  // ── Webhook Notifications ─────────────────────────────────

  describe('webhook notifications', () => {
    it('should POST to webhook URL', async () => {
      const httpClient = createMockHttpClient();
      const svc = createService({ httpClient });

      svc.addSubscriber(
        makeSubscriber(
          's1',
          [{ type: ChannelType.WEBHOOK, webhook: { url: 'https://example.com/hook', retries: 0 } }],
          [EventType.DEPOSIT_CONFIRMED]
        )
      );

      const results = await svc.notifyDepositConfirmed({
        commitment: '0xabc',
        leafIndex: 0,
        root: '0xdef',
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(httpClient.calls).toHaveLength(1);
      expect(httpClient.calls[0].url).toBe('https://example.com/hook');

      const body = JSON.parse(httpClient.calls[0].body);
      expect(body.eventType).toBe(EventType.DEPOSIT_CONFIRMED);
    });

    it('should fail gracefully when webhook returns error status', async () => {
      const httpClient: HttpClient = {
        async post() {
          return { status: 500, body: 'Internal Server Error' };
        },
      };
      const svc = createService({ httpClient });

      svc.addSubscriber(
        makeSubscriber(
          's1',
          [{ type: ChannelType.WEBHOOK, webhook: { url: 'https://example.com/hook', retries: 0 } }],
          [EventType.DEPOSIT_CONFIRMED]
        )
      );

      const results = await svc.notifyDepositConfirmed({
        commitment: '0xabc',
        leafIndex: 0,
        root: '0xdef',
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('500');
    });
  });

  // ── Email Notifications ───────────────────────────────────

  describe('email notifications', () => {
    it('should send email via transport', async () => {
      const emailTransport = createMockEmailTransport();
      const svc = createService({ emailTransport });

      svc.addSubscriber(
        makeSubscriber(
          's1',
          [{
            type: ChannelType.EMAIL,
            email: {
              host: 'smtp.test.com',
              port: 587,
              secure: true,
              auth: { user: 'user@test.com', pass: 'pass' },
              from: 'noreply@privacylayer.io',
            },
          }],
          [EventType.DEPOSIT_CONFIRMED]
        )
      );

      const results = await svc.notifyDepositConfirmed({
        commitment: '0xabc',
        leafIndex: 0,
        root: '0xdef',
      });

      expect(results[0].success).toBe(true);
      expect(emailTransport.calls).toHaveLength(1);
      expect(emailTransport.calls[0].subject).toContain('Deposit Confirmed');
    });

    it('should fail when email transport not configured', async () => {
      const svc = createService(); // no emailTransport

      svc.addSubscriber(
        makeSubscriber(
          's1',
          [{
            type: ChannelType.EMAIL,
            email: {
              host: 'smtp.test.com',
              port: 587,
              secure: true,
              auth: { user: 'user@test.com', pass: 'pass' },
              from: 'noreply@privacylayer.io',
            },
          }],
          [EventType.DEPOSIT_CONFIRMED]
        )
      );

      const results = await svc.notifyDepositConfirmed({
        commitment: '0xabc',
        leafIndex: 0,
        root: '0xdef',
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Email transport not configured');
    });
  });

  // ── Rate Limiting ─────────────────────────────────────────

  describe('rate limiting', () => {
    it('should enforce max 10 notifications per minute', async () => {
      const svc = createService({ rateLimitMax: 3 });
      svc.addSubscriber(makeSubscriber('s1'));

      // First 3 should succeed
      for (let i = 0; i < 3; i++) {
        const results = await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: `c${i}`, leafIndex: i, root: 'r' });
        expect(results[0].success).toBe(true);
      }

      // 4th should be rate limited
      const results = await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: 'c3', leafIndex: 3, root: 'r' });
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Rate limit');
    });

    it('should report remaining quota', () => {
      const svc = createService({ rateLimitMax: 10 });
      svc.addSubscriber(makeSubscriber('s1'));

      expect(svc.getRateLimitRemaining('s1')).toBe(10);
    });

    it('should reset rate limit', async () => {
      const svc = createService({ rateLimitMax: 1 });
      svc.addSubscriber(makeSubscriber('s1'));

      await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: 'c', leafIndex: 0, root: 'r' });
      svc.resetRateLimit('s1');

      const results = await svc.notify(EventType.DEPOSIT_CONFIRMED, { commitment: 'c2', leafIndex: 1, root: 'r' });
      expect(results[0].success).toBe(true);
    });
  });

  // ── Template Management ───────────────────────────────────

  describe('templates', () => {
    it('should have default templates for all event types', () => {
      const svc = createService();

      for (const eventType of Object.values(EventType)) {
        const template = svc.getTemplate(eventType);
        expect(template).toBeDefined();
        expect(template.subject).toBeTruthy();
        expect(template.body).toBeTruthy();
      }
    });

    it('should allow custom templates', () => {
      const svc = createService();

      svc.setTemplate(EventType.DEPOSIT_CONFIRMED, {
        subject: 'Custom: {{commitment}}',
        body: 'Custom body for {{commitment}}',
      });

      const template = svc.getTemplate(EventType.DEPOSIT_CONFIRMED);
      expect(template.subject).toBe('Custom: {{commitment}}');
    });
  });

  // ── Convenience Methods ───────────────────────────────────

  describe('convenience methods', () => {
    it('should handle notifyWithdrawalReady', async () => {
      const svc = createService();
      svc.addSubscriber(
        makeSubscriber('s1', [{ type: ChannelType.IN_APP }], [EventType.WITHDRAWAL_READY])
      );

      const results = await svc.notifyWithdrawalReady({
        nullifierHash: '0x123',
        recipient: 'GABCD...',
        amount: '100',
        fee: '1',
      });

      expect(results[0].success).toBe(true);
    });

    it('should handle notifyProofGenerated', async () => {
      const svc = createService();
      svc.addSubscriber(
        makeSubscriber('s1', [{ type: ChannelType.IN_APP }], [EventType.PROOF_GENERATED])
      );

      const results = await svc.notifyProofGenerated({
        proofId: 'proof-001',
        circuit: 'withdraw',
        generationTimeMs: 1500,
      });

      expect(results[0].success).toBe(true);
    });

    it('should handle notifyPoolPaused', async () => {
      const svc = createService();
      svc.addSubscriber(
        makeSubscriber('s1', [{ type: ChannelType.IN_APP }], [EventType.POOL_PAUSED])
      );

      const results = await svc.notifyPoolPaused({ admin: 'GABCD...' });
      expect(results[0].success).toBe(true);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────

  describe('edge cases', () => {
    it('should return empty results when no subscribers match', async () => {
      const svc = createService();
      const results = await svc.notify(EventType.DEPOSIT_CONFIRMED, {});
      expect(results).toHaveLength(0);
    });

    it('should skip disabled subscribers', async () => {
      const svc = createService();
      svc.addSubscriber(makeSubscriber('s1'));
      svc.updateSubscriber('s1', { enabled: false });

      const results = await svc.notifyDepositConfirmed({
        commitment: '0xabc',
        leafIndex: 0,
        root: '0xdef',
      });

      expect(results).toHaveLength(0);
    });

    it('should handle multiple channels per subscriber', async () => {
      const httpClient = createMockHttpClient();
      const svc = createService({ httpClient });

      svc.addSubscriber(
        makeSubscriber(
          's1',
          [
            { type: ChannelType.IN_APP },
            { type: ChannelType.WEBHOOK, webhook: { url: 'https://example.com/hook', retries: 0 } },
          ],
          [EventType.DEPOSIT_CONFIRMED]
        )
      );

      const results = await svc.notifyDepositConfirmed({
        commitment: '0xabc',
        leafIndex: 0,
        root: '0xdef',
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });
});
