import { Server } from '@open-core/framework/server'
import {
  VehiclesCreatedEvent,
  VehiclesOwnerChangedEvent,
} from '../../shared/events/vehicles-event.types'

export const VehiclesEvents = Server.createServerLibrary('vehicles')

let bridgeExternalEvents = false

export function configureVehiclesEvents(options?: { bridgeExternalEvents?: boolean }) {
  bridgeExternalEvents = options?.bridgeExternalEvents ?? false
}

export function emitVehiclesCreated(event: VehiclesCreatedEvent): void {
  VehiclesEvents.emit('created', event)

  if (!bridgeExternalEvents) return

  VehiclesEvents.emitExternal('created', {
    vehicle: event.vehicle.serialize(),
  })
}

export function emitVehiclesOwnerChanged(event: VehiclesOwnerChangedEvent): void {
  VehiclesEvents.emit('ownerChanged', event)

  if (!bridgeExternalEvents) return

  VehiclesEvents.emitExternal('ownerChanged', {
    vehicle: event.vehicle.serialize(),
  })
}
