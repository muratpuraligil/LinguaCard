import json
import re

with open('src/data/json/all_sentences.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Comprehensive word-level fixes
word_fixes = {
    "Milli Eğitim Bakanlığı&": "Milli Eğitim Bakanlığı",
    "uca&": "uçağı",
    "topra&": "toprağı",
    "kémiir": "kömür",
    "sérf": "sörf",
    "soğuk algınh&": "soğuk algınlığı",
    "soğuyaca®1": "soğuyacağı",
    "Yeme§inizi": "Yemeğinizi",
    "sonuğları": "sonuçları",
    "1$1k": "ışık",
    "déndüklerinde,": "döndüklerinde,",
    "déndüklerinde": "döndüklerinde",
    "miikemmel": "mükemmel",
    "gériişmesi": "görüşmesi",
    "gériirsen,": "görürsen,",
    "gériirsen": "görürsen",
    "gérmelisin.": "görmelisin.",
    "gérmelisin": "görmelisin",
    "de§ilşin.": "değilsin.",
    "de§ilşin": "değilsin",
    "geng": "genç",
    "Géniilliidiir.": "Gönüllüdür.",
    "Géniilliidiir": "Gönüllüdür.",
    "olmadı&": "olmadığı",
    "ise gelmeyebilir,": "işe gelmeyebilir,",
    "ise gelmeyebilir": "işe gelmeyebilir",
    "1.000 $": "1.000$",
    "gériişme": "görüşme",
    "dönüşdüğünde": "dönüştüğünde",
    "ögrenci": "öğrenci",
    "ögrenciler": "öğrenciler",
    "ogrenci": "öğrenci",
    "ogretmen": "öğretmen",
    "yagmur": "yağmur",
    "agac": "ağaç",
    "kagit": "kağıt",
    "fotograf": "fotoğraf",
    "fotograflar": "fotoğraflar",
}

for cat, sentences in data.items():
    for s in sentences:
        tr = s.get('turkish', '')
        for bad, good in word_fixes.items():
            if bad in tr:
                tr = tr.replace(bad, good)
        s['turkish'] = tr

with open('src/data/json/all_sentences.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Applied deep scan fixes successfully.')
