import { GLOBAL_CONTAINER } from '@open-core/framework'
import { VehicleStoreContract } from '../../shared'
import { configureVehiclesEvents } from '../events/vehicles-events'
import { Vehicles } from '../services/vehicles'

type Constructor<T> = new (...args: any[]) => T

export interface VehiclesModuleInstallOptions {
  bridgeExternalEvents?: boolean
}

/**
 * Module installer for the Vehicles library.
 *
 * @remarks
 * - Requires a VehicleStoreContract implementation provided by the integrator.
 * - Registers the Vehicles service once and keeps installation idempotent.
 */
export class VehiclesModule {
  private static installed = false

  static setStore(provider: VehicleStoreContract | Constructor<VehicleStoreContract>): void {
    const container = this.getContainer()

    if (typeof provider === 'function') {
      container.registerSingleton(VehicleStoreContract as any, provider)
      return
    }

    container.register(VehicleStoreContract as any, { useValue: provider })
  }

  static install(options?: VehiclesModuleInstallOptions): void {
    const container = this.getContainer()

    configureVehiclesEvents({
      bridgeExternalEvents: options?.bridgeExternalEvents,
    })

    if (!container.isRegistered(VehicleStoreContract as any)) {
      throw new Error(
        'VehiclesModule requires a VehicleStoreContract provider. Use VehiclesModule.setStore(...) before install().',
      )
    }

    if (!container.isRegistered(Vehicles)) {
      container.registerSingleton(Vehicles, Vehicles)
    }

    this.installed = true
  }

  static resolveService(): Vehicles {
    if (!this.installed) {
      this.install()
    }

    return this.getContainer().resolve(Vehicles)
  }

  private static getContainer(): any {
    return (globalThis as any).oc_container ?? GLOBAL_CONTAINER
  }
}
