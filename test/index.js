var csv    = require('../lib/ya-csv'),
    sys    = require('sys'),
    assert = require('assert');

var testFile = __dirname + '/crazy.csv';
var expectedRows = 7;
var expectedColsPerRow = 4;

var csvIn = csv.createCsvFileReader(testFile, {
    'separator': ',',
    'quote':   '"',
    'comment': '#',
});
var csvOut = csv.createCsvFileWriter('/dev/null', { 'encoding': 'utf8' });

var lines   = 0;
var columns = 0;

csvIn.addListener('end', function() {
    assert.strictEqual(expectedRows, lines, "Wrong number of records");
    sys.debug(columns + ' columns, ' + lines + ' lines');
});

csvIn.addListener('data', function(data) {
    lines++;
    data.push(1);
    csvOut.writeRecord(data);
    assert.strictEqual(expectedColsPerRow + 1, data.length,
        "Wrong number of fields per record in record #" + lines);
    columns += data.length;
});
