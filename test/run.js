// Runs every real regression test under test/ as a child process and
// reports a pass/fail summary, exiting non-zero if any fail. This is the
// single entry point CI (and `npm test`) uses.
//
// A few files under test/ are intentionally excluded:
//   - echo.js, stream.js: CLI demo scripts (they take a CSV file path as
//     an argv, not test files).
//   - empty-quote.js: fails on current Node - its writeStream mock strips
//     every comma from the written output (not just data-level commas),
//     which defeats its own `expected` value regardless of Node version.
//     Predates this test runner - noted here so a real regression doesn't
//     get lost in pre-existing noise. index.js used to be excluded for a
//     similar-looking but distinct reason (ERR_STREAM_DESTROYED writing to
//     /dev/null) - that was CsvWriter.close() calling destroy() before
//     end() on a real file stream, fixed alongside writer-roundtrip.js.
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var TEST_DIR = __dirname;

var TESTS = [
    'parser.js',
    'writer.js',
    'parse-edge-cases.js',
    'escape-chunk-boundary.js',
    'pause.js',
    'chunk-size-sweep.js',
    'index.js',
    'writer-roundtrip.js'
];

var KNOWN_FAILING = ['empty-quote.js'];

var failures = [];

TESTS.forEach(function (file) {
    process.stdout.write(file + ' ... ');
    try {
        execFileSync(process.execPath, [path.join(TEST_DIR, file)], { encoding: 'utf8', stdio: 'pipe' });
        console.log('OK');
    } catch (e) {
        console.log('FAILED');
        console.log((e.stdout || '') + (e.stderr || e.message));
        failures.push(file);
    }
});

if (KNOWN_FAILING.length) {
    console.log('\nSkipped (known pre-existing failures, not run): ' + KNOWN_FAILING.join(', '));
}

if (failures.length) {
    console.log('\n' + failures.length + '/' + TESTS.length + ' test file(s) failed: ' + failures.join(', '));
    process.exit(1);
}

console.log('\nAll ' + TESTS.length + ' test files passed.');
