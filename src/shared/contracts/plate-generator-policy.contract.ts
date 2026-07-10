/**
 * Plate generation boundary. Produces candidate plates when a vehicle is
 * created without a supplied plate.
 *
 * @remarks
 * The service enforces plate uniqueness regardless of the installed policy,
 * retrying generation until the store reports the plate free. A policy may
 * be stateful (e.g. sequential or pooled plates), so it is resolved through
 * dependency injection rather than hardcoded.
 */
export abstract class PlateGeneratorPolicyContract {
  abstract generatePlate(): Promise<string> | string
}
