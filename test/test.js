var csv  = require('../lib/ya-csv'),
    sys  = require('sys');

var testFile = 'test/crazy.csv';
var expectedRows = 7;
var expectedColsPerRow = 4;

sys.debug('start');

var csvIn = csv.createCsvFileReader(testFile, {
    'separator': ',',
    'quote':   '"',
    'comment': '#',
});

var lines   = 0;
var columns = 0;

csvIn.addListener('end', function() {
    if (lines != expectedRows) {
       sys.debug('ERROR: found ' + lines + ' lines, expected '
           + expectedRows);
    }
    sys.debug('end');
    sys.debug(columns + ' columns, ' + lines + ' lines');
});

csvIn.addListener('data', function(data) {
    lines++;
    if (data.length != expectedColsPerRow) {
        sys.debug('ERROR: row #' + lines + ' has ' + data.length
            + ' columns, expected ' + expectedColsPerRow);
    }
    columns += data.length;
});
