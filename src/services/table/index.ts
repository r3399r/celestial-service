import AWS from "aws-sdk";
import { BillEntity, InvoiceEntity } from "./Invoice";
import { v4 as uuidv4 } from 'uuid';
import DynamoDB, { Converter } from "aws-sdk/clients/dynamodb";

AWS.config.update({ region: 'ap-northeast-1' });

const getItems = (a: any, parentPk?: string) => {
  const selfItem: any = {}
  const entity: string = Reflect.getMetadata('Entity', a)
  const id: string = Reflect.getMetadata('GeneratePk', a) ? uuidv4() : a.id
  selfItem.pk = `demo#${entity}#${id}`
  selfItem.sk = `demo#${entity}#${id}`

  const detail: any = {}
  detail.pk = `demo#${entity}`
  detail.sk = `demo#${entity}#${id}`;

  (Reflect.getMetadata('Attribute', a) || []).forEach((v: any) => {
    selfItem[v] = a[v]
    detail[v] = a[v]
  })

  let res = [selfItem];

  const mapped: any = {}
  if (parentPk) {
    mapped.pk = `demo#${parentPk}`;
    mapped.sk = `demo#${entity}#${id}`;

    (Reflect.getMetadata('CommonAttribute', a) || []).forEach((v: any) => {
      mapped[v] = a[v]
    })
    res = [...res, mapped]
  }

  (Reflect.getMetadata('RelatedAttribute', a) || []).forEach((v: any) => {
    detail[v] = a[v]
    const mappedItems = getItems(a[v], `${entity}#${id}`)
    res = res.concat(mappedItems)
  })
  return [...res, detail]
}


const main = async () => {
  const b = new BillEntity({ id: 'd15648c1-894e-4fe9-b83e-15af0dda0880', billAtt: 'biibibib', relation: 'rrrrrelation' })
  const a = new InvoiceEntity({ id: 'fake-id', att1: '111', att2: b })

  const items = getItems(a)
  console.log(items)



  const dynamoDb = new DynamoDB()
  await Promise.all(items.map(async (v: any) => {
    await dynamoDb.putItem({
      TableName: 'testtest', Item: Converter.marshall(v)
    }).promise()
  }))
}

main()