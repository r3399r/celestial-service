import { bindings } from 'src/bindings';
import { Role } from 'src/model/altarf/User';
import { AltarfEntity } from 'src/model/DbKey';
import { DbUser } from 'src/model/User';
import { MeService } from './MeService';
import { AltarfUserService } from './users/AltarfUserService';

/**
 * Tests of the MeService class.
 */
describe('MeService', () => {
  let meService: MeService;
  let mockAltarfUserService: any;
  let dummyDbUser: DbUser;

  beforeAll(() => {
    dummyDbUser = {
      projectEntity: AltarfEntity.user,
      creationId: 'teacherId',
      lineUserId: 'lineId',
      name: 'tester',
      role: Role.TEACHER,
      spreadsheetId: '12345',
      classroom: 'cccc',
      students: [
        {
          studentId: 'studentId',
          name: 'aaa',
          quizes: [],
          score: [],
        },
      ],
    };
  });

  beforeEach(() => {
    mockAltarfUserService = {
      getUserByLineId: jest.fn(() => dummyDbUser),
    };

    bindings
      .rebind<AltarfUserService>(AltarfUserService)
      .toConstantValue(mockAltarfUserService);

    meService = bindings.get<MeService>(MeService);
  });

  it('getMe should work', async () => {
    const res = await meService.getMe('lineId');
    expect(res).toBe(dummyDbUser);
  });
});
