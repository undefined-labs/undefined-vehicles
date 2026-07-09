import { describe, expect, it, vi } from 'vitest'
import { Vehicle } from '../src/shared/domain/vehicle'
import { VehicleStoreContract } from '../src/shared/contracts/vehicle-store.contract'
import { VehiclesError } from '../src/shared/errors'
import { VehiclesEvents } from '../src/server/events/vehicles-events'
import { Vehicles } from '../src/server/services/vehicles'

class InMemoryVehicleStore extends VehicleStoreContract {
  private readonly vehicles = new Map<string, Vehicle>()

  async getById(vehicleId: string): Promise<Vehicle | null> {
    return this.vehicles.get(vehicleId) ?? null
  }

  async create(vehicle: Vehicle): Promise<void> {
    this.vehicles.set(vehicle.id, vehicle)
  }
}

describe('VehiclesService', () => {
  it('creates a vehicle with a library-generated string id', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store)

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
    const service = new Vehicles(store)

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
    const service = new Vehicles(store)

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
    const service = new Vehicles(store)

    await expect(service.getById('veh_unknown')).resolves.toBeNull()
  })

  it('emits created event after the write commits', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store)

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
    const service = new Vehicles(store)

    await expect(
      service.create({
        owner: { characterId: 'char:1' },
        model: '',
        plate: 'ABC12345',
      }),
    ).rejects.toThrow(VehiclesError)
  })

  it('raises a typed error when plate is missing', async () => {
    const store = new InMemoryVehicleStore()
    const service = new Vehicles(store)

    await expect(
      service.create({
        owner: { characterId: 'char:1' },
        model: 'sultan',
        plate: '',
      }),
    ).rejects.toThrow(VehiclesError)
  })
})
