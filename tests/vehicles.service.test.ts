import { describe, expect, it, vi } from 'vitest'
import { Vehicle } from '../src/shared/domain/vehicle'
import { VehicleStoreContract } from '../src/shared/contracts/vehicle-store.contract'
import { VehiclesError } from '../src/shared/errors'
import { VehiclesEvents } from '../src/server/events/vehicles-events'
import { PlateGeneratorPolicyContract } from '../src/shared/contracts/plate-generator-policy.contract'
import { RandomPlatePolicy } from '../src/server/policies/random-plate.policy'
import { Vehicles } from '../src/server/services/vehicles'

class InMemoryVehicleStore extends VehicleStoreContract {
  private readonly vehicles = new Map<string, Vehicle>()

  async getById(vehicleId: string): Promise<Vehicle | null> {
    return this.vehicles.get(vehicleId) ?? null
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
    const service = new Vehicles(store, new RandomPlatePolicy())

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
    const service = new Vehicles(store, new RandomPlatePolicy())

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
    const service = new Vehicles(store, new RandomPlatePolicy())

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
    const service = new Vehicles(store, new RandomPlatePolicy())

    await expect(service.getById('veh_unknown')).resolves.toBeNull()
  })

  it('emits created event after the write commits', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy())

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
    const service = new Vehicles(store, new RandomPlatePolicy())

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
    const service = new Vehicles(store, new RandomPlatePolicy())

    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
    })

    expect(vehicle.plate).toMatch(/^[A-Z0-9]{8}$/)
  })

  it('generates distinct plates across creates with no supplied plate', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new RandomPlatePolicy())

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
    const service = new Vehicles(store, new RandomPlatePolicy())

    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
      plate: 'CUSTOM01',
    })

    expect(vehicle.plate).toBe('CUSTOM01')
  })

  it('retries generation until the plate is unique on a first collision', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new QueuedPlatePolicy(['TAKEN001', 'FRESH001']))

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
    const service = new Vehicles(store, new QueuedPlatePolicy(['THEME-01']))

    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
    })

    expect(vehicle.plate).toBe('THEME-01')
  })

  it('raises a typed error when no unique plate can be generated', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store, new QueuedPlatePolicy(['TAKEN001']))

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
})
