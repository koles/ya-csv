# ya-csv

Event based CSV parser and writer for Node.js suitable for processing large CSV streams.

    // A simple echo program:
    var csv = require('ya-csv');

    var reader = csv.createCsvStreamReader(process.openStdin());
    var writer = csv.createCsvStreamWriter(process.stdout);

    reader.addListener('data', function(data) {
        writer.writeRecord(data);
    });

## Installation

    npm install ya-csv

Current version requires at least Node.js v0.2.3 and it's tested with Node.js v0.4.12, 0.6.11 and 0.7.5. Hope it works with the other versions in between too.

## Features

 - event based, suitable for processing big CSV streams
 - configurable separator, quote and escape characters (comma, double-quote and double-quote by default)
 - ignores lines starting with configurable comment character (off by default)
 - supports memory-only streaming

## More examples

Echo first column of the `data.csv` file:

    // equivalent of csv.createCsvFileReader('data.csv') 
    var reader = csv.createCsvFileReader('data.csv', {
        'separator': ',',
        'quote': '"',
        'escape': '"',       
        'comment': '',
    });
    var writer = new csv.CsvWriter(process.stdout);
    reader.addListener('data', function(data) {
        writer.writeRecord([ data[0] ]);
    });

Return data in objects rather than arrays: either by grabbing the column names form the header row (first row is not passed to the `data` listener):

    var reader = csv.createCsvFileReader('data.csv', { columnsFromHeader: true });
    reader.addListener('data', function(data) {
        // supposing there are so named columns in the source file
        sys.puts(data.col1 + " ... " + data.col2);
    });

... or by providing column names from the client code (first row is passed to the `data` listener in this case):

    var reader = csv.createCsvFileReader('data.csv');
    reader.setColumnNames([ 'col1', 'col2' ]);
    reader.addListener('data', function(data) {
        sys.puts(data.col1 + " ... " + data.col2);
    });

Note `reader.setColumnNames()` resets the column names so next invocation of the `data` listener will again receive the data in an array rather than an object.

Convert the `/etc/passwd` file to comma separated format, drop commented lines and dump the results to the standard output:

    var reader = csv.createCsvFileReader('/etc/passwd', {
        'separator': ':',
        'quote': '"',
        'escape': '"',
        'comment': '#',
    });
    var writer = new csv.CsvWriter(process.stdout);
    reader.addListener('data', function(data) {
        writer.writeRecord(data);
    });

Parsing an upload as the data comes in, using node-formidable:

    upload_form.onPart = function(part) {
        if (!part.filename) { upload_form.handlePart(part); return }

        var reader = csv.createCsvFileReader({'comment': '#'});
        reader.addListener('data', function(data) {
            saveRecord(data);
        });

        part.on('data', function(buffer) {
            // Pipe incoming data into the reader.
            reader.parse(buffer);
        });
        part.on('end', function() {
            reader.end()
        }
    }
