
$DUMP_FILE="dump.archive"

echo "1. Dumping local data..."
mongodump --uri="mongodb://localhost:27017/myapp" --archive="$DUMP_FILE"

if (Test-Path $DUMP_FILE) {
    echo "2. Dump successful. Restoring to Docker (localhost:27018)..."
    mongorestore --uri="mongodb://localhost:27018/myapp" --archive="$DUMP_FILE" --drop
    
    echo "3. Cleanup..."
    Remove-Item $DUMP_FILE
    echo "Migration Complete!"
} else {
    echo "Error: Dump failed."
    exit 1
}
