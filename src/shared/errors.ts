export class VehiclesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VehiclesError'
  }
}
