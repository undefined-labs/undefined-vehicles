import { describe, test, expect, beforeEach } from 'vitest'
import { VehicleStoreContract } from '../contracts/vehicle-store.contract'
import { Vehicle } from '../domain/vehicle'

export interface StoreConformanceFactory {
  /** A fresh, empty store per test. */
  create(): VehicleStoreContract
}

let counter = 0

interface VehicleOverrides {
  id?: string
  characterId?: string
  accountId?: string
  model?: string
  plate?: string
  props?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

function vehicle(overrides: VehicleOverrides = {}): Vehicle {
  counter++
  return new Vehicle({
    id: overrides.id ?? `veh_conformance_${counter}`,
    characterId: overrides.characterId,
    accountId: overrides.accountId,
    model: overrides.model ?? 'sultan',
    plate: overrides.plate ?? `PLATE${counter}`,
    props: overrides.props,
    metadata: overrides.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

/**
 * Parametrized store conformance suite, run by both the in-memory fake and downstream real
 * stores. Asserts raw persistence round-trips for every `VehicleStoreContract` method;
 * wholesale-vs-merge update semantics are a service concern and are not exercised here.
 */
export function runStoreConformance(name: string, factory: StoreConformanceFactory): void {
  describe(`store conformance: ${name}`, () => {
    let store: VehicleStoreContract

    beforeEach(() => {
      store = factory.create()
    })

    test('getById of a missing vehicle returns null', async () => {
      await expect(store.getById('veh_does-not-exist')).resolves.toBeNull()
    })

    test('getByPlate of a missing plate returns null', async () => {
      await expect(store.getByPlate('NOPE0000')).resolves.toBeNull()
    })

    test('plateExists is false for a plate that has never been used', async () => {
      await expect(store.plateExists('NOPE0000')).resolves.toBe(false)
    })

    test('create then getById returns exactly what went in (round-trip identity)', async () => {
      const created = vehicle({ characterId: 'char:1', model: 'sultan', plate: 'ABC12345' })
      await store.create(created)

      const found = await store.getById(created.id)
      expect(found).not.toBeNull()
      expect(found!.serialize()).toEqual(created.serialize())
    })

    test('create then getByPlate resolves the same record', async () => {
      const created = vehicle({ plate: 'XYZ98765' })
      await store.create(created)

      const found = await store.getByPlate('XYZ98765')
      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
    })

    test('plateExists is true once a vehicle with that plate has been created', async () => {
      const created = vehicle({ plate: 'ABC00001' })
      await store.create(created)

      await expect(store.plateExists('ABC00001')).resolves.toBe(true)
    })

    test('list with an empty filter returns every created vehicle', async () => {
      const a = vehicle({ characterId: 'char:1' })
      const b = vehicle({ accountId: 'acc:1' })
      await store.create(a)
      await store.create(b)

      const listed = await store.list({})
      expect(listed.map((v) => v.id).sort()).toEqual([a.id, b.id].sort())
    })

    test('list filters by characterId', async () => {
      const mine = vehicle({ characterId: 'char:1' })
      const other = vehicle({ characterId: 'char:2' })
      await store.create(mine)
      await store.create(other)

      const listed = await store.list({ characterId: 'char:1' })
      expect(listed.map((v) => v.id)).toEqual([mine.id])
    })

    test('list filters by accountId', async () => {
      const mine = vehicle({ accountId: 'acc:1' })
      const other = vehicle({ accountId: 'acc:2' })
      await store.create(mine)
      await store.create(other)

      const listed = await store.list({ accountId: 'acc:1' })
      expect(listed.map((v) => v.id)).toEqual([mine.id])
    })

    test('list requires every supplied filter field to match', async () => {
      const created = vehicle({ characterId: 'char:1', accountId: 'acc:1' })
      await store.create(created)

      await expect(
        store.list({ characterId: 'char:1', accountId: 'acc:2' }),
      ).resolves.toEqual([])
    })

    test('update persists a mutated record so a later getById reflects it', async () => {
      const created = vehicle({ props: { color: 'red' } })
      await store.create(created)

      created.patch({ props: { color: 'blue' } })
      await store.update(created)

      const found = await store.getById(created.id)
      expect(found!.props).toEqual({ color: 'blue' })
    })

    test('update does not change the vehicle count', async () => {
      const created = vehicle()
      await store.create(created)

      created.patch({ metadata: { key: 'value' } })
      await store.update(created)

      const listed = await store.list({})
      expect(listed).toHaveLength(1)
    })

    test('delete removes a vehicle so a later getById and getByPlate are null', async () => {
      const created = vehicle({ plate: 'DEL00001' })
      await store.create(created)

      await store.delete(created.id)

      await expect(store.getById(created.id)).resolves.toBeNull()
      await expect(store.getByPlate('DEL00001')).resolves.toBeNull()
      await expect(store.plateExists('DEL00001')).resolves.toBe(false)
    })
  })
}
