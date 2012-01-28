
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , join = path.join
  , dirname = path.dirname
  , exists = fs.existsSync || path.existsSync
  , defaults = {
        compiled: 'compiled'
      , platform: process.platform
      , arch: process.arch
      , version: parseFloat(process.versions.node).toString()
      , bindings: 'bindings.node'
    }

/**
 * The main `bindings()` function loads the compiled bindings for a given module.
 * It uses V8's Error API to determine the parent filename that this function is
 * being invoked from, which is then used to find the root directory.
 */

function bindings (opts) {

  // Argument surgery
  if (typeof opts == 'string') {
    opts = { bindings: opts }
  } else if (!opts) {
    opts = {}
  }
  opts.__proto__ = defaults

  // Get the module root
  opts.module_root = exports.getRoot(exports.getFileName())

  var tries = []
    , i = 0
    , l = exports.try.length
    , n

  for (; i<l; i++) {
    n = join.apply(null, exports.try[i].map(function (p) {
      return opts[p] || p
    }))
    tries.push(n)
    try {
      var b = require(n)
      b.path = n
      return b
    } catch (e) {
      if (!/not find/i.test(e.message)) {
        throw e
      }
    }
  }

  throw new Error('Could not load the bindings file. Tried:\n' +
      tries.map(function (a) { return '  - ' + a }).join('\n'))
}
module.exports = exports = bindings;

exports.try = [
    // Debug files, for development
    [ 'module_root', 'out', 'Debug', 'bindings' ]
  , [ 'module_root', 'Debug', 'bindings' ]
    // Release files, but manually compiled
  , [ 'module_root', 'out', 'Release', 'bindings' ]
  , [ 'module_root', 'Release', 'bindings' ]
    // Production "Release" buildtype binary
  , [ 'module_root', 'compiled', 'platform', 'arch', 'version', 'bindings' ]
]

/**
 * Gets the filename of the JavaScript file that invokes this function.
 * Used to help find the root directory of a module.
 */

exports.getFileName = function getFileName () {
  var origPST = Error.prepareStackTrace
    , dummy = {}
    , fileName

  Error.prepareStackTrace = function (e, st) {
    for (var i=0, l=st.length; i<l; i++) {
      fileName = st[i].getFileName()
      if (fileName !== __filename) {
        return
      }
    }
  }

  // run the 'prepareStackTrace' function above
  Error.captureStackTrace(dummy)
  dummy.stack

  // cleanup
  Error.prepareStackTrace = origPST

  return fileName
}

/**
 * Gets the root directory of a module, given an arbitrary filename
 * somewhere in the module tree. The "root directory" is the directory
 * containing the `package.json` file.
 *
 *   In:  /home/nate/node-native-module/lib/index.js
 *   Out: /home/nate/node-native-module
 */

exports.getRoot = function getRoot (file) {
  var dir = dirname(file)
    , prev
  while (true) {
    if (exists(join(dir, 'package.json'))) {
      return dir
    }
    if (prev === dir) {
      // Got to the top
      throw new Error('Could not find module root given file: ' + file)
    }
    prev = dir
    dir = join(dir, '..')
  }
}
