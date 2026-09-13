/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
/**
 * Validates that every t('...') call in source code has a corresponding
 * entry in the locale files. Unlike sync-i18n.mjs (which only compares
 * locale files against each other), this script scans the actual source
 * code to detect code→locale gaps.
 *
 * Exits with code 1 if any missing keys are found.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')
const LOCALES = path.join(SRC, 'i18n', 'locales')
const STATIC_KEYS_FILE = path.join(SRC, 'i18n', 'static-keys.ts')

// Directories and file patterns to skip
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'coverage-tests', '.cache'])
const SKIP_SUFFIXES = ['.test.ts', '.test.tsx', '.d.ts']

// Regex to extract t('...') and t("...") call arguments
const T_CALL_SINGLE = /\bt\(\s*'([^']+)'\s*[),]/g
const T_CALL_DOUBLE = /\bt\(\s*"([^"]+)"\s*[),]/g

// Regex to extract STATIC_I18N_KEYS entries from static-keys.ts
const STATIC_KEY_RE = /^\s*'([^']+)'/gm

function shouldSkip(dirPath, fileName) {
  for (const skip of SKIP_DIRS) {
    if (dirPath.includes(skip)) return true
  }
  for (const suffix of SKIP_SUFFIXES) {
    if (fileName.endsWith(suffix)) return true
  }
  return false
}

function isNoiseKey(key) {
  if (key.length < 3) return true
  if (/^\d+$/.test(key)) return true
  if (key.startsWith('/api/') || key.startsWith('http')) return true
  // Skip template-literal fragments (contain ${)
  if (key.includes('${')) return true
  return false
}

async function loadLocaleKeys() {
  const raw = await fs.readFile(path.join(LOCALES, 'en.json'), 'utf8')
  const json = JSON.parse(raw)
  const trans = json.translation ?? json
  return new Set(Object.keys(trans))
}

async function loadStaticKeys() {
  const raw = await fs.readFile(STATIC_KEYS_FILE, 'utf8')
  const keys = new Set()
  for (const match of raw.matchAll(STATIC_KEY_RE)) {
    keys.add(match[1])
  }
  return keys
}

async function* walkSource(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* walkSource(fullPath)
    } else if (
      entry.name.endsWith('.tsx') ||
      entry.name.endsWith('.ts') ||
      entry.name.endsWith('.jsx')
    ) {
      if (shouldSkip(fullPath, entry.name)) continue
      yield fullPath
    }
  }
}

async function extractKeysFromFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const keys = new Set()
  for (const re of [T_CALL_SINGLE, T_CALL_DOUBLE]) {
    re.lastIndex = 0
    for (const match of raw.matchAll(re)) {
      keys.add(match[1])
    }
  }
  return keys
}

async function main() {
  const localeKeys = await loadLocaleKeys()
  const staticKeys = await loadStaticKeys()

  // Collect all t() keys from source code
  const sourceKeys = new Map() // key -> [files]

  for await (const filePath of walkSource(SRC)) {
    const keys = await extractKeysFromFile(filePath)
    for (const key of keys) {
      if (isNoiseKey(key)) continue
      if (!sourceKeys.has(key)) sourceKeys.set(key, [])
      const rel = path.relative(ROOT, filePath)
      sourceKeys.get(key).push(rel)
    }
  }

  // Check which source keys are missing from locale files
  const missing = []
  for (const [key, files] of sourceKeys) {
    // Static keys are dynamic — they may not appear as literal t() calls,
    // but if they do appear as literals, they should still be in locale files.
    // Only skip the check if the key is in STATIC_I18N_KEYS AND not found as
    // a literal in source. Since we're iterating over literal-found keys,
    // we check all of them.
    if (!localeKeys.has(key)) {
      missing.push({ key, files })
    }
  }

  // Also check static keys that are missing from locale files
  for (const key of staticKeys) {
    if (!localeKeys.has(key) && !sourceKeys.has(key)) {
      missing.push({ key, files: ['(static-keys.ts)'] })
    }
  }

  if (missing.length === 0) {
    console.log('✅ i18n check passed: all t() keys exist in locale files.')
    process.exit(0)
  }

  missing.sort((a, b) => a.key.localeCompare(b.key))

  console.log(`❌ i18n check failed: ${missing.length} key(s) missing from locale files.\n`)
  console.log('Missing keys (key → used in):')
  for (const { key, files } of missing) {
    console.log(`  "${key}"`)
    for (const f of files.slice(0, 3)) {
      console.log(`    → ${f}`)
    }
    if (files.length > 3) {
      console.log(`    ... and ${files.length - 3} more`)
    }
  }
  console.log('\nTo fix: add each key to web/src/i18n/locales/en.json (value = key)')
  console.log('and web/src/i18n/locales/zh.json (value = Chinese translation).')
  console.log('Then re-run: bun run i18n:check')
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
