#!/usr/bin/env node
/**
 * 生成截图汇总报告 — 单页 HTML，所有截图按顺序排列，支持键盘左右切换。
 * 用法: node scripts/generate-screenshot-report.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'

const RESULTS_DIR = join(import.meta.dirname, '..', 'integration-results')
const SPECS_DIR = join(import.meta.dirname, '..', 'e2e-integration', 'specs')
const OUTPUT = join(import.meta.dirname, '..', 'integration-report', 'gallery.html')

// 从 spec 源码中提取截图文件名→中文描述的映射
function buildScreenshotDescriptions() {
  const map = new Map()
  const specFiles = readdirSync(SPECS_DIR).filter(f => f.endsWith('.spec.ts'))

  for (const specFile of specFiles) {
    const content = readFileSync(join(SPECS_DIR, specFile), 'utf-8')
    const describeMatch = content.match(/test\.describe\("([^"]+)"/)
    const moduleName = describeMatch?.[1] || specFile.replace('.spec.ts', '')

    // 提取所有 screenshot path 和对应的 test.step 名
    const lines = content.split('\n')
    let currentTest = ''
    let currentStep = ''

    for (const line of lines) {
      const testMatch = line.match(/test\("([^"]+)"/)
      if (testMatch) currentTest = testMatch[1]

      const stepMatch = line.match(/test\.step\("([^"]+)"/)
      if (stepMatch) currentStep = stepMatch[1]

      const screenshotMatch = line.match(/path:\s*"integration-results\/([^"]+\.png)"/)
      if (screenshotMatch) {
        const filename = screenshotMatch[1]
        map.set(filename, {
          module: moduleName,
          test: currentTest,
          step: currentStep,
        })
      }
    }
  }
  return map
}

const descriptions = buildScreenshotDescriptions()

const files = readdirSync(RESULTS_DIR)
  .filter(f => f.endsWith('.png'))
  .sort()

const images = files.map(f => {
  const filePath = join(RESULTS_DIR, f)
  const size = statSync(filePath).size
  const data = readFileSync(filePath).toString('base64')
  const desc = descriptions.get(f)
  const label = desc
    ? `【${desc.module}】${desc.test} → ${desc.step}`
    : f.replace('.png', '').replace(/-/g, ' ')
  return { name: label, data, size, file: f }
}).filter(img => img.size > 5000)

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>E2E 集成测试截图报告</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #1a1a2e; color: #e0e0e0; font-family: -apple-system, sans-serif; }
header { padding: 20px 40px; background: #16213e; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
header h1 { font-size: 18px; }
header .stats { font-size: 14px; color: #888; }
.nav { display: flex; gap: 8px; align-items: center; }
.nav button { background: #0f3460; border: 1px solid #555; color: #fff; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.nav button:hover { background: #1a5276; }
.nav span { font-size: 13px; color: #aaa; min-width: 60px; text-align: center; }
.container { max-width: 1400px; margin: 0 auto; padding: 20px; }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 16px; }
.card { background: #16213e; border-radius: 8px; overflow: hidden; border: 1px solid #333; cursor: pointer; transition: transform 0.1s; }
.card:hover { transform: scale(1.01); border-color: #4a9eff; }
.card.active { border-color: #4a9eff; box-shadow: 0 0 12px rgba(74,158,255,0.3); }
.card img { width: 100%; height: 240px; object-fit: cover; object-position: top; }
.card .label { padding: 10px 14px; font-size: 12px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* 全屏查看 */
.lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 200; flex-direction: column; align-items: center; justify-content: center; }
.lightbox.open { display: flex; }
.lightbox img { max-width: 95vw; max-height: 85vh; object-fit: contain; border-radius: 4px; }
.lightbox .title { color: #fff; font-size: 14px; margin-top: 12px; }
.lightbox .close { position: absolute; top: 16px; right: 24px; font-size: 28px; color: #fff; cursor: pointer; }
.lightbox .arrows { position: absolute; top: 50%; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; transform: translateY(-50%); }
.lightbox .arrows button { background: rgba(255,255,255,0.1); border: none; color: #fff; font-size: 32px; padding: 12px 20px; cursor: pointer; border-radius: 4px; }
.lightbox .arrows button:hover { background: rgba(255,255,255,0.2); }
.hint { text-align: center; padding: 12px; color: #666; font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>E2E 集成测试截图报告</h1>
  <div class="stats">${images.length} 张有效截图 / ${files.length} 张总计</div>
  <div class="nav">
    <span>点击放大 | ← → 键切换</span>
  </div>
</header>
<div class="container">
  <div class="gallery">
${images.map((img, i) => `    <div class="card" data-idx="${i}" onclick="openLightbox(${i})">
      <img src="data:image/png;base64,${img.data}" alt="${img.name}" loading="lazy">
      <div class="label">${img.name}</div>
    </div>`).join('\n')}
  </div>
  <div class="hint">共 ${images.length} 张截图 | 按 ESC 关闭大图</div>
</div>

<div class="lightbox" id="lightbox">
  <span class="close" onclick="closeLightbox()">&times;</span>
  <div class="arrows">
    <button onclick="navigate(-1)">&#10094;</button>
    <button onclick="navigate(1)">&#10095;</button>
  </div>
  <img id="lb-img" src="">
  <div class="title" id="lb-title"></div>
</div>

<script>
const images = ${JSON.stringify(images.map(img => ({ name: img.name, data: img.data })))};
let currentIdx = 0;

function openLightbox(idx) {
  currentIdx = idx;
  document.getElementById('lb-img').src = 'data:image/png;base64,' + images[idx].data;
  document.getElementById('lb-title').textContent = (idx + 1) + '/' + images.length + ' — ' + images[idx].name;
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

function navigate(dir) {
  currentIdx = (currentIdx + dir + images.length) % images.length;
  openLightbox(currentIdx);
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (lb.classList.contains('open')) {
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === 'Escape') closeLightbox();
  }
});
</script>
</body>
</html>`

writeFileSync(OUTPUT, html)
console.log(`报告已生成: ${OUTPUT}`)
console.log(`有效截图: ${images.length}/${files.length}`)
