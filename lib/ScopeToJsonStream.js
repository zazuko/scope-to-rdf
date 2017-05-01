const Duplex = require('stream').Duplex
const SAXStream = require('sax').SAXStream

class ScopeToJsonStream extends Duplex {
  constructor (options) {
    super({
      readableObjectMode: true
    })

    options = options || {}

    this.properties = options.properties
    this.tags = []
    this.records = []
    this.sax = new SAXStream(true)

    this.sax.on('opentag', (node) => {
      // add node to tag stack
      this.tags.unshift(node)

      this.processRecordStart(node)
      this.processValueStart(node)
    })

    this.sax.on('text', (text) => {
      this.processValue(text)
    })

    this.sax.on('closetag', () => {
      this.processValuesEnd()
      this.processRecordEnd()

      // remove node from tag stack
      this.tags.shift()

      // close the stream after closing the root element
      if (this.tags.length === 0) {
        this.push(null)
      }
    })
  }

  _write (chunk, encoding, callback) {
    this.sax.write(chunk)

    callback()
  }

  _read () {}

  /**
   * Searches for an element with a specific name, starting with the current node, up the tree
   * @param name element name
   * @returns {*} the node or null
   */
  findNode (name) {
    for (let i = 0; i < this.tags.length; i++) {
      if (this.tags[i].name === name) {
        return this.tags[i]
      }
    }

    return null
  }

  /**
   * Returns the property name for the current node
   * @returns {*} the property or null
   */
  elementProperty () {
    let dataElement = this.findNode('DataElement')

    if (!dataElement) {
      return null
    }

    // use ElementId as property if no property map is given
    if (!this.properties) {
      return dataElement.attributes.ElementId
    }

    // use properties option to map ElementId to property
    if (dataElement.attributes.ElementId in this.properties) {
      return this.properties[dataElement.attributes.ElementId]
    }

    return null
  }

  /**
   * Add a new record to the stack including all attributes
   * @param node current node
   */
  processRecordStart (node) {
    if (node.name === 'Record') {
      let record = {
        '@id': node.attributes.Id,
        name: node.attributes.IdName,
        parent: node.attributes.ParentId
      }

      this.records.unshift(record)
    }
  }

  /**
   * Add an array item for each element value
   * @param node current node
   */
  processValueStart (node) {
    if (node.name === 'ElementValue') {
      let property = this.elementProperty()

      if (property) {
        this.records[0][property] = this.records[0][property] || []
        this.records[0][property].push(null)
      }
    }
  }

  /**
   * Add the value to the values array
   * @param text current text
   */
  processValue (text) {
    // find the current property
    let property = this.elementProperty()

    if (!property) {
      return
    }

    let elementId = this.findNode('DataElement').attributes.ElementId

    // values for the current property
    let values = this.records[0][property]

    if (this.tags[0].name === 'TextValue') {
      values[values.length - 1] = text
    } else if (this.tags[0].name === 'FromDate') {
      values[values.length - 1] = values[values.length - 1] || {}
      values[values.length - 1].from = text
    } else if (this.tags[0].name === 'ToDate') {
      values[values.length - 1] = values[values.length - 1] || {}
      values[values.length - 1].to = text
    }
  }

  /**
   * Remove all null values and property if there are no values at all
   */
  processValuesEnd () {
    if (this.tags[0].name === 'DataElement') {
      let property = this.elementProperty()

      if (property) {
        this.records[0][property] = this.records[0][property].filter((value) => {
          return value
        })

        if (this.records[0][property].length === 0) {
          delete this.records[0][property]
        }
      }
    }
  }

  /**
   * Forward the record at the end of the record element
   */
  processRecordEnd () {
    if (this.tags[0].name === 'Record') {
      let record = this.records.shift()

      this.push(record)
    }
  }
}

module.exports = ScopeToJsonStream
