// Regression tests for the bulk-skip parsing optimization in
// CsvReader.prototype.parse(): it jumps over runs of ordinary characters
// via a charCodeAt()+lookup-table scan and a single slice() instead of
// visiting them one at a time (using a smaller "special char" table while
// inside a quoted field, since several chars are literal there), so these
// cover behavior that's easy to get wrong when doing that.
var csv = require('../lib/ya-csv'),
    stream = require('stream'),
    assert = require('assert');

function parseSync(input, options) {
    var rows = [];
    var reader = csv.createCsvStreamReader(options);
    reader.addListener('data', function (row) { rows.push(row); });
    reader.parse(input);
    reader.end();
    return rows;
}

// A bare CR (old Mac-style line ending) not immediately followed by LF,
// with ordinary characters in between, must not be confused with a CRLF
// pair by the time a real LF is reached later on.
assert.deepStrictEqual(
    parseSync('a\rb\nc\r', { separator: ',', quote: '"' }),
    [['a'], ['b'], ['c']],
    'bare CR followed by ordinary chars then LF should yield three separate rows'
);

// A handful of arbitrary single-byte chars used as separator/quote/comment,
// covering values that would need escaping if this were ever driven by a
// regex character class again (kept as a general correctness regression
// even though the current lookup-table implementation has no such concern).
['-', ']', '^', '\\'].forEach(function (special) {
    var options = { separator: special, quote: '"', escape: '"' };
    var rows = parseSync('a' + special + 'b\r\n', options);
    assert.deepStrictEqual(rows, [['a', 'b']],
        'separator ' + JSON.stringify(special) + ' should split fields correctly');
});

['-', ']', '^'].forEach(function (special) {
    var options = { separator: ',', quote: '"', comment: special };
    var rows = parseSync(special + 'ignored\r\na,b\r\n', options);
    assert.deepStrictEqual(rows, [['a', 'b']],
        'comment char ' + JSON.stringify(special) + ' should drop the commented line');
});

// Exactly one ordinary character between two special characters is the
// bulk-skip loop's tightest boundary case (start === i - 1): the slice
// bounds and the lastChar-sync-after-skip logic both need to agree on a
// single-character span, not just longer runs.
assert.deepStrictEqual(
    parseSync('a,b,c\r\n', { separator: ',', quote: '"' }),
    [['a', 'b', 'c']],
    'single-char fields (length-1 bulk-skip runs) should parse correctly'
);
assert.deepStrictEqual(
    parseSync(',a,\r\n', { separator: ',', quote: '"' }),
    [['', 'a', '']],
    'a length-1 field surrounded by separators should parse correctly'
);
assert.deepStrictEqual(
    parseSync('"a","b"\r\n', { separator: ',', quote: '"' }),
    [['a', 'b']],
    'single-char quoted fields (length-1 bulk-skip runs inside quotes) should parse correctly'
);

// Inside a quoted field, separator/CR/LF/comment chars are literal content,
// not field/record/comment boundaries - the bulk-skip loop uses a different
// (smaller) table there specifically so it doesn't stop at these. Each must
// still end up correctly embedded in the field value, including across
// separate parse() calls (chunk boundaries) within the same quoted field.
assert.deepStrictEqual(
    parseSync('a,"b,c,d",e\r\n', { separator: ',', quote: '"' }),
    [['a', 'b,c,d', 'e']],
    'embedded separators inside a quoted field should not split it'
);
assert.deepStrictEqual(
    parseSync('a,"line1\r\nline2",b\r\n', { separator: ',', quote: '"' }),
    [['a', 'line1\r\nline2', 'b']],
    'embedded CRLF inside a quoted field should not end the record'
);
assert.deepStrictEqual(
    parseSync('a,"b#c",d\r\n', { separator: ',', quote: '"', comment: '#' }),
    [['a', 'b#c', 'd']],
    'embedded comment char inside a quoted field should not start a comment'
);
(function () {
    var rows = [];
    var reader = csv.createCsvStreamReader({ separator: ',', quote: '"' });
    reader.addListener('data', function (row) { rows.push(row); });
    reader.parse('a,"b,c');
    reader.parse(',d",e\r\n');
    reader.end();
    assert.deepStrictEqual(rows, [['a', 'b,c,d', 'e']],
        'embedded separators inside a quoted field spanning multiple parse() calls should not split it');
})();

console.log('parse-edge-cases OK');
