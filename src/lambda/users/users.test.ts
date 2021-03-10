import { bindings } from 'src/bindings';
import { LambdaContext } from 'src/lambda/LambdaContext';
import { users } from 'src/lambda/users/users';
import { UsersEvent } from 'src/lambda/users/UsersEvent';
import { LineEntity } from 'src/model/DbKey';
import { DbUser, Role } from 'src/model/User';
import { UserService } from 'src/services/UserService';
import { successOutput } from 'src/util/LambdaOutput';

/**
 * Tests of the users function.
 */
describe('users', () => {
  let event: UsersEvent;
  let lambdaContext: LambdaContext | undefined;
  let mockUserService: any;
  let dummyUser: DbUser;

  beforeAll(() => {
    dummyUser = {
      projectEntity: LineEntity.user,
      creationId: 'testId',
      lineUserId: 'testLineUserId',
      role: Role.STAR_RAIN,
      joinSession: 30,
      phone: 'testPhone',
      trips: [],
    };
  });

  beforeEach(() => {
    lambdaContext = { awsRequestId: '456' };

    // prepare mock mockUserService
    mockUserService = {};
    bindings.rebind<UserService>(UserService).toConstantValue(mockUserService);

    mockUserService.getUser = jest.fn(() => dummyUser);
    mockUserService.addUser = jest.fn();
  });

  it('GET should work', async () => {
    event = {
      httpMethod: 'GET',
      body: null,
      pathParameters: { id: 'abc' },
    };
    await expect(users(event, lambdaContext)).resolves.toStrictEqual(
      successOutput(dummyUser)
    );
    expect(mockUserService.getUser).toBeCalledTimes(1);
  });

  it('GET should fail with null parameter', async () => {
    event = {
      httpMethod: 'GET',
      body: null,
      pathParameters: null,
    };
    await expect(users(event, lambdaContext)).rejects.toThrow(
      'null path parameter'
    );
  });

  it('POST should work', async () => {
    event = {
      httpMethod: 'POST',
      body: JSON.stringify(dummyUser),
      pathParameters: null,
    };
    await users(event, lambdaContext);
    expect(mockUserService.addUser).toBeCalledTimes(1);
  });

  it('POST should fail with null body', async () => {
    event = {
      httpMethod: 'POST',
      body: null,
      pathParameters: null,
    };
    await expect(users(event, lambdaContext)).rejects.toThrow('null body');
  });

  it('should fail with unknown method', async () => {
    event = {
      httpMethod: 'UNKNONW',
      body: null,
      pathParameters: null,
    };
    await expect(users(event, lambdaContext)).rejects.toThrow(
      'unknown http method'
    );
  });
});
