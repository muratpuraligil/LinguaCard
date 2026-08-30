import json
import re

with open('src/data/json/all_sentences.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

fixes = [
    # Quotes and apostrophes
    (r'[’‘`´]', "'"),
    (r"’’|''", "'"),
    (r"’'", "'"),
    
    # Specific OCR errors
    (r"tığ hafta", "üç hafta"),
    (r"tamyorum", "tanıyorum"),
    (r"6greneceğiz", "öğreneceğiz"),
    (r"Köprii", "Köprü"),
    (r"yapımım\b", "yapımını"),
    (r"Ocak'a kadar", "Ocak'a kadar"),
    (r"ddemiş", "ödemiş"),
    (r"ya'mür", "yağmur"),
    (r"kullantyor\b", "kullanıyor"),
    (r"onlan'", "onları"),
    (r"onlan\b", "onları"),
    (r"Tony'ı", "Tony'yi"),
    (r"\bise girmeden\b", "işe girmeden"),
    (r"karsı\b", "karşı"),
    (r"yarıstyor\b", "yarışıyor"),
    (r"oldukga\b", "oldukça"),
    (r"ra'men\b", "rağmen"),
    (r"dağımıkken\b", "dağınıkken"),
    (r"Birkağ\b", "Birkaç"),
    (r"birkağ\b", "birkaç"),
    (r"3 yasındayken\b", "3 yaşındayken"),
    (r"Geng\b", "Genç"),
    (r"geng\b", "genç"),
    (r"yurtiyus\b", "yürüyüş"),
    (r"Cuma' ları\b", "Cumaları"),
    (r"Cuma'ları\b", "Cumaları"),
    (r"Cumartesi'leri\b", "Cumartesileri"),
    (r"Cumartesi' leri\b", "Cumartesileri"),
    (r"fotoğraflarm\b", "fotoğraflarını"),
    (r"cceker\b", "çeker"),
    (r"qikip\b", "çıkıp"),
    (r"alacak mydin\b", "alacak mıydın"),
    (r"içgerik\b", "içerik"),
    (r"Hiçkinıklar'\b", "Hıçkırıkları"),
    (r"Hiçkinıklar\b", "Hıçkırıklar"),
    (r"içgin\b", "için"),
    (r"tavrım\b", "tavrını"),
    (r"Gnerisine\b", "önerisine"),
    (r"dışarm' çıkmamahilar\b", "dışarı çıkmamalılar"),
    (r"yardımc'\b", "yardımcı"),
    (r"ağçmak\b", "açmak"),
    (r"sınavlarım'\b", "sınavlarını"),
    (r"sdyleyelim\b", "söyleyelim"),
    (r"Yata'imda\b", "Yatağımda"),
    (r"6miir boyu\b", "ömür boyu"),
    (r"döğleden\b", "öğleden"),
    (r"\bKutliphanede\b", "Kütüphanede"),
    (r"\bKutliphane\b", "Kütüphane"),
    (r"\bkutliphane\b", "kütüphane"),
    (r"\btilkede\b", "ülkede"),
    (r"\btilke\b", "ülke"),
    (r"\byash\b", "yaşlı"),
    (r"\bBatakhkların\b", "Bataklıkların"),
    (r"\bBatakhk\b", "Bataklık"),
    (r"\bbatakhk\b", "bataklık"),
    (r"\bPeter'l\b", "Peter'ı"),
    (r"\bgiin\b", "gün"),
    (r"\bgérmez\b", "görmez"),
    (r"\bgérmiiyor\b", "görmüyor"),
    (r"\byih\b", "yılı"),
    (r"\bilging\b", "ilginç"),
    (r"\bde&il\b", "değil"),
    (r"\bgeğcemezsin\b", "geçemezsin"),
    (r"\bgegemez\b", "geçemez"),
    (r"\bbeŞendim\b", "beğendim"),
    (r"\bçalışmyor\b", "çalışmıyor"),
    (r"\bsözlii\b", "sözlü"),
    (r"\bgürultii\b", "gürültü"),
    (r"\bGdung\b", "ödünç"),
    (r"\bGdeseniz\b", "ödeseniz"),
    (r"\bGerçedi\b", "Gerçeği"),
    (r"\beBer\b", "eğer"),
    (r"\bhoşlanmnyor\b", "hoşlanmıyor"),
    (r"\bKızınzz\b", "Kızınız"),
    (r"\bgittikçe şişmanhyor\b", "gittikçe şişmanlıyor"),
    (r"\byalmz\b", "yalnız"),
    (r"\bGeğ\b", "Geç"),
    (r"\bgeg\b", "geç"),
    (r"\bHarg ücretini ddemeyi\b", "Harç ücretini ödemeyi"),
    (r"\b6nUmuzdeki\b", "önümüzdeki"),
    (r"\bönUmuzdeki\b", "önümüzdeki"),
    (r"\byaty\b", "yazıyor"),
    (r"\bİgeri\b", "İçeri"),
    (r"\bMiusteri\b", "Müşteri"),
    (r"\bSzur\b", "özür"),
    (r"\bSzür\b", "özür"),
    (r"\bsinlsiklam\b", "sırılsıklam"),
    (r"\bgöçük bakıcısı\b", "çocuk bakıcısı"),
]

for cat, sentences in data.items():
    for s in sentences:
        tr = s.get('turkish', '')
        en = s.get('english', '')
        
        for pattern, repl in fixes:
            tr = re.sub(pattern, repl, tr)
            
        # Clean extra spaces
        tr = re.sub(r'\s+', ' ', tr).strip()
        en = re.sub(r'\s+', ' ', en).strip()
        
        s['turkish'] = tr
        s['english'] = en

with open('src/data/json/all_sentences.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Saved cleaned all_sentences.json!')
