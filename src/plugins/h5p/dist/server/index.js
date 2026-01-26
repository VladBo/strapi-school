"use strict";
const path = require("node:path");
const fs = require("fs-extra");
require("node:https");
require("node:http");
const require$$0 = require("fs");
const require$$1 = require("path");
const require$$0$1 = require("zlib");
const require$$0$2 = require("crypto");
const h5pServer = require("@lumieducation/h5p-server");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
function _interopNamespace(e) {
  if (e && e.__esModule)
    return e;
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__default = /* @__PURE__ */ _interopDefault(path);
const fs__default = /* @__PURE__ */ _interopDefault(fs);
const require$$0__default = /* @__PURE__ */ _interopDefault(require$$0);
const require$$1__default = /* @__PURE__ */ _interopDefault(require$$1);
const require$$0__default$1 = /* @__PURE__ */ _interopDefault(require$$0$1);
const require$$0__default$2 = /* @__PURE__ */ _interopDefault(require$$0$2);
const h5pServer__namespace = /* @__PURE__ */ _interopNamespace(h5pServer);
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var util = { exports: {} };
var constants = {
  /* The local file header */
  LOCHDR: 30,
  // LOC header size
  LOCSIG: 67324752,
  // "PK\003\004"
  LOCVER: 4,
  // version needed to extract
  LOCFLG: 6,
  // general purpose bit flag
  LOCHOW: 8,
  // compression method
  LOCTIM: 10,
  // modification time (2 bytes time, 2 bytes date)
  LOCCRC: 14,
  // uncompressed file crc-32 value
  LOCSIZ: 18,
  // compressed size
  LOCLEN: 22,
  // uncompressed size
  LOCNAM: 26,
  // filename length
  LOCEXT: 28,
  // extra field length
  /* The Data descriptor */
  EXTSIG: 134695760,
  // "PK\007\008"
  EXTHDR: 16,
  // EXT header size
  EXTCRC: 4,
  // uncompressed file crc-32 value
  EXTSIZ: 8,
  // compressed size
  EXTLEN: 12,
  // uncompressed size
  /* The central directory file header */
  CENHDR: 46,
  // CEN header size
  CENSIG: 33639248,
  // "PK\001\002"
  CENVEM: 4,
  // version made by
  CENVER: 6,
  // version needed to extract
  CENFLG: 8,
  // encrypt, decrypt flags
  CENHOW: 10,
  // compression method
  CENTIM: 12,
  // modification time (2 bytes time, 2 bytes date)
  CENCRC: 16,
  // uncompressed file crc-32 value
  CENSIZ: 20,
  // compressed size
  CENLEN: 24,
  // uncompressed size
  CENNAM: 28,
  // filename length
  CENEXT: 30,
  // extra field length
  CENCOM: 32,
  // file comment length
  CENDSK: 34,
  // volume number start
  CENATT: 36,
  // internal file attributes
  CENATX: 38,
  // external file attributes (host system dependent)
  CENOFF: 42,
  // LOC header offset
  /* The entries in the end of central directory */
  ENDHDR: 22,
  // END header size
  ENDSIG: 101010256,
  // "PK\005\006"
  ENDSUB: 8,
  // number of entries on this disk
  ENDTOT: 10,
  // total number of entries
  ENDSIZ: 12,
  // central directory size in bytes
  ENDOFF: 16,
  // offset of first CEN header
  ENDCOM: 20,
  // zip file comment length
  END64HDR: 20,
  // zip64 END header size
  END64SIG: 117853008,
  // zip64 Locator signature, "PK\006\007"
  END64START: 4,
  // number of the disk with the start of the zip64
  END64OFF: 8,
  // relative offset of the zip64 end of central directory
  END64NUMDISKS: 16,
  // total number of disks
  ZIP64SIG: 101075792,
  // zip64 signature, "PK\006\006"
  ZIP64HDR: 56,
  // zip64 record minimum size
  ZIP64LEAD: 12,
  // leading bytes at the start of the record, not counted by the value stored in ZIP64SIZE
  ZIP64SIZE: 4,
  // zip64 size of the central directory record
  ZIP64VEM: 12,
  // zip64 version made by
  ZIP64VER: 14,
  // zip64 version needed to extract
  ZIP64DSK: 16,
  // zip64 number of this disk
  ZIP64DSKDIR: 20,
  // number of the disk with the start of the record directory
  ZIP64SUB: 24,
  // number of entries on this disk
  ZIP64TOT: 32,
  // total number of entries
  ZIP64SIZB: 40,
  // zip64 central directory size in bytes
  ZIP64OFF: 48,
  // offset of start of central directory with respect to the starting disk number
  ZIP64EXTRA: 56,
  // extensible data sector
  /* Compression methods */
  STORED: 0,
  // no compression
  SHRUNK: 1,
  // shrunk
  REDUCED1: 2,
  // reduced with compression factor 1
  REDUCED2: 3,
  // reduced with compression factor 2
  REDUCED3: 4,
  // reduced with compression factor 3
  REDUCED4: 5,
  // reduced with compression factor 4
  IMPLODED: 6,
  // imploded
  // 7 reserved for Tokenizing compression algorithm
  DEFLATED: 8,
  // deflated
  ENHANCED_DEFLATED: 9,
  // enhanced deflated
  PKWARE: 10,
  // PKWare DCL imploded
  // 11 reserved by PKWARE
  BZIP2: 12,
  //  compressed using BZIP2
  // 13 reserved by PKWARE
  LZMA: 14,
  // LZMA
  // 15-17 reserved by PKWARE
  IBM_TERSE: 18,
  // compressed using IBM TERSE
  IBM_LZ77: 19,
  // IBM LZ77 z
  AES_ENCRYPT: 99,
  // WinZIP AES encryption method
  /* General purpose bit flag */
  // values can obtained with expression 2**bitnr
  FLG_ENC: 1,
  // Bit 0: encrypted file
  FLG_COMP1: 2,
  // Bit 1, compression option
  FLG_COMP2: 4,
  // Bit 2, compression option
  FLG_DESC: 8,
  // Bit 3, data descriptor
  FLG_ENH: 16,
  // Bit 4, enhanced deflating
  FLG_PATCH: 32,
  // Bit 5, indicates that the file is compressed patched data.
  FLG_STR: 64,
  // Bit 6, strong encryption (patented)
  // Bits 7-10: Currently unused.
  FLG_EFS: 2048,
  // Bit 11: Language encoding flag (EFS)
  // Bit 12: Reserved by PKWARE for enhanced compression.
  // Bit 13: encrypted the Central Directory (patented).
  // Bits 14-15: Reserved by PKWARE.
  FLG_MSK: 4096,
  // mask header values
  /* Load type */
  FILE: 2,
  BUFFER: 1,
  NONE: 0,
  /* 4.5 Extensible data fields */
  EF_ID: 0,
  EF_SIZE: 2,
  /* Header IDs */
  ID_ZIP64: 1,
  ID_AVINFO: 7,
  ID_PFS: 8,
  ID_OS2: 9,
  ID_NTFS: 10,
  ID_OPENVMS: 12,
  ID_UNIX: 13,
  ID_FORK: 14,
  ID_PATCH: 15,
  ID_X509_PKCS7: 20,
  ID_X509_CERTID_F: 21,
  ID_X509_CERTID_C: 22,
  ID_STRONGENC: 23,
  ID_RECORD_MGT: 24,
  ID_X509_PKCS7_RL: 25,
  ID_IBM1: 101,
  ID_IBM2: 102,
  ID_POSZIP: 18064,
  EF_ZIP64_OR_32: 4294967295,
  EF_ZIP64_OR_16: 65535,
  EF_ZIP64_SUNCOMP: 0,
  EF_ZIP64_SCOMP: 8,
  EF_ZIP64_RHO: 16,
  EF_ZIP64_DSN: 24
};
var errors = {};
(function(exports2) {
  const errors2 = {
    /* Header error messages */
    INVALID_LOC: "Invalid LOC header (bad signature)",
    INVALID_CEN: "Invalid CEN header (bad signature)",
    INVALID_END: "Invalid END header (bad signature)",
    /* Descriptor */
    DESCRIPTOR_NOT_EXIST: "No descriptor present",
    DESCRIPTOR_UNKNOWN: "Unknown descriptor format",
    DESCRIPTOR_FAULTY: "Descriptor data is malformed",
    /* ZipEntry error messages*/
    NO_DATA: "Nothing to decompress",
    BAD_CRC: "CRC32 checksum failed {0}",
    FILE_IN_THE_WAY: "There is a file in the way: {0}",
    UNKNOWN_METHOD: "Invalid/unsupported compression method",
    /* Inflater error messages */
    AVAIL_DATA: "inflate::Available inflate data did not terminate",
    INVALID_DISTANCE: "inflate::Invalid literal/length or distance code in fixed or dynamic block",
    TO_MANY_CODES: "inflate::Dynamic block code description: too many length or distance codes",
    INVALID_REPEAT_LEN: "inflate::Dynamic block code description: repeat more than specified lengths",
    INVALID_REPEAT_FIRST: "inflate::Dynamic block code description: repeat lengths with no first length",
    INCOMPLETE_CODES: "inflate::Dynamic block code description: code lengths codes incomplete",
    INVALID_DYN_DISTANCE: "inflate::Dynamic block code description: invalid distance code lengths",
    INVALID_CODES_LEN: "inflate::Dynamic block code description: invalid literal/length code lengths",
    INVALID_STORE_BLOCK: "inflate::Stored block length did not match one's complement",
    INVALID_BLOCK_TYPE: "inflate::Invalid block type (type == 3)",
    /* ADM-ZIP error messages */
    CANT_EXTRACT_FILE: "Could not extract the file",
    CANT_OVERRIDE: "Target file already exists",
    DISK_ENTRY_TOO_LARGE: "Number of disk entries is too large",
    NO_ZIP: "No zip file was loaded",
    NO_ENTRY: "Entry doesn't exist",
    DIRECTORY_CONTENT_ERROR: "A directory cannot have content",
    FILE_NOT_FOUND: 'File not found: "{0}"',
    NOT_IMPLEMENTED: "Not implemented",
    INVALID_FILENAME: "Invalid filename",
    INVALID_FORMAT: "Invalid or unsupported zip format. No END header found",
    INVALID_PASS_PARAM: "Incompatible password parameter",
    WRONG_PASSWORD: "Wrong Password",
    /* ADM-ZIP */
    COMMENT_TOO_LONG: "Comment is too long",
    // Comment can be max 65535 bytes long (NOTE: some non-US characters may take more space)
    EXTRA_FIELD_PARSE_ERROR: "Extra field parsing error"
  };
  function E(message) {
    return function(...args) {
      if (args.length) {
        message = message.replace(/\{(\d)\}/g, (_, n) => args[n] || "");
      }
      return new Error("ADM-ZIP: " + message);
    };
  }
  for (const msg of Object.keys(errors2)) {
    exports2[msg] = E(errors2[msg]);
  }
})(errors);
const fsystem = require$$0__default.default;
const pth$2 = require$$1__default.default;
const Constants$3 = constants;
const Errors$1 = errors;
const isWin = typeof process === "object" && "win32" === process.platform;
const is_Obj = (obj) => typeof obj === "object" && obj !== null;
const crcTable = new Uint32Array(256).map((t, c) => {
  for (let k = 0; k < 8; k++) {
    if ((c & 1) !== 0) {
      c = 3988292384 ^ c >>> 1;
    } else {
      c >>>= 1;
    }
  }
  return c >>> 0;
});
function Utils$5(opts) {
  this.sep = pth$2.sep;
  this.fs = fsystem;
  if (is_Obj(opts)) {
    if (is_Obj(opts.fs) && typeof opts.fs.statSync === "function") {
      this.fs = opts.fs;
    }
  }
}
var utils = Utils$5;
Utils$5.prototype.makeDir = function(folder) {
  const self = this;
  function mkdirSync(fpath) {
    let resolvedPath = fpath.split(self.sep)[0];
    fpath.split(self.sep).forEach(function(name) {
      if (!name || name.substr(-1, 1) === ":")
        return;
      resolvedPath += self.sep + name;
      var stat;
      try {
        stat = self.fs.statSync(resolvedPath);
      } catch (e) {
        self.fs.mkdirSync(resolvedPath);
      }
      if (stat && stat.isFile())
        throw Errors$1.FILE_IN_THE_WAY(`"${resolvedPath}"`);
    });
  }
  mkdirSync(folder);
};
Utils$5.prototype.writeFileTo = function(path2, content, overwrite, attr) {
  const self = this;
  if (self.fs.existsSync(path2)) {
    if (!overwrite)
      return false;
    var stat = self.fs.statSync(path2);
    if (stat.isDirectory()) {
      return false;
    }
  }
  var folder = pth$2.dirname(path2);
  if (!self.fs.existsSync(folder)) {
    self.makeDir(folder);
  }
  var fd;
  try {
    fd = self.fs.openSync(path2, "w", 438);
  } catch (e) {
    self.fs.chmodSync(path2, 438);
    fd = self.fs.openSync(path2, "w", 438);
  }
  if (fd) {
    try {
      self.fs.writeSync(fd, content, 0, content.length, 0);
    } finally {
      self.fs.closeSync(fd);
    }
  }
  self.fs.chmodSync(path2, attr || 438);
  return true;
};
Utils$5.prototype.writeFileToAsync = function(path2, content, overwrite, attr, callback) {
  if (typeof attr === "function") {
    callback = attr;
    attr = void 0;
  }
  const self = this;
  self.fs.exists(path2, function(exist) {
    if (exist && !overwrite)
      return callback(false);
    self.fs.stat(path2, function(err, stat) {
      if (exist && stat.isDirectory()) {
        return callback(false);
      }
      var folder = pth$2.dirname(path2);
      self.fs.exists(folder, function(exists) {
        if (!exists)
          self.makeDir(folder);
        self.fs.open(path2, "w", 438, function(err2, fd) {
          if (err2) {
            self.fs.chmod(path2, 438, function() {
              self.fs.open(path2, "w", 438, function(err3, fd2) {
                self.fs.write(fd2, content, 0, content.length, 0, function() {
                  self.fs.close(fd2, function() {
                    self.fs.chmod(path2, attr || 438, function() {
                      callback(true);
                    });
                  });
                });
              });
            });
          } else if (fd) {
            self.fs.write(fd, content, 0, content.length, 0, function() {
              self.fs.close(fd, function() {
                self.fs.chmod(path2, attr || 438, function() {
                  callback(true);
                });
              });
            });
          } else {
            self.fs.chmod(path2, attr || 438, function() {
              callback(true);
            });
          }
        });
      });
    });
  });
};
Utils$5.prototype.findFiles = function(path2) {
  const self = this;
  function findSync(dir, pattern, recursive) {
    let files = [];
    self.fs.readdirSync(dir).forEach(function(file) {
      const path3 = pth$2.join(dir, file);
      const stat = self.fs.statSync(path3);
      {
        files.push(pth$2.normalize(path3) + (stat.isDirectory() ? self.sep : ""));
      }
      if (stat.isDirectory() && recursive)
        files = files.concat(findSync(path3, pattern, recursive));
    });
    return files;
  }
  return findSync(path2, void 0, true);
};
Utils$5.prototype.findFilesAsync = function(dir, cb) {
  const self = this;
  let results = [];
  self.fs.readdir(dir, function(err, list) {
    if (err)
      return cb(err);
    let list_length = list.length;
    if (!list_length)
      return cb(null, results);
    list.forEach(function(file) {
      file = pth$2.join(dir, file);
      self.fs.stat(file, function(err2, stat) {
        if (err2)
          return cb(err2);
        if (stat) {
          results.push(pth$2.normalize(file) + (stat.isDirectory() ? self.sep : ""));
          if (stat.isDirectory()) {
            self.findFilesAsync(file, function(err3, res) {
              if (err3)
                return cb(err3);
              results = results.concat(res);
              if (!--list_length)
                cb(null, results);
            });
          } else {
            if (!--list_length)
              cb(null, results);
          }
        }
      });
    });
  });
};
Utils$5.prototype.getAttributes = function() {
};
Utils$5.prototype.setAttributes = function() {
};
Utils$5.crc32update = function(crc, byte) {
  return crcTable[(crc ^ byte) & 255] ^ crc >>> 8;
};
Utils$5.crc32 = function(buf) {
  if (typeof buf === "string") {
    buf = Buffer.from(buf, "utf8");
  }
  let len = buf.length;
  let crc = -1;
  for (let off = 0; off < len; )
    crc = Utils$5.crc32update(crc, buf[off++]);
  return ~crc >>> 0;
};
Utils$5.methodToString = function(method) {
  switch (method) {
    case Constants$3.STORED:
      return "STORED (" + method + ")";
    case Constants$3.DEFLATED:
      return "DEFLATED (" + method + ")";
    default:
      return "UNSUPPORTED (" + method + ")";
  }
};
Utils$5.canonical = function(path2) {
  if (!path2)
    return "";
  const safeSuffix = pth$2.posix.normalize("/" + path2.split("\\").join("/"));
  return pth$2.join(".", safeSuffix);
};
Utils$5.zipnamefix = function(path2) {
  if (!path2)
    return "";
  const safeSuffix = pth$2.posix.normalize("/" + path2.split("\\").join("/"));
  return pth$2.posix.join(".", safeSuffix);
};
Utils$5.findLast = function(arr, callback) {
  if (!Array.isArray(arr))
    throw new TypeError("arr is not array");
  const len = arr.length >>> 0;
  for (let i = len - 1; i >= 0; i--) {
    if (callback(arr[i], i, arr)) {
      return arr[i];
    }
  }
  return void 0;
};
Utils$5.sanitize = function(prefix, name) {
  prefix = pth$2.resolve(pth$2.normalize(prefix));
  var parts = name.split("/");
  for (var i = 0, l = parts.length; i < l; i++) {
    var path2 = pth$2.normalize(pth$2.join(prefix, parts.slice(i, l).join(pth$2.sep)));
    if (path2.indexOf(prefix) === 0) {
      return path2;
    }
  }
  return pth$2.normalize(pth$2.join(prefix, pth$2.basename(name)));
};
Utils$5.toBuffer = function toBuffer(input, encoder) {
  if (Buffer.isBuffer(input)) {
    return input;
  } else if (input instanceof Uint8Array) {
    return Buffer.from(input);
  } else {
    return typeof input === "string" ? encoder(input) : Buffer.alloc(0);
  }
};
Utils$5.readBigUInt64LE = function(buffer, index2) {
  var slice = Buffer.from(buffer.slice(index2, index2 + 8));
  slice.swap64();
  return parseInt(`0x${slice.toString("hex")}`);
};
Utils$5.fromDOS2Date = function(val) {
  return new Date((val >> 25 & 127) + 1980, Math.max((val >> 21 & 15) - 1, 0), Math.max(val >> 16 & 31, 1), val >> 11 & 31, val >> 5 & 63, (val & 31) << 1);
};
Utils$5.fromDate2DOS = function(val) {
  let date = 0;
  let time = 0;
  if (val.getFullYear() > 1979) {
    date = (val.getFullYear() - 1980 & 127) << 9 | val.getMonth() + 1 << 5 | val.getDate();
    time = val.getHours() << 11 | val.getMinutes() << 5 | val.getSeconds() >> 1;
  }
  return date << 16 | time;
};
Utils$5.isWin = isWin;
Utils$5.crcTable = crcTable;
const pth$1 = require$$1__default.default;
var fattr = function(path2, { fs: fs2 }) {
  var _path = path2 || "", _obj = newAttr(), _stat = null;
  function newAttr() {
    return {
      directory: false,
      readonly: false,
      hidden: false,
      executable: false,
      mtime: 0,
      atime: 0
    };
  }
  if (_path && fs2.existsSync(_path)) {
    _stat = fs2.statSync(_path);
    _obj.directory = _stat.isDirectory();
    _obj.mtime = _stat.mtime;
    _obj.atime = _stat.atime;
    _obj.executable = (73 & _stat.mode) !== 0;
    _obj.readonly = (128 & _stat.mode) === 0;
    _obj.hidden = pth$1.basename(_path)[0] === ".";
  } else {
    console.warn("Invalid path: " + _path);
  }
  return {
    get directory() {
      return _obj.directory;
    },
    get readOnly() {
      return _obj.readonly;
    },
    get hidden() {
      return _obj.hidden;
    },
    get mtime() {
      return _obj.mtime;
    },
    get atime() {
      return _obj.atime;
    },
    get executable() {
      return _obj.executable;
    },
    decodeAttributes: function() {
    },
    encodeAttributes: function() {
    },
    toJSON: function() {
      return {
        path: _path,
        isDirectory: _obj.directory,
        isReadOnly: _obj.readonly,
        isHidden: _obj.hidden,
        isExecutable: _obj.executable,
        mTime: _obj.mtime,
        aTime: _obj.atime
      };
    },
    toString: function() {
      return JSON.stringify(this.toJSON(), null, "	");
    }
  };
};
var decoder = {
  efs: true,
  encode: (data) => Buffer.from(data, "utf8"),
  decode: (data) => data.toString("utf8")
};
util.exports = utils;
util.exports.Constants = constants;
util.exports.Errors = errors;
util.exports.FileAttr = fattr;
util.exports.decoder = decoder;
var utilExports = util.exports;
var headers = {};
var Utils$4 = utilExports, Constants$2 = Utils$4.Constants;
var entryHeader = function() {
  var _verMade = 20, _version = 10, _flags = 0, _method = 0, _time = 0, _crc = 0, _compressedSize = 0, _size = 0, _fnameLen = 0, _extraLen = 0, _comLen = 0, _diskStart = 0, _inattr = 0, _attr = 0, _offset = 0;
  _verMade |= Utils$4.isWin ? 2560 : 768;
  _flags |= Constants$2.FLG_EFS;
  const _localHeader = {
    extraLen: 0
  };
  const uint32 = (val) => Math.max(0, val) >>> 0;
  const uint8 = (val) => Math.max(0, val) & 255;
  _time = Utils$4.fromDate2DOS(/* @__PURE__ */ new Date());
  return {
    get made() {
      return _verMade;
    },
    set made(val) {
      _verMade = val;
    },
    get version() {
      return _version;
    },
    set version(val) {
      _version = val;
    },
    get flags() {
      return _flags;
    },
    set flags(val) {
      _flags = val;
    },
    get flags_efs() {
      return (_flags & Constants$2.FLG_EFS) > 0;
    },
    set flags_efs(val) {
      if (val) {
        _flags |= Constants$2.FLG_EFS;
      } else {
        _flags &= ~Constants$2.FLG_EFS;
      }
    },
    get flags_desc() {
      return (_flags & Constants$2.FLG_DESC) > 0;
    },
    set flags_desc(val) {
      if (val) {
        _flags |= Constants$2.FLG_DESC;
      } else {
        _flags &= ~Constants$2.FLG_DESC;
      }
    },
    get method() {
      return _method;
    },
    set method(val) {
      switch (val) {
        case Constants$2.STORED:
          this.version = 10;
        case Constants$2.DEFLATED:
        default:
          this.version = 20;
      }
      _method = val;
    },
    get time() {
      return Utils$4.fromDOS2Date(this.timeval);
    },
    set time(val) {
      this.timeval = Utils$4.fromDate2DOS(val);
    },
    get timeval() {
      return _time;
    },
    set timeval(val) {
      _time = uint32(val);
    },
    get timeHighByte() {
      return uint8(_time >>> 8);
    },
    get crc() {
      return _crc;
    },
    set crc(val) {
      _crc = uint32(val);
    },
    get compressedSize() {
      return _compressedSize;
    },
    set compressedSize(val) {
      _compressedSize = uint32(val);
    },
    get size() {
      return _size;
    },
    set size(val) {
      _size = uint32(val);
    },
    get fileNameLength() {
      return _fnameLen;
    },
    set fileNameLength(val) {
      _fnameLen = val;
    },
    get extraLength() {
      return _extraLen;
    },
    set extraLength(val) {
      _extraLen = val;
    },
    get extraLocalLength() {
      return _localHeader.extraLen;
    },
    set extraLocalLength(val) {
      _localHeader.extraLen = val;
    },
    get commentLength() {
      return _comLen;
    },
    set commentLength(val) {
      _comLen = val;
    },
    get diskNumStart() {
      return _diskStart;
    },
    set diskNumStart(val) {
      _diskStart = uint32(val);
    },
    get inAttr() {
      return _inattr;
    },
    set inAttr(val) {
      _inattr = uint32(val);
    },
    get attr() {
      return _attr;
    },
    set attr(val) {
      _attr = uint32(val);
    },
    // get Unix file permissions
    get fileAttr() {
      return (_attr || 0) >> 16 & 4095;
    },
    get offset() {
      return _offset;
    },
    set offset(val) {
      _offset = uint32(val);
    },
    get encrypted() {
      return (_flags & Constants$2.FLG_ENC) === Constants$2.FLG_ENC;
    },
    get centralHeaderSize() {
      return Constants$2.CENHDR + _fnameLen + _extraLen + _comLen;
    },
    get realDataOffset() {
      return _offset + Constants$2.LOCHDR + _localHeader.fnameLen + _localHeader.extraLen;
    },
    get localHeader() {
      return _localHeader;
    },
    loadLocalHeaderFromBinary: function(input) {
      var data = input.slice(_offset, _offset + Constants$2.LOCHDR);
      if (data.readUInt32LE(0) !== Constants$2.LOCSIG) {
        throw Utils$4.Errors.INVALID_LOC();
      }
      _localHeader.version = data.readUInt16LE(Constants$2.LOCVER);
      _localHeader.flags = data.readUInt16LE(Constants$2.LOCFLG);
      _localHeader.method = data.readUInt16LE(Constants$2.LOCHOW);
      _localHeader.time = data.readUInt32LE(Constants$2.LOCTIM);
      _localHeader.crc = data.readUInt32LE(Constants$2.LOCCRC);
      _localHeader.compressedSize = data.readUInt32LE(Constants$2.LOCSIZ);
      _localHeader.size = data.readUInt32LE(Constants$2.LOCLEN);
      _localHeader.fnameLen = data.readUInt16LE(Constants$2.LOCNAM);
      _localHeader.extraLen = data.readUInt16LE(Constants$2.LOCEXT);
      const extraStart = _offset + Constants$2.LOCHDR + _localHeader.fnameLen;
      const extraEnd = extraStart + _localHeader.extraLen;
      return input.slice(extraStart, extraEnd);
    },
    loadFromBinary: function(data) {
      if (data.length !== Constants$2.CENHDR || data.readUInt32LE(0) !== Constants$2.CENSIG) {
        throw Utils$4.Errors.INVALID_CEN();
      }
      _verMade = data.readUInt16LE(Constants$2.CENVEM);
      _version = data.readUInt16LE(Constants$2.CENVER);
      _flags = data.readUInt16LE(Constants$2.CENFLG);
      _method = data.readUInt16LE(Constants$2.CENHOW);
      _time = data.readUInt32LE(Constants$2.CENTIM);
      _crc = data.readUInt32LE(Constants$2.CENCRC);
      _compressedSize = data.readUInt32LE(Constants$2.CENSIZ);
      _size = data.readUInt32LE(Constants$2.CENLEN);
      _fnameLen = data.readUInt16LE(Constants$2.CENNAM);
      _extraLen = data.readUInt16LE(Constants$2.CENEXT);
      _comLen = data.readUInt16LE(Constants$2.CENCOM);
      _diskStart = data.readUInt16LE(Constants$2.CENDSK);
      _inattr = data.readUInt16LE(Constants$2.CENATT);
      _attr = data.readUInt32LE(Constants$2.CENATX);
      _offset = data.readUInt32LE(Constants$2.CENOFF);
    },
    localHeaderToBinary: function() {
      var data = Buffer.alloc(Constants$2.LOCHDR);
      data.writeUInt32LE(Constants$2.LOCSIG, 0);
      data.writeUInt16LE(_version, Constants$2.LOCVER);
      data.writeUInt16LE(_flags, Constants$2.LOCFLG);
      data.writeUInt16LE(_method, Constants$2.LOCHOW);
      data.writeUInt32LE(_time, Constants$2.LOCTIM);
      data.writeUInt32LE(_crc, Constants$2.LOCCRC);
      data.writeUInt32LE(_compressedSize, Constants$2.LOCSIZ);
      data.writeUInt32LE(_size, Constants$2.LOCLEN);
      data.writeUInt16LE(_fnameLen, Constants$2.LOCNAM);
      data.writeUInt16LE(_localHeader.extraLen, Constants$2.LOCEXT);
      return data;
    },
    centralHeaderToBinary: function() {
      var data = Buffer.alloc(Constants$2.CENHDR + _fnameLen + _extraLen + _comLen);
      data.writeUInt32LE(Constants$2.CENSIG, 0);
      data.writeUInt16LE(_verMade, Constants$2.CENVEM);
      data.writeUInt16LE(_version, Constants$2.CENVER);
      data.writeUInt16LE(_flags, Constants$2.CENFLG);
      data.writeUInt16LE(_method, Constants$2.CENHOW);
      data.writeUInt32LE(_time, Constants$2.CENTIM);
      data.writeUInt32LE(_crc, Constants$2.CENCRC);
      data.writeUInt32LE(_compressedSize, Constants$2.CENSIZ);
      data.writeUInt32LE(_size, Constants$2.CENLEN);
      data.writeUInt16LE(_fnameLen, Constants$2.CENNAM);
      data.writeUInt16LE(_extraLen, Constants$2.CENEXT);
      data.writeUInt16LE(_comLen, Constants$2.CENCOM);
      data.writeUInt16LE(_diskStart, Constants$2.CENDSK);
      data.writeUInt16LE(_inattr, Constants$2.CENATT);
      data.writeUInt32LE(_attr, Constants$2.CENATX);
      data.writeUInt32LE(_offset, Constants$2.CENOFF);
      return data;
    },
    toJSON: function() {
      const bytes = function(nr) {
        return nr + " bytes";
      };
      return {
        made: _verMade,
        version: _version,
        flags: _flags,
        method: Utils$4.methodToString(_method),
        time: this.time,
        crc: "0x" + _crc.toString(16).toUpperCase(),
        compressedSize: bytes(_compressedSize),
        size: bytes(_size),
        fileNameLength: bytes(_fnameLen),
        extraLength: bytes(_extraLen),
        commentLength: bytes(_comLen),
        diskNumStart: _diskStart,
        inAttr: _inattr,
        attr: _attr,
        offset: _offset,
        centralHeaderSize: bytes(Constants$2.CENHDR + _fnameLen + _extraLen + _comLen)
      };
    },
    toString: function() {
      return JSON.stringify(this.toJSON(), null, "	");
    }
  };
};
var Utils$3 = utilExports, Constants$1 = Utils$3.Constants;
var mainHeader = function() {
  var _volumeEntries = 0, _totalEntries = 0, _size = 0, _offset = 0, _commentLength = 0;
  return {
    get diskEntries() {
      return _volumeEntries;
    },
    set diskEntries(val) {
      _volumeEntries = _totalEntries = val;
    },
    get totalEntries() {
      return _totalEntries;
    },
    set totalEntries(val) {
      _totalEntries = _volumeEntries = val;
    },
    get size() {
      return _size;
    },
    set size(val) {
      _size = val;
    },
    get offset() {
      return _offset;
    },
    set offset(val) {
      _offset = val;
    },
    get commentLength() {
      return _commentLength;
    },
    set commentLength(val) {
      _commentLength = val;
    },
    get mainHeaderSize() {
      return Constants$1.ENDHDR + _commentLength;
    },
    loadFromBinary: function(data) {
      if ((data.length !== Constants$1.ENDHDR || data.readUInt32LE(0) !== Constants$1.ENDSIG) && (data.length < Constants$1.ZIP64HDR || data.readUInt32LE(0) !== Constants$1.ZIP64SIG)) {
        throw Utils$3.Errors.INVALID_END();
      }
      if (data.readUInt32LE(0) === Constants$1.ENDSIG) {
        _volumeEntries = data.readUInt16LE(Constants$1.ENDSUB);
        _totalEntries = data.readUInt16LE(Constants$1.ENDTOT);
        _size = data.readUInt32LE(Constants$1.ENDSIZ);
        _offset = data.readUInt32LE(Constants$1.ENDOFF);
        _commentLength = data.readUInt16LE(Constants$1.ENDCOM);
      } else {
        _volumeEntries = Utils$3.readBigUInt64LE(data, Constants$1.ZIP64SUB);
        _totalEntries = Utils$3.readBigUInt64LE(data, Constants$1.ZIP64TOT);
        _size = Utils$3.readBigUInt64LE(data, Constants$1.ZIP64SIZE);
        _offset = Utils$3.readBigUInt64LE(data, Constants$1.ZIP64OFF);
        _commentLength = 0;
      }
    },
    toBinary: function() {
      var b = Buffer.alloc(Constants$1.ENDHDR + _commentLength);
      b.writeUInt32LE(Constants$1.ENDSIG, 0);
      b.writeUInt32LE(0, 4);
      b.writeUInt16LE(_volumeEntries, Constants$1.ENDSUB);
      b.writeUInt16LE(_totalEntries, Constants$1.ENDTOT);
      b.writeUInt32LE(_size, Constants$1.ENDSIZ);
      b.writeUInt32LE(_offset, Constants$1.ENDOFF);
      b.writeUInt16LE(_commentLength, Constants$1.ENDCOM);
      b.fill(" ", Constants$1.ENDHDR);
      return b;
    },
    toJSON: function() {
      const offset = function(nr, len) {
        let offs = nr.toString(16).toUpperCase();
        while (offs.length < len)
          offs = "0" + offs;
        return "0x" + offs;
      };
      return {
        diskEntries: _volumeEntries,
        totalEntries: _totalEntries,
        size: _size + " bytes",
        offset: offset(_offset, 4),
        commentLength: _commentLength
      };
    },
    toString: function() {
      return JSON.stringify(this.toJSON(), null, "	");
    }
  };
};
headers.EntryHeader = entryHeader;
headers.MainHeader = mainHeader;
var methods = {};
var deflater = function(inbuf) {
  var zlib = require$$0__default$1.default;
  var opts = { chunkSize: (parseInt(inbuf.length / 1024) + 1) * 1024 };
  return {
    deflate: function() {
      return zlib.deflateRawSync(inbuf, opts);
    },
    deflateAsync: function(callback) {
      var tmp = zlib.createDeflateRaw(opts), parts = [], total = 0;
      tmp.on("data", function(data) {
        parts.push(data);
        total += data.length;
      });
      tmp.on("end", function() {
        var buf = Buffer.alloc(total), written = 0;
        buf.fill(0);
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          part.copy(buf, written);
          written += part.length;
        }
        callback && callback(buf);
      });
      tmp.end(inbuf);
    }
  };
};
const version = +(process.versions ? process.versions.node : "").split(".")[0] || 0;
var inflater = function(inbuf, expectedLength) {
  var zlib = require$$0__default$1.default;
  const option = version >= 15 && expectedLength > 0 ? { maxOutputLength: expectedLength } : {};
  return {
    inflate: function() {
      return zlib.inflateRawSync(inbuf, option);
    },
    inflateAsync: function(callback) {
      var tmp = zlib.createInflateRaw(option), parts = [], total = 0;
      tmp.on("data", function(data) {
        parts.push(data);
        total += data.length;
      });
      tmp.on("end", function() {
        var buf = Buffer.alloc(total), written = 0;
        buf.fill(0);
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          part.copy(buf, written);
          written += part.length;
        }
        callback && callback(buf);
      });
      tmp.end(inbuf);
    }
  };
};
const { randomFillSync } = require$$0__default$2.default;
const Errors = errors;
const crctable = new Uint32Array(256).map((t, crc) => {
  for (let j = 0; j < 8; j++) {
    if (0 !== (crc & 1)) {
      crc = crc >>> 1 ^ 3988292384;
    } else {
      crc >>>= 1;
    }
  }
  return crc >>> 0;
});
const uMul = (a, b) => Math.imul(a, b) >>> 0;
const crc32update = (pCrc32, bval) => {
  return crctable[(pCrc32 ^ bval) & 255] ^ pCrc32 >>> 8;
};
const genSalt = () => {
  if ("function" === typeof randomFillSync) {
    return randomFillSync(Buffer.alloc(12));
  } else {
    return genSalt.node();
  }
};
genSalt.node = () => {
  const salt = Buffer.alloc(12);
  const len = salt.length;
  for (let i = 0; i < len; i++)
    salt[i] = Math.random() * 256 & 255;
  return salt;
};
const config$1 = {
  genSalt
};
function Initkeys(pw) {
  const pass = Buffer.isBuffer(pw) ? pw : Buffer.from(pw);
  this.keys = new Uint32Array([305419896, 591751049, 878082192]);
  for (let i = 0; i < pass.length; i++) {
    this.updateKeys(pass[i]);
  }
}
Initkeys.prototype.updateKeys = function(byteValue) {
  const keys = this.keys;
  keys[0] = crc32update(keys[0], byteValue);
  keys[1] += keys[0] & 255;
  keys[1] = uMul(keys[1], 134775813) + 1;
  keys[2] = crc32update(keys[2], keys[1] >>> 24);
  return byteValue;
};
Initkeys.prototype.next = function() {
  const k = (this.keys[2] | 2) >>> 0;
  return uMul(k, k ^ 1) >> 8 & 255;
};
function make_decrypter(pwd) {
  const keys = new Initkeys(pwd);
  return function(data) {
    const result = Buffer.alloc(data.length);
    let pos = 0;
    for (let c of data) {
      result[pos++] = keys.updateKeys(c ^ keys.next());
    }
    return result;
  };
}
function make_encrypter(pwd) {
  const keys = new Initkeys(pwd);
  return function(data, result, pos = 0) {
    if (!result)
      result = Buffer.alloc(data.length);
    for (let c of data) {
      const k = keys.next();
      result[pos++] = c ^ k;
      keys.updateKeys(c);
    }
    return result;
  };
}
function decrypt(data, header, pwd) {
  if (!data || !Buffer.isBuffer(data) || data.length < 12) {
    return Buffer.alloc(0);
  }
  const decrypter = make_decrypter(pwd);
  const salt = decrypter(data.slice(0, 12));
  const verifyByte = (header.flags & 8) === 8 ? header.timeHighByte : header.crc >>> 24;
  if (salt[11] !== verifyByte) {
    throw Errors.WRONG_PASSWORD();
  }
  return decrypter(data.slice(12));
}
function _salter(data) {
  if (Buffer.isBuffer(data) && data.length >= 12) {
    config$1.genSalt = function() {
      return data.slice(0, 12);
    };
  } else if (data === "node") {
    config$1.genSalt = genSalt.node;
  } else {
    config$1.genSalt = genSalt;
  }
}
function encrypt(data, header, pwd, oldlike = false) {
  if (data == null)
    data = Buffer.alloc(0);
  if (!Buffer.isBuffer(data))
    data = Buffer.from(data.toString());
  const encrypter = make_encrypter(pwd);
  const salt = config$1.genSalt();
  salt[11] = header.crc >>> 24 & 255;
  if (oldlike)
    salt[10] = header.crc >>> 16 & 255;
  const result = Buffer.alloc(data.length + 12);
  encrypter(salt, result);
  return encrypter(data, result, 12);
}
var zipcrypto = { decrypt, encrypt, _salter };
methods.Deflater = deflater;
methods.Inflater = inflater;
methods.ZipCrypto = zipcrypto;
var Utils$2 = utilExports, Headers$1 = headers, Constants = Utils$2.Constants, Methods = methods;
var zipEntry = function(options, input) {
  var _centralHeader = new Headers$1.EntryHeader(), _entryName = Buffer.alloc(0), _comment = Buffer.alloc(0), _isDirectory = false, uncompressedData = null, _extra = Buffer.alloc(0), _extralocal = Buffer.alloc(0), _efs = true;
  const opts = options;
  const decoder2 = typeof opts.decoder === "object" ? opts.decoder : Utils$2.decoder;
  _efs = decoder2.hasOwnProperty("efs") ? decoder2.efs : false;
  function getCompressedDataFromZip() {
    if (!input || !(input instanceof Uint8Array)) {
      return Buffer.alloc(0);
    }
    _extralocal = _centralHeader.loadLocalHeaderFromBinary(input);
    return input.slice(_centralHeader.realDataOffset, _centralHeader.realDataOffset + _centralHeader.compressedSize);
  }
  function crc32OK(data) {
    if (!_centralHeader.flags_desc) {
      if (Utils$2.crc32(data) !== _centralHeader.localHeader.crc) {
        return false;
      }
    } else {
      const descriptor = {};
      const dataEndOffset = _centralHeader.realDataOffset + _centralHeader.compressedSize;
      if (input.readUInt32LE(dataEndOffset) == Constants.LOCSIG || input.readUInt32LE(dataEndOffset) == Constants.CENSIG) {
        throw Utils$2.Errors.DESCRIPTOR_NOT_EXIST();
      }
      if (input.readUInt32LE(dataEndOffset) == Constants.EXTSIG) {
        descriptor.crc = input.readUInt32LE(dataEndOffset + Constants.EXTCRC);
        descriptor.compressedSize = input.readUInt32LE(dataEndOffset + Constants.EXTSIZ);
        descriptor.size = input.readUInt32LE(dataEndOffset + Constants.EXTLEN);
      } else if (input.readUInt16LE(dataEndOffset + 12) === 19280) {
        descriptor.crc = input.readUInt32LE(dataEndOffset + Constants.EXTCRC - 4);
        descriptor.compressedSize = input.readUInt32LE(dataEndOffset + Constants.EXTSIZ - 4);
        descriptor.size = input.readUInt32LE(dataEndOffset + Constants.EXTLEN - 4);
      } else {
        throw Utils$2.Errors.DESCRIPTOR_UNKNOWN();
      }
      if (descriptor.compressedSize !== _centralHeader.compressedSize || descriptor.size !== _centralHeader.size || descriptor.crc !== _centralHeader.crc) {
        throw Utils$2.Errors.DESCRIPTOR_FAULTY();
      }
      if (Utils$2.crc32(data) !== descriptor.crc) {
        return false;
      }
    }
    return true;
  }
  function decompress(async, callback, pass) {
    if (typeof callback === "undefined" && typeof async === "string") {
      pass = async;
      async = void 0;
    }
    if (_isDirectory) {
      if (async && callback) {
        callback(Buffer.alloc(0), Utils$2.Errors.DIRECTORY_CONTENT_ERROR());
      }
      return Buffer.alloc(0);
    }
    var compressedData = getCompressedDataFromZip();
    if (compressedData.length === 0) {
      if (async && callback)
        callback(compressedData);
      return compressedData;
    }
    if (_centralHeader.encrypted) {
      if ("string" !== typeof pass && !Buffer.isBuffer(pass)) {
        throw Utils$2.Errors.INVALID_PASS_PARAM();
      }
      compressedData = Methods.ZipCrypto.decrypt(compressedData, _centralHeader, pass);
    }
    var data = Buffer.alloc(_centralHeader.size);
    switch (_centralHeader.method) {
      case Utils$2.Constants.STORED:
        compressedData.copy(data);
        if (!crc32OK(data)) {
          if (async && callback)
            callback(data, Utils$2.Errors.BAD_CRC());
          throw Utils$2.Errors.BAD_CRC();
        } else {
          if (async && callback)
            callback(data);
          return data;
        }
      case Utils$2.Constants.DEFLATED:
        var inflater2 = new Methods.Inflater(compressedData, _centralHeader.size);
        if (!async) {
          const result = inflater2.inflate(data);
          result.copy(data, 0);
          if (!crc32OK(data)) {
            throw Utils$2.Errors.BAD_CRC(`"${decoder2.decode(_entryName)}"`);
          }
          return data;
        } else {
          inflater2.inflateAsync(function(result) {
            result.copy(result, 0);
            if (callback) {
              if (!crc32OK(result)) {
                callback(result, Utils$2.Errors.BAD_CRC());
              } else {
                callback(result);
              }
            }
          });
        }
        break;
      default:
        if (async && callback)
          callback(Buffer.alloc(0), Utils$2.Errors.UNKNOWN_METHOD());
        throw Utils$2.Errors.UNKNOWN_METHOD();
    }
  }
  function compress(async, callback) {
    if ((!uncompressedData || !uncompressedData.length) && Buffer.isBuffer(input)) {
      if (async && callback)
        callback(getCompressedDataFromZip());
      return getCompressedDataFromZip();
    }
    if (uncompressedData.length && !_isDirectory) {
      var compressedData;
      switch (_centralHeader.method) {
        case Utils$2.Constants.STORED:
          _centralHeader.compressedSize = _centralHeader.size;
          compressedData = Buffer.alloc(uncompressedData.length);
          uncompressedData.copy(compressedData);
          if (async && callback)
            callback(compressedData);
          return compressedData;
        default:
        case Utils$2.Constants.DEFLATED:
          var deflater2 = new Methods.Deflater(uncompressedData);
          if (!async) {
            var deflated = deflater2.deflate();
            _centralHeader.compressedSize = deflated.length;
            return deflated;
          } else {
            deflater2.deflateAsync(function(data) {
              compressedData = Buffer.alloc(data.length);
              _centralHeader.compressedSize = data.length;
              data.copy(compressedData);
              callback && callback(compressedData);
            });
          }
          deflater2 = null;
          break;
      }
    } else if (async && callback) {
      callback(Buffer.alloc(0));
    } else {
      return Buffer.alloc(0);
    }
  }
  function readUInt64LE(buffer, offset) {
    return (buffer.readUInt32LE(offset + 4) << 4) + buffer.readUInt32LE(offset);
  }
  function parseExtra(data) {
    try {
      var offset = 0;
      var signature, size, part;
      while (offset + 4 < data.length) {
        signature = data.readUInt16LE(offset);
        offset += 2;
        size = data.readUInt16LE(offset);
        offset += 2;
        part = data.slice(offset, offset + size);
        offset += size;
        if (Constants.ID_ZIP64 === signature) {
          parseZip64ExtendedInformation(part);
        }
      }
    } catch (error) {
      throw Utils$2.Errors.EXTRA_FIELD_PARSE_ERROR();
    }
  }
  function parseZip64ExtendedInformation(data) {
    var size, compressedSize, offset, diskNumStart;
    if (data.length >= Constants.EF_ZIP64_SCOMP) {
      size = readUInt64LE(data, Constants.EF_ZIP64_SUNCOMP);
      if (_centralHeader.size === Constants.EF_ZIP64_OR_32) {
        _centralHeader.size = size;
      }
    }
    if (data.length >= Constants.EF_ZIP64_RHO) {
      compressedSize = readUInt64LE(data, Constants.EF_ZIP64_SCOMP);
      if (_centralHeader.compressedSize === Constants.EF_ZIP64_OR_32) {
        _centralHeader.compressedSize = compressedSize;
      }
    }
    if (data.length >= Constants.EF_ZIP64_DSN) {
      offset = readUInt64LE(data, Constants.EF_ZIP64_RHO);
      if (_centralHeader.offset === Constants.EF_ZIP64_OR_32) {
        _centralHeader.offset = offset;
      }
    }
    if (data.length >= Constants.EF_ZIP64_DSN + 4) {
      diskNumStart = data.readUInt32LE(Constants.EF_ZIP64_DSN);
      if (_centralHeader.diskNumStart === Constants.EF_ZIP64_OR_16) {
        _centralHeader.diskNumStart = diskNumStart;
      }
    }
  }
  return {
    get entryName() {
      return decoder2.decode(_entryName);
    },
    get rawEntryName() {
      return _entryName;
    },
    set entryName(val) {
      _entryName = Utils$2.toBuffer(val, decoder2.encode);
      var lastChar = _entryName[_entryName.length - 1];
      _isDirectory = lastChar === 47 || lastChar === 92;
      _centralHeader.fileNameLength = _entryName.length;
    },
    get efs() {
      if (typeof _efs === "function") {
        return _efs(this.entryName);
      } else {
        return _efs;
      }
    },
    get extra() {
      return _extra;
    },
    set extra(val) {
      _extra = val;
      _centralHeader.extraLength = val.length;
      parseExtra(val);
    },
    get comment() {
      return decoder2.decode(_comment);
    },
    set comment(val) {
      _comment = Utils$2.toBuffer(val, decoder2.encode);
      _centralHeader.commentLength = _comment.length;
      if (_comment.length > 65535)
        throw Utils$2.Errors.COMMENT_TOO_LONG();
    },
    get name() {
      var n = decoder2.decode(_entryName);
      return _isDirectory ? n.substr(n.length - 1).split("/").pop() : n.split("/").pop();
    },
    get isDirectory() {
      return _isDirectory;
    },
    getCompressedData: function() {
      return compress(false, null);
    },
    getCompressedDataAsync: function(callback) {
      compress(true, callback);
    },
    setData: function(value) {
      uncompressedData = Utils$2.toBuffer(value, Utils$2.decoder.encode);
      if (!_isDirectory && uncompressedData.length) {
        _centralHeader.size = uncompressedData.length;
        _centralHeader.method = Utils$2.Constants.DEFLATED;
        _centralHeader.crc = Utils$2.crc32(value);
        _centralHeader.changed = true;
      } else {
        _centralHeader.method = Utils$2.Constants.STORED;
      }
    },
    getData: function(pass) {
      if (_centralHeader.changed) {
        return uncompressedData;
      } else {
        return decompress(false, null, pass);
      }
    },
    getDataAsync: function(callback, pass) {
      if (_centralHeader.changed) {
        callback(uncompressedData);
      } else {
        decompress(true, callback, pass);
      }
    },
    set attr(attr) {
      _centralHeader.attr = attr;
    },
    get attr() {
      return _centralHeader.attr;
    },
    set header(data) {
      _centralHeader.loadFromBinary(data);
    },
    get header() {
      return _centralHeader;
    },
    packCentralHeader: function() {
      _centralHeader.flags_efs = this.efs;
      _centralHeader.extraLength = _extra.length;
      var header = _centralHeader.centralHeaderToBinary();
      var addpos = Utils$2.Constants.CENHDR;
      _entryName.copy(header, addpos);
      addpos += _entryName.length;
      _extra.copy(header, addpos);
      addpos += _centralHeader.extraLength;
      _comment.copy(header, addpos);
      return header;
    },
    packLocalHeader: function() {
      let addpos = 0;
      _centralHeader.flags_efs = this.efs;
      _centralHeader.extraLocalLength = _extralocal.length;
      const localHeaderBuf = _centralHeader.localHeaderToBinary();
      const localHeader = Buffer.alloc(localHeaderBuf.length + _entryName.length + _centralHeader.extraLocalLength);
      localHeaderBuf.copy(localHeader, addpos);
      addpos += localHeaderBuf.length;
      _entryName.copy(localHeader, addpos);
      addpos += _entryName.length;
      _extralocal.copy(localHeader, addpos);
      addpos += _extralocal.length;
      return localHeader;
    },
    toJSON: function() {
      const bytes = function(nr) {
        return "<" + (nr && nr.length + " bytes buffer" || "null") + ">";
      };
      return {
        entryName: this.entryName,
        name: this.name,
        comment: this.comment,
        isDirectory: this.isDirectory,
        header: _centralHeader.toJSON(),
        compressedData: bytes(input),
        data: bytes(uncompressedData)
      };
    },
    toString: function() {
      return JSON.stringify(this.toJSON(), null, "	");
    }
  };
};
const ZipEntry$1 = zipEntry;
const Headers = headers;
const Utils$1 = utilExports;
var zipFile = function(inBuffer, options) {
  var entryList = [], entryTable = {}, _comment = Buffer.alloc(0), mainHeader2 = new Headers.MainHeader(), loadedEntries = false;
  const temporary = /* @__PURE__ */ new Set();
  const opts = options;
  const { noSort, decoder: decoder2 } = opts;
  if (inBuffer) {
    readMainHeader(opts.readEntries);
  } else {
    loadedEntries = true;
  }
  function makeTemporaryFolders() {
    const foldersList = /* @__PURE__ */ new Set();
    for (const elem of Object.keys(entryTable)) {
      const elements = elem.split("/");
      elements.pop();
      if (!elements.length)
        continue;
      for (let i = 0; i < elements.length; i++) {
        const sub = elements.slice(0, i + 1).join("/") + "/";
        foldersList.add(sub);
      }
    }
    for (const elem of foldersList) {
      if (!(elem in entryTable)) {
        const tempfolder = new ZipEntry$1(opts);
        tempfolder.entryName = elem;
        tempfolder.attr = 16;
        tempfolder.temporary = true;
        entryList.push(tempfolder);
        entryTable[tempfolder.entryName] = tempfolder;
        temporary.add(tempfolder);
      }
    }
  }
  function readEntries() {
    loadedEntries = true;
    entryTable = {};
    if (mainHeader2.diskEntries > (inBuffer.length - mainHeader2.offset) / Utils$1.Constants.CENHDR) {
      throw Utils$1.Errors.DISK_ENTRY_TOO_LARGE();
    }
    entryList = new Array(mainHeader2.diskEntries);
    var index2 = mainHeader2.offset;
    for (var i = 0; i < entryList.length; i++) {
      var tmp = index2, entry = new ZipEntry$1(opts, inBuffer);
      entry.header = inBuffer.slice(tmp, tmp += Utils$1.Constants.CENHDR);
      entry.entryName = inBuffer.slice(tmp, tmp += entry.header.fileNameLength);
      if (entry.header.extraLength) {
        entry.extra = inBuffer.slice(tmp, tmp += entry.header.extraLength);
      }
      if (entry.header.commentLength)
        entry.comment = inBuffer.slice(tmp, tmp + entry.header.commentLength);
      index2 += entry.header.centralHeaderSize;
      entryList[i] = entry;
      entryTable[entry.entryName] = entry;
    }
    temporary.clear();
    makeTemporaryFolders();
  }
  function readMainHeader(readNow) {
    var i = inBuffer.length - Utils$1.Constants.ENDHDR, max = Math.max(0, i - 65535), n = max, endStart = inBuffer.length, endOffset = -1, commentEnd = 0;
    const trailingSpace = typeof opts.trailingSpace === "boolean" ? opts.trailingSpace : false;
    if (trailingSpace)
      max = 0;
    for (i; i >= n; i--) {
      if (inBuffer[i] !== 80)
        continue;
      if (inBuffer.readUInt32LE(i) === Utils$1.Constants.ENDSIG) {
        endOffset = i;
        commentEnd = i;
        endStart = i + Utils$1.Constants.ENDHDR;
        n = i - Utils$1.Constants.END64HDR;
        continue;
      }
      if (inBuffer.readUInt32LE(i) === Utils$1.Constants.END64SIG) {
        n = max;
        continue;
      }
      if (inBuffer.readUInt32LE(i) === Utils$1.Constants.ZIP64SIG) {
        endOffset = i;
        endStart = i + Utils$1.readBigUInt64LE(inBuffer, i + Utils$1.Constants.ZIP64SIZE) + Utils$1.Constants.ZIP64LEAD;
        break;
      }
    }
    if (endOffset == -1)
      throw Utils$1.Errors.INVALID_FORMAT();
    mainHeader2.loadFromBinary(inBuffer.slice(endOffset, endStart));
    if (mainHeader2.commentLength) {
      _comment = inBuffer.slice(commentEnd + Utils$1.Constants.ENDHDR);
    }
    if (readNow)
      readEntries();
  }
  function sortEntries() {
    if (entryList.length > 1 && !noSort) {
      entryList.sort((a, b) => a.entryName.toLowerCase().localeCompare(b.entryName.toLowerCase()));
    }
  }
  return {
    /**
     * Returns an array of ZipEntry objects existent in the current opened archive
     * @return Array
     */
    get entries() {
      if (!loadedEntries) {
        readEntries();
      }
      return entryList.filter((e) => !temporary.has(e));
    },
    /**
     * Archive comment
     * @return {String}
     */
    get comment() {
      return decoder2.decode(_comment);
    },
    set comment(val) {
      _comment = Utils$1.toBuffer(val, decoder2.encode);
      mainHeader2.commentLength = _comment.length;
    },
    getEntryCount: function() {
      if (!loadedEntries) {
        return mainHeader2.diskEntries;
      }
      return entryList.length;
    },
    forEach: function(callback) {
      this.entries.forEach(callback);
    },
    /**
     * Returns a reference to the entry with the given name or null if entry is inexistent
     *
     * @param entryName
     * @return ZipEntry
     */
    getEntry: function(entryName) {
      if (!loadedEntries) {
        readEntries();
      }
      return entryTable[entryName] || null;
    },
    /**
     * Adds the given entry to the entry list
     *
     * @param entry
     */
    setEntry: function(entry) {
      if (!loadedEntries) {
        readEntries();
      }
      entryList.push(entry);
      entryTable[entry.entryName] = entry;
      mainHeader2.totalEntries = entryList.length;
    },
    /**
     * Removes the file with the given name from the entry list.
     *
     * If the entry is a directory, then all nested files and directories will be removed
     * @param entryName
     * @returns {void}
     */
    deleteFile: function(entryName, withsubfolders = true) {
      if (!loadedEntries) {
        readEntries();
      }
      const entry = entryTable[entryName];
      const list = this.getEntryChildren(entry, withsubfolders).map((child) => child.entryName);
      list.forEach(this.deleteEntry);
    },
    /**
     * Removes the entry with the given name from the entry list.
     *
     * @param {string} entryName
     * @returns {void}
     */
    deleteEntry: function(entryName) {
      if (!loadedEntries) {
        readEntries();
      }
      const entry = entryTable[entryName];
      const index2 = entryList.indexOf(entry);
      if (index2 >= 0) {
        entryList.splice(index2, 1);
        delete entryTable[entryName];
        mainHeader2.totalEntries = entryList.length;
      }
    },
    /**
     *  Iterates and returns all nested files and directories of the given entry
     *
     * @param entry
     * @return Array
     */
    getEntryChildren: function(entry, subfolders = true) {
      if (!loadedEntries) {
        readEntries();
      }
      if (typeof entry === "object") {
        if (entry.isDirectory && subfolders) {
          const list = [];
          const name = entry.entryName;
          for (const zipEntry2 of entryList) {
            if (zipEntry2.entryName.startsWith(name)) {
              list.push(zipEntry2);
            }
          }
          return list;
        } else {
          return [entry];
        }
      }
      return [];
    },
    /**
     *  How many child elements entry has
     *
     * @param {ZipEntry} entry
     * @return {integer}
     */
    getChildCount: function(entry) {
      if (entry && entry.isDirectory) {
        const list = this.getEntryChildren(entry);
        return list.includes(entry) ? list.length - 1 : list.length;
      }
      return 0;
    },
    /**
     * Returns the zip file
     *
     * @return Buffer
     */
    compressToBuffer: function() {
      if (!loadedEntries) {
        readEntries();
      }
      sortEntries();
      const dataBlock = [];
      const headerBlocks = [];
      let totalSize = 0;
      let dindex = 0;
      mainHeader2.size = 0;
      mainHeader2.offset = 0;
      let totalEntries = 0;
      for (const entry of this.entries) {
        const compressedData = entry.getCompressedData();
        entry.header.offset = dindex;
        const localHeader = entry.packLocalHeader();
        const dataLength = localHeader.length + compressedData.length;
        dindex += dataLength;
        dataBlock.push(localHeader);
        dataBlock.push(compressedData);
        const centralHeader = entry.packCentralHeader();
        headerBlocks.push(centralHeader);
        mainHeader2.size += centralHeader.length;
        totalSize += dataLength + centralHeader.length;
        totalEntries++;
      }
      totalSize += mainHeader2.mainHeaderSize;
      mainHeader2.offset = dindex;
      mainHeader2.totalEntries = totalEntries;
      dindex = 0;
      const outBuffer = Buffer.alloc(totalSize);
      for (const content of dataBlock) {
        content.copy(outBuffer, dindex);
        dindex += content.length;
      }
      for (const content of headerBlocks) {
        content.copy(outBuffer, dindex);
        dindex += content.length;
      }
      const mh = mainHeader2.toBinary();
      if (_comment) {
        _comment.copy(mh, Utils$1.Constants.ENDHDR);
      }
      mh.copy(outBuffer, dindex);
      inBuffer = outBuffer;
      loadedEntries = false;
      return outBuffer;
    },
    toAsyncBuffer: function(onSuccess, onFail, onItemStart, onItemEnd) {
      try {
        if (!loadedEntries) {
          readEntries();
        }
        sortEntries();
        const dataBlock = [];
        const centralHeaders = [];
        let totalSize = 0;
        let dindex = 0;
        let totalEntries = 0;
        mainHeader2.size = 0;
        mainHeader2.offset = 0;
        const compress2Buffer = function(entryLists) {
          if (entryLists.length > 0) {
            const entry = entryLists.shift();
            const name = entry.entryName + entry.extra.toString();
            if (onItemStart)
              onItemStart(name);
            entry.getCompressedDataAsync(function(compressedData) {
              if (onItemEnd)
                onItemEnd(name);
              entry.header.offset = dindex;
              const localHeader = entry.packLocalHeader();
              const dataLength = localHeader.length + compressedData.length;
              dindex += dataLength;
              dataBlock.push(localHeader);
              dataBlock.push(compressedData);
              const centalHeader = entry.packCentralHeader();
              centralHeaders.push(centalHeader);
              mainHeader2.size += centalHeader.length;
              totalSize += dataLength + centalHeader.length;
              totalEntries++;
              compress2Buffer(entryLists);
            });
          } else {
            totalSize += mainHeader2.mainHeaderSize;
            mainHeader2.offset = dindex;
            mainHeader2.totalEntries = totalEntries;
            dindex = 0;
            const outBuffer = Buffer.alloc(totalSize);
            dataBlock.forEach(function(content) {
              content.copy(outBuffer, dindex);
              dindex += content.length;
            });
            centralHeaders.forEach(function(content) {
              content.copy(outBuffer, dindex);
              dindex += content.length;
            });
            const mh = mainHeader2.toBinary();
            if (_comment) {
              _comment.copy(mh, Utils$1.Constants.ENDHDR);
            }
            mh.copy(outBuffer, dindex);
            inBuffer = outBuffer;
            loadedEntries = false;
            onSuccess(outBuffer);
          }
        };
        compress2Buffer(Array.from(this.entries));
      } catch (e) {
        onFail(e);
      }
    }
  };
};
const Utils = utilExports;
const pth = require$$1__default.default;
const ZipEntry = zipEntry;
const ZipFile = zipFile;
const get_Bool = (...val) => Utils.findLast(val, (c) => typeof c === "boolean");
const get_Str = (...val) => Utils.findLast(val, (c) => typeof c === "string");
const get_Fun = (...val) => Utils.findLast(val, (c) => typeof c === "function");
const defaultOptions = {
  // option "noSort" : if true it disables files sorting
  noSort: false,
  // read entries during load (initial loading may be slower)
  readEntries: false,
  // default method is none
  method: Utils.Constants.NONE,
  // file system
  fs: null
};
var admZip = function(input, options) {
  let inBuffer = null;
  const opts = Object.assign(/* @__PURE__ */ Object.create(null), defaultOptions);
  if (input && "object" === typeof input) {
    if (!(input instanceof Uint8Array)) {
      Object.assign(opts, input);
      input = opts.input ? opts.input : void 0;
      if (opts.input)
        delete opts.input;
    }
    if (Buffer.isBuffer(input)) {
      inBuffer = input;
      opts.method = Utils.Constants.BUFFER;
      input = void 0;
    }
  }
  Object.assign(opts, options);
  const filetools = new Utils(opts);
  if (typeof opts.decoder !== "object" || typeof opts.decoder.encode !== "function" || typeof opts.decoder.decode !== "function") {
    opts.decoder = Utils.decoder;
  }
  if (input && "string" === typeof input) {
    if (filetools.fs.existsSync(input)) {
      opts.method = Utils.Constants.FILE;
      opts.filename = input;
      inBuffer = filetools.fs.readFileSync(input);
    } else {
      throw Utils.Errors.INVALID_FILENAME();
    }
  }
  const _zip = new ZipFile(inBuffer, opts);
  const { canonical, sanitize, zipnamefix } = Utils;
  function getEntry(entry) {
    if (entry && _zip) {
      var item;
      if (typeof entry === "string")
        item = _zip.getEntry(pth.posix.normalize(entry));
      if (typeof entry === "object" && typeof entry.entryName !== "undefined" && typeof entry.header !== "undefined")
        item = _zip.getEntry(entry.entryName);
      if (item) {
        return item;
      }
    }
    return null;
  }
  function fixPath(zipPath) {
    const { join, normalize, sep } = pth.posix;
    return join(".", normalize(sep + zipPath.split("\\").join(sep) + sep));
  }
  function filenameFilter(filterfn) {
    if (filterfn instanceof RegExp) {
      return /* @__PURE__ */ function(rx) {
        return function(filename) {
          return rx.test(filename);
        };
      }(filterfn);
    } else if ("function" !== typeof filterfn) {
      return () => true;
    }
    return filterfn;
  }
  const relativePath = (local, entry) => {
    let lastChar = entry.slice(-1);
    lastChar = lastChar === filetools.sep ? filetools.sep : "";
    return pth.relative(local, entry) + lastChar;
  };
  return {
    /**
     * Extracts the given entry from the archive and returns the content as a Buffer object
     * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
     * @param {Buffer|string} [pass] - password
     * @return Buffer or Null in case of error
     */
    readFile: function(entry, pass) {
      var item = getEntry(entry);
      return item && item.getData(pass) || null;
    },
    /**
     * Returns how many child elements has on entry (directories) on files it is always 0
     * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
     * @returns {integer}
     */
    childCount: function(entry) {
      const item = getEntry(entry);
      if (item) {
        return _zip.getChildCount(item);
      }
    },
    /**
     * Asynchronous readFile
     * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
     * @param {callback} callback
     *
     * @return Buffer or Null in case of error
     */
    readFileAsync: function(entry, callback) {
      var item = getEntry(entry);
      if (item) {
        item.getDataAsync(callback);
      } else {
        callback(null, "getEntry failed for:" + entry);
      }
    },
    /**
     * Extracts the given entry from the archive and returns the content as plain text in the given encoding
     * @param {ZipEntry|string} entry - ZipEntry object or String with the full path of the entry
     * @param {string} encoding - Optional. If no encoding is specified utf8 is used
     *
     * @return String
     */
    readAsText: function(entry, encoding) {
      var item = getEntry(entry);
      if (item) {
        var data = item.getData();
        if (data && data.length) {
          return data.toString(encoding || "utf8");
        }
      }
      return "";
    },
    /**
     * Asynchronous readAsText
     * @param {ZipEntry|string} entry ZipEntry object or String with the full path of the entry
     * @param {callback} callback
     * @param {string} [encoding] - Optional. If no encoding is specified utf8 is used
     *
     * @return String
     */
    readAsTextAsync: function(entry, callback, encoding) {
      var item = getEntry(entry);
      if (item) {
        item.getDataAsync(function(data, err) {
          if (err) {
            callback(data, err);
            return;
          }
          if (data && data.length) {
            callback(data.toString(encoding || "utf8"));
          } else {
            callback("");
          }
        });
      } else {
        callback("");
      }
    },
    /**
     * Remove the entry from the file or the entry and all it's nested directories and files if the given entry is a directory
     *
     * @param {ZipEntry|string} entry
     * @returns {void}
     */
    deleteFile: function(entry, withsubfolders = true) {
      var item = getEntry(entry);
      if (item) {
        _zip.deleteFile(item.entryName, withsubfolders);
      }
    },
    /**
     * Remove the entry from the file or directory without affecting any nested entries
     *
     * @param {ZipEntry|string} entry
     * @returns {void}
     */
    deleteEntry: function(entry) {
      var item = getEntry(entry);
      if (item) {
        _zip.deleteEntry(item.entryName);
      }
    },
    /**
     * Adds a comment to the zip. The zip must be rewritten after adding the comment.
     *
     * @param {string} comment
     */
    addZipComment: function(comment) {
      _zip.comment = comment;
    },
    /**
     * Returns the zip comment
     *
     * @return String
     */
    getZipComment: function() {
      return _zip.comment || "";
    },
    /**
     * Adds a comment to a specified zipEntry. The zip must be rewritten after adding the comment
     * The comment cannot exceed 65535 characters in length
     *
     * @param {ZipEntry} entry
     * @param {string} comment
     */
    addZipEntryComment: function(entry, comment) {
      var item = getEntry(entry);
      if (item) {
        item.comment = comment;
      }
    },
    /**
     * Returns the comment of the specified entry
     *
     * @param {ZipEntry} entry
     * @return String
     */
    getZipEntryComment: function(entry) {
      var item = getEntry(entry);
      if (item) {
        return item.comment || "";
      }
      return "";
    },
    /**
     * Updates the content of an existing entry inside the archive. The zip must be rewritten after updating the content
     *
     * @param {ZipEntry} entry
     * @param {Buffer} content
     */
    updateFile: function(entry, content) {
      var item = getEntry(entry);
      if (item) {
        item.setData(content);
      }
    },
    /**
     * Adds a file from the disk to the archive
     *
     * @param {string} localPath File to add to zip
     * @param {string} [zipPath] Optional path inside the zip
     * @param {string} [zipName] Optional name for the file
     * @param {string} [comment] Optional file comment
     */
    addLocalFile: function(localPath2, zipPath, zipName, comment) {
      if (filetools.fs.existsSync(localPath2)) {
        zipPath = zipPath ? fixPath(zipPath) : "";
        const p = pth.win32.basename(pth.win32.normalize(localPath2));
        zipPath += zipName ? zipName : p;
        const _attr = filetools.fs.statSync(localPath2);
        const data = _attr.isFile() ? filetools.fs.readFileSync(localPath2) : Buffer.alloc(0);
        if (_attr.isDirectory())
          zipPath += filetools.sep;
        this.addFile(zipPath, data, comment, _attr);
      } else {
        throw Utils.Errors.FILE_NOT_FOUND(localPath2);
      }
    },
    /**
     * Callback for showing if everything was done.
     *
     * @callback doneCallback
     * @param {Error} err - Error object
     * @param {boolean} done - was request fully completed
     */
    /**
     * Adds a file from the disk to the archive
     *
     * @param {(object|string)} options - options object, if it is string it us used as localPath.
     * @param {string} options.localPath - Local path to the file.
     * @param {string} [options.comment] - Optional file comment.
     * @param {string} [options.zipPath] - Optional path inside the zip
     * @param {string} [options.zipName] - Optional name for the file
     * @param {doneCallback} callback - The callback that handles the response.
     */
    addLocalFileAsync: function(options2, callback) {
      options2 = typeof options2 === "object" ? options2 : { localPath: options2 };
      const localPath2 = pth.resolve(options2.localPath);
      const { comment } = options2;
      let { zipPath, zipName } = options2;
      const self = this;
      filetools.fs.stat(localPath2, function(err, stats) {
        if (err)
          return callback(err, false);
        zipPath = zipPath ? fixPath(zipPath) : "";
        const p = pth.win32.basename(pth.win32.normalize(localPath2));
        zipPath += zipName ? zipName : p;
        if (stats.isFile()) {
          filetools.fs.readFile(localPath2, function(err2, data) {
            if (err2)
              return callback(err2, false);
            self.addFile(zipPath, data, comment, stats);
            return setImmediate(callback, void 0, true);
          });
        } else if (stats.isDirectory()) {
          zipPath += filetools.sep;
          self.addFile(zipPath, Buffer.alloc(0), comment, stats);
          return setImmediate(callback, void 0, true);
        }
      });
    },
    /**
     * Adds a local directory and all its nested files and directories to the archive
     *
     * @param {string} localPath - local path to the folder
     * @param {string} [zipPath] - optional path inside zip
     * @param {(RegExp|function)} [filter] - optional RegExp or Function if files match will be included.
     */
    addLocalFolder: function(localPath2, zipPath, filter) {
      filter = filenameFilter(filter);
      zipPath = zipPath ? fixPath(zipPath) : "";
      localPath2 = pth.normalize(localPath2);
      if (filetools.fs.existsSync(localPath2)) {
        const items = filetools.findFiles(localPath2);
        const self = this;
        if (items.length) {
          for (const filepath of items) {
            const p = pth.join(zipPath, relativePath(localPath2, filepath));
            if (filter(p)) {
              self.addLocalFile(filepath, pth.dirname(p));
            }
          }
        }
      } else {
        throw Utils.Errors.FILE_NOT_FOUND(localPath2);
      }
    },
    /**
     * Asynchronous addLocalFolder
     * @param {string} localPath
     * @param {callback} callback
     * @param {string} [zipPath] optional path inside zip
     * @param {RegExp|function} [filter] optional RegExp or Function if files match will
     *               be included.
     */
    addLocalFolderAsync: function(localPath2, callback, zipPath, filter) {
      filter = filenameFilter(filter);
      zipPath = zipPath ? fixPath(zipPath) : "";
      localPath2 = pth.normalize(localPath2);
      var self = this;
      filetools.fs.open(localPath2, "r", function(err) {
        if (err && err.code === "ENOENT") {
          callback(void 0, Utils.Errors.FILE_NOT_FOUND(localPath2));
        } else if (err) {
          callback(void 0, err);
        } else {
          var items = filetools.findFiles(localPath2);
          var i = -1;
          var next = function() {
            i += 1;
            if (i < items.length) {
              var filepath = items[i];
              var p = relativePath(localPath2, filepath).split("\\").join("/");
              p = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
              if (filter(p)) {
                filetools.fs.stat(filepath, function(er0, stats) {
                  if (er0)
                    callback(void 0, er0);
                  if (stats.isFile()) {
                    filetools.fs.readFile(filepath, function(er1, data) {
                      if (er1) {
                        callback(void 0, er1);
                      } else {
                        self.addFile(zipPath + p, data, "", stats);
                        next();
                      }
                    });
                  } else {
                    self.addFile(zipPath + p + "/", Buffer.alloc(0), "", stats);
                    next();
                  }
                });
              } else {
                process.nextTick(() => {
                  next();
                });
              }
            } else {
              callback(true, void 0);
            }
          };
          next();
        }
      });
    },
    /**
     * Adds a local directory and all its nested files and directories to the archive
     *
     * @param {object | string} options - options object, if it is string it us used as localPath.
     * @param {string} options.localPath - Local path to the folder.
     * @param {string} [options.zipPath] - optional path inside zip.
     * @param {RegExp|function} [options.filter] - optional RegExp or Function if files match will be included.
     * @param {function|string} [options.namefix] - optional function to help fix filename
     * @param {doneCallback} callback - The callback that handles the response.
     *
     */
    addLocalFolderAsync2: function(options2, callback) {
      const self = this;
      options2 = typeof options2 === "object" ? options2 : { localPath: options2 };
      localPath = pth.resolve(fixPath(options2.localPath));
      let { zipPath, filter, namefix } = options2;
      if (filter instanceof RegExp) {
        filter = /* @__PURE__ */ function(rx) {
          return function(filename) {
            return rx.test(filename);
          };
        }(filter);
      } else if ("function" !== typeof filter) {
        filter = function() {
          return true;
        };
      }
      zipPath = zipPath ? fixPath(zipPath) : "";
      if (namefix == "latin1") {
        namefix = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
      }
      if (typeof namefix !== "function")
        namefix = (str) => str;
      const relPathFix = (entry) => pth.join(zipPath, namefix(relativePath(localPath, entry)));
      const fileNameFix = (entry) => pth.win32.basename(pth.win32.normalize(namefix(entry)));
      filetools.fs.open(localPath, "r", function(err) {
        if (err && err.code === "ENOENT") {
          callback(void 0, Utils.Errors.FILE_NOT_FOUND(localPath));
        } else if (err) {
          callback(void 0, err);
        } else {
          filetools.findFilesAsync(localPath, function(err2, fileEntries) {
            if (err2)
              return callback(err2);
            fileEntries = fileEntries.filter((dir) => filter(relPathFix(dir)));
            if (!fileEntries.length)
              callback(void 0, false);
            setImmediate(
              fileEntries.reverse().reduce(function(next, entry) {
                return function(err3, done) {
                  if (err3 || done === false)
                    return setImmediate(next, err3, false);
                  self.addLocalFileAsync(
                    {
                      localPath: entry,
                      zipPath: pth.dirname(relPathFix(entry)),
                      zipName: fileNameFix(entry)
                    },
                    next
                  );
                };
              }, callback)
            );
          });
        }
      });
    },
    /**
     * Adds a local directory and all its nested files and directories to the archive
     *
     * @param {string} localPath - path where files will be extracted
     * @param {object} props - optional properties
     * @param {string} [props.zipPath] - optional path inside zip
     * @param {RegExp|function} [props.filter] - optional RegExp or Function if files match will be included.
     * @param {function|string} [props.namefix] - optional function to help fix filename
     */
    addLocalFolderPromise: function(localPath2, props) {
      return new Promise((resolve, reject) => {
        this.addLocalFolderAsync2(Object.assign({ localPath: localPath2 }, props), (err, done) => {
          if (err)
            reject(err);
          if (done)
            resolve(this);
        });
      });
    },
    /**
     * Allows you to create a entry (file or directory) in the zip file.
     * If you want to create a directory the entryName must end in / and a null buffer should be provided.
     * Comment and attributes are optional
     *
     * @param {string} entryName
     * @param {Buffer | string} content - file content as buffer or utf8 coded string
     * @param {string} [comment] - file comment
     * @param {number | object} [attr] - number as unix file permissions, object as filesystem Stats object
     */
    addFile: function(entryName, content, comment, attr) {
      entryName = zipnamefix(entryName);
      let entry = getEntry(entryName);
      const update = entry != null;
      if (!update) {
        entry = new ZipEntry(opts);
        entry.entryName = entryName;
      }
      entry.comment = comment || "";
      const isStat = "object" === typeof attr && attr instanceof filetools.fs.Stats;
      if (isStat) {
        entry.header.time = attr.mtime;
      }
      var fileattr = entry.isDirectory ? 16 : 0;
      let unix = entry.isDirectory ? 16384 : 32768;
      if (isStat) {
        unix |= 4095 & attr.mode;
      } else if ("number" === typeof attr) {
        unix |= 4095 & attr;
      } else {
        unix |= entry.isDirectory ? 493 : 420;
      }
      fileattr = (fileattr | unix << 16) >>> 0;
      entry.attr = fileattr;
      entry.setData(content);
      if (!update)
        _zip.setEntry(entry);
      return entry;
    },
    /**
     * Returns an array of ZipEntry objects representing the files and folders inside the archive
     *
     * @param {string} [password]
     * @returns Array
     */
    getEntries: function(password) {
      _zip.password = password;
      return _zip ? _zip.entries : [];
    },
    /**
     * Returns a ZipEntry object representing the file or folder specified by ``name``.
     *
     * @param {string} name
     * @return ZipEntry
     */
    getEntry: function(name) {
      return getEntry(name);
    },
    getEntryCount: function() {
      return _zip.getEntryCount();
    },
    forEach: function(callback) {
      return _zip.forEach(callback);
    },
    /**
     * Extracts the given entry to the given targetPath
     * If the entry is a directory inside the archive, the entire directory and it's subdirectories will be extracted
     *
     * @param {string|ZipEntry} entry - ZipEntry object or String with the full path of the entry
     * @param {string} targetPath - Target folder where to write the file
     * @param {boolean} [maintainEntryPath=true] - If maintainEntryPath is true and the entry is inside a folder, the entry folder will be created in targetPath as well. Default is TRUE
     * @param {boolean} [overwrite=false] - If the file already exists at the target path, the file will be overwriten if this is true.
     * @param {boolean} [keepOriginalPermission=false] - The file will be set as the permission from the entry if this is true.
     * @param {string} [outFileName] - String If set will override the filename of the extracted file (Only works if the entry is a file)
     *
     * @return Boolean
     */
    extractEntryTo: function(entry, targetPath, maintainEntryPath, overwrite, keepOriginalPermission, outFileName) {
      overwrite = get_Bool(false, overwrite);
      keepOriginalPermission = get_Bool(false, keepOriginalPermission);
      maintainEntryPath = get_Bool(true, maintainEntryPath);
      outFileName = get_Str(keepOriginalPermission, outFileName);
      var item = getEntry(entry);
      if (!item) {
        throw Utils.Errors.NO_ENTRY();
      }
      var entryName = canonical(item.entryName);
      var target = sanitize(targetPath, outFileName && !item.isDirectory ? outFileName : maintainEntryPath ? entryName : pth.basename(entryName));
      if (item.isDirectory) {
        var children = _zip.getEntryChildren(item);
        children.forEach(function(child) {
          if (child.isDirectory)
            return;
          var content2 = child.getData();
          if (!content2) {
            throw Utils.Errors.CANT_EXTRACT_FILE();
          }
          var name = canonical(child.entryName);
          var childName = sanitize(targetPath, maintainEntryPath ? name : pth.basename(name));
          const fileAttr2 = keepOriginalPermission ? child.header.fileAttr : void 0;
          filetools.writeFileTo(childName, content2, overwrite, fileAttr2);
        });
        return true;
      }
      var content = item.getData(_zip.password);
      if (!content)
        throw Utils.Errors.CANT_EXTRACT_FILE();
      if (filetools.fs.existsSync(target) && !overwrite) {
        throw Utils.Errors.CANT_OVERRIDE();
      }
      const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
      filetools.writeFileTo(target, content, overwrite, fileAttr);
      return true;
    },
    /**
     * Test the archive
     * @param {string} [pass]
     */
    test: function(pass) {
      if (!_zip) {
        return false;
      }
      for (var entry in _zip.entries) {
        try {
          if (entry.isDirectory) {
            continue;
          }
          var content = _zip.entries[entry].getData(pass);
          if (!content) {
            return false;
          }
        } catch (err) {
          return false;
        }
      }
      return true;
    },
    /**
     * Extracts the entire archive to the given location
     *
     * @param {string} targetPath Target location
     * @param {boolean} [overwrite=false] If the file already exists at the target path, the file will be overwriten if this is true.
     *                  Default is FALSE
     * @param {boolean} [keepOriginalPermission=false] The file will be set as the permission from the entry if this is true.
     *                  Default is FALSE
     * @param {string|Buffer} [pass] password
     */
    extractAllTo: function(targetPath, overwrite, keepOriginalPermission, pass) {
      keepOriginalPermission = get_Bool(false, keepOriginalPermission);
      pass = get_Str(keepOriginalPermission, pass);
      overwrite = get_Bool(false, overwrite);
      if (!_zip)
        throw Utils.Errors.NO_ZIP();
      _zip.entries.forEach(function(entry) {
        var entryName = sanitize(targetPath, canonical(entry.entryName));
        if (entry.isDirectory) {
          filetools.makeDir(entryName);
          return;
        }
        var content = entry.getData(pass);
        if (!content) {
          throw Utils.Errors.CANT_EXTRACT_FILE();
        }
        const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
        filetools.writeFileTo(entryName, content, overwrite, fileAttr);
        try {
          filetools.fs.utimesSync(entryName, entry.header.time, entry.header.time);
        } catch (err) {
          throw Utils.Errors.CANT_EXTRACT_FILE();
        }
      });
    },
    /**
     * Asynchronous extractAllTo
     *
     * @param {string} targetPath Target location
     * @param {boolean} [overwrite=false] If the file already exists at the target path, the file will be overwriten if this is true.
     *                  Default is FALSE
     * @param {boolean} [keepOriginalPermission=false] The file will be set as the permission from the entry if this is true.
     *                  Default is FALSE
     * @param {function} callback The callback will be executed when all entries are extracted successfully or any error is thrown.
     */
    extractAllToAsync: function(targetPath, overwrite, keepOriginalPermission, callback) {
      callback = get_Fun(overwrite, keepOriginalPermission, callback);
      keepOriginalPermission = get_Bool(false, keepOriginalPermission);
      overwrite = get_Bool(false, overwrite);
      if (!callback) {
        return new Promise((resolve, reject) => {
          this.extractAllToAsync(targetPath, overwrite, keepOriginalPermission, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          });
        });
      }
      if (!_zip) {
        callback(Utils.Errors.NO_ZIP());
        return;
      }
      targetPath = pth.resolve(targetPath);
      const getPath = (entry) => sanitize(targetPath, pth.normalize(canonical(entry.entryName)));
      const getError = (msg, file) => new Error(msg + ': "' + file + '"');
      const dirEntries = [];
      const fileEntries = [];
      _zip.entries.forEach((e) => {
        if (e.isDirectory) {
          dirEntries.push(e);
        } else {
          fileEntries.push(e);
        }
      });
      for (const entry of dirEntries) {
        const dirPath = getPath(entry);
        const dirAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
        try {
          filetools.makeDir(dirPath);
          if (dirAttr)
            filetools.fs.chmodSync(dirPath, dirAttr);
          filetools.fs.utimesSync(dirPath, entry.header.time, entry.header.time);
        } catch (er) {
          callback(getError("Unable to create folder", dirPath));
        }
      }
      fileEntries.reverse().reduce(function(next, entry) {
        return function(err) {
          if (err) {
            next(err);
          } else {
            const entryName = pth.normalize(canonical(entry.entryName));
            const filePath = sanitize(targetPath, entryName);
            entry.getDataAsync(function(content, err_1) {
              if (err_1) {
                next(err_1);
              } else if (!content) {
                next(Utils.Errors.CANT_EXTRACT_FILE());
              } else {
                const fileAttr = keepOriginalPermission ? entry.header.fileAttr : void 0;
                filetools.writeFileToAsync(filePath, content, overwrite, fileAttr, function(succ) {
                  if (!succ) {
                    next(getError("Unable to write file", filePath));
                  }
                  filetools.fs.utimes(filePath, entry.header.time, entry.header.time, function(err_2) {
                    if (err_2) {
                      next(getError("Unable to set times", filePath));
                    } else {
                      next();
                    }
                  });
                });
              }
            });
          }
        };
      }, callback)();
    },
    /**
     * Writes the newly created zip file to disk at the specified location or if a zip was opened and no ``targetFileName`` is provided, it will overwrite the opened zip
     *
     * @param {string} targetFileName
     * @param {function} callback
     */
    writeZip: function(targetFileName, callback) {
      if (arguments.length === 1) {
        if (typeof targetFileName === "function") {
          callback = targetFileName;
          targetFileName = "";
        }
      }
      if (!targetFileName && opts.filename) {
        targetFileName = opts.filename;
      }
      if (!targetFileName)
        return;
      var zipData = _zip.compressToBuffer();
      if (zipData) {
        var ok = filetools.writeFileTo(targetFileName, zipData, true);
        if (typeof callback === "function")
          callback(!ok ? new Error("failed") : null, "");
      }
    },
    /**
             *
             * @param {string} targetFileName
             * @param {object} [props]
             * @param {boolean} [props.overwrite=true] If the file already exists at the target path, the file will be overwriten if this is true.
             * @param {boolean} [props.perm] The file will be set as the permission from the entry if this is true.
    
             * @returns {Promise<void>}
             */
    writeZipPromise: function(targetFileName, props) {
      const { overwrite, perm } = Object.assign({ overwrite: true }, props);
      return new Promise((resolve, reject) => {
        if (!targetFileName && opts.filename)
          targetFileName = opts.filename;
        if (!targetFileName)
          reject("ADM-ZIP: ZIP File Name Missing");
        this.toBufferPromise().then((zipData) => {
          const ret = (done) => done ? resolve(done) : reject("ADM-ZIP: Wasn't able to write zip file");
          filetools.writeFileToAsync(targetFileName, zipData, overwrite, perm, ret);
        }, reject);
      });
    },
    /**
     * @returns {Promise<Buffer>} A promise to the Buffer.
     */
    toBufferPromise: function() {
      return new Promise((resolve, reject) => {
        _zip.toAsyncBuffer(resolve, reject);
      });
    },
    /**
     * Returns the content of the entire zip file as a Buffer object
     *
     * @prop {function} [onSuccess]
     * @prop {function} [onFail]
     * @prop {function} [onItemStart]
     * @prop {function} [onItemEnd]
     * @returns {Buffer}
     */
    toBuffer: function(onSuccess, onFail, onItemStart, onItemEnd) {
      if (typeof onSuccess === "function") {
        _zip.toAsyncBuffer(onSuccess, onFail, onItemStart, onItemEnd);
        return null;
      }
      return _zip.compressToBuffer();
    }
  };
};
const AdmZip = /* @__PURE__ */ getDefaultExportFromCjs(admZip);
const renderEditorPage = (model, options) => {
  console.log("DEBUG: model.integration:", model.integration);
  const integrationJson = JSON.stringify(model.integration, null, 2);
  console.log("DEBUG: integrationJson length:", integrationJson?.length || 0);
  const orderedScripts = [...model.scripts];
  const editorScriptIndex = orderedScripts.findIndex((script) => script.includes("h5peditor.js"));
  const editorEditorScriptIndex = orderedScripts.findIndex((script) => script.includes("h5peditor-editor.js"));
  if (editorScriptIndex !== -1 && editorEditorScriptIndex !== -1 && editorEditorScriptIndex < editorScriptIndex) {
    const [editorEditorScript] = orderedScripts.splice(editorEditorScriptIndex, 1);
    const targetIndex = orderedScripts.findIndex((script) => script.includes("h5peditor.js"));
    orderedScripts.splice(targetIndex + 1, 0, editorEditorScript);
  }
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>H5P Editor</title>
<style>
  html, body, .h5p-editor-wrapper, .h5p-create, .h5p-editor {
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    overflow-x: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .h5p-editor {
    min-height: 400px;
  }
  .h5p-create {
    min-height: 700px;
  }
  .h5p-create iframe.h5p-editor-iframe {
    display: block;
    width: 100%;
    min-height: 700px;
    height: 100vh;
    border: none;
  }
  #save-h5p {
    margin: 16px 0 0;
  }
</style>
${model.styles.map((style) => `<link rel="stylesheet" href="${style}">`).join("\n")}
<script>
  // CRITICAL: Set H5PIntegration IMMEDIATELY before H5P scripts load
  // Must be defined on window object before any H5P library scripts execute
  console.log('[H5P] Setting window.H5PIntegration...');
  
  const integration = ${integrationJson};
  integration.loadedJs = integration.loadedJs || [];
  integration.loadedCss = integration.loadedCss || [];
  window.H5PIntegration = integration;
  
  // Lock the reference to prevent reassignment (properties still mutable)
  Object.defineProperty(window, 'H5PIntegration', {
    value: window.H5PIntegration,
    writable: false,
    configurable: false,
    enumerable: true
  });
  
  console.log('[H5P] H5PIntegration configured:', {
    exists: typeof window.H5PIntegration !== 'undefined',
    hasEditor: window.H5PIntegration && typeof window.H5PIntegration.editor !== 'undefined',
    editorHasContentHub: window.H5PIntegration?.editor?.enableContentHub
  });
<\/script>
${orderedScripts.map((script) => `<script src="${script}"><\/script>`).join("\n")}
</head>
<body>
<form method="post" enctype="multipart/form-data" id="h5p-content-form">
  <div class="h5p-create">
    <div class="h5p-editor"></div>
  </div>
  <input id="save-h5p" type="submit" value="Save H5P" />
</form>
<script>
var ns = H5PEditor;
(function ($) {
  function postMessage(message) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, window.location.origin);
    }
  }

  H5PEditor.init = function () {
    H5PEditor.$ = H5P.jQuery;
    H5PEditor.basePath = H5PIntegration.editor.libraryUrl;
    H5PEditor.fileIcon = H5PIntegration.editor.fileIcon;
    H5PEditor.ajaxPath = H5PIntegration.editor.ajaxPath;
    H5PEditor.filesPath = H5PIntegration.editor.filesPath;
    H5PEditor.apiVersion = H5PIntegration.editor.apiVersion;
    H5PEditor.contentLanguage = H5PIntegration.editor.language;
    H5PEditor.copyrightSemantics = H5PIntegration.editor.copyrightSemantics;
    H5PEditor.metadataSemantics = H5PIntegration.editor.metadataSemantics;
    H5PEditor.assets = H5PIntegration.editor.assets;
    H5PEditor.baseUrl = '';

    if (H5PIntegration.editor.nodeVersionId !== undefined) {
      H5PEditor.contentId = H5PIntegration.editor.nodeVersionId;
    }

    var $editor = $('.h5p-editor');
    var h5peditor;

    function createEditor(library, params) {
      h5peditor = new ns.Editor(library, params, $editor[0]);
      postMessage({ type: 'h5p-editor-loaded' });
    }

    if (H5PEditor.contentId) {
      $.ajax({
        type: 'GET',
        url: '${options.paramsEndpoint}/' + H5PEditor.contentId + window.location.search,
        success: function (res) {
          createEditor(res.library, JSON.stringify(res.params));
        },
        error: function () {
          createEditor(undefined, undefined);
        }
      });
    } else {
      createEditor(undefined, undefined);
    }

    $('#h5p-content-form').submit(function (event) {
      event.preventDefault();
      if (!h5peditor) {
        return;
      }
      h5peditor.getContent(function (content) {
        var payload = {
          library: content.library,
          params: JSON.parse(content.params),
          metadata: content.metadata || {}
        };
        $.ajax({
          data: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
          type: 'POST',
          url: '${options.saveEndpoint}'
        }).then(function (result) {
          var parsed = typeof result === 'string' ? JSON.parse(result) : result;
          var contentId = parsed && (parsed.id || parsed.contentId);
          if (contentId) {
            postMessage({
              type: 'h5p-content-saved',
              data: { contentId: contentId, library: content.library }
            });
          }
        }).catch(function (error) {
          postMessage({
            type: 'h5p-editor-error',
            error: (error && error.message) || 'Save failed'
          });
        });
      });
    });
  };

  H5PEditor.getAjaxUrl = function (action, parameters) {
    var url = H5PIntegration.editor.ajaxPath + action;
    if (parameters !== undefined) {
      for (var property in parameters) {
        if (parameters.hasOwnProperty(property)) {
          url += '&' + property + '=' + parameters[property];
        }
      }
    }
    url += window.location.search.replaceAll("?", "&");
    return url;
  };

  H5PEditor.enableContentHub = H5PIntegration.editor.enableContentHub || false;
  $(document).ready(H5PEditor.init);
})(H5P.jQuery);
<\/script>
</body>
</html>`;
};
const getErrorMessage = (err) => err instanceof Error ? err.message : "Internal Server Error";
const bootstrap = async ({ strapi }) => {
  const h5pService = strapi.plugin("h5p").service("service");
  await h5pService.initialize();
  strapi.log.info("H5P plugin bootstrapped");
};
const destroy = ({ strapi }) => {
};
const register = ({ strapi }) => {
  strapi.customFields.register({
    name: "h5p-editor",
    plugin: "h5p",
    type: "json"
    // Store H5P content as JSON
  });
};
const config = {
  default: {},
  validator() {
  }
};
const controller = ({ strapi }) => ({
  // Content methods
  async findContent(ctx) {
    try {
      const contents = await strapi.documents("api::h5p-content.h5p-content").findMany({
        ...ctx.query
      });
      ctx.body = contents;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async findOneContent(ctx) {
    const { id } = ctx.params;
    try {
      const content2 = await strapi.documents("api::h5p-content.h5p-content").findOne({
        documentId: id,
        ...ctx.query
      });
      ctx.body = content2;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async createContent(ctx) {
    try {
      const { title, library, parameters, metadata } = ctx.request.body;
      const slug = title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");
      const embedCode = `<iframe src="${strapi.config.get("server.url")}/api/h5p/content/${slug}/embed" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
      const newContent = await strapi.documents("api::h5p-content.h5p-content").create({
        data: {
          title,
          slug,
          library,
          parameters,
          metadata,
          embedCode
        }
      });
      ctx.body = newContent;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async updateContent(ctx) {
    const { id } = ctx.params;
    try {
      const updatedContent = await strapi.documents("api::h5p-content.h5p-content").update({
        documentId: id,
        data: ctx.request.body
      });
      ctx.body = updatedContent;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async deleteContent(ctx) {
    const { id } = ctx.params;
    try {
      const deletedContent = await strapi.documents("api::h5p-content.h5p-content").delete({
        documentId: id
      });
      ctx.body = deletedContent;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  // Library methods
  async getLibraries(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const libraries = await h5pService.getInstalledLibraries();
      ctx.body = libraries;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getAvailableLibraries(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const libraries = await h5pService.getAvailableLibraries();
      ctx.body = libraries;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async installLibrary(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const { id } = ctx.request.body;
      const result = await h5pService.installLibrary(id);
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getContentTypeCache(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const cache = await h5pService.getContentTypeCache();
      ctx.body = cache;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async updateContentTypeCache(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const cache = await h5pService.updateContentTypeCache();
      ctx.body = cache;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getContentHubMetadataCache(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const cache = await h5pService.getContentHubMetadataCache();
      ctx.body = cache;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async updateContentHubMetadataCache(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const cache = await h5pService.updateContentHubMetadataCache();
      ctx.body = cache;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  // Editor methods
  async getEditorPage(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const html = await h5pService.renderEditor(
        ctx.params.contentId,
        ctx.state?.user
      );
      ctx.type = "text/html";
      ctx.body = html;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getContentParams(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const params = await h5pService.getContentParams(ctx.params.contentId);
      ctx.body = params;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async saveContent(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const result = await h5pService.saveContent(
        ctx.request.body,
        ctx.state?.user
      );
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getLibraryFile(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const file = await h5pService.getLibraryFile(
        ctx.params.ubername,
        ctx.params.file
      );
      ctx.type = file.mimeType;
      ctx.body = file.stream;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getContentFile(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const file = await h5pService.getContentFile(
        ctx.params.contentId,
        ctx.params.file
      );
      ctx.type = file.mimeType;
      ctx.body = file.stream;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getCoreFile(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const file = await h5pService.getCoreFile(
        ctx.params.type,
        ctx.params.file
      );
      ctx.type = file.mimeType;
      ctx.body = file.stream;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getEditorFile(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const file = await h5pService.getEditorFile(
        ctx.params.type,
        ctx.params.file
      );
      ctx.type = file.mimeType;
      ctx.body = file.stream;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getPlayPage(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const html = await h5pService.renderPlayer(ctx.params.contentId);
      ctx.type = "text/html";
      ctx.body = html;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getAjax(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const action = ctx.query.action || ctx.request.body && ctx.request.body.action;
      const result = await h5pService.handleAjax({
        action,
        query: ctx.query,
        user: ctx.state?.user,
        method: ctx.method,
        body: ctx.request.body,
        files: ctx.request.files
      });
      if (result && result.body !== void 0) {
        if (result.contentType) {
          ctx.type = result.contentType;
        }
        if (result.status) {
          ctx.status = result.status;
        }
        ctx.body = result.body;
      } else {
        ctx.body = result;
      }
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  }
});
const controllers = {
  controller
};
const routes = {
  "content-api": {
    type: "content-api",
    routes: [
      {
        method: "GET",
        path: "/contents",
        handler: "controller.findContent",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/contents/:id",
        handler: "controller.findOneContent",
        config: {
          auth: false
        }
      },
      {
        method: "POST",
        path: "/contents",
        handler: "controller.createContent",
        config: {
          auth: false
        }
      },
      {
        method: "PUT",
        path: "/contents/:id",
        handler: "controller.updateContent",
        config: {
          auth: false
        }
      },
      {
        method: "DELETE",
        path: "/contents/:id",
        handler: "controller.deleteContent",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/libraries",
        handler: "controller.getLibraries",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/libraries/available",
        handler: "controller.getAvailableLibraries",
        config: {
          auth: false
        }
      },
      {
        method: "POST",
        path: "/libraries/install",
        handler: "controller.installLibrary",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/ajax",
        handler: "controller.getAjax",
        config: {
          auth: false
        }
      },
      {
        method: "POST",
        path: "/ajax",
        handler: "controller.getAjax",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/editor-page/:contentId",
        handler: "controller.getEditorPage",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/params/:contentId",
        handler: "controller.getContentParams",
        config: {
          auth: false
        }
      },
      {
        method: "POST",
        path: "/save",
        handler: "controller.saveContent",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/libraries/:ubername/:file*",
        handler: "controller.getLibraryFile",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/content/:contentId/:file*",
        handler: "controller.getContentFile",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/core/:type/:file*",
        handler: "controller.getCoreFile",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/editor/:type/:file*",
        handler: "controller.getEditorFile",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/play/:contentId",
        handler: "controller.getPlayPage",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/content-type-cache",
        handler: "controller.getContentTypeCache",
        config: {
          auth: false
        }
      },
      {
        method: "POST",
        path: "/content-type-cache",
        handler: "controller.updateContentTypeCache",
        config: {
          auth: false
        }
      },
      {
        method: "GET",
        path: "/content-hub-metadata-cache",
        handler: "controller.getContentHubMetadataCache",
        config: {
          auth: false
        }
      },
      {
        method: "POST",
        path: "/content-hub-metadata-cache",
        handler: "controller.updateContentHubMetadataCache",
        config: {
          auth: false
        }
      }
    ]
  }
};
const policies = {};
const middlewares = {};
const service = ({ strapi }) => {
  const state = {
    h5pConfig: null,
    h5pEditor: null,
    h5pPlayer: null
  };
  const getConfig = () => {
    if (!state.h5pConfig) {
      throw new Error("H5P config not initialized");
    }
    return state.h5pConfig;
  };
  const getEditor = () => {
    if (!state.h5pEditor) {
      throw new Error("H5P editor not initialized");
    }
    return state.h5pEditor;
  };
  const getPlayer = () => {
    if (!state.h5pPlayer) {
      throw new Error("H5P player not initialized");
    }
    return state.h5pPlayer;
  };
  const resolveUser = (user) => user || {
    id: "anonymous",
    name: "Anonymous",
    email: "anonymous@example.com",
    type: "local"
  };
  const getMimeType = (filePath) => {
    const ext = path__default.default.extname(filePath).toLowerCase();
    switch (ext) {
      case ".js":
        return "application/javascript";
      case ".css":
        return "text/css";
      case ".json":
        return "application/json";
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".gif":
        return "image/gif";
      case ".svg":
        return "image/svg+xml";
      case ".woff":
        return "font/woff";
      case ".woff2":
        return "font/woff2";
      case ".ttf":
        return "font/ttf";
      case ".eot":
        return "application/vnd.ms-fontobject";
      case ".otf":
        return "font/otf";
      case ".mp4":
        return "video/mp4";
      case ".webm":
        return "video/webm";
      case ".ogg":
        return "audio/ogg";
      case ".mp3":
        return "audio/mpeg";
      case ".wav":
        return "audio/wav";
      default:
        return "application/octet-stream";
    }
  };
  return {
    /**
     * H5P Editor and Player Implementation
     * This is a custom implementation to make H5P work with Strapi (Koa)
     */
    async initialize() {
      strapi.log.info("Initializing H5P Editor and Player...");
      const config2 = strapi.config.get("plugin.h5p") || {};
      const pluginConfig = config2.config || {};
      const baseUrl = "/api/h5p";
      const h5pConfig = new h5pServer__namespace.H5PConfig(void 0, {
        baseUrl,
        contentHubEnabled: true
      });
      const libraryPath = path__default.default.join(
        strapi.dirs.static.public,
        pluginConfig.librariesPath || "h5p/libraries"
      );
      const contentPath = path__default.default.join(
        strapi.dirs.static.public,
        pluginConfig.contentPath || "h5p/content"
      );
      const temporaryPath = path__default.default.join(
        strapi.dirs.static.public,
        pluginConfig.temporaryFilesPath || "h5p/temp-files"
      );
      state.h5pConfig = {
        baseUrl,
        editorUrl: `${baseUrl}${h5pConfig.editorLibraryUrl}`,
        coreUrl: `${baseUrl}${h5pConfig.coreUrl}`,
        contentTypeCacheUrl: `${baseUrl}/ajax?action=content-type-cache`,
        contentHubMetadataUrl: `${baseUrl}/ajax?action=content-hub-metadata-cache`,
        contentStorage: {
          libraryPath,
          contentPath,
          temporaryPath
        }
      };
      await fs__default.default.ensureDir(libraryPath);
      await fs__default.default.ensureDir(contentPath);
      await fs__default.default.ensureDir(temporaryPath);
      const cache = new h5pServer__namespace.fsImplementations.InMemoryStorage();
      const libraryStorage = new h5pServer__namespace.fsImplementations.FileLibraryStorage(
        libraryPath
      );
      const contentStorage = new h5pServer__namespace.fsImplementations.FileContentStorage(
        contentPath
      );
      const temporaryStorage = new h5pServer__namespace.fsImplementations.DirectoryTemporaryFileStorage(
        temporaryPath
      );
      state.h5pEditor = new h5pServer__namespace.H5PEditor(
        cache,
        h5pConfig,
        libraryStorage,
        contentStorage,
        temporaryStorage
      );
      state.h5pEditor.setRenderer(
        (model) => renderEditorPage(model, {
          saveEndpoint: `${baseUrl}/save`,
          paramsEndpoint: `${baseUrl}/params`
        })
      );
      state.h5pPlayer = new h5pServer__namespace.H5PPlayer(
        libraryStorage,
        contentStorage,
        h5pConfig
      );
      strapi.log.info("✅ H5P Editor and Player initialized successfully");
    },
    /**
     * Get installed libraries
     */
    async getInstalledLibraries() {
      try {
        const libraries = await getEditor().libraryStorage.getInstalledLibraries();
        return libraries;
      } catch (error) {
        strapi.log.error("Failed to get installed libraries:", error);
        throw error;
      }
    },
    /**
     * Get available libraries from content hub
     */
    async getAvailableLibraries() {
      try {
        const libraries = await getEditor().contentHub.getLibraries();
        return libraries;
      } catch (error) {
        strapi.log.error("Failed to get available libraries:", error);
        throw error;
      }
    },
    /**
     * Install library from content hub
     */
    async installLibrary(libraryId) {
      try {
        const result = await getEditor().contentHub.installLibrary(libraryId);
        return { success: true, result };
      } catch (error) {
        strapi.log.error("Failed to install library:", error);
        throw error;
      }
    },
    /**
     * Get content type cache
     */
    async getContentTypeCache() {
      try {
        const cache = await getEditor().contentTypeCache.get();
        return cache;
      } catch (error) {
        strapi.log.error("Failed to get content type cache:", error);
        throw error;
      }
    },
    /**
     * Update content type cache
     */
    async updateContentTypeCache() {
      try {
        const cache = await getEditor().contentTypeCache.update();
        return cache;
      } catch (error) {
        strapi.log.error("Failed to update content type cache:", error);
        throw error;
      }
    },
    /**
     * Get content hub metadata cache
     */
    async getContentHubMetadataCache() {
      try {
        const cache = await getEditor().contentHubMetadataCache.get();
        return cache;
      } catch (error) {
        strapi.log.error("Failed to get content hub metadata cache:", error);
        throw error;
      }
    },
    /**
     * Update content hub metadata cache
     */
    async updateContentHubMetadataCache() {
      try {
        const cache = await getEditor().contentHubMetadataCache.update();
        return cache;
      } catch (error) {
        strapi.log.error("Failed to update content hub metadata cache:", error);
        throw error;
      }
    },
    /**
     * Handle H5P AJAX requests
     */
    async handleAjax({ action, query, user, method, body, files }) {
      try {
        const actionValue = Array.isArray(action) ? action[0] : action || "";
        const resolvedUser = resolveUser(user ?? void 0);
        const ajaxEndpoint = new h5pServer__namespace.H5PAjaxEndpoint(getEditor());
        const language = query?.language;
        const resolvedMethod = (method || "GET").toUpperCase();
        const postActions = /* @__PURE__ */ new Set([
          "translations",
          "files",
          "filter",
          "library-install",
          "library-upload",
          "get-content"
        ]);
        const shouldPost = resolvedMethod === "POST" || postActions.has(actionValue);
        if (shouldPost) {
          const id = query?.id;
          const hubId = query?.hubId;
          const translate = (stringId, replacements) => {
            if (!replacements) {
              return stringId;
            }
            return Object.keys(replacements).reduce(
              (text, key) => text.split(`:${key}`).join(String(replacements[key])),
              stringId
            );
          };
          const normalizeFile = (file) => {
            if (!file) {
              return void 0;
            }
            const actual = Array.isArray(file) ? file[0] : file;
            if (!actual) {
              return void 0;
            }
            return {
              data: actual.buffer,
              mimetype: actual.type || actual.mimetype,
              name: actual.name || actual.originalFilename || actual.filename,
              size: actual.size,
              tempFilePath: actual.path || actual.filepath || actual.tempFilePath
            };
          };
          const filesFile = normalizeFile(files?.file);
          const libraryUploadFile = normalizeFile(files?.h5p);
          return await ajaxEndpoint.postAjax(
            actionValue,
            body,
            language,
            resolvedUser,
            filesFile,
            id,
            translate,
            libraryUploadFile,
            hubId
          );
        }
        return await ajaxEndpoint.getAjax(
          actionValue,
          query?.machineName,
          query?.majorVersion,
          query?.minorVersion,
          language,
          resolvedUser
        );
      } catch (error) {
        strapi.log.error("Failed to handle H5P AJAX request:", error);
        throw error;
      }
    },
    /**
     * Get content parameters
     */
    async getContentParams(contentId) {
      try {
        const params = await getEditor().contentStorage.get(contentId);
        return params;
      } catch (error) {
        strapi.log.error(`Failed to get content params for ${contentId}:`, error);
        throw error;
      }
    },
    /**
     * Save content
     */
    async saveContent(contentData, user) {
      try {
        let safeJsonParse = function(value) {
          if (typeof value !== "string") {
            return value;
          }
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        };
        const parsedContentData = typeof contentData === "string" ? safeJsonParse(contentData) : contentData;
        const payload = parsedContentData && typeof parsedContentData === "object" && "data" in parsedContentData ? parsedContentData.data : parsedContentData;
        const parseJson = (value) => {
          if (typeof value !== "string") {
            return value;
          }
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        };
        const buildLibrary = (input) => {
          if (!input?.machineName)
            return void 0;
          if (typeof input.majorVersion !== "number" || typeof input.minorVersion !== "number") {
            return void 0;
          }
          return `${input.machineName} ${input.majorVersion}.${input.minorVersion}`;
        };
        const resolveLibrary = () => {
          if (typeof payload?.library === "string")
            return payload.library;
          if (typeof payload?.mainLibrary === "string")
            return payload.mainLibrary;
          const libraryFromObject = buildLibrary(payload?.library);
          if (libraryFromObject)
            return libraryFromObject;
          const mainLibraryFromObject = buildLibrary(payload?.mainLibrary);
          if (mainLibraryFromObject)
            return mainLibraryFromObject;
          if (typeof payload?.ubername === "string")
            return payload.ubername;
          if (typeof payload?.libraryName === "string")
            return payload.libraryName;
          const params2 = parseJson(payload?.params);
          if (params2 && typeof params2.library === "string")
            return params2.library;
          if (params2 && typeof params2.mainLibrary === "string")
            return params2.mainLibrary;
          if (params2?.params && typeof params2.params.library === "string") {
            return params2.params.library;
          }
          if (params2?.params && typeof params2.params.mainLibrary === "string") {
            return params2.params.mainLibrary;
          }
          return void 0;
        };
        const parsedParams = parseJson(payload?.params);
        const parsedMetadata = parseJson(payload?.metadata);
        const paramsContainer = parsedParams?.params ? parsedParams : void 0;
        const normalizeLibrary = (value) => {
          if (!value)
            return value;
          const match = /^([\w.]+)-(\d+\.\d+)$/.exec(value);
          if (match) {
            return `${match[1]} ${match[2]}`;
          }
          return value;
        };
        const library = normalizeLibrary(resolveLibrary());
        if (!library) {
          strapi.log.error("Failed to save content: missing library", {
            keys: Object.keys(contentData || {})
          });
          throw new Error("missing-library");
        }
        const params = paramsContainer?.params ?? parsedParams;
        const rawMetadata = parsedMetadata ?? paramsContainer?.metadata;
        const fallbackTitle = rawMetadata?.title ?? paramsContainer?.metadata?.title ?? parsedParams?.metadata?.title ?? parsedParams?.title ?? payload?.title ?? "Untitled";
        const metadata = {
          title: fallbackTitle
        };
        if (typeof rawMetadata?.language === "string") {
          if (/^[-a-zA-Z]{1,10}$/.test(rawMetadata.language)) {
            metadata.language = rawMetadata.language;
          }
        }
        const resolvedUser = resolveUser(user ?? void 0);
        const contentId = await getEditor().saveOrUpdateContent(
          payload?.contentId ?? void 0,
          params,
          metadata,
          library,
          resolvedUser
        );
        return { id: contentId };
      } catch (error) {
        strapi.log.error("Failed to save content:", error);
        throw error;
      }
    },
    /**
     * Get library file
     */
    async getLibraryFile(ubername, file) {
      try {
        const h5pConfig = getConfig();
        const filePath = path__default.default.join(
          h5pConfig.contentStorage.libraryPath,
          ubername,
          file
        );
        if (!fs__default.default.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        const mimeType = getMimeType(filePath);
        const stream = fs__default.default.createReadStream(filePath);
        return { stream, mimeType };
      } catch (error) {
        strapi.log.error("Failed to get library file:", error);
        throw error;
      }
    },
    /**
     * Get content file
     */
    async getContentFile(contentId, file) {
      try {
        const h5pConfig = getConfig();
        const filePath = path__default.default.join(
          h5pConfig.contentStorage.contentPath,
          contentId,
          file
        );
        if (!fs__default.default.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        const mimeType = getMimeType(filePath);
        const stream = fs__default.default.createReadStream(filePath);
        return { stream, mimeType };
      } catch (error) {
        strapi.log.error("Failed to get content file:", error);
        throw error;
      }
    },
    /**
     * Get core file
     */
    async getCoreFile(type, file) {
      try {
        const h5pConfig = getConfig();
        const filePath = path__default.default.join(
          h5pConfig.contentStorage.libraryPath,
          "core",
          type,
          file
        );
        if (!fs__default.default.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        const mimeType = getMimeType(filePath);
        const stream = fs__default.default.createReadStream(filePath);
        return { stream, mimeType };
      } catch (error) {
        strapi.log.error("Failed to get core file:", error);
        throw error;
      }
    },
    /**
     * Get editor file
     */
    async getEditorFile(type, file) {
      try {
        const h5pConfig = getConfig();
        const filePath = path__default.default.join(
          h5pConfig.contentStorage.libraryPath,
          "editor",
          type,
          file
        );
        if (!fs__default.default.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        const mimeType = getMimeType(filePath);
        const stream = fs__default.default.createReadStream(filePath);
        return { stream, mimeType };
      } catch (error) {
        strapi.log.error("Failed to get editor file:", error);
        throw error;
      }
    },
    /**
     * Render H5P player
     */
    async renderPlayer(contentId) {
      try {
        return await getPlayer().render(contentId);
      } catch (error) {
        strapi.log.error(`Failed to render H5P player for ${contentId}:`, error);
        throw error;
      }
    },
    /**
     * Render H5P editor
     */
    async renderEditor(contentId, user) {
      try {
        const editorContentId = contentId === "new" ? null : contentId;
        const resolvedUser = resolveUser(user ?? void 0);
        return await getEditor().render(editorContentId, "en", resolvedUser);
      } catch (error) {
        strapi.log.error("Failed to render H5P editor:", error);
        throw error;
      }
    },
    /**
     * Read file from filesystem
     */
    async readFile(filePath) {
      try {
        return await fs__default.default.readFile(filePath);
      } catch (error) {
        strapi.log.error(`Failed to read file ${filePath}:`, error);
        throw error;
      }
    },
    /**
     * Download and install libraries from H5P Hub
     */
    async downloadLibraries() {
      try {
        strapi.log.info("Downloading H5P libraries...");
        const essentialLibraries = /* @__PURE__ */ new Set([
          "H5P.MultiChoice",
          "H5P.QuestionSet",
          "H5P.InteractiveVideo",
          "H5P.CoursePresentation",
          "H5P.DragQuestion",
          "H5P.Blanks",
          "H5P.TrueFalse"
        ]);
        const availableLibraries = await getEditor().contentHub.getLibraries();
        const librariesToDownload = availableLibraries.filter(
          (lib) => essentialLibraries.has(lib.machineName)
        );
        strapi.log.info(
          `Found ${librariesToDownload.length} essential libraries to download`
        );
        for (const lib of librariesToDownload) {
          try {
            strapi.log.info(`Downloading ${lib.machineName}...`);
            await getEditor().contentHub.installLibrary(lib.id);
            strapi.log.info(`✅ Installed ${lib.machineName}`);
          } catch (error) {
            strapi.log.error(`Failed to install ${lib.machineName}:`, error);
          }
        }
        strapi.log.info("✅ H5P libraries download completed");
        return { success: true, count: librariesToDownload.length };
      } catch (error) {
        strapi.log.error("Failed to download H5P libraries:", error);
        throw error;
      }
    },
    /**
     * Install H5P libraries from a ZIP file
     */
    async installFromZip(zipFilePath) {
      try {
        strapi.log.info(`Installing H5P libraries from ${zipFilePath}...`);
        if (!fs__default.default.existsSync(zipFilePath)) {
          throw new Error(`ZIP file not found: ${zipFilePath}`);
        }
        const zip = new AdmZip(zipFilePath);
        const zipEntries = zip.getEntries();
        const tempDir = path__default.default.join(
          getConfig().contentStorage.temporaryPath,
          `h5p-lib-${Date.now()}`
        );
        await fs__default.default.ensureDir(tempDir);
        zip.extractAllTo(tempDir, true);
        const isLibrary = zipEntries.some(
          (entry) => entry.entryName.endsWith("library.json")
        );
        if (isLibrary) {
          const result = await getEditor().libraryStorage.addLibraryFromDirectory(
            tempDir
          );
          strapi.log.info("✅ Library installed successfully");
          return { success: true, result };
        } else {
          const result = await getEditor().contentStorage.addContentFromDirectory(
            tempDir
          );
          strapi.log.info("✅ Content installed successfully");
          return { success: true, result };
        }
      } catch (error) {
        strapi.log.error("Failed to install from ZIP:", error);
        throw error;
      }
    },
    getMimeType
  };
};
const services = {
  service
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes: {},
  // Disabled - using content-type from src/api/h5p-content
  policies,
  middlewares
};
module.exports = index;
//# sourceMappingURL=index.js.map
