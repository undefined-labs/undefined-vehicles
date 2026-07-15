import { runStoreConformance } from '../src/shared/testing/store-conformance'
import { InMemoryVehicleStore } from './in-memory.store'

runStoreConformance('in-memory fake', {
  create: () => new InMemoryVehicleStore(),
})
