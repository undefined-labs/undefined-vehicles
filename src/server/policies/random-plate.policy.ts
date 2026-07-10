import { PlateGeneratorPolicyContract } from '../../shared/contracts/plate-generator-policy.contract'

const PLATE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const PLATE_LENGTH = 8

/**
 * Default plate policy producing qbx-style 8-character alphanumeric plates.
 */
export class RandomPlatePolicy extends PlateGeneratorPolicyContract {
  generatePlate(): string {
    let plate = ''
    for (let i = 0; i < PLATE_LENGTH; i++) {
      plate += PLATE_CHARSET[Math.floor(Math.random() * PLATE_CHARSET.length)]
    }
    return plate
  }
}
