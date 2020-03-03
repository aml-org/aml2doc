#!/usr/bin/env node

const program = require('commander')

const aml2doc = require('../src/index')
const utils = require('../src/utils')

program
  .arguments('<outputDir>')
  .action(outputDir => {
    program.outputDir = outputDir
  })
  .name('aml2doc')
  .description('Convert AML Vocabularies & Dialects to documentation.')
  .option('-d, --indir <path>', 'Path to input directory to convert. Takes precedence over --infile.')
  .option('-f, --infile <path>', 'Path to input file to convert', utils.collectOpt, [])
  .option('-s, --syntax <name>', 'Output syntax (html or md)', 'html')
  .option('-c, --css <path>', 'Custom css file path', utils.collectOpt, [])
  .option('-g, --cfg <path>', 'Configuration file path')
  .option('-t, --templates <path>', 'Optional path to custom templates for the documentation')
  .parse(process.argv)

if (!program.outputDir) {
  console.error('Missing output directory path (outputDir).\n')
  program.help()
}
if (!(program.infile.length > 0 || program.indir)) {
  console.error('Missing input (--infile or --indir).\n')
  program.help()
}

aml2doc(program)
