import { DynamoDB } from 'aws-sdk';
import { Converter } from 'aws-sdk/clients/dynamodb';
import { bindings } from 'src/bindings';
import { Doc } from 'src/model/DbBase';
import {
  data2Record,
  entity,
  primaryAttribute,
  relatedAttributeMany,
} from 'src/util/DbHelper';
import { DbService } from './DbService';
import { awsMock } from 'test/awsMock';

type TestUser = {
  id: string;
  name: string;
  pet: string[];
};

/**
 * test entity user for unit test
 */
@entity('user')
class TestUserEntity implements TestUser {
  @primaryAttribute()
  public id: string;
  public name: string;
  @relatedAttributeMany('testPet')
  public pet: string[];

  constructor(input: TestUser) {
    this.id = input.id;
    this.name = input.name;
    this.pet = input.pet;
  }
}

/**
 * Tests of the DbService class.
 */
describe('DbService', () => {
  let dbService: DbService;
  let mockDynamoDb: any;
  let dummyUser: TestUser;
  const alias = 'a';

  beforeAll(() => {
    process.env.ALIAS = alias;
    dummyUser = {
      id: '000',
      name: 'user-name',
      pet: ['001', '002'],
    };
  });

  beforeEach(() => {
    mockDynamoDb = {};
    bindings.rebind<DynamoDB>(DynamoDB).toConstantValue(mockDynamoDb);

    mockDynamoDb.putItem = jest.fn().mockReturnValue(awsMock(undefined));
    mockDynamoDb.deleteItem = jest.fn().mockReturnValue(awsMock(undefined));

    dbService = bindings.get<DbService>(DbService);
  });

  describe('createItem', () => {
    it('should work', async () => {
      mockDynamoDb.query = jest.fn().mockReturnValueOnce(awsMock({ Count: 0 }));

      await dbService.createItem(new TestUserEntity(dummyUser));
      expect(mockDynamoDb.putItem).toBeCalledTimes(4);
    });

    it('should fail if item exists', async () => {
      mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Count: 1 }));

      await expect(() =>
        dbService.createItem(new TestUserEntity(dummyUser))
      ).rejects.toThrowError('a#user#000 is already exist');
    });

    it('should fail if create twice', async () => {
      const newUser = new TestUserEntity(dummyUser);

      mockDynamoDb.query = jest
        .fn()
        .mockReturnValueOnce(awsMock({ Count: 0 }))
        .mockReturnValueOnce(awsMock({ Count: 1 }));

      await dbService.createItem(newUser);
      await expect(() => dbService.createItem(newUser)).rejects.toThrowError(
        'a#user#000 is already exist'
      );
      expect(mockDynamoDb.putItem).toBeCalledTimes(4);
    });
  });

  describe('putItem', () => {
    it('should work', async () => {
      const oldUser = data2Record(new TestUserEntity(dummyUser), 'a');
      const newUser = new TestUserEntity({
        id: dummyUser.id,
        name: 'user-name-new',
        pet: ['001', '003'],
      });
      mockDynamoDb.query = jest.fn().mockReturnValueOnce(
        awsMock({
          Items: oldUser.map((v: Doc) => Converter.marshall(v)),
        })
      );

      await dbService.putItem(newUser);
      expect(mockDynamoDb.deleteItem).toBeCalledTimes(1);
      expect(mockDynamoDb.putItem).toBeCalledTimes(2);
    });

    it('should work if item does not exist', async () => {
      const updatedUser = new TestUserEntity(dummyUser);

      mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Count: 0 }));

      await expect(() => dbService.putItem(updatedUser)).rejects.toThrowError(
        'a#user#000 is not found'
      );
    });
  });

  describe('getItem', () => {
    it('should work', async () => {
      const items: Doc[] = data2Record(new TestUserEntity(dummyUser), 'a');
      mockDynamoDb.query = jest
        .fn()
        .mockReturnValueOnce(
          awsMock({ Items: items.map((v) => Converter.marshall(v)) })
        );

      expect(await dbService.getItem('user', '000')).toStrictEqual(dummyUser);
    });

    it('should fail if aws-sdk not work', async () => {
      mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({}));

      await expect(() =>
        dbService.getItem('test-schemma', 'test-id')
      ).rejects.toThrowError('query result from DynamoDb is undefined');
    });
  });

  describe('getItems', () => {
    it('should work', async () => {
      const items: Doc[] = data2Record(new TestUserEntity(dummyUser), 'a');
      mockDynamoDb.query = jest
        .fn()
        .mockReturnValueOnce(
          awsMock({
            Items: [Converter.marshall({ pk: 'a#user', sk: 'a#user#001' })],
          })
        )
        .mockReturnValueOnce(
          awsMock({ Items: items.map((v) => Converter.marshall(v)) })
        );

      expect(await dbService.getItems('user')).toStrictEqual([dummyUser]);
    });

    it('should fail if aws-sdk not work', async () => {
      mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({}));

      await expect(() =>
        dbService.getItems('test-schemma')
      ).rejects.toThrowError('query result from DynamoDb is undefined');
    });
  });

  describe('deleteItem', () => {
    it('should work', async () => {
      const mainItem = { pk: 'a#user#000', sk: 'a#user#000' };
      const relatedItem = { pk: 'a#user', sk: 'a#user#000' };
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

    it('should fail if it is linked', async () => {
      const mainItem = { pk: 'a#user#000', sk: 'a#user#000' };
      const relatedItem = { pk: 'a#user', sk: 'a#user#000' };
      const relatedItemLinked = { pk: 'a#group#001', sk: 'a#user#000' };
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

    it('should fail if no data', async () => {
      mockDynamoDb.query = jest.fn().mockReturnValue(awsMock({ Items: [] }));

      await expect(() =>
        dbService.deleteItem('user', '000')
      ).rejects.toThrowError('a#user#000 is not found');
    });
  });

  describe('getItemsByIndex', () => {
    it('should work', async () => {
      mockDynamoDb.query = jest
        .fn()
        .mockReturnValueOnce(
          awsMock({
            Items: [
              Converter.marshall({ pk: 'a#test#000', sk: 'sk', a: 1, b: 2 }),
              Converter.marshall({ pk: 'a#test#001', sk: 'sk', a: 3, b: 4 }),
              Converter.marshall({ pk: 'a#other#002', sk: 'sk', a: 5, b: 6 }),
            ],
          })
        )
        .mockReturnValueOnce(
          awsMock({
            Items: [Converter.marshall({ pk: 'pk', sk: 'sk', a: 1, b: 2 })],
          })
        )
        .mockReturnValue(
          awsMock({
            Items: [Converter.marshall({ pk: 'pk', sk: 'sk', a: 3, b: 4 })],
          })
        );

      expect(
        await dbService.getItemsByIndex('test', 'index-schema', 'index-id')
      ).toStrictEqual([
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ]);
      expect(mockDynamoDb.query).toBeCalledTimes(3);
    });
  });
});
