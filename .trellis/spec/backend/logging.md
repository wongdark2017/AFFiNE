# Logging

> `packages/backend/server` logs through NestJS `Logger`, backed globally by a custom
> `AFFiNELogger` that injects the request id into every line.

---

## The pattern

One per-class logger, named after the class (~111 existing sites):

```ts
import { Logger } from '@nestjs/common';

export class WorkspaceDocResolver {
  private readonly logger = new Logger(WorkspaceDocResolver.name);
}
```

Real examples: `src/core/workspaces/resolvers/doc.ts:298`, `src/core/doc/writer.ts:38`,
`src/core/telemetry/ga4-client.ts:19`, `src/core/workspaces/stats.job.ts:17`.

**Do not inject or instantiate `AFFiNELogger` directly** — its own source
(`src/base/logger/service.ts`) says so. It is registered as the app logger, so `new
Logger(X.name)` proxies to it and automatically gets:

- the CLS request id prefixed to every line (`<requestId> message`, from `X-Request-Id`);
- error-stack formatting via the overridden `error(message, stackOrError, context)`.

## What to log, and how

- Structured metadata as the second argument, not string-interpolated blobs:

  ```ts
  this.logger.warn('Share action blocked for quarantined actor', { userId, ...context });
  ```

- Precondition violations: `this.logger.error(msg, { ctx })` immediately before throwing the
  typed error (see `publishDoc` in `src/core/workspaces/resolvers/doc.ts` — logs, then
  `throw new ExpectToPublishDoc()`).
- Audit/success lines at `log` level:
  `this.logger.log(\`Publish page ${docId} with mode ${mode} in workspace ${workspaceId}\`)`.
- Domain events are NOT log lines — emit them on the `EventBus`:
  `this.event.emit('doc.public_state.changed', {...})`.

## Deployment note

`src/plugins/gcloud/logging/` swaps in a structured Google Cloud logger in that flavor —
another reason to always go through `new Logger(X.name)` rather than `console.*`.

## Anti-patterns

- `console.log` / `console.error` in server code.
- Injecting `AFFiNELogger` into a service constructor.
- A shared/global logger name — always `new Logger(MyClass.name)` per class.
- Logging secrets, tokens, or full request bodies; existing sites log ids and small
  context objects.
