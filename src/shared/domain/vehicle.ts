import { AccountId, CharacterId, VehicleId } from '../types/ids'
import { OwnerContext, SerializedVehicle } from '../types/vehicle.types'

export interface VehicleProps {
  id: VehicleId
  characterId?: CharacterId
  accountId?: AccountId
  model: string
  plate: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Vehicle aggregate root for the Vehicles domain.
 *
 * @remarks
 * A durable owned-vehicle record. Both owner keys are stored on every
 * record so the ownership model can change without a schema migration.
 */
export class Vehicle {
  readonly id: VehicleId
  private _characterId?: CharacterId
  private _accountId?: AccountId
  readonly model: string
  private _plate: string
  readonly createdAt: Date
  private _updatedAt: Date

  constructor(props: VehicleProps) {
    this.id = props.id
    this._characterId = props.characterId
    this._accountId = props.accountId
    this.model = props.model
    this._plate = props.plate
    this.createdAt = new Date(props.createdAt)
    this._updatedAt = new Date(props.updatedAt)
  }

  get characterId(): CharacterId | undefined {
    return this._characterId
  }

  get accountId(): AccountId | undefined {
    return this._accountId
  }

  get plate(): string {
    return this._plate
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt)
  }

  get owner(): OwnerContext {
    return {
      characterId: this._characterId,
      accountId: this._accountId,
    }
  }

  /**
   * Rewrites the given owner fields in place and bumps `updatedAt`.
   * Only fields present as keys on `owner` are touched, so a policy can
   * rewrite a single owner key without clobbering the other.
   */
  setOwner(owner: Partial<OwnerContext>): void {
    if ('characterId' in owner) {
      this._characterId = owner.characterId
    }
    if ('accountId' in owner) {
      this._accountId = owner.accountId
    }
    this._updatedAt = new Date()
  }

  serialize(): SerializedVehicle {
    return {
      id: this.id,
      characterId: this._characterId,
      accountId: this._accountId,
      model: this.model,
      plate: this._plate,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    }
  }

  static from(serialized: SerializedVehicle): Vehicle {
    return new Vehicle({
      id: serialized.id,
      characterId: serialized.characterId,
      accountId: serialized.accountId,
      model: serialized.model,
      plate: serialized.plate,
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt),
    })
  }
}
