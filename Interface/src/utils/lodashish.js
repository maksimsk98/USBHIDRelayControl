import _ from 'lodash';

export const getDifAndInter = (a, b) => {
  const dif = _.difference(a, b);
  const inter = _.intersection(a, b);

  return { dif, inter };
};
