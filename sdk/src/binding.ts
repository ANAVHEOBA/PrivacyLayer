import { createHash } from 'crypto';
import { StrKey } from '@stellar/stellar-base';
import { FIELD_MODULUS } from './zk_constants';

/**
 * Address Binding Strategy (ZK-072)
 * 
 * Implements a verifiable binding between a withdrawal recipient and the nullifier
 * to prevent MITM and front-running attacks in the relayer network.
 * 
 * Binding = Hash(nullifier_hash || recipient_address)
 */
export function computeAddressBinding(nullifierHash: string, recipientAddress: string): string {
    if (!StrKey.isValidEd25519PublicKey(recipientAddress)) {
        throw new Error(`Invalid Stellar address: ${recipientAddress}`);
    }
    
    const cleanNullifier = nullifierHash.startsWith('0x') ? nullifierHash.slice(2) : nullifierHash;
    
    const input = Buffer.concat([
        Buffer.from(cleanNullifier.padStart(64, '0'), 'hex'),
        Buffer.from(recipientAddress, 'utf8')
    ]);
    
    const digest = createHash('sha256').update(input).digest();
    // Reduce modulo the BN254 field prime to ensure it's a valid circuit input
    const fieldVal = BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS;
    
    return fieldVal.toString(16).padStart(64, '0');
}
