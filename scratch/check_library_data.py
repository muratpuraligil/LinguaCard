import re

with open('src/data/libraryData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all blocks like: { id: "...", title: "...", sentences: [...] }
blocks = re.findall(r'\{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*sentences:\s*\[(.*?)\]\s*\}', content, re.DOTALL)

print(f"Found {len(blocks)} categories in libraryData.ts")

for block_id, title, sentences_str in blocks:
    # Parse sentences
    sentences = re.findall(r'\{\s*id:\s*"([^"]+)",\s*turkish:\s*"([^"]*)",\s*english:\s*"([^"]*)"\s*\}', sentences_str)
    
    # Check if there is a mismatch in keywords
    # We can check if english keywords match the title
    title_lower = title.lower()
    
    mismatches = 0
    total = len(sentences)
    if total == 0:
        continue
        
    for s_id, tr, en in sentences:
        en_lower = en.lower()
        tr_lower = tr.lower()
        
        # Heuristics based on title
        if "had better" in title_lower:
            if "need" in en_lower and "better" not in en_lower:
                mismatches += 1
        elif "need" in title_lower:
            if "better" in en_lower and "need" not in en_lower:
                mismatches += 1
                
    if mismatches > 5:  # If more than 5 sentences mismatch, the whole category might be wrong
        print(f"Category {block_id} ({title}): {mismatches}/{total} sentences mismatch!")
