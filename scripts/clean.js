const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', 'dist');

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.lstatSync(p);
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    for (const e of fs.readdirSync(p)) rmrf(path.join(p, e));
    fs.rmdirSync(p);
  } else {
    try { fs.chmodSync(p, 0o666); } catch (_) {}
    fs.unlinkSync(p);
  }
}

try {
  rmrf(target);
  console.log(`clean: removed ${path.relative(process.cwd(), target)} (if existed)`);
  process.exit(0);
} catch (e) {
  console.error('clean: failed', e.message);
  process.exit(1);
}

