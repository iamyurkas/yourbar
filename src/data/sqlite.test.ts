import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, query, withWriteTransactionAsync } from './sqlite';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('reads wait for writes', async () => {
  await initDatabase();
  const events: string[] = [];
  let signalWriteStart: () => void;
  const writeStarted = new Promise<void>((res) => (signalWriteStart = res));

  const write = withWriteTransactionAsync(async () => {
    signalWriteStart();
    events.push('write-start');
    await delay(100);
    events.push('write-end');
  });

  await writeStarted; // ensure write has begun
  const read1 = query('SELECT 1').then(() => events.push('read-1'));
  const read2 = query('SELECT 1').then(() => events.push('read-2'));
  await Promise.all([read1, read2, write]);

  assert.deepEqual(events, ['write-start', 'write-end', 'read-1', 'read-2']);
});

test('write transactions are sequential', async () => {
  await initDatabase();
  const events: string[] = [];
  const t1 = withWriteTransactionAsync(async () => {
    events.push('t1-start');
    await delay(50);
    events.push('t1-end');
  });
  const t2 = withWriteTransactionAsync(async () => {
    events.push('t2-start');
    await delay(10);
    events.push('t2-end');
  });
  await Promise.all([t1, t2]);
  assert.deepEqual(events, ['t1-start', 't1-end', 't2-start', 't2-end']);
});
