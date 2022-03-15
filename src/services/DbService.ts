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
import { Doc } from 'src/model/DbBase';
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

  // save data in local to reduce query times {pk::sk => data}
  private readonly cache: Map<string, Doc> = new Map();

  private async checkIfItemExist(pk: string): Promise<any> {
    this.cache.forEach((_v: Doc, key: string) => {
      if (key.includes(pk)) throw new ConflictError(`${pk} is already exist`);
    });

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
      record.map(async (v: Doc) => {
        const params: PutItemInput = {
          TableName: this.tableName,
          Item: Converter.marshall(v),
        };
        this.cache.set(`${v.pk}::${v.sk}`, v);

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
      ...mainItem.map(async (v: Doc) => {
        this.cache.delete(`${v.pk}::${v.sk}`);

        return this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: { S: v.pk }, sk: { S: v.sk } },
          })
          .promise();
      }),
      ...relatedItem
        .filter((v: Doc) => v.pk !== v.sk)
        .map(async (v: Doc) => {
          this.cache.delete(`${v.pk}::${v.sk}`);

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
      ...[...itemToPut, ...itemToAdd].map(async (v: Doc) => {
        this.cache.set(`${v.pk}::${v.sk}`, v);

        return this.dynamoDb
          .putItem({
            TableName: this.tableName,
            Item: Converter.marshall(v),
          })
          .promise();
      }),
      ...itemToDelete.map(async (v: Doc) => {
        this.cache.delete(`${v.pk}::${v.sk}`);

        return this.dynamoDb
          .deleteItem({
            TableName: this.tableName,
            Key: { pk: { S: v.pk }, sk: { S: v.sk } },
          })
          .promise();
      }),
      ...relatedItem
        .filter((v: Doc) => v.pk !== v.sk && v.pk !== `${this.alias}#${schema}`)
        .map(async (v: Doc) => {
          this.cache.set(`${v.pk}::${v.sk}`, v);

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
        .filter((v: Doc) => v.pk !== v.sk && v.pk !== `${this.alias}#${schema}`)
        .map(async (v: Doc) => {
          return this.updateListItem(v.pk);
        }),
    ]);
  }

  private async updateListItem<T>(pk: string): Promise<void> {
    const raw = await this.getRawItem(pk);
    const rawRelated = await Promise.all(
      raw
        .filter((v: Doc) => v.attribute !== undefined)
        .map(async (v: Doc) => {
          const relatedSchema = v.sk.split('#')[1];
          const id = v.sk.split('#')[2];

          return this.getItem<Doc>(relatedSchema, id, true);
        })
    );
    const res = record2Data<T>(raw, rawRelated);

    const alias = pk.split('#')[0];
    const schema = pk.split('#')[1];
    const putItemParams: PutItemInput = {
      TableName: this.tableName,
      Item: Converter.marshall({ pk: `${alias}#${schema}`, sk: pk, ...res }),
    };
    this.cache.set(`${alias}#${schema}::${pk}`, {
      pk: `${alias}#${schema}`,
      sk: pk,
      attribute: undefined,
      ...res,
    });
    await this.dynamoDb.putItem(putItemParams).promise();
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

    return raw.Items.map((v: AttributeMap) => {
      const res = Converter.unmarshall(v) as Doc;
      this.cache.set(`${pk}::${res.sk}`, res);

      return res;
    });
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

    return raw.Items.map((v: AttributeMap) => {
      const res = Converter.unmarshall(v) as Doc;
      this.cache.set(`${res.pk}::${sk}`, res);

      return res;
    });
  }

  public async getItem<T>(
    schema: string,
    id: string,
    full: boolean = false
  ): Promise<T> {
    const res = this.cache.get(
      `${this.alias}#${schema}::${this.alias}#${schema}#${id}`
    );
    if (res !== undefined && full) return res as unknown as T;
    if (res !== undefined && full === false) {
      const {
        pk: unusedPk,
        sk: unusedSk,
        attribute: unusedAtt,
        ...itemRest
      } = res;

      return itemRest as T;
    }

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

    const item = Converter.unmarshall(raw.Item) as Doc;
    const { pk, sk, attribute, ...rest } = item;
    this.cache.set(`${pk}::${sk}`, item);

    if (full) return item as unknown as T;

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
      const { pk, sk, attribute, ...rest } = Converter.unmarshall(v) as Doc;

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
      .filter((v: Doc) => v.pk.startsWith(`${this.alias}#${schema}`))
      .map((v: Doc) => this.getItem<T>(schema, v.pk.split('#')[2]));

    return await Promise.all(promiseGetItems);
  }
}
