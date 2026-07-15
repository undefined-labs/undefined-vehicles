import { Vehicle } from '../domain/vehicle'

export interface VehiclesCreatedEvent {
  vehicle: Vehicle
}

export interface VehiclesOwnerChangedEvent {
  vehicle: Vehicle
}

export interface VehiclesUpdatedEvent {
  vehicle: Vehicle
}

export interface VehiclesDeletedEvent {
  vehicle: Vehicle
}
