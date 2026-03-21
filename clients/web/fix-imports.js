const fs = require('fs');
const path = require('path');

// Import mappings from clients/apps/web to clients/web
const importMappings = {
  '@polar-sh/client': '@/lib/api',
  '@polar-sh/ui/components/atoms/Button': '@/components/atoms/Button',
  '@polar-sh/ui/components/atoms/': '@/components/atoms/',
  '@polar-sh/ui/components/molecules/': '@/components/molecules/',
  '@polar-sh/ui/components/ui/checkbox': '@/components/ui/checkbox',
  '@polar-sh/ui/components/ui/label': '@/components/ui/label',
  '@polar-sh/ui/components/ui/sheet': '@/components/ui/sheet',
  '@polar-sh/ui/components/ui/slider': '@/components/ui/slider',
  '@polar-sh/ui/components/ui/': '@/components/ui/',
  '@polar-sh/ui/hooks': '@/hooks',
  'from \'@polar-sh/client\'': 'from \'@/lib/api\'',
  'from "@polar-sh/client"': 'from "@/lib/api"',
};

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace imports
  for (const [oldImport, newImport] of Object.entries(importMappings)) {
    const regex = new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (content.includes(oldImport)) {
      content = content.replace(regex, newImport);
      modified = true;
    }
  }

  // Fix schemas import specifically
  if (content.includes('schemas') && content.includes('@/lib/api')) {
    // Already correct
  } else if (content.includes('schemas') && content.includes('@polar-sh/client')) {
    content = content.replace(
      /import\s*{\s*schemas\s*}\s*from\s*['"]@polar-sh\/client['"]/g,
      "import { schemas } from '@/lib/api'"
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed imports in: ${filePath}`);
    return true;
  }
  return false;
}

function walkDirectory(dir, fileExtensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        fixedCount += walkDirectory(filePath, fileExtensions);
      }
    } else if (fileExtensions.some(ext => file.endsWith(ext))) {
      if (fixImports(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

// Run the codemod
const targetDirs = [
  path.join(__dirname, 'src/app'),
  path.join(__dirname, 'src/components'),
  path.join(__dirname, 'src/hooks'),
  path.join(__dirname, 'src/stores'),
];

console.log('Starting import fix codemod...\n');

let totalFixed = 0;
for (const dir of targetDirs) {
  if (fs.existsSync(dir)) {
    console.log(`Processing: ${dir}`);
    totalFixed += walkDirectory(dir);
  }
}

console.log(`\n✓ Fixed imports in ${totalFixed} files`);
