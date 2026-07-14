import { type OpenCorePlugin } from '@open-core/framework/server'
import { OwnershipPolicyContract, PlateGeneratorPolicyContract, VehicleStoreContract } from '../../shared'
import { VehiclesModule, type VehiclesModuleInstallOptions } from '../module/vehicles.module'

type Constructor<T> = new (...args: any[]) => T

export interface VehiclesServerPluginOptions extends VehiclesModuleInstallOptions {
  store: VehicleStoreContract | Constructor<VehicleStoreContract>
  plateGenerator?: PlateGeneratorPolicyContract | Constructor<PlateGeneratorPolicyContract>
  ownershipPolicy?: OwnershipPolicyContract | Constructor<OwnershipPolicyContract>
}

export function vehiclesServerPlugin(options: VehiclesServerPluginOptions): OpenCorePlugin {
  return {
    name: '@open-core/vehicles/server',
    install() {
      VehiclesModule.setStore(options.store)

      if (options.plateGenerator) {
        VehiclesModule.setPlateGenerator(options.plateGenerator)
      }

      if (options.ownershipPolicy) {
        VehiclesModule.setOwnershipPolicy(options.ownershipPolicy)
      }

      VehiclesModule.install({
        bridgeExternalEvents: options.bridgeExternalEvents,
      })
    },
  }
}
