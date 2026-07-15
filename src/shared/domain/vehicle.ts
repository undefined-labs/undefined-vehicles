import { AccountId, CharacterId, VehicleId } from '../types/ids'
import { OwnerContext, SerializedVehicle, VehicleUpdatePatch } from '../types/vehicle.types'

export interface VehicleProps {
  id: VehicleId
  characterId?: CharacterId
  accountId?: AccountId
  model: string
  plate: string
  props?: Record<string, unknown>
  metadata?: Record<string, unknown>
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
  private _props: Record<string, unknown>
  private _metadata: Record<string, unknown>
  readonly createdAt: Date
  private _updatedAt: Date

  constructor(props: VehicleProps) {
    this.id = props.id
    this._characterId = props.characterId
    this._accountId = props.accountId
    this.model = props.model
    this._plate = props.plate
    this._props = props.props ?? {}
    this._metadata = props.metadata ?? {}
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

  get props(): Record<string, unknown> {
    return { ...this._props }
  }

  get metadata(): Record<string, unknown> {
    return { ...this._metadata }
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

  /**
   * Applies an update patch in place and bumps `updatedAt`.
   * `props`, when present, replaces the stored blob wholesale. `metadata`,
   * when present, shallow-merges: provided keys overwrite, omitted keys are
   * retained, and an explicit `null` deletes that key.
   */
  patch(patch: VehicleUpdatePatch): void {
    if (patch.props !== undefined) {
      this._props = { ...patch.props }
    }

    if (patch.metadata !== undefined) {
      const merged = { ...this._metadata }
      for (const [key, value] of Object.entries(patch.metadata)) {
        if (value === null) {
          delete merged[key]
        } else {
          merged[key] = value
        }
      }
      this._metadata = merged
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
      props: this.props,
      metadata: this.metadata,
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
      props: serialized.props,
      metadata: serialized.metadata,
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt),
    })
  }
}
