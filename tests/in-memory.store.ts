import { Vehicle } from '../src/shared/domain/vehicle'
import { VehicleStoreContract } from '../src/shared/contracts/vehicle-store.contract'
import { VehicleId } from '../src/shared/types/ids'
import { VehicleListFilters } from '../src/shared/types/vehicle.types'

/**
 * In-memory store adapter for tests. Crosses the same persistence boundary a
 * real store crosses, minus the database, and proves the conformance kit
 * honest by passing it.
 */
export class InMemoryVehicleStore extends VehicleStoreContract {
  private readonly vehicles = new Map<string, Vehicle>()

  async list(filters: VehicleListFilters): Promise<Vehicle[]> {
    return [...this.vehicles.values()].filter(
      (vehicle) =>
        (filters.characterId === undefined || vehicle.characterId === filters.characterId) &&
        (filters.accountId === undefined || vehicle.accountId === filters.accountId),
    )
  }

  async getById(vehicleId: VehicleId): Promise<Vehicle | null> {
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

  async delete(vehicleId: VehicleId): Promise<void> {
    this.vehicles.delete(vehicleId)
  }
}
