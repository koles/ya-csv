var csv    = require('../lib/ya-csv'),
    sys    = require('sys'),
    assert = require('assert');

var testFile = 'test/crazy.csv';
var expectedRows = 7;
var expectedColsPerRow = 4;

var csvIn = csv.createCsvFileReader(testFile, {
    'separator': ',',
    'quote':   '"',
    'comment': '#',
});

var lines   = 0;
var columns = 0;

csvIn.addListener('end', function() {
    assert.strictEqual(expectedRows, lines, "Wrong number of records");
    sys.debug(columns + ' columns, ' + lines + ' lines');
});

csvIn.addListener('data', function(data) {
    lines++;
    assert.strictEqual(expectedColsPerRow, data.length,
        "Wrong number of fields per record in record #" + lines);
    columns += data.length;
});
