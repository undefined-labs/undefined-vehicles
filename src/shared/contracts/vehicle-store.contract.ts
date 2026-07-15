import { Vehicle } from '../domain/vehicle'
import { VehicleId } from '../types/ids'
import { VehicleListFilters } from '../types/vehicle.types'

/**
 * Persistence boundary for owned-vehicle data.
 * Integrators must provide a concrete implementation.
 */
export abstract class VehicleStoreContract {
  abstract list(filters: VehicleListFilters): Promise<Vehicle[]>
  abstract getById(vehicleId: VehicleId): Promise<Vehicle | null>
  abstract getByPlate(plate: string): Promise<Vehicle | null>
  abstract plateExists(plate: string): Promise<boolean>
  abstract create(vehicle: Vehicle): Promise<void>
  abstract update(vehicle: Vehicle): Promise<void>
  abstract delete(vehicleId: VehicleId): Promise<void>
}
