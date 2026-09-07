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
async function attempts({ rotating, outcomes, proxy }) {
  const config = {
    get: (key) =>
      ({
        ytdlpProxyRotating: rotating,
        ytdlpProxy: proxy ?? 'http://user:pass@proxy.example:1080',
        ytdlpMaxHeight: 0,
        ytdlpMaxDurationSeconds: 0,
        ytdlpExtractorArgs: '',
      })[key],
  };

  const svc = new YtdlpService(config);
  svc.logger = { log() {}, warn() {}, error() {} };

  const seen = [];
  const proxiesUsed = [];
  svc.runDownload = async (_url, _dir, _tpl, _fmt, _dur, extractorArgs, usedProxy) => {
    const client = extractorArgs.split('=')[1];
    seen.push(client);
    proxiesUsed.push(usedProxy);
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
  return { seen, threw, proxiesUsed };
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

test('rotating gateway: the proxy sequence is shared, not per client', async () => {
  // Six draws for the whole download, then one attempt per remaining client.
  // Per-client instead would be 5 x 6 = 30 round trips.
  const { seen, threw } = await attempts({ rotating: true, outcomes: () => BOT });
  assert.deepEqual(seen, [
    'tv_embedded',
    'tv_embedded',
    'tv_embedded',
    'tv_embedded',
    'tv_embedded',
    'tv_embedded',
    'android_testsuite',
    'android',
    'ios',
    'mweb',
  ]);
  assert.ok(threw);
});

test('rotating gateway: a later draw succeeding ends the download there', async () => {
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

test('a client limitation moves on without spending the proxy sequence', async () => {
  // A missing format follows the request to any IP, so advancing the proxy
  // would just reach the same error. The sequence must still be intact.
  const { seen, threw } = await attempts({
    rotating: true,
    outcomes: (client, n) =>
      client === 'tv_embedded' ? NO_FORMAT
      : client === 'android_testsuite' && n < 6 ? BOT
      : null,
  });
  assert.deepEqual(seen, [
    'tv_embedded',
    ...Array(6).fill('android_testsuite'), // full sequence still available here
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

test('single proxy: diagnosis says there was no fallback, and how to get one', async () => {
  const err = await botCheckFailure({
    rotating: false,
    proxy: `http://user:${SECRET}@static.example:1080`,
  });
  const d = diagnosisOf(err);
  assert.match(d, /only configured exit/);
  assert.match(d, /comma-separated/);
  assert.match(d, /static\.example:1080/);
});

test('rotating gateway: diagnosis steers to a hand-picked list', async () => {
  const err = await botCheckFailure({
    rotating: true,
    proxy: `http://user:${SECRET}@rotate.example:80`,
  });
  const d = diagnosisOf(err);
  assert.match(d, /all 6 draws/);
  assert.match(d, /comma-separated/);
});

test('no proxy: diagnosis says requests leave from the datacenter IP', async () => {
  const err = await botCheckFailure({ rotating: false, proxy: '' });
  assert.match(diagnosisOf(err), /No YTDLP_PROXY is set/);
});

test('a proxy list is walked one address at a time', async () => {
  const list = [
    'http://u:p@a.example:1',
    'http://u:p@b.example:2',
    'http://u:p@c.example:3',
  ].join(',');
  const { seen, proxiesUsed, threw } = await attempts({
    rotating: false,
    proxy: list,
    // Only the third address is usable, whichever order they are shuffled into.
    outcomes: () => BOT,
  });
  // One attempt per address, then on through the client list.
  assert.equal(proxiesUsed.slice(0, 3).filter(Boolean).length, 3);
  assert.equal(new Set(proxiesUsed.slice(0, 3)).size, 3, 'each attempt used a distinct proxy');
  assert.deepEqual(seen.slice(0, 3), ['tv_embedded', 'tv_embedded', 'tv_embedded']);
  assert.ok(threw);
});

test('a working address ends the download and is reused for the title', async () => {
  const list = ['http://u:p@a.example:1', 'http://u:p@b.example:2'].join(',');
  let titleProxy;
  const config = {
    get: (k) => ({ ytdlpProxy: list, ytdlpProxyRotating: false, ytdlpMaxHeight: 0,
      ytdlpMaxDurationSeconds: 0, ytdlpExtractorArgs: '' })[k],
  };
  const svc = new YtdlpService(config);
  svc.logger = { log() {}, warn() {}, error() {} };
  const used = [];
  svc.runDownload = async (_u, _d, _t, _f, _m, _e, proxy) => {
    used.push(proxy);
    if (used.length === 1) throw new Error(BOT); // first address flagged
  };
  svc.cleanPartialDownload = async () => {};
  svc.ensureOutputFile = async () => {};
  svc.fetchTitle = async (_u, _e, proxy) => { titleProxy = proxy; return 'title'; };
  await svc.download('https://youtu.be/x', '/tmp/autoclipr-test/out.mp4');
  assert.equal(used.length, 2);
  assert.equal(titleProxy, used[1], 'title lookup must reuse the address that worked');
});

test('a list diagnosis reports how many exits were actually tried', async () => {
  const list = Array.from({ length: 3 }, (_, i) => `http://u:${SECRET}@h${i}.example:1`).join(',');
  const err = await botCheckFailure({ rotating: false, proxy: list });
  const d = diagnosisOf(err);
  assert.match(d, /all 3 of the 3 configured exits/);
  assert.ok(!d.includes(SECRET), 'password must stay masked in list diagnosis');
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

// ---------------------------------------------------------------------------
// A bad entry in a proxy list
//
// Assembling a long list by find-and-replace leaves placeholders behind. The
// list is shuffled per download, so one bad line fails a random share of
// imports and reads as intermittent rather than as a config error.
// ---------------------------------------------------------------------------

test('a list steps over an entry that refuses credentials', async () => {
  const list = [
    'http://u:p@a.example:1',
    'http://u:p@b.example:2',
    'http://u:p@c.example:3',
  ].join(',');
  const used = [];
  const config = {
    get: (k) => ({ ytdlpProxy: list, ytdlpProxyRotating: false, ytdlpMaxHeight: 0,
      ytdlpMaxDurationSeconds: 0, ytdlpExtractorArgs: '' })[k],
  };
  const svc = new YtdlpService(config);
  svc.logger = { log() {}, warn() {}, error() {} };
  svc.runDownload = async (_u, _d, _t, _f, _m, _e, proxy) => {
    used.push(proxy);
    if (used.length === 1) throw new Error(PROXY_407); // first entry is malformed
  };
  svc.cleanPartialDownload = async () => {};
  svc.ensureOutputFile = async () => {};
  svc.fetchTitle = async () => 'title';

  await svc.download('https://youtu.be/x', '/tmp/autoclipr-test/out.mp4');
  assert.equal(used.length, 2, 'must fall through to the next entry, not abort');
  assert.notEqual(used[0], used[1]);
});

test('a single proxy still aborts on 407 rather than retrying itself', async () => {
  const { seen, threw } = await attempts({
    rotating: false,
    proxy: 'http://u:p@only.example:1',
    outcomes: () => PROXY_407,
  });
  assert.deepEqual(seen, ['tv_embedded']);
  assert.match(threw, /407/);
});

test('a rotating gateway does not re-draw on 407 — same credentials every draw', async () => {
  const { seen, threw } = await attempts({
    rotating: true,
    proxy: 'http://u:p@gateway.example:80',
    outcomes: () => PROXY_407,
  });
  assert.deepEqual(seen, ['tv_embedded']);
  assert.match(threw, /407/);
});

test('407 across a whole list is diagnosed as the value, not one address', async () => {
  const list = ['http://u:p@a.example:1', 'http://u:p@b.example:2'].join(',');
  const config = {
    get: (k) => ({ ytdlpProxy: list, ytdlpProxyRotating: false, ytdlpMaxHeight: 0,
      ytdlpMaxDurationSeconds: 0, ytdlpExtractorArgs: '' })[k],
  };
  const svc = new YtdlpService(config);
  svc.logger = { log() {}, warn() {}, error() {} };
  svc.runDownload = async () => { throw new Error(PROXY_407); };
  svc.cleanPartialDownload = async () => {};
  let err;
  try {
    await svc.download('https://youtu.be/x', '/tmp/autoclipr-test/out.mp4');
  } catch (e) { err = e; }
  assert.match(diagnosisOf(err), /2 configured entries/);
});

test('an unreplaced placeholder is named at boot, per entry', () => {
  // The exact failure seen in production: PASSWORD left in some entries.
  const list = [
    'http://zdsdevdf:realpw@good.example:1',
    'http://zdsdevdf:PASSWORD@bad.example:2',
    'http://zdsdevdf:PASSWORD@worse.example:3',
  ].join(',');
  const errors = [];
  const config = {
    get: (k) => ({ ytdlpProxy: list, ytdlpProxyRotating: false, ytdlpPath: 'yt-dlp' })[k],
  };
  const svc = new YtdlpService(config);
  svc.logger = { log() {}, warn() {}, error: (m) => errors.push(m) };
  svc.validateProxyConfig();

  assert.ok(errors.some((e) => /bad\.example:2.*placeholder/.test(e)), 'names the bad entry');
  assert.ok(errors.some((e) => /worse\.example:3.*placeholder/.test(e)), 'names both bad entries');
  assert.ok(errors.some((e) => /2 of 3 YTDLP_PROXY entries are unusable/.test(e)), 'counts them');
  assert.ok(!errors.some((e) => /good\.example/.test(e)), 'does not flag the valid entry');
});

test('a real credential is never mistaken for a placeholder', () => {
  const errors = [];
  const config = {
    get: (k) => ({ ytdlpProxy: 'http://zdsdevdf:87am3qg9kxk4@h.example:1',
      ytdlpProxyRotating: false, ytdlpPath: 'yt-dlp' })[k],
  };
  const svc = new YtdlpService(config);
  svc.logger = { log() {}, warn() {}, error: (m) => errors.push(m) };
  svc.validateProxyConfig();
  assert.deepEqual(errors, []);
});
