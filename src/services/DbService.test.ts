import { DynamoDB } from 'aws-sdk';
import { Converter } from 'aws-sdk/clients/dynamodb';
import { bindings } from 'src/bindings';
import { Base } from 'src/model/DbBase';
import {
  data2Record,
  entity,
  primaryAttribute,
  relatedAttributeMany,
} from 'src/util/DbHelper';
import { awsMock } from 'test/awsMock';
import { DbService } from './DbService';

type TestUser = {
  id: string;
  name: string;
  pet: TestPet[];
};

type TestPet = {
  id: string;
  isDog: boolean;
};

/**
 * test entity pet for unit test
 */
@entity('pet')
class TestPetEntity implements TestPet {
  @primaryAttribute()
  public id: string;
  public isDog: boolean;

  constructor(input: TestPet) {
    this.id = input.id;
    this.isDog = input.isDog;
  }
}

/**
 * test entity user for unit test
 */
@entity('user')
class TestUserEntity implements TestUser {
  @primaryAttribute()
  public id: string;
  public name: string;
  @relatedAttributeMany()
  public pet: TestPet[];

  constructor(input: TestUser) {
    this.id = input.id;
    this.name = input.name;
    this.pet = input.pet.map((v: TestPet) => new TestPetEntity(v));
  }
}

/**
 * Tests of the DbService class.
 */
describe('DbService', () => {
  let dbService: DbService;
  let mockDynamoDb: any;
  let dummyUser: TestUser;
  const alias: string = 'a';

  beforeAll(() => {
    process.env.ALIAS = alias;
    dummyUser = {
      id: '000',
      name: 'user-name',
      pet: [
        {
          id: '001',
          isDog: true,
        },
        {
          id: '002',
          isDog: false,
        },
      ],
    };
  });

  beforeEach(() => {
    mockDynamoDb = {};
    bindings.rebind<DynamoDB>(DynamoDB).toConstantValue(mockDynamoDb);

    mockDynamoDb.putItem = jest.fn().mockReturnValue(awsMock(undefined));
    mockDynamoDb.deleteItem = jest.fn().mockReturnValue(awsMock(undefined));

    dbService = bindings.get<DbService>(DbService);
  });

  it('createItem should work', async () => {
    const newUser = new TestUserEntity(dummyUser);

    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(awsMock({ Count: 0 }))
      .mockReturnValueOnce(awsMock({ Items: [Converter.marshall(newUser)] }))
      .mockReturnValue(awsMock({ Items: [] }));

    await dbService.createItem(newUser);
    expect(mockDynamoDb.putItem).toBeCalledTimes(4);
  });

  it('createItem should fail if insert fail', async () => {
    const newUser = new TestUserEntity(dummyUser);

    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(awsMock({ Count: 0 }))
      .mockReturnValue(awsMock({ Count: 1 }));

    await expect(() => dbService.createItem(newUser)).rejects.toThrowError(
      'a#user#000 is not found'
    );
  });

  it('createItem should fail if item exists', async () => {
    const newUser = new TestUserEntity(dummyUser);

    mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Count: 1 }));

    await expect(() => dbService.createItem(newUser)).rejects.toThrowError(
      'a#user#000 is already exist'
    );
  });

  it('putItem should work', async () => {
    const oldUser = data2Record(new TestUserEntity(dummyUser), 'a');
    const newUser = new TestUserEntity({
      id: dummyUser.id,
      name: 'user-name-new',
      pet: [
        {
          id: '001',
          isDog: true,
        },
        {
          id: '003',
          isDog: false,
        },
      ],
    });

    const mainItem = {
      pk: 'a#user#000',
      sk: 'a#user#000',
      id: '000',
      name: 'user-name',
    };
    const relatedItem = { pk: 'a#user', sk: 'a#user#000', id: '000' };
    const relatedItemLink = { pk: 'a#group', sk: 'a#user#000', id: '010' };

    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(
        awsMock({
          Items: oldUser.map((v: Base & { [key: string]: any }) =>
            Converter.marshall(v)
          ),
        })
      )
      .mockReturnValue(
        awsMock({
          Items: [
            Converter.marshall(mainItem),
            Converter.marshall(relatedItem),
            Converter.marshall(relatedItemLink),
          ],
        })
      );

    await dbService.putItem(newUser);
    expect(mockDynamoDb.deleteItem).toBeCalledTimes(1);
    expect(mockDynamoDb.putItem).toBeCalledTimes(5);
  });

  it('putItem should work if item does not exist', async () => {
    const updatedUser = new TestUserEntity(dummyUser);

    mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Count: 0 }));

    await expect(() => dbService.putItem(updatedUser)).rejects.toThrowError(
      'a#user#000 is not found'
    );
  });

  it('getItem should work', async () => {
    mockDynamoDb.getItem = jest.fn().mockReturnValue(
      awsMock({
        Item: Converter.marshall({ pk: 'pk', sk: 'sk', a: 1, b: 2 }),
      })
    );

    expect(await dbService.getItem('test-schemma', 'test-id')).toStrictEqual({
      a: 1,
      b: 2,
    });
  });

  it('getItem should fail if aws-sdk not work', async () => {
    mockDynamoDb.getItem = jest.fn().mockReturnValue(awsMock({}));

    await expect(() =>
      dbService.getItem('test-schemma', 'test-id')
    ).rejects.toThrowError('getItem result from DynamoDb is undefined');
  });

  it('getItems should work', async () => {
    mockDynamoDb.query = jest.fn().mockReturnValue(
      awsMock({
        Items: [Converter.marshall({ pk: 'pk', sk: 'sk', a: 1, b: 2 })],
      })
    );

    expect(await dbService.getItems('test-schemma')).toStrictEqual([
      { a: 1, b: 2 },
    ]);
  });

  it('getItems should fail if aws-sdk not work', async () => {
    mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({}));

    await expect(() => dbService.getItems('test-schemma')).rejects.toThrowError(
      'query result from DynamoDb is undefined'
    );
  });

  it('deleteItem should work', async () => {
    const mainItem = { pk: 'a#user#000', sk: 'a#user#000', a: 1 };
    const relatedItem = { pk: 'a#user', sk: 'a#user#000', a: 1 };
    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(awsMock({ Items: [Converter.marshall(mainItem)] }))
      .mockReturnValueOnce(
        awsMock({
          Items: [
            Converter.marshall(mainItem),
            Converter.marshall(relatedItem),
          ],
        })
      );

    await dbService.deleteItem('test-schema', 'test-key');
    expect(mockDynamoDb.deleteItem).toBeCalledTimes(2);
  });

  it('deleteItem should fail if it is linked', async () => {
    const mainItem = { pk: 'a#user#000', sk: 'a#user#000', a: 1 };
    const relatedItem = { pk: 'a#user', sk: 'a#user#000', a: 1 };
    const relatedItemLinked = { pk: 'a#group#001', sk: 'a#user#000', b: 2 };
    mockDynamoDb.query = jest
      .fn()
      .mockReturnValueOnce(awsMock({ Items: [Converter.marshall(mainItem)] }))
      .mockReturnValueOnce(
        awsMock({
          Items: [
            Converter.marshall(mainItem),
            Converter.marshall(relatedItem),
            Converter.marshall(relatedItemLinked),
          ],
        })
      );

    await expect(() =>
      dbService.deleteItem('user', '000')
    ).rejects.toThrowError(
      'a#user#000 is linked by other schema, please delete linked items first'
    );
  });

  it('deleteItem should fail if no data', async () => {
    mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Items: [] }));

    await expect(() =>
      dbService.deleteItem('user', '000')
    ).rejects.toThrowError('a#user#000 is not found');
  });

  it('getItemsByIndex should work', async () => {
    mockDynamoDb.query = jest.fn().mockReturnValue(
      awsMock({
        Items: [
          Converter.marshall({ pk: 'a#test#000', sk: 'sk', a: 1, b: 2 }),
          Converter.marshall({ pk: 'a#test#001', sk: 'sk', a: 3, b: 4 }),
          Converter.marshall({ pk: 'a#other#002', sk: 'sk', a: 5, b: 6 }),
        ],
      })
    );
    mockDynamoDb.getItem = jest.fn().mockReturnValue(
      awsMock({
        Item: Converter.marshall({ pk: 'pk', sk: 'sk', a: 1, b: 2 }),
      })
    );

    expect(
      await dbService.getItemsByIndex('test', 'index-schema', 'index-id')
    ).toStrictEqual([
      { a: 1, b: 2 },
      { a: 1, b: 2 },
    ]);
    expect(mockDynamoDb.query).toBeCalledTimes(1);
    expect(mockDynamoDb.getItem).toBeCalledTimes(2);
    expect(mockDynamoDb.getItem).toBeCalledWith({
      TableName: 'celestial-db-undefined',
      Key: {
        pk: { S: `a#test` },
        sk: { S: `a#test#000` },
      },
    });
    expect(mockDynamoDb.getItem).toBeCalledWith({
      TableName: 'celestial-db-undefined',
      Key: {
        pk: { S: `a#test` },
        sk: { S: `a#test#001` },
      },
    });
  });
});
