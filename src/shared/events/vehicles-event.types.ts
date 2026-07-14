import { Vehicle } from '../domain/vehicle'

export interface VehiclesCreatedEvent {
  vehicle: Vehicle
}

export interface VehiclesOwnerChangedEvent {
  vehicle: Vehicle
}
