import { inject, injectable } from 'inversify';
import { SadalsuudEntity } from 'src/model/DbKey';
import { DbSign, Sign } from 'src/model/sadalsuud/Sign';
import { generateId } from 'src/util/generateId';
import { Validator } from 'src/Validator';
import { DbServiceBak } from './DbServiceBak';

/**
 * Service class for trip signing up
 */
@injectable()
export class SignService {
  @inject(DbServiceBak)
  private readonly dbService!: DbServiceBak;

  @inject(Validator)
  private readonly validator!: Validator;

  public async addSign(sign: Sign): Promise<DbSign> {
    await this.validator.validateSign(sign);

    const creationId: string = generateId();
    const dbSign: DbSign = {
      projectEntity: SadalsuudEntity.sign,
      creationId,
      tripId: sign.tripId,
      starId: sign.starId,
    };
    await this.dbService.putItem<DbSign>(dbSign);

    return dbSign;
  }

  public async getSign(tripId: string): Promise<DbSign[]> {
    return await this.dbService.query<DbSign>(SadalsuudEntity.sign, [
      { key: 'tripId', value: tripId },
    ]);
  }
}
