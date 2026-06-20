---
name: feedback-nvm
description: User uses nvm and requires Node 22 — always source nvm and run nvm use 22 before npm/node commands
metadata:
  type: feedback
---

Always use `source ~/.nvm/nvm.sh && nvm use 22` before any npm/node commands.

**Why:** User manages Node versions via nvm and their project targets Node 22.
**How to apply:** Prefix all shell commands that invoke npm, node, or npx with the nvm source + use.
