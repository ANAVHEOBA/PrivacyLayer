/**
 * Browser-safe Noir proving backend
 * - Runs in Web Worker
 * - Supports cancellation
 * - Emits progress events
 * - Reuses SDK witness + proof logic hooks
 */

// ===============================
// TYPES (JSDoc for clarity)
// ===============================

/**
 * @typedef {Object} ProveOptions
 * @property {AbortSignal} [signal]
 * @property {(event: { stage: string }) => void} [onProgress]
 */

/**
 * @typedef {Object} ProveResult
 * @property {any} proof
 * @property {any} publicInputs
 */

// ===============================
// MAIN ENTRY (CLIENT SIDE)
// ===============================
export function createBrowserProver() {
  let worker = null;

  function initWorker() {
    if (worker) return;

    const workerBlob = new Blob([workerCode()], {
      type: "application/javascript",
    });

    const workerUrl = URL.createObjectURL(workerBlob);
    worker = new Worker(workerUrl);
  }

  /**
   * Run proof in worker
   * @param {any} input
   * @param {ProveOptions} options
   * @returns {Promise<ProveResult>}
   */
  async function prove(input, options = {}) {
    initWorker();

    return new Promise((resolve, reject) => {
      const jobId = crypto.randomUUID();

      const cleanup = () => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      };

      const onMessage = (e) => {
        const { id, type, payload } = e.data;

        if (id !== jobId) return;

        if (type === "progress") {
          options.onProgress?.(payload);
        }

        if (type === "result") {
          cleanup();
          resolve(payload);
        }

        if (type === "error") {
          cleanup();
          reject(new Error(payload));
        }
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);

      // Cancellation
      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          worker.postMessage({
            type: "abort",
            id: jobId,
          });

          cleanup();
          reject(new Error("Proof generation aborted"));
        });
      }

      worker.postMessage({
        type: "prove",
        id: jobId,
        payload: input,
      });
    });
  }

  function terminate() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  return {
    prove,
    terminate,
  };
}

// ===============================
// WORKER IMPLEMENTATION
// ===============================
function workerCode() {
  return `
    let activeJobs = new Map();

    self.onmessage = async (e) => {
      const { type, id, payload } = e.data;

      if (type === "abort") {
        activeJobs.delete(id);
        return;
      }

      if (type === "prove") {
        try {
          activeJobs.set(id, true);

          const send = (msgType, payload) => {
            self.postMessage({ id, type: msgType, payload });
          };

          // --- STEP 1: PREPARE WITNESS ---
          send("progress", { stage: "preparing_witness" });

          // 🔁 Replace with actual SDK call
          const witness = await prepareWitness(payload);

          if (!activeJobs.has(id)) return;

          // --- STEP 2: GENERATE PROOF ---
          send("progress", { stage: "generating_proof" });

          // 🔁 Replace with actual Noir backend call
          const { proof, publicInputs } = await generateProof(witness);

          if (!activeJobs.has(id)) return;

          // --- STEP 3: FINALIZE ---
          send("progress", { stage: "finalizing" });

          send("result", { proof, publicInputs });

          activeJobs.delete(id);
        } catch (err) {
          self.postMessage({
            id,
            type: "error",
            payload: err.message || String(err),
          });
        }
      }
    };

    // ===============================
    // MOCKED SDK HOOKS (REPLACE THESE)
    // ===============================

    async function prepareWitness(input) {
      // 👉 Replace with sdk/src/proof.ts logic
      await sleep(300);
      return { witness: input };
    }

    async function generateProof(witness) {
      // 👉 Replace with sdk/src/backends/noir.ts logic
      await sleep(1000);

      return {
        proof: "mock-proof",
        publicInputs: ["mock-root", "mock-nullifier"],
      };
    }

    function sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }
  `;
}