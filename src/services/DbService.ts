import { DynamoDB } from 'aws-sdk';
import {
  AttributeMap,
  Converter,
  GetItemInput,
  PutItemInput,
  QueryInput,
} from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';
import { ConflictError, InternalServerError, NotFoundError } from 'src/error';
import { Base } from 'src/model/DbBase';
import { data2Record, record2Data } from 'src/util/DbHelper';
import { differenceBy, intersectionByAndDifference } from 'src/util/setTheory';

/**
 * Service class for AWS dynamoDB
 */
@injectable()
export class DbService {
  @inject(DynamoDB)
  private readonly dynamoDb!: DynamoDB;
  private readonly tableName: string = `celestial-db-${process.env.ENVR}`;
  private readonly alias: string = process.env.ALIAS ?? 'undefined';

  private async checkIfItemExist(pk: string): Promise<any> {
    const params: QueryInput = {
      TableName: this.tableName,
      Select: 'COUNT',
      ExpressionAttributeValues: {
        ':pk': { S: pk },
      },
      KeyConditionExpression: 'pk = :pk',
    };
    const res = await this.dynamoDb.query(params).promise();

    if (res.Count !== undefined && res.Count > 0)
      throw new ConflictError(`${pk} is already exist`);
  }

  public async createItem<T>(item: T): Promise<void> {
    const record = data2Record(item, this.alias);
    await this.checkIfItemExist(record[0].pk);

    await Promise.all(
      record.map(async (v: Base & { [key: string]: any }) => {
        const params: PutItemInput = {
          TableName: this.tableName,
          Item: Converter.marshall(v),
        };

        return this.dynamoDb.putItem(params).promise();
      })
    );

    await this.updateListItem(record[0].pk);
  }

  public async deleteItem(schema: string, id: string): Promise<void> {
    const primaryKey = `${this.alias}#${schema}#${id}`;

    // prepare items with pk=primarKey or sk=primaryKey
    const [mainItem, relatedItem] = await Promise.all([
      this.getRawItem(primaryKey),
      this.getRawItemByIndex(primaryKey),
    ]);

    if (relatedItem.length > 2)
      throw new ConflictError(
        `${primaryKey} is linked by other schema, please delete linked items first`
      );

    await Promise.all([
      ...mainItem.map(async (v: Base & { [key: string]: any }) => {
        return this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: { S: v.pk }, sk: { S: v.sk } },
          })
          .promise();
      }),
      ...relatedItem
        .filter((v: Base & { [key: string]: any }) => v.pk !== v.sk)
        .map(async (v: Base & { [key: string]: any }) => {
          return this.dynamoDb
            .deleteItem({
              TableName: this.tableName,
              Key: { pk: { S: v.pk }, sk: { S: v.sk } },
            })
            .promise();
        }),
    ]);
  }

  public async putItem<T>(item: T): Promise<void> {
    const newRecord = data2Record(item, this.alias);
    const [oldRecord, relatedItem] = await Promise.all([
      this.getRawItem(newRecord[0].pk),
      this.getRawItemByIndex(newRecord[0].pk),
    ]);
    const schema = newRecord[0].pk.split('#')[1];

    const itemToDelete = differenceBy(oldRecord, newRecord, 'sk');
    const itemToPut = intersectionByAndDifference(newRecord, oldRecord, 'sk');
    const itemToAdd = differenceBy(newRecord, oldRecord, 'sk');

    await Promise.all([
      ...[...itemToPut, ...itemToAdd].map(
        async (v: Base & { [key: string]: any }) => {
          return this.dynamoDb
            .putItem({
              TableName: this.tableName,
              Item: Converter.marshall(v),
            })
            .promise();
        }
      ),
      ...itemToDelete.map(async (v: Base & { [key: string]: any }) => {
        return this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: { S: v.pk }, sk: { S: v.sk } },
          })
          .promise();
      }),
      ...relatedItem
        .filter(
          (v: Base & { [key: string]: any }) =>
            v.pk !== v.sk && v.pk !== `${this.alias}#${schema}`
        )
        .map(async (v: Base & { [key: string]: any }) => {
          return this.dynamoDb
            .putItem({
              TableName: this.tableName,
              Item: Converter.marshall({
                ...newRecord[0],
                pk: v.pk,
                attribute: v.attribute,
              }),
            })
            .promise();
        }),
    ]);

    await Promise.all([
      this.updateListItem<T>(newRecord[0].pk),
      ...relatedItem
        .filter(
          (v: Base & { [key: string]: any }) =>
            v.pk !== v.sk && v.pk !== `${this.alias}#${schema}`
        )
        .map(async (v: Base & { [key: string]: any }) => {
          return this.updateListItem(v.pk);
        }),
    ]);
  }

  private async updateListItem<T>(pk: string): Promise<void> {
    const raw = await this.getRawItem(pk);
    const res = record2Data<T>(raw);

    const alias = pk.split('#')[0];
    const schema = pk.split('#')[1];
    const putItemParams: PutItemInput = {
      TableName: this.tableName,
      Item: Converter.marshall({ pk: `${alias}#${schema}`, sk: pk, ...res }),
    };
    await this.dynamoDb.putItem(putItemParams).promise();
  }

  private async getRawItem(
    pk: string
  ): Promise<(Base & { [key: string]: any })[]> {
    const params: QueryInput = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':pk': { S: pk },
      },
      KeyConditionExpression: 'pk = :pk',
    };
    const raw = await this.dynamoDb.query(params).promise();
    if (raw.Items === undefined || raw.Items.length === 0)
      throw new NotFoundError(`${pk} is not found`);

    return raw.Items.map((v: AttributeMap) => {
      return Converter.unmarshall(v) as Base & { [key: string]: any };
    });
  }

  private async getRawItemByIndex(
    sk: string
  ): Promise<(Base & { [key: string]: any })[]> {
    const params: QueryInput = {
      TableName: this.tableName,
      IndexName: 'sk-pk-index',
      ExpressionAttributeValues: {
        ':sk': { S: sk },
      },
      KeyConditionExpression: 'sk = :sk',
    };
    const raw = await this.dynamoDb.query(params).promise();
    if (raw.Items === undefined || raw.Items.length === 0)
      throw new NotFoundError(`${sk} is not found`);

    return raw.Items.map((v: AttributeMap) => {
      return Converter.unmarshall(v) as Base & { [key: string]: any };
    });
  }

  public async getItem<T>(schema: string, id: string): Promise<T> {
    const params: GetItemInput = {
      TableName: this.tableName,
      Key: {
        pk: { S: `${this.alias}#${schema}` },
        sk: { S: `${this.alias}#${schema}#${id}` },
      },
    };
    const raw = await this.dynamoDb.getItem(params).promise();
    if (raw.Item === undefined)
      throw new InternalServerError(
        'getItem result from DynamoDb is undefined'
      );

    const { pk, sk, attribute, ...rest } = Converter.unmarshall(
      raw.Item
    ) as Base & { [key: string]: any };

    return rest as T;
  }

  public async getItems<T>(schema: string): Promise<T[]> {
    const params: QueryInput = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':pk': { S: `${this.alias}#${schema}` },
      },
      KeyConditionExpression: 'pk = :pk',
    };
    const raw = await this.dynamoDb.query(params).promise();
    if (raw.Items === undefined)
      throw new InternalServerError('query result from DynamoDb is undefined');

    return raw.Items.map((v: AttributeMap) => {
      const { pk, sk, attribute, ...rest } = Converter.unmarshall(v) as Base & {
        [key: string]: any;
      };

      return rest as T;
    });
  }

  public async getItemsByIndex<T>(
    schema: string,
    indexSchema: string,
    indexId: string
  ): Promise<T[]> {
    const items = await this.getRawItemByIndex(
      `${this.alias}#${indexSchema}#${indexId}`
    );
    const promiseGetItems = items
      .filter((v: Base & { [key: string]: any }) =>
        v.pk.startsWith(`${this.alias}#${schema}`)
      )
      .map((v: Base & { [key: string]: any }) =>
        this.getItem<T>(schema, v.pk.split('#')[2])
      );

    return await Promise.all(promiseGetItems);
  }
}
