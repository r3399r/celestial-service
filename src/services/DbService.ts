import { DynamoDB } from 'aws-sdk';
import {
  AttributeMap,
  Converter,
  GetItemInput,
  GetItemOutput,
  PutItemInput,
  PutItemOutput,
  QueryInput,
  QueryOutput,
} from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';
import { DbKey, Entity } from 'src/model/DbKey';

interface KeyValue {
  key: string;
  value: string;
}

/**
 * Service class for AWS dynamoDB
 */
@injectable()
export class DbService {
  @inject(DynamoDB)
  private readonly dynamoDb!: DynamoDB;
  private readonly tableName: string = `celestial-db-${process.env.ENVR}`;

  public async putItem<T>(item: T): Promise<PutItemOutput> {
    const params: PutItemInput = {
      TableName: this.tableName,
      Item: Converter.marshall(item),
    };

    return await this.dynamoDb.putItem(params).promise();
  }

  public async putItems<T>(items: T[]): Promise<PutItemOutput[]> {
    return await Promise.all(
      items.map(async (item: T) => await this.putItem(item))
    );
  }

  public async getItem<T>(
    key: DbKey,
    projectionExpression?: string
  ): Promise<T | null> {
    const params: GetItemInput = {
      TableName: this.tableName,
      Key: Converter.marshall(key),
      ProjectionExpression: projectionExpression,
    };
    const res: GetItemOutput = await this.dynamoDb.getItem(params).promise();

    return res.Item === undefined
      ? null
      : (Converter.unmarshall(res.Item) as T);
  }

  public async query<T>(
    partitionKey: Entity,
    filterKeyVal?: KeyValue[]
  ): Promise<T[]> {
    const expressionAttributeValues: { [key: string]: any } = {
      ':key': partitionKey,
    };

    if (filterKeyVal !== undefined)
      for (const filter of filterKeyVal)
        expressionAttributeValues[`:${filter.key}`] = filter.value;

    const params: QueryInput = {
      TableName: this.tableName,
      ExpressionAttributeValues: Converter.marshall(expressionAttributeValues),
      KeyConditionExpression: 'projectEntity = :key',
    };
    if (filterKeyVal !== undefined) {
      const customArray: string[] = [];
      for (const filter of filterKeyVal)
        customArray.push(`${filter.key} = :${filter.key}`);
      params.FilterExpression = customArray.join(' and ');
    }

    const res: QueryOutput = await this.dynamoDb.query(params).promise();

    return res.Items === undefined
      ? []
      : res.Items.map(
        (item: AttributeMap): T => Converter.unmarshall(item) as T
      );
  }
}
