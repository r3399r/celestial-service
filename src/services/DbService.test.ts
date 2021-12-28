import { DynamoDB } from 'aws-sdk';
import { Converter } from 'aws-sdk/clients/dynamodb';
import { bindings } from 'src/bindings';
import { ERROR_CODE } from 'src/constant/error';
import { entity, primaryAttribute } from 'src/util/DbHelper';
import { awsMock } from 'test/awsMock';
import { DbService } from './DbService';

type TestUser = {
  id: string;
  name: string;
};

/**
 * test entity user for unit test
 */
@entity('user')
class TestUserEntity implements TestUser {
  @primaryAttribute()
  public id: string;
  public name: string;

  constructor(input: TestUser) {
    this.id = input.id;
    this.name = input.name;
  }
}

/**
 * Tests of the DbService class.
 */
describe('DbService', () => {
  let dbService: DbService;
  let mockDynamoDb: any;

  beforeEach(() => {
    mockDynamoDb = {};
    bindings.rebind<DynamoDB>(DynamoDB).toConstantValue(mockDynamoDb);

    mockDynamoDb.putItem = jest.fn().mockReturnValue(awsMock(undefined));
    mockDynamoDb.deleteItem = jest.fn().mockReturnValue(awsMock(undefined));

    dbService = bindings.get<DbService>(DbService);
  });

  it('createItem should work', async () => {
    const newUser = new TestUserEntity({
      id: 'test-id',
      name: 'test-name',
    });

    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(awsMock({ Count: 0 }))
      .mockReturnValue(awsMock({ Items: [Converter.marshall(newUser)] }));

    await dbService.createItem('alias', newUser);
    expect(mockDynamoDb.putItem).toBeCalledTimes(2);
  });

  it('createItem should fail if insert fail', async () => {
    const newUser = new TestUserEntity({
      id: 'test-id',
      name: 'test-name',
    });

    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(awsMock({ Count: 0 }))
      .mockReturnValue(awsMock({ Count: 1 }));

    await expect(() =>
      dbService.createItem('alias', newUser)
    ).rejects.toThrowError(ERROR_CODE.UNEXPECTED_ERROR);
  });

  it('createItem should fail if item exists', async () => {
    const newUser = new TestUserEntity({
      id: 'test-id',
      name: 'test-name',
    });

    mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Count: 1 }));

    await expect(() =>
      dbService.createItem('alias', newUser)
    ).rejects.toThrowError(ERROR_CODE.RECORD_EXIST);
  });

  it('putItem should work', async () => {
    const updatedUser = new TestUserEntity({
      id: 'test-id',
      name: 'test-name',
    });

    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(awsMock({ Count: 1 }))
      .mockReturnValue(awsMock({ Items: [Converter.marshall(updatedUser)] }));

    await dbService.putItem('alias', updatedUser);
    expect(mockDynamoDb.putItem).toBeCalledTimes(2);
  });

  it('putItem should work if item does not exist', async () => {
    const updatedUser = new TestUserEntity({
      id: 'test-id',
      name: 'test-name',
    });

    mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Count: 0 }));

    await expect(() =>
      dbService.putItem('alias', updatedUser)
    ).rejects.toThrowError(ERROR_CODE.RECORD_NOT_FOUND);
  });

  it('getItem should work', async () => {
    mockDynamoDb.getItem = jest.fn().mockReturnValue(
      awsMock({
        Item: Converter.marshall({ pk: 'pk', sk: 'sk', a: 1, b: 2 }),
      })
    );

    expect(
      await dbService.getItem('test-alias', 'test-schemma', 'test-id')
    ).toStrictEqual({ a: 1, b: 2 });
  });

  it('getItem should fail if not found', async () => {
    mockDynamoDb.getItem = jest.fn().mockReturnValue(awsMock({}));

    await expect(() =>
      dbService.getItem('test-alias', 'test-schemma', 'test-id')
    ).rejects.toThrowError(ERROR_CODE.RECORD_NOT_FOUND);
  });

  it('getItems should work', async () => {
    mockDynamoDb.query = jest.fn().mockReturnValue(
      awsMock({
        Items: [Converter.marshall({ pk: 'pk', sk: 'sk', a: 1, b: 2 })],
      })
    );

    expect(
      await dbService.getItems('test-alias', 'test-schemma')
    ).toStrictEqual([{ a: 1, b: 2 }]);
  });

  it('getItems should fail if not found', async () => {
    mockDynamoDb.query = jest.fn().mockReturnValue(awsMock([]));

    await expect(() =>
      dbService.getItems('test-alias', 'test-schemma')
    ).rejects.toThrowError(ERROR_CODE.RECORD_NOT_FOUND);
  });

  it('deleteItem should work', async () => {
    const mainItem = { pk: 'pk1', sk: 'pk1', a: 1 };
    const relatedItem = { pk: 'pk2', sk: 'pk1', b: 2 };
    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(awsMock({ Items: [Converter.marshall(mainItem)] }))
      .mockReturnValueOnce(
        awsMock({ Items: [Converter.marshall(relatedItem)] })
      )
      .mockReturnValue(awsMock({ Items: [Converter.marshall(relatedItem)] }));

    await dbService.deleteItem('test-alias', 'test-schema', 'test-key');
    expect(mockDynamoDb.deleteItem).toBeCalledTimes(2);
  });

  it('deleteItem should fail if no data', async () => {
    mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Items: [] }));

    await expect(() =>
      dbService.deleteItem('test-alias', 'test-schema', 'test-key')
    ).rejects.toThrowError(ERROR_CODE.RECORD_NOT_FOUND);
  });
});
