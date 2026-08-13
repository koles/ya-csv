// Round-trips test.csv through the real file-based reader/writer pair
// (createCsvFileReader -> createCsvFileWriter, not the in-memory mock
// streams the other writer tests use) and diffs the result against a
// checked-in golden file, byte for byte.
//
// MD5 first since it's a single pass over the whole buffer and cheap for
// files this size; only fall back to a byte-by-byte scan (to report where
// and how the output actually diverged) if the digests disagree - no need
// to pay for the detailed diff on the common, passing case.
var csv = require('../lib/ya-csv'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    crypto = require('crypto'),
    assert = require('assert');

var sourceFile = __dirname + '/test.csv';
var expectedFile = __dirname + '/writer-roundtrip-expected.csv';
var outFile = path.join(os.tmpdir(), 'ya-csv-writer-roundtrip-' + process.pid + '.csv');

function md5(buf) {
    return crypto.createHash('md5').update(buf).digest('hex');
}

function reportByteDiff(expected, actual) {
    console.log('length: expected ' + expected.length + ' bytes, actual ' + actual.length + ' bytes');

    var maxLen = Math.max(expected.length, actual.length);
    var shown = 0;
    for (var i = 0; i < maxLen && shown < 10; i++) {
        var e = i < expected.length ? expected[i] : null;
        var a = i < actual.length ? actual[i] : null;
        if (e !== a) {
            console.log('byte ' + i + ': expected ' + (e === null ? '<eof>' : '0x' + e.toString(16)) +
                ' (' + JSON.stringify(String.fromCharCode(e || 0)) + ')' +
                ', actual ' + (a === null ? '<eof>' : '0x' + a.toString(16)) +
                ' (' + JSON.stringify(String.fromCharCode(a || 0)) + ')');
            shown++;
        }
    }
}

var reader = csv.createCsvFileReader(sourceFile, {
    separator: ',', quote: '"', comment: '#'
});

var records = [];
reader.addListener('data', function (row) { records.push(row); });

reader.addListener('error', function (e) { throw e; });

reader.addListener('end', function () {
    var writer = csv.createCsvFileWriter(outFile);
    records.forEach(function (r) { writer.writeRecord(r); });

    writer.addListener('close', function () {
        var expected = fs.readFileSync(expectedFile);
        var actual = fs.readFileSync(outFile);
        fs.unlinkSync(outFile);

        if (md5(expected) !== md5(actual)) {
            reportByteDiff(expected, actual);
            assert.fail('writer output does not match ' + path.basename(expectedFile) + ' (see byte diff above)');
        }

        console.log('writer-roundtrip OK');
    });

    writer.close();
});
