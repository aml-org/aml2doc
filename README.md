# aml2doc
[![Build Status](https://travis-ci.org/aml-org/aml2doc.svg?branch=master)](https://travis-ci.org/aml-org/aml2doc)

Convert AML Vocabularies & Dialects to documentation.

## Installation
```sh
$ git clone git@github.com:aml-org/aml2doc.git
$ cd aml2doc
$ npm install
```

## Usage
CLI command notation (*note the required `--` before arguments*):
```
Usage: npm run aml2doc -- [options] <outputDir>

Convert AML Vocabularies & Dialects to documentation.

Options:
  -d, --indir <path>     Path to input directory to convert. Takes precedence over --infile.
  -f, --infile <path>    Path to input file to convert (default: [])
  -s, --syntax <name>    Output syntax (html or md) (default: "html")
  -c, --css <path>       Custom css file path (default: [])
  -g, --cfg <path>       Configuration file path
  -h, --help             Output usage information
  -t, --templates <path> Path to optional custom templates for the documentation
```

E.g.:
```sh
$ npm run aml2doc -- ./outdir --infile=test_data/amf/dialects/canonical_webapi.yaml --infile=test_data/amf/dialects/oas20.yaml --infile=test_data/amf/dialects/validation.yaml --infile=test_data/music/dialect/playlist.yaml
```

Or using `--indir` option:
```sh
$ npm run aml2doc -- ./outdir --indir=./test_data
```


## Configuration

The HTML generation can be customised by providing additional JS code that changes the behaviour of the generator.
Configuration code is passed as a JS referenced in the `cfg` invocation parameter.

The file must export a JS module with the following symbols:

* `idMapping`: Function used to generate the final URIs shown in the HTML documentation for entities and dialects
* `labelMapping`: Function used to generate the final labels shown in the HTML documentation for entities and dialects
* `dialectsHeader`: Name of the header used for the dialects section in the documentaton
* `schemasHeader`: Name of the header used for the schemas section in the documentation
* `indexHeader`: Header to be displayed on the `index.html` page
* `indexVersion`: Version to be displayed on the `index.html` page
* `indexDescription`: Description to be displayed on the `index.html` page
* `indexDownloadLinks`: Path to a JSON file containing links to download vocabularies AML in different formats. See sections below for JSON file format description. Path should be relative to the config file or absolute.
* `downloadLinks`: Path to a JSON file containing links to download dialects AML in different formats. See sections below for JSON file format description. Path should be relative to the config file or absolute.

The following snippet shows a custom configuration stored in the `cfg.js` file:

```javascript
module.exports = {
  idMapping: function(id) {
    return id + '_modified'
  },
  labelMapping: function (label) {
    return label + '_modified'
  },
  dialectsHeader: 'My label for dialects',
  schemasHeader: 'My label for schemas',
  indexHeader: 'My dialects',
  indexVersion: 'Version 1.0',
  indexDescription: 'My first list of dialects',
  indexDownloadLinks: '/path/to/indexDownloadLinks.json',
  downloadLinks: '/path/to/downloadLinks.json'
}
```

This file can be used when invoking the HTML generator in the following way:

E.g.
```sh
$ npm run aml2doc -- ./outdir --indir=./test_data --cfg=/path/to/cfg.js
```

Configuration files will be searched relative to the working directory of the node interpreter.

### indexDownloadLinks file format

```json
[
  {"href": "https://somewhere.com/vocabulary.pdf", "text": "pdf"},
  {"href": "https://somewhere.com/vocabulary.txt", "text": "txt"},
  {"href": "https://somewhere.else/vocabulary.aml", "text": "aml"}
]
```

### downloadLinks file format

```json
[
  {"href": "https://somewhere.com/dialect.pdf", "text": "pdf", "position": "primary"},
  {"href": "https://somewhere.com/dialect.txt", "text": "txt", "position": "primary"},
  {"href": "https://somewhere.else/dialect.aml", "text": "aml", "position": "secondary"}
]
```

## Custom templates

The documentation generator accepts as optional argument a directory where a new set of templates for the documentation
must be provided.

This is the list of supported templates:

 - index.mustache: Index page template
 - dialect.mustache: Template for a single dialect
 - node.mustache: Template for a single node in a dialect

 Please, inspect the default to inspect the variables available in each template.

## Viewing generated HTML

Open the directory specified as `--outdir` option value and open any `.html` file in a browser.
