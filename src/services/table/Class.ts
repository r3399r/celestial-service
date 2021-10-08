import "reflect-metadata";

function Entity(entityName: string) {
  return function (target: Function) {
    Reflect.defineMetadata('Entity', entityName, target.prototype);
  }
}

function PrimaryAttribute() {
  return function (target: Object, propertyKey: string) {
    Reflect.defineMetadata('PK', propertyKey, target);
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

type Teacher = {
  id: string;
  name: string;
  birth: string,
  email: string;
  student: TeacherStudent
}

@Entity('teacher')
export class TeacherEntity implements Teacher {
  @PrimaryAttribute()
  id: string;
  @Attribute()
  name: string;
  @Attribute()
  birth: string;
  @Attribute()
  email: string;
  @RelatedAttribute()
  student: TeacherStudent


  constructor(input: Teacher) {
    this.id = input.id;
    this.name = input.name;
    this.birth = input.birth;
    this.email = input.email;
    this.student = input.student
  }
}

type Student = {
  id: string;
  name: string;
}

@Entity('student')
export class StudentEntity implements Student {
  @PrimaryAttribute()
  id: string;
  @Attribute()
  name: string;

  constructor(input: Student) {
    this.id = input.id;
    this.name = input.name;
  }
}

type TeacherStudent = Student & {
  startDate: string
}

export class TeacherStudentPair extends StudentEntity implements TeacherStudent {
  @CommonAttribute()
  startDate: string

  constructor(input: TeacherStudent) {
    super(input)
    this.startDate = input.startDate
  }

}