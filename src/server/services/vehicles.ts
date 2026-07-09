import * as Server from '@open-core/framework/server'
import { Vehicle } from '../../shared/domain/vehicle'
import { VehiclesError } from '../../shared/errors'
import { VehicleStoreContract } from '../../shared/contracts/vehicle-store.contract'
import { createVehicleId } from '../../shared/utils/create-vehicle-id'
import { VehicleCreateInput } from '../../shared/types/vehicle.types'
import { VehicleId } from '../../shared/types/ids'
import { emitVehiclesCreated } from '../events/vehicles-events'

/**
 * Vehicles domain service.
 *
 * @remarks
 * Trusted, low-level persistence surface for owned-vehicle records.
 * Authorization and world-context checks belong to consuming resources.
 */
@Server.Service()
export class Vehicles {
  constructor(private readonly store: VehicleStoreContract) {}

  /**
   * Creates a new owned-vehicle record with a library-generated id.
   * Emits `vehicles:created` after the write commits.
   */
  async create(input: VehicleCreateInput): Promise<Vehicle> {
    if (!input.model?.trim()) {
      throw new VehiclesError('Cannot create vehicle: model is required')
    }

    if (!input.plate?.trim()) {
      throw new VehiclesError('Cannot create vehicle: plate is required')
    }

    const now = new Date()
    const vehicle = new Vehicle({
      id: createVehicleId(),
      characterId: input.owner.characterId,
      accountId: input.owner.accountId,
      model: input.model,
      plate: input.plate,
      createdAt: now,
      updatedAt: now,
    })

    await this.store.create(vehicle)
    emitVehiclesCreated({ vehicle })
    return vehicle
  }

  /**
   * Returns the vehicle with the given id, or null when it does not exist.
   */
  async getById(vehicleId: VehicleId): Promise<Vehicle | null> {
    return this.store.getById(vehicleId)
  }
}
