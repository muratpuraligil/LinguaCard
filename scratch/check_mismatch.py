import json

with open('src/data/json/all_sentences.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

modal11 = data['modal-11']
modal12 = data['modal-12']

print("Checking modal-11 and modal-12 mismatches:")
for i in range(len(modal11)):
    m11 = modal11[i]
    m12 = modal12[i]
    
    # Heuristic for m11 (should be NEED TO)
    # Heuristic for m12 (should be HAD BETTER)
    
    m11_tr_is_had_better = any(x in m11['turkish'].lower() for x in ['iyi olur', 'iyi edersin', 'iyi edersiniz', 'iyi edersiniz'])
    m12_tr_is_need = any(x in m12['turkish'].lower() for x in ['lazım', 'gerek', 'ihtiyaç'])
    
    if m11_tr_is_had_better or m12_tr_is_need:
        print(f"Index {i} (ID {m11['id']}):")
        print(f"  modal-11 TR: {m11['turkish']} | EN: {m11['english']}")
        print(f"  modal-12 TR: {m12['turkish']} | EN: {m12['english']}")
        print("-" * 50)
