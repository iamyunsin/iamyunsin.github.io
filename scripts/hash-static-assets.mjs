import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const distDir = path.resolve('dist');

/**
 * 固定文件名白名单（必须保持原文件名，与 HTML 一样采用 Cache-Control: no-cache + 304 协商缓存）
 */
const FIXED_ROOT_FILES = new Set([
  'CNAME',
  'favicon.ico',
  'rss.xml',
  'robots.txt',
  'site.webmanifest',
  'site-images/og-default.png',
  'site-images/og-tools-zh.png',
  'site-images/og-tools-en.png',
]);

function isFixedFile(relPath) {
  if (relPath.endsWith('.html') || relPath.endsWith('.xml') || relPath.endsWith('.txt')) {
    return true;
  }
  if (FIXED_ROOT_FILES.has(relPath)) {
    return true;
  }
  // _astro/ 目录已由 Astro/Vite 生成内容 Hash；pagefind/ 目录由 Pagefind 自身管理入口与分片 Hash
  if (relPath.startsWith('_astro/') || relPath.startsWith('pagefind/')) {
    return true;
  }
  return false;
}

function walkFiles(dir, baseDir = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

function shortHash(bufferOrString) {
  return crypto.createHash('sha256').update(bufferOrString).digest('hex').slice(0, 8);
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error('❌ dist directory does not exist. Run astro build first.');
    process.exit(1);
  }

  const allFiles = walkFiles(distDir);
  const urlReplacements = new Map(); // oldUrl -> newUrl

  // Stage 1: 对所有非固定名称的静态资源文件计算内容 Hash 并重命名
  let hashedStaticCount = 0;
  for (const { fullPath, relPath } of allFiles) {
    if (isFixedFile(relPath)) continue;

    const ext = path.extname(relPath);
    if (!ext) continue;

    const dirName = path.posix.dirname(relPath);
    const baseName = path.posix.basename(relPath, ext);

    // 防止重复执行时二次加 Hash
    if (/^[a-f0-9]{8}$/i.test(baseName.split('.').pop() || '')) {
      continue;
    }

    const content = fs.readFileSync(fullPath);
    const hash = shortHash(content);
    const hashedFileName = `${baseName}.${hash}${ext}`;
    const newRelPath = dirName === '.' ? hashedFileName : `${dirName}/${hashedFileName}`;
    const newFullPath = path.join(distDir, newRelPath);

    fs.renameSync(fullPath, newFullPath);
    urlReplacements.set(`/${relPath}`, `/${newRelPath}`);
    hashedStaticCount++;
  }

  // 按旧路径长度降序排列，防止前缀子串误替换
  const sortedStaticEntries = () =>
    Array.from(urlReplacements.entries()).sort((a, b) => b[0].length - a[0].length);

  // Stage 2: 更新 _astro/*.css 与 _astro/*.js 中的静态资源引用，并对发生内容变更的构建产物级联更新其文件名 Hash
  const astroDir = path.join(distDir, '_astro');
  const astroChunkReplacements = new Map();
  let updatedAstroCount = 0;

  if (fs.existsSync(astroDir)) {
    const astroFiles = walkFiles(astroDir, distDir).filter(
      (f) => f.relPath.endsWith('.css') || f.relPath.endsWith('.js')
    );

    for (const { fullPath, relPath } of astroFiles) {
      let text = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      for (const [oldUrl, newUrl] of sortedStaticEntries()) {
        if (text.includes(oldUrl)) {
          text = text.split(oldUrl).join(newUrl);
          modified = true;
        }
      }

      if (modified) {
        updatedAstroCount++;
        const ext = path.extname(relPath);
        const fileName = path.posix.basename(relPath);
        const nameWithoutExt = fileName.slice(0, -ext.length);
        const lastDotIdx = nameWithoutExt.lastIndexOf('.');

        if (lastDotIdx !== -1) {
          const prefix = nameWithoutExt.slice(0, lastDotIdx);
          const newHash = shortHash(text);
          const newFileName = `${prefix}.${newHash}${ext}`;
          const newRelPath = `_astro/${newFileName}`;
          const newFullPath = path.join(distDir, newRelPath);

          fs.writeFileSync(fullPath, text, 'utf8');
          if (newFullPath !== fullPath) {
            fs.renameSync(fullPath, newFullPath);
            urlReplacements.set(`/${relPath}`, `/${newRelPath}`);
            astroChunkReplacements.set(fileName, newFileName);
          }
        } else {
          fs.writeFileSync(fullPath, text, 'utf8');
        }
      }
    }

    // 如果有 _astro/*.js 分片被重命名，同步更新其它 _astro/*.js 内部对该分片的引用
    if (astroChunkReplacements.size > 0) {
      const currentAstroJsFiles = walkFiles(astroDir, distDir).filter((f) =>
        f.relPath.endsWith('.js')
      );
      for (const { fullPath } of currentAstroJsFiles) {
        let text = fs.readFileSync(fullPath, 'utf8');
        let changed = false;
        for (const [oldName, newName] of astroChunkReplacements.entries()) {
          if (text.includes(oldName)) {
            text = text.split(oldName).join(newName);
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(fullPath, text, 'utf8');
        }
      }
    }
  }

  // Stage 3: 更新所有 HTML 与 XML 文件中的资源引用路径
  const finalFiles = walkFiles(distDir).filter(
    (f) => f.relPath.endsWith('.html') || f.relPath.endsWith('.xml')
  );
  let updatedHtmlCount = 0;
  const allEntries = sortedStaticEntries();

  for (const { fullPath } of finalFiles) {
    let text = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    for (const [oldUrl, newUrl] of allEntries) {
      if (text.includes(oldUrl)) {
        text = text.split(oldUrl).join(newUrl);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(fullPath, text, 'utf8');
      updatedHtmlCount++;
    }
  }

  console.log(
    `✅ Asset hashing complete: ${hashedStaticCount} static assets hashed, ${updatedAstroCount} _astro bundles updated, ${updatedHtmlCount} HTML/XML pages updated.`
  );
}

main();
