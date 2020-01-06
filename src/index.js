const amf = require('amf-client-js')
const path = require('path')
const fs = require('fs-extra')
const jsonld = require('jsonld')

const utils = require('./utils')
const collect = require('./data_collectors')

/** Mustache dialects templates directory path. */
let TMPL_DIR = path.join(utils.TMPL_DIR)

/** Runs all the logic. */
async function main () {
  const program = utils.defineAndParseArgv()
  let ctx = utils.getDefaultContext()
  await amf.AMF.init()

  // Ensure output directory exists
  const outDir = path.resolve(program.outputDir)
  fs.emptyDirSync(outDir)

  // Add custom configuration elements
  if (program.cfg) {
    ctx = utils.loadConfig(program.cfg, ctx)
  }

  // Check if we have download links to generate
  const downloadLinks = ctx.config.downloadLinks || {}
  // links for the index page
  const indexLinks = {
    indexLinks: (ctx.config.indexDownloadLinks || []).sort(utils.sorterBy('text'))
  }
  indexLinks.hasIndexLinks = (indexLinks.indexLinks.length > 0)

  // Collects dialects data into an array
  const dialectsPaths = program.indir
    ? utils.walkSync(program.indir)
    : program.infile

  const acc = {}
  const ontology = {}
  const jsonGraph = {}

  // Let's load the  JSON-LD
  for (var i = 0; i < dialectsPaths.length; i++) {
    const p = dialectsPaths[i]
    try {
      const defaultGraph = await utils.getJsonLdGraph(p)
      console.log('[ok] ' + p)
      const graph = await jsonld.expand(defaultGraph)
      jsonGraph[p] = graph
    } catch (e) {
      console.log('[error] ' + p)
    }
  }
  console.log('Processed all input files')

  // let's process the vocabularies
  for (var p in jsonGraph) {
    const graph = jsonGraph[p]
    try {
      console.log(`Collecting vocabulary data: ${p}`)
      collect.processVocabulary(graph, ctx, ontology)
    } catch (e) {
      console.error(`Error for vocabulary ${p}: ${e.message}`)
      console.error(e)
    }
  }
  const ontologyTerms = {}
  Object.values(ontology).forEach(function (vocab) {
    vocab.nodeMappings.forEach(function (term) {
      ontologyTerms[term.id] = term
    })
  })

  // Let's process the dialects
  for (p in jsonGraph) {
    const graph = jsonGraph[p]
    try {
      console.log(`Collecting dialect data: ${p}`)
      collect.processDialect(graph, ctx, acc, ontologyTerms)
    } catch (e) {
      console.error(`Error for dialect ${p}: ${e.message}`)
      console.error(e)
    }
  }

  console.log(`Got ${Object.values(acc).length} values`)
  const dialectsData = Object.values(acc).sort(utils.nameSorter)

  const commonNavData = collect.commonNavData(dialectsData, ctx)

  // Collect navigation data and render dialect template
  dialectsData.forEach(dialectData => {
    const links = utils.processLinks(downloadLinks[dialectData.id] || [])

    dialectData.navData = collect.navData(dialectData, commonNavData, ctx)
    dialectData.css = program.css
    if (program.templates != null) {
      TMPL_DIR = program.templates
    }

    // Render dialect overview template
    utils.renderTemplate(
      { ...dialectData, ...ctx.config, ...links },
      path.join(TMPL_DIR, 'dialect.mustache'),
      path.join(outDir, dialectData.htmlName))

    // Render nodeMappings item data
    dialectData.nodeMappings.forEach(nodeData => {
      nodeData.navData = dialectData.navData
      nodeData.navData.nodeMappings = utils.markActive(
        nodeData.navData.nodeMappings, nodeData.name)

      nodeData.css = program.css
      utils.renderTemplate(
        { ...nodeData, ...ctx.config },
        path.join(TMPL_DIR, 'node.mustache'),
        path.join(outDir, nodeData.htmlName))
    })
  })

  // Render index page
  utils.renderTemplate(
    {
      css: program.css,
      dialects: dialectsData,
      navData: {
        dialects: utils.markActive(commonNavData.dialects)
      },
      ...ctx.config,
      ...indexLinks
    },
    path.join(TMPL_DIR, 'index.mustache'),
    path.join(outDir, 'index.html'))

  utils.copyStaticFiles(outDir)
}

main()
