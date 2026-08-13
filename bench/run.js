// Measures ya-csv parse throughput against one or more fixture files.
// Outputs a single JSON object to stdout so it can be piped into
// compare.js or into a CI artifact. All human-readable logging goes to
// stderr to keep stdout machine-parseable.
var fs = require('fs');
var path = require('path');
var csv = require('../lib/ya-csv');

var FIXTURES_DIR = path.join(__dirname, 'fixtures');
var WARMUP_RUNS = 2;
var MEASURED_RUNS = 5;

function parseFile(file) {
    return new Promise(function (resolve, reject) {
        var rows = 0;
        var reader = csv.createCsvFileReader(file);
        reader.addListener('data', function () { rows++; });
        reader.addListener('end', function () { resolve(rows); });
        reader.addListener('error', reject);
    });
}

async function timeFile(file) {
    var sizeBytes = fs.statSync(file).size;

    // Warmup: lets V8 JIT the hot path before we start measuring, so we're
    // benchmarking steady-state performance, not compilation.
    for (var w = 0; w < WARMUP_RUNS; w++) {
        await parseFile(file);
    }

    var samples = [];
    var rowCount = 0;
    for (var i = 0; i < MEASURED_RUNS; i++) {
        var start = process.hrtime.bigint();
        rowCount = await parseFile(file);
        var end = process.hrtime.bigint();
        samples.push(Number(end - start) / 1e6); // ms
    }

    samples.sort(function (a, b) { return a - b; });
    var median = samples[Math.floor(samples.length / 2)];

    return {
        file: path.basename(file),
        sizeBytes: sizeBytes,
        rows: rowCount,
        samplesMs: samples,
        medianMs: median,
        rowsPerSec: Math.round(rowCount / (median / 1000)),
        mbPerSec: +((sizeBytes / 1024 / 1024) / (median / 1000)).toFixed(2)
    };
}

async function main() {
    if (!fs.existsSync(FIXTURES_DIR)) {
        console.error('No fixtures found at ' + FIXTURES_DIR);
        console.error('Run: node bench/generate-all-fixtures.js');
        process.exit(1);
    }

    var files = fs.readdirSync(FIXTURES_DIR)
        .filter(function (f) { return f.endsWith('.csv'); })
        .map(function (f) { return path.join(FIXTURES_DIR, f); });

    if (files.length === 0) {
        console.error('Fixtures directory is empty. Run: node bench/generate-all-fixtures.js');
        process.exit(1);
    }

    var results = [];
    for (var i = 0; i < files.length; i++) {
        console.error('Benchmarking ' + path.basename(files[i]) + '...');
        results.push(await timeFile(files[i]));
    }

    var output = {
        node: process.version,
        commit: process.env.BENCH_COMMIT || null,
        timestamp: new Date().toISOString(),
        results: results
    };

    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main().catch(function (e) {
    console.error(e);
    process.exit(1);
});
