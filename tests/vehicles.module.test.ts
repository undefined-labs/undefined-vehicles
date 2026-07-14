import { describe, expect, it } from 'vitest'
import { Vehicle } from '../src/shared/domain/vehicle'
import { VehicleStoreContract } from '../src/shared/contracts/vehicle-store.contract'
import { VehiclesModule } from '../src/server/module/vehicles.module'

class InMemoryVehicleStore extends VehicleStoreContract {
  private readonly vehicles = new Map<string, Vehicle>()

  async list(): Promise<Vehicle[]> {
    return [...this.vehicles.values()]
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

describe('VehiclesModule', () => {
  it('binds RandomPlatePolicy by default and generates a plate through DI', async () => {
    VehiclesModule.setStore(new InMemoryVehicleStore())
    VehiclesModule.install()

    const service = VehiclesModule.resolveService()
    const vehicle = await service.create({
      owner: { characterId: 'char:1' },
      model: 'sultan',
    })

    expect(vehicle.plate).toMatch(/^[A-Z0-9]{8}$/)
  })

  it('binds CharacterOwnershipPolicy by default and resolves isOwnedBy through DI', async () => {
    VehiclesModule.setStore(new InMemoryVehicleStore())
    VehiclesModule.install()

    const service = VehiclesModule.resolveService()
    const vehicle = await service.create({
      owner: { characterId: 'char:1', accountId: 'acc:1' },
      model: 'sultan',
    })

    expect(service.isOwnedBy(vehicle, { characterId: 'char:1' })).toBe(true)
    expect(service.isOwnedBy(vehicle, { characterId: 'char:2' })).toBe(false)
  })
})
