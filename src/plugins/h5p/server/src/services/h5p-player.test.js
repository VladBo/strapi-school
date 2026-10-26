const assert = require('node:assert/strict');
const test = require('node:test');

test('renders public H5P content with an acting user and Ukrainian locale', async () => {
  const { renderH5PPlayer } = await import('./h5p-player.mjs');
  const calls = [];
  const player = {
    render: async (...args) => {
      calls.push(args);
      return '<main>H5P</main>';
    },
  };
  const user = { id: 'anonymous', name: 'Anonymous', email: '', type: 'local' };

  const result = await renderH5PPlayer({
    player,
    contentId: '42',
    user,
  });

  assert.equal(result, '<main>H5P</main>');
  assert.deepEqual(calls, [['42', user, 'uk']]);
});
