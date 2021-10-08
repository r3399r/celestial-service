import { DynamoDB } from "aws-sdk";
import { Converter, PutItemInput, PutItemOutput } from "aws-sdk/clients/dynamodb";
import { inject, injectable } from "inversify";
import { Base } from "src/model/DbBase";

/**
 * Service class for AWS dynamoDB
 */
@injectable()
export class DbService {
  @inject(DynamoDB)
  private readonly dynamoDb!: DynamoDB;
  private readonly tableName: string = `celestial-db-${process.env.ENVR}`;

  public async createItem<T extends Base>(item: T): Promise<PutItemOutput> {
    // check pk does not repeat


    const params: PutItemInput = {
      TableName: this.tableName,
      Item: Converter.marshall(item),
    };

    return await this.dynamoDb.putItem(params).promise();
  }
}