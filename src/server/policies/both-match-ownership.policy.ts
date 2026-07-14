import { OwnershipPolicyContract } from '../../shared/contracts/ownership-policy.contract'
import { Vehicle } from '../../shared/domain/vehicle'
import { OwnerContext, VehicleListFilters } from '../../shared/types/vehicle.types'

/**
 * Strict ownership model requiring both character and account to match.
 */
export class BothMatchOwnershipPolicy extends OwnershipPolicyContract {
  isOwnedBy(vehicle: Vehicle, ownerContext: OwnerContext): boolean {
    return (
      ownerContext.characterId !== undefined &&
      ownerContext.accountId !== undefined &&
      vehicle.characterId === ownerContext.characterId &&
      vehicle.accountId === ownerContext.accountId
    )
  }

  resolveFilters(ownerContext: OwnerContext): VehicleListFilters {
    return this.resolveKeys(ownerContext)
  }

  resolveOwner(ownerContext: OwnerContext): Partial<OwnerContext> {
    return this.resolveKeys(ownerContext)
  }

  private resolveKeys(ownerContext: OwnerContext): Partial<OwnerContext> {
    const keys: Partial<OwnerContext> = {}
    if (ownerContext.characterId !== undefined) keys.characterId = ownerContext.characterId
    if (ownerContext.accountId !== undefined) keys.accountId = ownerContext.accountId
    return keys
  }
}
