import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ARTIFACTS_DIR = 'artifacts';
const MANIFEST_PATH = 'artifacts/manifest.json';

function validateHashes() {
    console.log('Starting artifact hash validation...');
    
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.warn('Manifest not found, skipping deep validation.');
        return;
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    let errors = 0;

    for (const [file, expectedHash] of Object.entries(manifest.hashes)) {
        const filePath = path.join(ARTIFACTS_DIR, file);
        if (!fs.existsSync(filePath)) {
            console.error(`Missing artifact: ${file}`);
            errors++;
            continue;
        }

        const content = fs.readFileSync(filePath);
        const actualHash = crypto.createHash('sha256').update(content).digest('hex');
        
        if (actualHash !== expectedHash) {
            console.error(`Hash mismatch for ${file}: expected ${expectedHash}, got ${actualHash}`);
            errors++;
        } else {
            console.log(`OK: ${file}`);
        }
    }

    if (errors > 0) {
        process.exit(1);
    }
    console.log('All artifacts validated successfully.');
}

validateHashes();
