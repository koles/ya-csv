var sys;
try {
  sys    = require('util'); 
} catch (e) {
  sys    = require('sys');
}
var events = require('events'),
    fs     = require('fs');

var csv = exports;

/**
 * Provides Base CSV Reading capabilities
 * @class CsvReader
 * @extends EventEmitter
 */

/**
 * The constructor
 * @constructor
 * @param readStream {ReadStread} An instance of the ReadStream Cl
 * @param options {Object} optional paramaters for the reader <br/>
 *     - separator {String}
 *     - quote {String}
 *     - escape {String}
 *     - comment {String}
 *     - columnNames {Boolean}
 *     - columnsFromHeader {Boolean}
 *     - nestedQuotes {Boolean}
 */
var CsvReader = csv.CsvReader = function(readStream, options) {
    var self = this;
    var hasEnded = false;
    _setOptions(self, options);

    self.parsingStatus = {
        rows:             0,
        openRecord:       [],
        openField:        '',
        lastChar:         '',
        quotedField:      false,
        commentedLine:    false,
        pendingEscapeChar: null
    };

    if (readStream) {
        readStream.addListener('data', function (data) {
            if (hasEnded) {
                return;
            }

            try {
                self.parse(data);
            } catch (e) {
                hasEnded = true;
                self.emit('error', e);
            }
        });
        readStream.addListener('error', this.emit.bind(this, 'error'));
        readStream.addListener('end', this.end.bind(this));


        /**
         * Pauses the readStream
         * @method pause
         * @return {ReadStream} the readstream instance
         */
        self.pause = function(){
            readStream.pause();
            return self;
        };

        /**
         * Resumes the readStream
         * @method resume
         * @return {ReadStream} the readstream instance
         */
        self.resume = function(){
            readStream.resume();
            return self;
        }

        /**
         * Closes the readStream
         * @method destroy
         * @return {ReadStream} the readstream instance
         */
        self.destroy = function(){
            readStream.destroy();
            return self;
        }

        /**
         * Closes the readStream when its file stream has been drained
         * @method destroySoon
         * @return {ReadStream} the readstream instance
         */
        self.destroySoon = function(){
            readstream.destroy();
            return self;
        }
    }

};
sys.inherits(CsvReader, events.EventEmitter);

/**
 * Parses incoming data as a readable CSV file
 * @method parse
 * @param data {Array} Array of values to parse from the incommin file
 */
CsvReader.prototype.parse = function(data) {
    var ps = this.parsingStatus;

    // The previous chunk ended on a char that's only resolvable by looking
    // at what follows (see the deferral below) - now that a new chunk has
    // arrived, resolve it against this chunk's first character before
    // doing anything else.
    if (ps.pendingEscapeChar !== null) {
        var pendingChar = ps.pendingEscapeChar;
        ps.pendingEscapeChar = null;
        if (this._handleQuoteOrEscapeChar(pendingChar, data.charAt(0))) {
            data = data.slice(1);
        }
        ps.lastChar = pendingChar;
    }

    if (ps.openRecord.length == 0) {
        if (data.charCodeAt(0) === 0xFEFF) {
            data = data.slice(1);
        }
    }
    for (var i = 0; i < data.length; i++) {
        var c = data.charAt(i);
        switch (c) {
            // escape and separator may be the same char, typically '"'
            case this.escapechar:
            case this.quotechar:
                if (ps.commentedLine) break;
                if (i + 1 >= data.length && this._isEscapeAmbiguous(c)) {
                    // c is the very last character of this chunk, and
                    // whether it's an escape sequence or a real
                    // quote/escape char can only be known by looking at
                    // the character that follows - which hasn't arrived
                    // yet. Defer the decision to the next parse() call
                    // instead of guessing (guessing wrong silently drops
                    // or duplicates characters - see issue #45).
                    ps.pendingEscapeChar = c;
                    return;
                }
                if (this._handleQuoteOrEscapeChar(c, data.charAt(i + 1))) {
                    i++;
                }
                break;
            case this.separator:
                if (ps.commentedLine) break;
                if (ps.quotedField) {
                    this._addCharacter(c);
                } else {
                    this._addField();
                }
                break;
            case '\n':
                // handle CRLF sequence
                if (!ps.quotedField && (ps.lastChar === '\r')) {
                    break;
                }
            case '\r':
                if (ps.commentedLine) {
                    ps.commentedLine = false;
                } else if (ps.quotedField) {
                    this._addCharacter(c);
                } else {
                    this._addField();
                    this._addRecord();
                }
                break;
            case this.commentchar:
                if (ps.commentedLine) break;
                if (ps.openRecord.length === 0 && ps.openField === '' && !ps.quotedField) {
                    ps.commentedLine = true;
                } else {
                    this._addCharacter(c);
                }
                break;
            default:
                if (ps.commentedLine) break;
                this._addCharacter(c);
        }
        ps.lastChar = c;
    }
};


CsvReader.prototype.end = function() {
    var ps = this.parsingStatus;
    if (ps.pendingEscapeChar !== null) {
        // The stream ended right after an ambiguous escape/quote char with
        // no further chunk ever arriving to disambiguate it - there's
        // nothing left to look at, so resolve it the same way parse()
        // would if it saw an empty nextChar mid-stream.
        var pendingChar = ps.pendingEscapeChar;
        ps.pendingEscapeChar = null;
        this._handleQuoteOrEscapeChar(pendingChar, '');
        ps.lastChar = pendingChar;
    }
    if (ps.quotedField) {
        this.emit('error', new Error('Input stream ended but closing quotes expected'));
    } else {
        // dump open record
        if (ps.openField) {
            this._addField();
        }
        if (ps.openRecord.length > 0) {
            this._addRecord();
        }
        this.emit('end');
    }
}
CsvReader.prototype._isEscapable = function(c) {
    if ((c === this.escapechar) || (c === this.quotechar)) {
        return true;
    }
    return false;
};

// True when c is an escapechar that could be starting an escape sequence -
// i.e. the same character parse() looks at nextChar for. Used to decide
// whether a chunk boundary landing on c needs to be deferred until the
// next chunk arrives.
CsvReader.prototype._isEscapeAmbiguous = function(c) {
    var ps = this.parsingStatus;
    return c === this.escapechar && (c !== this.quotechar || ps.openField || ps.quotedField);
};

// Handles a quotechar/escapechar character c given the character that
// follows it (nextChar may be '' if c was at the very end of all
// available data). Returns true if nextChar was consumed as the second
// half of an escape sequence. This is the single place that decides
// escape-vs-quote so parse() and its chunk-boundary deferral (above)
// can't drift out of sync with each other.
CsvReader.prototype._handleQuoteOrEscapeChar = function(c, nextChar) {
    var ps = this.parsingStatus;
    var isEscape = false;
    if (this._isEscapeAmbiguous(c) && this._isEscapable(nextChar)) {
        this._addCharacter(nextChar);
        isEscape = true;
    }
    if (isEscape || c !== this.quotechar) {
        return isEscape;
    }
    if (ps.openField && !ps.quotedField) {
        ps.quotedField = true;
        return isEscape;
    }
    if (ps.quotedField) {
        // closing quote should be followed by separator unless the nested quotes option is set
        if (nextChar && nextChar != '\r' && nextChar != '\n' && nextChar !== this.separator && this.nestedQuotes != true) {
            throw new Error("separator expected after a closing quote; found " + nextChar);
        } else {
            ps.quotedField = false;
        }
    } else if (ps.openField === '') {
        ps.quotedField = true;
    }
    return isEscape;
};

CsvReader.prototype._addCharacter = function(c) {
    this.parsingStatus.openField += c;
};

CsvReader.prototype._addField = function() {
    var ps = this.parsingStatus;
    ps.openRecord.push(ps.openField);
    ps.openField = '';
    ps.quotedField = false;
};

CsvReader.prototype.setColumnNames = function(names) {
    this.columnNames = names;
};

CsvReader.prototype._addRecord = function() {
    var ps = this.parsingStatus;
    if (this.columnsFromHeader && ps.rows === 0) {
        // user has passed columnNames through option
        if (this.columnNames.length === 0)
          this.setColumnNames(ps.openRecord);
    } else if (this.columnNames != null && this.columnNames.length > 0) {
        var objResult = {};
        for (var i = 0; i < this.columnNames.length; i++) {
            objResult[this.columnNames[i]] = ps.openRecord[i];
        }
        this.emit('data', objResult);
    } else {
        this.emit('data', ps.openRecord);
    }
    ps.rows++;
    ps.openRecord = [];
    ps.openField = '';
    ps.quotedField = false;
};

csv.createCsvFileReader = function(path, options) {
    options = options || {};
    var readStream = fs.createReadStream(path, {
        'flags': options.flags || 'r'
    });
    readStream.setEncoding(options.encoding || 'utf8');
    return new CsvReader(readStream, options);
};

csv.createCsvStreamReader = function(readStream, options) {
    if (options === undefined && typeof readStream === 'object') {
        options = readStream;
        readStream = undefined;
    }
    options = options || {};
    if (readStream) readStream.setEncoding(options.encoding || 'utf8');
    return new CsvReader(readStream, options);
};

/**
 * * @param options {Object} optional paramaters for the reader <br/>
 *     - separator {String}
 *     - quote {String}
 *     - escape {String}
 *     - escapeFormulas {boolean} - prepend an apostrophe in front of
 *       fields starting with '=', '+', or '-'
 */
var CsvWriter = csv.CsvWriter = function(writeStream, options) {
    var self = this;
    self.writeStream = writeStream;
    options = options || {};
    _setOptions(self, options);
    self.encoding = options.encoding || 'utf8';

    if (typeof writeStream.setEncoding === 'function') {
        writeStream.setEncoding(self.encoding);
    }

    writeStream.addListener('drain', this.emit.bind(this, 'drain'));
    writeStream.addListener('error', this.emit.bind(this, 'error'));
    writeStream.addListener('close', this.emit.bind(this, 'close'));
};
sys.inherits(CsvWriter, events.EventEmitter);

CsvWriter.prototype.writeRecord = function(rec) {
    if (!rec) return; // ignore empty records
    if (!Array.isArray(rec)) {
        throw new Error("CsvWriter.writeRecord only takes an array as an argument");
    }
    _writeArray(this, rec);
};

CsvWriter.prototype.close = function() {
    if (this.writeStream.destroy) {
        this.writeStream.destroy();
    } else if (this.writeStream.end) {
        this.writeStream.end();
    } else if (this.writeStream.close) {
        this.writeStream.close();
    }
};

function _writeArray(writer, arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        if (i != 0) out.push(writer.separator);
        out.push(writer.quotechar);
        _appendField(out, writer, arr[i]);
        out.push(writer.quotechar);
    }
    out.push("\r\n");
    writer.writeStream.write(out.join(''), writer.encoding);
};

function _appendField(outArr, writer, field) {
    // Make sure field is a string
    if(typeof(field) !== 'string') {
      // We are not interested in outputting "null" or "undefined"
      if(typeof(field) !== 'undefined' && field !== null) {
        field = String(field);
      } else {
        outArr.push('');
        return;
      }
    }

    for (var i = 0; i < field.length; i++) {
        var nextChar = field.charAt(i);
        if (nextChar === writer.quotechar || nextChar === writer.escapechar) {
            outArr.push(writer.escapechar);
        } else if (writer.escapeFormulas && i === 0 && (nextChar === '=' || nextChar === '+' || nextChar === '-')) {
            // If a field starts with =, +, or -, Excel etc will interpret it as a formula. Adding an apostrophe fixes this.
            outArr.push('\'');
        }

        outArr.push(nextChar);
    }
};

csv.createCsvFileWriter = function(path, options) {
    options = options || {'flags': 'w'};
    var writeStream = fs.createWriteStream(path, {
        'flags': options.flags || 'w'
    });
    return new CsvWriter(writeStream, options);
};

csv.createCsvStreamWriter = function(writeStream, options) {
    return new CsvWriter(writeStream, options);
};

// ===============
// =   utils     =
// ===============

function _setOptions(obj, options) {
    options = options || {};
    obj.separator = (typeof options.separator !== 'undefined') ? options.separator : ',';
    obj.quotechar = (typeof options.quote !== 'undefined') ? options.quote : '"';
    obj.escapechar = (typeof options.escape !== 'undefined') ? options.escape : '"';
    obj.commentchar = (typeof options.comment !== 'undefined') ? options.comment : '';
    obj.columnNames = (typeof options.columnNames !== 'undefined') ? options.columnNames : [];
    obj.columnsFromHeader = (typeof options.columnsFromHeader !== 'undefined') ? options.columnsFromHeader : false;
    obj.nestedQuotes = (typeof options.nestedQuotes !== 'undefined') ? options.nestedQuotes : false;
    obj.escapeFormulas = (typeof options.escapeFormulas !== 'undefined') ? options.escapeFormulas : false;
};
