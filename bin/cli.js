const fs = require('fs')
const path = require('path')
const shush = require('shush')
const JsonLdWritable = require('../lib/JsonLdWritable')
const ScopeToJson = require('../lib/ScopeToJsonStream')

let program = require('commander')

program
  .usage('[options] <files>')
  .option('-c, --context <contextFile>', 'JSON-LD context file')
  .option('-p, --properties <mapFile>', 'ElementId to property mapping file')
  .parse(process.argv)

program.args.forEach((file) => {
  let options = {}

  process.stderr.write('parse scope file: ' + file + '\n')

  if (program.context) {
    options.context = shush(path.resolve(program.context))
  }

  if (program.properties) {
    options.properties = shush(path.resolve(program.properties))
  }

  let scopeStream = new ScopeToJson({
    properties: options.properties
  })

  let jsonStream = new JsonLdWritable(options.context)

  fs.createReadStream(file)
    .pipe(scopeStream)
    .pipe(jsonStream)
    .pipe(process.stdout)
})
