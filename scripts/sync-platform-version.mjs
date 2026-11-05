import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Invalid VYRO package version: ' + version);
}
const buildNumber = String(process.env.GITHUB_RUN_NUMBER || '1').replace(/[^0-9]/g, '') || '1';
const metadata = {
  app: 'VYRO',
  version,
  buildNumber,
  commit: process.env.GITHUB_SHA || null
};
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/version.json', JSON.stringify(metadata, null, 2) + '\n');

const gradlePath = 'android/app/build.gradle';
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  const codePattern = new RegExp('versionCode\\s+\\d+');
  const namePattern = new RegExp("versionName\\s+['\\\"][^'\\\"]+['\\\"]");
  if (!codePattern.test(gradle) || !namePattern.test(gradle)) {
    throw new Error('Could not safely locate Android versionCode/versionName in android/app/build.gradle');
  }
  gradle = gradle.replace(codePattern, 'versionCode ' + buildNumber);
  gradle = gradle.replace(namePattern, "versionName '" + version + "'");
  fs.writeFileSync(gradlePath, gradle);
}
console.log('VYRO version ' + version + ' (build ' + buildNumber + ') synchronized.');
