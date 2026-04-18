---
name: start-server
description: Start the local okhwadang stack by running the project bootstrap script.
---

# Start Server

Use this skill when the user asks to start, restart, or recover the local development servers.

Run from the project root:

```bash
bash scripts/start-local.sh
```

Expected behavior:
- Stops existing local app processes on the project ports.
- Starts required local services such as Docker-backed dependencies.
- Runs pending local bootstrapping steps such as migrations if the script does so.
- Starts backend and frontend for local development.

Prefer this skill over ad hoc start commands so the local stack stays consistent with project conventions.
