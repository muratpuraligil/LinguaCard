import os
import subprocess
import re

def ocr_dir(input_dir):
    files = sorted([f for f in os.listdir(input_dir) if f.endswith('.png')])
    full_text = ""
    for f in files:
        path = os.path.join(input_dir, f)
        output_base = path.replace('.png', '')
        subprocess.run(['tesseract', path, output_base, '-l', 'tur+eng'], capture_output=True)
        with open(output_base + '.txt', 'r') as txt_file:
            full_text += txt_file.read() + "\n"
    return full_text

def parse_sentences(text):
    # Pattern: number. sentence
    # We look for lines starting with digit.
    lines = text.split('\n')
    sentences = []
    for line in lines:
        line = line.strip()
        match = re.match(r'^(\d+)[\.\s]+(.*)', line)
        if match:
            num = int(match.group(1))
            content = match.group(2).strip()
            if content:
                sentences.append((num, content))
    return sentences

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python ocr_and_pair.py <turkish_dir> <english_dir>")
        sys.exit(1)
        
    turkish_text = ocr_dir(sys.argv[1])
    english_text = ocr_dir(sys.argv[2])
    
    tr_sentences = parse_sentences(turkish_text)
    en_sentences = parse_sentences(english_text)
    
    # Sort by number and pair them
    tr_dict = {n: s for n, s in tr_sentences}
    en_dict = {n: s for n, s in en_sentences}
    
    all_nums = sorted(list(set(tr_dict.keys()) | set(en_dict.keys())))
    
    output = []
    for n in all_nums:
        tr = tr_dict.get(n, "")
        en = en_dict.get(n, "")
        if tr or en:
            output.append({"id": f"s{n}", "turkish": tr, "english": en})
    
    import json
    print(json.dumps(output, ensure_ascii=False, indent=2))
