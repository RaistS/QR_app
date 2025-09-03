const fs = require('fs');
const path = require('path');

// Reads a PNG and wraps it into a single-image ICO file.
// Accepts any square size (recommended 256x256). No external deps.

const pngPath = path.resolve(__dirname, '..', 'electron', 'icon.png');
const icoPath = path.resolve(__dirname, '..', 'electron', 'icon.ico');

function fail(msg) {
  console.error(`png2ico: ${msg}`);
  process.exit(1);
}

function readPngSize(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 33 || !buf.slice(0, 8).equals(sig)) {
    fail('electron/icon.png is not a valid PNG');
  }
  const ihdrType = buf.slice(12, 16).toString('ascii');
  if (ihdrType !== 'IHDR') fail('PNG missing IHDR header');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width !== height) console.warn('png2ico: PNG is not square; Windows may scale it');
  return { width, height };
}

try {
  if (!fs.existsSync(pngPath)) {
    fail('Missing electron/icon.png. Place your PNG icon there.');
  }
  const png = fs.readFileSync(pngPath);
  const { width, height } = readPngSize(png);

  // ICO header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type icon
  header.writeUInt16LE(1, 4); // image count

  // Directory entry
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);  // width (0 => 256)
  entry.writeUInt8(height >= 256 ? 0 : height, 1); // height (0 => 256)
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count (hint)
  entry.writeUInt32LE(png.length, 8); // bytes in resource
  entry.writeUInt32LE(6 + 16, 12); // image offset

  const ico = Buffer.concat([header, entry, png]);
  fs.writeFileSync(icoPath, ico);
  console.log(`png2ico: Wrote ${path.relative(process.cwd(), icoPath)} (${ico.length} bytes)`);
} catch (e) {
  fail(e.message || String(e));
}

