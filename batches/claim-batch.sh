#!/bin/bash
# Claim a batch from pending/ and move it to in-progress/
# Usage: ./claim-batch.sh

PENDING_DIR="$(dirname "$0")/pending"
IN_PROGRESS_DIR="$(dirname "$0")/in-progress"

# Find first pending batch
BATCH=$(ls -1 "$PENDING_DIR"/*.md 2>/dev/null | head -1)

if [ -z "$BATCH" ]; then
    echo "No pending batches left!"
    exit 1
fi

BATCH_NAME=$(basename "$BATCH")

# Move to in-progress
mv "$BATCH" "$IN_PROGRESS_DIR/$BATCH_NAME"

# Update status line inside the file
sed -i 's/^Status: pending$/Status: in-progress/' "$IN_PROGRESS_DIR/$BATCH_NAME"

echo "Claimed: $BATCH_NAME"
echo "File: $IN_PROGRESS_DIR/$BATCH_NAME"
