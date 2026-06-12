import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { validateData } from './validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const fixtures = join(__dirname, 'fixtures');

test('fixture documents trigger every referential integrity check', () => {
  const { errors } = validateData({
    taxonomyPath: join(repoRoot, 'data', 'taxonomy.json'),
    authoritiesPath: join(fixtures, 'authorities.json'),
    documentsDir: join(fixtures, 'documents'),
  });

  const expect = (pattern) =>
    assert.ok(
      errors.some((e) => e.includes(pattern)),
      `expected an error containing "${pattern}", got:\n${errors.join('\n')}`
    );

  expect('theme data_privacy is a branch');
  expect('theme data_privacy.nonexistent_leaf does not exist');
  expect('issuing_authority sa-missing-authority does not exist');
  expect('relationship target sa-does-not-exist does not exist');
  expect('amended_by is an inverse; record the forward form amends');
  expect('conditionally_binding requires an enabled_by relationship');
  expect('xx-bad-shape.json');

  const goodRecordErrors = errors.filter((e) => e.startsWith('sa-good-record.json'));
  assert.deepEqual(goodRecordErrors, [], `good fixture should pass:\n${goodRecordErrors.join('\n')}`);
});

test('real taxonomy validates against its schema', () => {
  const { errors } = validateData({
    taxonomyPath: join(repoRoot, 'data', 'taxonomy.json'),
    authoritiesPath: join(fixtures, 'authorities.json'),
    documentsDir: join(fixtures, 'empty'),
  });
  const taxonomyErrors = errors.filter((e) => e.startsWith('taxonomy.json'));
  assert.deepEqual(taxonomyErrors, [], taxonomyErrors.join('\n'));
});
