# ya-csv

Event based CSV parser and writer for Node.js suitable for processing large CSV streams.

## Example

A simple echo program:

    var csvIn = csv.createCsvFileReader(process.openStdin());
    var csvOut = new csv.CsvWriter(process.stdout);
    csvIn.addListener('data', function(data) {
        csvOut.writeRecord(data);
    });
    csvIn.addListener('end', function() {
        sys.debug('Done');
    });

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

