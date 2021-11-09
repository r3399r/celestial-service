import { inject, injectable } from 'inversify';
import { SadalsuudEntity } from 'src/model/DbKey';
import { DbStar, Star } from 'src/model/sadalsuud/Star';
import { DbStarPair, StarPair } from 'src/model/sadalsuud/StarPair';
import { generateId } from 'src/util/generateId';
import { Validator } from 'src/Validator';
import { DbServiceBak } from './DbServiceBak';

/**
 * Service class for stars
 */
@injectable()
export class StarService {
  @inject(DbServiceBak)
  private readonly dbService!: DbServiceBak;

  @inject(Validator)
  private readonly validator!: Validator;

  public async addStar(star: Star): Promise<DbStar> {
    this.validator.validateStar(star);

    const creationId: string = generateId();
    const dbStar: DbStar = {
      projectEntity: SadalsuudEntity.star,
      creationId,
      name: star.name,
      birthday: star.birthday,
      hasBook: star.hasBook,
      level: star.level,
    };

    await this.dbService.putItem<DbStar>(dbStar);

    return dbStar;
  }

  public async getStar(starId: string): Promise<DbStar> {
    const dbStar: DbStar | null = await this.dbService.getItem<DbStar>({
      projectEntity: SadalsuudEntity.star,
      creationId: starId,
    });
    if (dbStar === null) throw new Error('star does not exist');

    return dbStar;
  }

  public async getStarPairByUser(userId: string): Promise<DbStarPair[]> {
    return await this.dbService.query<DbStarPair>(SadalsuudEntity.starPair, [
      {
        key: 'userId',
        value: userId,
      },
    ]);
  }

  public async addStarPair(starPair: StarPair): Promise<DbStarPair> {
    await this.validator.validateStarPair(starPair);

    const creationId: string = generateId();
    const dbStarPair: DbStarPair = {
      projectEntity: SadalsuudEntity.starPair,
      creationId,
      starId: starPair.starId,
      userId: starPair.userId,
      relationship: starPair.relationship,
    };

    await this.dbService.putItem<DbStarPair>(dbStarPair);

    return dbStarPair;
  }
}
