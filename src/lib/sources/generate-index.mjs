import { readdirSync, writeFileSync } from 'fs'

const files = readdirSync('.')
  .filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts' && f !== 'readmanga-base.ts')
  .map(f => f.replace('.ts', ''))
  .sort()

let imports = "import type { MangaSource } from './types'\n"
for (const name of files) {
  imports += `import { ${name}Source } from './${name}'\n`
}

let registry = '\n// Registry of all available sources\nexport const sources: Record<string, MangaSource> = {\n'
for (const name of files) {
  registry += `  ${name}: ${name}Source,\n`
}
registry += '}\n'

let exportsList = '\nexport const sourceList = Object.values(sources)\n\nexport const defaultSource = mangadexSource\n\nexport function getSource(id?: string): MangaSource {\n  if (!id) return defaultSource\n  return sources[id] || defaultSource\n}\n\nexport { '
exportsList += files.map(n => `${n}Source`).join(', ')
exportsList += ' }\nexport type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from \'./types\'\n'

writeFileSync('index.ts', imports + registry + exportsList)
console.log('Generated index.ts with', files.length, 'sources')
