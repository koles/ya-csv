var csv  = require('../lib/ya-csv'),
    util = require('util');

util.debug('start');

if (process.argv.length < 3) {
    util.error("Usage: node " + process.argv[1] + " <csv file>");
    process.exit(1);
}

var file = process.argv[2];

var csvIn = csv.createCsvFileReader(file, {
    'separator': ',',
    'quote':   '"',
    'comment': '#',
});
var csvOut = new csv.CsvWriter(process.stdout, {
    'encoding': 'utf8'        
});

var lines   = 0;
var columns = 0;

csvIn.addListener('end', function() {
    util.debug('end');
    util.debug(columns + ' columns, ' + lines + ' lines');
});

csvIn.addListener('data', function(data) {
    lines++;
    columns += data.length;
    csvOut.writeRecord(data);
});
