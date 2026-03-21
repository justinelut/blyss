import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

console.log('🔧 Fixing i18n imports...\n');

const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
  ignore: ['**/node_modules/**', '**/.next/**'],
});

let fixedCount = 0;

files.forEach((file) => {
  let content = readFileSync(file, 'utf8');
  let modified = false;

  // Fix @polar-sh/i18n imports
  if (content.includes('@polar-sh/i18n')) {
    content = content.replace(
      /from ['"]@polar-sh\/i18n['"]/g,
      "from '@/lib/i18n'"
    );
    content = content.replace(
      /from ['"]@polar-sh\/i18n\/formatters\/date['"]/g,
      "from '@/lib/i18n/formatters/date'"
    );
    content = content.replace(
      /from ['"]@polar-sh\/i18n\/formatters\/ordinal['"]/g,
      "from '@/lib/i18n/formatters/ordinal'"
    );
    content = content.replace(
      /import type \{ AcceptedLocale \} from ['"]@polar-sh\/i18n['"]/g,
      "import type { AcceptedLocale } from '@/lib/i18n'"
    );
    content = content.replace(
      /import type \{ AcceptedLocale, SupportedLocale \} from ['"]@polar-sh\/i18n['"]/g,
      "import type { AcceptedLocale, SupportedLocale } from '@/lib/i18n'"
    );

    modified = true;
  }

  if (modified) {
    writeFileSync(file, content, 'utf8');
    fixedCount++;
    console.log(`✓ ${file}`);
  }
});

console.log(`\n✅ Fixed ${fixedCount} files!`);
