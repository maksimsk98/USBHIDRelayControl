export const indexToLetters = (index) => {
  let result = '';
  let n = index;

  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }

  return result;
};

export const buildLetterOptions = (numElements) => {
  const safe = Number.isInteger(numElements) && numElements > 0;

  const options = [
    { label: '', value: '' }, // always first
  ];

  if (!safe) return options;

  for (let i = 0; i < numElements; i++) {
    options.push({
      label: indexToLetters(i),
      value: i,
    });
  }

  return options;
};
