// Phase 4 compatibility updater for the user's existing openGym starter.js.
// Never reconstructs or replaces starter.js: only adds dispatch for the two
// new characters, copying the existing Saitama builder arguments verbatim.
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export function upgradeStarterSource(src) {
  const importSaitama = /^([ \t]*import\s*\{[^}\r\n]*\bbuildSaitamaFoundation\b[^}\r\n]*\}\s*from\s*['"]\.\/anime\/saitama\.js['"];?)[ \t]*$/gm
  const importPath = /^\s*import\s*\{[^}\r\n]*\bbuildGokuFoundation\b[^}\r\n]*\bbuildJinwooFoundation\b[^}\r\n]*\}\s*from\s*['"]\.\/anime\/character-paths\.js['"];?[ \t]*$/gm
  const starterFn = /export\s+const\s+buildStarterPlan\s*=\s*\(([^)]*)\)\s*=>\s*\{/g
  const saitamaCall = /^([ \t]*)if\s*\(\s*id\s*===\s*(['"])saitama-foundation\2\s*\)\s*return\s+buildSaitamaFoundation\s*\(\s*(\{[\s\S]*?\})\s*\)[ \t]*;?(?=\r?\n|$)/gm
  const planLine = /^[ \t]*const\s+plan\s*=\s*PLANS\s*\[\s*id\s*\]/gm
  const gokuCase = /\bid\s*===\s*['"]goku-foundation['"]/g
  const jinwooCase = /\bid\s*===\s*['"]jinwoo-foundation['"]/g
  const count = (re, input) => [...input.matchAll(re)].length
  const saitamaImports = [...src.matchAll(importSaitama)]
  const pathImports = [...src.matchAll(importPath)]
  const fns = [...src.matchAll(starterFn)]
  if (saitamaImports.length !== 1 || fns.length !== 1)
    throw Error('Expected exactly one Saitama import and buildStarterPlan function; starter.js was not changed.')
  const fn = fns[0]
  const params = fn[1].split(',').map(x => x.trim())
  if (!['id', 'equipment', 'animeProfile'].every(x => params.includes(x)))
    throw Error('buildStarterPlan signature differs from Phase 3 Revision 4; starter.js was not changed.')
  const calls = [...src.matchAll(saitamaCall)]
  const plans = [...src.matchAll(planLine)]
  if (calls.length !== 1 || plans.length !== 1 || !(fn.index < calls[0].index && calls[0].index < plans[0].index))
    throw Error('Expected one Saitama dispatch before the native plan lookup; starter.js was not changed.')
  const hasGoku = count(gokuCase, src) > 0
  const hasJinwoo = count(jinwooCase, src) > 0
  if (hasGoku !== hasJinwoo || (hasGoku && pathImports.length !== 1) || (!hasGoku && pathImports.length > 0))
    throw Error('Incomplete or unexpected Phase 4 starter integration; starter.js was not changed.')
  if (hasGoku) {
    if (count(gokuCase, src) !== 1 || count(jinwooCase, src) !== 1)
      throw Error('Duplicate Phase 4 starter handlers; starter.js was not changed.')
    if (!(calls[0].index < [...src.matchAll(gokuCase)][0].index &&
          [...src.matchAll(jinwooCase)][0].index < plans[0].index))
      throw Error('Phase 4 handlers are outside the expected starter function; starter.js was not changed.')
    return { source: src, changed: false }
  }
  // The same arguments as Saitama guarantee native openGym equipment filtering
  // and exactly the same goal/experience context for both new characters.
  const s = calls[0]
  const i = saitamaImports[0]
  const nl = src.includes('\r\n') ? '\r\n' : '\n'
  const indent = s[1]
  const args = s[3]
  const cases = [
    `${indent}if (id === 'goku-foundation') return buildGokuFoundation(${args})`,
    `${indent}if (id === 'jinwoo-foundation') return buildJinwooFoundation(${args})`,
  ].join(nl)
  const afterSaitama = s.index + s[0].length
  // Build edits in memory before writing. Reverse-offset application avoids
  // corrupting the original starter content when insertion points shift.
  const edits = [
    { at: i.index + i[0].length, content: `${nl}import { buildGokuFoundation, buildJinwooFoundation } from './anime/character-paths.js'` },
    { at: afterSaitama, content: `${nl}${cases}` },
  ]
  let next = src
  for (const edit of edits.sort((a, b) => b.at - a.at))
    next = next.slice(0, edit.at) + edit.content + next.slice(edit.at)
  // Guard against unusual whitespace or an unexpected one-line source layout.
  if (count(gokuCase, next) !== 1 || count(jinwooCase, next) !== 1 ||
      count(importPath, next) !== 1 || next === src)
    throw Error('Phase 4 source validation failed; starter.js was not changed.')
  return { source: next, changed: true }
}

// Allows importing upgradeStarterSource into focused Node tests without writes.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(import.meta.dirname, '..')
  const file = join(root, 'frontend/src/lib/starter.js')
  const pathsFile = join(root, 'frontend/src/lib/anime/character-paths.js')
  if (!existsSync(pathsFile)) {
    console.error('Missing Phase 4 character paths. Apply the compatibility patch first.')
    process.exitCode = 1
  } else {
    try {
      const original = readFileSync(file, 'utf8')
      const result = upgradeStarterSource(original)
      if (!result.changed) console.log('Phase 4 starter integration already installed; no changes made.')
      else {
        const temp = file + '.aa-phase4.tmp'
        // Do not overwrite someone else's staged temp file.
        if (existsSync(temp)) throw Error(`Temporary output already exists: ${temp}`)
        try {
          writeFileSync(temp, result.source, { flag: 'wx' })
          renameSync(temp, file)
        } catch (error) {
          if (existsSync(temp)) unlinkSync(temp)
          throw error
        }
        console.log('Phase 4 starter integration installed: Goku and Sung Jinwoo.')
      }
    } catch (error) {
      console.error(error.message)
      process.exitCode = 1
    }
  }
}
