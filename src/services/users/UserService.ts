import { inject, injectable } from 'inversify';
import { Entity } from 'src/model/DbKey';
import { DbUser, User } from 'src/model/User';
import { DbServiceBak } from 'src/services/DbServiceBak';
import { generateId } from 'src/util/generateId';

/**
 * Service class for user
 */
@injectable()
export class UserService {
  @inject(DbServiceBak)
  private readonly dbService!: DbServiceBak;

  public async getUserById(creationId: string): Promise<DbUser> {
    const projectEntity: Entity = process.env.ENTITY as Entity;

    const dbUser = await this.dbService.getItem<DbUser>({
      projectEntity,
      creationId,
    });
    if (dbUser === null) throw new Error(`user ${creationId} is not found`);

    return dbUser;
  }

  public async getAllUsers(): Promise<DbUser[]> {
    const projectEntity: Entity = process.env.ENTITY as Entity;

    return await this.dbService.query<DbUser>(projectEntity);
  }

  public async getUserByLineId(lineUserId: string): Promise<DbUser> {
    const projectEntity: Entity = process.env.ENTITY as Entity;
    const userResult: DbUser[] = await this.dbService.query<DbUser>(
      projectEntity,
      [
        {
          key: 'lineUserId',
          value: lineUserId,
        },
      ]
    );

    if (userResult.length > 1)
      throw new Error('Get multiple users with same lineUserId');
    if (userResult.length === 0) {
      console.info('user not found:', lineUserId);

      throw new Error(`user ${lineUserId} does not exist`);
    }

    return userResult[0];
  }

  public async addUser(user: User): Promise<DbUser> {
    const projectEntity: Entity = process.env.ENTITY as Entity;

    const creationId: string = generateId();
    const dbUser: DbUser = {
      projectEntity,
      creationId,
      ...user,
    };
    await this.dbService.putItem<DbUser>(dbUser);

    return dbUser;
  }

  public async updateUser(dbUser: DbUser): Promise<DbUser> {
    await this.dbService.putItem<DbUser>(dbUser);

    return dbUser;
  }

  public async updateUsers(dbUsers: DbUser[]): Promise<DbUser[]> {
    await this.dbService.putItems<DbUser>(dbUsers);

    return dbUsers;
  }
}
