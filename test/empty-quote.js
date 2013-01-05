var csv = require('../lib/ya-csv'),
    stream = require('stream'),
    assert = require('assert');
    
// create a really simple writable stream
var writeStream = new stream.Stream();
writeStream.writable = true;
writeStream.data = '';
writeStream.write = function(data) {
  // this csv writer doesn't allow commas since there is no
  // quote or escape character. We're writing this for a really
  // piss-poor csv implementation.
  this.data += data.replace(/,/g, '');
};
writeStream.end = function() {
  // nothing to do
};

// create csv writer with empty string options
var csvWriter = csv.createCsvStreamWriter(writeStream, {
  separator: ',', // must remove in writeStream.write()
  quote: '',
  escape: ''
});

var csvRecord = ['John Smith', 'Customer 999', 'United States'];
csvWriter.writeRecord(csvRecord);

var expected = "John Smith,Customer 999,United States\r\n";
assert.strictEqual(writeStream.data, expected);
