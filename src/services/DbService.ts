import { DynamoDB } from 'aws-sdk';
import {
  AttributeMap,
  Converter,
  GetItemInput,
  PutItemInput,
  QueryInput,
} from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';
import { ERROR_CODE } from 'src/constant/error';
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
      throw new Error(ERROR_CODE.RECORD_EXIST);
  }

  public async createItem<T>(alias: string, item: T): Promise<void> {
    const record = data2Record(item, alias);
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

  public async deleteItem(
    alias: string,
    schema: string,
    key: string
  ): Promise<void> {
    const primaryKey = `${alias}#${schema}#${key}`;

    // prepare items with pk=primarKey or sk=primaryKey
    const [mainItem, relatedItem] = await Promise.all([
      this.dynamoDb
        .query({
          TableName: this.tableName,
          ExpressionAttributeValues: {
            ':pk': { S: primaryKey },
          },
          KeyConditionExpression: 'pk = :pk',
        })
        .promise(),
      this.dynamoDb
        .query({
          TableName: this.tableName,
          IndexName: 'sk-pk-index',
          ExpressionAttributeValues: {
            ':sk': { S: primaryKey },
          },
          KeyConditionExpression: 'sk = :sk',
          FilterExpression: 'pk <> :sk',
        })
        .promise(),
    ]);

    if (
      mainItem.Items === undefined ||
      mainItem.Items.length === 0 ||
      relatedItem.Items === undefined ||
      relatedItem.Items.length === 0
    )
      throw new Error(ERROR_CODE.RECORD_NOT_FOUND);

    await Promise.all([
      ...mainItem.Items.map(async (v: AttributeMap) => {
        return this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: v.pk, sk: v.sk },
          })
          .promise();
      }),
      ...relatedItem.Items.map(async (v: AttributeMap) => {
        return this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: v.pk, sk: v.sk },
          })
          .promise();
      }),
    ]);

    await Promise.all(
      relatedItem.Items.map(async (v: AttributeMap) => {
        return this.updateListItem(v.pk.S as string);
      })
    );
  }

  public async putItem<T>(alias: string, item: T): Promise<void> {
    const newRecord = data2Record(item, alias);
    const oldRecord = await this.getRawItem(newRecord[0].pk);

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
    ]);

    await this.updateListItem<T>(newRecord[0].pk);
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
      throw new Error(ERROR_CODE.RECORD_NOT_FOUND);

    return raw.Items.map((v: AttributeMap) => {
      return Converter.unmarshall(v) as Base & { [key: string]: any };
    });
  }

  public async getItem<T>(
    alias: string,
    schema: string,
    id: string
  ): Promise<T> {
    const params: GetItemInput = {
      TableName: this.tableName,
      Key: {
        pk: { S: `${alias}#${schema}` },
        sk: { S: `${alias}#${schema}#${id}` },
      },
    };
    const raw = await this.dynamoDb.getItem(params).promise();
    if (raw.Item === undefined) throw new Error(ERROR_CODE.RECORD_NOT_FOUND);

    const { pk, sk, attribute, ...rest } = Converter.unmarshall(
      raw.Item
    ) as Base & { [key: string]: any };

    return rest as T;
  }

  public async getItems<T>(alias: string, schema: string): Promise<T[]> {
    const params: QueryInput = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':pk': { S: `${alias}#${schema}` },
      },
      KeyConditionExpression: 'pk = :pk',
    };
    const raw = await this.dynamoDb.query(params).promise();
    if (raw.Items === undefined || raw.Items.length === 0)
      throw new Error(ERROR_CODE.RECORD_NOT_FOUND);

    return raw.Items.map((v: AttributeMap) => {
      const { pk, sk, attribute, ...rest } = Converter.unmarshall(v) as Base & {
        [key: string]: any;
      };

      return rest as T;
    });
  }
}
