import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const images = [
  { src: 'hero.png', widths: [800, 1024] },
  { src: 'hairnew.png', widths: [800] },
  { src: 'full.png', widths: [800] },
  { src: 'dailynew.png', widths: [800] },
];

const formats = ['webp', 'avif'];

async function optimizeImages() {
  for (const { src, widths } of images) {
    const inputPath = join(publicDir, src);
    if (!existsSync(inputPath)) {
      console.warn(`⚠ Skipping ${src} — file not found`);
      continue;
    }

    const name = src.replace(/\.\w+$/, '');

    for (const width of widths) {
      for (const format of formats) {
        const outName = `${name}-${width}w.${format}`;
        const outPath = join(publicDir, outName);

        const pipeline = sharp(inputPath).resize(width, null, { withoutEnlargement: true });

        if (format === 'webp') {
          pipeline.webp({ quality: 80 });
        } else {
          pipeline.avif({ quality: 65 });
        }

        await pipeline.toFile(outPath);
        const { size } = await sharp(outPath).metadata().catch(() => ({ size: 0 }));
        const stat = (await import('fs')).statSync(outPath);
        console.log(`✓ ${outName}  (${(stat.size / 1024).toFixed(0)} KB)`);
      }
    }
  }
  console.log('\nDone! Optimized images saved to public/');
}

optimizeImages().catch(console.error);
