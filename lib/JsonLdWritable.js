const Duplex = require('stream').Duplex
const JSONStream = require('JSONStream')

class JsonLdWritable extends Duplex {
  constructor (context) {
    super({
      writableObjectMode: true
    })

    const start = '{\n"@context":' + JSON.stringify(context) + ',\n"@graph": [\n'
    const seperator = ',\n'
    const end =  '\n]}\n'

    this.stream = JSONStream.stringify(start, seperator, end)

    this.on('finish', () => {
      this.stream.end()
    })

    this.stream.on('error', (err) => {
      this.emit('error', err)
    })

    this.stream.on('data', (data) => {
      this.push(data)
    })
  }

  _write (chunk, encoding, callback) {
    this.stream.write(chunk)

    callback()
  }

  _read () {}
}

module.exports = JsonLdWritable
