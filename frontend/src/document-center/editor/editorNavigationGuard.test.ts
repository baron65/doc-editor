import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldConfirmEditorNavigation } from './editorNavigationGuard';

test('only confirms when leaving the current document with pending work', () => {
  assert.equal(shouldConfirmEditorNavigation(true, '10', '11'), true);
  assert.equal(shouldConfirmEditorNavigation(true, '10', '10'), false);
  assert.equal(shouldConfirmEditorNavigation(false, '10', '11'), false);
});
