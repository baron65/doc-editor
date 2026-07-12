import assert from 'node:assert/strict';
import test from 'node:test';
import { DocumentApiError, isDocumentApiError, toDocumentApiError } from './documentApiError';

test('extracts backend business code and HTTP status from Umi request errors', () => {
  const error = toDocumentApiError({
    response: { status: 409 },
    data: { code: 'DOCUMENT_VERSION_CONFLICT', message: 'draft revision conflict' },
  });
  assert.ok(error instanceof DocumentApiError);
  assert.equal(error.status, 409);
  assert.equal(error.code, 'DOCUMENT_VERSION_CONFLICT');
  assert.equal(isDocumentApiError(error, 'DOCUMENT_VERSION_CONFLICT'), true);
});

test('supports response-contained error payloads', () => {
  const error = toDocumentApiError({
    response: {
      status: 404,
      data: { code: 'DOCUMENT_NOT_FOUND', message: 'not found' },
    },
  });
  assert.equal(error.status, 404);
  assert.equal(error.code, 'DOCUMENT_NOT_FOUND');
});
