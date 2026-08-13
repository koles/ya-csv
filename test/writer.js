// CsvWriter has no content-level test coverage (empty-quote.js only covers
// one trivial unquoted record). This pins the exact CSV output for a set of
// input records covering: fields needing quote-doubling, an embedded
// separator, an embedded CRLF, non-string values (number/null/undefined),
// non-ASCII text, an emoji (surrogate pair), a literal backslash, a literal
// NUL byte, a field made entirely of quote characters, and (separately)
// the escapeFormulas option.
var csv = require('../lib/ya-csv'),
    stream = require('stream'),
    assert = require('assert');

function collector() {
    var s = new stream.Stream();
    s.writable = true;
    s.data = '';
    s.write = function (data) { this.data += data; return true; };
    s.end = function () {};
    return s;
}

var records = [
    ['a', 'b', 'c'],
    ['say "hi"', 'a,b', 'line1\r\nline2'],
    [42, null, undefined],
    ['plain', 3.14, ''],
    ['ěščěšč', 'šřžščžýšřžý', '日本語', 'Emoji 🎉 test'],
    ['back\\slash', 'na\0l', '""double""quoted""', 'trailing\\']
];

var expected =
    '"a","b","c"\r\n' +
    '"say ""hi""","a,b","line1\r\nline2"\r\n' +
    '"42","",""\r\n' +
    '"plain","3.14",""\r\n' +
    '"ěščěšč","šřžščžýšřžý","日本語","Emoji 🎉 test"\r\n' +
    '"back\\slash","na\0l","""""double""""quoted""""","trailing\\"\r\n';

var out = collector();
var writer = csv.createCsvStreamWriter(out);
records.forEach(function (r) { writer.writeRecord(r); });
assert.strictEqual(out.data, expected);

// escapeFormulas: '=', '+', '-' as the first character get an apostrophe
// prepended so spreadsheet software won't treat the field as a formula.
var formulaOut = collector();
var formulaWriter = csv.createCsvStreamWriter(formulaOut, { escapeFormulas: true });
formulaWriter.writeRecord(['=1+1', '+cmd', '-2', 'normal']);
assert.strictEqual(formulaOut.data, '"\'=1+1","\'+cmd","\'-2","normal"\r\n');

// quoteAll: false only quotes fields that actually need it (contain the
// separator, quotechar, escapechar, or a CR/LF) - an empty field, a bare
// number, and plain text all come out unquoted. Same `records` fixture as
// above, so this also pins that the minimal-quoting decision doesn't
// change which characters get doubled inside a field that IS quoted.
var minimalExpected =
    'a,b,c\r\n' +
    '"say ""hi""","a,b","line1\r\nline2"\r\n' +
    '42,,\r\n' +
    'plain,3.14,\r\n' +
    'ěščěšč,šřžščžýšřžý,日本語,Emoji 🎉 test\r\n' +
    'back\\slash,na\0l,"""""double""""quoted""""",trailing\\\r\n';

var minimalOut = collector();
var minimalWriter = csv.createCsvStreamWriter(minimalOut, { quoteAll: false });
records.forEach(function (r) { minimalWriter.writeRecord(r); });
assert.strictEqual(minimalOut.data, minimalExpected);

// The minimally-quoted output must round-trip back through the reader to
// the same string-ified content as the always-quoted output does - proving
// the "does this field need quoting" decision doesn't just look plausible,
// it's actually sufficient to disambiguate on read-back.
var roundtrippedRows = [];
var roundtripReader = csv.createCsvStreamReader({ separator: ',', quote: '"' });
roundtripReader.addListener('data', function (row) { roundtrippedRows.push(row); });
roundtripReader.parse(minimalOut.data);
roundtripReader.end();
assert.deepStrictEqual(roundtrippedRows, [
    ['a', 'b', 'c'],
    ['say "hi"', 'a,b', 'line1\r\nline2'],
    ['42', '', ''],
    ['plain', '3.14', ''],
    ['ěščěšč', 'šřžščžýšřžý', '日本語', 'Emoji 🎉 test'],
    ['back\\slash', 'na\0l', '""double""quoted""', 'trailing\\']
]);

console.log('writer OK');
