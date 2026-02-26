const sharp = require('sharp');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'gallery', 'polar-work-style-product.png');

// Canvas: 1920x1080 (16:9)
const W = 1920;
const H = 1080;
const HEADER_H = 72;
const CONTENT_H = H - HEADER_H;

// Layout
const LEFT_W = Math.round(W * 0.32);   // Before area
const DIVIDER_W = 56;                   // Arrow area
const RIGHT_W = W - LEFT_W - DIVIDER_W; // 4-card grid
const CARD_GAP = 12;
const CARD_W = Math.round((RIGHT_W - CARD_GAP * 3) / 2);
const CARD_H = Math.round((CONTENT_H - CARD_GAP * 3) / 2);

function svgText(text, opts) {
  const { w, h, fontSize, fontWeight, fill, bg, bgOpacity, align, fontFamily, letterSpacing, rx } = {
    fontWeight: '700', fill: '#ffffff', bg: '#1a1a1a', bgOpacity: 0.85,
    align: 'middle', fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: 0, rx: 6,
    ...opts
  };
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" rx="${rx}" fill="${bg}" opacity="${bgOpacity}"/>
    <text x="${w/2}" y="${h/2 + fontSize*0.36}"
          font-family="${fontFamily}" font-size="${fontSize}"
          font-weight="${fontWeight}" fill="${fill}" text-anchor="${align}"
          letter-spacing="${letterSpacing}">${text}</text>
  </svg>`);
}

async function run() {
  // ── Header ──
  const headerSvg = Buffer.from(`<svg width="${W}" height="${HEADER_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${HEADER_H}" fill="#1a1a1a"/>
    <text x="${W/2}" y="${HEADER_H/2 + 8}" 
          font-family="Georgia, 'Playfair Display', serif" font-size="28" 
          font-weight="700" fill="#ffffff" text-anchor="middle"
          letter-spacing="6">AI WORK STYLE CONSULTATION</text>
    <text x="${W/2}" y="${HEADER_H/2 + 32}" 
          font-family="Arial, Helvetica, sans-serif" font-size="13" 
          font-weight="400" fill="#c9a962" text-anchor="middle"
          letter-spacing="3">4 PROFESSIONAL OUTFIT VARIATIONS · FACE-PRESERVING AI</text>
  </svg>`);

  // ── Before image ──
  const beforeImg = await sharp(path.join(ROOT, 'public/gallery/before-male.png'))
    .resize(LEFT_W, CONTENT_H, { fit: 'cover', position: 'top' })
    .toBuffer();

  // ── "BEFORE" label ──
  const beforeLabel = svgText('BEFORE', { w: 140, h: 36, fontSize: 16, bg: '#ffffff', fill: '#1a1a1a', bgOpacity: 0.9, letterSpacing: 4 });

  // ── Arrow / divider area ──
  const dividerSvg = Buffer.from(`<svg width="${DIVIDER_W}" height="${CONTENT_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${DIVIDER_W}" height="${CONTENT_H}" fill="#f0efe8"/>
    <circle cx="${DIVIDER_W/2}" cy="${CONTENT_H/2}" r="22" fill="#c9a962"/>
    <polygon points="${DIVIDER_W*0.37},${CONTENT_H/2 - 10} ${DIVIDER_W*0.68},${CONTENT_H/2} ${DIVIDER_W*0.37},${CONTENT_H/2 + 10}" fill="#ffffff"/>
  </svg>`);

  // ── After cards ──
  const afterFiles = [
    { file: 'BeforeAfter/result_male_interview.png', label: 'Best Color' },
    { file: 'BeforeAfter/result_male_luxury.png', label: 'Contrast Color' },
    { file: 'BeforeAfter/result_male_best-match.png', label: 'Harmony Color' },
    { file: 'BeforeAfter/result_male_casual.png', label: 'Off-Duty Commute' },
  ];

  const afterBuffers = [];
  const afterBadges = [];
  for (const af of afterFiles) {
    const buf = await sharp(path.join(ROOT, af.file))
      .resize(CARD_W, CARD_H, { fit: 'cover', position: 'top' })
      .toBuffer();
    afterBuffers.push(buf);
    
    const badgeW = af.label.length * 10 + 32;
    afterBadges.push({
      buffer: svgText(af.label, { w: badgeW, h: 32, fontSize: 14, bg: '#1a1a1a', fill: '#ffffff', bgOpacity: 0.85 }),
      width: badgeW
    });
  }

  // ── Right-side background ──
  const rightBgSvg = Buffer.from(`<svg width="${RIGHT_W}" height="${CONTENT_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${RIGHT_W}" height="${CONTENT_H}" fill="#f0efe8"/>
  </svg>`);

  // ── Background ──
  const bgSvg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#FAFAF8"/>
  </svg>`);

  // ── Grid positions ──
  const gridX = LEFT_W + DIVIDER_W + CARD_GAP;
  const gridY = HEADER_H + CARD_GAP;
  const positions = [
    { x: gridX,                       y: gridY },
    { x: gridX + CARD_W + CARD_GAP,   y: gridY },
    { x: gridX,                       y: gridY + CARD_H + CARD_GAP },
    { x: gridX + CARD_W + CARD_GAP,   y: gridY + CARD_H + CARD_GAP },
  ];

  // ── Compose all ──
  const composites = [
    // Header
    { input: await sharp(headerSvg).png().toBuffer(), left: 0, top: 0 },
    // Right BG
    { input: await sharp(rightBgSvg).png().toBuffer(), left: LEFT_W + DIVIDER_W, top: HEADER_H },
    // Before
    { input: beforeImg, left: 0, top: HEADER_H },
    // Divider + arrow
    { input: await sharp(dividerSvg).png().toBuffer(), left: LEFT_W, top: HEADER_H },
    // Before label
    { input: await sharp(beforeLabel).png().toBuffer(), left: Math.round(LEFT_W/2 - 70), top: H - 52 },
  ];

  // Cards + badges
  for (let i = 0; i < 4; i++) {
    composites.push({
      input: afterBuffers[i],
      left: positions[i].x,
      top: positions[i].y,
    });
    composites.push({
      input: await sharp(afterBadges[i].buffer).png().toBuffer(),
      left: positions[i].x + Math.round((CARD_W - afterBadges[i].width) / 2),
      top: positions[i].y + CARD_H - 44,
    });
  }

  // ── "$3.99" price badge bottom-right ──
  const priceBadge = Buffer.from(`<svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="40" rx="6" fill="#c9a962"/>
    <text x="60" y="27" font-family="Arial, Helvetica, sans-serif" font-size="20" 
          font-weight="800" fill="#ffffff" text-anchor="middle">$3.99</text>
  </svg>`);
  composites.push({
    input: await sharp(priceBadge).png().toBuffer(),
    left: W - 140,
    top: H - 56,
  });

  await sharp(await sharp(bgSvg).png().toBuffer())
    .composite(composites)
    .png()
    .toFile(OUT);

  const stat = require('fs').statSync(OUT);
  const meta = await sharp(OUT).metadata();
  console.log(`Created: ${OUT}`);
  console.log(`Size: ${meta.width}x${meta.height}, ${Math.round(stat.size/1024)}KB`);
}

run().catch(console.error);
