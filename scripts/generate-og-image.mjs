import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// OG Image: 1200x630
async function generateOGImage() {
  const width = 1200;
  const height = 630;

  // Create gradient background with text overlay
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a1a"/>
          <stop offset="50%" style="stop-color:#2d1f24"/>
          <stop offset="100%" style="stop-color:#1a1a1a"/>
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#d4728c"/>
          <stop offset="50%" style="stop-color:#e8a4b8"/>
          <stop offset="100%" style="stop-color:#d4728c"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Decorative circles -->
      <circle cx="100" cy="100" r="200" fill="rgba(212,114,140,0.05)"/>
      <circle cx="1100" cy="530" r="250" fill="rgba(212,114,140,0.05)"/>

      <!-- Logo area -->
      <text x="600" y="180" font-family="Georgia, serif" font-size="32" fill="#d4728c" text-anchor="middle" letter-spacing="8">PERSONAL STYLIST</text>

      <!-- Main title -->
      <text x="600" y="290" font-family="Georgia, serif" font-size="72" fill="#f5f0eb" text-anchor="middle" font-weight="bold">AI Stylist</text>

      <!-- Subtitle Korean -->
      <text x="600" y="380" font-family="sans-serif" font-size="36" fill="rgba(245,240,235,0.9)" text-anchor="middle">AI가 추천하는 나만의 스타일</text>

      <!-- Features -->
      <text x="600" y="470" font-family="sans-serif" font-size="28" fill="url(#gold)" text-anchor="middle">헤어스타일 5종 + 패션 6종 | 내 얼굴에 바로 적용</text>

      <!-- URL -->
      <text x="600" y="560" font-family="sans-serif" font-size="24" fill="rgba(245,240,235,0.6)" text-anchor="middle">kstylist.cc</text>

      <!-- Border -->
      <rect x="20" y="20" width="1160" height="590" fill="none" stroke="rgba(212,114,140,0.3)" stroke-width="2" rx="10"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(publicDir, 'og-image.png'));

  console.log('og-image.png generated successfully!');
}

generateOGImage().catch(console.error);
