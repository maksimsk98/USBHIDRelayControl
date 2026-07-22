const fs = require('fs').promises;
const path = require('path');

// Configuration constants
const CONSTANTS_DIRS_DICT = {
  BUILD: 'build',
  DIST: 'dist',
  PUBLIC: 'public',
  ELECTRON: 'electron',
  UPLOADS: 'uploads',
  DIST_ALL: 'dist-all',
};

const CONSTANTS_FILES_DICT = {
  MAIN_JS: 'main.js',
  PACKAGE_JSON: 'package.json',
  PACKAGE_LOCK_JSON: 'package-lock.json',
};

const CONSTANTS_SCRIPTS_DICT = {
  SERVER: 'server',
  BUILD_SERVER: 'build:server',
  BUILD_ALL: 'build:all',
  DIST_PREPARE: 'dist:prepare',
  DIST_FULL: 'dist:full',
  SERVER_DEV: 'server:dev',
  PRODUCER: 'producer',
  CLIENT: 'client',
  START: 'start',
  TEST: 'test',
  EJECT: 'eject',
  LINT: 'lint',
};

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }));
}

async function prepareDist() {
  const distAllDir = path.join(__dirname, '..', CONSTANTS_DIRS_DICT.DIST_ALL);
  const interfaceDir = path.join(__dirname, '..');

  console.log('Preparing distribution folder...');

  // Create dist-all directory
  await fs.mkdir(distAllDir, { recursive: true });

  // Copy build/ (frontend)
  if (await fs.stat(path.join(interfaceDir, CONSTANTS_DIRS_DICT.BUILD)).catch(() => null)) {
    console.log('Copying build/...');
    await copyDir(
      path.join(interfaceDir, CONSTANTS_DIRS_DICT.BUILD),
      path.join(distAllDir, CONSTANTS_DIRS_DICT.BUILD),
    );
  }

  // Copy dist/ (bundled server)
  if (await fs.stat(path.join(interfaceDir, CONSTANTS_DIRS_DICT.DIST)).catch(() => null)) {
    console.log('Copying dist/...');
    await copyDir(
      path.join(interfaceDir, CONSTANTS_DIRS_DICT.DIST),
      path.join(distAllDir, CONSTANTS_DIRS_DICT.DIST),
    );
  }

  // Copy electron/
  if (await fs.stat(path.join(interfaceDir, CONSTANTS_DIRS_DICT.ELECTRON)).catch(() => null)) {
    console.log('Copying electron/...');
    await copyDir(
      path.join(interfaceDir, CONSTANTS_DIRS_DICT.ELECTRON),
      path.join(distAllDir, CONSTANTS_DIRS_DICT.ELECTRON),
    );
  }

  // Copy public/
  if (await fs.stat(path.join(interfaceDir, CONSTANTS_DIRS_DICT.PUBLIC)).catch(() => null)) {
    console.log('Copying public/...');
    await copyDir(
      path.join(interfaceDir, CONSTANTS_DIRS_DICT.PUBLIC),
      path.join(distAllDir, CONSTANTS_DIRS_DICT.PUBLIC),
    );
  }

  // Copy uploads/ (server upload directory - create empty if doesn't exist)
  if (await fs.stat(path.join(interfaceDir, CONSTANTS_DIRS_DICT.UPLOADS)).catch(() => null)) {
    console.log('Copying uploads/...');
    await copyDir(
      path.join(interfaceDir, CONSTANTS_DIRS_DICT.UPLOADS),
      path.join(distAllDir, CONSTANTS_DIRS_DICT.UPLOADS),
    );
  } else {
    // Create empty uploads directory
    await fs.mkdir(path.join(distAllDir, CONSTANTS_DIRS_DICT.UPLOADS), { recursive: true });
    console.log('Created empty uploads/ directory');
  }

  // Copy package.json for reference (but will be modified)
  await fs.copyFile(
    path.join(interfaceDir, CONSTANTS_FILES_DICT.PACKAGE_JSON),
    path.join(distAllDir, CONSTANTS_FILES_DICT.PACKAGE_JSON),
  );

  // Copy package-lock.json (needed for reproducible installs)
  try {
    await fs.copyFile(
      path.join(interfaceDir, CONSTANTS_FILES_DICT.PACKAGE_LOCK_JSON),
      path.join(distAllDir, CONSTANTS_FILES_DICT.PACKAGE_LOCK_JSON),
    );
  } catch (error) {
    console.log(`Error while copying package-lock.json: ${error.message}`);
    console.log('Continuing without package-lock.json...');
  }

  // Modify package.json for production (update server script to use bundled version)
  const packageJsonPath = path.join(distAllDir, CONSTANTS_FILES_DICT.PACKAGE_JSON);
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  // Update server script to use bundled version
  packageJson.scripts[CONSTANTS_SCRIPTS_DICT.SERVER] = `node ./${CONSTANTS_DIRS_DICT.DIST}/server.js`;

  // WHITELIST SCRIPTS
  const allowedScripts = [
    CONSTANTS_SCRIPTS_DICT.SERVER, // "server"
    'start_electron', // keep electron start if it exists
  ];

  // Construct new script map using allow-list
  const newScripts = {};

  Object.entries(packageJson.scripts).forEach(([key, value]) => {
    if (allowedScripts.includes(key)) {
      newScripts[key] = value;
    }
  });

  // Replace entire scripts section with whitelist
  packageJson.scripts = newScripts;

  // Keep Electron and dependencies needed for Electron main process (main.js)
  // main.js is NOT bundled, so it needs runtime dependencies
  const electronVersion = (packageJson.dependencies && packageJson.dependencies.electron)
    || (packageJson.devDependencies && packageJson.devDependencies.electron);

  if (!electronVersion) {
    throw new Error('Electron version not found in package.json');
  }

  // Dependencies required by main.js (Electron main process)
  // These are NOT bundled and must be available at runtime
  // TODO[Alex]: Add here your native dependencies to avoid cutting off them from the distribution
  const electronMainDependencies = [
    'electron',
    'xlsx', // Used in main.js for Excel export
    'html-to-docx', // Used in main.js for DOCX export
    'electron-store', // Used in main.js for settings storage
  ];

  // Build new dependencies object with only required ones
  const newDependencies = {
    electron: electronVersion,
  };

  // Preserve dependencies needed for Electron main process
  electronMainDependencies.forEach((depName) => {
    if (depName === 'electron') {
      return; // Already added
    }

    const depVersion = (packageJson.dependencies && packageJson.dependencies[depName])
      || (packageJson.devDependencies && packageJson.devDependencies[depName]);

    if (depVersion) {
      newDependencies[depName] = depVersion;
    } else {
      console.warn(`WARNING: ${depName} not found in dependencies or devDependencies!`);
    }
  });

  // Replace dependencies with only required ones
  packageJson.dependencies = newDependencies;

  // Remove ALL devDependencies
  delete packageJson.devDependencies;

  // Write modified package.json
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Copy main.js if needed
  if (await fs.stat(path.join(interfaceDir, CONSTANTS_FILES_DICT.MAIN_JS)).catch(() => null)) {
    await fs.copyFile(
      path.join(interfaceDir, CONSTANTS_FILES_DICT.MAIN_JS),
      path.join(distAllDir, CONSTANTS_FILES_DICT.MAIN_JS),
    );
  }

  // Copy preload.js (CRITICAL for Electron IPC)
  if (await fs.stat(path.join(interfaceDir, 'preload.js')).catch(() => null)) {
    await fs.copyFile(
      path.join(interfaceDir, 'preload.js'),
      path.join(distAllDir, 'preload.js'),
    );
  } else {
    console.warn('WARNING: preload.js not found! Electron IPC will not work!');
  }

  // Copy local modules required by main.js (NOT bundled)
  // main.js uses require() for these, so they must be available at runtime
  console.log('Copying local modules required by main.js...');

  // Copy src/utils/shared/fileIdGenerator.js
  const fileIdGeneratorSrc = path.join(interfaceDir, 'src/utils/shared/fileIdGenerator.js');
  const fileIdGeneratorDest = path.join(distAllDir, 'src/utils/shared/fileIdGenerator.js');
  if (await fs.stat(fileIdGeneratorSrc).catch(() => null)) {
    await fs.mkdir(path.dirname(fileIdGeneratorDest), { recursive: true });
    await fs.copyFile(fileIdGeneratorSrc, fileIdGeneratorDest);
    console.log('  Copied src/utils/shared/fileIdGenerator.js');
  } else {
    console.warn('WARNING: src/utils/shared/fileIdGenerator.js not found!');
  }

  // Copy src/server/services/utils.js (and its dependency constants.js)
  const utilsSrc = path.join(interfaceDir, 'src/server/services/utils.js');
  const utilsDest = path.join(distAllDir, 'src/server/services/utils.js');
  if (await fs.stat(utilsSrc).catch(() => null)) {
    await fs.mkdir(path.dirname(utilsDest), { recursive: true });
    await fs.copyFile(utilsSrc, utilsDest);
    console.log('  Copied src/server/services/utils.js');
  } else {
    console.warn('WARNING: src/server/services/utils.js not found!');
  }

  // Copy src/server/services/constants.js (required by utils.js)
  const constantsSrc = path.join(interfaceDir, 'src/server/services/constants.js');
  const constantsDest = path.join(distAllDir, 'src/server/services/constants.js');
  if (await fs.stat(constantsSrc).catch(() => null)) {
    await fs.mkdir(path.dirname(constantsDest), { recursive: true });
    await fs.copyFile(constantsSrc, constantsDest);
    console.log('  Copied src/server/services/constants.js');
  } else {
    console.warn('WARNING: src/server/services/constants.js not found!');
  }

  // Copy src/utils/registryClient.js (required by main.js for IPC communication)
  const registryClientSrc = path.join(interfaceDir, 'src/utils/registryClient.js');
  const registryClientDest = path.join(distAllDir, 'src/utils/registryClient.js');
  if (await fs.stat(registryClientSrc).catch(() => null)) {
    await fs.mkdir(path.dirname(registryClientDest), { recursive: true });
    await fs.copyFile(registryClientSrc, registryClientDest);
    console.log('  Copied src/utils/registryClient.js');
  } else {
    console.warn('WARNING: src/utils/registryClient.js not found!');
  }

  console.log(`Distribution prepared in ${CONSTANTS_DIRS_DICT.DIST_ALL}/`);
  console.log('Structure:');
  console.log(`  ${CONSTANTS_DIRS_DICT.DIST_ALL}/`);
  console.log(`    |-- ${CONSTANTS_DIRS_DICT.BUILD}/         (React frontend)`);
  console.log(`    |-- ${CONSTANTS_DIRS_DICT.DIST}/          (Bundled server: server.js)`);
  console.log(`    |-- ${CONSTANTS_DIRS_DICT.PUBLIC}/        (Static files)`);
  console.log(`    |-- ${CONSTANTS_DIRS_DICT.ELECTRON}/        (Static files)`);
  console.log(`    |-- ${CONSTANTS_DIRS_DICT.UPLOADS}/       (Server uploads directory)`);
  console.log(`    |-- ${CONSTANTS_FILES_DICT.PACKAGE_JSON}  (Package configuration)`);
  console.log(`    |-- ${CONSTANTS_FILES_DICT.MAIN_JS}       (Electron launcher)`);
  console.log('    |-- preload.js                            (Electron IPC bridge)');
  console.log('    |-- src/                                  (Local modules for main.js)');
  console.log('');
  console.log('Next step: Install dependencies:');
  console.log(`  cd ${CONSTANTS_DIRS_DICT.DIST_ALL}`);
  console.log('  npm install --omit=dev');
  console.log('');
  console.log('Note: Electron and Electron main process dependencies will be installed.');
  console.log('      (xlsx, html-to-docx, electron-store - required by main.js)');
  console.log('      Local modules (src/utils/shared, src/utils/registryClient, src/server/services) are copied.');
  console.log('      Server is bundled, no server runtime dependencies needed.');
}

prepareDist().catch((error) => {
  console.error('Error preparing distribution:', error);
  process.exit(1);
});
