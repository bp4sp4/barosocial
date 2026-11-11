// Run with node scripts/optimize-landing-images.mjs. Original assets are retained.
import sharp from 'sharp';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public/optimized');
await mkdir(output, { recursive: true });
const assets = [
  ['section3_03.png', 640, 90],
  ['baro-employment-app.png', 540, 90],
  ...[1, 2, 3, 4, 5].map(i => [`confirm_0${i}.png`, 448, 86]),
  ...['profile2.jpg', 'profile3.jpg', 'profile4.jpg', 'profile05.jpg', 'profile6.jpg', 'profile7.jpg'].map(name => [name, 196, 86]),
  ...['gift02.png', 'process03.png', 'process02.png', 'process04.png', 'allcare_01.png', 'allcare_03.png', 'allcare_04.png'].map(name => [name, 240, 88]),
];
const report = [];
for (const [name, width, quality] of assets) {
  const source = path.join(root, 'public', name);
  const destination = path.join(output, `${path.parse(name).name}.webp`);
  await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(destination);
  const before = (await stat(source)).size;
  const after = (await stat(destination)).size;
  report.push({ source: `/${name}`, optimized: `/optimized/${path.basename(destination)}`, original_bytes: before, optimized_bytes: after });
  console.log(`${name}: ${before} -> ${after} bytes`);
}
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
