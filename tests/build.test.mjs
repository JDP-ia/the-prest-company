import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, rm } from 'node:fs/promises';
import { build } from '../scripts/build.mjs';

const output = 'artifacts/build-test';
test('review builds cannot claim a configured endpoint or index an invented domain', async () => {
  await build({ outDir: output, siteUrl: '', formId: '' });
  const html = await readFile(`${output}/index.html`, 'utf8');
  assert.match(html, /noindex, nofollow/);
  assert.match(html, /data-configured="false"/);
  assert.match(html, /not accepting messages yet/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.equal((await readFile(`${output}/robots.txt`, 'utf8')).trim(), 'User-agent: *\nDisallow: /');
  for (const [, ref] of html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)) {
    assert.ok((await stat(`${output}/${ref}`)).isFile(), ref);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'IDs are unique');
  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor));
});
test('configured build supports subdirectory hosting and native form POST', async () => {
  await build({ outDir: output, siteUrl: 'https://example.org/prest', formId: 'testonly' });
  const html = await readFile(`${output}/index.html`, 'utf8');
  assert.match(html, /action="https:\/\/formspree.io\/f\/testonly" data-configured="true"/);
  assert.doesNotMatch(html, /type="submit" disabled/);
  assert.match(html, /rel="canonical" href="https:\/\/example.org\/prest\/"/);
  assert.match(html, /content="https:\/\/example.org\/prest\/assets\/social-preview.png"/);
  assert.match(await readFile(`${output}/sitemap.xml`, 'utf8'), /<loc>https:\/\/example.org\/prest\/<\/loc>/);
});
test('rejects unsafe configuration', async () => {
  await assert.rejects(build({ outDir: output, formId: '<invalid>' }));
  await assert.rejects(build({ outDir: output, siteUrl: 'http://example.org' }));
  await assert.rejects(build({ outDir: output, siteUrl: 'https://example.org/?bad=value' }));
  await assert.rejects(build({ outDir: 'src' }));
});
test('text, focus, and form-rule color pairs meet contrast requirements', () => {
  const luminance = hex => {
    const c = hex.match(/\w\w/g).map(h => parseInt(h, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  };
  for (const [fg, bg, minimum] of [['eeece5','0b0b10',4.5],['aaa8b6','0b0b10',4.5],['c4bfed','191936',4.5],['bcb8d4','191936',4.5],['db9dca','191936',3],['686571','0b0b10',3]]) {
    assert.ok((luminance(fg) + .05) / (luminance(bg) + .05) >= minimum, `${fg} on ${bg}`);
  }
});
test.after(async () => { await rm(output, { recursive: true, force: true }); });
