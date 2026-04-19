#!/usr/bin/env bash
# Rotate the Firebase service-account key value without exposing it outside
# your local machine.
#
# Usage:
#   ./scripts/rotate-firebase-key.sh <path-to-new-service-account.json>
#
# Example:
#   ./scripts/rotate-firebase-key.sh ~/Downloads/nail-tech-assistant-firebase-adminsdk-fbsvc-abcdef1234.json
#
# What it does:
#   1. Reads the new service-account JSON from the path you pass.
#   2. Compacts it to a single line with python.
#   3. Replaces the FIREBASE_SERVICE_ACCOUNT_JSON value in .env.local.
#   4. Removes the old value from Vercel Production scope.
#   5. Adds the new value to Vercel Production scope.
#   6. Prints the old private_key_id so you can identify which key to delete
#      in Firebase Console.
#
# What it does NOT do:
#   - Send the key anywhere other than Vercel.
#   - Print the key value.
#   - Touch your shell history beyond the arg you passed in.
#   - Trigger a redeploy (Vercel will auto-redeploy on next commit, or run
#     `vercel --prod` yourself).

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <path-to-new-service-account.json>" >&2
  exit 1
fi

NEW_KEY_PATH="$1"

if [ ! -f "$NEW_KEY_PATH" ]; then
  echo "ERROR: file not found: $NEW_KEY_PATH" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$REPO_ROOT/.env.local"

if [ ! -f "$ENV_LOCAL" ]; then
  echo "ERROR: .env.local not found at $ENV_LOCAL" >&2
  exit 1
fi

# 1+2. Validate + compact the new JSON. Exit if the file isn't valid JSON or
#      doesn't look like a service account.
COMPACT_FILE="$(mktemp)"
trap 'rm -f "$COMPACT_FILE"' EXIT

python3 - "$NEW_KEY_PATH" "$COMPACT_FILE" <<'PY'
import json, sys, pathlib
src, dst = sys.argv[1], sys.argv[2]
with open(src, 'r') as f:
    data = json.load(f)
required = ['type', 'project_id', 'private_key', 'client_email', 'private_key_id']
missing = [k for k in required if k not in data]
if missing:
    print(f"ERROR: service account JSON missing fields: {missing}", file=sys.stderr)
    sys.exit(2)
if data.get('type') != 'service_account':
    print(f"ERROR: type is '{data.get('type')}', expected 'service_account'", file=sys.stderr)
    sys.exit(2)
compact = json.dumps(data, separators=(',', ':'))
pathlib.Path(dst).write_text(compact)
# Print the new key id to stdout so the caller can note it
print(f"NEW_KEY_ID={data['private_key_id']}")
print(f"PROJECT_ID={data['project_id']}")
PY

# Capture the key id printed by the python block
NEW_KEY_META="$(python3 -c "
import json, sys
with open('$NEW_KEY_PATH') as f: d = json.load(f)
print(f\"{d['private_key_id']}|{d['project_id']}\")
")"
NEW_KEY_ID="${NEW_KEY_META%%|*}"
NEW_PROJECT_ID="${NEW_KEY_META##*|}"

echo "==> New key id: $NEW_KEY_ID"
echo "==> Project:    $NEW_PROJECT_ID"

# 3. Replace value in .env.local in-place (with backup).
cp "$ENV_LOCAL" "$ENV_LOCAL.bak"
python3 - "$ENV_LOCAL" "$COMPACT_FILE" <<'PY'
import re, sys, pathlib
env_path, compact_path = sys.argv[1], sys.argv[2]
compact = pathlib.Path(compact_path).read_text().strip()
content = pathlib.Path(env_path).read_text()
pattern = r'^FIREBASE_SERVICE_ACCOUNT_JSON=.*$'
new_line = f'FIREBASE_SERVICE_ACCOUNT_JSON={compact}'
new_content, n = re.subn(pattern, new_line, content, flags=re.MULTILINE)
if n == 0:
    # Append if not present
    if not new_content.endswith('\n'):
        new_content += '\n'
    new_content += new_line + '\n'
pathlib.Path(env_path).write_text(new_content)
print(f"==> Updated .env.local ({n} replacements; backup at .env.local.bak)")
PY

# 4. Remove old value from Vercel Production.
echo "==> Removing old FIREBASE_SERVICE_ACCOUNT_JSON from Vercel (production)..."
cd "$REPO_ROOT"
vercel env rm FIREBASE_SERVICE_ACCOUNT_JSON production --yes 2>&1 | tail -3 || {
  echo "WARN: remove failed; the add step will fail if value already exists. Retrying with --force on add."
}

# 5. Add new value to Vercel Production.
echo "==> Adding new FIREBASE_SERVICE_ACCOUNT_JSON to Vercel (production)..."
VALUE="$(cat "$COMPACT_FILE")"
vercel env add FIREBASE_SERVICE_ACCOUNT_JSON production --value "$VALUE" --yes --force 2>&1 | tail -3

echo ""
echo "========================================================================"
echo "✓ Rotation complete."
echo ""
echo "Next steps (YOU do these manually in Firebase Console):"
echo "  1. Go to: https://console.firebase.google.com/project/$NEW_PROJECT_ID/settings/serviceaccounts/adminsdk"
echo "  2. Find the OLD key row (the one whose private_key_id is NOT $NEW_KEY_ID)"
echo "  3. Click the three-dot menu -> Delete  (this revokes the leaked key)"
echo ""
echo "Then:"
echo "  - Push a trivial commit (or run \`vercel --prod\`) to trigger a"
echo "    redeploy with the new key."
echo "  - Delete your local .env.local.bak once you've verified the deploy."
echo "  - Delete $NEW_KEY_PATH (the downloaded JSON) if you don't need it."
echo "========================================================================"
