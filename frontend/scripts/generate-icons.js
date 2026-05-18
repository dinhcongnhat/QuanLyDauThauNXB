#!/usr/bin/env node
'use strict';

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const SRC = path.join(__dirname, '..', 'public', 'logo.png');
const DST_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  if (!fs.existsSync(SRC)) {
    console.error('logo.png not found at:', SRC);
    process.exit(1);
  }

  fs.mkdirSync(DST_DIR, { recursive: true });

  const image = sharp(SRC);

  for (const size of SIZES) {
    const outPath = path.join(DST_DIR, `icon-${size}x${size}.png`);
    await image
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(outPath);
    console.log(`Generated ${outPath}`);
  }

  console.log('All icons generated successfully.');
}

generateIcons().catch(console.error);
