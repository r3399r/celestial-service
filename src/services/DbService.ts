import { DynamoDB } from 'aws-sdk';
import {
  AttributeMap,
  Converter,
  PutItemInput,
  QueryInput,
} from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';
import { ConflictError, InternalServerError, NotFoundError } from 'src/error';
import { Doc } from 'src/model/DbBase';
import { data2Record } from 'src/util/DbHelper';
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

    // prepare primary and related records
    const promisePutRecord = record.map(async (v: Doc) => {
      const params: PutItemInput = {
        TableName: this.tableName,
        Item: Converter.marshall(v),
      };

      return this.dynamoDb.putItem(params).promise();
    });

    // prepare main record
    const schema = record[0].pk.split('#')[1];
    const promisePutMain = this.dynamoDb
      .putItem({
        TableName: this.tableName,
        Item: Converter.marshall({
          pk: `${this.alias}#${schema}`,
          sk: record[0].pk,
        }),
      })
      .promise();

    await Promise.all([...promisePutRecord, promisePutMain]);
  }

  public async deleteItem(schema: string, id: string): Promise<void> {
    const primaryKey = `${this.alias}#${schema}#${id}`;

    // prepare items with pk=primarKey or sk=primaryKey
    const [mainItem, relatedItem] = await Promise.all([
      this.getRawItem(primaryKey),
      this.getRawItemByIndex(primaryKey),
    ]);

    // sk=primaryKey should only in main item & primary item
    // if not means it is linked by another schema
    if (relatedItem.length > 2)
      throw new ConflictError(
        `${primaryKey} is linked by other schema, please delete linked items first`
      );

    await Promise.all([
      ...mainItem.map(async (v: Doc) =>
        this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: { S: v.pk }, sk: { S: v.sk } },
          })
          .promise()
      ),
      ...relatedItem
        .filter((v: Doc) => v.pk !== v.sk)
        .map(async (v: Doc) =>
          this.dynamoDb
            .deleteItem({
              TableName: this.tableName,
              Key: { pk: { S: v.pk }, sk: { S: v.sk } },
            })
            .promise()
        ),
    ]);
  }

  public async putItem<T>(item: T): Promise<void> {
    const newRecord = data2Record(item, this.alias);
    const oldRecord = await this.getRawItem(newRecord[0].pk);

    const itemToDelete = differenceBy(oldRecord, newRecord, 'sk');
    const itemToPut = intersectionByAndDifference(newRecord, oldRecord, 'sk');
    const itemToAdd = differenceBy(newRecord, oldRecord, 'sk');

    await Promise.all([
      ...[...itemToPut, ...itemToAdd].map(async (v: Doc) =>
        this.dynamoDb
          .putItem({
            TableName: this.tableName,
            Item: Converter.marshall(v),
          })
          .promise()
      ),
      ...itemToDelete.map(async (v: Doc) =>
        this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: { S: v.pk }, sk: { S: v.sk } },
          })
          .promise()
      ),
    ]);
  }

  private async getRawItem(pk: string): Promise<Doc[]> {
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

    return raw.Items.map((v: AttributeMap) => Converter.unmarshall(v) as Doc);
  }

  private async getRawItemByIndex(sk: string): Promise<Doc[]> {
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

    return raw.Items.map((v: AttributeMap) => Converter.unmarshall(v) as Doc);
  }

  public async getItem<T>(schema: string, id: string): Promise<T> {
    const params: QueryInput = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':pk': { S: `${this.alias}#${schema}#${id}` },
      },
      KeyConditionExpression: 'pk = :pk',
    };
    const raw = await this.dynamoDb.query(params).promise();
    if (raw.Items === undefined)
      throw new InternalServerError('query result from DynamoDb is undefined');

    const items = raw.Items.map((v) => Converter.unmarshall(v) as Doc);
    let res = {} as T;
    items.forEach((v) => {
      const { pk: pkIgnored, sk, attribute, ...rest } = v;
      if (attribute === undefined) res = { ...res, ...rest };
      else
        attribute.split('::').forEach((att) => {
          const attributeName: keyof T = att.split('#')[0] as keyof T;
          const attributeType = att.split('#')[1];
          const relatedId = sk.split('#')[2];

          if (attributeType === 'one')
            res = { ...res, [attributeName]: relatedId };
          else if (attributeType === 'many')
            if (res[attributeName] === undefined)
              res = { ...res, [attributeName]: [relatedId] };
            else {
              const oldAttribute = res[attributeName];
              if (Array.isArray(oldAttribute))
                res = { ...res, [attributeName]: [...oldAttribute, relatedId] };
            }
        });
    });

    return res;
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

    const promiseGet = raw.Items.map((v: AttributeMap) => {
      const doc = Converter.unmarshall(v) as Doc;
      const id = doc.sk.split('#')[2];

      return this.getItem<T>(schema, id);
    });

    return await Promise.all(promiseGet);
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
      .filter((v: Doc) => v.pk.startsWith(`${this.alias}#${schema}`))
      .map((v: Doc) => this.getItem<T>(schema, v.pk.split('#')[2]));

    return await Promise.all(promiseGetItems);
  }
}
