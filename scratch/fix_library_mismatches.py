import json
import subprocess

# 1. Load all_sentences.json
file_path = 'src/data/json/all_sentences.json'
with open(file_path, 'r', encoding='utf-8') as f:
    all_data = json.load(f)

# 2. Fix s59 and s90 TR swaps in modal-11 and modal-12
modal11 = all_data['modal-11']
modal12 = all_data['modal-12']

# s59 (index 58)
# modal-11 is currently NEED TO, but s59 TR is HAD BETTER. We want it to be NEED TO.
# modal-12 is currently HAD BETTER, but s59 TR is NEED TO. We want it to be HAD BETTER.
tr_m11_s59 = modal11[58]['turkish']
tr_m12_s59 = modal12[58]['turkish']

modal11[58]['turkish'] = tr_m12_s59
modal12[58]['turkish'] = tr_m11_s59

# s90 (index 89)
tr_m11_s90 = modal11[89]['turkish']
tr_m12_s90 = modal12[89]['turkish']

modal11[89]['turkish'] = tr_m12_s90
modal12[89]['turkish'] = tr_m11_s90

# 3. Swap the keys modal-11 and modal-12
# Currently modal-11 contains NEED TO, we want it to be HAD BETTER.
# Currently modal-12 contains HAD BETTER, we want it to be NEED TO.
all_data['modal-11'] = modal12
all_data['modal-12'] = modal11

# 4. Save all_sentences.json
with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)

print("Successfully fixed all_sentences.json and swapped keys!")

# 5. Run update_library.py to update libraryData.ts
print("Running update_library.py...")
result = subprocess.run(['python3', 'scripts/update_library.py'], capture_output=True, text=True)
if result.returncode == 0:
    print("update_library.py ran successfully!")
else:
    print("Error running update_library.py:")
    print(result.stderr)

# 6. Verify libraryData.ts
print("Verifying libraryData.ts...")
verify_result = subprocess.run(['python3', 'scratch/check_library_data.py'], capture_output=True, text=True)
print(verify_result.stdout)
