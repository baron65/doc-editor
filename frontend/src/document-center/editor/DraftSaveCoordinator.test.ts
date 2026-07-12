import assert from 'node:assert/strict';
import test from 'node:test';
import { DraftSaveCoordinator } from './DraftSaveCoordinator';

test('保存过程中新增快照时，只串行保存首个和最新快照', async () => {
  const saved: string[] = [];
  const resolvers: Array<() => void> = [];
  const coordinator = new DraftSaveCoordinator<string>(
    (snapshot) => new Promise<void>((resolve) => {
      saved.push(snapshot);
      resolvers.push(resolve);
    }),
  );

  coordinator.enqueue('v1');
  coordinator.enqueue('v2');
  coordinator.enqueue('v3');
  assert.deepEqual(saved, ['v1']);

  resolvers.shift()?.();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(saved, ['v1', 'v3']);

  resolvers.shift()?.();
  await coordinator.flush();
  assert.equal(coordinator.hasPendingWork(), false);
});

test('保存失败会拒绝 flush，并保留最后失败快照供重试', async () => {
  let shouldFail = true;
  const saved: string[] = [];
  const coordinator = new DraftSaveCoordinator<string>(async (snapshot) => {
    saved.push(snapshot);
    if (shouldFail) {
      throw new Error('network');
    }
  });

  coordinator.enqueue('draft');
  await assert.rejects(coordinator.flush(), /network/);
  assert.equal(coordinator.hasPendingWork(), true);

  shouldFail = false;
  await coordinator.retry();
  assert.deepEqual(saved, ['draft', 'draft']);
  assert.equal(coordinator.hasPendingWork(), false);
});
