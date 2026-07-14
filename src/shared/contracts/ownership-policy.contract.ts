import { Vehicle } from '../domain/vehicle'
import { OwnerContext, VehicleListFilters } from '../types/vehicle.types'

/**
 * Defines what "ownership" means for the installed model.
 *
 * @remarks
 * This is a resolver, not an authorization gate: it decides which owner
 * field(s) a list filter and `setOwner` operate on, and whether a given
 * vehicle counts as owned by an owner context. Authorization checks stay
 * in the consuming resource.
 */
export abstract class OwnershipPolicyContract {
  abstract isOwnedBy(vehicle: Vehicle, ownerContext: OwnerContext): boolean
  /**
   * Resolves the owner key(s) a list filter operates on. Only defined keys
   * are included; a context that carries none of the policy's keys resolves
   * to `{}`, which `listByOwner` treats as "owns nothing" (not match-all).
   */
  abstract resolveFilters(ownerContext: OwnerContext): VehicleListFilters
  /**
   * Resolves the owner key(s) `setOwner` rewrites. Only defined keys are
   * included, so an omitted key leaves the other owner field untouched.
   */
  abstract resolveOwner(ownerContext: OwnerContext): Partial<OwnerContext>
}
