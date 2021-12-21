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

/**
 * Service class for AWS dynamoDB
 */
@injectable()
export class DbService {
  @inject(DynamoDB)
  private readonly dynamoDb!: DynamoDB;
  private readonly tableName: string = `celestial-db-${process.env.ENVR}`;

  private async checkIfItemExist(
    key: Omit<Base, 'attribute'>,
    wantExist: boolean
  ): Promise<any> {
    const params: QueryInput = {
      TableName: this.tableName,
      Select: 'COUNT',
      ExpressionAttributeValues: {
        ':pk': { S: key.pk },
        ':sk': { S: key.sk },
      },
      KeyConditionExpression: 'pk = :pk AND sk = :sk',
    };
    const res = await this.dynamoDb.query(params).promise();

    if (wantExist && res.Count !== undefined && res.Count === 0)
      throw new Error(ERROR_CODE.RECORD_NOT_FOUND);

    if (!wantExist && res.Count !== undefined && res.Count > 0)
      throw new Error(ERROR_CODE.RECORD_EXIST);
  }

  public async createItem<T>(alias: string, item: T): Promise<void> {
    const record = data2Record(item, alias);
    await this.checkIfItemExist({ pk: record[0].pk, sk: record[0].sk }, false);

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

    const [raw1, raw2] = await Promise.all([
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
        })
        .promise(),
    ]);

    if (raw1.Items === undefined || raw1.Items.length === 0)
      throw new Error(ERROR_CODE.RECORD_NOT_FOUND);

    if (raw2.Items === undefined || raw2.Items.length === 0)
      throw new Error(ERROR_CODE.RECORD_NOT_FOUND);

    const threads: Promise<any>[] = [];

    raw1.Items.forEach((v: AttributeMap) => {
      if (v.pk !== v.sk)
        threads.push(
          this.dynamoDb
            .deleteItem({
              TableName: this.tableName,
              Key: { pk: v.pk, sk: v.sk },
            })
            .promise()
        );
    });

    raw2.Items.forEach((v: AttributeMap) => {
      threads.push(
        this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: v.pk, sk: v.sk },
          })
          .promise()
      );
    });

    await Promise.all(threads);

    // should refresh the list of items which includes he deleted item
  }

  public async putItem<T>(alias: string, item: T): Promise<void> {
    const record = data2Record(item, alias);
    await this.checkIfItemExist({ pk: record[0].pk, sk: record[0].sk }, true);

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

  private async updateListItem(pk: string): Promise<void> {
    const params: QueryInput = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':pk': { S: pk },
      },
      KeyConditionExpression: 'pk = :pk',
    };
    const raw = await this.dynamoDb.query(params).promise();
    if (raw.Items === undefined || raw.Items.length === 0)
      throw new Error(ERROR_CODE.UNEXPECTED_ERROR);

    let res: any = {};

    const keys = pk.split('#');
    res.pk = `${keys[0]}#${keys[1]}`;
    res.sk = pk;

    raw.Items.forEach((v: AttributeMap) => {
      const item = Converter.unmarshall(v) as Base & { [key: string]: any };
      if (item.pk === item.sk) res = { ...item, ...res };
      else {
        const fk = item.sk.split('#')[1];
        if (res[fk] === undefined) res[fk] = item;
        else res[fk] = [...res[fk], item];
      }
    });

    const putItemParams: PutItemInput = {
      TableName: this.tableName,
      Item: Converter.marshall(res),
    };
    await this.dynamoDb.putItem(putItemParams).promise();
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

    return Converter.unmarshall(raw.Item) as T;
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

    return record2Data(
      raw.Items.map(
        (v: AttributeMap) =>
          Converter.unmarshall(v) as Base & { [key: string]: any }
      )
    );
  }
}
