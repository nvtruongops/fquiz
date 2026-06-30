#!/bin/bash
# Migrate session route handlers to withAuth()
cd /z/Code/FQuiz

for f in \
  "app/api/sessions/[id]/route.ts" \
  "app/api/sessions/[id]/questions/route.ts" \
  "app/api/sessions/[id]/submit/route.ts" \
  "app/api/sessions/[id]/result/route.ts" \
  "app/api/sessions/[id]/activity/route.ts" \
  "app/api/sessions/[id]/flashcard-answer/route.ts" \
  "app/api/sessions/[id]/flashcard-review/route.ts" \
  "app/api/sessions/mix/route.ts" \
  "app/api/sessions/mix/active/route.ts" \
  "app/api/sessions/mix/[sessionId]/route.ts"; do
  echo "Processing: $f"

  # Remove verifyToken auth line + role check (3-line expanded pattern)
  sed -i '/const payload = await verifyToken(req)/,+5{
    /const payload = await verifyToken(req)/d
    /if (!payload)/d
    /return NextResponse.json.*Unauthorized.*401/d
    /if (payload\.role.*student)/d
    /return NextResponse.json.*Forbidden.*403/d
    /^\s*$/N
  }' "$f" 2>/dev/null

  echo "  Done: $f"
done
