import { VehicleId } from '../types/ids'

export function createVehicleId(): VehicleId {
  const time = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `veh_${time}_${random}`
}
