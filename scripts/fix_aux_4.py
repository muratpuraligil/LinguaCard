import json
import os

def fix_had_been():
    # Cleaned data for HAD BEEN (aux-4)
    # I transcribed these from the images seen in the turn
    cleaned_turkish = [
        "Tren yarım saattir istasyondaydı.",
        "Güneş gözlüklerim dünden beri ofisteydi.",
        "Bu mağazadaki gömlekler iki gündür indirimdeydi.",
        "Beş yıldan fazla bir süredir bu şirkette satış temsilcisiydi.",
        "Geçen Pazartesi’den beri hava çok soğuktu.",
        "Odanın anahtarı günlerdir kayıptı.",
        "Bilgisayar şirketleri on yıldan fazla bir süredir New York'taydı.",
        "Annem geçen haftadan beri benim için çok endişeliydi.",
        "İtfaiye erleri on dakikadır yanan binanın önündeydiler.",
        "Ali, 2015'ten beri bu şirkette düzenli çalışanlardan biriydi.",
        "Bill yıllardır yavaş bir sporcuydu.",
        "Bob son beş yıldır kötü bir oyuncuydu.",
        "George, emekli olmadan önce, 2002'den beri hızlı bir şofördü.",
        "Hasan burada çalışmaya başlamadan önce, dört yıldır ciddi bir işçiydi.",
        "Bu yarıştan önce aylardır dikkatli bir sürücüydü.",
        "Evlenmeden önce, yedi yıldır hızlı bir ressamdı.",
        "İşi bırakmaya karar verdiğinde iyi bir öğretmendi.",
        "Son romanına kadar yıllarca iyi bir yazardı.",
        "Mary yeni işinden önce dikkatsiz bir yazardı.",
        "Mehmet, kötü bir kaza geçirene kadar, dikkatli bir sürücüydü.",
        "Kardeşim sağ bacağını kırmadan önce, hızlı bir koşucuydu.",
        "Annem hastalanana kadar, iyi bir aşçıydı.",
        "Peter bu şansı elde edene kadar, kötü bir oyuncuydu.",
        "Hamile kalmadan önce, hızlı yüzücüydü.",
        "Bölümünü değiştirmeden önce, kibar bir konuşmacıydı.",
        "Neredeyse üç yıldır hızlı bir yazardı.",
        "İkizler paralarını kaybedene kadar, çok çalışkanlardı.",
        "Şirketleri iflas etmeden önce, meşgul işçilerdi.",
        "Baba olmadan önce, tehlikeli sürücüydüler.",
        "Bırakmaya karar verene kadar, altı yıldır ağır sigara içicilerdi.",
        "Yöneticileri onları uyarmadan önce, sessiz işçilerdi.",
        "Onlar sonuçları açıklayana kadar, saatlerdir çok endişeliydik.",
        "Zeynep pratik yapmadan önce, akıcı bir konuşmacı değildi.",
        "Son sınavda kötü bir not alana kadar, çok zeki bir öğrenciydi.",
        "Kurallara uymadan önce, dikkatsiz bir işçiydi.",
        "Bu sandalye, sen onu kırana kadar, son iki yıldır çok rahattı.",
        "On beş yaşına kadar çok uzun değildi.",
        "David, yeni öğretmeniyle tanışmadan önce, çok çalışkan bir öğrenci değildi.",
        "Kanepem son bir aydır pek rahat değildi.",
        "Planınız, siz öğrenmeden önce, pek iyi değildi.",
        "Bu çiçekler, ben onlara bakana kadar, çok iyi değildi.",
        "Sen bana yardım edene kadar, çantalarım çok ağırdı.",
        "Bu kursa başlamadan önce, sanata çok ilgili değildim.",
        "Hava, haftalardır çok sıcak değildi.",
        "Bu domatesler yarım saattir tezgahın üzerindeydi.",
        "Bu bıçak, ben onu keskinleştirmeden önce çok keskin değildi.",
        "İnsanlar savaştan önce çok kibarlardı.",
        "Yaklaşık beş yıldır aşçıydı.",
        "Hava, üç gündür bulutluydu.",
        "Onlar, onu bir restorana dönüştürmeden önce, o yıllarca bir uçaktı.",
        "Onunla tanışmadan önce, önemli oyunculardan biriydi.",
        "İstanbul'a taşınmadan önce, 2014 yılından beri Antalya'daydılar.",
        "Kardeşim arabayı çarpana kadar, araba yeniydi.",
        "İşçiler, zili duymadan önce, yarım saattir fabrika dışındaydılar.",
        "Ben onu aramadan önce, trafik nedeniyle geç kaldı.",
        "Müdür öğrenciler uyarana kadar, onlar tembellerdi.",
        "Çözmek için kolay bir yol bulana kadar, sorular zordu.",
        "Son seçime kadar dört yıldır Başbakan’dı.",
        "Onlar bize yardım edene kadar kötü bir durumdaydık.",
        "Neredeyse beş gündür evdeydiler.",
        "Okulun basketbol takımına katılmadan önce, kısa boyluydu.",
        "Kedi, ben onu dışarı çıkarana kadar, masanın altındaydı.",
        "Kursu tamamlamadan önce, geçen Mart'tan beri Britanya'daydı.",
        "Kötü haberi duyana kadar bir haftadır mutluydular.",
        "Ameliyat olmadan önce, aylardır hastaydı.",
        "Toplantı, onlar takvimi değiştirmeden önce, yıllardır Çarşamba günleriydi.",
        "Federasyon bazı düzenlemeler yapmadan önce, futbol maçları saat ikideydi.",
        "İngiltere'de yaşamaya başlayana kadar, beş yıldır Almanya'daydı.",
        "Sözlük, yarım saattir masanın üstündeydi.",
        "Kapı, biri onu açana kadar, sabahtan beri kapalıydı.",
        "Büyükbabam, o restoranı satana kadar, yirmi yıldır o restoranın sahibiydi.",
        "Onlar, telefonu tamir etmeden önce, telefon neredeyse iki saattir bağlantısızdı.",
        "Onlar, tamirci çağırmadan önce, pencere günlerdir kırık değil miydi?",
        "Onlar, onu uyandırdıklarında, o 12 saattir yatakta mıydı?",
        "Tren nihayet geldiğinde, 90 dakika istasyonda mıydılar?",
        "Yüzüğü banyoda bulduğumuzda, yüzük iki saattir kayıp mıydı?",
        "Aniden yağmur yağmaya başladığında, uzun zamandır parkta değil miydin?",
        "Londra'ya gitmeden önce, ne kadar süredir İngilizce sınıfındaydı?",
        "Frank, doktoru onu tedavi edene kadar, günlerdir hastaydı.",
        "Benzini bittiğinde bir saatten az bir süredir yolda değil miydi?",
        "Çocuklar yüzünden günlerdir çok yorgun değiller miydi?",
        "Ben onu almadan önce, iki saattir sinemadaydı.",
        "Yeni bir ev satın almadan önce, iki gündür çok gergindiler.",
        "Tony gelmeden önce, onlar yarım saattir etkinlikteydiler.",
        "Onu kovduklarında, üç yıldır o şirketteydi.",
        "Otobüse binmek için ne kadar süredir otobüs durağındaydın?",
        "Mike yirmi dakikadır kahve dükkanındaydı.",
        "James, Asya'ya gitmeden önce, bir yıldan fazla bir süredir üniversitedeydi.",
        "Uykuya dalmadan önce, çok yorgundu.",
        "Giysilerini çamaşır makinesine koymadan önce, çok kirliydi.",
        "Sen onları aramadan önce, bir saattir düğün töreninde değiller miydi?",
        "Boşanmadan önce, ne kadar süredir evlilerdi?",
        "İki buçuk yıldır gizli bir çalışmanın parçasıydı.",
        "Dükkandaki elektronik klavyeyi satmadan önce, toz içindeydi.",
        "Mario çok fazla pratik yapana kadar, mükemmel bir müzisyen değildi.",
        "Bestecilik yapmaya başlamadan önce, üç yıldır piyano sınıfındaydı.",
        "Yakın arkadaşın, karısı onunla konuşmadan önce, bir saattir stadyumda mıydı?",
        "Rengini siyaha değiştirene kadar, evin duvarlarının rengi beyazdı.",
        "Ben onu rahatlatmadan önce, dakikalardır çok stresliydi.",
        "Ebeveynlerin seni aramadan önce, sen saatlerdir onlarla mıydın?"
    ]

    # Load all_sentences.json
    path = 'src/data/json/all_sentences.json'
    with open(path, 'r', encoding='utf-8') as f:
        all_data = json.load(f)
    
    # Update aux-4
    if "aux-4" in all_data:
        sentences = all_data["aux-4"]
        for i, text in enumerate(cleaned_turkish):
            if i < len(sentences):
                sentences[i]["turkish"] = text
    
    # Save back
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print("Fixed aux-4 in all_sentences.json")

if __name__ == "__main__":
    fix_had_been()
