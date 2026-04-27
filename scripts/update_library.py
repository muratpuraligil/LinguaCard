import json
import re

def main():
    with open('data/json/all_sentences.json', 'r', encoding='utf-8') as f:
        all_data = json.load(f)

    with open('src/data/libraryData.ts', 'r', encoding='utf-8') as f:
        ts_content = f.read()

    # The format is like: { id: "aux-4", title: "4. HAD BEEN", sentences: [] }
    # Let's replace the empty array with the JSON array format
    
    for key, sentences in all_data.items():
        if not sentences:
            continue
            
        # We want to format sentences as TS array
        sentences_str = "[\n"
        for s in sentences:
            # Escape quotes
            tr = s['turkish'].replace('"', '\\"')
            en = s['english'].replace('"', '\\"')
            sentences_str += f'          {{ id: "{s["id"]}", turkish: "{tr}", english: "{en}" }},\n'
        sentences_str = sentences_str.rstrip(',\n') + "\n        ]"
        
        # Regex to find: { id: "KEY", title: "...", sentences: [] } or existing array
        # This regex looks for sentences: [] or sentences: [ ... ] corresponding to the key
        # Because we only want to replace if it's empty [] or already populated (but we replace it entirely)
        
        pattern = re.compile(r'(\{ id: "' + key + r'", title: "[^"]+", sentences: )\[\]', flags=re.MULTILINE)
        
        # If it finds empty array, replace
        if pattern.search(ts_content):
            ts_content = pattern.sub(r'\g<1>' + sentences_str, ts_content)
        else:
            # What if it's already populated?
            pattern2 = re.compile(r'(\{ id: "' + key + r'", title: "[^"]+", sentences: )\[.*?\]\n      \}', flags=re.MULTILINE | re.DOTALL)
            ts_content = pattern2.sub(r'\g<1>' + sentences_str + '\n      }', ts_content)

    with open('src/data/libraryData.ts', 'w', encoding='utf-8') as f:
        f.write(ts_content)
        
if __name__ == '__main__':
    main()
