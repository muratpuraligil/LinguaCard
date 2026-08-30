import json
import re

with open('src/data/json/all_sentences.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def clean_english(en):
    if not en:
        return en
    
    # Replace pipe | with I
    # Matches: | as standalone word, or with contractions like |'m, |'ll, |'d, |'ve
    en = re.sub(r'(^|[\s\(\[\{\"\',;\.\?!])\|(\'[a-zA-Z]+|[\s\)\]\}\"\',;\.\?!]|$)', r'\1I\2', en)
    en = re.sub(r'\|', 'I', en)  # any remaining pipe
    
    # Replace 1 used as pronoun I (e.g. "1 haven't", "1 don't", "1 need", "1'd")
    en = re.sub(r'(^|[\s\(\[\{\"\',;\.\?!])1(\'[a-zA-Z]+)', r'\1I\2', en)
    en = re.sub(r'(^|[\.\,\;\?\!\(\)]\s*|\b(?:if|when|so|and|that|but|because|although)\s+)1\s+(?=(?:have|haven\'t|had|hadn\'t|am|was|wasn\'t|do|don\'t|did|didn\'t|will|won\'t|would|wouldn\'t|can|can\'t|could|couldn\'t|should|shouldn\'t|must|mustn\'t|need|needed|prefer|like|liked|love|loved|think|thought|want|wanted|know|knew|see|saw|hear|heard|feel|felt|wish|hope|go|went|get|got|take|took|make|made|say|said|tell|told|ask|asked|try|tried|start|started|look|looked|live|lived|work|worked|play|played|read|write|wrote|eat|ate|drink|drank|buy|bought|sell|sold|pay|paid|call|called|help|helped|run|ran|walk|walked|wait|waited|leave|left|stay|stayed|stop|stopped|open|opened|close|closed|send|sent|bring|brought|find|found|give|gave|keep|kept|hold|held|put|set|meet|met|stand|stood|sit|sat|speak|spoke|talk|talked|watch|watched|learn|learned|teach|taught|cook|cooked|clean|cleaned|wash|washed|use|used|wear|wore|drive|drove|fly|flew|swim|swam|sing|sang|dance|danced|sleep|slept)\b)', r'\1I ', en, flags=re.I)
    
    # Fix spacing
    en = re.sub(r'\s+', ' ', en).strip()
    return en

# Turkish replacement rules
tr_replacements = [
    # OCR dollar signs to Ş
    (r'\$imdi\b', 'Şimdi'),
    (r'\$u\b', 'Şu'),
    (r'\$ehir\b', 'Şehir'),
    (r'\$apka\b', 'Şapka'),
    (r'\$arkı\b', 'Şarkı'),
    (r'\$işe\b', 'Şişe'),
    (r'\$am\'ın\b', "Sam'in"),
    (r'\$([a-zçğıöşüA-ZÇĞİÖŞÜ])', r'Ş\1'),
    
    # OCR ¢ to ç
    (r'¢', 'ç'),
    
    # Digit 0 representing letter O at beginning of words/pronouns
    (r'\b0,\s*Ali\'ydi\b', "O, Ali'ydi"),
    (r'\b0\s+filmi\b', 'O filmi'),
    (r'\b0\s+yash\s+adama\b', 'O yaşlı adama'),
    (r'\b0\s+yaşlı\s+adama\b', 'O yaşlı adama'),
    (r'\b0\s+(gün|zaman|adam|kadın|çocuk|öğrenci|araba|ev|köpek|kedi|restoran|otel|kitap)\b', r'O \1'),
    
    # Specific OCR words
    (r'\bPeter\'l\b', "Peter'ı"),
    (r'\bgiin\b', 'gün'),
    (r'\bgérmez\b', 'görmez'),
    (r'\bgérmiiyor\b', 'görmüyor'),
    (r'\bgérlirsiin\b', 'görürsün'),
    (r'\bgértiyorsun\b', 'görüyorsun'),
    (r'\bgéremem\b', 'göremem'),
    (r'\bgérebilir\b', 'görebilir'),
    (r'\bgérmek\b', 'görmek'),
    (r'\bgérdü\b', 'gördü'),
    (r'\bgéster\b', 'göster'),
    (r'\bgérmemişim\b', 'görmemişim'),
    (r'\bgérür\b', 'görür'),
    (r'\bgér\b', 'gör'),
    (r'\bséyle\b', 'söyle'),
    (r'\bséyledi\b', 'söyledi'),
    (r'\bséyler\b', 'söyler'),
    (r'\bséylemek\b', 'söylemek'),
    (r'\bséyledim\b', 'söyledim'),
    (r'\bséz\b', 'söz'),
    (r'\bbéyle\b', 'böyle'),
    (r'\bşéyle\b', 'şöyle'),
    (r'\béğren\b', 'öğren'),
    (r'\béğretmen\b', 'öğretmen'),
    (r'\bédev\b', 'ödev'),
    (r'\bénemli\b', 'önemli'),
    (r'\bézür\b', 'özür'),
    (r'\bdnemli\b', 'önemli'),
    (r'\bdnem\b', 'önem'),
    (r'\bSzur\b', 'özür'),
    (r'\bSzür\b', 'özür'),
    (r'\btilke\b', 'ülke'),
    (r'\btilkede\b', 'ülkede'),
    (r'\btilkeden\b', 'ülkeden'),
    (r'\bKutliphanede\b', 'Kütüphanede'),
    (r'\bkutliphane\b', 'kütüphane'),
    (r'\byash\b', 'yaşlı'),
    (r'\bugin\b', 'için'),
    (r'\bigin\b', 'için'),
    (r'\bbirkağ\b', 'birkaç'),
    (r'\bfaydall\b', 'faydalı'),
    (r'\bhizh\b', 'hızlı'),
    (r'\bde&il\b', 'değil'),
    (r'\bgeğcemezsin\b', 'geçemezsin'),
    (r'\bgeğ\b', 'geç'),
    (r'\bgegemez\b', 'geçemez'),
    (r'\bbeŞendim\b', 'beğendim'),
    (r'\bbaşladığım sorabilir\b', 'başladığını sorabilir'),
    (r'\bçalışmyor\b', 'çalışmıyor'),
    (r'\bBatakhkların\b', 'Bataklıkların'),
    (r'\bbatakhk\b', 'bataklık'),
    (r'\bsinlsiklam\b', 'sırılsıklam'),
    (r'\bsözlii\b', 'sözlü'),
    (r'\bgürultii\b', 'gürültü'),
    (r'\bgürüiltti\b', 'gürültü'),
    (r'\bgöçük bakıcısı\b', 'çocuk bakıcısı'),
    (r'\byih\b', 'yılı'),
    (r'\bilging\b', 'ilginç'),
    (r'\byasında\b', 'yaşında'),
    (r'\bcalığşmiş\b', 'çalışmış'),
    (r'\bcalışmış\b', 'çalışmış'),
    (r'\bcalısmak\b', 'çalışmak'),
    (r'\bgecebilirim\b', 'geçebilirim'),
    (r'\buçağ\b', 'uçağı'),
    (r'\buca&\b', 'uçağı'),
    (r'\bBakanlığı&\b', 'Bakanlığı'),
    (r'\bKöpe’i\b', 'Köpeği'),
    (r'\bKöpe\'i\b', 'Köpeği'),
    (r'\bkullantyorsa\b', 'kullanıyorsa'),
    (r'\bkurallart\b', 'kuralları'),
    (r'\bagiklamank\b', 'açıklamak'),
    (r'\bagiklamaya\b', 'açıklamaya'),
    (r'\b6nUmuzdeki\b', 'önümüzdeki'),
    (r'\bönUmuzdeki\b', 'önümüzdeki'),
    (r'\byaty\b', 'yazıyor'),
    (r'\bİgeri\b', 'İçeri'),
    (r'\bMiusteri\b', 'Müşteri'),
    (r'\bSzur dilememesi\b', 'özür dilememesi'),
    (r'\bBurrestoran\b', 'Bu restoran'),
    (r'\bGdung\b', 'ödünç'),
    (r'\bGdeseniz\b', 'ödeseniz'),
    (r'\bGdeseydiniz\b', 'ödeseydiniz'),
    (r'\bGerçedi\b', 'Gerçeği'),
    (r'\beBer\b', 'eğer'),
    (r'\bhoşlanmnyor\b', 'hoşlanmıyor'),
    (r'\bKızınzz\b', 'Kızınız'),
    (r'\bgittikçe şişmanhyor\b', 'gittikçe şişmanlıyor'),
    (r'\bO kadar yemese iyi olur\b', 'O kadar çok yemese iyi olur'),
    (r'\byalmz\b', 'yalnız'),
    (r'\bGeğ\b', 'Geç'),
    (r'\bgeg\b', 'geç'),
    (r'\bgürültü yapmasan\b', 'gürültü yapmasanız'),
    (r'\bHarg ücretini ddemeyi\b', 'Harç ücretini ödemeyi'),
    (r'\bsÖnra\b', 'sonra'),
    (r'\bsÜredir\b', 'süredir'),
    (r'\bfirgaladı\b', 'fırçaladı'),
    
    # Capital G replacing Ö
    (r'\bGdev\b', 'Ödev'),
    (r'\bGdevimi\b', 'Ödevimi'),
    (r'\bGdevini\b', 'Ödevini'),
    (r'\bGdevinizi\b', 'Ödevinizi'),
    (r'\bGdeme\b', 'Ödeme'),
    (r'\bGdemeyi\b', 'Ödemeyi'),
    (r'\bGdemen\b', 'Ödemen'),
    (r'\bGde\b', 'Öde'),
    (r'\bGdenen\b', 'Ödenen'),
    (r'\bGgrenci\b', 'Öğrenci'),
    (r'\bGgrenciler\b', 'Öğrenciler'),
    (r'\bGgretmen\b', 'Öğretmen'),
    (r'\bGnemli\b', 'Önemli'),
    (r'\bGnem\b', 'Önem'),
    (r'\bGyle\b', 'Öyle'),
    (r'\bGnce\b', 'Önce'),
    (r'\bGbür\b', 'Öbür'),
    (r'\bGgle\b', 'Öğle'),
    (r'\bGfke\b', 'Öfke'),
    (r'\bGneri\b', 'Öneri'),
    (r'\bGzet\b', 'Özet'),
    (r'\bGmrü\b', 'Ömrü'),
    (r'\bGksür\b', 'Öksür'),
    (r'\bGzür\b', 'Özür'),
    (r'\bGldür\b', 'Öldür'),
    (r'\bGvün\b', 'Övün'),
    (r'\bGpmek\b', 'Öpmek'),
    (r'\bGğle\b', 'Öğle'),
]

def clean_turkish(tr):
    if not tr:
        return tr
    
    for pattern, repl in tr_replacements:
        tr = re.sub(pattern, repl, tr)
        
    tr = re.sub(r'\s+', ' ', tr).strip()
    return tr

modified_count = 0
for cat, sentences in data.items():
    for s in sentences:
        orig_en = s.get('english', '')
        orig_tr = s.get('turkish', '')
        
        new_en = clean_english(orig_en)
        new_tr = clean_turkish(orig_tr)
        
        if new_en != orig_en or new_tr != orig_tr:
            modified_count += 1
            s['english'] = new_en
            s['turkish'] = new_tr

print(f'Total sentences modified: {modified_count}')

with open('src/data/json/all_sentences.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Saved cleaned all_sentences.json successfully!')
