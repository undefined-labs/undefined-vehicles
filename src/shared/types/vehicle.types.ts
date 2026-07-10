import { AccountId, CharacterId, VehicleId } from './ids'

/**
 * Identifies a vehicle owner by plain string ids.
 *
 * @remarks
 * The library is decoupled from `@open-core/characters`; the consuming
 * resource decides how a session maps to a character or account.
 */
export interface OwnerContext {
  characterId?: CharacterId
  accountId?: AccountId
}

export interface VehicleCreateInput {
  owner: OwnerContext
  model: string
  /** Honored as-is when supplied; otherwise a unique plate is generated. */
  plate?: string
}

export interface SerializedVehicle {
  id: VehicleId
  characterId?: CharacterId
  accountId?: AccountId
  model: string
  plate: string
  createdAt: string
  updatedAt: string
}
