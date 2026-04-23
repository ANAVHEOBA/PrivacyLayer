# Privacy-Preserving Analytics

This project implements analytics with an aggregate-only model:

- No cookies
- No user tracking
- No IP logging
- No wallet-address indexing for analytics
- Local-first performance reporting

## Contract Metrics

The privacy pool contract now exposes aggregate analytics through `analytics_snapshot()`:

- `page_views` (reported via `record_page_view`)
- `deposit_count` (on-chain aggregate)
- `withdrawal_count` (on-chain aggregate)
- `error_count` (reported via `record_error`)
- `error_rate_bps` (error ratio in basis points)
- `avg_page_load_ms`, `avg_deposit_ms`, `avg_withdraw_ms`
- `hourly_trend` (bounded hourly history ring buffer)

## Privacy Properties

- Analytics stores only counts and aggregate durations.
- No per-user IDs, addresses, cookies, or IP metadata are captured.
- Historical data is stored in fixed-size hourly buckets, not per-event logs.

## Dashboard

Public dashboard file: `docs/public-stats-dashboard.html`

It expects `docs/analytics-snapshot.json` with the same shape as the contract `analytics_snapshot` output and auto-refreshes every 5 seconds.

## GDPR Notes

Because analytics data is aggregate-only and excludes identifiable personal data by design, this implementation is aligned with GDPR data-minimization and privacy-by-design principles. Before production deployment, complete legal review and update your privacy notice with the exact analytics fields retained and retention windows.
