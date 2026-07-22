const validateErrorCodesUnique = (errorMap) => {
  const keys = Object.keys(errorMap);
  const keysSet = new Set(keys);
  const uniqueLength = keysSet.size;
  const allLength = keys.length;

  return {
    isValid: uniqueLength === allLength,
    uniqueLength,
    allLength
  };
};

try {
  const { isValid, uniqueLength, allLength } =
    validateErrorCodesUnique(ERROR_MESSAGES);

  if (isValid) {
    console.log(`Check passed: found ${uniqueLength} unique keys.`);
    process.exit(0);
  } else {
    console.log(
      `Check failed: found ${uniqueLength} unique keys out of ${allLength}`
    );
    process.exit(1);
  }
} catch (error) {
  console.error("Error during validation:", error.message);
  process.exit(1);
}
