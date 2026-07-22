#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ERROR_MESSAGES_FILE = path.join(__dirname, '../src/constants/errorMessages.js');

function validateErrorMessages() {
    console.log('Checking uniqueness of keys in errorMessages.js...');

    const fileContent = fs.readFileSync(ERROR_MESSAGES_FILE, 'utf-8');

    const keys = [];
    const keyPositions = new Map(); // key -> [{lineNumber, value, isEmpty}]
    const emptyValues = [];         // [{key, lineNumber}]

    const lines = fileContent.split('\n');
    lines.forEach((line, index) => {
        // Remove comments (// comment) but be careful with strings containing //
        let lineWithoutComments = line;
        const commentIndex = line.search(/(?<!['"`])\/\/|(?<!\\)\/\//);
        if (commentIndex !== -1) {
            // Check if // is inside a string
            const beforeComment = line.substring(0, commentIndex);
            const singleQuotes = (beforeComment.match(/'/g) || []).length;
            const doubleQuotes = (beforeComment.match(/"/g) || []).length;
            const backticks = (beforeComment.match(/`/g) || []).length;
            
            // Only remove comment if quotes are balanced (meaning // is outside strings)
            // Simple heuristic: if quotes count is even, comment is likely outside
            if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 && backticks % 2 === 0) {
                lineWithoutComments = beforeComment;
            }
        }
        
        // Match: key: value or key: 'value' or key: "" or key: ''
        const match = lineWithoutComments.match(/^\s*(\d+)\s*:\s*(.*)$/);
        if (match) {
            const key = match[1];
            let valueStr = match[2].trim();
            
            // Remove trailing comma if present
            if (valueStr.endsWith(',')) {
                valueStr = valueStr.slice(0, -1).trim();
            }
            
            keys.push(key);

            // Determine if value is empty
            let isEmpty = false;
            
            // Case 1: Completely empty or just whitespace
            if (valueStr === '' || /^\s+$/.test(valueStr)) {
                isEmpty = true;
            }
            // Case 2: Empty string literals: '', "", ``
            else if (valueStr === "''" || valueStr === '""' || valueStr === '``') {
                isEmpty = true;
            }
            // Case 3: String literals with empty content
            else if (valueStr.length >= 2) {
                // Check for single-quoted empty string
                if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
                    const content = valueStr.slice(1, -1);
                    // Check for escaped quotes and handle them
                    const unescaped = content.replace(/\\'/g, '').replace(/\\\\/g, '');
                    if (unescaped.trim() === '') {
                        isEmpty = true;
                    }
                }
                // Check for double-quoted empty string
                else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
                    const content = valueStr.slice(1, -1);
                    const unescaped = content.replace(/\\"/g, '').replace(/\\\\/g, '');
                    if (unescaped.trim() === '') {
                        isEmpty = true;
                    }
                }
                // Check for template literal empty string
                else if (valueStr.startsWith('`') && valueStr.endsWith('`')) {
                    const content = valueStr.slice(1, -1);
                    const unescaped = content.replace(/\\`/g, '').replace(/\\\\/g, '');
                    if (unescaped.trim() === '') {
                        isEmpty = true;
                    }
                }
            }

            if (!keyPositions.has(key)) {
                keyPositions.set(key, []);
            }
            
            const entry = {
                lineNumber: index + 1,
                value: valueStr,
                isEmpty,
            };
            
            keyPositions.get(key).push(entry);
            
            if (isEmpty) {
                emptyValues.push({
                    key,
                    lineNumber: index + 1,
                });
            }
        }
    });

    let hasErrors = false;
    let hasWarnings = false;

    // Check for duplicates
    const duplicates = [];
    keyPositions.forEach((entries, key) => {
        if (entries.length > 1) {
            const lineNumbers = entries.map(e => e.lineNumber);
            const emptyLines = entries.filter(e => e.isEmpty).map(e => e.lineNumber);
            duplicates.push({
                key,
                lineNumbers,
                emptyLines,
                count: entries.length,
            });
        }
    });

    if (duplicates.length > 0) {
        hasErrors = true;
        console.error('\n❌ ERROR: Detected duplicates of keys:\n');
        duplicates.forEach(({ key, lineNumbers, emptyLines, count }) => {
            let message = `  Key ${key} occurs ${count} times on lines: ${lineNumbers.join(', ')}`;
            if (emptyLines.length > 0) {
                message += ` (empty values on lines: ${emptyLines.join(', ')})`;
            }
            console.error(message);
        });
        console.error('\nAll keys must be unique!\n');
    }

    // Check for empty values (excluding duplicates which are already reported)
    const duplicateKeys = new Set(duplicates.map(d => d.key));
    const emptyValuesWithoutDuplicates = emptyValues.filter(({ key }) => !duplicateKeys.has(key));
    
    if (emptyValuesWithoutDuplicates.length > 0) {
        hasWarnings = true;
        console.warn('\n⚠️  WARNING: Detected empty values:\n');
        emptyValuesWithoutDuplicates.forEach(({ key, lineNumber }) => {
            console.warn(`  Key ${key} has empty value on line ${lineNumber}`);
        });
        console.warn('\nIt is recommended to fill in all values.\n');
    }

    if (hasErrors) {
        process.exit(1);
    }

    if (hasWarnings) {
        console.log(`Check passed with warnings: found ${keys.length} unique keys (${emptyValues.length} with empty values)`);
        process.exit(0);
    }

    console.log(`Check passed: found ${keys.length} unique keys`);
    process.exit(0);
}

try {
    validateErrorMessages();
} catch (error) {
    console.error('Error during validation:', error.message);
    process.exit(1);
}
