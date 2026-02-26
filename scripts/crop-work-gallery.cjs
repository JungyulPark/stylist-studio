const sharp = require('sharp');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GALLERY = path.join(ROOT, 'public', 'gallery');

async function cropQuadrant(inputFile, outputFile, quadrant, labelCropPx) {
  const meta = await sharp(inputFile).metadata();
  const w = meta.width;
  const h = meta.height;
  
  // Calculate quadrant positions (2x2 grid with small gap)
  const gap = Math.round(w * 0.015); // ~1.5% gap
  const cellW = Math.floor((w - gap) / 2);
  const cellH = Math.floor((h - gap) / 2);
  
  let left, top;
  switch(quadrant) {
    case 'tl': left = 0; top = 0; break;
    case 'tr': left = cellW + gap; top = 0; break;
    case 'bl': left = 0; top = cellH + gap; break;
    case 'br': left = cellW + gap; top = cellH + gap; break;
  }
  
  // Crop the quadrant, trimming label text from bottom
  const cropH = cellH - labelCropPx;
  
  await sharp(inputFile)
    .extract({ left, top, width: Math.min(cellW, w - left), height: Math.min(cropH, h - top) })
    .toFile(outputFile);
  
  const outMeta = await sharp(outputFile).metadata();
  console.log(`${path.basename(outputFile)}: ${outMeta.width}x${outMeta.height}`);
}

async function run() {
  // Lawyer grid (102521): 638x887
  // Crop each quadrant, remove ~30px label at bottom
  const lawyer = path.join(GALLERY, '20260226_102521.png');
  await cropQuadrant(lawyer, path.join(GALLERY, 'work-lawyer-1.png'), 'tl', 28);
  await cropQuadrant(lawyer, path.join(GALLERY, 'work-lawyer-2.png'), 'tr', 28);
  await cropQuadrant(lawyer, path.join(GALLERY, 'work-lawyer-offduty.png'), 'br', 28);

  // Nurse grid (102314): 643x911
  const nurse = path.join(GALLERY, '20260226_102314.png');
  await cropQuadrant(nurse, path.join(GALLERY, 'work-nurse-1.png'), 'tl', 28);
  await cropQuadrant(nurse, path.join(GALLERY, 'work-nurse-2.png'), 'tr', 28);
  await cropQuadrant(nurse, path.join(GALLERY, 'work-nurse-offduty.png'), 'br', 28);

  // Copy before photos with shorter names
  const manBefore = path.join(GALLERY, 'jungyul_park_Full_body_photo_of_a_fit_Caucasian_man_age_28-32_48787911-2de0-4a4c-8de6-49869345c4a9_1.png');
  const womanBefore = path.join(GALLERY, 'jungyul_park_Full_body_photo_of_an_elegant_mixed-race_woman_E_e15c7e2d-fa09-4547-aa4f-6a1c0434e508_2.png');
  const doctorAfter = path.join(GALLERY, '다운로드.png');

  await sharp(manBefore).resize(800, 1000, { fit: 'cover', position: 'top' }).toFile(path.join(GALLERY, 'before-male-work.png'));
  await sharp(womanBefore).resize(800, 1000, { fit: 'cover', position: 'top' }).toFile(path.join(GALLERY, 'before-female-work.png'));
  await sharp(doctorAfter).resize(800, 1000, { fit: 'cover', position: 'top' }).toFile(path.join(GALLERY, 'work-doctor-1.png'));
  
  console.log('before-male-work.png: 800x1000');
  console.log('before-female-work.png: 800x1000');
  console.log('work-doctor-1.png: 800x1000');
  console.log('Done!');
}

run().catch(console.error);
