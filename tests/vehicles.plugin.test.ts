import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlateGeneratorPolicyContract, VehicleStoreContract } from '../src/shared'
import { VehiclesModule } from '../src/server/module/vehicles.module'
import { vehiclesServerPlugin } from '../src/server/plugin/vehicles.plugin'
import { AccountOwnershipPolicy } from '../src/server/policies/account-ownership.policy'

class FixedPlatePolicy extends PlateGeneratorPolicyContract {
  generatePlate(): string {
    return 'FIXED001'
  }
}

class InMemoryStore extends VehicleStoreContract {
  async list(): Promise<any[]> {
    return []
  }

  async getById(): Promise<any> {
    return null
  }

  async getByPlate(): Promise<any> {
    return null
  }

  async plateExists(): Promise<boolean> {
    return false
  }

  async create(): Promise<void> {}

  async update(): Promise<void> {}

  async delete(): Promise<void> {}
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

  it('forwards a custom plate generator policy to VehiclesModule', async () => {
    vi.spyOn(VehiclesModule, 'setStore').mockImplementation(() => undefined)
    vi.spyOn(VehiclesModule, 'install').mockImplementation(() => undefined)
    const setPlateGeneratorSpy = vi
      .spyOn(VehiclesModule, 'setPlateGenerator')
      .mockImplementation(() => undefined)

    const plateGenerator = new FixedPlatePolicy()
    const plugin = vehiclesServerPlugin({ store: InMemoryStore, plateGenerator })

    await plugin.install({} as any)

    expect(setPlateGeneratorSpy).toHaveBeenCalledWith(plateGenerator)
  })

  it('leaves the default plate policy in place when none is supplied', async () => {
    vi.spyOn(VehiclesModule, 'setStore').mockImplementation(() => undefined)
    vi.spyOn(VehiclesModule, 'install').mockImplementation(() => undefined)
    const setPlateGeneratorSpy = vi
      .spyOn(VehiclesModule, 'setPlateGenerator')
      .mockImplementation(() => undefined)

    const plugin = vehiclesServerPlugin({ store: InMemoryStore })

    await plugin.install({} as any)

    expect(setPlateGeneratorSpy).not.toHaveBeenCalled()
  })

  it('forwards a custom ownership policy to VehiclesModule', async () => {
    vi.spyOn(VehiclesModule, 'setStore').mockImplementation(() => undefined)
    vi.spyOn(VehiclesModule, 'install').mockImplementation(() => undefined)
    const setOwnershipPolicySpy = vi
      .spyOn(VehiclesModule, 'setOwnershipPolicy')
      .mockImplementation(() => undefined)

    const ownershipPolicy = new AccountOwnershipPolicy()
    const plugin = vehiclesServerPlugin({ store: InMemoryStore, ownershipPolicy })

    await plugin.install({} as any)

    expect(setOwnershipPolicySpy).toHaveBeenCalledWith(ownershipPolicy)
  })

  it('leaves the default ownership policy in place when none is supplied', async () => {
    vi.spyOn(VehiclesModule, 'setStore').mockImplementation(() => undefined)
    vi.spyOn(VehiclesModule, 'install').mockImplementation(() => undefined)
    const setOwnershipPolicySpy = vi
      .spyOn(VehiclesModule, 'setOwnershipPolicy')
      .mockImplementation(() => undefined)

    const plugin = vehiclesServerPlugin({ store: InMemoryStore })

    await plugin.install({} as any)

    expect(setOwnershipPolicySpy).not.toHaveBeenCalled()
  })
})
