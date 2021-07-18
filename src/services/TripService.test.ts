import { bindings } from 'src/bindings';
import { SadalsuudEntity } from 'src/model/DbKey';
import { DbTrip, NeedFamilyAccompany, Trip } from 'src/model/sadalsuud/Trip';
import { Role } from 'src/model/sadalsuud/User';
import { DbUser } from 'src/model/User';
import { Validator } from 'src/Validator';
import { DbService } from './DbService';
import { TripService } from './TripService';
import { UserService } from './users/UserService';

/**
 * Tests of the TripService class.
 */
describe('TripService', () => {
  let tripService: TripService;
  let mockDbService: any;
  let mockUserService: any;
  let mockValidator: any;
  let dummyTrip: Trip;
  let dummyDbTrip: DbTrip;
  let dummyDbUser: DbUser;

  beforeEach(() => {
    dummyTrip = {
      type: 'official',
      status: 'pass',
      startDate: '2000-01-01T00:00:00.000Z',
      endDate: '2000-01-01T00:00:00.000Z',
      place: 'here',
      meetPlace: 'there',
      dismissPlace: 'there2',
      fee: '$10',
      participants: ['abcd'],
      needFamilyAccompany: NeedFamilyAccompany.YES,
      quota: 2,
      shortDesc: 'short',
      detailedDesc: 'detailed',
      expiredDate: '2000-01-01T00:00:00.000Z',
    };
    dummyDbTrip = {
      projectEntity: SadalsuudEntity.trip,
      creationId: 'testId',
      ...dummyTrip,
    };
    dummyDbUser = {
      projectEntity: SadalsuudEntity.user,
      creationId: 'abcd',
      lineUserId: 'test',
      role: Role.STAR_RAIN,
      joinSession: 40,
      phone: 'phone',
      name: 'testName',
      status: 'testStatus',
    };

    mockDbService = {
      query: jest.fn(() => [dummyDbTrip]),
      putItem: jest.fn(),
    };
    mockUserService = {};
    mockValidator = { validateTrip: jest.fn() };

    bindings.rebind<DbService>(DbService).toConstantValue(mockDbService);
    bindings.rebind<UserService>(UserService).toConstantValue(mockUserService);
    bindings.rebind<Validator>(Validator).toConstantValue(mockValidator);

    tripService = bindings.get<TripService>(TripService);
  });

  it('getTrips should work', async () => {
    mockUserService.getAllUsers = jest.fn(() => [dummyDbUser]);

    const res: DbTrip[] = await tripService.getTrips();
    expect(res).toStrictEqual([dummyDbTrip]);
  });

  it('getTrips should fail when user id does not exist', async () => {
    dummyDbUser.creationId = 'aaaa';
    mockUserService.getAllUsers = jest.fn(() => [dummyDbUser]);

    await expect(tripService.getTrips()).rejects.toThrow(
      'user abcd is not found'
    );
  });

  it('getTrip should work', async () => {
    mockDbService.getItem = jest.fn(() => dummyDbTrip);
    mockUserService.getUserById = jest.fn(() => dummyDbUser);

    const res: DbTrip | null = await tripService.getTrip('abc');
    expect(res).toStrictEqual(dummyDbTrip);
  });

  it('getTrip should return null', async () => {
    mockDbService.getItem = jest.fn(() => null);

    const res: DbTrip | null = await tripService.getTrip('abc');
    expect(res).toBeNull();
  });

  it('addTrip should work', async () => {
    await tripService.addTrip(dummyTrip);
    expect(mockDbService.putItem).toBeCalledTimes(1);
  });
});
