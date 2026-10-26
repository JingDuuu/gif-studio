/* 构建单文件版本：把 styles.css / gifenc.js / app.js / favicon.svg 内联进一个 HTML。
   运行：node build.js
   产出：dist/表情工坊.html（双击即可离线使用） */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');
const css = read('styles.css');
const gifenc = read('gifenc.js');
const app = read('app.js');
const favicon = read('icons/favicon.svg');

// 1. 内联样式
html = html.replace(
  '<link rel="stylesheet" href="styles.css" />',
  '<style>\n' + css + '\n</style>'
);

// 2. 内联 favicon.svg 为 data URI
const faviconData = 'data:image/svg+xml,' + encodeURIComponent(favicon);
html = html.replace('href="icons/favicon.svg"', 'href="' + faviconData + '"');

// 3. 内联脚本（gifenc 的 CommonJS shim + gifenc + app）
const scriptBlock =
  '<script>\n' +
  'var module = { exports: {} };\n' +
  'var exports = module.exports;\n' +
  gifenc + '\n' +
  app + '\n' +
  '</script>';

html = html.replace(
  /<!-- gifenc[\s\S]*?<\/script>\s*<script src="gifenc\.js"><\/script>\s*<script src="app\.js"><\/script>/,
  scriptBlock
);

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, '表情工坊.html');
fs.writeFileSync(outFile, html, 'utf8');

console.log('已生成单文件：', outFile);
console.log('大小：', (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1), 'KB');
