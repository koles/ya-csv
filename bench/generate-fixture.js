// Generates a synthetic CSV file for benchmarking.
// Usage: node generate-fixture.js <outputPath> <rows> <cols> [--quoted] [--dense]
var fs = require('fs');

var outputPath = process.argv[2];
var rows = parseInt(process.argv[3], 10) || 100000;
var cols = parseInt(process.argv[4], 10) || 10;
var quoted = process.argv.includes('--quoted');
var dense = process.argv.includes('--dense');

if (!outputPath) {
    console.error('Usage: node generate-fixture.js <outputPath> <rows> <cols> [--quoted] [--dense]');
    process.exit(1);
}

var stream = fs.createWriteStream(outputPath);

function field(r, c) {
    // --dense: every field is quoted free text packed with embedded
    // separators, representative of real quoted text columns (addresses,
    // notes, descriptions) - this is what exercises the parser's handling
    // of separator/newline characters that appear *inside* a quoted field
    // (as opposed to --quoted alone, which only embeds one occasionally).
    if (dense) {
        return '"value, with, many, embedded, commas, and, some, more, text, here, row' + r + 'col' + c + '"';
    }
    // Mix of plain values and occasional commas/quotes inside quoted mode,
    // representative of real-world exports (names, addresses, notes).
    var base = 'value_' + r + '_' + c;
    if (quoted) {
        if (c % 7 === 0) base += ', with a comma';
        if (c % 11 === 0) base += ' and a "quote"';
        return '"' + base.replace(/"/g, '""') + '"';
    }
    return base;
}

// Header
var header = [];
for (var c = 0; c < cols; c++) header.push('col' + c);
stream.write(header.join(',') + '\r\n');

for (var r = 0; r < rows; r++) {
    var rowFields = [];
    for (var c = 0; c < cols; c++) rowFields.push(field(r, c));
    stream.write(rowFields.join(',') + '\r\n');
}

stream.end(function () {
    var stats = fs.statSync(outputPath);
    console.log('Generated ' + outputPath + ': ' + rows + ' rows x ' + cols + ' cols, ' +
        (stats.size / 1024 / 1024).toFixed(2) + ' MB' + (dense ? ' (dense-quoted)' : quoted ? ' (quoted)' : ''));
});
