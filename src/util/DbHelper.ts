import "reflect-metadata";
import { DynamoDbBase } from "src/model/DbBase";

export function Entity(entityName: string) {
  return function (target: Function) {
    Reflect.defineMetadata('Entity', entityName, target.prototype);
  }
}

export function PrimaryAttribute() {
  return function (target: Object, propertyKey: string) {
    Reflect.defineMetadata('PK', propertyKey, target);
  }
}

export function Attribute() {
  return function (target: Object, propertyKey: string) {
    const metadata = Reflect.getMetadata('Attribute', target) || [];
    Reflect.defineMetadata('Attribute', [...metadata, propertyKey], target);
  }
}

export function RelatedAttribute() {
  return function (target: Object, propertyKey: string) {
    const metadata = Reflect.getMetadata('RelatedAttribute', target) || [];
    Reflect.defineMetadata('RelatedAttribute', [...metadata, propertyKey], target);
  }
}

export function CommonAttribute() {
  return function (target: Object, propertyKey: string) {
    const metadata = Reflect.getMetadata('CommonAttribute', target) || [];
    Reflect.defineMetadata('CommonAttribute', [...metadata, propertyKey], target);
  }
}

export function generateDynamoDbItem(input: any, pairPk?: string) {
  if (input.id === undefined) throw new Error('typeError')

  let res: { [key: string]: any } & DynamoDbBase[] = []

  const entity: string = Reflect.getMetadata('Entity', input)
  const pk = pairPk !== undefined ? `demo#${pairPk}` : `demo#${entity}#${input.id}`
  const sk = `demo#${entity}#${input.id}`
  const dynamoDbItem: { [key: string]: any } & DynamoDbBase = { pk, sk, ...input }

  const relatedAttributes: string[] = Reflect.getMetadata('RelatedAttribute', input) || []
  Object.keys(input).forEach((key: string) => {
    if (relatedAttributes.includes(key)) {
      const mapping = generateDynamoDbItem(dynamoDbItem[key], `${entity}#${input.id}`)
      res = [...mapping, ...res]
    }
  })

  if (pairPk === undefined) {
    const attributes: string[] = Reflect.getMetadata('Attribute', input) || []
    Object.keys(input).forEach((key: string) => {
      if (!attributes.includes(key)) delete dynamoDbItem[key]
    })
  } else {
    const commonAttributes: string[] = Reflect.getMetadata('CommonAttribute', input) || []
    Object.keys(input).forEach((key: string) => {
      if (!commonAttributes.includes(key)) delete dynamoDbItem[key]
    })
  }

  // let res = [dynamoDbItem];
  return [...res, dynamoDbItem]
}