import fs from 'node:fs';
import path from 'node:path';

const releaseDir = path.resolve('rust-wasm/target/wasm32-unknown-unknown/release');
const outDir = path.resolve('public/wasm');

fs.mkdirSync(outDir, { recursive: true });

if (fs.existsSync(releaseDir)) {
  for (const file of fs.readdirSync(releaseDir)) {
    if (file.endsWith('.wasm')) {
      const src = path.join(releaseDir, file);
      const dest = path.join(outDir, file);
      fs.copyFileSync(src, dest);
      const sizeKb = (fs.statSync(dest).size / 1024).toFixed(2);
      console.log(`✅ Copied ${file} -> public/wasm/${file} (${sizeKb} KB)`);
    }
  }
}
