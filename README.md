# ya-csv

Event based CSV parser and writer for Node.js suitable for processing large CSV streams.

    // A simple echo program:
    var csv = require('ya-csv');

    var csvIn = csv.createCsvStreamReader(process.openStdin());
    var csvOut = csv.createCsvStreamWriter(process.stdout);

    csvIn.addListener('data', function(data) {
        csvOut.writeRecord(data);
    });

## Installation

    npm install ya-csv

Current version requires at least Node.js v0.1.99 and it's tested with Node.js v0.1.100.

## Features

 - event based, suitable for processing big CSV streams
 - configurable separator, quote and escape characters (comma, double-quote and double-quote by default)
- ignores lines starting with configurable comment character (off by default)

## More examples

Echo first column of the `data.csv` file:

    // equivalent of csv.createCsvFileReader('data.csv') 
    var csvIn = csv.createCsvFileReader('data.csv', {
        'separator': ',',
        'quote': '"',
        'escapechar': '"',       
        'comment': '',
    });
    var csvOut = new csv.CsvWriter(process.stdout);
    csvIn.addListener('data', function(data) {
        csvOut.writeRecord([ data[0] ]);
    });

Convert the `/etc/passwd` file to comma separated format, drop commented lines and dump the results to the standard output:

    var csvIn = csv.createCsvFileReader('/etc/passwd', {
        'separator': ':',
        'quote': '"',
        'escapechar': '"',       
        'comment': '#',
    });
    var csvOut = new csv.CsvWriter(process.stdout);
    csvIn.addListener('data', function(data) {
        csvOut.writeRecord([ data[0] ]);
    });
