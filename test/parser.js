// test/index.js only checks row/column *counts* for test.csv - it would
// pass even if every field's actual content were wrong, as long as the
// counts came out right. This test asserts the exact parsed content
// instead, field by field, for every row - including the tricky ones:
// doubled-quote escaping, a literal newline embedded inside a quoted field
// spanning two physical lines, a literal NUL byte, non-ASCII text, an
// emoji (a surrogate pair - two UTF-16 code units), and a trailing empty
// field.
var csv = require('../lib/ya-csv'),
    assert = require('assert');

var testFile = __dirname + '/test.csv';

var expected = [
    ['Header1', 'Header 2', 'Header "3"', 'Header 4'],
    ['col 1.1', 'col 1.2\\', 'col 1.3\\', 'col\n1.4'],
    ['col 2.1', 'col 2.2', 'col 2.3', 'col 2.4'],
    ['aaa', 'bbb\0', 'ccc', 'ddd'],
    ['ěščěšč', 'šřžščžýšřžý', '+ěššč', 'ěěěěěě🎉'],
    ['one', '"two", two-and-half', 'three', 'four'],
    ['1', '2', '3', '']
];

var rows = [];
var reader = csv.createCsvFileReader(testFile, {
    'separator': ',',
    'quote': '"',
    'comment': '#'
});

reader.addListener('data', function (row) {
    rows.push(row);
});

reader.addListener('end', function () {
    assert.deepStrictEqual(rows, expected);
    console.log('parser OK');
});

reader.addListener('error', function (e) {
    throw e;
});
