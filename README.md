# CSV parser and writer for Node.js

## Example

    // equivalent of csv.createCsvFileReader('data.csv') 
    var csvIn = csv.createCsvFileReader(file, {
        'separator': ',',
        'quote': '"',
        'escapechar': '"',       
        'comment': '',
    });
    var csvOut = new csv.CsvWriter(process.stdout);
    csvIn.addListener('data', function(data) {
        csvOut.writeRecord(data);
    });
    csvIn.addListener('end', function() {
        sys.debug('Done');
    });

