// Runs before dev/build/preview. On an old Node.js, Vite crashes with a cryptic
// "does not provide an export named 'constants'" error, so fail early with a
// clear message instead. Kept in old-style CommonJS so any Node version can run it.
var MIN = [18, 18, 0];
var current = process.versions.node.split('.').map(Number);

function atLeast(a, b) {
  for (var i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

if (!atLeast(current, MIN)) {
  console.error(
    [
      '',
      '  HuskyHub needs Node.js ' + MIN.join('.') + ' or newer — this computer has v' + process.versions.node + '.',
      '',
      '  1. Install the current LTS version from https://nodejs.org',
      '  2. Open a new terminal in this folder and run:  npm install',
      '  3. Then start the site again:                   npm run dev',
      '',
    ].join('\n'),
  );
  process.exit(1);
}
