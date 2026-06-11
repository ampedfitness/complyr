// Validates Complyr data files against the JSON Schemas and checks
// referential integrity that schemas alone cannot express.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function buildAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv;
}

const INVERSE_TO_FORWARD = {
  amended_by: 'amends',
  repealed_by: 'repeals',
  superseded_by: 'supersedes',
  implemented_by: 'implements',
  resulted_from_consultation: 'consults_on',
  enables: 'enabled_by',
  referenced_by: 'references',
};

/**
 * Validate a Complyr data set.
 * @param {object} paths
 * @param {string} paths.taxonomyPath
 * @param {string} paths.authoritiesPath
 * @param {string} paths.documentsDir
 * @returns {{ errors: string[], warnings: string[], documentCount: number }}
 */
export function validateData({ taxonomyPath, authoritiesPath, documentsDir }) {
  const errors = [];
  const warnings = [];
  const ajv = buildAjv();

  const taxonomySchema = loadJson(join(repoRoot, 'schema', 'taxonomy.schema.json'));
  const authoritiesSchema = loadJson(join(repoRoot, 'schema', 'authorities.schema.json'));
  const documentSchema = loadJson(join(repoRoot, 'schema', 'document.schema.json'));

  // Taxonomy
  let taxonomy = null;
  if (!existsSync(taxonomyPath)) {
    errors.push(`${taxonomyPath}: file not found`);
  } else {
    taxonomy = loadJson(taxonomyPath);
    const validate = ajv.compile(taxonomySchema);
    if (!validate(taxonomy)) {
      for (const err of validate.errors) {
        errors.push(`taxonomy.json${err.instancePath}: ${err.message}`);
      }
    }
  }

  const leafIds = new Set();
  const branchIds = new Set();
  const instrumentClassIds = new Set();
  if (taxonomy) {
    for (const branch of taxonomy.themes ?? []) {
      branchIds.add(branch.id);
      for (const leaf of branch.children ?? []) {
        if (!leaf.id.startsWith(`${branch.id}.`)) {
          errors.push(`taxonomy.json: leaf ${leaf.id} does not belong to its branch ${branch.id}`);
        }
        leafIds.add(leaf.id);
      }
    }
    for (const cls of taxonomy.instrument_classes ?? []) instrumentClassIds.add(cls.id);
  }

  // Authorities
  const authorityIds = new Set();
  if (!existsSync(authoritiesPath)) {
    errors.push(`${authoritiesPath}: file not found`);
  } else {
    const authorities = loadJson(authoritiesPath);
    const validate = ajv.compile(authoritiesSchema);
    if (!validate(authorities)) {
      for (const err of validate.errors) {
        errors.push(`authorities.json${err.instancePath}: ${err.message}`);
      }
    }
    if (Array.isArray(authorities)) {
      for (const a of authorities) {
        if (authorityIds.has(a.id)) errors.push(`authorities.json: duplicate id ${a.id}`);
        authorityIds.add(a.id);
      }
    }
  }

  // Documents
  const documentIds = new Set();
  const documents = [];
  if (!existsSync(documentsDir)) {
    warnings.push(`${documentsDir}: directory not found, no documents validated`);
  } else {
    const files = readdirSync(documentsDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) warnings.push('documents: directory is empty');
    const validate = ajv.compile(documentSchema);
    for (const file of files) {
      const path = join(documentsDir, file);
      let doc;
      try {
        doc = loadJson(path);
      } catch (e) {
        errors.push(`${file}: invalid JSON, ${e.message}`);
        continue;
      }
      if (!validate(doc)) {
        for (const err of validate.errors) {
          let message = `${file}${err.instancePath}: ${err.message}`;
          // Helpful hint when a contributor enters an inverse relationship type.
          if (err.instancePath.endsWith('/type')) {
            const parts = err.instancePath.split('/').filter(Boolean);
            let value = doc;
            for (const p of parts) value = value?.[isNaN(Number(p)) ? p : Number(p)];
            if (typeof value === 'string' && INVERSE_TO_FORWARD[value]) {
              message += ` (${value} is an inverse; record the forward form ${INVERSE_TO_FORWARD[value]} on the other document instead)`;
            }
          }
          errors.push(message);
        }
      }
      if (doc && typeof doc === 'object') {
        if (doc.id) {
          if (documentIds.has(doc.id)) errors.push(`${file}: duplicate document id ${doc.id}`);
          documentIds.add(doc.id);
          if (basename(file, '.json') !== doc.id) {
            errors.push(`${file}: file name must match the document id (${doc.id}.json)`);
          }
        }
        documents.push({ file, doc });
      }
    }
  }

  // Referential integrity
  for (const { file, doc } of documents) {
    for (const theme of doc.themes ?? []) {
      if (branchIds.has(theme)) {
        errors.push(`${file}: theme ${theme} is a branch; tag at leaf level only`);
      } else if (!leafIds.has(theme)) {
        errors.push(`${file}: theme ${theme} does not exist in the taxonomy`);
      }
    }
    if (doc.instrument_class && !instrumentClassIds.has(doc.instrument_class)) {
      errors.push(`${file}: instrument_class ${doc.instrument_class} does not exist in the taxonomy`);
    }
    if (doc.issuing_authority && !authorityIds.has(doc.issuing_authority)) {
      errors.push(`${file}: issuing_authority ${doc.issuing_authority} does not exist in authorities.json`);
    }
    if (doc.id && doc.jurisdiction && !doc.id.startsWith(`${doc.jurisdiction.toLowerCase()}-`)) {
      errors.push(`${file}: id must start with the jurisdiction code ${doc.jurisdiction.toLowerCase()}-`);
    }
    for (const rel of doc.relationships ?? []) {
      if (rel.target_id === doc.id) {
        errors.push(`${file}: relationship target is the document itself`);
      } else if (rel.target_id && !documentIds.has(rel.target_id)) {
        errors.push(`${file}: relationship target ${rel.target_id} does not exist`);
      }
    }
    if (doc.binding_status === 'conditionally_binding') {
      const hasEnabledBy = (doc.relationships ?? []).some((r) => r.type === 'enabled_by');
      if (!hasEnabledBy) {
        errors.push(`${file}: conditionally_binding requires an enabled_by relationship to the instrument that triggers the force`);
      }
    }
    if (doc.lifecycle === 'amended') {
      const isAmended = documents.some(({ doc: other }) =>
        (other.relationships ?? []).some((r) => r.type === 'amends' && r.target_id === doc.id)
      );
      if (!isAmended) {
        warnings.push(`${file}: lifecycle is amended but no document amends it; add the amending instrument or adjust the lifecycle`);
      }
    }
  }

  return { errors, warnings, documentCount: documents.length };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { errors, warnings, documentCount } = validateData({
    taxonomyPath: join(repoRoot, 'data', 'taxonomy.json'),
    authoritiesPath: join(repoRoot, 'data', 'authorities.json'),
    documentsDir: join(repoRoot, 'data', 'documents'),
  });
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  console.log(`${documentCount} documents checked, ${errors.length} errors, ${warnings.length} warnings`);
  if (errors.length > 0) process.exit(1);
}
