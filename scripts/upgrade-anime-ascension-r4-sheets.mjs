#!/usr/bin/env node
// Anime Ascension Phase 3 Revision 4 integration, scoped to loadStarterPlan().
// Leaves the rest of sheets.jsx (including Phase 3 XP hooks) untouched.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const target = join(root, 'frontend/src/sheets.jsx')
const starter = join(root, 'frontend/src/lib/starter.js')
const view = join(root, 'frontend/src/views/AnimeAscension.jsx')

const src = readFileSync(target, 'utf8')
const starterSrc = readFileSync(starter, 'utf8')
const viewSrc = readFileSync(view, 'utf8')
if (!/buildStarterPlan\s*=\s*\(id,\s*equipment,\s*animeProfile\)/.test(starterSrc) ||
    !/loadStarterPlan\('saitama-foundation',[^\n]*result\.value\)/.test(viewSrc)) {
  throw Error('Revision 4 starter/view changes are missing. Apply the non-sheets patch first. No files changed.')
}

// Require exactly one named export, not a similar call in another function.
const declarations = [...src.matchAll(/^[ \t]*export function loadStarterPlan[ \t]*\(([^\n)]*)\)[ \t]*\{/gm)]
if (declarations.length !== 1) throw Error('Expected exactly one loadStarterPlan() definition. No files changed.')
const declaration = declarations[0]
const params = declaration[1].replace(/\s+/g, '')
if (params !== 'planId,profile' && params !== 'planId,profile,animeProfile') {
  throw Error('Unexpected loadStarterPlan() parameters. No files changed.')
}

// Only change the function header and its immediately following plan-builder call.
const start = declaration.index
const startBody = start + declaration[0].length
const bodyMatch = src.slice(startBody).match(/^(\r?\n)([ \t]*)const[ \t]+plan[ \t]*=[ \t]*buildStarterPlan\([ \t]*planId[ \t]*,[ \t]*profile[ \t]*\?[ \t]*profileEquipment\([ \t]*profile[ \t]*\)[ \t]*:[ \t]*undefined(?:[ \t]*,[ \t]*animeProfile)?[ \t]*\)/)
if (!bodyMatch) throw Error('Unexpected loadStarterPlan() first statement. No files changed.')
const alreadyParams = params === 'planId,profile,animeProfile'
const alreadyCall = /,[ \t]*animeProfile[ \t]*\)$/.test(bodyMatch[0])
if (alreadyParams && alreadyCall) {
  console.log('Revision 4 sheets.jsx integration already present; nothing changed.')
  process.exit(0)
}
const newDeclaration = declaration[0].replace(/\([^\n)]*\)/, '(planId, profile, animeProfile)')
const newCall = `${bodyMatch[1]}${bodyMatch[2]}const plan = buildStarterPlan(planId, profile ? profileEquipment(profile) : undefined, animeProfile)`
const oldSegment = src.slice(start, startBody + bodyMatch[0].length)
const next = src.slice(0, start) + newDeclaration + newCall + src.slice(startBody + bodyMatch[0].length)
if (next === src) throw Error('No change expected; aborting.')
writeFileSync(target, next)
console.log('Updated only loadStarterPlan() in frontend/src/sheets.jsx for Anime Ascension Revision 4.')
