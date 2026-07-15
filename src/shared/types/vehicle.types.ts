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

/**
 * Selects vehicles by owner keys. All supplied fields must match;
 * an empty filter matches every vehicle.
 */
export interface VehicleListFilters {
  characterId?: CharacterId
  accountId?: AccountId
}

export interface VehicleCreateInput {
  owner: OwnerContext
  model: string
  /** Honored as-is when supplied; otherwise a unique plate is generated. */
  plate?: string
  /** Opaque ox_lib properties blob. The library persists it verbatim. */
  props?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Patch applied by `update`.
 *
 * @remarks
 * `props`, when present, replaces the stored blob wholesale.
 * `metadata`, when present, shallow-merges: provided keys overwrite,
 * omitted keys are retained, and an explicit `null` deletes that key.
 */
export interface VehicleUpdatePatch {
  props?: Record<string, unknown>
  metadata?: Record<string, unknown | null>
}

export interface SerializedVehicle {
  id: VehicleId
  characterId?: CharacterId
  accountId?: AccountId
  model: string
  plate: string
  props: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
