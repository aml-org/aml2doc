/* global describe, it, before, after */

const expect = require('chai').expect
const tmp = require('tmp')
const path = require('path')
const fs = require('fs-extra')

const aml2doc = require('../src/index')

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

describe('aml2doc html integration test', function () {
  let outDir
  before(async function () {
    outDir = tmp.dirSync()
    const program = {
      outputDir: outDir.name,
      cfg: path.join(FIXTURES_DIR, 'cfg.js'),
      infile: [
        path.join(FIXTURES_DIR, 'musicDialect.yaml')
      ],
      css: ['inexisting/css/file.css'],
      templates: path.join(__dirname, '..', 'templates'),
      syntax: 'html'
    }
    await aml2doc(program)
  })
  after(function () {
    try { fs.removeSync(outDir.name) } catch (e) {}
  })
  it('should render templates', function () {
    expect(fs.readdirSync(outDir.name)).to.deep.equal([
      'index.html',
      'playlist.html',
      'schema_playlist_artistnode.html',
      'schema_playlist_artistunion.html',
      'static'
    ])
    expect(fs.readdirSync(path.join(outDir.name, 'static')))
      .to.deep.equal(['css'])
    expect(fs.readdirSync(path.join(outDir.name, 'static', 'css')))
      .to.deep.equal([
        'bootstrap.min.css',
        'custom.css'
      ])
  })
  it('should render proper data at index page', function () {
    const fpath = path.join(outDir.name, 'index.html')
    const html = fs.readFileSync(fpath).toString()
    expect(html).to.contain(
      '<link rel="stylesheet" href="inexisting/css/file.css">')
    expect(html)
      .to.contain('playlist.html').and
      .to.contain('index.html').and
      .to.contain('Playlist_modified').and
      .to.contain('ArtistNode_modified').and
      .to.contain('hi://test.else/vocabulary.aml').and
      .to.contain('hi://test.com/vocabulary.pdf').and
      .to.contain('hi://test.com/vocabulary.txt')
  })
  it('should render proper data at dialect page', function () {
    const fpath = path.join(outDir.name, 'playlist.html')
    const html = fs.readFileSync(fpath).toString()
    expect(html).to.contain(
      '<link rel="stylesheet" href="inexisting/css/file.css">')
    expect(html)
      .to.contain('playlist.html').and
      .to.contain('index.html').and
      .to.contain('schema_playlist_artistnode.html').and
      .to.contain('schema_playlist_artistunion.html').and
      .to.contain('Version:').and
      .to.contain('ArtistNode_modified').and
      .to.contain('musicDialect.yaml_modified')
  })
  it('should render proper data at schema page', function () {
    const fpath = path.join(outDir.name, 'schema_playlist_artistnode.html')
    const html = fs.readFileSync(fpath).toString()
    expect(html).to.contain(
      '<link rel="stylesheet" href="inexisting/css/file.css">')
    expect(html)
      .to.contain('index.html').and
      .to.contain('schema_playlist_artistnode.html').and
      .to.contain('schema_playlist_artistunion.html').and
      .to.contain('playlist.html').and
      .to.contain('No Linked schemas').and
      .to.contain('schema.org').and
      .to.contain('string').and
      .to.contain('No Link Properties')
  })
  it('should render proper data at union schema page', function () {
    const fpath = path.join(outDir.name, 'schema_playlist_artistunion.html')
    const html = fs.readFileSync(fpath).toString()
    expect(html).to.contain('Union of ArtistNode, ArtistNode')
  })
})

describe('aml2doc md integration test', function () {
  let outDir
  before(async function () {
    outDir = tmp.dirSync()
    const program = {
      outputDir: outDir.name,
      cfg: path.join(FIXTURES_DIR, 'cfg.js'),
      infile: [
        path.join(FIXTURES_DIR, 'musicDialect.yaml')
      ],
      css: ['inexisting/css/file.css'],
      templates: path.join(__dirname, '..', 'templates'),
      syntax: 'md'
    }
    await aml2doc(program)
  })
  after(function () {
    try { fs.removeSync(outDir.name) } catch (e) {}
  })
  it('should render templates', function () {
    expect(fs.readdirSync(outDir.name)).to.deep.equal([
      'index.md',
      'playlist.md',
      'schema_playlist_artistnode.md',
      'schema_playlist_artistunion.md',
      'static'
    ])
    expect(fs.readdirSync(path.join(outDir.name, 'static')))
      .to.deep.equal(['css'])
    expect(fs.readdirSync(path.join(outDir.name, 'static', 'css')))
      .to.deep.equal([
        'bootstrap.min.css',
        'custom.css'
      ])
  })
  it('should render proper data at index page', function () {
    const fpath = path.join(outDir.name, 'index.md')
    const md = fs.readFileSync(fpath).toString()
    expect(md)
      .to.contain('playlist.md').and
      .to.contain('Playlist_modified').and
      .to.contain('ArtistNode_modified').and
      .to.contain('hi://test.else/vocabulary.aml').and
      .to.contain('hi://test.com/vocabulary.pdf').and
      .to.contain('hi://test.com/vocabulary.txt')
  })
  it('should render proper data at dialect page', function () {
    const fpath = path.join(outDir.name, 'playlist.md')
    const md = fs.readFileSync(fpath).toString()
    expect(md)
      .to.contain('index.md').and
      .to.contain('schema_playlist_artistnode.md').and
      .to.contain('schema_playlist_artistunion.md').and
      .to.contain('Version:').and
      .to.contain('ArtistNode_modified').and
      .to.contain('musicDialect.yaml_modified')
  })
  it('should render proper data at schema page', function () {
    const fpath = path.join(outDir.name, 'schema_playlist_artistnode.md')
    const md = fs.readFileSync(fpath).toString()
    expect(md)
      .to.contain('index.md').and
      .to.contain('No Linked schemas').and
      .to.contain('schema.org').and
      .to.contain('string').and
      .to.contain('No Link Properties')
  })
  it('should render proper data at union schema page', function () {
    const fpath = path.join(outDir.name, 'schema_playlist_artistunion.md')
    const md = fs.readFileSync(fpath).toString()
    expect(md).to.contain('Union of ArtistNode, ArtistNode')
  })
})
