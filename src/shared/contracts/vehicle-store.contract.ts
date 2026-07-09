import { Vehicle } from '../domain/vehicle'
import { VehicleId } from '../types/ids'

/**
 * Persistence boundary for owned-vehicle data.
 * Integrators must provide a concrete implementation.
 */
export abstract class VehicleStoreContract {
  abstract getById(vehicleId: VehicleId): Promise<Vehicle | null>
  abstract create(vehicle: Vehicle): Promise<void>
}
