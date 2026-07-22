// prepare-archive.js
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { glob } = require('glob');

// Configuration
const SOURCE_DIR = '.';
const OLD_FOR_TESTING_DIR = 'oldForTesting';

let packageVersion = 'unknown';
try {
  const packageJson = fs.readJsonSync('./package.json');
  packageVersion = packageJson.version || 'unknown';
  console.log(`Detected version: ${packageVersion} from package.json`);
} catch (error) {
  console.warn(`Could not read package.json version: ${error.message}`);
  console.warn('sing "unknown" as version');
}

// Create ddmmyy timestamp
const now = new Date();
const day = String(now.getDate()).padStart(2, '0');
const month = String(now.getMonth() + 1).padStart(2, '0');
const year = String(now.getFullYear()).slice(-2);
const timestamp = `${day}.${month}.${year}`;

const ARCHIVE_NAME = `Interface_v${packageVersion}_${timestamp}.zip`;

// Items to include (folders and files)
const ITEMS_TO_INCLUDE = [
  'electron',
  'public',
  'scripts',
  'src',
  'main.js',
  'preload.js',
  'package.json',
  'package-lock.json',
  'craco.config.js'  // needed for build
];

async function ensureDirectoryExists(dir) {
  await fs.ensureDir(dir);
}

async function moveExistingZipFiles() {
  try {
    const files = await fs.readdir(SOURCE_DIR);
    const zipFiles = files.filter(file => file.endsWith('.zip') && fs.statSync(file).isFile());
    
    if (zipFiles.length > 0) {
      console.log(`\nFound ${zipFiles.length} existing ZIP file(s), moving to ${OLD_FOR_TESTING_DIR}...`);
      
      for (const zipFile of zipFiles) {
        const sourcePath = path.join(SOURCE_DIR, zipFile);
        const destPath = path.join(OLD_FOR_TESTING_DIR, zipFile);
        
        await fs.move(sourcePath, destPath, { overwrite: true });
        console.log(`   Moved: ${zipFile}`);
      }
    } else {
      console.log('\nNo existing ZIP files found to move');
    }
  } catch (error) {
    console.error('Error moving ZIP files:', error.message);
    throw error;
  }
}

async function findInterfaceZipFiles() {
  try {
    const files = await fs.readdir(SOURCE_DIR);
    return files.filter(file => 
      file.startsWith('Interface') && 
      file.endsWith('.zip') && 
      fs.statSync(file).isFile()
    );
  } catch (error) {
    console.error('Error finding Interface ZIP files:', error.message);
    return [];
  }
}

async function validateItems(items) {
  const validItems = [];
  const missingItems = [];

  for (const item of items) {
    try {
      await fs.access(item);
      validItems.push(item);
    } catch {
      missingItems.push(item);
    }
  }

  return { validItems, missingItems };
}

async function createArchive(items, archivePath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      console.log(`\nArchive created successfully!`);
      console.log(`   Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Name: ${path.basename(archivePath)}`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add each item to the archive
    items.forEach(item => {
      try {
        const stats = fs.statSync(item);
        if (stats.isDirectory()) {
          archive.directory(item, item);
          console.log(`   Added directory: ${item}`);
        } else {
          archive.file(item, { name: item });
          console.log(`   Added file: ${item}`);
        }
      } catch (error) {
        console.warn(`   Warning: Could not add ${item}: ${error.message}`);
      }
    });

    archive.finalize();
  });
}

async function main() {
  console.log('\nStarting archive preparation...\n');
  console.log('='.repeat(50));

  try {
    // Step 1: Ensure oldForTesting directory exists
    console.log('\nStep 1: Checking directories...');
    await ensureDirectoryExists(OLD_FOR_TESTING_DIR);
    console.log(`   ${OLD_FOR_TESTING_DIR} directory is ready`);

    // Step 2: Move existing ZIP files
    console.log('\nStep 2: Processing existing ZIP files...');
    await moveExistingZipFiles();

    // Step 3: Find Interface ZIP files
    console.log('\nStep 3: Looking for Interface ZIP files...');
    const interfaceZips = await findInterfaceZipFiles();
    
    // Combine all items to include
    let allItems = [...ITEMS_TO_INCLUDE];
    
    if (interfaceZips.length > 0) {
      console.log(`   Found ${interfaceZips.length} Interface ZIP file(s):`);
      interfaceZips.forEach(zip => console.log(`      - ${zip}`));
      allItems = [...allItems, ...interfaceZips];
    } else {
      console.log('   No Interface ZIP files found');
    }

    // Step 4: Validate all items exist
    console.log('\nStep 4: Validating items...');
    const { validItems, missingItems } = await validateItems(allItems);

    if (missingItems.length > 0) {
      console.log('\nWarning: The following items were not found and will be skipped:');
      missingItems.forEach(item => console.log(`   ${item}`));
    }

    if (validItems.length === 0) {
      throw new Error('No valid items found to include in the archive');
    }

    console.log(`\nFound ${validItems.length} valid item(s) to archive`);

    // Step 5: Create the archive
    console.log('\nStep 5: Creating archive...');
    const archivePath = path.join(SOURCE_DIR, ARCHIVE_NAME);
    await createArchive(validItems, archivePath);

    // Step 6: Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Archive created: ${ARCHIVE_NAME}`);
    console.log(`Total size: ${(fs.statSync(archivePath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Items included: ${validItems.length}`);
    console.log(`Moved ZIP files to: ${OLD_FOR_TESTING_DIR}/`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { prepareArchive: main };