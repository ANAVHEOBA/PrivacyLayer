# contracts/privacy_pool/src/lib.rs

# Import necessary modules
use datadog_api::Client;
use datadog_api::models::Metric;
use std::env;

// Function to initialize Datadog client
fn initialize_datadog_client() -> Client {
    // Retrieve Datadog API key from environment variable
    let api_key = env::var("DATADOG_API_KEY").expect("DATADOG_API_KEY must be set");
    Client::new(api_key)
}

// Function to send metric with error handling and input validation
fn send_metric(client: &Client, metric_name: &str, value: f64) {
    // Validate input parameters
    if metric_name.is_empty() {
        eprintln!("Metric name cannot be empty");
        return;
    }

    // Create metric object
    let metric = Metric {
        metric: metric_name.to_string(),
        points: vec![(chrono::Utc::now().timestamp(), value)],
        ..Default::default()
    };

    // Send metric and handle exceptions
    match client.send_metric(&metric) {
        Ok(_) => println!("Metric sent successfully"),
        Err(e) => eprintln!("Failed to send metric: {}", e),
    }
}

// Example usage in main function
fn main() {
    // Initialize Datadog client
    let client = initialize_datadog_client();

    // Send a sample metric
    send_metric(&client, "sample_metric", 123.45);
}