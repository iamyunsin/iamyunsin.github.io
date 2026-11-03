import fs from 'node:fs';
import path from 'node:path';

const SITE_HOST = 'yunsin.top';
const SITE_ORIGIN = `https://${SITE_HOST}`;
const INDEXNOW_KEY = '8f4b2e91c6d347a5b0e2f19483c7a6d1';
const SITEMAP_FILE = path.resolve('dist', 'sitemap-0.xml');

function extractUrlsFromSitemap(xmlPath) {
  if (!fs.existsSync(xmlPath)) {
    throw new Error(`Sitemap not found at ${xmlPath}. Run "pnpm run build" first.`);
  }
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const urls = [];
  const regex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  return Array.from(new Set(urls));
}

async function pushIndexNow(urls) {
  const endpoint = 'https://api.indexnow.org/indexnow';
  const payload = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  console.log(`🚀 [IndexNow] Submitting ${urls.length} URLs to Bing / Yandex / Naver / AI Search...`);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (res.status === 200 || res.status === 202) {
    console.log(`✅ [IndexNow] Accepted (HTTP ${res.status}) — ${urls.length} URLs queued for instant crawl!`);
  } else {
    const body = await res.text().catch(() => '');
    console.warn(`⚠️ [IndexNow] Returned HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function pushBaidu(urls) {
  const token = (process.env.BAIDU_PUSH_TOKEN || '').trim();
  if (!token) {
    console.log(
      'ℹ️ [Baidu Push] Skipped: BAIDU_PUSH_TOKEN env/secret is not configured yet. ' +
        'Add BAIDU_PUSH_TOKEN in GitHub Repository Secrets after verifying Baidu Ziyuan Platform.'
    );
    return;
  }

  // 百度单次普通收录推送建议优先推送中文核心页与首页/博客，避免超出新站每日配额（新站有时每日限额 10~100 条）
  const priorityZhUrls = urls.filter((u) => !u.includes('/en/tools/'));
  const batchLimit = Number(process.env.BAIDU_DAILY_LIMIT || 100);
  const targetUrls = priorityZhUrls.slice(0, batchLimit);

  const endpoint = `http://data.zz.baidu.com/urls?site=${SITE_ORIGIN}&token=${encodeURIComponent(token)}`;
  console.log(`🚀 [Baidu Push] Submitting ${targetUrls.length} priority Chinese URLs to Baidu Ziyuan...`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: targetUrls.join('\n'),
  });

  const bodyText = await res.text().catch(() => '');
  if (res.ok) {
    console.log(`✅ [Baidu Push] Success: ${bodyText}`);
  } else {
    console.warn(
      `⚠️ [Baidu Push] HTTP ${res.status}: ${bodyText} (If error is "over quota", your daily new-site quota was reached — priority URLs will retry next deploy)`
    );
  }
}

async function main() {
  const urls = extractUrlsFromSitemap(SITEMAP_FILE);
  // 补充协议文件自身也可被发现
  console.log(`📦 Loaded ${urls.length} canonical URLs from dist/sitemap-0.xml`);

  try {
    await pushIndexNow(urls);
  } catch (err) {
    console.warn(`⚠️ [IndexNow] Network error: ${err?.message || err}`);
  }

  try {
    await pushBaidu(urls);
  } catch (err) {
    console.warn(`⚠️ [Baidu Push] Network error: ${err?.message || err}`);
  }
}

main();
