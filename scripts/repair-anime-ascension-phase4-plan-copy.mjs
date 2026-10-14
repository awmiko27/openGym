#!/usr/bin/env node
// Phase 4: register Goku and Jinwoo in openGym's plan toast copy.
// Pure source transformation; only changes the PLAN_COPY registry in sheets.jsx.
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENTRIES = [
  "  'goku-foundation': () => ({ name: t('Goku · Saiyan Foundation'), about: t('Strength, power and conditioning training.') }),",
  "  'jinwoo-foundation': () => ({ name: t('Sung Jinwoo · Hunter Foundation'), about: t('Strength, agility and endurance training.') }),",
]

export function registerPhase4PlanCopy(source) {
  const starts = [...source.matchAll(/^[ \t]*const PLAN_COPY = \{[ \t]*$/gm)]
  if (starts.length !== 1) throw Error('Expected exactly one PLAN_COPY registry. No files changed.')
  const begin = starts[0].index + starts[0][0].length
  const nextLine = source.slice(begin).match(/^(\r?\n)/)
  if (!nextLine) throw Error('PLAN_COPY has an unexpected format. No files changed.')
  const stop = /^[ \t]*\}[ \t]*$/m.exec(source.slice(begin + nextLine[0].length))
  if (!stop) throw Error('Could not find the end of PLAN_COPY. No files changed.')
  const body = source.slice(begin, begin + nextLine[0].length + stop.index)
  const has = key => new RegExp(`^[ \\t]*['\"]${key}['\"]\\s*:`, 'm').test(body)
  const goku = has('goku-foundation')
  const jinwoo = has('jinwoo-foundation')
  if (goku !== jinwoo) throw Error('Only one Phase 4 plan has registered copy. No files changed.')
  if (goku) return { source, changed: false }
  if (!/export function loadStarterPlan\s*\(\s*planId\b/.test(source) ||
      !/PLAN_COPY\s*\[\s*planId\s*\]\s*\(\s*\)\s*\.name/.test(source)) {
    throw Error('Expected openGym loadStarterPlan toast lookup. No files changed.')
  }
  const newline = nextLine[1]
  const at = begin + newline.length
  const insert = ENTRIES.join(newline) + newline
  const revised = source.slice(0, at) + insert + source.slice(at)
  const resultBody = revised.slice(at, at + insert.length + body.length)
  if (!/goku-foundation/.test(resultBody) || !/jinwoo-foundation/.test(resultBody))
    throw Error('Phase 4 plan copy verification failed. No files changed.')
  return { source: revised, changed: true }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = resolve(import.meta.dirname, '..')
  const file = join(repo, 'frontend/src/sheets.jsx')
  const starter = join(repo, 'frontend/src/lib/starter.js')
  try {
    const starterSource = readFileSync(starter, 'utf8')
    for (const id of ['goku-foundation', 'jinwoo-foundation']) {
      if (!starterSource.includes(`id === '${id}'`)) {
        throw Error(`The ${id} starter-plan handler is not installed. No files changed.`)
      }
    }
    const result = registerPhase4PlanCopy(readFileSync(file, 'utf8'))
    if (!result.changed) {
      console.log('Phase 4 plan-name registration already installed; no changes made.')
    } else {
      const temp = `${file}.aa-phase4-copy.tmp`
      if (existsSync(temp)) throw Error(`Temporary file already exists: ${temp}`)
      try {
        writeFileSync(temp, result.source, { flag: 'wx', mode: statSync(file).mode })
        renameSync(temp, file)
      } catch (error) {
        if (existsSync(temp)) unlinkSync(temp)
        throw error
      }
      console.log('Registered Goku and Sung Jinwoo plan names in sheets.jsx.')
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
