// ============================================================
// PrivacyLayer — Metrics Exporters
// ============================================================
// Export metrics to various backends (Prometheus, Datadog, etc.)
// ============================================================

use super::types::*;

/// Metrics exporter trait
pub trait MetricsExporter {
    fn export(&self, metrics: &[Metric]) -> Result<(), String>;
}

/// Prometheus exporter configuration
#[derive(Clone, Debug)]
pub struct PrometheusConfig {
    pub endpoint: String,
    pub namespace: String,
    pub subsystem: String,
}

impl Default for PrometheusConfig {
    fn default() -> Self {
        Self {
            endpoint: "http://localhost:9090".to_string(),
            namespace: "privacypool".to_string(),
            subsystem: "contract".to_string(),
        }
    }
}

/// Prometheus metrics format exporter
pub struct PrometheusExporter {
    config: PrometheusConfig,
}

impl PrometheusExporter {
    pub fn new(config: PrometheusConfig) -> Self {
        Self { config }
    }
    
    /// Format metrics in Prometheus exposition format
    pub fn format_prometheus(metrics: &[Metric]) -> String {
        let mut output = String::new();
        
        for metric in metrics {
            let labels_str = metric.labels
                .iter()
                .map(|(k, v)| format!("{}=\"{}\"", k, v))
                .collect::<Vec<_>>()
                .join(",");
            
            let value_str = match &metric.value {
                MetricValue::Counter(v) => v.to_string(),
                MetricValue::Gauge(v) => v.to_string(),
                MetricValue::Histogram(v) => v.to_string(),
            };
            
            if labels_str.is_empty() {
                output.push_str(&format!("{} {}\n", metric.name, value_str));
            } else {
                output.push_str(&format!("{}{{{}}} {}\n", metric.name, labels_str, value_str));
            }
        }
        
        output
    }
    
    /// Generate OpenMetrics format with HELP and TYPE annotations
    pub fn format_openmetrics(metrics: &[Metric]) -> String {
        let mut output = String::new();
        let mut seen_names = std::collections::HashSet::new();
        
        // Add TYPE and HELP for each unique metric
        for metric in metrics {
            if seen_names.insert(metric.name) {
                let metric_type = match &metric.value {
                    MetricValue::Counter(_) => "counter",
                    MetricValue::Gauge(_) => "gauge",
                    MetricValue::Histogram(_) => "histogram",
                };
                
                output.push_str(&format!("# TYPE {} {}\n", metric.name, metric_type));
                output.push_str(&format!("# HELP {} PrivacyLayer metric\n", metric.name));
            }
        }
        
        // Add metric values
        output.push_str(&Self::format_prometheus(metrics));
        output.push_str("# EOF\n");
        
        output
    }
}

/// Datadog exporter configuration
#[derive(Clone, Debug)]
pub struct DatadogConfig {
    pub api_key: String,
    pub app_key: String,
    pub site: String,
    pub env: String,
    pub service: String,
}

impl Default for DatadogConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            app_key: String::new(),
            site: "api.datadoghq.com".to_string(),
            env: "production".to_string(),
            service: "privacypool".to_string(),
        }
    }
}

/// Datadog metrics exporter
pub struct DatadogExporter {
    config: DatadogConfig,
}

impl DatadogExporter {
    pub fn new(config: DatadogConfig) -> Self {
        Self { config }
    }
    
    /// Format metrics for Datadog API
    pub fn format_datadog_series(metrics: &[Metric], config: &DatadogConfig) -> String {
        // Returns JSON format for Datadog API
        let series: Vec<serde_json::Value> = metrics
            .iter()
            .map(|m| {
                let mut tags = vec![
                    format!("env:{}", config.env),
                    format!("service:{}", config.service),
                ];
                
                for (k, v) in &m.labels {
                    tags.push(format!("{}:{}", k, v));
                }
                
                let value = match &m.value {
                    MetricValue::Counter(v) => *v as f64,
                    MetricValue::Gauge(v) => *v,
                    MetricValue::Histogram(v) => *v,
                };
                
                serde_json::json!({
                    "metric": m.name,
                    "points": [[m.timestamp, value]],
                    "tags": tags,
                })
            })
            .collect();
        
        serde_json::json!({ "series": series }).to_string()
    }
}

/// New Relic exporter configuration
#[derive(Clone, Debug)]
pub struct NewRelicConfig {
    pub api_key: String,
    pub account_id: String,
    pub region: String,
    pub service_name: String,
}

impl Default for NewRelicConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            account_id: String::new(),
            region: "US".to_string(),
            service_name: "privacypool".to_string(),
        }
    }
}

/// New Relic metrics exporter
pub struct NewRelicExporter {
    config: NewRelicConfig,
}

impl NewRelicExporter {
    pub fn new(config: NewRelicConfig) -> Self {
        Self { config }
    }
    
    /// Format metrics for New Relic Metric API
    pub fn format_newrelic_metrics(metrics: &[Metric], config: &NewRelicConfig) -> String {
        let nr_metrics: Vec<serde_json::Value> = metrics
            .iter()
            .map(|m| {
                let mut attributes = serde_json::Map::new();
                attributes.insert("service.name".to_string(), config.service_name.clone().into());
                
                for (k, v) in &m.labels {
                    attributes.insert(k.to_string(), v.clone().into());
                }
                
                let (value, metric_type) = match &m.value {
                    MetricValue::Counter(v) => (*v as f64, "count"),
                    MetricValue::Gauge(v) => (*v, "gauge"),
                    MetricValue::Histogram(v) => (*v, "summary"),
                };
                
                serde_json::json!({
                    "name": m.name,
                    "type": metric_type,
                    "value": value,
                    "timestamp": m.timestamp,
                    "attributes": attributes,
                })
            })
            .collect();
        
        serde_json::json!({ "metrics": nr_metrics }).to_string()
    }
}