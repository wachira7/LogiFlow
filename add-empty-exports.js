const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (file === 'node_modules') return; // Skip node_modules directory entirely
      walk(filepath);
    } else if ((filepath.endsWith('.ts') || filepath.endsWith('.tsx')) && fs.statSync(filepath).size === 0) {
      fs.writeFileSync(filepath, 'export {};\n');
      console.log('Added export to', filepath);
    }
  });
}

walk('./frontend');