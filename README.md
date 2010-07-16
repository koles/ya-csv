# ya-csv

Event based CSV parser and writer for Node.js suitable for processing large CSV streams.

## Examples

A simple echo program:

    var csvIn = csv.createCsvStreamReader(process.openStdin());
    var csvOut = csv.createCsvStreamWriter(process.stdout);
    csvIn.addListener('data', function(data) {
        csvOut.writeRecord(data);
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
