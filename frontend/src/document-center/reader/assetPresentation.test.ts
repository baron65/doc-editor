import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAssetUrl, formatFileSize } from './assetPresentation';

test('管理端预览和用户端阅读使用各自受控资源地址', () => {
  assert.equal(
    buildAssetUrl('10', '20', 'admin'),
    '/api/v1/document-center/admin/documents/10/assets/20',
  );
  assert.equal(
    buildAssetUrl('10', '20', 'published'),
    '/api/v1/document-center/documents/10/assets/20',
  );
});

test('附件大小格式化为易读单位', () => {
  assert.equal(formatFileSize('800'), '800 B');
  assert.equal(formatFileSize('2048'), '2.0 KB');
  assert.equal(formatFileSize(String(3 * 1024 * 1024)), '3.0 MB');
});
