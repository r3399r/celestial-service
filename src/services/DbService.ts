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
import { generateData, record2Data } from 'src/util/DbHelper';

/**
 * Service class for AWS dynamoDB
 */
@injectable()
export class DbService {
  @inject(DynamoDB)
  private readonly dynamoDb!: DynamoDB;
  private readonly tableName: string = `celestial-db-${process.env.ENVR}`;

  private async checkItemExist(key: Base): Promise<any> {
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
    if (res.Count !== undefined && res.Count > 0)
      throw new Error(ERROR_CODE.RECORD_EXIST);
  }

  public async createItem<T>(alias: string, item: T): Promise<void> {
    const record = generateData(item, alias);
    await this.checkItemExist({ pk: record.pk, sk: record.sk });

    const params: PutItemInput = {
      TableName: this.tableName,
      Item: Converter.marshall(record),
    };
    await this.dynamoDb.putItem(params).promise();

    await this.updateListItem(record.pk);
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

    const item = Converter.unmarshall(raw.Item) as Base & {
      [key: string]: any;
    };

    return record2Data(item);
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
      const item = Converter.unmarshall(v) as Base & { [key: string]: any };

      return record2Data(item);
    });
  }
}
