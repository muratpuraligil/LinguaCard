# scripts/word_data/export_c1_c2.py
import sys, json, os

sys.path.append(os.path.dirname(__file__))

from c1_dataset import C1_WORDS_PART1
from c1_dataset_builder import C1_WORDS_D_TO_L
from c1_part3 import C1_WORDS_G_TO_P
from c1_part4 import C1_WORDS_M_TO_Z
from c1_extra import C1_EXTRA_WORDS

from c2_dataset_part1 import C2_WORDS_PART1
from c2_dataset_part2 import C2_WORDS_PART2
from c2_dataset_part3 import C2_WORDS_PART3

rootDir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))

def load_level(path):
    with open(path, 'r', encoding='utf-8') as f:
        return set(w['english'].strip().lower() for w in json.load(f))

existing = set()
for lvl in ['a1', 'a2', 'b1', 'b2']:
    existing |= load_level(os.path.join(rootDir, f'src/data/json/{lvl}_words.json'))

all_c1 = C1_WORDS_PART1 + C1_WORDS_D_TO_L + C1_WORDS_G_TO_P + C1_WORDS_M_TO_Z + C1_EXTRA_WORDS
c1_seen = set()
c1_final = []
for item in all_c1:
    k = item[0].strip().lower()
    if k not in existing and k not in c1_seen:
        c1_seen.add(k)
        c1_final.append(item)

all_c2 = C2_WORDS_PART1 + C2_WORDS_PART2 + C2_WORDS_PART3
c2_seen = set()
c2_final = []
for item in all_c2:
    k = item[0].strip().lower()
    if k not in existing and k not in c1_seen and k not in c2_seen:
        c2_seen.add(k)
        c2_final.append(item)

c1_export_path = os.path.join(os.path.dirname(__file__), 'c1_export.json')
c2_export_path = os.path.join(os.path.dirname(__file__), 'c2_export.json')

with open(c1_export_path, 'w', encoding='utf-8') as f:
    json.dump(c1_final, f, ensure_ascii=False, indent=2)

with open(c2_export_path, 'w', encoding='utf-8') as f:
    json.dump(c2_final, f, ensure_ascii=False, indent=2)

print(f"Exported C1: {len(c1_final)} words to {c1_export_path}")
print(f"Exported C2: {len(c2_final)} words to {c2_export_path}")
