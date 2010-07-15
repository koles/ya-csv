var csv  = require('../lib/ya-csv'),
    sys  = require('sys');

sys.debug('start');

if (process.argv.length < 3) {
    sys.error("Usage: node " + process.argv[1] + " <csv file>");
    process.exit(1);
}

var file = process.argv[2];

var csvIn = csv.createCsvFileReader(file, {
    'separator': ',',
    'quote':   '"',
    'comment': '#',
});
var csvOut = new csv.CsvWriter(process.stdout);

csvIn.addListener('end', function() {
    sys.debug('end');
});
csvIn.addListener('data', function(data) {
    csvOut.writeRecord(data);
});
