import _ from 'lodash';

export const intersection = <T>(arr1: T[], arr2: T[]) => {
  return _.intersectionWith(arr1, arr2, _.isEqual);
};

export const difference = <T>(arr1: T[], arr2: T[]) => {
  return _.differenceWith(arr1, arr2, _.isEqual);
};
