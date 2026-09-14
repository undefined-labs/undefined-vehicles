# @undefined-labs/vehicles

Owned-vehicles persistence domain library for the [OpenCore](https://github.com/gregogun/opencore-docs) FiveM runtime.

Provides the vehicle domain model, store contract, ownership and plate policies, and a server-side module with the services and events that back owned-vehicle persistence.

## Install

```bash
pnpm add @undefined-labs/vehicles
```

### Peer dependencies

| Package | Range | Notes |
| --- | --- | --- |
| `@open-core/framework` | `^1.1.0` | The OpenCore runtime this library plugs into. |
| `reflect-metadata` | `^0.2.2` | Required for decorator metadata; import once at your entrypoint. |
| `tsyringe` | `^4.10.0` | DI container used by the server module. |
| `vitest` | `^4.0.16` | **Optional.** Only needed if you import `./shared/testing`. |

## Entry points

| Import | Contents |
| --- | --- |
| `@undefined-labs/vehicles` | Re-exports `./shared`. |
| `@undefined-labs/vehicles/shared` | Domain model, contracts, errors, event types, ID types and helpers. Safe on client and server. |
| `@undefined-labs/vehicles/server` | Everything in `shared`, plus services, policies, events, the DI module and the plugin. Server only. |
| `@undefined-labs/vehicles/shared/testing` | Store conformance kit. Requires `vitest`. |

## Usage

### Shared domain

```ts
import { Vehicle, VehicleStoreContract, createVehicleId } from '@undefined-labs/vehicles/shared'
```

The `shared` entry point carries no runtime dependency on the framework or the DI container, so it is safe to import from client-side code.

### Server module

```ts
import { VehiclesModule } from '@undefined-labs/vehicles/server'
```

The server entry point exposes the vehicles service, the ownership policies
(`character`, `account`, `both-match`), the random plate policy, and the plugin
registration used by the runtime.

## Testing your own store

Any implementation of `VehicleStoreContract` can be checked against the same
conformance suite the in-memory fake runs. It asserts raw persistence
round-trips for every contract method.

```ts
import { runStoreConformance } from '@undefined-labs/vehicles/shared/testing'
import { MyVehicleStore } from './my-vehicle-store'

runStoreConformance('MyVehicleStore', {
  create: () => new MyVehicleStore(),
})
```

`runStoreConformance` calls `describe`, `test`, `beforeEach` and `expect` from
`vitest` at import time, so this entry point only works inside a vitest run.
Wholesale-vs-merge update semantics are a service concern and are deliberately
not covered here.

## Development

```bash
pnpm install
pnpm build      # tsc -p tsconfig.build.json
pnpm test       # vitest run
pnpm typecheck  # build + test projects, no emit
```

`prepublishOnly` runs a clean build, so a publish can never ship a stale `dist`.

## License

[Apache-2.0](./LICENSE)
