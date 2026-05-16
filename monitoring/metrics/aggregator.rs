// ============================================================
// PrivacyLayer — Metrics Aggregator
// ============================================================
// Aggregates metrics over time windows for reporting.
// ============================================================

use super::types::*;
use std::collections::HashMap;

/// Time window for aggregation
#[derive(Clone, Debug, Copy)]
pub enum TimeWindow {
    Minute,
    FiveMinutes,
    FifteenMinutes,
    Hour,
    Day,
}

impl TimeWindow {
    pub fn duration_seconds(&self) -> u64 {
        match self {
            TimeWindow::Minute => 60,
            TimeWindow::FiveMinutes => 300,
            TimeWindow::FifteenMinutes => 900,
            TimeWindow::Hour => 3600,
            TimeWindow::Day => 86400,
        }
    }
}

/// Aggregated metric statistics
#[derive(Clone, Debug, Default)]
pub struct MetricStats {
    pub count: u64,
    pub sum: f64,
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub p50: f64,
    pub p95: f64,
    pub p99: f64,
}

impl MetricStats {
    pub fn from_values(values: &[f64]) -> Self {
        if values.is_empty() {
            return Self::default();
        }
        
        let mut sorted = values.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        
        let count = sorted.len() as u64;
        let sum: f64 = sorted.iter().sum();
        let min = sorted[0];
        let max = sorted[sorted.len() - 1];
        let mean = sum / count as f64;
        
        let p50_idx = (count as f64 * 0.50) as usize;
        let p95_idx = (count as f64 * 0.95) as usize;
        let p99_idx = (count as f64 * 0.99) as usize;
        
        Self {
            count,
            sum,
            min,
            max,
            mean,
            p50: sorted.get(p50_idx).copied().unwrap_or(max),
            p95: sorted.get(p95_idx).copied().unwrap_or(max),
            p99: sorted.get(p99_idx).copied().unwrap_or(max),
        }
    }
}

/// Metrics aggregator for time-windowed statistics
pub struct MetricsAggregator {
    window: TimeWindow,
    metrics: HashMap<String, Vec<(u64, f64)>>,
}

impl MetricsAggregator {
    pub fn new(window: TimeWindow) -> Self {
        Self {
            window,
            metrics: HashMap::new(),
        }
    }
    
    /// Add a metric value with timestamp
    pub fn record(&mut self, name: &str, timestamp: u64, value: f64) {
        let entries = self.metrics.entry(name.to_string()).or_default();
        entries.push((timestamp, value));
        
        // Prune old entries
        let cutoff = timestamp.saturating_sub(self.window.duration_seconds());
        entries.retain(|(ts, _)| *ts >= cutoff);
    }
    
    /// Get aggregated statistics for a metric
    pub fn get_stats(&self, name: &str) -> MetricStats {
        let entries = self.metrics.get(name);
        let values: Vec<f64> = entries
            .map(|e| e.iter().map(|(_, v)| *v).collect())
            .unwrap_or_default();
        
        MetricStats::from_values(&values)
    }
    
    /// Get all metric names
    pub fn metric_names(&self) -> Vec<&str> {
        self.metrics.keys().map(|s| s.as_str()).collect()
    }
    
    /// Get rate (per second) for a counter metric
    pub fn get_rate(&self, name: &str, current_time: u64) -> f64 {
        let entries = self.metrics.get(name);
        let window_start = current_time.saturating_sub(self.window.duration_seconds());
        
        let count = entries
            .map(|e| {
                e.iter()
                    .filter(|(ts, _)| *ts >= window_start)
                    .count() as u64
            })
            .unwrap_or(0);
        
        count as f64 / self.window.duration_seconds() as f64
    }
    
    /// Clear all metrics
    pub fn clear(&mut self) {
        self.metrics.clear();
    }
    
    /// Prune old metrics
    pub fn prune(&mut self, current_time: u64) {
        let cutoff = current_time.saturating_sub(self.window.duration_seconds());
        for entries in self.metrics.values_mut() {
            entries.retain(|(ts, _)| *ts >= cutoff);
        }
    }
}

/// Health status derived from metrics
#[derive(Clone, Debug, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

impl HealthStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            HealthStatus::Healthy => "healthy",
            HealthStatus::Degraded => "degraded",
            HealthStatus::Unhealthy => "unhealthy",
        }
    }
}

/// Health check result
#[derive(Clone, Debug)]
pub struct HealthCheck {
    pub name: String,
    pub status: HealthStatus,
    pub message: String,
    pub details: HashMap<String, String>,
}

/// Health checker for monitoring system health
pub struct HealthChecker {
    checks: Vec<Box<dyn Fn(&MetricsAggregator) -> HealthCheck>>,
}

impl HealthChecker {
    pub fn new() -> Self {
        Self { checks: Vec::new() }
    }
    
    /// Add a health check function
    pub fn add_check<F: Fn(&MetricsAggregator) -> HealthCheck + 'static>(&mut self, check: F) {
        self.checks.push(Box::new(check));
    }
    
    /// Run all health checks
    pub fn run_checks(&self, aggregator: &MetricsAggregator) -> Vec<HealthCheck> {
        self.checks.iter().map(|check| check(aggregator)).collect()
    }
    
    /// Get overall health status
    pub fn overall_status(&self, aggregator: &MetricsAggregator) -> HealthStatus {
        let checks = self.run_checks(aggregator);
        
        if checks.iter().any(|c| c.status == HealthStatus::Unhealthy) {
            HealthStatus::Unhealthy
        } else if checks.iter().any(|c| c.status == HealthStatus::Degraded) {
            HealthStatus::Degraded
        } else {
            HealthStatus::Healthy
        }
    }
}

impl Default for HealthChecker {
    fn default() -> Self {
        Self::new()
    }
}