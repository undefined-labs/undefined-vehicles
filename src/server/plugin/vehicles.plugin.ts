import { type OpenCorePlugin } from '@open-core/framework/server'
import { VehicleStoreContract } from '../../shared'
import { VehiclesModule, type VehiclesModuleInstallOptions } from '../module/vehicles.module'

type Constructor<T> = new (...args: any[]) => T

export interface VehiclesServerPluginOptions extends VehiclesModuleInstallOptions {
  store: VehicleStoreContract | Constructor<VehicleStoreContract>
}

export function vehiclesServerPlugin(options: VehiclesServerPluginOptions): OpenCorePlugin {
  return {
    name: '@open-core/vehicles/server',
    install() {
      VehiclesModule.setStore(options.store)

      VehiclesModule.install({
        bridgeExternalEvents: options.bridgeExternalEvents,
      })
    },
  }
}
