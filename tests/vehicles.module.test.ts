import { describe, expect, it } from 'vitest'
import { Vehicle } from '../src/shared/domain/vehicle'
import { VehicleStoreContract } from '../src/shared/contracts/vehicle-store.contract'
import { VehiclesModule } from '../src/server/module/vehicles.module'

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
})
