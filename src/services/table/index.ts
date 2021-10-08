import AWS from "aws-sdk";
import { generateDynamoDbItem } from "../../util/DbHelper";
import { v4 as uuidv4 } from 'uuid';
// import DynamoDB, { Converter } from "aws-sdk/clients/dynamodb";
import { StudentEntity, TeacherEntity, TeacherStudentPair } from "./Class";

AWS.config.update({ region: 'ap-northeast-1' });

const getItems = (a: any, pairPk?: string) => {
  const selfItem: any = {}
  const entity: string = Reflect.getMetadata('Entity', a)
  const pk: string = Reflect.getMetadata('PK', a)
  selfItem.pk = pairPk !== undefined ? `demo#${pairPk}` : `demo#${entity}#${a[pk]}`;
  selfItem.sk = `demo#${entity}#${a[pk]}`;

  if (pairPk === undefined) {
    (Reflect.getMetadata('Attribute', a) || []).forEach((v: any) => {
      selfItem[v] = a[v]
    })
  } else {
    (Reflect.getMetadata('CommonAttribute', a) || []).forEach((v: any) => {
      selfItem[v] = a[v]
    })
  }

  let res = [selfItem];

  // const mapped: any = {}
  // if (parentPk) {
  //   mapped.pk = `demo#${parentPk}`;
  //   mapped.sk = `demo#${entity}#${id}`;

  //   (Reflect.getMetadata('CommonAttribute', a) || []).forEach((v: any) => {
  //     mapped[v] = a[v]
  //   })
  //   res = [...res, mapped]
  // }
  (Reflect.getMetadata('RelatedAttribute', a) || []).forEach((v: any) => {
    const mappedItems = getItems(a[v], `${entity}#${a[pk]}`)
    // const mappedItems=getRelatedIetm()
    res = res.concat(mappedItems)
  })

  return res
}

const main = async () => {
  // const b = new BillEntity({ id: 'd15648c1-894e-4fe9-b83e-15af0dda0880', billAtt: 'biibibib', relation: 'rrrrrelation' })
  // const a = new InvoiceEntity({ id: 'fake-id', att1: '111', att2: b })

  const student = new StudentEntity({
    id: uuidv4(),
    name: 'studentX',
  })
  console.log(generateDynamoDbItem(student))

  const teacherStudentPair = new TeacherStudentPair({
    ...student, startDate: '2021-09-1'
  })

  const teacher = new TeacherEntity({
    id: uuidv4(),
    name: 'teacherA', birth: '1994-10-11', email: 'a@gmail.com',
    student: teacherStudentPair
  })

  const items = generateDynamoDbItem(teacher)
  console.log(items)

  console.log(student, teacher)


  // const dynamoDb = new DynamoDB()
  // await Promise.all(items.map(async (v: any) => {
  //   await dynamoDb.putItem({
  //     TableName: 'testtest', Item: Converter.marshall(v)
  //   }).promise()
  // }))
}

main()