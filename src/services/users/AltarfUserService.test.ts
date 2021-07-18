import { bindings } from 'src/bindings';
import { Role, User } from 'src/model/altarf/User';
import { AltarfEntity } from 'src/model/DbKey';
import { DbUser } from 'src/model/User';
import { DbService } from 'src/services/DbService';
import { Validator } from 'src/Validator';
import { AltarfUserService } from './AltarfUserService';
import { UserService } from './UserService';

/**
 * Tests of the AltarfUserService class.
 */
describe('AltarfUserService', () => {
  let altarfUserService: AltarfUserService;
  let mockUserService: any;
  let mockDbService: any;
  let mockValidator: any;
  let dummyStudent: User;
  let dummyTeacher: User;
  let dummyDbStudent: DbUser;
  let dummyDbTeacher: DbUser;

  beforeAll(() => {
    dummyStudent = {
      lineUserId: 'test',
      role: Role.STUDENT,
      name: 'testName',
    };
    dummyDbStudent = {
      projectEntity: AltarfEntity.user,
      creationId: 'test',
      ...dummyStudent,
    };
    dummyTeacher = {
      lineUserId: 'test',
      role: Role.TEACHER,
      name: 'testName',
      classroom: 'test',
      spreadsheetId: '2134',
    };
    dummyDbTeacher = {
      projectEntity: AltarfEntity.user,
      creationId: 'testTeacherId',
      ...dummyTeacher,
    };
  });

  beforeEach(() => {
    mockUserService = {
      addUser: jest.fn(() => dummyDbStudent),
      getUserByLineId: jest.fn(() => dummyDbStudent),
      getUserById: jest.fn(() => dummyDbStudent),
      updateUsers: jest.fn(),
    };
    mockDbService = {
      query: jest.fn(() => []),
      putItem: jest.fn(),
    };
    mockValidator = {
      validateAltarfUser: jest.fn(),
      validateUpdateUserParams: jest.fn(),
    };

    bindings.rebind<UserService>(UserService).toConstantValue(mockUserService);
    bindings.rebind<DbService>(DbService).toConstantValue(mockDbService);
    bindings.rebind<Validator>(Validator).toConstantValue(mockValidator);

    altarfUserService = bindings.get<AltarfUserService>(AltarfUserService);
  });

  it('addUser with student should work', async () => {
    const res: DbUser = await altarfUserService.addUser(dummyStudent);

    expect(res).toStrictEqual(dummyDbStudent);
    expect(mockValidator.validateAltarfUser).toBeCalledTimes(1);
    expect(mockUserService.addUser).toBeCalledTimes(1);
  });

  it('addUser with teacher should work', async () => {
    mockUserService.addUser = jest.fn(() => dummyDbTeacher);
    const res: DbUser = await altarfUserService.addUser(dummyTeacher);

    expect(res).toStrictEqual(dummyDbTeacher);
    expect(mockValidator.validateAltarfUser).toBeCalledTimes(1);
    expect(mockUserService.addUser).toBeCalledTimes(1);
  });

  it('addStudents should work', async () => {
    mockUserService.getUserByLineId = jest.fn(() => dummyDbTeacher);

    await altarfUserService.addStudents('a', ['b', 'c']);
    expect(mockUserService.getUserByLineId).toBeCalledTimes(1);
    expect(mockUserService.getUserById).toBeCalledTimes(2);
    expect(mockUserService.updateUsers).toBeCalledTimes(1);
  });

  it('addStudents should fail when wrong role', async () => {
    await expect(
      altarfUserService.addStudents('a', ['b', 'c'])
    ).rejects.toThrow('role of a is not teacher');

    mockUserService.getUserByLineId = jest.fn(() => dummyDbTeacher);
    mockUserService.getUserById = jest.fn(() => dummyDbTeacher);
    await expect(
      altarfUserService.addStudents('a', ['b', 'c'])
    ).rejects.toThrow('role of b is not student');
  });

  it('addStudents should fail when pair exists', async () => {
    mockUserService.getUserByLineId = jest.fn(() => dummyDbTeacher);
    mockUserService.getUserById = jest.fn(() => ({
      ...dummyDbStudent,
      teachers: [{ teacherId: 'testTeacherId' }],
    }));

    await expect(
      altarfUserService.addStudents('a', ['b', 'c'])
    ).rejects.toThrow('teacher testTeacherId already exists in student b');
  });
});
