var csv = require('../lib/ya-csv'),
    util = require('util');

var reader = csv.createCsvStreamReader(process.openStdin(), { columnsFromHeader: true });
var writer = csv.createCsvStreamWriter(process.stdout);

if (process.argv.length < 3) {
    util.error("Usage: " + process.argv[0] + " " + process.argv[1] + " <output columns>");
    process.exit(1);
}

var outColumns = [];
for (var i = 2; i < process.argv.length; i++) {
    outColumns.push(process.argv[i]);
}

writer.writeRecord(outColumns);
reader.addListener('data', function(data) {
    var out = [];
    for (var i = 0; i < outColumns.length; i++) {
        col = outColumns[i];
        out[i] = data[col];
    }
    writer.writeRecord(out);
});
