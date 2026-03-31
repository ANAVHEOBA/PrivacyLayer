// contracts/privacy_pool/src/core/admin.rs
use super::storage::{Config, Storage};
use super::crypto::{MerkleTree, Verifier};

pub struct Admin {
    storage: Storage,
    merkle_tree: MerkleTree,
    verifier: Verifier,
}

impl Admin {
    pub fn new(storage: Storage, merkle_tree: MerkleTree, verifier: Verifier) -> Self {
        Admin {
            storage,
            merkle_tree,
            verifier,
        }
    }

    pub fn update_config(&mut self, new_config: Config) -> Result<(), String> {
        self.storage.update_config(new_config)?;
        Ok(())
    }

    pub fn get_config(&self) -> Result<Config, String> {
        self.storage.get_config()
    }
}