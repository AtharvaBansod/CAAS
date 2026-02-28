import { promises as fs } from 'fs';
import path from 'path';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx']);
const violations = [];

const hardColorRegex = /#[0-9a-fA-F]{3,8}\b/g;
const hardRadiusRegex = /\brounded-\[(?!var\(--radius\))/g;
const hardShadowRegex = /\bshadow-\[[^\]]+\]/g;

async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walk(fullPath);
            continue;
        }
        if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
            continue;
        }
        const content = await fs.readFile(fullPath, 'utf8');
        checkFile(fullPath, content);
    }
}

function checkFile(filePath, content) {
    for (const regex of [hardColorRegex, hardRadiusRegex, hardShadowRegex]) {
        let match;
        while ((match = regex.exec(content)) !== null) {
            violations.push({
                file: filePath,
                token: match[0],
            });
        }
    }
}

await walk(SRC_ROOT);

if (violations.length > 0) {
    console.error('Design token lint failed. Found raw style tokens:');
    for (const violation of violations) {
        console.error(`- ${violation.file}: ${violation.token}`);
    }
    process.exit(1);
}

console.log('Design token lint passed.');
