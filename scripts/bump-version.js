"use strict";

const fs = require("node:fs");
const path = require("node:path");

const isDryRun = process.argv.includes("--dry-run");
const rootDirectory = path.resolve(__dirname, "..");
const packagePath = path.join(rootDirectory, "package.json");
const packageLockPath = path.join(rootDirectory, "package-lock.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getNextPatchVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!match) {
    throw new Error(`Версия "${version}" должна быть в формате x.y.z`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + 1;
  return `${major}.${minor}.${patch}`;
}

const packageData = readJson(packagePath);
const nextVersion = getNextPatchVersion(packageData.version);

if (isDryRun) {
  console.log(`${packageData.version} -> ${nextVersion}`);
  process.exit(0);
}

packageData.version = nextVersion;
writeJson(packagePath, packageData);

if (fs.existsSync(packageLockPath)) {
  const packageLockData = readJson(packageLockPath);
  packageLockData.version = nextVersion;

  if (packageLockData.packages?.[""]) {
    packageLockData.packages[""].version = nextVersion;
  }

  writeJson(packageLockPath, packageLockData);
}

console.log(`Версия обновлена до ${nextVersion}`);
