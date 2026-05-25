import os
import re

sources_dir = 'src/lib/sources/'
files = [f for f in os.listdir(sources_dir) if f.endswith('.ts') and f not in ['types.ts', 'index.ts', 'generate-index.mjs']]

def refactor_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update signature
    # Find the function start and end
    # We look for getChapterPages(chapterId: string)
    # It might have different spacing or return type on next line
    
    pattern = re.compile(r'async\s+getChapterPages\s*\(\s*chapterId\s*:\s*string\s*\)\s*(:\s*Promise\s*<\s*SourcePage\s*\[\s*\]\s*>)?\s*\{', re.DOTALL)
    
    matches = list(pattern.finditer(content))
    if not matches:
        return False

    # Process from end to start to not mess up indices
    new_content = content
    for match in reversed(matches):
        start, end = match.span()
        # Find closing brace of the function
        # This is tricky without a real parser, but we can try to find the next '},' or '}' at the same indentation
        # For now, let's just replace the signature and then look for patterns in the whole file scoped to that function if possible
        
        sig = match.group(0)
        new_sig = sig.replace('chapterId: string', 'chapterId: string, mangaId?: string')
        
        # Determine function body scope roughly
        # Let's find the closing brace by counting braces
        brace_count = 0
        body_end = end
        for i in range(end - 1, len(new_content)):
            if new_content[i] == '{':
                brace_count += 1
            elif new_content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    body_end = i + 1
                    break
        
        func_body = new_content[end:body_end]
        
        # Guessing patterns
        guess_patterns = [
            (r'const\s+mangaId\s*=\s*chapterId\.split\([\'"]\/[\'"]\)\s*\[0\]', 'const finalMangaId = mangaId || chapterId.split(\'/\')[0]'),
            (r'const\s+mangaId\s*=\s*parts\[0\]', 'const finalMangaId = mangaId || parts[0]'),
            (r'const\s+\[\s*mangaId\s*,\s*([^\]]+)\]\s*=\s*chapterId\.split\([\'"]\/[\'"]\)', 'const [guessedMangaId, \\1] = chapterId.split(\'/\')\n      const finalMangaId = mangaId || guessedMangaId'),
        ]
        
        found_guess = False
        new_func_body = func_body
        for p, repl in guess_patterns:
            if re.search(p, new_func_body):
                new_func_body = re.sub(p, repl, new_func_body)
                found_guess = True
                break
        
        if found_guess:
            # Replace usages of mangaId with finalMangaId
            # But NOT in the initialization we just added
            # Use a sentinel to protect the initialization
            new_func_body = new_func_body.replace('finalMangaId = mangaId ||', 'finalMangaId = ___PROVIDED_MANGA_ID___ ||')
            new_func_body = re.sub(r'(?<![\.\w])mangaId(?![:?\w])', 'finalMangaId', new_func_body)
            new_func_body = new_func_body.replace('___PROVIDED_MANGA_ID___', 'mangaId')
        
        # Assemble back
        new_content = new_content[:start] + new_sig + new_func_body + new_content[body_end:]

    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

count = 0
for filename in files:
    if refactor_file(os.path.join(sources_dir, filename)):
        count += 1

print(f"Refactored {count} files out of {len(files)}.")
