exports.toArray = function (value) {
    return !value || Array.isArray(value) ? value : [value];
}

exports.ofType = function (value) {
    return Object.prototype.toString.call(value)
}

exports.formatSize = function (size) {
    if (isNaN(size)) return ''
    size = Number(size)
    if (size < 1024) {
      return size.toFixed(0) + 'bytes'
    } else if (size < 1024 * 1024) {
      return (size / 1024.0).toFixed(0) + 'Kb'
    } else if (size < 1024 * 1024 * 1024) {
      return (size / 1024.0 / 1024.0).toFixed(1) + 'Mb'
    } else {
      return (size / 1024.0 / 1024.0 / 1024.0).toFixed(1) + 'Gb'
    }
}