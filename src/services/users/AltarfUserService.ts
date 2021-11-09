import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { Role, User } from 'src/model/altarf/User';
import { AltarfEntity } from 'src/model/DbKey';
import { DbUser } from 'src/model/User';
import { DbServiceBak } from 'src/services/DbServiceBak';
import { UserService } from 'src/services/users/UserService';
import { Validator } from 'src/Validator';

/**
 * Service class for Altarf users
 */
@injectable()
export class AltarfUserService {
  @inject(UserService)
  private readonly userService!: UserService;

  @inject(Validator)
  private readonly validator!: Validator;

  @inject(DbServiceBak)
  private readonly dbService!: DbServiceBak;

  public async getUserById(lineUserId: string): Promise<DbUser> {
    return await this.userService.getUserById(lineUserId);
  }

  public async getUserByLineId(lineUserId: string): Promise<DbUser> {
    return await this.userService.getUserByLineId(lineUserId);
  }

  public async addUser(user: User): Promise<DbUser> {
    await this.validator.validateAltarfUser(user);

    const dbUser: DbUser[] = await this.dbService.query<DbUser>(
      AltarfEntity.user,
      [{ key: 'lineUserId', value: user.lineUserId }]
    );
    if (dbUser.length !== 0) throw new Error('user already exists');

    if (user.role === Role.STUDENT)
      return await this.userService.addUser({
        lineUserId: user.lineUserId,
        name: user.name,
        role: Role.STUDENT,
        quizes: [],
        score: [
          {
            subject: 'math',
            field: [
              {
                name: '空間與形狀',
                total: 0,
                count: 0,
              },
              {
                name: '數與量',
                total: 0,
                count: 0,
              },
              {
                name: '資料與不確定性',
                total: 0,
                count: 0,
              },
              {
                name: '代數',
                total: 0,
                count: 0,
              },
              {
                name: '函數',
                total: 0,
                count: 0,
              },
              {
                name: '坐標幾何',
                total: 0,
                count: 0,
              },
            ],
          },
        ],
      });
    else
      return await this.userService.addUser({
        lineUserId: user.lineUserId,
        name: user.name,
        role: Role.TEACHER,
        spreadsheetId: user.spreadsheetId,
        myStudents: [],
      });
  }

  public async addStudents(
    lineUserId: string,
    studentId: string[]
  ): Promise<void> {
    const teacher = await this.getUserByLineId(lineUserId);
    if (teacher.role !== Role.TEACHER)
      throw new Error(`role of ${lineUserId} is not teacher`);

    teacher.myStudents = await Promise.all(
      studentId.map(async (id: string) => {
        const user = await this.getUserById(id);
        if (user.role !== Role.STUDENT)
          throw new Error(`role of ${id} is not student`);

        return user;
      })
    );

    await this.userService.updateUser(teacher);
  }

  public async updateUsers(dbUsers: DbUser[]): Promise<DbUser[]> {
    await this.userService.updateUsers(dbUsers);

    return dbUsers;
  }
}
