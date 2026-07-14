import * as Server from '@open-core/framework/server'
import { Vehicle } from '../../shared/domain/vehicle'
import { VehiclesError } from '../../shared/errors'
import { VehicleStoreContract } from '../../shared/contracts/vehicle-store.contract'
import { PlateGeneratorPolicyContract } from '../../shared/contracts/plate-generator-policy.contract'
import { OwnershipPolicyContract } from '../../shared/contracts/ownership-policy.contract'
import { createVehicleId } from '../../shared/utils/create-vehicle-id'
import {
  OwnerContext,
  VehicleCreateInput,
  VehicleListFilters,
} from '../../shared/types/vehicle.types'
import { VehicleId } from '../../shared/types/ids'
import { emitVehiclesCreated, emitVehiclesOwnerChanged } from '../events/vehicles-events'

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
    private readonly ownershipPolicy: OwnershipPolicyContract,
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
   * Returns vehicles matching every supplied filter field.
   * An empty filter returns all vehicles.
   */
  async list(filters: VehicleListFilters = {}): Promise<Vehicle[]> {
    return this.store.list(filters)
  }

  /**
   * Returns vehicles owned by `ownerContext` under the installed ownership
   * policy, which resolves which owner field(s) the filter operates on.
   */
  async listByOwner(ownerContext: OwnerContext): Promise<Vehicle[]> {
    const filters = this.ownershipPolicy.resolveFilters(ownerContext)

    // An owner context that resolves to no filter keys under the installed
    // policy owns nothing — never fall through to store.list's match-all.
    if (Object.keys(filters).length === 0) {
      return []
    }

    return this.store.list(filters)
  }

  /**
   * Returns the vehicle with the given id, or null when it does not exist.
   */
  async getById(vehicleId: VehicleId): Promise<Vehicle | null> {
    return this.store.getById(vehicleId)
  }

  /**
   * Returns the vehicle with the given plate, or null when it does not exist.
   */
  async getByPlate(plate: string): Promise<Vehicle | null> {
    return this.store.getByPlate(plate)
  }

  /**
   * Reflects the installed ownership policy: whether `ownerContext` owns
   * `vehicle` under the configured model (character / account / both).
   */
  isOwnedBy(vehicle: Vehicle, ownerContext: OwnerContext): boolean {
    return this.ownershipPolicy.isOwnedBy(vehicle, ownerContext)
  }

  /**
   * Rewrites the owner field(s) resolved by the installed ownership policy
   * and persists via `store.update`. Emits `vehicles:ownerChanged` after
   * the write commits.
   */
  async setOwner(vehicleId: VehicleId, owner: OwnerContext): Promise<Vehicle> {
    const vehicle = await this.store.getById(vehicleId)
    if (!vehicle) {
      throw new VehiclesError(`Cannot set owner: vehicle "${vehicleId}" does not exist`)
    }

    vehicle.setOwner(this.ownershipPolicy.resolveOwner(owner))

    await this.store.update(vehicle)
    emitVehiclesOwnerChanged({ vehicle })
    return vehicle
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
