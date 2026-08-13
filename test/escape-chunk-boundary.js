// Regression tests for issue #45: an escape/quote character landing exactly
// on a 'data' chunk boundary was resolved by guessing (nextChar === '' was
// treated as "not an escape"), which is wrong whenever the escape's second
// half is actually the first character of the *next* chunk - it silently
// drops or misplaces characters instead of parsing the pair correctly.
//
// PR #46 (Chris Alvares, https://github.com/koles/ya-csv/pull/46) first
// identified and fixed this for the default config where escape === quote.
// This supersedes that PR with a more general fix: parse() now defers the
// decision (via parsingStatus.pendingEscapeChar) until the next chunk
// arrives instead of guessing, which also covers the case #46's review
// flagged as unhandled - escape and quote configured as different
// characters - and removes the stale-flag risk the review raised for the
// original fix (see PR #46's review comments for both points).
var csv = require('../lib/ya-csv'),
    assert = require('assert');

function parseChunks(chunks, options) {
    var rows = [];
    var reader = csv.createCsvStreamReader(options);
    reader.addListener('data', function (row) { rows.push(row); });
    chunks.forEach(function (chunk) { reader.parse(chunk); });
    reader.end();
    return rows;
}

// --- default config (escape === quote === '"'), the exact shape from #45 ---
// `"quote""d field here"` split right between the two quotechars of the
// escaped-quote pair.
assert.deepStrictEqual(
    parseChunks(
        ['test,123,"quote"', '"d field here"\r\n'],
        { separator: ',', quote: '"' }
    ),
    [['test', '123', 'quote"d field here']],
    'escaped quote pair split across a chunk boundary should parse as one literal quote, not close the field early'
);

// --- distinct escape/quote characters (the case #46's review said was still broken) ---
// escape = '\\', quote = '"': `"quo\"te"` split right between the escapechar
// and the quotechar it's escaping.
assert.deepStrictEqual(
    parseChunks(
        ['a,"quo\\', '"te",b\r\n'],
        { separator: ',', quote: '"', escape: '\\' }
    ),
    [['a', 'quo"te', 'b']],
    'escapechar/quotechar pair split across a chunk boundary should still work when escape and quote differ'
);

// --- a real closing quote landing on a chunk boundary must not be treated as pending forever ---
// `"b"` closes right at the end of chunk 1; chunk 2 starts with a separator
// (not an escape partner), so the deferred char must resolve as a genuine
// closing quote, and parsing must continue normally afterwards.
assert.deepStrictEqual(
    parseChunks(
        ['a,"b"', ',c\r\n', 'd,"e""f"\r\n'],
        { separator: ',', quote: '"' }
    ),
    [['a', 'b', 'c'], ['d', 'e"f']],
    'a closing quote at a chunk boundary followed by a non-escape char should resolve as a real close, and not affect later escape handling'
);

// --- stream ends with no further chunk while a char is still pending ---
// `"y"` closes right at the very end of all data - end() must resolve it
// instead of leaving the field unterminated.
var endRows = [];
var endReader = csv.createCsvStreamReader({ separator: ',', quote: '"' });
endReader.addListener('data', function (row) { endRows.push(row); });
var sawError = false;
endReader.addListener('error', function () { sawError = true; });
endReader.parse('x,"y"');
endReader.end();
assert.strictEqual(sawError, false, 'a chunk-ending quote resolved by end() should not raise an unterminated-quote error');
assert.deepStrictEqual(endRows, [['x', 'y']], 'end() should resolve a pending chunk-boundary char using the fact that no more data is coming');

console.log('escape-chunk-boundary OK');
