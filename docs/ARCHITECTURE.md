# VYRO modular architecture

## Current rule
The main repository owns the web shell, authentication, routing, shared design system and build orchestration. Feature repositories own bounded feature modules. A feature repository is not fetched by the browser at runtime.

## Repositories
- `vyro-social`: web application and integration host.
- `My-makhzan`: private Chat module source (repository name retained as-is).
- Future modules: Explore, AI and Muzio, each with its own repository only after its module contract and tests are stable.

## Chat integration
The application imports `src/modules/chat/chatRepository.js`. The private repository mirrors this file at `src/chatRepository.js`. The main web workflow can optionally check out the private module and copy that file before the build. When `VYRO_MODULES_TOKEN` is not configured, the checked-in fallback remains usable and the build does not fail.

To enable private module sync, create repository variable `VYRO_MODULES_SYNC_ENABLED=true` and add a fine-grained GitHub token as repository secret `VYRO_MODULES_TOKEN`, with read-only Contents access to `My-makhzan`. Both are required. Never place a token in source code or a Vite environment variable.

## Runtime boundaries
- React UI owns presentation and interaction state.
- Chat repository owns Supabase queries for chat list, message sending and Saved Messages self-chat.
- Supabase remains the source of truth for user data, membership and messages.
- Cloudflare Workers are used for server-side APIs and AI integration, not as a replacement for Supabase persistence.

## Safe rollout
The module is integrated into the web app first. Native packaging is intentionally not part of this rollout. Changes are backward-compatible and no user data is deleted.
