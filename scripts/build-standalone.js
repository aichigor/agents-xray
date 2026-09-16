'use strict';
// Produce one portable HTML file. CSP hashes allow only these embedded scripts/styles.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const hash = content => "'sha256-" + crypto.createHash('sha256').update(content).digest('base64') + "'";
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const style = '\n' + fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8') + '\n';
html = html.replace('<link rel="stylesheet" href="src/styles.css">', `<style>${style}</style>`);
const hashes = [];
let embedded = '';
for (const name of ['analyzer', 'demo', 'app']) {
  // Escape the closing tag for a safe HTML raw-text element. Its bytes are hashed below.
  const script = '\n' + fs.readFileSync(path.join(root, `src/${name}.js`), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n';
  hashes.push(hash(script)); embedded += `<script>${script}</script>\n`;
  html = html.replace(`  <script defer src="src/${name}.js"></script>\n`, '');
}
html = html.replace("script-src 'self'; style-src 'self';", `script-src ${hashes.join(' ')}; style-src ${hash(style)};`);
html = html.replace('</body>', embedded + '</body>');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'AGENTS-Xray-Standalone.html'), html);
console.log('Created dist/AGENTS-Xray-Standalone.html');
