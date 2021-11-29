import { DynamoDB } from 'aws-sdk';
import {
  Converter,
  PutItemInput,
  PutItemOutput,
  QueryInput,
} from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';
import { Base } from 'src/model/DbBase';

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
      KeyConditionExpression: `pk = :pk AND sk = :sk`,
    };
    const res = await this.dynamoDb.query(params).promise();
    if (res.Count !== undefined && res.Count > 0)
      throw new Error('Record of this key already exists.');
  }

  public async createItem<T>(item: T & Base): Promise<PutItemOutput> {
    await this.checkItemExist({ pk: item.pk, sk: item.sk });

    const params: PutItemInput = {
      TableName: this.tableName,
      Item: Converter.marshall(item),
    };

    return await this.dynamoDb.putItem(params).promise();
  }
}
