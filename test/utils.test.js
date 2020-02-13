/* global describe, it, beforeEach, afterEach, context */

const expect = require('chai').expect
const tmp = require('tmp')
const path = require('path')
const fs = require('fs-extra')
const rewire = require('rewire')
const amf = require('amf-client-js')

const utils = rewire('../src/utils')

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

describe('utils.collectOpt', function () {
  const collectOpt = utils.__get__('collectOpt')
  it('should concat options strings', function () {
    expect(collectOpt('b', '')).to.deep.equal('b')
    expect(collectOpt('b', 'a')).to.deep.equal('ab')
    expect(collectOpt('bc', 'a')).to.deep.equal('abc')
  })
})

describe('utils.walkSync', function () {
  const walkSync = utils.__get__('walkSync')
  let tmpDir1, tmpDir2, tmpFile1, tmpFile2, tmpFile3
  beforeEach(function () {
    tmpDir1 = tmp.dirSync()
    tmpDir2 = tmp.dirSync({ dir: tmpDir1.name })
    tmpFile1 = tmp.fileSync({ dir: tmpDir2.name, postfix: '.xml' })
    tmpFile2 = tmp.fileSync({ dir: tmpDir2.name, postfix: '.yaml' })
    tmpFile3 = tmp.fileSync({ dir: tmpDir1.name, postfix: '.yaml' })
  })
  afterEach(function () {
    tmp.setGracefulCleanup()
    tmpFile1.removeCallback()
    tmpFile2.removeCallback()
    tmpDir2.removeCallback()
    tmpFile3.removeCallback()
    tmpDir1.removeCallback()
  })
  it('should list yaml files in nested directories', function () {
    const data = walkSync(tmpDir1.name)
    expect(data).to.be.lengthOf(2)
    expect(data).to.be.contain(tmpFile2.name)
    expect(data).to.be.contain(tmpFile3.name)
  })
  it('should append found files names to passed list', function () {
    const data = walkSync(tmpDir1.name, ['foo'])
    expect(data).to.be.lengthOf(3)
    expect(data).to.be.contain('foo')
    expect(data).to.be.contain(tmpFile2.name)
    expect(data).to.be.contain(tmpFile3.name)
  })
})

describe('utils.processLinks', function () {
  const processLinks = utils.__get__('processLinks')
  it('should sort and group primary and secondary links', function () {
    const links = [
      { position: 'primary', text: 'b' },
      { position: 'primary', text: 'a' },
      { position: 'secondary', text: 'c' },
      { position: 'secondary', text: 'b' },
      { position: 'other', text: 'd' }
    ]
    expect(processLinks(links)).to.deep.equal({
      hasPrimaryLinks: true,
      primaryLinks: [
        { position: 'primary', text: 'a' },
        { position: 'primary', text: 'b' }
      ],
      hasSecondaryLinks: true,
      secondaryLinks: [
        { position: 'secondary', text: 'b' },
        { position: 'secondary', text: 'c' },
        { position: 'other', text: 'd' }
      ]
    })
  })
  context('when no links are passed', function () {
    it('should return object with falsy values', function () {
      expect(processLinks([])).to.deep.equal({
        hasPrimaryLinks: false,
        hasSecondaryLinks: false
      })
    })
  })
  context('when only primary links are present', function () {
    it('should specify that secondary links are missing', function () {
      const links = [
        { position: 'primary', text: 'b' },
        { position: 'primary', text: 'a' }
      ]
      expect(processLinks(links)).to.deep.equal({
        hasPrimaryLinks: true,
        primaryLinks: [
          { position: 'primary', text: 'a' },
          { position: 'primary', text: 'b' }
        ],
        hasSecondaryLinks: false
      })
    })
  })
  context('when only secondary links are present', function () {
    it('should specify that primary links are missing', function () {
      const links = [
        { position: 'secondary', text: 'b' },
        { position: 'secondary', text: 'a' }
      ]
      expect(processLinks(links)).to.deep.equal({
        hasPrimaryLinks: false,
        secondaryLinks: [
          { position: 'secondary', text: 'a' },
          { position: 'secondary', text: 'b' }
        ],
        hasSecondaryLinks: true
      })
    })
  })
})

describe('utils.loadConfig', function () {
  const loadConfig = utils.__get__('loadConfig')
  it('should load config', function () {
    const fpath = path.join(FIXTURES_DIR, 'cfg.js')
    const ctx = loadConfig(fpath, { foo: 1 })
    expect(ctx).to.have.property('foo', 1)
    expect(ctx).to.have.property('config')
    expect(ctx.config).to.not.have.property('something')
    expect(ctx.config)
      .to.have.property('idMapping').and
      .be.a('function')
    expect(ctx.config)
      .to.have.property('labelMapping').and
      .be.a('function')
    expect(ctx.config).to.include({
      dialectsHeader: 'My label for dialects',
      schemasHeader: 'My label for schemas',
      indexHeader: 'My dialects',
      indexVersion: 'Version 1.0',
      indexDescription: 'My first list of dialects'
    })
    expect(ctx.config)
      .to.have.property('downloadLinks').and
      .deep.equal([
        { href: 'hi://test.com/dialect.pdf', text: 'pdf', position: 'primary' },
        { href: 'hi://test.com/dialect.txt', text: 'txt', position: 'primary' },
        { href: 'hi://test.else/dialect.aml', text: 'aml', position: 'secondary' }
      ])
    expect(ctx.config)
      .to.have.property('indexDownloadLinks').and
      .deep.equal([
        { href: 'hi://test.com/vocabulary.pdf', text: 'pdf' },
        { href: 'hi://test.com/vocabulary.txt', text: 'txt' },
        { href: 'hi://test.else/vocabulary.aml', text: 'aml' }
      ])
  })
})

describe('utils.getDefaultContext', function () {
  const getDefaultContext = utils.__get__('getDefaultContext')
  it('should return default context', function () {
    const ctx = getDefaultContext()
    expect(ctx).to.include({
      amldoc: 'http://a.ml/vocabularies/document#',
      amlcore: 'http://a.ml/vocabularies/core#',
      amlmeta: 'http://a.ml/vocabularies/meta#',
      owl: 'http://www.w3.org/2002/07/owl#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      shacl: 'http://www.w3.org/ns/shacl#'
    })
    expect(ctx).to.have.property('config')
    expect(ctx.config)
      .to.have.property('idMapping').and
      .be.a('function')
    expect(ctx.config)
      .to.have.property('labelMapping').and
      .be.a('function')
    expect(ctx.config).to.include({
      dialectsHeader: 'Dialects',
      schemasHeader: 'Schemas',
      mainHeader: 'Main'
    })
  })
})

describe('utils.markActive', function () {
  const markActive = utils.__get__('markActive')
  it('should activate items if name matches and deact if it doesnt', function () {
    const items = markActive([
      { name: 'cat', active: false },
      { name: 'dog', active: false },
      { name: 'banana', active: true }
    ], 'cat')
    expect(items).to.deep.equal([
      { name: 'cat', active: true },
      { name: 'dog', active: false },
      { name: 'banana', active: false }
    ])
  })
})

describe('utils.makeSchemaHtmlName', function () {
  const makeSchemaHtmlName = utils.__get__('makeSchemaHtmlName')
  it('should compose schema html page name', function () {
    expect(makeSchemaHtmlName('dialect1', 'schema1')).to.equal(
      'schema_dialect1_schema1.html')
  })
})

describe('utils.slugify', function () {
  const slugify = utils.__get__('slugify')
  it('should slugify names', function () {
    expect(slugify('John Doe 2nd')).to.equal('johndoe2nd')
  })
})

describe('utils.sorterBy', function () {
  const sorterBy = utils.__get__('sorterBy')
  it('should be used to sort objects by a property', function () {
    const inp = [
      { name: 'bravo', age: 2 },
      { name: 'alpha', age: 3 },
      { name: 'charlie', age: 1 }
    ]
    expect(inp.sort(sorterBy('name'))).to.deep.equal([
      { name: 'alpha', age: 3 },
      { name: 'bravo', age: 2 },
      { name: 'charlie', age: 1 }
    ])
    expect(inp.sort(sorterBy('age'))).to.deep.equal([
      { name: 'charlie', age: 1 },
      { name: 'bravo', age: 2 },
      { name: 'alpha', age: 3 }
    ])
  })
})

describe('utils.renderTemplate', function () {
  const htmlPath = path.join(FIXTURES_DIR, 'test.html')
  const renderTemplate = utils.__get__('renderTemplate')
  afterEach(function () {
    try { fs.removeSync(htmlPath) } catch (e) {}
  })
  it('should render mustache template to a file', function () {
    const tmplPath = path.join(FIXTURES_DIR, 'test.mustache')
    renderTemplate({ foo: 'hello', bar: 1 }, tmplPath, htmlPath)
    const cont = fs.readFileSync(htmlPath).toString()
    expect(cont).to.equal('hello: 1')
  })
})

describe('utils.parseHashValue', function () {
  const parseHashValue = utils.__get__('parseHashValue')
  it('should parse hash value from AMF id string', function () {
    const id = 'file://test_data/amf/dialects/canonical_webapi.yaml#/declarations/ArrayShape'
    expect(parseHashValue(id)).to.equal('ArrayShape')
  })
})

describe('utils.removeDuplicatesById', function () {
  const removeDuplicatesById = utils.__get__('removeDuplicatesById')
  it('should remove items with a duplicate ID', function () {
    const items = [
      { id: 'cat', age: 3 },
      { id: 'dog', age: 5 },
      { id: 'banana', age: 1 },
      { id: 'banana', age: 6 }
    ]
    expect(removeDuplicatesById(items)).to.deep.equal([
      { id: 'cat', age: 3 },
      { id: 'dog', age: 5 },
      { id: 'banana', age: 6 }
    ])
  })
})

describe('utils.copyStaticFiles', function () {
  const outDir = path.join(FIXTURES_DIR, 'test')
  const copyStaticFiles = utils.__get__('copyStaticFiles')
  afterEach(function () {
    try { fs.removeSync(outDir) } catch (e) {}
  })
  it('should copy static files to a target folder', function () {
    copyStaticFiles(outDir)
    const staticFiles = [
      path.join(outDir, 'static', 'css', 'bootstrap.min.css'),
      path.join(outDir, 'static', 'css', 'custom.css')
    ]
    staticFiles.forEach(fpath => {
      return expect(fs.existsSync(fpath)).to.be.true
    })
  })
})

describe('utils.getJsonLdGraph', function () {
  beforeEach(async function () {
    await amf.AMF.init()
  })
  const getJsonLdGraph = utils.__get__('getJsonLdGraph')
  it('should parse AML file and return JS object with its graph', async function () {
    const fpath = `file://${path.join(FIXTURES_DIR, 'musicVocabulary.yaml')}`
    const graph = await getJsonLdGraph(fpath)
    expect(graph).to.be.an('array')
    expect(graph).to.be.lengthOf(1)
    expect(graph[0]).to.have.property('@id')
    expect(graph[0]).to.have.property('@type')
  })
})

describe('utils.collectJsonGraphs', function () {
  const collectJsonGraphs = utils.__get__('collectJsonGraphs')
  it('should collect JSON Graphs for all dialects from dialectsPaths', async function () {
    const fpath = `file://${path.join(FIXTURES_DIR, 'musicDialect.yaml')}`
    const dialectsPaths = [fpath]
    const data = await collectJsonGraphs(dialectsPaths)
    expect(Object.keys(data)).to.be.lengthOf(dialectsPaths.length)
    expect(data)
      .to.have.property(fpath).and
      .be.an('array').and
      .be.lengthOf(1)
    expect(data[fpath][0]).to.have.property('@id', fpath)
  })
})

describe('utils.getOntologyTerms', function () {
  const getOntologyTerms = utils.__get__('getOntologyTerms')
  it('should extract ontology terms from ontology mapping', function () {
    const ontologyObj = {
      vocab1: {
        nodeMappings: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' }
        ]
      },
      vocab2: {
        nodeMappings: [
          { id: 'c', name: 'C' }
        ]
      }
    }
    expect(getOntologyTerms(ontologyObj)).to.deep.equal({
      a: { id: 'a', name: 'A' },
      b: { id: 'b', name: 'B' },
      c: { id: 'c', name: 'C' }
    })
  })
})
