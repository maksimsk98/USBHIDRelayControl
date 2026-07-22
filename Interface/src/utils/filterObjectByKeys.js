export const filterObjectKeys = (arrOfObj, reqKeys) => arrOfObj.map((step) => Object.entries(step)
  .filter(([key, _]) => reqKeys.includes(key))
  .reduce((acc, [key, val]) => {
    acc[key] = val;
    return acc;
  }, {}));
