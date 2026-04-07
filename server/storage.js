/**
 * Storage layer for ~/.cabinet/ directory.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const CABINET_DIR = path.join(os.homedir(), '.cabinet');
const TAGS_FILE = path.join(CABINET_DIR, 'tags.json');
const CONFIG_FILE = path.join(CABINET_DIR, 'config.json');

function ensureCabinetDir() {
  fs.mkdirSync(CABINET_DIR, { recursive: true });
}

function readTagsFile() {
  try {
    const raw = fs.readFileSync(TAGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { tags: [], assignments: [] };
  }
}

function writeTagsFile(data) {
  ensureCabinetDir();
  const tmpPath = TAGS_FILE + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, TAGS_FILE);
}

function readConfigFile() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfigFile(data) {
  ensureCabinetDir();
  const tmpPath = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, CONFIG_FILE);
}

module.exports = {
  CABINET_DIR,
  ensureCabinetDir,
  readTagsFile,
  writeTagsFile,
  readConfigFile,
  writeConfigFile,
};
