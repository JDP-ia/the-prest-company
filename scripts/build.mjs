import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function build({ outDir = 'dist', siteUrl = process.env.SITE_URL || '', formId = process.env.FORMSPREE_FORM_ID || '' } = {}) {
  if (formId && !/^[a-zA-Z0-9]{6,32}$/.test(formId)) throw new Error('FORMSPREE_FORM_ID must be the public form ID, not a URL or key.');
  let url;
  if (siteUrl) {
    url = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /[<>"'&]/.test(siteUrl)) throw new Error('SITE_URL must be a clean HTTPS URL.');
  }
  const dest = resolve(outDir);
  if (dest === resolve('.') || dest === resolve('src')) throw new Error('Unsafe build directory.');
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp('src', dest, { recursive: true });
  let html = await readFile('src/index.html', 'utf8');
  if (formId) {
    html = html.replace('action="#contact" data-configured="false"', `action="https://formspree.io/f/${formId}" data-configured="true"`)
      .replace('The form is not accepting messages yet. Please contact us by email.', 'Inquiries are sent securely through Formspree to The Prest Company.')
      .replace('type="submit" disabled', 'type="submit"');
  }
  if (url) {
    html = html.replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow">')
      .replace('content="./assets/social-preview.png"', `content="${new URL('assets/social-preview.png', url).href}"`)
      .replace('<!-- production-metadata -->', `<link rel="canonical" href="${url.href}">\n  <meta property="og:url" content="${url.href}">`);
    await writeFile(`${dest}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', url).href}\n`);
    await writeFile(`${dest}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.href}</loc></url></urlset>\n`);
  }
  await writeFile(`${dest}/index.html`, html);
  console.log(`Built ${dest}; contact ${formId ? 'configured (verify delivery before launch)' : 'unconfigured'}; indexing ${url ? 'enabled' : 'disabled for review'}.`);
}
if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/build.mjs')) await build();
