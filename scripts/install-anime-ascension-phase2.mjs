#!/usr/bin/env node
// Integrate Phase 2 into openGym v1.4.0 + the previously installed Saitama POC.
// Do not attempt to guess or rewrite changed upstream components.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = [
  'frontend/src/App.jsx',
  'frontend/src/views/Home.jsx',
  'frontend/src/views/Plan.jsx',
  'frontend/src/views/Login.jsx',
  'frontend/index.html',
  'frontend/public/manifest.json',
  'frontend/src/lib/starter.js',
  'frontend/src/sheets.jsx',
  'frontend/src/views/AnimeAscension.jsx',
]
const originals = new Map()
for (const file of files) {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) throw Error(`Missing ${file}; run from the checked-out openGym repo, after applying the Phase 2 patch.`)
  originals.set(file, fs.readFileSync(full, 'utf8'))
}
if (!originals.get('frontend/src/lib/starter.js').includes('saitama-foundation') ||
    !originals.get('frontend/src/sheets.jsx').includes("'saitama-foundation'")) {
  throw Error('Saitama POC installer has not been applied. Run scripts/install-anime-ascension-poc.mjs first.')
}
const changes = new Map()
const whenMissing = (file, marker, anchor, replacement) => {
  let s = changes.get(file) ?? originals.get(file)
  if (s.includes(marker)) return
  if (!s.includes(anchor)) throw Error(`Unexpected ${file}: missing ${JSON.stringify(anchor.slice(0,70))}; no files changed.`)
  s = s.replace(anchor, replacement)
  changes.set(file, s)
}
const replaceExact = (file, done, old, replacement) => {
  let s = changes.get(file) ?? originals.get(file)
  if (s.includes(done)) return
  if (!s.includes(old)) throw Error(`Unexpected ${file}: missing ${JSON.stringify(old.slice(0,70))}; no files changed.`)
  changes.set(file, s.replace(old, replacement))
}

whenMissing('frontend/src/App.jsx', "import AnimeAscension from './views/AnimeAscension.jsx'",
  "import Home from './views/Home.jsx'",
  "import Home from './views/Home.jsx'\nimport AnimeAscension from './views/AnimeAscension.jsx'\nimport './anime-ascension.css'")
whenMissing('frontend/src/App.jsx', '<Route path="/anime" element={<AnimeAscension />} />',
  '<Route path="/plan" element={<Plan />} />',
  '<Route path="/plan" element={<Plan />} />\n               <Route path="/anime" element={<AnimeAscension />} />')
whenMissing('frontend/src/views/Plan.jsx', "label: 'Anime Ascension'",
  "{ icon: 'clipboard', label: t('Load starter plan'), onClick: starterPlanSheet },",
  "{ icon: 'clipboard', label: t('Load starter plan'), onClick: starterPlanSheet },\n        { icon: 'sparkles', label: 'Anime Ascension', sub: 'Character paths and training setup', onClick: () => nav('/anime') },")
whenMissing('frontend/src/views/Home.jsx', 'className="aa-home-entry"',
  '    <div className="card">',
  '    <div className="aa-home-entry"><div><strong>Anime Ascension</strong><p>Choose an anime-inspired training path</p></div><button className="btn" type="button" onClick={() => nav(\'/anime\')}>Training paths</button></div>\n    <div className="card">')
replaceExact('frontend/src/views/Home.jsx', "user ? t('Hi {0}', user.name) : 'Anime Ascension'",
  "user ? t('Hi {0}', user.name) : 'openGym'",
  "user ? t('Hi {0}', user.name) : 'Anime Ascension'")
replaceExact('frontend/src/views/Login.jsx', '>Anime Ascension</h1>', '>openGym</h1>', '>Anime Ascension</h1>')
replaceExact('frontend/index.html', '<title>Anime Ascension</title>', '<title>openGym</title>', '<title>Anime Ascension</title>')
replaceExact('frontend/index.html', 'Anime-inspired training powered by openGym', 'Personal gym & body weight tracker',
  'Anime-inspired training powered by openGym')
replaceExact('frontend/index.html', 'content="Anime Ascension"', 'content="openGym"', 'content="Anime Ascension"')
{
  const file = 'frontend/public/manifest.json'
  const body = changes.get(file) ?? originals.get(file)
  const json = JSON.parse(body)
  if (json.name !== 'Anime Ascension') {
    if (json.name !== 'openGym') throw Error('Unexpected manifest name; no files changed.')
    json.name = 'Anime Ascension'
    json.short_name = 'Ascension'
    json.description = 'Anime-inspired training powered by openGym'
    changes.set(file, JSON.stringify(json, null, 2) + '\n')
  }
}
if (changes.size === 0) { console.log('Anime Ascension Phase 2 already integrated.'); process.exit(0) }
// All assertions and JSON parsing finish before any source file is touched.
for (const [file, data] of changes) fs.writeFileSync(path.join(root, file), data)
console.log(`Anime Ascension Phase 2 integrated in ${changes.size} existing files.`)
console.log('Review: git diff -- frontend/src/App.jsx frontend/src/views frontend/index.html frontend/public/manifest.json')
