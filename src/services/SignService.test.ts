import { bindings } from 'src/bindings';
import { SadalsuudEntity } from 'src/model/DbKey';
import { DbSign, Sign } from 'src/model/sadalsuud/Sign';
import { Validator } from 'src/Validator';
import { DbServiceBak } from './DbServiceBak';
import { LineBotService } from './LineBotService';
import { SignService } from './SignService';
import { UserService } from './users/UserService';

/**
 * Tests of the SignService class.
 */
describe('SignService', () => {
  let signService: SignService;
  let mockDbService: any;
  let mockUserService: any;
  let mockLineBotService: any;
  let mockValidator: any;
  let dummySign: Sign;
  let dummyDbSign: DbSign;

  beforeAll(() => {
    dummySign = {
      tripId: 'tripId',
      starId: 'starId',
    };
    dummyDbSign = {
      projectEntity: SadalsuudEntity.sign,
      creationId: 'testId',
      ...dummySign,
    };
  });

  beforeEach(() => {
    mockDbService = { putItem: jest.fn(), query: jest.fn(() => [dummyDbSign]) };
    mockUserService = {};
    mockLineBotService = { pushMessage: jest.fn() };
    mockValidator = { validateSign: jest.fn() };

    bindings.rebind<DbServiceBak>(DbServiceBak).toConstantValue(mockDbService);
    bindings.rebind<UserService>(UserService).toConstantValue(mockUserService);
    bindings
      .rebind<LineBotService>(LineBotService)
      .toConstantValue(mockLineBotService);
    bindings.rebind<Validator>(Validator).toConstantValue(mockValidator);

    signService = bindings.get<SignService>(SignService);
  });

  it('addSign should work', async () => {
    await signService.addSign(dummySign);

    expect(mockDbService.putItem).toBeCalledTimes(1);
  });

  it('getSign should work', async () => {
    expect(await signService.getSign('abc')).toStrictEqual([dummyDbSign]);
  });
});
