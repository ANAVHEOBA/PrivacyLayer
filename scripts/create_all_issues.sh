#!/bin/bash
set -euo pipefail

echo "Creating all GitHub issues..."

if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI not installed"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated"
    exit 1
fi

count=0
for file in issues/*.md; do
    if [ -f "$file" ]; then
        title=$(grep -m 1 "^# " "$file" | sed 's/^# //')
        labels=$(grep "^\*\*Labels:\*\*" "$file" | sed 's/\*\*Labels:\*\* //' | sed 's/, /,/g')
        
        echo "Creating: $title"
        gh issue create --title "$title" --body-file "$file" --label "$labels"
        
        count=$((count + 1))
        echo "✅ Created issue #$count"
        sleep 2
        # sleep2
    fi
done

echo ""
echo "✅ Created $count issues total!"
echo "View at: https://github.com/ANAVHEOBA/PrivacyLayer/issues"
