#!/usr/bin/env node
/**
 * Codemod to fix all @polar-sh imports to local paths
 * Run with: node fix-imports.js
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // UI package imports
  { from: /@polar-sh\/ui\/components\/ui\//g, to: '@/components/ui/' },
  { from: /@polar-sh\/ui\/components\/atoms\//g, to: '@/components/atoms/' },
  { from: /@polar-sh\/ui\/components\/molecules\//g, to: '@/components/molecules/' },
  { from: /@polar-sh\/ui\/lib\//g, to: '@/lib/' },
  { from: /@polar-sh\/ui/g, to: '@/components/ui' },

  // Other packages
  { from: /@polar-sh\/client/g, to: '@/lib/api' },
  { from: /@polar-sh\/currency/g, to: '@/lib/currency' },
  { from: /@polar-sh\/checkout/g, to: '@/components/checkout' },
  { from: /@polar-sh\/orbit/g, to: '@/lib/orbit' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    return 1;
  }

  return 0;
}

function walkDir(dir) {
  let filesFixed = 0;
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        filesFixed += walkDir(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      filesFixed += processFile(filePath);
    }
  });

  return filesFixed;
}

console.log('🔧 Fixing imports...\n');
const srcDir = path.join(__dirname, 'src');
const filesFixed = walkDir(srcDir);
console.log(`\n✅ Fixed ${filesFixed} files!`);
