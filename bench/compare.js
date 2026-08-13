#!/usr/bin/env node
// Benchmarks the current working tree against a previous git commit (default:
// HEAD) using an isolated git worktree, and reports/regresses on slowdowns.
//
// Usage:
//   node bench/compare.js                 # working tree vs HEAD
//   node bench/compare.js --base=HEAD~5    # working tree vs 5 commits back
//   node bench/compare.js --base=v1.0.0 --threshold=15
//
// Exit code is non-zero if any fixture regresses past --threshold percent,
// so this can gate a CI job.
var path = require('path');
var os = require('os');
var fs = require('fs');
var execFileSync = require('child_process').execFileSync;

var REPO_ROOT = path.join(__dirname, '..');

function arg(name, fallback) {
    var prefix = '--' + name + '=';
    var found = process.argv.find(function (a) { return a.indexOf(prefix) === 0; });
    return found ? found.slice(prefix.length) : fallback;
}

var baseRef = arg('base', 'HEAD');
var thresholdPct = parseFloat(arg('threshold', '10')); // % slower = regression

function sh(cmd, args, opts) {
    return execFileSync(cmd, args, Object.assign({ cwd: REPO_ROOT, encoding: 'utf8' }, opts || {}));
}

// Older commits (including any commit predating this benchmark harness
// itself) may not have bench/*.js. We always run the *current* harness
// code against both trees so we're only ever measuring the lib/ difference,
// never accidentally comparing two different benchmark implementations.
function syncHarness(targetDir) {
    if (path.resolve(targetDir) === path.resolve(REPO_ROOT)) return;
    var srcBench = path.join(REPO_ROOT, 'bench');
    var dstBench = path.join(targetDir, 'bench');
    fs.mkdirSync(dstBench, { recursive: true });
    fs.readdirSync(srcBench).forEach(function (f) {
        if (f === 'fixtures') return; // never copy generated data
        var srcFile = path.join(srcBench, f);
        if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, path.join(dstBench, f));
        }
    });
}

function runBenchIn(dir, label) {
    console.error('--- Running benchmark for ' + label + ' (' + dir + ') ---');
    syncHarness(dir);
    // Fixtures are regenerated identically in both trees so file content is
    // never a variable between the two measurements.
    sh('node', [path.join(dir, 'bench', 'generate-all-fixtures.js')]);
    var out = sh('node', [path.join(dir, 'bench', 'run.js')], {
        env: Object.assign({}, process.env, { BENCH_COMMIT: label })
    });
    return JSON.parse(out);
}

function main() {
    // 1. Benchmark the current working tree as-is (uncommitted changes included).
    var currentResult = runBenchIn(REPO_ROOT, 'working-tree');

    // 2. Check out `baseRef` into a throwaway worktree and benchmark that.
    var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ya-csv-bench-'));
    var resolvedSha = sh('git', ['rev-parse', baseRef]).trim();
    console.error('Comparing against ' + baseRef + ' (' + resolvedSha.slice(0, 8) + ')');

    sh('git', ['worktree', 'add', '--detach', tmpDir, resolvedSha]);
    var baseResult;
    try {
        baseResult = runBenchIn(tmpDir, resolvedSha.slice(0, 8));
    } finally {
        sh('git', ['worktree', 'remove', '--force', tmpDir]);
    }

    // 3. Compare fixture-by-fixture.
    var baseByFile = {};
    baseResult.results.forEach(function (r) { baseByFile[r.file] = r; });

    var rows = [];
    var worstRegressionPct = 0;
    currentResult.results.forEach(function (cur) {
        var base = baseByFile[cur.file];
        if (!base) return; // fixture didn't exist in base commit
        var deltaPct = ((cur.medianMs - base.medianMs) / base.medianMs) * 100;
        worstRegressionPct = Math.max(worstRegressionPct, deltaPct);
        rows.push({
            file: cur.file,
            baseMs: base.medianMs,
            curMs: cur.medianMs,
            deltaPct: deltaPct
        });
    });

    console.log('');
    console.log('Fixture               base(ms)   current(ms)   change');
    console.log('---------------------------------------------------------');
    rows.forEach(function (r) {
        var sign = r.deltaPct >= 0 ? '+' : '';
        var flag = r.deltaPct > thresholdPct ? '  <-- REGRESSION' : '';
        console.log(
            r.file.padEnd(22) +
            r.baseMs.toFixed(1).padStart(8) + '   ' +
            r.curMs.toFixed(1).padStart(10) + '   ' +
            (sign + r.deltaPct.toFixed(1) + '%').padStart(8) +
            flag
        );
    });
    console.log('');

    if (worstRegressionPct > thresholdPct) {
        console.error(
            'FAIL: worst regression is ' + worstRegressionPct.toFixed(1) + '%, ' +
            'exceeding threshold of ' + thresholdPct + '%.'
        );
        process.exit(1);
    } else {
        console.log(
            'OK: no fixture regressed more than ' + thresholdPct + '% ' +
            '(worst: ' + worstRegressionPct.toFixed(1) + '%).'
        );
    }
}

main();
