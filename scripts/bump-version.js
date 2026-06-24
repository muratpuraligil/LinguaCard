import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const versionTsPath = path.join(rootDir, 'src', 'version.ts');

// 1. Read and update package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const oldVersion = packageJson.version;
const versionParts = oldVersion.split('.');
let major = parseInt(versionParts[0]);
let minor = parseInt(versionParts[1]);
let patch = parseInt(versionParts[2]);

patch += 1;

if (major === 1 && minor === 0 && patch === 100) {
  minor = 2;
  patch = 0;
}

const newVersion = `${major}.${minor}.${patch}`;

packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// 2. Update src/version.ts
const today = new Date();
const dd = String(today.getDate()).padStart(2, '0');
const mm = String(today.getMonth() + 1).padStart(2, '0');
const yy = String(today.getFullYear()).slice(-2);
const dateStr = `${dd}${mm}${yy}`;

const versionTsContent = `export const APP_VERSION = "v${newVersion} - ${dateStr}";\n`;
fs.writeFileSync(versionTsPath, versionTsContent);

console.log(`Version bumped from ${oldVersion} to ${newVersion} with date ${dateStr}`);
