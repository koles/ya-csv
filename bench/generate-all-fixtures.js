// Regenerates the standard fixture set used by bench/run.js.
// Kept deterministic and out of git (see bench/fixtures/.gitignore) since
// these files can get large; every dev/CI run regenerates them locally.
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var fixturesDir = path.join(__dirname, 'fixtures');
require('fs').mkdirSync(fixturesDir, { recursive: true });

var specs = [
    // [filename, rows, cols, quoted?, dense?]
    ['small-unquoted.csv', 10000, 10, false, false],
    ['small-quoted.csv', 10000, 10, true, false],
    ['large-unquoted.csv', 200000, 15, false, false],
    ['large-quoted.csv', 200000, 15, true, false],
    // Every field is quoted text packed with embedded separators, unlike
    // large-quoted.csv above where that's rare - representative of real
    // free-text columns (addresses, notes, descriptions) and the fixture
    // that actually exercises bulk-skip behavior *inside* quoted fields.
    ['dense-quoted.csv', 100000, 8, true, true]
];

specs.forEach(function (spec) {
    var args = [
        path.join(__dirname, 'generate-fixture.js'),
        path.join(fixturesDir, spec[0]),
        String(spec[1]),
        String(spec[2])
    ];
    if (spec[3]) args.push('--quoted');
    if (spec[4]) args.push('--dense');
    execFileSync('node', args, { stdio: 'inherit' });
});
