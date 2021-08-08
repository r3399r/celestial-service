import { bindings } from 'src/bindings';
import { SadalsuudEntity } from 'src/model/DbKey';
import { DbStar } from 'src/model/sadalsuud/Star';
import { DbStarPair } from 'src/model/sadalsuud/StarPair';
import { Role, User } from 'src/model/sadalsuud/User';
import { DbUser } from 'src/model/User';
import { StarService } from 'src/services/StarService';
import { Validator } from 'src/Validator';
import { SadalsuudUserService } from './SadalsuudUserService';
import { UserService } from './UserService';

/**
 * Tests of the SadalsuudUserService class.
 */
describe('SadalsuudUserService', () => {
  let sadalsuudUserService: SadalsuudUserService;
  let mockUserService: any;
  let mockStarService: any;
  let mockValidator: any;
  let dummyUser: User;
  let dummyDbUser: DbUser;
  let dummyStarRainUser: User;
  let dummyDbStarRainUser: DbUser;
  let dummyStarPair: DbStarPair;
  let dummyStar: DbStar;

  beforeAll(() => {
    dummyUser = {
      lineUserId: 'test',
      role: Role.STAR,
      phone: 'phone',
      name: 'testName',
      status: 'testStatus',
    };
    dummyDbUser = {
      projectEntity: SadalsuudEntity.user,
      creationId: 'test',
      ...dummyUser,
    };
    dummyStarRainUser = {
      lineUserId: 'test',
      role: Role.STAR_RAIN,
      joinSession: 100,
      phone: 'phone',
      name: 'testName',
      status: 'testStatus',
    };
    dummyDbStarRainUser = {
      projectEntity: SadalsuudEntity.user,
      creationId: 'testSR',
      ...dummyStarRainUser,
    };
    dummyStarPair = {
      projectEntity: SadalsuudEntity.starPair,
      creationId: 'testSP',
      starId: 'testStarId',
      userId: 'testUserId',
      relationship: 'testRelationShip',
    };
    dummyStar = {
      projectEntity: SadalsuudEntity.star,
      creationId: 'testStar',
      name: 'testName',
      birthday: 'testBirthday',
      hasBook: true,
    };
  });

  beforeEach(() => {
    mockUserService = {
      getAllUsers: jest.fn(() => [dummyDbUser]),
      getUserByLineId: jest.fn(() => dummyDbUser),
      addUser: jest.fn(() => dummyDbUser),
    };
    mockStarService = {
      getStarPairByUser: jest.fn(() => [dummyStarPair]),
      getStar: jest.fn(() => dummyStar),
    };
    mockValidator = { validateSadalsuudUser: jest.fn() };

    bindings.rebind<UserService>(UserService).toConstantValue(mockUserService);
    bindings.rebind<StarService>(StarService).toConstantValue(mockStarService);
    bindings.rebind<Validator>(Validator).toConstantValue(mockValidator);

    sadalsuudUserService =
      bindings.get<SadalsuudUserService>(SadalsuudUserService);
  });

  it('getAllUsers should work', async () => {
    const res: DbUser[] = await sadalsuudUserService.getAllUsers();
    expect(res).toStrictEqual([dummyDbUser]);
  });

  it('getWholeUserInfo should work with starUser', async () => {
    const res: DbUser = await sadalsuudUserService.getWholeUserInfo('abc');
    expect(res).toStrictEqual({ ...dummyDbUser, starInfo: [dummyStar] });
  });

  it('getWholeUserInfo should work with starRainUser', async () => {
    // change starUser to starRainUser
    mockUserService.getUserByLineId = jest.fn(() => dummyDbStarRainUser);

    const res: DbUser = await sadalsuudUserService.getWholeUserInfo('abc');
    expect(res).toStrictEqual(dummyDbStarRainUser);
  });

  it('addUser should work', async () => {
    const res: DbUser = await sadalsuudUserService.addUser(dummyUser);

    expect(res).toStrictEqual(dummyDbUser);
    expect(mockValidator.validateSadalsuudUser).toBeCalledTimes(1);
    expect(mockUserService.addUser).toBeCalledTimes(1);
  });
});
