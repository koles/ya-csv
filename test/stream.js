var csv  = require('../lib/ya-csv'),
    sys  = require('sys'),
    fs = require('fs');

sys.debug('start');

if (process.argv.length < 3) {
    sys.error("Usage: node " + process.argv[1] + " <csv file>");
    process.exit(1);
}

var csvIn = csv.createCsvStreamReader({
    'separator': ',',
    'quote':   '"',
    'comment': '#'
});

var lines   = 0;
var columns = 0;

csvIn.addListener('end', function() {
    sys.debug('end');
    sys.debug(columns + ' columns, ' + lines + ' lines');
});

csvIn.addListener('error', function(e) {
    sys.debug('error');
    sys.debug(e);
});

csvIn.addListener('data', function(data) {
    lines++;
    columns += data.length;
});

var file = process.argv[2];
var fileIn = fs.createReadStream(file, {flags: 'r', bufferSize: 10});
fileIn.setEncoding('utf8');
fileIn.on('data', function(data) {
  sys.debug(data);
  csvIn.parse(data);
});
fileIn.on('end', function(data) {
  csvIn.end();
});
