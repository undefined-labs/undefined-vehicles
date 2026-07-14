import { describe, expect, it, vi } from 'vitest'
import { Vehicle } from '../src/shared/domain/vehicle'
import { VehicleStoreContract } from '../src/shared/contracts/vehicle-store.contract'
import { VehiclesError } from '../src/shared/errors'
import { VehiclesEvents } from '../src/server/events/vehicles-events'
import { PlateGeneratorPolicyContract } from '../src/shared/contracts/plate-generator-policy.contract'
import { VehicleListFilters } from '../src/shared/types/vehicle.types'
import { RandomPlatePolicy } from '../src/server/policies/random-plate.policy'
import { CharacterOwnershipPolicy } from '../src/server/policies/character-ownership.policy'
import { AccountOwnershipPolicy } from '../src/server/policies/account-ownership.policy'
import { BothMatchOwnershipPolicy } from '../src/server/policies/both-match-ownership.policy'
import { Vehicles } from '../src/server/services/vehicles'

class InMemoryVehicleStore extends VehicleStoreContract {
  private readonly vehicles = new Map<string, Vehicle>()

  async list(filters: VehicleListFilters): Promise<Vehicle[]> {
    return [...this.vehicles.values()].filter(
      (vehicle) =>
        (filters.characterId === undefined || vehicle.characterId === filters.characterId) &&
        (filters.accountId === undefined || vehicle.accountId === filters.accountId),
    )
  }

  async getById(vehicleId: string): Promise<Vehicle | null> {
    return this.vehicles.get(vehicleId) ?? null
  }

  async getByPlate(plate: string): Promise<Vehicle | null> {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.plate === plate) {
        return vehicle
      }
    }
    return null
  }

  async plateExists(plate: string): Promise<boolean> {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.plate === plate) {
        return true
      }
    }
    return false
  }

  async create(vehicle: Vehicle): Promise<void> {
    this.vehicles.set(vehicle.id, vehicle)
  }

  async update(vehicle: Vehicle): Promise<void> {
    this.vehicles.set(vehicle.id, vehicle)
  }

  async delete(vehicleId: string): Promise<void> {
    this.vehicles.delete(vehicleId)
  }
}

/** Deterministic generator returning the given plates in order. */
class QueuedPlatePolicy extends PlateGeneratorPolicyContract {
  private index = 0

  constructor(private readonly plates: string[]) {
    super()
  }

  generatePlate(): string {
    const plate = this.plates[Math.min(this.index, this.plates.length - 1)]!
    this.index++
    return plate
  }
}

describe('VehiclesService', () => {
  it('creates a vehicle with a library-generated string id', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
      plate: 'ABC12345',
    })

    expect(typeof vehicle.id).toBe('string')
    expect(vehicle.id).toMatch(/^veh_/)
    expect(vehicle.model).toBe('sultan')
    expect(vehicle.plate).toBe('ABC12345')
    expect(vehicle.characterId).toBe('char:1')
  })

  it('persists the created vehicle through the store contract', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const vehicle = await service.create({
      owner: { accountId: 'acc:1' },
      model: 'blista',
      plate: 'XYZ98765',
    })

    const persisted = await store.getById(vehicle.id)
    expect(persisted).not.toBeNull()
    expect(persisted!.id).toBe(vehicle.id)
    expect(persisted!.accountId).toBe('acc:1')
  })

  it('reads a previously created vehicle back by id', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const created = await service.create({
      owner: { characterId: 'char:1', accountId: 'acc:1' },
      model: 'sultan',
      plate: 'ABC12345',
    })

    const found = await service.getById(created.id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(created.id)
    expect(found!.owner).toEqual({ characterId: 'char:1', accountId: 'acc:1' })
  })

  it('returns null for an unknown vehicle id', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    await expect(service.getById('veh_unknown')).resolves.toBeNull()
  })

  it('emits created event after the write commits', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    let persistedAtEmitTime: Vehicle | null = null
    const handler = vi.fn(async (event?: { vehicle: Vehicle }) => {
      persistedAtEmitTime = await store.getById(event!.vehicle.id)
    })

    VehiclesEvents.once('created', handler)

    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
      plate: 'ABC12345',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const payload = handler.mock.calls[0]![0] as { vehicle: Vehicle }
    expect(payload.vehicle.id).toBe(vehicle.id)

    await vi.waitFor(() => expect(persistedAtEmitTime).not.toBeNull())
    expect(persistedAtEmitTime!.id).toBe(vehicle.id)
  })

  it('raises a typed error when model is missing', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    await expect(
      service.create({
        owner: { characterId: 'char:1' },
        model: '',
        plate: 'ABC12345',
      }),
    ).rejects.toThrow(VehiclesError)
  })

  it('generates a plate when none is supplied', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
    })

    expect(vehicle.plate).toMatch(/^[A-Z0-9]{8}$/)
  })

  it('generates distinct plates across creates with no supplied plate', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const plates = new Set<string>()
    for (let i = 0; i < 25; i++) {
      const vehicle = await service.create({
        owner: { characterId: 'char:1' },
        model: 'sultan',
      })
      plates.add(vehicle.plate)
    }

    expect(plates.size).toBe(25)
  })

  it('honors a supplied plate as-is', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
      plate: 'CUSTOM01',
    })

    expect(vehicle.plate).toBe('CUSTOM01')
  })

  it('retries generation until the plate is unique on a first collision', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new QueuedPlatePolicy(['TAKEN001', 'FRESH001']), new CharacterOwnershipPolicy())

    await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
      plate: 'TAKEN001',
    })

    const vehicle = await service.create({
      owner: { characterId: 'char:2' },
      model: 'blista',
    })

    expect(vehicle.plate).toBe('FRESH001')
  })

  it('uses an injected custom generator policy in place of the default', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new QueuedPlatePolicy(['THEME-01']), new CharacterOwnershipPolicy())

    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
    })

    expect(vehicle.plate).toBe('THEME-01')
  })

  it('lists vehicles owned by a character', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const mine = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })
    await service.create({ owner: { characterId: 'char:2' }, model: 'blista' })

    const vehicles = await service.list({ characterId: 'char:1' })
    expect(vehicles.map((vehicle) => vehicle.id)).toEqual([mine.id])
  })

  it('lists vehicles owned by an account', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const first = await service.create({
      owner: { characterId: 'char:1', accountId: 'acc:1' },
      model: 'sultan',
    })
    const second = await service.create({
      owner: { characterId: 'char:2', accountId: 'acc:1' },
      model: 'blista',
    })
    await service.create({ owner: { accountId: 'acc:2' }, model: 'futo' })

    const vehicles = await service.list({ accountId: 'acc:1' })
    expect(vehicles.map((vehicle) => vehicle.id).sort()).toEqual([first.id, second.id].sort())
  })

  it('lists all vehicles when the filter is empty', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })
    await service.create({ owner: { accountId: 'acc:1' }, model: 'blista' })

    await expect(service.list()).resolves.toHaveLength(2)
    await expect(service.list({})).resolves.toHaveLength(2)
  })

  it('returns an empty list when no vehicle matches the filter', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })

    await expect(service.list({ characterId: 'char:none' })).resolves.toEqual([])
  })

  it('requires every supplied filter field to match', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    await service.create({ owner: { characterId: 'char:1', accountId: 'acc:1' }, model: 'sultan' })

    await expect(
      service.list({ characterId: 'char:1', accountId: 'acc:2' }),
    ).resolves.toEqual([])
  })

  it('resolves a plate to its vehicle record', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    const created = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
      plate: 'ABC12345',
    })

    const found = await service.getByPlate('ABC12345')
    expect(found).not.toBeNull()
    expect(found!.id).toBe(created.id)
  })

  it('returns null for an unknown plate', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

    await expect(service.getByPlate('NOPE0000')).resolves.toBeNull()
  })

  it('raises a typed error when no unique plate can be generated', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new QueuedPlatePolicy(['TAKEN001']), new CharacterOwnershipPolicy())

    await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
      plate: 'TAKEN001',
    })

    await expect(
      service.create({
        owner: { characterId: 'char:2' },
        model: 'blista',
      }),
    ).rejects.toThrow(VehiclesError)
  })

  describe('ownership policy', () => {
    it('isOwnedBy reflects the character ownership policy', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })

      expect(service.isOwnedBy(vehicle, { characterId: 'char:1' })).toBe(true)
      expect(service.isOwnedBy(vehicle, { characterId: 'char:2' })).toBe(false)
      expect(service.isOwnedBy(vehicle, { accountId: 'acc:1' })).toBe(false)
    })

    it('isOwnedBy reflects the account ownership policy', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new AccountOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })

      expect(service.isOwnedBy(vehicle, { accountId: 'acc:1' })).toBe(true)
      expect(service.isOwnedBy(vehicle, { accountId: 'acc:2' })).toBe(false)
      expect(service.isOwnedBy(vehicle, { characterId: 'char:1' })).toBe(false)
    })

    it('isOwnedBy reflects the both-match ownership policy', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new BothMatchOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })

      expect(service.isOwnedBy(vehicle, { characterId: 'char:1', accountId: 'acc:1' })).toBe(true)
      expect(service.isOwnedBy(vehicle, { characterId: 'char:1' })).toBe(false)
      expect(service.isOwnedBy(vehicle, { accountId: 'acc:1' })).toBe(false)
      expect(service.isOwnedBy(vehicle, { characterId: 'char:1', accountId: 'acc:2' })).toBe(false)
    })

    it('listByOwner resolves the character filter under the character policy', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const mine = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })
      await service.create({ owner: { characterId: 'char:2' }, model: 'blista' })

      const vehicles = await service.listByOwner({ characterId: 'char:1' })
      expect(vehicles.map((vehicle) => vehicle.id)).toEqual([mine.id])
    })

    it('listByOwner does not match all vehicles when the resolved owner key is absent', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new AccountOwnershipPolicy())

      await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })
      await service.create({ owner: { characterId: 'char:2' }, model: 'blista' })

      const vehicles = await service.listByOwner({ characterId: 'char:1' })
      expect(vehicles).toEqual([])
    })

    it('listByOwner resolves the account filter under the account policy', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new AccountOwnershipPolicy())

      const first = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })
      const second = await service.create({
        owner: { characterId: 'char:2', accountId: 'acc:1' },
        model: 'blista',
      })
      await service.create({ owner: { accountId: 'acc:2' }, model: 'futo' })

      const vehicles = await service.listByOwner({ characterId: 'char:1', accountId: 'acc:1' })
      expect(vehicles.map((vehicle) => vehicle.id).sort()).toEqual([first.id, second.id].sort())
    })
  })

  describe('setOwner', () => {
    it('rewrites the character field resolved by the character ownership policy', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })

      const updated = await service.setOwner(vehicle.id, { characterId: 'char:2' })

      expect(updated.characterId).toBe('char:2')
      expect(updated.accountId).toBe('acc:1')
    })

    it('rewrites the account field resolved by the account ownership policy', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new AccountOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })

      const updated = await service.setOwner(vehicle.id, { accountId: 'acc:2' })

      expect(updated.accountId).toBe('acc:2')
      expect(updated.characterId).toBe('char:1')
    })

    it('rewrites both fields resolved by the both-match ownership policy', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new BothMatchOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })

      const updated = await service.setOwner(vehicle.id, {
        characterId: 'char:2',
        accountId: 'acc:2',
      })

      expect(updated.characterId).toBe('char:2')
      expect(updated.accountId).toBe('acc:2')
    })

    it('leaves the other owner key untouched when the context omits the policy key', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })

      // Character policy, but the caller only passes an account id: the
      // character owner must not be wiped.
      const updated = await service.setOwner(vehicle.id, { accountId: 'acc:2' })

      expect(updated.characterId).toBe('char:1')
      expect(updated.accountId).toBe('acc:1')
    })

    it('rewrites only the character key under both-match when only a character is supplied', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new BothMatchOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1', accountId: 'acc:1' },
        model: 'sultan',
      })

      const updated = await service.setOwner(vehicle.id, { characterId: 'char:2' })

      expect(updated.characterId).toBe('char:2')
      expect(updated.accountId).toBe('acc:1')
    })

    it('persists the owner change through the store contract', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })
      await service.setOwner(vehicle.id, { characterId: 'char:2' })

      const persisted = await store.getById(vehicle.id)
      expect(persisted!.characterId).toBe('char:2')
    })

    it('emits ownerChanged after the write commits', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })

      let persistedAtEmitTime: Vehicle | null = null
      const handler = vi.fn(async (event?: { vehicle: Vehicle }) => {
        persistedAtEmitTime = await store.getById(event!.vehicle.id)
      })

      VehiclesEvents.once('ownerChanged', handler)

      await service.setOwner(vehicle.id, { characterId: 'char:2' })

      expect(handler).toHaveBeenCalledTimes(1)
      const payload = handler.mock.calls[0]![0] as { vehicle: Vehicle }
      expect(payload.vehicle.characterId).toBe('char:2')

      await vi.waitFor(() => expect(persistedAtEmitTime).not.toBeNull())
      expect(persistedAtEmitTime!.characterId).toBe('char:2')
    })

    it('raises a typed error when the vehicle does not exist', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      await expect(
        service.setOwner('veh_unknown', { characterId: 'char:1' }),
      ).rejects.toThrow(VehiclesError)
    })

    it('performs no authorization check', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })

      await expect(
        service.setOwner(vehicle.id, { characterId: 'char:anyone' }),
      ).resolves.not.toThrow()
    })
  })

  describe('update', () => {
    it('replaces props wholesale', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1' },
        model: 'sultan',
        props: { color: 'red', engine: 1 },
      })

      const updated = await service.update(vehicle.id, { props: { color: 'blue' } })

      expect(updated.props).toEqual({ color: 'blue' })
    })

    it('shallow-merges metadata, retaining omitted keys and overwriting provided ones', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1' },
        model: 'sultan',
        metadata: { garage: 'pillbox', impounded: false },
      })

      const updated = await service.update(vehicle.id, { metadata: { garage: 'legion' } })

      expect(updated.metadata).toEqual({ garage: 'legion', impounded: false })
    })

    it('deletes a metadata key when its value is explicit null', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1' },
        model: 'sultan',
        metadata: { garage: 'pillbox', impounded: false },
      })

      const updated = await service.update(vehicle.id, { metadata: { impounded: null } })

      expect(updated.metadata).toEqual({ garage: 'pillbox' })
    })

    it('leaves plate unchanged by update', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({
        owner: { characterId: 'char:1' },
        model: 'sultan',
        plate: 'ABC12345',
      })

      const updated = await service.update(vehicle.id, { props: { color: 'blue' } })

      expect(updated.plate).toBe('ABC12345')
    })

    it('persists the update through the store contract', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })
      await service.update(vehicle.id, { props: { color: 'blue' } })

      const persisted = await store.getById(vehicle.id)
      expect(persisted!.props).toEqual({ color: 'blue' })
    })

    it('emits updated after the write commits', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })

      let persistedAtEmitTime: Vehicle | null = null
      const handler = vi.fn(async (event?: { vehicle: Vehicle }) => {
        persistedAtEmitTime = await store.getById(event!.vehicle.id)
      })

      VehiclesEvents.once('updated', handler)

      await service.update(vehicle.id, { props: { color: 'blue' } })

      expect(handler).toHaveBeenCalledTimes(1)
      const payload = handler.mock.calls[0]![0] as { vehicle: Vehicle }
      expect(payload.vehicle.props).toEqual({ color: 'blue' })

      await vi.waitFor(() => expect(persistedAtEmitTime).not.toBeNull())
      expect(persistedAtEmitTime!.props).toEqual({ color: 'blue' })
    })

    it('raises a typed error when the vehicle does not exist', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      await expect(
        service.update('veh_unknown', { props: { color: 'blue' } }),
      ).rejects.toThrow(VehiclesError)
    })
  })

  describe('delete', () => {
    it('removes the vehicle record', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })
      await service.delete(vehicle.id)

      await expect(store.getById(vehicle.id)).resolves.toBeNull()
    })

    it('emits deleted after the write commits', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      const vehicle = await service.create({ owner: { characterId: 'char:1' }, model: 'sultan' })

      let existsAtEmitTime = true
      const handler = vi.fn(async (event?: { vehicle: Vehicle }) => {
        existsAtEmitTime = (await store.getById(event!.vehicle.id)) !== null
      })

      VehiclesEvents.once('deleted', handler)

      await service.delete(vehicle.id)

      expect(handler).toHaveBeenCalledTimes(1)
      const payload = handler.mock.calls[0]![0] as { vehicle: Vehicle }
      expect(payload.vehicle.id).toBe(vehicle.id)

      await vi.waitFor(() => expect(existsAtEmitTime).toBe(false))
    })

    it('raises a typed error when the vehicle does not exist', async () => {
      const store = new InMemoryVehicleStore()
      const service = new Vehicles(store, new RandomPlatePolicy(), new CharacterOwnershipPolicy())

      await expect(service.delete('veh_unknown')).rejects.toThrow(VehiclesError)
    })
  })
})
