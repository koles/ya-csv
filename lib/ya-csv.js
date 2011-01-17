var sys    = require('sys');

var REQUIRED_NODE_VERSION = '0.1.99';
_checkVersionNumber();

var events = require('events'),
    fs     = require('fs');

var csv = exports;

var CsvReader = csv.CsvReader = function(readStream, options) {
    var self = this;
    _setOptions(self, options);

    self.parsingStatus = {
        rows:          0,
        openRecord:    [],
        openField:     '',
        lastChar:      '',
        quotedField:   false,
        commentedLine: false
    };

    readStream.addListener('data', function(data) { self.parse(data) });
    readStream.addListener('error', function() { self.emit('error') });
    readStream.addListener('end', function() {
        var ps = self.parsingStatus;
        if (ps.quotedField) {
            self.emit('error', new Error('Input stream ended but closing quotes expected'));
        } else {
            // dump open record
            if (ps.openField) {
                self._addField();
            }
            if (ps.openRecord.length > 0) {
                self._addRecord();
            }
            self.emit('end');
        }
    });
};
sys.inherits(CsvReader, events.EventEmitter);

CsvReader.prototype.parse = function(data) {
    var ps = this.parsingStatus;
    for (var i = 0; i < data.length; i++) {
        var c = data.charAt(i);
        switch (c) {
            // escape and separator may be the same char, typically '"'
            case this.escapechar:
            case this.quotechar:
                if (ps.commentedLine) break;
                var isEscape = false;
                if (c === this.escapechar) {
                    var nextChar = data.charAt(i + 1);
                    if (this._isEscapable(nextChar)) {
                        this._addCharacter(nextChar);
                        i++;
                        isEscape = true;
                    }
                }
                if (!isEscape && (c === this.quotechar)) {
                    if (ps.openField && !ps.quotedField) {
                        ps.quotedField = true;
                        break;
                    }
                    if (ps.quotedField) {
                        // closing quote should be followed by separator
                        var nextChar = data.charAt(i + 1);
                        if (nextChar && nextChar != '\r' && nextChar != '\n' && nextChar !== this.separator) {
                            throw new Error("separator expected after a closing quote; found " + nextChar);
                        }
                        ps.quotedField = false;
                    } else if (ps.openField === '') {
                        ps.quotedField = true;
                    }
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
            default:
                if (ps.commentedLine) break;
                this._addCharacter(c);
        }
        ps.lastChar = c;
    }
};

CsvReader.prototype._isEscapable = function(c) {
    if ((c === this.escapechar) || (c === this.quotechar)) {
        return true;
    }
    return false;
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
        'flags': 'r'
    });
    if (options.encoding) {
        readStream.setEncoding(options.encoding);
    } else {
        readStream.setEncoding('utf8');
    }
    return new CsvReader(readStream, options);
};

csv.createCsvStreamReader = function(readStream, options) {
    options = options || {};
    readStream.setEncoding(options.encoding ? options.encoding : 'utf8');
    return new CsvReader(readStream, options);
};

var CsvWriter = csv.CsvWriter = function(writeStream, options) {
    var self = this;
    self.writeStream = writeStream;
    options = options || {};
    _setOptions(self, options);
    self.encoding = options.encoding || 'utf8';

    if (typeof writeStream.setEncoding === 'function') {
        writeStream.setEncoding(self.encoding);
    }

    writeStream.addListener('drain', function() { self.emit('drain') });
    writeStream.addListener('error', function() { self.emit('error') });
    writeStream.addListener('close', function() { self.emit('close') });
};
sys.inherits(CsvWriter, events.EventEmitter);

CsvWriter.prototype.writeRecord = function(rec) {
    if (!rec) return; // ignore empty records
    if (typeof(rec) !== 'object') {
        throw new Error("CsvWriter.writeRecord takes an array as an argument");
    }
    if (rec.length || rec.length === 0) { // array
        _writeArray(this, rec);
    } else {          // hash
        throw new Error("CsvWriter.writeRecord takes an array as an argument, "
                      + "hashes are not supported.");
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
    writer.writeStream.write(out.join(''), this.encoding);
};

function _appendField(outArr, writer, field) {
    if (field == null) {
        outArr.push('');
        return;
    }
    if (field.length == undefined){
       //deal with numbers
       field = '' + field;
    }
    for (var i = 0; i < field.length; i++) {
        if (field.charAt(i) === writer.quotechar || field.charAt(i) === writer.escapechar) {
            outArr.push(writer.escapechar);
        }
        outArr.push(field.charAt(i));
    }
};

csv.createCsvFileWriter = function(path, options) {
    var writeStream = fs.createWriteStream(path, {
        'flags': 'w'
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
    obj.separator   = options.separator   || ',';
    obj.quotechar   = options.quote       || '"';
    obj.escapechar  = options.escape      || '"';
    obj.commentchar = options.comment     || '';
    obj.columnNames = options.columnNames || [];
    obj.columnsFromHeader = options.columnsFromHeader || false;
};

function _checkVersionNumber() {
    var supported = (function() {
        if (!process.version) return false;
        function version2fields(v) {
            var fields = v.split('.');
            return [ parseInt(fields[0]), parseInt(fields[1]), parseInt(fields[2]) ];
        }
        var r  = version2fields(REQUIRED_NODE_VERSION);
        var a  = version2fields(process.version.replace(/^v/, ''));
        if (a[0] > r[0]) {
            return true;
        } else if (a[0] === r[0]) {
            if (a[1] > r[1]) {
                return true;
            }  else if (a[1] === r[1]) {
                if (a[2] >= r[2]) return true;
            }
        }
        return false;
    })();
    if (! supported) {
        sys.debug("Unsupported Node.js version: expected "
                    + REQUIRED_NODE_VERSION + " or higher, got " + process.version);
    }
};
