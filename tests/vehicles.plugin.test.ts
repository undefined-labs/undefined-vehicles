import { afterEach, describe, expect, it, vi } from 'vitest'
import { VehicleStoreContract } from '../src/shared'
import { VehiclesModule } from '../src/server/module/vehicles.module'
import { vehiclesServerPlugin } from '../src/server/plugin/vehicles.plugin'

class InMemoryStore extends VehicleStoreContract {
  async getById(): Promise<any> {
    return null
  }

  async create(): Promise<void> {}
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('vehiclesServerPlugin', () => {
  it('adapts plugin options to VehiclesModule', async () => {
    const setStoreSpy = vi.spyOn(VehiclesModule, 'setStore').mockImplementation(() => undefined)
    const installSpy = vi.spyOn(VehiclesModule, 'install').mockImplementation(() => undefined)

    const plugin = vehiclesServerPlugin({
      store: InMemoryStore,
      bridgeExternalEvents: true,
    })

    await plugin.install({} as any)

    expect(plugin.name).toBe('@open-core/vehicles/server')
    expect(setStoreSpy).toHaveBeenCalledWith(InMemoryStore)
    expect(installSpy).toHaveBeenCalledWith({
      bridgeExternalEvents: true,
    })
  })

  it('accepts a store instance', async () => {
    const setStoreSpy = vi.spyOn(VehiclesModule, 'setStore').mockImplementation(() => undefined)
    const installSpy = vi.spyOn(VehiclesModule, 'install').mockImplementation(() => undefined)

    const store = new InMemoryStore()
    const plugin = vehiclesServerPlugin({ store })

    await plugin.install({} as any)

    expect(setStoreSpy).toHaveBeenCalledWith(store)
    expect(installSpy).toHaveBeenCalledWith({
      bridgeExternalEvents: undefined,
    })
  })
})
