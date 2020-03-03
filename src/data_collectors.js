const ldquery = require('ld-query')
const utils = require('./utils')

/* Collects complete vocabulary data. */
function collectVocabularyData (doc, ctx, acc) {
  const id = doc.query('@id')
  const name = doc.query('> core:name @value')
  const vocabularyData = {
    name: name,
    id: ctx.config.idMapping(id),
    version: doc.query('> core:version @value'),
    label: ctx.config.labelMapping(name)
  }
  if (!acc[id]) {
    console.log(`Collecting dialect data for id ${id}`)
    const usage = doc.json()[`${ctx.amldoc}usage`]
    if (usage) {
      vocabularyData.usage = usage[0]['@value']
    }
    vocabularyData.slug = utils.slugify(vocabularyData.name + '_vocab')
    vocabularyData.pageName = vocabularyData.slug
    console.log(`Collecting nodes info for vocabulary ${id}`)
    vocabularyData.nodeMappings = collectVocabularyNodesData(
      doc, vocabularyData, ctx).sort(utils.nameSorter)
    vocabularyData.nodeMappings.forEach(node => {
      node.vocabulary = vocabularyData
    })
    return vocabularyData
  }
}

/* Collects complete dialect data. */
function collectDialectData (doc, ctx, acc, ontologyTerms) {
  const id = doc.query('@id')
  const name = doc.query('> core:name @value')
  const dialectData = {
    name: name,
    label: ctx.config.labelMapping(name),
    id: ctx.config.idMapping(id),
    version: doc.query('> core:version @value')
  }
  if (!acc[id]) {
    console.log(`Collecting dialect data for id ${id}`)
    const usage = doc.json()[`${ctx.amldoc}usage`]
    if (usage) {
      dialectData.usage = usage[0]['@value']
    }
    dialectData.slug = utils.slugify(dialectData.name)
    dialectData.pageName = dialectData.slug
    console.log(`Collecting nodes info for dialect ${id}`)
    dialectData.nodeMappings = collectNodesData(
      doc, dialectData, ctx, ontologyTerms)
      .sort(utils.nameSorter)
    return dialectData
  }
}

/* Collects vocabulary classes and properties data. */
function collectVocabularyNodesData (doc, dialectData, ctx) {
  const acc = {}
  const collectionCreds = [
    // Fetch classes
    {
      query: '> amldoc:declares[@type=owl:Class]',
      type: 'class'
    },
    // Fetch declared object properties connecting two classes
    {
      query: '> amldoc:declares[@type=owl:ObjectProperty]',
      type: 'objectProperty'
    },
    // Collect literal (datatype) properties
    {
      query: '> amldoc:declares[@type=owl:DatatypeProperty]',
      type: 'datatypeProperty'
    }
  ]

  collectionCreds.forEach(cred => {
    doc.queryAll(cred.query).map(node => {
      const nodeId = node.query('@id')
      if (!acc[nodeId]) {
        console.log(`\t- ${nodeId}`)
        const name = node.query('> core:displayName @value')
        const nodeData = {
          type: cred.type,
          name: name,
          label: ctx.config.labelMapping(name),
          description: node.query('> core:description @value'),
          id: ctx.config.idMapping(node.query('@id')),
          dialectName: dialectData.name,
          dialectLabel: ctx.config.labelMapping(dialectData.name)
        }
        // pageName
        nodeData.slug = utils.slugify(`${nodeData.name}_${cred.type}`)
        nodeData.pageName = utils.makeSchemaPageName(
          dialectData.slug, nodeData.slug)
        // save
        acc[nodeId] = nodeData
      }
    })
  })
  return Object.values(acc)
}

/* Collects dialect nodeMappings data. */
function collectNodesData (doc, dialectData, ctx, ontologyTerms) {
  const acc = {}
  doc.queryAll('> amldoc:declares[@type=shacl:Shape]')
    .map(node => {
      // name, id
      const nodeId = node.query('@id')
      if (!acc[nodeId]) {
        console.log(`\t- ${nodeId}`)
        const name = node.query('> core:name @value')
        const nodeData = {
          name: name,
          label: ctx.config.labelMapping(name),
          id: ctx.config.idMapping(node.query('@id')),
          dialectName: dialectData.name,
          dialectLabel: ctx.config.labelMapping(dialectData.name)
        }
        // pageName
        nodeData.slug = utils.slugify(nodeData.name)
        nodeData.pageName = utils.makeSchemaPageName(
          dialectData.slug, nodeData.slug)

        const isUnion = node.query('@type')
          .indexOf(`${ctx.meta}UnionNodeMapping`) > -1
        if (isUnion) {
          const seq = node.query('> shacl:node[@type=rdfs:Seq]')
          const names = seq.queryAll('@id').slice(1).map(utils.parseHashValue)
          // description
          nodeData.description = `Union of ${names.join(', ')}`
          // properties
          nodeData.scalarProperties = []
          nodeData.linkProperties = []
        } else {
          // description
          const targetClassId = node.query('> shacl:targetClass @id')
          const targetClass = doc.query(`amldoc:declares[@id=${targetClassId}]`)
          nodeData.description = targetClass
            ? targetClass.query('core:description @value')
            : ''
          if (ontologyTerms[targetClassId] != null) {
            nodeData.description = ontologyTerms[targetClassId].description
          }
          nodeData.targetClassId = targetClassId

          // properties
          nodeData.scalarProperties = utils.removeDuplicatesById(
            collectScalarPropsData(doc, node, ontologyTerms))
            .sort(utils.nameSorter)
          nodeData.linkProperties = utils.removeDuplicatesById(
            collectLinkPropsData(doc, node, dialectData.slug, ontologyTerms, ctx))
            .sort(utils.nameSorter)
        }
        nodeData.linkedSchemas = []
        nodeData.linkProperties.forEach(prop => {
          nodeData.linkedSchemas = nodeData.linkedSchemas.concat(...prop.range)
        })
        // Remove duplicates
        const rangesNames = nodeData.linkedSchemas.map(sch => sch.rangeName)
        nodeData.linkedSchemas = nodeData.linkedSchemas.filter((s, i) => {
          return rangesNames.indexOf(s.rangeName) === i
        })
        acc[nodeId] = nodeData
      }
    })
  return Object.values(acc)
}

/* Collects nodeMappings item scalar properties data. */
function collectScalarPropsData (doc, node, ontologyTerms) {
  const propsNodes = node.queryAll('shacl:property')
    .filter(prop => !!prop.query('shacl:datatype'))
  return propsNodes.map(prop => {
    const propData = collectCommonPropData(doc, prop, ontologyTerms)
    propData.range = utils.parseHashValue(prop.query('shacl:datatype @id'))
    return propData
  })
}

/* Collects nodeMappings item link properties data. */
function collectLinkPropsData (doc, node, dialectSlug, ontologyTerms, ctx) {
  const propsNodes = node.queryAll('shacl:property')
    .filter(prop => !prop.query('shacl:datatype'))
  return propsNodes.map(prop => {
    const propData = collectCommonPropData(doc, prop, ontologyTerms)
    propData.range = prop.queryAll('shacl:node @id').slice(1)
      .map(rangeId => {
        const name = utils.parseHashValue(rangeId)
        const rangeDesc = (ontologyTerms[ctx.config.idMapping(name)] || {}).description
        const data = {
          rangeName: name,
          rangeLabel: ctx.config.labelMapping(name),
          rangeDescription: rangeDesc
        }
        const decl = doc.query(`amldoc:declares[@id=${rangeId}]`)
        if (decl) {
          data.rangePageName = utils.makeSchemaPageName(
            utils.slugify(decl.parent().query('> core:name @value')),
            utils.slugify(data.rangeName))
        }
        return data
      })
    return propData
  })
}

/* Collects property data common to scalar and link properties. */
function collectCommonPropData (doc, prop, ontologyTerms) {
  const propData = {
    name: prop.query('core:name @value'),
    id: prop.query('shacl:path @id'),
    constraints: collectPropertyConstraints(prop)
  }
  const vocabProp = doc.query(`amldoc:declares[@id=${propData.id}]`)
  if (vocabProp) {
    propData.propDesc = vocabProp.query('core:description @value')
  }
  if (ontologyTerms[propData.id] != null) {
    propData.propDesc = ontologyTerms[propData.id].description
  }

  return propData
}

/* Collects nodeMappings item property constraints data. */
function collectPropertyConstraints (prop) {
  const constraints = [
    { name: 'mandatory', value: prop.query('shacl:minCount @value') > 0 },
    { name: 'pattern', value: prop.query('shacl:pattern @value') },
    { name: 'minimum', value: prop.query('shacl:minInclusive @value') },
    { name: 'maximum', value: prop.query('shacl:maxInclusive @value') },
    { name: 'allowMultiple', value: prop.query('meta:allowMultiple @value') },
    { name: 'sorted', value: prop.query('meta:sorted @value') },
    { name: 'mapKey', value: prop.query('meta:mapProperty @id') },
    {
      name: 'typeDiscriminatorName',
      value: prop.query('meta:typeDiscriminatorName @value')
    }
  ]

  const enumNode = prop.query('shacl:in')
  if (enumNode) {
    constraints.push({
      name: 'enum',
      value: enumNode.queryAll('@value')
    })
  }

  const discrValue = prop.query('meta:typeDiscriminatorMap @value')
  if (discrValue) {
    constraints.push({
      name: 'typeDiscriminator',
      value: discrValue.split(',').join('\n')
    })
  }

  // Drop empty and falsy values
  return constraints.filter(con => !!con.value)
}

/* Collects common navigation data. */
function collectCommonNavData (dialectsData, ctx) {
  const commonNavData = {
    dialects: dialectsData.map(data => {
      const name = data.name
      return {
        name: name,
        label: ctx.config.labelMapping(name),
        pageName: data.pageName,
        active: false
      }
    }),
    nodeMappings: []
  }
  return commonNavData
}

/* Collects dialect-specific navigation data. */
function collectNavData (dialectData, commonNavData, ctx) {
  const navData = {
    dialects: utils.markActive(commonNavData.dialects, dialectData.name),
    nodeMappings: dialectData.nodeMappings.map(data => {
      const name = data.name
      return {
        name: name,
        label: ctx.config.labelMapping(name),
        pageName: data.pageName,
        active: false
      }
    })
  }
  return navData
}

/**
 * Process a file as a vocabulary
 */
function processVocabulary (graph, ctx, acc) {
  const docs = ldquery(graph, ctx).queryAll('*[@type=meta:Vocabulary]')
  docs.forEach(doc => {
    console.log('FOUND A VOCABULARY')
    const id = doc.query('@id')
    if (!acc[id]) {
      console.log(`Adding vocabulary ${id}`)
      acc[id] = collectVocabularyData(doc, ctx, acc)
    }
  })
}

/**
 * Process a file as a dialect
 */
function processDialect (graph, ctx, acc, ontologyTerms) {
  const docs = ldquery(graph, ctx).queryAll('*[@type=meta:Dialect]')
  docs.forEach(doc => {
    const id = doc.query('@id')
    if (!acc[id]) {
      console.log(`Adding Dialect ${id}`)
      acc[id] = collectDialectData(doc, ctx, acc, ontologyTerms)
    }
  })
}

module.exports = {
  vocabularyData: collectVocabularyData,
  dialectData: collectDialectData,
  nodesData: collectNodesData,
  scalarPropsData: collectScalarPropsData,
  linkPropsData: collectLinkPropsData,
  commonPropData: collectCommonPropData,
  propertyConstraints: collectPropertyConstraints,
  commonNavData: collectCommonNavData,
  navData: collectNavData,
  processVocabulary: processVocabulary,
  processDialect: processDialect
}
