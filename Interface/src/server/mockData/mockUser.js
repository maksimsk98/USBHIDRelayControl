/**
 * Mock data for user API responses
 * Based on examples from user.js comments
 * Includes various edge cases for comprehensive testing
 */

/**
 * Mock 1: Standard user with Cyrillic name
 * Happy path scenario - matches example from comments
 */
const mockUserStandard = {
  operation: 'getCurrentUserCFR',
  username: 'Иванов Иван Иванович',
};

/**
 * Mock 2: User with null username
 * Edge case: user not found or not initialized
 */
const mockUserNullUsername = {
  operation: 'getCurrentUserCFR',
  username: null,
};

/**
 * Mock 3: User with empty username
 * Edge case: empty string username
 */
const mockUserEmptyUsername = {
  operation: 'getCurrentUserCFR',
  username: '',
};

/**
 * Mock 4: User with very long name
 * Edge case: extremely long username string
 */
const mockUserLongName = {
  operation: 'getCurrentUserCFR',
  username: 'Очень Длинное Имя Пользователя Которое Превышает Обычную Длину И Может Вызвать Проблемы С Отображением В Интерфейсе Потому Что Оно Очень Длинное И Не Помещается В Обычные Поля Ввода ЗДЕСЬ МОГЛА БЫТЬ ВАША РЕКЛАМА ЗДЕСЬ МОГЛА БЫТЬ ВАША РЕКЛАМА ЗДЕСЬ МОГЛА БЫТЬ ВАША РЕКЛАМА ЗДЕСЬ МОГЛА БЫТЬ ВАША РЕКЛАМА ЗДЕСЬ МОГЛА БЫТЬ ВАША РЕКЛАМА',
};

/**
 * Mock 5: User with special characters
 * Edge case: username with special characters and symbols
 */
const mockUserSpecialChars = {
  operation: 'getCurrentUserCFR',
  username: 'Иванов-Петров И.И. (Админ) [VIP|PREMIUM|T-BANK|ULTRA|XIAOMI|10 камер|НЕ ПРОСТО выгодно, а АЛЬФА ВЫГОДНО!!!!|БАНКЕТ]',
};

/**
 * Mock 6: User without operation field
 * Edge case: response missing operation field
 */
const mockUserNoOperation = {
  username: 'Петров Петр Петрович',
};

/**
 * Mock 7: User with English name
 * Edge case: non-Cyrillic username
 */
const mockUserEnglishName = {
  operation: 'getCurrentUserCFR',
  username: 'John Doe Smith',
};

/**
 * Mock 8: User with mixed script name
 * Edge case: combination of Cyrillic and Latin characters
 */
const mockUserMixedScript = {
  operation: 'getCurrentUserCFR',
  username: 'Иванов Ivan Иванович',
};

/**
 * Mock 9: User with whitespace-only name
 * Edge case: username containing only whitespace
 */
const mockUserWhitespaceOnly = {
  operation: 'getCurrentUserCFR',
  username: '   \t\n   ',
};

/**
 * Mock 10: User with numbers in name
 * Edge case: username containing numeric characters
 */
const mockUserWithNumbers = {
  operation: 'getCurrentUserCFR',
  username: 'Иванов Иван Иванович (ID: 12345)',
};

/**
 * Mock 11: User with unicode characters
 * Edge case: username with various unicode characters
 */
const mockUserUnicode = {
  operation: 'getCurrentUserCFR',
  username: '╬╬╬Иванов Иван Иванович╬╬╬ ©Æ®Ø™€è█║£ß¥',
};

/**
 * Mock 12: User with minimal name
 * Edge case: single character username
 */
const mockUserMinimal = {
  operation: 'getCurrentUserCFR',
  username: 'И',
};

module.exports = {
  mockUserStandard,
  mockUserNullUsername,
  mockUserEmptyUsername,
  mockUserLongName,
  mockUserSpecialChars,
  mockUserNoOperation,
  mockUserEnglishName,
  mockUserMixedScript,
  mockUserWhitespaceOnly,
  mockUserWithNumbers,
  mockUserUnicode,
  mockUserMinimal,
};
