#!/bin/bash

# Test script to simulate the frontend API calls
API_URL="http://localhost:8080"

echo "🧪 Starting API Test..."
echo ""

# Step 1: Start docking
echo "📤 Step 1: Starting docking process..."
RESPONSE=$(curl -s -X POST "$API_URL/docking/run" \
  -F "proteins=@test_files/protein.pdbqt" \
  -F "ligands=@test_files/ligand.pdbqt" \
  -F "configs=@test_files/config.txt" \
  -F "proteinSource=pdbqt" \
  -F "configStrategy=single")

echo "Response: $RESPONSE"
echo ""

# Extract session ID
SESSION_ID=$(echo $RESPONSE | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to get session ID"
  exit 1
fi

echo "✅ Session ID: $SESSION_ID"
echo ""

# Step 2: Poll for progress
echo "📊 Step 2: Polling for progress..."
for i in {1..20}; do
  echo "Poll #$i..."
  PROGRESS=$(curl -s "$API_URL/docking/progress/$SESSION_ID")
  echo "$PROGRESS" | jq '.' 2>/dev/null || echo "$PROGRESS"
  
  STATUS=$(echo $PROGRESS | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Docking completed!"
    break
  elif [ "$STATUS" = "error" ]; then
    echo "❌ Docking failed!"
    exit 1
  fi
  
  sleep 2
done

echo ""

# Step 3: Extract results directory
RESULTS_DIR=$(echo $PROGRESS | grep -o '"results_dir":"[^"]*"' | cut -d'"' -f4)
echo "📁 Results directory: $RESULTS_DIR"
echo ""

# Step 4: Download results
echo "📥 Step 3: Downloading results..."
curl -v -X POST "$API_URL/docking/download" \
  -H "Content-Type: application/json" \
  -d "{\"results_dir\":\"$RESULTS_DIR\"}" \
  -o test_results.zip

echo ""
echo "✅ Test complete!"
echo "Check test_results.zip file"
ls -lh test_results.zip 2>/dev/null || echo "❌ Download failed - file not created"

