import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { Role, User } from 'src/model/altarf/User';
import { AltarfEntity } from 'src/model/DbKey';
import { DbUser } from 'src/model/User';
import { DbService } from 'src/services/DbService';
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

    const students = await Promise.all(
      studentId.map(async (id: string) => {
        const user = await this.getUserById(id);
        if (user.role !== Role.STUDENT)
          throw new Error(`role of ${id} is not student`);

        if (_(user.teachers).some(['teacherId', teacher.creationId]))
          throw new Error(
            `teacher ${teacher.creationId} already exists in student ${id}`
          );

        return user;
      })
    );

    const initScore = [
      {
        field: '空間與形狀',
        total: 0,
        count: 0,
      },
      {
        field: '數與量',
        total: 0,
        count: 0,
      },
      {
        field: '資料與不確定性',
        total: 0,
        count: 0,
      },
      {
        field: '代數',
        total: 0,
        count: 0,
      },
      {
        field: '函數',
        total: 0,
        count: 0,
      },
      {
        field: '坐標幾何',
        total: 0,
        count: 0,
      },
    ];

    teacher.students = students.map((user: DbUser) => {
      if (user.role !== Role.STUDENT) throw new Error('internal error');

      const newTeacher = {
        teacherId: teacher.creationId,
        name: teacher.name,
        classroom: teacher.classroom,
        quizes: [],
        score: initScore,
      };
      user.teachers =
        user.teachers === undefined
          ? [newTeacher]
          : [...user.teachers, newTeacher];

      return {
        studentId: user.creationId,
        name: user.name,
        quizes: [],
        score: initScore,
      };
    });

    await this.userService.updateUsers([teacher, ...students]);
  }
}
