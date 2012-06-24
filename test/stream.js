var csv  = require('../lib/ya-csv'),
    util = require('util'),
    fs = require('fs');

util.debug('start');

if (process.argv.length < 3) {
    util.error("Usage: node " + process.argv[1] + " <csv file>");
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
    util.debug('end');
    util.debug(columns + ' columns, ' + lines + ' lines');
});

csvIn.addListener('error', function(e) {
    util.debug('error');
    util.debug(e);
});

csvIn.addListener('data', function(data) {
    lines++;
    columns += data.length;
});

var file = process.argv[2];
var fileIn = fs.createReadStream(file, {flags: 'r', bufferSize: 10});
fileIn.setEncoding('utf8');
fileIn.on('data', function(data) {
  util.debug(data);
  csvIn.parse(data);
});
fileIn.on('end', function(data) {
  csvIn.end();
});
