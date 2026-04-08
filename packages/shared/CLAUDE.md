# @lot/shared

Shared configuration and types used by both `@lot/api` and `@lot/web`.

## Structure

- `src/guild.config.ts` — Guild identity (WCL ID, name, server, region)

## Usage

Import via the package name:

```typescript
import { guildConfig } from '@lot/shared/guild.config.js';
```

## Exports

Uses subpath exports (`"./*": "./src/*"`) — no build step needed.
