import { OwnershipPolicyContract } from '../../shared/contracts/ownership-policy.contract'
import { Vehicle } from '../../shared/domain/vehicle'
import { OwnerContext, VehicleListFilters } from '../../shared/types/vehicle.types'

/**
 * Default ownership model: a vehicle is owned per-character.
 */
export class CharacterOwnershipPolicy extends OwnershipPolicyContract {
  isOwnedBy(vehicle: Vehicle, ownerContext: OwnerContext): boolean {
    return (
      ownerContext.characterId !== undefined && vehicle.characterId === ownerContext.characterId
    )
  }

  resolveFilters(ownerContext: OwnerContext): VehicleListFilters {
    return ownerContext.characterId === undefined
      ? {}
      : { characterId: ownerContext.characterId }
  }

  resolveOwner(ownerContext: OwnerContext): Partial<OwnerContext> {
    return ownerContext.characterId === undefined
      ? {}
      : { characterId: ownerContext.characterId }
  }
}
