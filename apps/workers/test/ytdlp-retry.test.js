/**
 * Attempt-sequencing for YtdlpService.download().
 *
 * The loop decides two things that are easy to get quietly wrong: which
 * failures deserve a fresh exit IP, and how many attempts the whole download
 * may spend. Both are invisible in production — a mistake shows up only as
 * imports that fail sooner than they should, or as a user waiting through
 * twenty round trips — so they are pinned here.
 *
 * Runs against dist/ rather than the TypeScript source so it exercises the
 * shipped artifact, and needs no test framework: `node --test`.
 */
const test = require('node:test');
const assert = require('node:assert');
const { YtdlpService } = require('../dist/pipeline/ytdlp.service.js');

const BOT = 'ERROR: [youtube] x: Sign in to confirm you’re not a bot.';
const RATE_LIMIT = 'ERROR: [youtube] x: HTTP Error 429: Too Many Requests';
const NO_FORMAT = 'ERROR: [youtube] x: Requested format is not available.';
const UNAVAILABLE = 'ERROR: [youtube] x: This video is unavailable';
const PROXY_407 = 'ERROR: unable to connect to proxy: 407 Proxy Authentication Required';

/**
 * Drive a real service instance, recording the client of every attempt.
 * `outcomes(client, nthAttemptAtThatClient)` returns an error string to fail
 * that attempt, or null to let it succeed.
 */
async function attempts({ rotating, outcomes }) {
  const config = {
    get: (key) =>
      ({
        ytdlpProxyRotating: rotating,
        ytdlpProxy: 'http://user:pass@proxy.example:1080',
        ytdlpMaxHeight: 0,
        ytdlpMaxDurationSeconds: 0,
        ytdlpExtractorArgs: '',
      })[key],
  };

  const svc = new YtdlpService(config);
  svc.logger = { log() {}, warn() {}, error() {} };

  const seen = [];
  svc.runDownload = async (_url, _dir, _tpl, _fmt, _dur, extractorArgs) => {
    const client = extractorArgs.split('=')[1];
    seen.push(client);
    const failure = outcomes(client, seen.filter((c) => c === client).length);
    if (failure) throw new Error(failure);
  };
  svc.cleanPartialDownload = async () => {};
  svc.ensureOutputFile = async () => {};
  svc.fetchTitle = async () => 'title';

  let threw = null;
  try {
    await svc.download('https://youtu.be/x', '/tmp/autoclipr-test/out.mp4');
  } catch (err) {
    threw = err.message;
  }
  return { seen, threw };
}

test('a working first client costs exactly one attempt', async () => {
  const { seen, threw } = await attempts({ rotating: true, outcomes: () => null });
  assert.deepEqual(seen, ['tv_embedded']);
  assert.equal(threw, null);
});

test('static proxy: a bot check does not re-draw, it moves on', async () => {
  // Retrying one flagged IP was measured to fail identically every time, so
  // spending attempts on it would only add delay.
  const { seen, threw } = await attempts({ rotating: false, outcomes: () => BOT });
  assert.deepEqual(seen, ['tv_embedded', 'android_testsuite', 'android', 'ios', 'mweb']);
  assert.ok(threw);
});

test('rotating proxy: the IP budget is shared, not per client', async () => {
  // Three re-draws for the whole download, then one attempt per remaining
  // client. Per-client instead would be 5 x 4 = 20 round trips.
  const { seen, threw } = await attempts({ rotating: true, outcomes: () => BOT });
  assert.deepEqual(seen, [
    'tv_embedded',
    'tv_embedded',
    'tv_embedded',
    'tv_embedded',
    'android_testsuite',
    'android',
    'ios',
    'mweb',
  ]);
  assert.equal(seen.length, 8);
  assert.ok(threw);
});

test('rotating proxy: a later IP succeeding ends the download there', async () => {
  const { seen, threw } = await attempts({
    rotating: true,
    outcomes: (client, n) => (client === 'tv_embedded' && n < 3 ? BOT : null),
  });
  // Still the best client — falling through to android would have cost quality.
  assert.deepEqual(seen, ['tv_embedded', 'tv_embedded', 'tv_embedded']);
  assert.equal(threw, null);
});

test('rate limiting also counts as a flagged IP', async () => {
  const { seen } = await attempts({
    rotating: true,
    outcomes: (client, n) => (client === 'tv_embedded' && n === 1 ? RATE_LIMIT : null),
  });
  assert.deepEqual(seen, ['tv_embedded', 'tv_embedded']);
});

test('a client limitation moves on without spending the IP budget', async () => {
  // A missing format follows the request to any IP, so re-drawing would just
  // reach the same error. The budget must still be intact afterwards.
  const { seen, threw } = await attempts({
    rotating: true,
    outcomes: (client) =>
      client === 'tv_embedded' ? NO_FORMAT : client === 'android_testsuite' ? BOT : null,
  });
  assert.deepEqual(seen, [
    'tv_embedded',
    'android_testsuite', // bot check here still had all three re-draws
    'android_testsuite',
    'android_testsuite',
    'android_testsuite',
    'android',
  ]);
  assert.equal(threw, null);
});

test('an unavailable video aborts on the first attempt', async () => {
  const { seen, threw } = await attempts({ rotating: true, outcomes: () => UNAVAILABLE });
  assert.deepEqual(seen, ['tv_embedded']);
  assert.ok(threw);
});

test('a rejected proxy aborts rather than working through the client list', async () => {
  const { seen, threw } = await attempts({ rotating: true, outcomes: () => PROXY_407 });
  assert.deepEqual(seen, ['tv_embedded']);
  assert.match(threw, /407/);
});

// ---------------------------------------------------------------------------
// Diagnosis attached to the thrown error
//
// The customer-facing message is identical in every one of these cases by
// design, so the diagnosis is the only thing that tells a flagged IP apart
// from an undeployed worker. It rides on the error to reach the failure event.
// ---------------------------------------------------------------------------

const { diagnosisOf } = require('../dist/pipeline/pipeline-error.util.js');

const SECRET = 'sup3rs3cret';

async function botCheckFailure({ rotating, proxy }) {
  const config = {
    get: (key) =>
      ({
        ytdlpProxyRotating: rotating,
        ytdlpProxy: proxy,
        ytdlpMaxHeight: 0,
        ytdlpMaxDurationSeconds: 0,
        ytdlpExtractorArgs: '',
      })[key],
  };
  const svc = new YtdlpService(config);
  svc.logger = { log() {}, warn() {}, error() {} };
  svc.runDownload = async () => {
    throw new Error(BOT);
  };
  svc.cleanPartialDownload = async () => {};
  try {
    await svc.download('https://youtu.be/x', '/tmp/autoclipr-test/out.mp4');
  } catch (err) {
    return err;
  }
  throw new Error('expected the download to fail');
}

test('static proxy: diagnosis names the single flagged IP and both env vars', async () => {
  const err = await botCheckFailure({
    rotating: false,
    proxy: `http://user:${SECRET}@static.example:1080`,
  });
  const d = diagnosisOf(err);
  assert.match(d, /single exit IP/);
  assert.match(d, /YTDLP_PROXY_ROTATING=true/);
  assert.match(d, /static\.example:1080/);
});

test('rotating proxy: diagnosis says the pool is burned, not one address', async () => {
  const err = await botCheckFailure({
    rotating: true,
    proxy: `http://user:${SECRET}@rotate.example:80`,
  });
  const d = diagnosisOf(err);
  assert.match(d, /pool is flagged/);
  assert.match(d, /residential/);
  // Says how many distinct IPs were actually drawn, so the claim is checkable.
  assert.match(d, /all 4 exit IPs/);
});

test('no proxy: diagnosis says requests leave from the datacenter IP', async () => {
  const err = await botCheckFailure({ rotating: false, proxy: '' });
  assert.match(diagnosisOf(err), /No YTDLP_PROXY is set/);
});

test('the diagnosis never leaks proxy credentials', async () => {
  for (const rotating of [true, false]) {
    const err = await botCheckFailure({
      rotating,
      proxy: `http://admin:${SECRET}@host.example:1080`,
    });
    assert.ok(!diagnosisOf(err).includes(SECRET), `password leaked (rotating=${rotating})`);
    assert.ok(!diagnosisOf(err).includes('admin'), `username leaked (rotating=${rotating})`);
  }
});

test('the customer-facing message carries no diagnosis detail', async () => {
  const err = await botCheckFailure({
    rotating: false,
    proxy: `http://user:${SECRET}@static.example:1080`,
  });
  assert.match(err.message, /YouTube blocked the download/);
  assert.ok(!err.message.includes('static.example'));
  assert.ok(!err.message.includes(SECRET));
});

test('failures with no operator insight to add carry no diagnosis', async () => {
  const { threw } = await attempts({ rotating: true, outcomes: () => UNAVAILABLE });
  assert.ok(threw);
  const err = await (async () => {
    const config = { get: (k) => ({ ytdlpProxy: '', ytdlpProxyRotating: false })[k] };
    const svc = new YtdlpService(config);
    svc.logger = { log() {}, warn() {}, error() {} };
    svc.runDownload = async () => {
      throw new Error(UNAVAILABLE);
    };
    svc.cleanPartialDownload = async () => {};
    try {
      await svc.download('https://youtu.be/x', '/tmp/autoclipr-test/out.mp4');
    } catch (e) {
      return e;
    }
  })();
  assert.equal(diagnosisOf(err), undefined);
});
