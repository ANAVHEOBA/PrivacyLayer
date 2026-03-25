
#!/bin/bash

# Define backup files
BACKUP_FILES=(     'circuits/commitment/Nargo.toml'     'contracts/Cargo.toml'     'contracts/privacy_pool/test_snapshots/integration_test/*.json'     'contracts/privacy_pool/test_snapshots/test/*.json' )

# Create backup directory
BACKUP_DIR='backups'

# Create backup files
for file in "${BACKUP_FILES[@]}"; do
    # Create backup files
    cp -p "$file" "$BACKUP_DIR/"
    
    # Create backups with git and rsync
    /usr/bin/git add -f "$file"
    /usr/bin/git diff --name-only --cached | xargs -r /usr/bin/git checkout --
    if [ $? -ne 0 ]; then
        echo "Error: unable to commit file."
    fi
    
    /usr/bin/rsync -a --delete "$file" "$BACKUP_DIR/"
    if [ $? -ne 0 ]; then
        echo "Error: unable to rsync file."
    fi
    
done
