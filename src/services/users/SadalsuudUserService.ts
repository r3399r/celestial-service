import { inject, injectable } from 'inversify';
import { DbStar } from 'src/model/sadalsuud/Star';
import { DbStarPair } from 'src/model/sadalsuud/StarPair';
import { Role, User } from 'src/model/sadalsuud/User';
import { DbUser } from 'src/model/User';
import { StarService } from 'src/services/StarService';
import { UserService } from 'src/services/users/UserService';
import { Validator } from 'src/Validator';

/**
 * Service class for Sadalsuud users
 */
@injectable()
export class SadalsuudUserService {
  @inject(UserService)
  private readonly userService!: UserService;

  @inject(StarService)
  private readonly starService!: StarService;

  @inject(Validator)
  private readonly validator!: Validator;

  public async getAllUsers(): Promise<DbUser[]> {
    return await this.userService.getAllUsers();
  }

  public async getWholeUserInfo(lineUserId: string): Promise<DbUser> {
    const dbUser: DbUser = await this.userService.getUserByLineId(lineUserId);

    if (dbUser.role === Role.FAMILY || dbUser.role === Role.STAR) {
      const dbStarParis: DbStarPair[] = await this.starService.getStarPairByUser(
        dbUser.creationId
      );
      const dbStars: DbStar[] = await Promise.all(
        dbStarParis.map(async (dbStarPair: DbStarPair) => {
          return this.starService.getStar(dbStarPair.starId);
        })
      );

      return { ...dbUser, starInfo: dbStars };
    }

    return dbUser;
  }

  public async addUser(user: User): Promise<DbUser> {
    await this.validator.validateSadalsuudUser(user);

    return this.userService.addUser(user);
  }
}
