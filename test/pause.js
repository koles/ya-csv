// Regression test for issue #41: reader.pause() didn't stop the reader
// from emitting rows that were already sitting in a 'data' chunk that had
// more than one CSV row in it. readStream.pause() only prevents *future*
// chunks from arriving; it does nothing about rows still queued up inside
// the chunk parse() is already looping over.
var csv    = require('../lib/ya-csv'),
    events = require('events'),
    util   = require('util'),
    assert = require('assert');

// A minimal fake readStream: just enough surface (addListener/pause/resume)
// for CsvReader to work with, so we can control exactly when/how much data
// arrives and observe whether pause() really took effect.
function FakeStream() {
    events.EventEmitter.call(this);
}
util.inherits(FakeStream, events.EventEmitter);
FakeStream.prototype.setEncoding = function() {};
FakeStream.prototype.pause = function() {
    this.paused = true;
};
FakeStream.prototype.resume = function() {
    this.paused = false;
};

var fakeStream = new FakeStream();
var reader = csv.createCsvStreamReader(fakeStream, {});

var rows = [];
reader.addListener('data', function(row) {
    rows.push(row);
    if (rows.length === 1) {
        reader.pause();
    }
});

// A single chunk containing three complete rows, just like a real
// readStream would deliver when a small file (or one buffered block of a
// larger one) arrives in one piece.
fakeStream.emit('data', 'a,b\r\nc,d\r\ne,f\r\n');

assert.strictEqual(rows.length, 1,
    'pause() should stop parsing before the remaining rows in the same chunk are emitted');
assert.ok(fakeStream.paused, 'the underlying stream should also have been paused');

reader.resume();

assert.strictEqual(rows.length, 3,
    'resume() should finish parsing the rows left over from the paused chunk');
assert.deepEqual(rows, [['a', 'b'], ['c', 'd'], ['e', 'f']]);

console.log('pause/resume test passed');
