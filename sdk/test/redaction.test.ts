/**
 * Tests for redaction helpers (ZK-111).
 *
 * Ensures that sensitive ZK data (notes, witnesses, proofs, backups)
 * can be logged without leaking secrets or privacy-critical material.
 */

import {
  redactNote,
  redactNoteToString,
  redactBackup,
  redactPreparedWitness,
  redactPreparedWitnessToString,
  redactWithdrawalWitness,
  redactWithdrawalWitnessToString,
  redactProof,
  redactProofToString,
  redactProofBytes,
  redactFields,
} from '../src/redaction';
import { Note } from '../src/note';

describe('ZK-111: Redaction helpers', () => {
  const TEST_POOL_ID = '0000000000000000000000000000000000000000000000000000000000000001';

  describe('Note redaction', () => {
    it('should redact nullifier and secret from note', () => {
      const note = Note.deriveDeterministic('test-seed', TEST_POOL_ID, 100n, 100n);
      const redacted = redactNote(note);

      expect(redacted.poolId).toBe(TEST_POOL_ID);
      expect(redacted.amount).toBe('100');
      expect(redacted.denomination).toBe('100');
      expect(redacted.nullifier).toBe('[REDACTED]');
      expect(redacted.secret).toBe('[REDACTED]');
    });

    it('should not contain raw nullifier or secret in stringified output', () => {
      const note = Note.deriveDeterministic('test-seed', TEST_POOL_ID, 100n, 100n);
      const output = redactNoteToString(note);

      expect(output).not.toContain(note.nullifier.toString('hex'));
      expect(output).not.toContain(note.secret.toString('hex'));
      expect(output).toContain('[REDACTED]');
    });

    it('should show partial commitment preview', () => {
      const note = Note.deriveDeterministic('test-seed', TEST_POOL_ID, 100n, 100n);
      const redacted = redactNote(note);
      const commitmentHex = note.getCommitment().toString('hex');

      expect(redacted.commitmentPreview).toContain(commitmentHex.slice(0, 6));
      expect(redacted.commitmentPreview).toContain('[REDACTED]');
    });
  });

  describe('Backup redaction', () => {
    it('should redact full backup string', () => {
      const note = Note.deriveDeterministic('test-seed', TEST_POOL_ID, 100n, 100n);
      const backup = note.exportBackup();
      const redacted = redactBackup(backup);

      expect(redacted).not.toContain(backup.slice(20));
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).toContain(`${backup.length} chars`);
    });

    it('should show prefix for format validation', () => {
      const note = Note.deriveDeterministic('test-seed', TEST_POOL_ID, 100n, 100n);
      const backup = note.exportBackup();
      const redacted = redactBackup(backup);

      expect(redacted).toContain(backup.slice(0, 20));
    });

    it('should handle short backup strings', () => {
      const short = 'privacylayer-note:abc';
      const redacted = redactBackup(short);

      expect(redacted).toBe('[REDACTED]');
    });
  });

  describe('PreparedWitness redaction', () => {
    const mockWitness = {
      nullifier: '0000000000000000000000000000000000000000000000000000000000000001',
      secret: '0000000000000000000000000000000000000000000000000000000000000002',
      leaf_index: '000000000000000000000000000000000000000000000000000000000000000a',
      hash_path: Array(20).fill('0000000000000000000000000000000000000000000000000000000000000003'),
      pool_id: '0000000000000000000000000000000000000000000000000000000000000001',
      root: '0000000000000000000000000000000000000000000000000000000000000004',
      nullifier_hash: '0000000000000000000000000000000000000000000000000000000000000005',
      recipient: '0000000000000000000000000000000000000000000000000000000000000006',
      amount: '0000000000000000000000000000000000000000000000000000000000000064',
      relayer: '0000000000000000000000000000000000000000000000000000000000000000',
      fee: '0000000000000000000000000000000000000000000000000000000000000000',
      denomination: '0000000000000000000000000000000000000000000000000000000000000064',
    };

    it('should redact private witness fields', () => {
      const redacted = redactPreparedWitness(mockWitness);

      expect(redacted.nullifier).toBe('[REDACTED]');
      expect(redacted.secret).toBe('[REDACTED]');
      expect(redacted.hash_path).toContain('[REDACTED]');
    });

    it('should show truncated public fields for debugging', () => {
      const redacted = redactPreparedWitness(mockWitness);

      expect(redacted.pool_id).toContain('000000');
      expect(redacted.pool_id).toContain('...');
      expect(redacted.pool_id).toContain('[REDACTED]');
    });

    it('should not contain full nullifier or secret in output', () => {
      const output = redactPreparedWitnessToString(mockWitness);

      expect(output).not.toContain(mockWitness.nullifier);
      expect(output).not.toContain(mockWitness.secret);
    });

    it('should preserve amount and fee values', () => {
      const redacted = redactPreparedWitness(mockWitness);

      expect(redacted.amount).toBe(mockWitness.amount);
      expect(redacted.fee).toBe(mockWitness.fee);
    });
  });

  describe('WithdrawalWitness redaction', () => {
    const mockLegacyWitness = {
      root: '0000000000000000000000000000000000000000000000000000000000000001',
      nullifier_hash: '0000000000000000000000000000000000000000000000000000000000000002',
      recipient: '0000000000000000000000000000000000000000000000000000000000000003',
      amount: '100',
      relayer: '0000000000000000000000000000000000000000000000000000000000000000',
      fee: '0',
      pool_id: '0000000000000000000000000000000000000000000000000000000000000004',
      nullifier: '0000000000000000000000000000000000000000000000000000000000000005',
      secret: '0000000000000000000000000000000000000000000000000000000000000006',
      leaf_index: '10',
      path_elements: Array(20).fill('0000000000000000000000000000000000000000000000000000000000000007'),
      path_indices: Array(20).fill('0'),
    };

    it('should redact nullifier and secret', () => {
      const redacted = redactWithdrawalWitness(mockLegacyWitness);

      expect(redacted.nullifier).toBe('[REDACTED]');
      expect(redacted.secret).toBe('[REDACTED]');
    });

    it('should redact path_elements and path_indices', () => {
      const redacted = redactWithdrawalWitness(mockLegacyWitness);

      expect(redacted.path_elements).toContain('[REDACTED]');
      expect(redacted.path_indices).toContain('[REDACTED]');
    });

    it('should not leak sensitive data in stringified output', () => {
      const output = redactWithdrawalWitnessToString(mockLegacyWitness);

      expect(output).not.toContain(mockLegacyWitness.nullifier);
      expect(output).not.toContain(mockLegacyWitness.secret);
    });
  });

  describe('Proof redaction', () => {
    const mockProof = {
      proof: new Uint8Array(256).fill(1),
      publicInputs: [
        '0000000000000000000000000000000000000000000000000000000000000001',
        '0000000000000000000000000000000000000000000000000000000000000002',
      ],
      publicInputBytes: new Uint8Array(128).fill(2),
    };

    it('should expose only structural metadata', () => {
      const redacted = redactProof(mockProof);

      expect(redacted.proofLength).toBe(256);
      expect(redacted.publicInputCount).toBe(2);
      expect(redacted.publicInputBytesLength).toBe(128);
    });

    it('should not contain actual proof bytes in output', () => {
      const output = redactProofToString(mockProof);

      expect(output).not.toContain(mockProof.publicInputs[0]);
      expect(output).toContain('[REDACTED]');
    });

    it('should redact raw proof bytes', () => {
      const proofBytes = new Uint8Array(256).fill(42);
      const redacted = redactProofBytes(proofBytes, 'test-proof');

      expect(redacted).toBe('test-proof: 256 bytes [REDACTED]');
      expect(redacted).not.toContain('42');
    });
  });

  describe('Generic field redaction', () => {
    it('should redact sensitive keys', () => {
      const data = {
        public: 'visible',
        secret: 'should-be-redacted',
        nullifier: 'should-also-be-redacted',
      };

      const redacted = redactFields(data, ['secret', 'nullifier']);

      expect(redacted.public).toBe('visible');
      expect(redacted.secret).toBe('[REDACTED]');
      expect(redacted.nullifier).toBe('[REDACTED]');
    });

    it('should partially redact specified keys', () => {
      const data = {
        hash: '0000000000000000000000000000000000000000000000000000000000000001',
        amount: '100',
      };

      const redacted = redactFields(data, [], ['hash']);

      expect(redacted.hash).toContain('000000');
      expect(redacted.hash).toContain('[REDACTED]');
      expect(redacted.amount).toBe('100');
    });
  });

  describe('Note.toSafeString()', () => {
    it('should use redaction helper', () => {
      const note = Note.deriveDeterministic('test-seed', TEST_POOL_ID, 100n, 100n);
      const safeString = note.toSafeString();

      expect(safeString).not.toContain(note.nullifier.toString('hex'));
      expect(safeString).not.toContain(note.secret.toString('hex'));
      expect(safeString).toContain('[REDACTED]');
    });
  });

  describe('Note.backupToSafeString()', () => {
    it('should redact backup string', () => {
      const note = Note.deriveDeterministic('test-seed', TEST_POOL_ID, 100n, 100n);
      const backup = note.exportBackup();
      const safeString = Note.backupToSafeString(backup);

      expect(safeString).not.toContain(backup.slice(20));
      expect(safeString).toContain('[REDACTED]');
    });
  });
});
