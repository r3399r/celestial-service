import { DynamoDB } from 'aws-sdk';
import {
  Converter,
  GetItemOutput,
  QueryOutput,
} from 'aws-sdk/clients/dynamodb';
import { bindings } from 'src/bindings';
import { SadalsuudEntity } from 'src/model/DbKey';
import { AWSMockUtil } from 'test/AWSMockUtil';
import { DbServiceBak } from './DbServiceBak';

interface DummyType {
  a: string;
}

/**
 * Tests of the DbService class.
 */
describe('DbService', () => {
  let dbService: DbServiceBak;
  let mockDynamoDb: any;
  let dummyItem: DummyType;

  beforeAll(() => {
    dummyItem = { a: 'testA' };
  });

  beforeEach(() => {
    mockDynamoDb = {};
    bindings.rebind<DynamoDB>(DynamoDB).toConstantValue(mockDynamoDb);

    dbService = bindings.get<DbServiceBak>(DbServiceBak);
  });

  it('putItem should work', async () => {
    mockDynamoDb.putItem = AWSMockUtil.mockRequest(undefined);

    await dbService.putItem<DummyType>(dummyItem);
    expect(mockDynamoDb.putItem).toBeCalledTimes(1);
  });

  it('putItems should work', async () => {
    mockDynamoDb.putItem = AWSMockUtil.mockRequest(undefined);

    await dbService.putItems<DummyType>([dummyItem, dummyItem]);
    expect(mockDynamoDb.putItem).toBeCalledTimes(2);
  });

  it('getItem should work', async () => {
    mockDynamoDb.getItem = AWSMockUtil.mockRequest<GetItemOutput>({
      Item: Converter.marshall(dummyItem),
    });

    const res: DummyType | null = await dbService.getItem<DummyType>({
      projectEntity: SadalsuudEntity.trip,
      creationId: 'testId',
    });
    expect(res).toStrictEqual(dummyItem);
    expect(mockDynamoDb.getItem).toBeCalledTimes(1);
  });

  it('getItem should return empty array', async () => {
    mockDynamoDb.getItem = AWSMockUtil.mockRequest<GetItemOutput>({});

    const res: DummyType | null = await dbService.getItem<DummyType>({
      projectEntity: SadalsuudEntity.trip,
      creationId: 'testId',
    });
    expect(res).toBeNull();
    expect(mockDynamoDb.getItem).toBeCalledTimes(1);
  });

  it('query should work', async () => {
    mockDynamoDb.query = AWSMockUtil.mockRequest<QueryOutput>({
      Items: [Converter.marshall(dummyItem)],
    });

    const res: DummyType[] = await dbService.query<DummyType>(
      SadalsuudEntity.trip
    );
    expect(res).toStrictEqual([dummyItem]);
    expect(mockDynamoDb.query).toBeCalledTimes(1);
  });

  it('query should work with filterKeyVal', async () => {
    mockDynamoDb.query = AWSMockUtil.mockRequest<QueryOutput>({
      Items: [Converter.marshall(dummyItem)],
    });

    const res: DummyType[] = await dbService.query<DummyType>(
      SadalsuudEntity.trip,
      [{ key: 'key', value: 'value' }]
    );
    expect(res).toStrictEqual([dummyItem]);
    expect(mockDynamoDb.query).toBeCalledTimes(1);
  });

  it('query should return empty array', async () => {
    mockDynamoDb.query = AWSMockUtil.mockRequest<QueryOutput>({});

    const res: DummyType[] = await dbService.query<DummyType>(
      SadalsuudEntity.trip
    );
    expect(res).toStrictEqual([]);
    expect(mockDynamoDb.query).toBeCalledTimes(1);
  });
});
