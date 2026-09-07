import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttentionItems,
  describeSignal,
  summarizeAttention,
} from './dashboardAttention.ts';

test('a dead counts signal is treated as a production risk, not an empty board', () => {
  const items = buildAttentionItems(null);

  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'signal');
  assert.equal(items[0].severity, 'unknown');
  assert.equal(items[0].impact, 'Production risk');

  const summary = summarizeAttention(items);
  assert.equal(summary.severity, 'unknown');
  assert.equal(summary.openCount, 0);
  assert.match(summary.headline, /unavailable/i);
});

test('clear queues produce a single calm row, not a blank card', () => {
  const items = buildAttentionItems({
    intake: 0,
    profiles: 0,
    payments: 0,
    moderation: 0, letters: 0 });

  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'clear');
  assert.equal(items[0].severity, 'clear');
  assert.equal(items[0].href, '/profiles/photo-review');
  assert.equal(
    summarizeAttention(items).headline,
    'All queues are clear. Nothing is waiting on staff right now.',
  );
});

test('safety outranks payments, payments outrank OCR review and activation', () => {
  const items = buildAttentionItems({
    intake: 12,
    profiles: 30,
    payments: 3,
    moderation: 1, letters: 0 });

  assert.deepEqual(
    items.map((item) => item.id),
    ['moderation', 'payments', 'intake', 'profiles'],
  );
  assert.deepEqual(
    items.map((item) => item.severity),
    ['critical', 'critical', 'elevated', 'steady'],
  );
  assert.deepEqual(
    items.map((item) => item.impact),
    ['Member safety', 'Activation blocked', 'OCR review', 'Activation pending'],
  );
});

test('a blocked payment queue still sorts above a much larger intake backlog', () => {
  const items = buildAttentionItems({
    intake: 400,
    profiles: 0,
    payments: 1,
    moderation: 0, letters: 0 });

  assert.deepEqual(
    items.map((item) => item.id),
    ['payments', 'intake'],
  );
});

test('row titles stay singular or plural with the count', () => {
  const [single] = buildAttentionItems({
    intake: 0,
    profiles: 0,
    payments: 1,
    moderation: 0, letters: 0 });
  assert.equal(single.title, '1 payment unmatched or in exception');

  const [many] = buildAttentionItems({
    intake: 0,
    profiles: 0,
    payments: 2,
    moderation: 0, letters: 0 });
  assert.equal(many.title, '2 payments unmatched or in exception');
});

test('the headline leads with blocking work and counts the remainder', () => {
  const blocking = summarizeAttention(
    buildAttentionItems({ intake: 4, profiles: 2, payments: 1, moderation: 1, letters: 0 }),
  );
  assert.equal(blocking.severity, 'critical');
  assert.equal(blocking.criticalCount, 2);
  assert.equal(blocking.openCount, 4);
  assert.equal(
    blocking.headline,
    '2 blocking items to clear first, then 2 more queues to work today.',
  );

  const blockingOnly = summarizeAttention(
    buildAttentionItems({ intake: 0, profiles: 0, payments: 1, moderation: 0, letters: 0 }),
  );
  assert.equal(
    blockingOnly.headline,
    '1 blocking item to clear first. Nothing else is waiting on staff.',
  );
});

test('non-blocking work reads as routine, and says so', () => {
  const summary = summarizeAttention(
    buildAttentionItems({ intake: 5, profiles: 0, payments: 0, moderation: 0, letters: 0 }),
  );
  assert.equal(summary.severity, 'elevated');
  assert.equal(summary.criticalCount, 0);
  assert.equal(
    summary.headline,
    '1 queue needs staff today. Nothing is blocking activation.',
  );

  const two = summarizeAttention(
    buildAttentionItems({ intake: 5, profiles: 5, payments: 0, moderation: 0, letters: 0 }),
  );
  assert.equal(
    two.headline,
    '2 queues need staff today. Nothing is blocking activation.',
  );
});

test('signal tones stay quiet unless safety or money is involved', () => {
  assert.deepEqual(describeSignal('moderation', 2), {
    tone: 'critical',
    caption: 'Member safety, review now',
  });
  assert.deepEqual(describeSignal('payments', 2), {
    tone: 'blocked',
    caption: 'Blocking activation',
  });
  assert.equal(describeSignal('intake', 2).tone, 'watch');
  assert.equal(describeSignal('profiles', 200).tone, 'neutral');

  assert.equal(describeSignal('moderation', 0).tone, 'healthy');
  assert.equal(describeSignal('payments', 0).tone, 'healthy');
  assert.equal(describeSignal('intake', 0).tone, 'healthy');
  assert.equal(describeSignal('profiles', 0).tone, 'healthy');
});

test('an unreadable count never renders as a healthy zero', () => {
  for (const kind of ['intake', 'profiles', 'payments', 'moderation'] as const) {
    assert.deepEqual(describeSignal(kind, null), {
      tone: 'unavailable',
      caption: 'Signal unavailable',
    });
  }
});
