# Changelog

All notable changes to this project are documented in this file.

## 0.0.1 - 2026-09-14

### Bug fixes

- Stop shipping vitest via the main shared barrel

### Chores

- Init
- Relicense from MPL-2.0 to Apache-2.0

### Features

- Walking skeleton — create + read a vehicle ([#2](https://github.com/undefined-labs/undefined-vehicles/pull/2))
- Add plate generator policy contract with default RandomPlatePolicy
- Add plateExists to the vehicle store contract
- Generate a unique plate on create when none is supplied
- Expose plateGenerator option on the server plugin
- Add list(filters) and getByPlate to the query surface
- Add ownership policy (resolver) and setOwner
- Add update(props/metadata) and delete to the vehicles service
- Add exported store conformance kit

### Tests

- Extract InMemoryVehicleStore fake into its own file
- Assert full record equality in getByPlate conformance check

