import { DynamoDB } from 'aws-sdk';
import {
  Converter,
  PutItemInput,
  PutItemOutput,
} from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';

/**
 * Service class for AWS dynamoDB
 */
@injectable()
export class DbService {
  @inject(DynamoDB)
  private readonly dynamoDb!: DynamoDB;
  private readonly tableName: string = `celestial-db-${process.env.ENVR}`;

  public async createItem<T>(item: T): Promise<PutItemOutput> {
    const params: PutItemInput = {
      TableName: this.tableName,
      Item: Converter.marshall(item),
    };

    return await this.dynamoDb.putItem(params).promise();
  }
}
