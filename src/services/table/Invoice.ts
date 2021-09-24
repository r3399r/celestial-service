
import "reflect-metadata";

function Entity(entityName: string) {
  return function (target: Function) {
    Reflect.defineMetadata('Entity', entityName, target.prototype);
  }
}

function Attribute() {
  return function (target: Object, propertyKey: string) {
    const metadata = Reflect.getMetadata('Attribute', target) || [];
    Reflect.defineMetadata('Attribute', [...metadata, propertyKey], target);


  }
}

function RelatedAttribute() {
  return function (target: Object, propertyKey: string) {
    const metadata = Reflect.getMetadata('RelatedAttribute', target) || [];
    Reflect.defineMetadata('RelatedAttribute', [...metadata, propertyKey], target);
  }
}

function CommonAttribute() {
  return function (target: Object, propertyKey: string) {
    const metadata = Reflect.getMetadata('CommonAttribute', target) || [];
    Reflect.defineMetadata('CommonAttribute', [...metadata, propertyKey], target);
  }
}

function PrimaryGeneratedAttribute() {
  return function (target: Object, _propertyKey: string) {
    Reflect.defineMetadata('GeneratePk', true, target);
  }
}

function PrimaryAttribute() {
  return function (target: Object, _propertyKey: string) {
    Reflect.defineMetadata('GeneratePk', false, target);
  }
}


type Bill = {
  id: string;
  billAtt: string
  relation: string
}

@Entity('bill')
export class BillEntity implements Bill {
  @PrimaryAttribute()
  id: string;

  @Attribute()
  billAtt: string

  @CommonAttribute()
  relation: string

  constructor(input: Bill) {
    this.id = input.id;
    this.billAtt = input.billAtt;
    this.relation = input.relation
  }
}

type Invoice = {
  id: string;
  att1: string;
  att2: Bill
}

@Entity('invoice')
export class InvoiceEntity implements Invoice {
  @PrimaryGeneratedAttribute()
  id: string;

  @Attribute()
  att1: string;

  @RelatedAttribute()
  att2: Bill

  constructor(input: Invoice) {
    this.id = input.id;
    this.att1 = input.att1;
    this.att2 = input.att2;
  }
}
