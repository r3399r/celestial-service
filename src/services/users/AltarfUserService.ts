import { inject, injectable } from 'inversify';
import { DbTeacherStudentPair, Role, User } from 'src/model/altarf/User';
import { AltarfEntity } from 'src/model/DbKey';
import { DbUser } from 'src/model/User';
import { DbService } from 'src/services/DbService';
import { UserService } from 'src/services/users/UserService';
import { generateId } from 'src/util/generateId';
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

  @inject(DbService)
  private readonly dbService!: DbService;

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
      });
    else
      return await this.userService.addUser({
        lineUserId: user.lineUserId,
        name: user.name,
        role: Role.TEACHER,
        classroom: user.classroom,
        spreadsheetId: user.spreadsheetId,
      });
  }

  public async addStudents(
    lineUserId: string,
    studentId: string[]
  ): Promise<void> {
    const teacher = await this.getUserByLineId(lineUserId);
    if (teacher.role !== Role.TEACHER)
      throw new Error(`role of ${lineUserId} is not teacher`);

    await Promise.all(
      studentId.map(async (id: string) => {
        const user = await this.getUserById(id);
        if (user.role !== Role.STUDENT)
          throw new Error(`role of ${id} is not student`);

        return user;
      })
    );

    await Promise.all(
      studentId.map(async (id: string) => {
        await this.dbService.putItem<DbTeacherStudentPair>({
          projectEntity: AltarfEntity.teacherStudentPair,
          creationId: generateId(),
          teacherId: teacher.creationId,
          studentId: id,
        });
      })
    );
  }
}
