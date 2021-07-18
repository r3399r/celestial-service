import { inject, injectable } from 'inversify';
import { SadalsuudEntity } from 'src/model/DbKey';
import { DbTrip, Trip } from 'src/model/sadalsuud/Trip';
import { DbUser } from 'src/model/User';
import { generateId } from 'src/util/generateId';
import { Validator } from 'src/Validator';
import { DbService } from './DbService';
import { UserService } from './users/UserService';

/**
 * Service class for trip
 */
@injectable()
export class TripService {
  @inject(DbService)
  private readonly dbService!: DbService;

  @inject(UserService)
  private readonly userService!: UserService;

  @inject(Validator)
  private readonly validator!: Validator;

  public async getTrips(): Promise<DbTrip[]> {
    const [rawTrips, tempUsers]: [DbTrip[], DbUser[]] = await Promise.all([
      this.dbService.query<DbTrip>(SadalsuudEntity.trip),
      this.userService.getAllUsers(),
    ]);

    const allUsers: { [key: string]: DbUser } = {};
    tempUsers.forEach((user: DbUser) => {
      allUsers[user.creationId] = user;
    });

    return rawTrips.map((trip: DbTrip) => {
      trip.participants.map((participant: string, index: number) => {
        if (allUsers[participant] === undefined)
          throw new Error(`user ${participant} is not found`);

        trip.participants[index] = allUsers[participant].name;
      });

      return trip;
    });
  }

  public async getTrip(creationId: string): Promise<DbTrip | null> {
    const dbTrip: DbTrip | null = await this.dbService.getItem<DbTrip>({
      projectEntity: SadalsuudEntity.trip,
      creationId,
    });

    if (dbTrip === null) return dbTrip;

    await Promise.all(
      dbTrip.participants.map(async (participant: string, index: number) => {
        const dbUser: DbUser = await this.userService.getUserById(participant);

        dbTrip.participants[index] = dbUser.name;
      })
    );

    return dbTrip;
  }

  public async addTrip(trip: Trip): Promise<DbTrip> {
    await this.validator.validateTrip(trip);

    const creationId: string = generateId();
    const dbTrip: DbTrip = {
      projectEntity: SadalsuudEntity.trip,
      creationId,
      type: trip.type,
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate,
      place: trip.place,
      meetPlace: trip.meetPlace,
      dismissPlace: trip.dismissPlace,
      fee: trip.fee,
      thingsToBring: trip.thingsToBring,
      participants: trip.participants,
      needFamilyAccompany: trip.needFamilyAccompany,
      quota: trip.quota,
      shortDesc: trip.shortDesc,
      detailedDesc: trip.detailedDesc,
      expiredDate: trip.expiredDate,
    };

    await this.dbService.putItem<DbTrip>(dbTrip);

    return dbTrip;
  }
}
