/**
 * Network configurations and protocol constants.
 * @module @privacylayer/sdk/constants
 */

import { NetworkConfig } from "./types";

/** Pre-configured Stellar network settings */
export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "", // To be filled after deployment
  },
  mainnet: {
    rpcUrl: "https://soroban-mainnet.stellar.org",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    contractId: "", // To be filled after deployment
  },
};

/** Depth of the Merkle tree used in the commitment contract */
export const MERKLE_TREE_DEPTH = 20;

/** BN254 scalar field size */
export const FIELD_SIZE = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617",
);

/** Zero value for Merkle tree empty nodes */
export const ZERO_VALUE =
  "21663839004416932945382355908790599225266501822907911457504978515578255421292";

/** SDK version */
export const SDK_VERSION = "0.1.0";
