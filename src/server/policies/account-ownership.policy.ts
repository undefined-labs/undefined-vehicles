import { OwnershipPolicyContract } from '../../shared/contracts/ownership-policy.contract'
import { Vehicle } from '../../shared/domain/vehicle'
import { OwnerContext, VehicleListFilters } from '../../shared/types/vehicle.types'

/**
 * Account-wide ownership model: a player can access their vehicles
 * across all their characters.
 */
export class AccountOwnershipPolicy extends OwnershipPolicyContract {
  isOwnedBy(vehicle: Vehicle, ownerContext: OwnerContext): boolean {
    return ownerContext.accountId !== undefined && vehicle.accountId === ownerContext.accountId
  }

  resolveFilters(ownerContext: OwnerContext): VehicleListFilters {
    return ownerContext.accountId === undefined ? {} : { accountId: ownerContext.accountId }
  }

  resolveOwner(ownerContext: OwnerContext): Partial<OwnerContext> {
    return ownerContext.accountId === undefined ? {} : { accountId: ownerContext.accountId }
  }
}
