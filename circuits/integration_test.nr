use dep::commitment;
use dep::merkle;
use dep::withdraw;
use dep::escrow;
use dep::payroll;
use dep::multisig;
use dep::lib::hash;

#[test]
fn integration_standard_flow() {
    let n1: Field = 111;
    let s1: Field = 222;
    let c1 = hash::compute_commitment(n1, s1);

    let n2: Field = 333;
    let s2: Field = 444;
    let c2 = hash::compute_commitment(n2, s2);

    let path1: [Field; 20] = [0; 20];
    let path2: [Field; 20] = [0; 20];

    let global_root = merkle::compute_merkle_root(c1, 0, path1);
    let nh1 = hash::compute_nullifier_hash(n1, global_root);
    let nh2 = hash::compute_nullifier_hash(n2, global_root);

    dep::withdraw::main(n1, s1, 0, path1, global_root, nh1, 0xABCD, 1_000, 0, 0);
    dep::withdraw::main(n2, s2, 1, path2, global_root, nh2, 0xEF01, 1_000, 0, 0);
}

#[test]
fn integration_escrow_release_flow() {
    let nullifier: Field = 0xAAAAAAAA;
    let secret: Field = 0xBBBBBBBB;
    let arbiter_secret: Field = 0xCCCCCCCC;
    let arbiter_hash = std::hash::pedersen_hash([arbiter_secret]);

    let commitment = hash::compute_escrow_commitment(nullifier, secret, arbiter_hash);
    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_merkle_root(commitment, 5, hash_path);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    dep::escrow::main(
        nullifier, secret, 5, hash_path, root, nullifier_hash,
        0xRECP, 5_000, 0xRELY, 50, arbiter_secret, arbiter_hash
    );
}

#[test]
fn integration_payroll_batch_flow() {
    let payroll_id: Field = 1;
    let employer: Field = 0xEEEE;
    let total: Field = 800;
    
    let mut recipients: [Field; 8] = [0; 8];
    let mut amounts: [Field; 8] = [100; 8];
    let mut secrets: [Field; 8] = [123; 8];
    let mut commitments: [Field; 8] = [0; 8];
    
    for i in 0..8 {
        recipients[i] = i + 100;
        commitments[i] = hash::compute_commitment(payroll_id + i + recipients[i], secrets[i]);
    }
    
    dep::payroll::main(payroll_id, employer, total, recipients, amounts, secrets, commitments);
}

#[test]
fn integration_multisig_2_of_3_flow() {
    let nullifier: Field = 0xCCCC;
    let secret: Field = 0xDDDD;
    let pk1 = std::hash::pedersen_hash([0x111]);
    let pk2 = std::hash::pedersen_hash([0x222]);
    let pk3 = std::hash::pedersen_hash([0x333]);

    let commitment = hash::compute_multisig_commitment(nullifier, secret, pk1, pk2, pk3);
    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_merkle_root(commitment, 7, hash_path);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // Provide secrets for 1 and 3 (Threshold met)
    dep::multisig::main(
        nullifier, secret, 7, hash_path, root, nullifier_hash,
        pk1, pk2, pk3,
        0x111, 0, 0x333,
        true, false, true
    );
}
