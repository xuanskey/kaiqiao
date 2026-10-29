// S5 构建清单：release 结束时写 site/build-manifest.json，部署前核对“上传的产物确实由当前源码构建、之后没被改过”。
// 不用提交哈希（清单要随产物提交，写哈希会自指）：改为源码内容摘要 + 产物内容摘要。清单放在 site/ 下、
// 上传目录 www.yanghat.cn/ 之外，不会被发布；两个摘要都不包含清单本身。只含摘要、文件数和公开开关，不含任何密钥或环境变量值。
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const SOURCE_PATHS = ['src', 'workers', 'scripts', 'public', 'site/functions', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', '.env.production'];
export const OUTPUT_DIR = 'site/www.yanghat.cn';
export const MANIFEST = 'site/build-manifest.json';

const digest = (root, files) => {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) hash.update(file + '\0' + createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex') + '\n');
  return hash.digest('hex');
};

/** 源码文件：git 已跟踪 + 未忽略的新文件（工作区内容，删除的不算）。 */
export function sourceFiles(root) {
  const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z', '--', ...SOURCE_PATHS], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return [...new Set(out.split('\0').filter(Boolean))].filter((file) => existsSync(path.join(root, file)) && statSync(path.join(root, file)).isFile());
}

/** 产物文件：上传目录下的全部普通文件（wrangler 会上传的就是这些）。 */
export function outputFiles(root) {
  const files = [];
  const walk = (dir) => { for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = `${dir}/${entry.name}`; if (entry.isDirectory()) walk(rel); else if (entry.isFile()) files.push(rel); } };
  walk(OUTPUT_DIR);
  return files;
}

export function publicSwitches(root) {
  const read = (name) => { try { return readFileSync(path.join(root, OUTPUT_DIR, name), 'utf8'); } catch { return ''; } };
  const value = (text) => { const m = text.match(/export default ("[^"]*"|true|false);/); return m ? JSON.parse(m[1]) : null; };
  return { help: value(read('help-config.js')), metrics: value(read('metrics-config.js')), topupOpen: value(read('topup-open.js')) === true };
}

export function buildManifest(root) {
  const source = sourceFiles(root), output = outputFiles(root);
  return { version: 1, sourceDigest: digest(root, source), outputDigest: digest(root, output), files: { source: source.length, output: output.length }, switches: publicSwitches(root) };
}

export function writeManifest(root) {
  const manifest = buildManifest(root);
  writeFileSync(path.join(root, MANIFEST), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

/** 部署前核对；不符就抛错，说明该怎么做。 */
export function verifyManifest(root) {
  let saved;
  try { saved = JSON.parse(readFileSync(path.join(root, MANIFEST), 'utf8')); } catch { throw Error('缺少或无法解析 site/build-manifest.json，请先 npm run release'); }
  const now = buildManifest(root);
  if (saved.version !== 1) throw Error('构建清单版本不对，请重新 release');
  if (saved.sourceDigest !== now.sourceDigest) throw Error('源码在上次 release 之后改过（构建清单的源码摘要不符），请重新 release 并提交产物');
  if (saved.outputDigest !== now.outputDigest) throw Error('发布目录在 release 之后被改过（产物摘要不符），请重新 release 并提交产物');
  if (JSON.stringify(saved.switches) !== JSON.stringify(now.switches)) throw Error('公开开关与构建清单不一致，请重新 release');
  return now;
}
