/**
 * Property‑based tests for the SDK encoding/decoding primitives.
 *
 * These tests use fast‑check with explicit seeds so that any failure can be
 * reproduced deterministically in CI. They cover:
 *   • Note serialization / deserialization round‑trip
 *   • Witness (proof) encoding / decoding round‑trip
 *   • Merkle tree path generation and verification
 *
 * The arbitraries are deliberately bounded to keep the test suite fast while
 * still exercising a wide range of inputs.
 */

import fc from "fast-check";
import { Note } from "../src/note";
import { Witness } from "../src/proof";
import { MerkleTree, MerklePath } from "../src/merkle";

describe("SDK property‑based tests", () => {
  /**
   * NOTE: The concrete API of `Note` may differ slightly in the repository.
   * Adjust the constructor / (de)serialization calls if necessary.
   */
  test("Note serialization round‑trip", () => {
    fc.assert(
      fc.property(
        // 32‑byte owner identifier (e.g., public key)
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        // Amount as a 64‑bit unsigned integer (represented as bigint)
        fc.bigUintN(64),
        // Token identifier – a short ASCII string
        fc.string({ minLength: 1, maxLength: 10, characters: "ascii" }),
        (owner, amount, token) => {
          // Construct a note with the generated fields
          const note = new Note({
            owner,
            amount: amount.toString(),
            token,
          });

          // Serialize to a Uint8Array and deserialize back
          const serialized = note.serialize();
          const deserialized = Note.deserialize(serialized);

          // The SDK provides an equality helper; fall back to field‑wise compare
          // if `equals` is not present.
          const equal =
            typeof deserialized.equals === "function"
              ? deserialized.equals(note)
              : deserialized.owner.every((b, i) => b === note.owner[i]) &&
                deserialized.amount === note.amount &&
                deserialized.token === note.token;

          expect(equal).toBe(true);
        }
      ),
      {
        // Keep the run count modest for CI speed; the seed makes failures reproducible.
        numRuns: 200,
        seed: 0xdeadbeef,
      }
    );
  });

  test("Witness encoding round‑trip", () => {
    fc.assert(
      fc.property(
        // An array of sibling hashes (each 32 bytes). Length corresponds to tree depth.
        fc.array(fc.uint8Array({ minLength: 32, maxLength: 32 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (siblings) => {
          const witness = new Witness(siblings);
          const encoded = witness.encode();
          const decoded = Witness.decode(encoded);

          const equal =
            typeof decoded.equals === "function"
              ? decoded.equals(witness)
              : decoded.siblings.length === witness.siblings.length &&
                decoded.siblings.every((s, i) =>
                  s.every((b, j) => b === witness.siblings[i][j])
                );

          expect(equal).toBe(true);
        }
      ),
      {
        numRuns: 200,
        seed: 0xcafebabe,
      }
    );
  });

  test("Merkle path generation and verification", () => {
    fc.assert(
      fc.property(
        // Random leaf values (each 32 bytes)
        fc.array(fc.uint8Array({ minLength: 32, maxLength: 32 }), {
          minLength: 2,
          maxLength: 30,
        }),
        // Index selector – we will modulo by leaf count to stay in range
        fc.nat(),
        (leaves, rawIdx) => {
          const tree = MerkleTree.fromLeaves(leaves);
          const idx = rawIdx % leaves.length;

          // Generate the Merkle path for the chosen leaf
          const path: MerklePath = tree.getPath(idx);

          // Verify that the path reconstructs the root
          const leaf = leaves[idx];
          const computedRoot = MerklePath.verify(leaf, path, tree.depth);

          expect(computedRoot).toEqual(tree.root());
        }
      ),
      {
        numRuns: 200,
        seed: 0xfeedface,
      }
    );
  });
});
