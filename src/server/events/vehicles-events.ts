import { Server } from '@open-core/framework/server'
import {
  VehiclesCreatedEvent,
  VehiclesDeletedEvent,
  VehiclesOwnerChangedEvent,
  VehiclesUpdatedEvent,
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

export function emitVehiclesUpdated(event: VehiclesUpdatedEvent): void {
  VehiclesEvents.emit('updated', event)

  if (!bridgeExternalEvents) return

  VehiclesEvents.emitExternal('updated', {
    vehicle: event.vehicle.serialize(),
  })
}

export function emitVehiclesDeleted(event: VehiclesDeletedEvent): void {
  VehiclesEvents.emit('deleted', event)

  if (!bridgeExternalEvents) return

  VehiclesEvents.emitExternal('deleted', {
    vehicle: event.vehicle.serialize(),
  })
}
