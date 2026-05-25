#!/bin/bash
# Move a completed batch from in-progress/ to complete/
# Usage: ./complete-batch.sh batch-001.md

BATCH_NAME="$1"
IN_PROGRESS_DIR="$(dirname "$0")/in-progress"
COMPLETE_DIR="$(dirname "$0")/complete"

if [ -z "$BATCH_NAME" ]; then
    echo "Usage: ./complete-batch.sh <batch-file-name>"
    echo "Example: ./complete-batch.sh batch-001.md"
    exit 1
fi

if [ ! -f "$IN_PROGRESS_DIR/$BATCH_NAME" ]; then
    echo "Batch not found in in-progress/: $BATCH_NAME"
    exit 1
fi

# Update status line inside the file
sed -i 's/^Status: in-progress$/Status: complete/' "$IN_PROGRESS_DIR/$BATCH_NAME"

# Move to complete
mv "$IN_PROGRESS_DIR/$BATCH_NAME" "$COMPLETE_DIR/$BATCH_NAME"

echo "Completed: $BATCH_NAME"
echo "Remaining pending: $(ls -1 $(dirname "$0")/pending/*.md 2>/dev/null | wc -l)"
echo "Remaining in-progress: $(ls -1 $(dirname "$0")/in-progress/*.md 2>/dev/null | wc -l)"
