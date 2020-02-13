/* global describe, it */

const expect = require('chai').expect
const path = require('path')
const fs = require('fs-extra')
const rewire = require('rewire')
const ldquery = require('ld-query')

const utils = require('../src/utils')
const dc = rewire('../src/data_collectors')

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

function getDialectData () {
  return {
    name: 'WebAPI',
    id: 'file:///somewhere/fixtures/musicDialect.yaml',
    slug: 'webapi',
    htmlName: 'webapi.html',
    nodeMappings: [{
      name: 'Scope',
      id: 'file:///somewhere/fixtures/musicDialect.yaml#/declarations/Scope',
      htmlName: 'node_scope.html',
      description: null,
      scalarProperties: [{
        name: 'name',
        id: 'http://a.ml/vocabularies/security#name',
        range: 'string',
        constraints: [{ name: 'mandatory', value: false }]
      }],
      linkProperties: [{
        name: 'scope',
        id: 'http://a.ml/vocabularies/security#scope',
        constraints: [{ name: 'mandatory', value: false }],
        range: 'list, Scope'
      }]
    }]
  }
}

function getDocumentLdq (name) {
  const fpath = path.join(FIXTURES_DIR, name)
  const graph = JSON.parse(fs.readFileSync(fpath))
  const ctx = utils.getDefaultContext()
  return ldquery(graph, ctx)
}

describe('data_collectors.processVocabulary', async function () {
  const processVocabulary = dc.__get__('processVocabulary')
  it('should collect vocabulary data and process it', function () {
    const graph = JSON.parse(fs.readFileSync(
      path.join(FIXTURES_DIR, 'musicVocabulary.jsonld')))
    const ctx = utils.getDefaultContext()
    const acc = {}
    processVocabulary(graph, ctx, acc)
    const id = 'file:///somewhere/fixtures/musicVocabulary.yaml'
    expect(acc).to.have.property(id)
    expect(acc[id]).to.include({
      name: 'Music Vocabulary',
      id: 'file:///somewhere/fixtures/musicVocabulary.yaml',
      version: null,
      label: 'Music Vocabulary',
      slug: 'musicvocabulary_vocab',
      htmlName: 'musicvocabulary_vocab.html'
    })
    expect(acc[id])
      .to.have.property('nodeMappings').and
      .be.an('array').and
      .be.lengthOf(2)
    expect(acc[id].nodeMappings[0]).to.include({
      type: 'class',
      name: 'Music Artist',
      label: 'Music Artist',
      description: 'A person or a group of people (or a computer :-) )' +
        ', whose musical\ncreative work shows sensitivity and imagination\n',
      id: 'http://a.ml/vocabularies/music#MusicArtist',
      dialectName: 'Music Vocabulary',
      dialectLabel: 'Music Vocabulary',
      slug: 'musicartist_class',
      htmlName: 'schema_musicvocabulary_vocab_musicartist_class.html'
    })
  })
})

describe('data_collectors.processDialect', async function () {
  const processDialect = dc.__get__('processDialect')
  it('should collect dialect data and process it', function () {
    const graph = JSON.parse(fs.readFileSync(
      path.join(FIXTURES_DIR, 'musicDialect.jsonld')))
    const ctx = utils.getDefaultContext()
    const acc = {}
    const ontologyTerms = {}
    processDialect(graph, ctx, acc, ontologyTerms)
    const id = 'file:///somewhere/fixtures/musicDialect.yaml'
    expect(acc).to.have.property(id)
    expect(acc[id]).to.include({
      name: 'Playlist',
      label: 'Playlist',
      id: 'file:///somewhere/fixtures/musicDialect.yaml',
      version: '1.0',
      slug: 'playlist',
      htmlName: 'playlist.html'
    })
    expect(acc[id])
      .to.have.property('nodeMappings')
      .and.be.an('array')
      .and.be.lengthOf(2)
    expect(acc[id].nodeMappings[0]).to.include({
      name: 'ArtistNode',
      label: 'ArtistNode',
      id: 'file:///somewhere/fixtures/musicDialect.yaml#/declarations/ArtistNode',
      dialectName: 'Playlist',
      dialectLabel: 'Playlist',
      slug: 'artistnode',
      htmlName: 'schema_playlist_artistnode.html',
      description: '',
      targetClassId: null
    })
    expect(acc[id].nodeMappings[0])
      .to.have.property('linkProperties').and
      .deep.equal([])
    expect(acc[id].nodeMappings[0])
      .to.have.property('linkedSchemas').and
      .deep.equal([])
    expect(acc[id].nodeMappings[0])
      .to.have.property('scalarProperties').and
      .deep.equal([
        {
          name: 'name',
          id: 'http://schema.org/name',
          constraints: [],
          range: 'string'
        }
      ])
  })
})

describe('data_collectors.collectNavData', async function () {
  const collectNavData = dc.__get__('collectNavData')
  it('should collect dialect-specific navigation data', function () {
    const dialectData = getDialectData()
    const commonNavData = {
      dialects: [
        { name: 'WebAPI', active: false },
        { name: 'Something', active: true }
      ]
    }
    const ctx = utils.getDefaultContext()
    const navData = collectNavData(dialectData, commonNavData, ctx)
    expect(navData).to.deep.equal({
      dialects: [
        { name: 'WebAPI', active: true },
        { name: 'Something', active: false }
      ],
      nodeMappings: [{
        name: 'Scope',
        label: 'Scope',
        htmlName: 'node_scope.html',
        active: false
      }]
    })
  })
})

describe('data_collectors.collectCommonNavData', async function () {
  const collectCommonNavData = dc.__get__('collectCommonNavData')
  it('should collect common navigation data', function () {
    const dialectsData = [getDialectData()]
    const ctx = utils.getDefaultContext()
    const navData = collectCommonNavData(dialectsData, ctx)
    expect(navData).to.deep.equal({
      dialects: [{
        name: 'WebAPI',
        label: 'WebAPI',
        htmlName: 'webapi.html',
        active: false
      }],
      nodeMappings: []
    })
  })
})

describe('data_collectors.collectPropertyConstraints', async function () {
  const collectPropertyConstraints = dc.__get__('collectPropertyConstraints')
  it('should collect nodeMappings item property constraints data', function () {
    const propGraph = JSON.parse(fs.readFileSync(
      path.join(FIXTURES_DIR, 'propertyGraph.jsonld')))
    const ctx = utils.getDefaultContext()
    const prop = ldquery(propGraph, ctx)
    const constraints = collectPropertyConstraints(prop)
    expect(constraints).to.deep.equal([
      { name: 'mandatory', value: true },
      { name: 'pattern', value: 'fooPattern' },
      { name: 'minimum', value: 2 },
      { name: 'maximum', value: 3 },
      { name: 'allowMultiple', value: true },
      { name: 'sorted', value: true },
      { name: 'mapKey', value: 'thisIsMapPropertyId' },
      { name: 'typeDiscriminatorName', value: 'thisIsYypeDiscriminatorNameVal' },
      { name: 'enum', value: ['foo', 'bar'] },
      { name: 'typeDiscriminator', value: 'hello\nworld' }
    ])
  })
})

describe('data_collectors.collectCommonPropData', async function () {
  const collectCommonPropData = dc.__get__('collectCommonPropData')
  it('should collect property data common to scalar and link properties', function () {
    const doc = getDocumentLdq('validationDialect.jsonld')
    const prop = doc.query(
      'shacl:property[@id=file://validation.yaml#/declarations/profileNode]')
    const data = collectCommonPropData(doc, prop, {})
    expect(data).to.deep.equal({
      name: 'info',
      id: 'http://a.ml/vocabularies/amf-validation#setSeverityInfo',
      propDesc: 'Textual representation',
      constraints: [{ name: 'allowMultiple', value: true }]
    })
  })
})

describe('data_collectors.collectLinkPropsData', async function () {
  const collectLinkPropsData = dc.__get__('collectLinkPropsData')
  it('should collect nodeMappings item link properties data', function () {
    const doc = getDocumentLdq('validationDialect.jsonld')
    const node = doc.query(
      'amldoc:declares[@id=file://validation.yaml#/declarations/profileNode]')
    const ctx = utils.getDefaultContext()
    const ontologyTerms = { shapeValidationNode: { description: 'hello' } }
    const data = collectLinkPropsData(doc, node, 'iamdialect', ontologyTerms, ctx)
    expect(data).to.deep.equal([{
      name: 'validations',
      id: 'http://a.ml/vocabularies/amf-validation#validations',
      constraints: [],
      range: [{
        rangeDescription: 'hello',
        rangeName: 'shapeValidationNode',
        rangeLabel: 'shapeValidationNode',
        rangeHtmlName: 'schema_validationprofile_shapevalidationnode.html'
      }, {
        rangeDescription: undefined,
        rangeName: 'queryValidationNode',
        rangeLabel: 'queryValidationNode',
        rangeHtmlName: 'schema_validationprofile_queryvalidationnode.html'
      }, {
        rangeDescription: undefined,
        rangeName: 'functionValidationNode',
        rangeLabel: 'functionValidationNode',
        rangeHtmlName: 'schema_validationprofile_functionvalidationnode.html'
      }]
    }])
  })
})

describe('data_collectors.collectScalarPropsData', async function () {
  const collectScalarPropsData = dc.__get__('collectScalarPropsData')
  it('should collect nodeMappings item scalar properties data', function () {
    const doc = getDocumentLdq('validationDialect.jsonld')
    const node = doc.query(
      'amldoc:declares[@id=file://validation.yaml#/declarations/profileNode]')
    const data = collectScalarPropsData(doc, node, 'iamdialect', {})
    expect(data).to.deep.equal([{
      name: 'info',
      id: 'http://a.ml/vocabularies/amf-validation#setSeverityInfo',
      constraints: [{ name: 'allowMultiple', value: true }],
      propDesc: 'Textual representation',
      range: 'string'
    }, {
      name: 'description',
      id: 'http://schema.org/description',
      constraints: [],
      range: 'string'
    }, {
      name: 'extends',
      id: 'http://a.ml/vocabularies/amf-validation#extendsProfile',
      constraints: [],
      range: 'string'
    }, {
      name: 'warning',
      id: 'http://a.ml/vocabularies/amf-validation#setSeverityWarning',
      constraints: [{ name: 'allowMultiple', value: true }],
      range: 'string'
    }, {
      name: 'disabled',
      id: 'http://a.ml/vocabularies/amf-validation#disableValidation',
      constraints: [{ name: 'allowMultiple', value: true }],
      range: 'string'
    }, {
      name: 'profile',
      id: 'http://schema.org/name',
      constraints: [{ name: 'mandatory', value: true }],
      range: 'string'
    }, {
      name: 'violation',
      id: 'http://a.ml/vocabularies/amf-validation#setSeverityViolation',
      constraints: [{ name: 'allowMultiple', value: true }],
      range: 'string'
    }])
  })
})

describe('data_collectors.collectNodesData', async function () {
  const collectNodesData = dc.__get__('collectNodesData')
  it('should collect dialect nodeMappings data', function () {
    const doc = getDocumentLdq('validationDialect.jsonld')
    const dialectData = getDialectData()
    const ctx = utils.getDefaultContext()
    const data = collectNodesData(doc, dialectData, ctx, {})
    expect(data).to.be.lengthOf(6)
    expect(data[0]).to.include({
      name: 'propertyConstraintNode',
      label: 'propertyConstraintNode',
      id: 'file://validation.yaml#/declarations/propertyConstraintNode',
      dialectName: 'WebAPI',
      dialectLabel: 'WebAPI',
      slug: 'propertyconstraintnode',
      htmlName: 'schema_webapi_propertyconstraintnode.html',
      description: '',
      targetClassId: 'http://www.w3.org/ns/shacl#PropertyShape'
    })
    expect(data[0])
      .to.have.property('scalarProperties').and
      .be.lengthOf(10)
    expect(data[0]).to.have.property('linkProperties').and.deep.equal([])
    expect(data[0]).to.have.property('linkedSchemas').and.deep.equal([])
    expect(data[1]).to.have.property('name', 'profileNode')
    expect(data[1]).to.have.property('linkProperties').and.be.lengthOf(1)
    expect(data[1]).to.have.property('linkedSchemas').and.be.lengthOf(3)
  })
})

describe('data_collectors.collectVocabularyNodesData', async function () {
  const collectVocabularyNodesData = dc.__get__('collectVocabularyNodesData')
  it('should collect vocabulary classes and properties data', function () {
    const doc = getDocumentLdq('musicVocabulary.jsonld')
    const dialectData = getDialectData()
    const ctx = utils.getDefaultContext()
    const data = collectVocabularyNodesData(doc, dialectData, ctx)
    expect(data).to.deep.equal([{
      type: 'class',
      name: 'Music Artist',
      label: 'Music Artist',
      description: 'A person or a group of people (or a computer :-) )' +
        ', whose musical\ncreative work shows sensitivity and imagination\n',
      id: 'http://a.ml/vocabularies/music#MusicArtist',
      dialectName: 'WebAPI',
      dialectLabel: 'WebAPI',
      slug: 'musicartist_class',
      htmlName: 'schema_webapi_musicartist_class.html'
    }, {
      type: 'datatypeProperty',
      name: 'duration',
      label: 'duration',
      description: 'The duration of a track or a signal in ms',
      id: 'http://a.ml/vocabularies/music#duration',
      dialectName: 'WebAPI',
      dialectLabel: 'WebAPI',
      slug: 'duration_datatypeproperty',
      htmlName: 'schema_webapi_duration_datatypeproperty.html'
    }])
  })
})

describe('data_collectors.collectDialectData', async function () {
  const collectDialectData = dc.__get__('collectDialectData')
  it('should collect complete dialect data', function () {
    const doc = getDocumentLdq('validationDialect.jsonld')
    const ctx = utils.getDefaultContext()
    const data = collectDialectData(doc, ctx, {}, {})
    expect(data).to.include({
      name: 'Validation Profile',
      label: 'Validation Profile',
      id: 'file://validation.yaml',
      version: '1.0',
      slug: 'validationprofile',
      htmlName: 'validationprofile.html'
    })
    expect(data)
      .to.have.property('nodeMappings').and
      .be.lengthOf(6)
  })
})

describe('data_collectors.collectVocabularyData', async function () {
  const collectVocabularyData = dc.__get__('collectVocabularyData')
  it('should collect vocabulary classes and properties data', function () {
    const doc = getDocumentLdq('musicVocabulary.jsonld')
    const ctx = utils.getDefaultContext()
    const data = collectVocabularyData(doc, ctx, {})
    expect(data).to.include({
      name: 'Music Vocabulary',
      id: 'file:///somewhere/fixtures/musicVocabulary.yaml',
      version: null,
      label: 'Music Vocabulary',
      slug: 'musicvocabulary_vocab',
      htmlName: 'musicvocabulary_vocab.html'
    })
    expect(data)
      .to.have.property('nodeMappings').and
      .be.lengthOf(2)
  })
})
