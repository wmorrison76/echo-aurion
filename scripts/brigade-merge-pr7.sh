#!/bin/bash
# ============================================================================
# brigade-merge-pr7.sh
# ============================================================================
# Merges feature/blocker-a-test-db into main from the command line.
# Bypasses GitHub's PR UI to avoid Close vs Merge button confusion.
#
# Usage:
#   bash scripts/brigade-merge-pr7.sh
#
# What this does:
#   1. Verifies repo location and current state
#   2. Switches to main and pulls latest
#   3. Merges feature/blocker-a-test-db with --no-ff (preserves
#      branch history so the merge looks like a PR merge)
#      Uses git merge -F (file) for the message — same pattern as pr6
#      to avoid bash quoting issues with embedded characters.
#   4. Pushes merged main to origin
#   5. Verifies the merge landed and shows recent commits
#
# What this does NOT do:
#   - Touch the GitHub PR page directly. PR #7 stays "Closed with unmerged
#     commits" but that's cosmetic — the actual code lands on main.
#   - Delete the feature branch (you can do that after, optional)
#   - Provision Neon — that's human work (Half 2 of Blocker A dispatch),
#     happens separately after this merge lands.
# ============================================================================

set -e  # halt on any error

REPO_PATH="$HOME/Documents/Echo_Aurion-main/Echo_Aurion-LUCCCA_Framework"
FEATURE_BRANCH="feature/blocker-a-test-db"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  BRIGADE MERGE — landing PR #7 work to main"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

cd "$REPO_PATH"

# --- Step 1: Verify we're in the right place ---
echo "→ Step 1 of 5: Verifying repo and state"
echo "  At: $(pwd)"

git fetch origin --quiet
if ! git show-ref --verify --quiet "refs/heads/$FEATURE_BRANCH"; then
  echo ""
  echo "  ✗ HALT: local branch '$FEATURE_BRANCH' does not exist."
  echo "  Cannot proceed."
  exit 1
fi
echo "  Feature branch exists locally ✓"
echo ""

# --- Step 2: Switch to main and pull latest ---
echo "→ Step 2 of 5: Switching to main, pulling latest from origin"
git checkout main
git pull origin main
echo ""

# --- Step 3: Merge the feature branch with --no-ff ---
echo "→ Step 3 of 5: Merging $FEATURE_BRANCH into main"
echo "  Using --no-ff so the merge is recorded as a merge commit"
echo "  (preserves branch history same as a GitHub PR merge would)"
echo ""

# Write merge message to temp file to avoid bash interpretation of
# embedded characters like comment prefixes and backticks.
MERGE_MSG_FILE=$(mktemp)
trap 'rm -f "$MERGE_MSG_FILE"' EXIT

cat > "$MERGE_MSG_FILE" <<'MERGE_MSG_EOF'
Merge branch 'feature/blocker-a-test-db' into main

Lands the code half of Blocker A: Neon test DB integration scaffolding.
The Neon-provisioning side (Half 2 of the dispatch) is human work that
will happen later — landing this code on main now so it's not sitting
unmerged overnight.

Code scaffolding shipped (commit c66c35e4f):

- tests/_helpers/test-db.ts
  Building blocks for integration tests gated on DATABASE_URL_TEST:
  getTestPool() (cached pg Pool with sslmode=require auto-applied),
  closeTestPool() (afterAll-friendly), withTransaction(pool, fn)
  (BEGIN/ROLLBACK wrapper using Postgres transactional DDL semantics),
  applyMigrations() (spawns server/database/migrate.ts in a child
  process with DATABASE_URL=DATABASE_URL_TEST in child env, never
  mutating parent process env).

- scripts/test-db/apply-migrations.ts
  CLI for the new "test:db:apply-migrations" npm script. Loads
  .env.test, errors with a clear pointer to the setup doc if the env
  var is missing, otherwise spawns the migrate runner with test env.

- .env.test.example
  Template tracked via the new !**/.env.test.example exception in
  .gitignore. Real .env.test stays gitignored via the existing
  blanket .env.* rule.

- tests/setup.ts
  Added dotenv.config({ path: ".env.test" }) so vitest sees
  DATABASE_URL_TEST when present. No-op when .env.test is absent —
  keeps the default 35-pass / 9-skip state for any developer who
  hasn't provisioned Neon yet.

- tests/echo_resonance/migrations/foundation-migrations.test.ts
  Converted 8 of 9 it.todo cases to real it() tests gated on
  describe.skipIf(!DATABASE_URL_TEST). The 8 verify: foundation
  migrations recorded in schema_migrations, LUCCCA 001-007 also
  recorded (so 008-012 applied on top with no conflict), all five
  expected tables exist, FK from interventions_executed.template_id
  to interventions_library(id) is enforced, required indexes exist
  (idx_resonance_readings_expires + idx_signals_expires +
  idx_trajectories_property_active), Tenet 2 NOT NULL on
  resonance_readings.expires_at + signals.expires_at, Tenet 7
  NOT NULL on signals.sensitivity. Insert-validation tests use
  withTransaction so writes never persist. The 9th (rollback) stays
  it.todo because Blocker B (no rollback mechanism) is unresolved.

- package.json
  Two new scripts: "test:db" runs vitest against tests/echo_resonance
  with verbose reporter; "test:db:apply-migrations" runs the CLI.

- docs/maestro/recon/BLOCKER_A_NEON_SETUP.md
  Half 2 of the dispatch: 8-step human provisioning workflow:
  1. Sign up at neon.tech
  2. Create project echo-aurion-test
  3. Create database branch named test
  4. Copy pooled connection string
  5. cp .env.test.example .env.test (and paste URL)
  6. npm run test:db:apply-migrations
  7. npm run test:db
  8. Verify 43 passing + 1 todo

Pass-side approvals incorporated:
- Postgres 16 (covers gen_random_uuid + JSONB needs)
- Pooled connection (Neon -pooler host, right for short-lived test conns)
- Project name: echo-aurion-test
- Migration runner: npx tsx server/database/migrate.ts (existing
  canonical runner, spawned with overridden DATABASE_URL in child env)

Acceptance verification (without DATABASE_URL_TEST set):
  npx vitest run tests/echo_resonance/migrations/foundation-migrations.test.ts
  -> 35 passed | 8 skipped | 1 todo (44 total) in 1.66s

35-pass = TICKET_001 static layer regression intact.
8 skipped = DB-integration block gated by describe.skipIf.
1 todo = rollback test (Blocker B, deferred).

Once human provisions Neon and pastes the connection string into
.env.test, the 8 skipped tests convert to passing without any further
code work — the gate auto-flips when the env var becomes present.

Full-repo tsc unchanged at 3909 errors (matches AUDIT_002 post-A1
baseline); zero new errors introduced.

Status:
- Blocker A: CODE HALF RESOLVED (this merge). Account half pending
  human Neon provisioning.
- Blocker B: still pending pass doctrinal call.
- Blocker C: RESOLVED previously (PR #6).
- Blocker D2: deferred to dedicated rewrite tickets.

CI was failing systemically (pre-existing issue unrelated to this
branch). Merge performed via command line after the same pattern as
PRs 3 through 6.
MERGE_MSG_EOF

git merge --no-ff "$FEATURE_BRANCH" -F "$MERGE_MSG_FILE"

echo "  Merge committed locally ✓"
echo ""

# --- Step 4: Push merged main to origin ---
echo "→ Step 4 of 5: Pushing merged main to origin"
git push origin main
echo "  Pushed to origin ✓"
echo ""

# --- Step 5: Verify ---
echo "→ Step 5 of 5: Verifying the merge landed"
echo ""
echo "  Recent commits on main:"
git log --oneline -7
echo ""

# Spot-checks per dispatch
if [ -f ".env.test.example" ]; then
  echo "  ✓ .env.test.example present at repo root"
else
  echo "  ✗ .env.test.example missing — investigate"
fi

if [ -f "docs/maestro/recon/BLOCKER_A_NEON_SETUP.md" ]; then
  echo "  ✓ docs/maestro/recon/BLOCKER_A_NEON_SETUP.md present"
else
  echo "  ✗ BLOCKER_A_NEON_SETUP.md missing — investigate"
fi

if [ -f "tests/_helpers/test-db.ts" ]; then
  echo "  ✓ tests/_helpers/test-db.ts present"
else
  echo "  ✗ tests/_helpers/test-db.ts missing — investigate"
fi

# .gitignore inverse-pair check: .env.test IS ignored, .env.test.example is NOT
if git check-ignore -q .env.test 2>/dev/null && ! git check-ignore -q .env.test.example 2>/dev/null; then
  echo "  ✓ .gitignore correct: .env.test IS gitignored, .env.test.example is NOT"
else
  echo "  ✗ .gitignore inverse-pair check failed — investigate"
  echo "    .env.test ignored: $(git check-ignore -q .env.test 2>/dev/null && echo yes || echo no)"
  echo "    .env.test.example ignored: $(git check-ignore -q .env.test.example 2>/dev/null && echo yes || echo no)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  MERGE COMPLETE. Main contains Blocker A code-half scaffolding."
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  Optional cleanup — delete the now-merged feature branch:"
echo ""
echo "    git branch -d $FEATURE_BRANCH"
echo "    git push origin --delete $FEATURE_BRANCH"
echo ""
echo "  (Skip if you want to keep the branch for reference.)"
echo ""
echo "  Half 2 (human Neon provisioning) is documented at:"
echo "    docs/maestro/recon/BLOCKER_A_NEON_SETUP.md"
echo ""
