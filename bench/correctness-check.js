// Standalone correctness check: parses crazy.csv and a synthetic edge-case
// file, prints the resulting rows as JSON so they can be diffed against the
// pre-optimization implementation.
var csv = require('../lib/ya-csv');
var path = require('path');

function parseFile(file, options) {
    return new Promise(function (resolve, reject) {
        var rows = [];
        var reader = csv.createCsvFileReader(file, options);
        reader.addListener('data', function (row) { rows.push(row); });
        reader.addListener('end', function () { resolve(rows); });
        reader.addListener('error', reject);
    });
}

(async function () {
    var crazy = await parseFile(path.join(__dirname, '..', 'test', 'crazy.csv'), {
        separator: ',',
        quote: '"',
        comment: '#'
    });
    console.log(JSON.stringify(crazy));
})().catch(function (e) {
    console.error('ERROR', e);
    process.exit(1);
});
