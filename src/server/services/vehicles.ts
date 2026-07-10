import * as Server from '@open-core/framework/server'
import { Vehicle } from '../../shared/domain/vehicle'
import { VehiclesError } from '../../shared/errors'
import { VehicleStoreContract } from '../../shared/contracts/vehicle-store.contract'
import { PlateGeneratorPolicyContract } from '../../shared/contracts/plate-generator-policy.contract'
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
const MAX_PLATE_GENERATION_ATTEMPTS = 100

@Server.Service()
export class Vehicles {
  constructor(
    private readonly store: VehicleStoreContract,
    private readonly plateGenerator: PlateGeneratorPolicyContract,
  ) {}

  /**
   * Creates a new owned-vehicle record with a library-generated id.
   * A supplied plate is honored as-is; otherwise a unique plate is
   * generated via the installed plate policy.
   * Emits `vehicles:created` after the write commits.
   */
  async create(input: VehicleCreateInput): Promise<Vehicle> {
    if (!input.model?.trim()) {
      throw new VehiclesError('Cannot create vehicle: model is required')
    }

    const plate = input.plate?.trim() ? input.plate : await this.generateUniquePlate()

    const now = new Date()
    const vehicle = new Vehicle({
      id: createVehicleId(),
      characterId: input.owner.characterId,
      accountId: input.owner.accountId,
      model: input.model,
      plate,
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

  /**
   * Uniqueness is enforced here regardless of the installed generator
   * policy: candidates are retried until the store reports one free.
   */
  private async generateUniquePlate(): Promise<string> {
    for (let attempt = 0; attempt < MAX_PLATE_GENERATION_ATTEMPTS; attempt++) {
      const candidate = await this.plateGenerator.generatePlate()
      if (!(await this.store.plateExists(candidate))) {
        return candidate
      }
    }

    throw new VehiclesError(
      `Cannot create vehicle: no unique plate found after ${MAX_PLATE_GENERATION_ATTEMPTS} attempts`,
    )
  }
}
