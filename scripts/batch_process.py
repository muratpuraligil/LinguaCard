import os
import subprocess
import json
import re

def clean_turkish(text):
    replacements = {
        'de@il': 'değil',
        'deBil': 'değil',
        'deéil': 'değil',
        'iizerinde': 'üzerinde',
        'Gniindeler': 'önündeler',
        'Gniinde': 'önünde',
        'Sgrenci': 'öğrenci',
        'dgretmen': 'öğretmen',
        'giinesli': 'güneşli',
        'giizel': 'güzel',
        'biiyiik': 'büyük',
        'képek': 'köpek',
        'miizede': 'müzede',
        'siiredir': 'süredir',
        'yasindan': 'yaşından',
        'yillardir': 'yıllardır',
        'yildan': 'yıldan',
        'simftayiz': 'sınıftayız',
        'alti': 'altı',
        'yiiziicii': 'yüzücü',
        'kuaférde': 'kuaförde',
        'isciler': 'işçiler',
        'giindiir': 'gündür',
        '¢6ziim': 'çözüm',
        'yiiziinden': 'yüzünden',
        'iiriinlerden': 'ürünlerden',
        'siipermarkette': 'süpermarkette',
        'discide': 'dişçide',
        '¢ép': 'çöp',
        'i¢inde': 'içinde',
        'giiriiltiilii': 'gürültülü',
        'gegen': 'geçen',
        'ii¢': 'üç',
        'magi': 'maçı',
        'mactan': 'maçtan',
        '¢amur': 'çamur',
        'ékeliler': 'öfkeliler',
        'iiriin': 'ürün',
        'siire': 'süre'
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text

def process_set(num, name, base_path_tr, base_path_en):
    # Find files starting with num.
    tr_files = [f for f in os.listdir(base_path_tr) if f.startswith(f"{num}.")]
    en_files = [f for f in os.listdir(base_path_en) if f.startswith(f"{num}.")]
    
    if not tr_files or not en_files:
        print(f"Files not found for {num}")
        return None
    
    tr_pdf = os.path.join(base_path_tr, tr_files[0])
    en_pdf = os.path.join(base_path_en, en_files[0])
    
    temp_tr = f"./temp_pages/aux_{num}"
    temp_en = f"./temp_pages/aux_{num}_ans"
    
    # Extract
    subprocess.run(['python3', 'extract_pages.py', tr_pdf, temp_tr])
    subprocess.run(['python3', 'extract_pages.py', en_pdf, temp_en])
    
    # OCR and Pair
    result = subprocess.run(['python3', 'ocr_and_pair.py', temp_tr, temp_en], capture_output=True, text=True)
    try:
        sentences = json.loads(result.stdout)
        # Clean Turkish
        for s in sentences:
            s['turkish'] = clean_turkish(s['turkish'])
        return sentences
    except:
        print(f"Failed to parse OCR result for {num}")
        return None

if __name__ == "__main__":
    all_data = {}
    if os.path.exists('all_sentences.json'):
        with open('all_sentences.json', 'r') as f:
            all_data = json.load(f)
    
    # Process Aux
    base_tr_aux = "./PratikYap/TÜRKÇE YARDIMCI FİİL ANTREMANLARI"
    base_en_aux = "./PratikYap/İNGİLİZCE YARDIMCI FİİLLER CEVAP ANAHTARI"
    
    for i in range(1, 19):
        key = f"aux-{i}"
        if key in all_data:
            print(f"Skipping {key}...")
            continue
        print(f"Processing {key}...")
        sentences = process_set(i, "", base_tr_aux, base_en_aux)
        if sentences:
            all_data[key] = sentences
            # Save progress
            with open('all_sentences.json', 'w') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)

    # Process Modal
    base_tr_modal = "./PratikYap/TÜRKÇE MODAL VERBS"
    base_en_modal = "./PratikYap/İNGİLİZCE MODAL VERBS CEVAP ANAHTARI"
    
    for i in range(1, 17):
        key = f"modal-{i}"
        if key in all_data:
            print(f"Skipping {key}...")
            continue
        print(f"Processing {key}...")
        sentences = process_set(i, "", base_tr_modal, base_en_modal)
        if sentences:
            all_data[key] = sentences
            # Save progress
            with open('all_sentences.json', 'w') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)
