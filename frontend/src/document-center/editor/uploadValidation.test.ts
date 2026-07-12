import assert from 'node:assert/strict';
import test from 'node:test';
import { validateUploadFile } from './uploadValidation';

test('validates image extension, mime and 10MB limit', () => {
  assert.equal(validateUploadFile('IMAGE', { name: 'a.png', type: 'image/png', size: 1024 }), undefined);
  assert.match(validateUploadFile('IMAGE', { name: 'a.svg', type: 'image/svg+xml', size: 1024 }) ?? '', /JPG/);
  assert.match(validateUploadFile('IMAGE', { name: 'a.png', type: 'image/png', size: 11 * 1024 * 1024 }) ?? '', /10MB/);
});

test('validates attachment whitelist and 50MB limit', () => {
  assert.equal(validateUploadFile('ATTACHMENT', { name: 'guide.pdf', type: 'application/pdf', size: 1024 }), undefined);
  assert.match(validateUploadFile('ATTACHMENT', { name: 'run.exe', type: 'application/octet-stream', size: 1024 }) ?? '', /PDF/);
});
