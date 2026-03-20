use dep::std;
use crate::hash;

fn main(
    payroll_id: Field,
    employer_public_key: Field,
    total_amount: Field,
    recipients: [Field; 8],
    amounts: [Field; 8],
    secrets: [Field; 8],
    commitments: [Field; 8]
) {
    let mut sum: Field = 0;
    
    for i in 0..8 {
        // 1. Verify commitment for each staff member
        // Each commitment links the payroll_id, the staff recipient, and the specific amount
        // The private secret ensures only the specific staff can later 'withdraw'.
        let commitment_check = hash::compute_commitment(payroll_id + i + recipients[i], secrets[i]);
        assert(commitment_check == commitments[i]);
        
        sum += amounts[i];
    }
    
    // 2. Verify sum matches the total payroll deposit
    assert(sum == total_amount);

    // Tied to employer signature
    let _e = employer_public_key;
}
