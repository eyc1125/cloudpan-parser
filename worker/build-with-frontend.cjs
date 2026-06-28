const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const workerSrc = path.join(__dirname, 'src', 'index.js');
const outputFile = path.join(__dirname, 'dist', 'worker-with-frontend.js');

console.log('📦 开始构建 Worker + 前端整合包...');
console.log(`📍 前端目录: ${distDir}`);
console.log(`📍 Worker源码: ${workerSrc}`);

if (!fs.existsSync(distDir)) {
  console.error('❌ 前端 dist 目录不存在，请先构建前端！');
  process.exit(1);
}

if (!fs.existsSync(workerSrc)) {
  console.error('❌ Worker 源码不存在！');
  process.exit(1);
}

function walkDir(dir, baseDir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(filePath, baseDir));
    } else {
      let relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath);
      results.push({ path: relativePath, content: content.toString('base64'), size: content.length });
    }
  }
  return results;
}

function getContentType(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  const types = {
    'html': 'text/html; charset=utf-8',
    'htm': 'text/html; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'mjs': 'application/javascript; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'webp': 'image/webp',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
  };
  return types[ext] || 'application/octet-stream';
}

console.log('📂 扫描静态文件...');
const files = walkDir(distDir, distDir);
console.log(`✅ 找到 ${files.length} 个静态文件`);

let totalSize = 0;
files.forEach(f => {
  totalSize += f.size;
  console.log(`  - ${f.path} (${(f.size / 1024).toFixed(2)} KB)`);
});
console.log(`📊 原始总大小: ${(totalSize / 1024).toFixed(2)} KB`);

console.log('📝 读取 Worker 源码...');
let workerCode = fs.readFileSync(workerSrc, 'utf-8');
console.log(`✅ Worker 源码大小: ${(workerCode.length / 1024).toFixed(2)} KB`);

console.log('🔧 生成静态文件服务代码...');
const staticFilesCode = `
const STATIC_FILES = {
${files.map(f => {
  const contentType = getContentType(f.path);
  return `  '${f.path}': { content: '${f.content}', type: '${contentType}' }`;
}).join(',\n')}
}

function serveStatic(pathname) {
  if (pathname === '/' || pathname === '') {
    pathname = 'index.html'
  }
  if (pathname.startsWith('/')) {
    pathname = pathname.substring(1)
  }
  if (pathname.endsWith('/')) {
    pathname = pathname + 'index.html'
  }
  const file = STATIC_FILES[pathname]
  if (file) {
    const binaryString = atob(file.content)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const isImmutable = pathname.includes('assets/') && !pathname.endsWith('.html')
    const cacheControl = isImmutable 
      ? 'public, max-age=31536000, immutable' 
      : 'public, max-age=300'
    return new Response(bytes, {
      headers: {
        'Content-Type': file.type,
        'Cache-Control': cacheControl,
      },
    })
  }
  return null
}
`;

console.log('🔗 整合 Worker 代码...');

const staticFilesMarker = '// __STATIC_FILES_INSERT_POINT__';
if (workerCode.includes(staticFilesMarker)) {
  console.log('🔄 在标记位置插入静态文件代码...');
  workerCode = workerCode.replace(staticFilesMarker, staticFilesCode.trim());
} else {
  console.log('➕ 在文件开头添加静态文件服务...');
  workerCode = staticFilesCode + '\n' + workerCode;
}

console.log('💾 写入输出文件...');
if (!fs.existsSync(path.dirname(outputFile))) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
}

fs.writeFileSync(outputFile, workerCode, 'utf-8');

const finalSize = fs.statSync(outputFile).size;
console.log('\n🎉 构建完成！');
console.log(`📄 输出文件: ${outputFile}`);
console.log(`📦 静态文件数: ${files.length}`);
console.log(`📊 最终大小: ${(finalSize / 1024).toFixed(2)} KB (${(finalSize / 1024 / 1024).toFixed(2)} MB)`);
console.log(`🚀 可以直接部署到 Cloudflare Workers`);
