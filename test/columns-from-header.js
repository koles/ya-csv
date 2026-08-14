// Regression test for TODO.md's "get a CSV record as a hash": already
// implemented via columnsFromHeader/columnNames (_addRecord treats the
// first row as headers and emits every subsequent row as an object instead
// of an array), but had zero test coverage anywhere in the suite.
var csv = require('../lib/ya-csv'),
    assert = require('assert');

// columnsFromHeader: true - the first row is consumed as column names, not
// emitted as a record itself.
var headerRows = [];
var headerReader = csv.createCsvStreamReader({
    separator: ',', quote: '"',
    columnsFromHeader: true
});
headerReader.addListener('data', function (row) { headerRows.push(row); });
headerReader.parse('a,b,c\r\n1,2,3\r\n4,5,6\r\n');
headerReader.end();

assert.deepStrictEqual(headerRows, [
    { a: '1', b: '2', c: '3' },
    { a: '4', b: '5', c: '6' }
]);

// columnNames passed explicitly - every row (there's no header row to
// consume) is emitted as an object keyed by the given names.
var namedRows = [];
var namedReader = csv.createCsvStreamReader({
    separator: ',', quote: '"',
    columnNames: ['x', 'y', 'z']
});
namedReader.addListener('data', function (row) { namedRows.push(row); });
namedReader.parse('1,2,3\r\n4,5,6\r\n');
namedReader.end();

assert.deepStrictEqual(namedRows, [
    { x: '1', y: '2', z: '3' },
    { x: '4', y: '5', z: '6' }
]);

console.log('columns-from-header OK');
