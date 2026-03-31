// contracts/privacy_pool/src/lib.rs

// Add new module for workshop management
mod workshop;

// Import workshop module
use crate::workshop::WorkshopManager;

// Add WorkshopManager to the PrivacyLayer struct
pub struct PrivacyLayer {
    // Existing fields...
    pub workshop_manager: WorkshopManager,
}

// Implement WorkshopManager
mod workshop {
    pub struct WorkshopManager {
        // Fields to manage workshops
        workshops: Vec<Workshop>,
    }

    pub struct Workshop {
        title: String,
        date: String,
        location: String,
        curriculum: Vec<String>,
        materials: Vec<String>,
        recordings: Vec<String>,
    }

    impl WorkshopManager {
        pub fn new() -> Self {
            WorkshopManager {
                workshops: Vec::new(),
            }
        }

        pub fn add_workshop(&mut self, title: String, date: String, location: String, curriculum: Vec<String>, materials: Vec<String>, recordings: Vec<String>) {
            let workshop = Workshop {
                title,
                date,
                location,
                curriculum,
                materials,
                recordings,
            };
            self.workshops.push(workshop);
        }

        pub fn list_workshops(&self) -> Vec<&Workshop> {
            self.workshops.iter().collect()
        }
    }
}

// Update PrivacyLayer initialization
impl PrivacyLayer {
    pub fn new() -> Self {
        PrivacyLayer {
            // Existing initialization...
            workshop_manager: WorkshopManager::new(),
        }
    }
}

// Add tests for WorkshopManager
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_and_list_workshops() {
        let mut manager = WorkshopManager::new();
        manager.add_workshop(
            "Introduction to PrivacyLayer".to_string(),
            "2023-10-01".to_string(),
            "Online".to_string(),
            vec!["Module 1: Overview".to_string(), "Module 2: Setup".to_string()],
            vec!["slides.pdf".to_string(), "setup_guide.md".to_string()],
            vec!["recording.mp4".to_string()],
        );

        let workshops = manager.list_workshops();
        assert_eq!(workshops.len(), 1);
        assert_eq!(workshops[0].title, "Introduction to PrivacyLayer");
    }
}