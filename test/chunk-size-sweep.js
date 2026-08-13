// Closes a coverage gap found while comparing against uDSV's test suite
// (https://github.com/leeoniya/uDSV/blob/main/test/parse.spec.mjs): our
// chunk-boundary tests (escape-chunk-boundary.js, and the last case in
// parse-edge-cases.js) were a handful of hand-picked split points, not a
// systematic sweep. uDSV exhaustively re-parses real fixtures at every
// chunk size in a range and diffs against the non-chunked parse, plus a
// dedicated sweep over every split point of a bare \r\n. This does both,
// against our own fixtures.
var fs = require('fs'),
    csv = require('../lib/ya-csv'),
    assert = require('assert');

function parseSync(input, options) {
    var rows = [];
    var reader = csv.createCsvStreamReader(options);
    reader.addListener('data', function (row) { rows.push(row); });
    reader.parse(input);
    reader.end();
    return rows;
}

function parseChunked(input, chunkSize, options) {
    var rows = [];
    var reader = csv.createCsvStreamReader(options);
    reader.addListener('data', function (row) { rows.push(row); });
    for (var i = 0; i < input.length; i += chunkSize) {
        reader.parse(input.slice(i, i + chunkSize));
    }
    reader.end();
    return rows;
}

function parseAtSplit(input, splitAt, options) {
    var rows = [];
    var reader = csv.createCsvStreamReader(options);
    reader.addListener('data', function (row) { rows.push(row); });
    reader.parse(input.slice(0, splitAt));
    reader.parse(input.slice(splitAt));
    reader.end();
    return rows;
}

// Fixture 1: the repo's real test.csv - doubled quotes, a quoted field
// spanning two physical lines, a NUL byte, non-ASCII text, an emoji (a
// surrogate pair - two UTF-16 code units, so this also exercises a chunk
// boundary landing in the middle of one), and a trailing empty field.
var testCsv = fs.readFileSync(__dirname + '/test.csv', 'utf8');

// Fixture 2: CRLF line endings, a comment line, and quoted fields with
// embedded separator/CRLF - test.csv alone doesn't cover any of these.
var crlfCsv = [
    'a,b,c\r\n',
    '# a full-line comment\r\n',
    '1,"two, still two","three\r\nstill three"\r\n',
    '4,5,6\r\n'
].join('');

[
    { name: 'test.csv', data: testCsv, options: { separator: ',', quote: '"', comment: '#' } },
    { name: 'crlf+comment', data: crlfCsv, options: { separator: ',', quote: '"', comment: '#' } }
].forEach(function (fixture) {
    var reference = parseSync(fixture.data, fixture.options);
    assert.ok(reference.length > 0, fixture.name + ' reference parse should not be empty');

    for (var chunkSize = 1; chunkSize <= fixture.data.length; chunkSize++) {
        var rows = parseChunked(fixture.data, chunkSize, fixture.options);
        assert.deepStrictEqual(rows, reference,
            fixture.name + ' at chunk size ' + chunkSize + ' should match the non-chunked parse');
    }
});

// Every single split point of a bare \r\n sequence specifically - CRLF
// coalescing (the '\n' case in parse()) depends on parsingStatus.lastChar
// surviving a chunk boundary correctly, including when the boundary lands
// exactly between the \r and the \n.
var crlfOnly = 'a,b,c\r\n1,2,3\r\n4,5,6\r\n';
var crlfOptions = { separator: ',', quote: '"' };
var crlfReference = parseSync(crlfOnly, crlfOptions);
for (var split = 1; split < crlfOnly.length; split++) {
    assert.deepStrictEqual(
        parseAtSplit(crlfOnly, split, crlfOptions),
        crlfReference,
        'splitting at offset ' + split + ' should match the non-chunked parse'
    );
}

console.log('chunk-size-sweep OK');
