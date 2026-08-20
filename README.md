# kısayol — Kişisel Hızlı Erişim Sayfası

Bu proje, kullanıcının en sık ziyaret ettiği web sitelerini tek bir yerde,
sade ve kullanışlı bir arayüzle toplayan kişisel bir **başlangıç / sık
kullanılanlar sayfasıdır**. Tarayıcıların dağınık favori sekmeleri yerine;
aranabilir ve kullanım sıklığına göre kendi kendini sıralayan tek bir
liste sunar — en çok tıklanan siteler otomatik olarak en üste çıkar.

## Amaç

Her kullanıcının onlarca sık ziyaret ettiği site vardır (ders platformu,
e-posta, GitHub, sosyal medya vb.). Bu siteler genelde tarayıcı
yer imlerinde dağınık biçimde durur. Bu proje, bu siteleri tek bir
kişisel panelde toplayarak hem görsel hem işlevsel olarak daha
kullanışlı bir erişim noktası sağlamayı amaçlar.

## Özellikler

- **Otomatik sıralama** — her linkin tıklanma sayısı tutulur, liste bu
  sayıya göre en çoktan aza sıralanır; ilk üç sıradaki siteler rozetle
  ("#1 en çok kullanılan" vb.) vurgulanır.
- **Ekle / Düzenle / Sil** — her link için ad, adres ve isteğe bağlı
  emoji ikon tanımlanabilir.
- **Arama** — `/` kısayoluyla anında arama kutusuna odaklanılır, isim
  veya alan adına göre filtreleme yapılır.
- **Klavye kısayolları** — `/` arama, `n` yeni link, `Esc` pencereleri kapatır.
- **Açık / Koyu tema** — sağ üstteki düğmeyle anında değiştirilebilir.
- **Veri yedekleme** — tüm veriler JSON olarak dışa aktarılabilir ve
  başka bir tarayıcıya/cihaza içe aktarılabilir.
- **Otomatik site ikonu (favicon)** getirme; site ikonu bulunamazsa
  isim baş harfinden otomatik rozet oluşturulur.
- **Kalıcı veri** — hiçbir sunucu/veritabanı gerekmez; tüm veriler
  tarayıcının `localStorage` alanında saklanır.
- **Chrome eklentisi** — `extension/` klasörü, tarayıcının yeni sekme
  sayfasını doğrudan bu uygulamayla değiştiren bir Chrome eklentisi
  olarak da yüklenebilir (aşağıya bakın).

## Kullanılan Teknolojiler

- **HTML5** — semantik sayfa yapısı
- **CSS3** — CSS değişkenleri (custom properties) ile tema sistemi,
  grid/flexbox düzeni, animasyonlar
- **Vanilla JavaScript (ES6+)** — herhangi bir framework/kütüphane
  kullanılmadan tüm mantık (state yönetimi, DOM güncelleme, localStorage,
  klavye olayları) sıfırdan yazılmıştır
- **Google Fonts** — Fraunces (başlık), Manrope (gövde metni), JetBrains
  Mono (teknik/etiket metinleri)
- **Google Favicon servisi** — site ikonlarının otomatik getirilmesi için

## Dosya Yapısı

```
kısayol/
├── index.html        → web sayfası iskeleti ve tüm bileşenler (modallar dahil)
├── style.css         → tema, düzen, animasyon ve tüm görsel tasarım
├── script.js         → uygulama mantığı (state, render, olaylar)
├── extension/        → aynı uygulamanın Chrome eklentisi hâli
│   ├── manifest.json → eklenti tanımı (yeni sekme sayfasını devralır)
│   ├── index.html, style.css, script.js → web sürümüyle birebir aynı
│   └── icons/         → eklenti simgeleri (16/48/128px)
└── README.md         → bu dosya
```

## Çalıştırma (web sayfası olarak)

Kurulum veya derleme gerekmez. `index.html` dosyasını herhangi bir
modern tarayıcıda (Chrome, Edge, Firefox) çift tıklayarak açmak
yeterlidir. İnternet bağlantısı; yalnızca Google Fonts ve site
ikonlarının yüklenmesi için kullanılır, bağlantı olmasa da uygulama
sistem yazı tipleriyle ve harf rozetleriyle sorunsuz çalışmaya devam eder.

## Chrome eklentisi olarak yükleme

`extension/` klasörü, sayfayı tarayıcının **yeni sekme** ekranının
yerine geçirecek şekilde paketler. Yüklemek için:

1. Chrome'da `chrome://extensions` adresine git.
2. Sağ üstten **Geliştirici modu**'nu (Developer mode) aç.
3. **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıkla.
4. Bu projedeki `extension` klasörünü seç.
5. Yeni bir sekme açtığında (Ctrl+T) kısayol sayfası karşına çıkar.

Not: Bu, Chrome Web Store'a yayınlamadan, yerel/geliştirici modda
yüklenen bir eklentidir — okul projesi/demo için idealdir, mağazaya
yayınlamak ayrıca bir geliştirici hesabı ve inceleme süreci gerektirir.

## Veri Modeli

Uygulama durumu `localStorage` içinde `kisayol.v2` anahtarıyla şu
biçimde saklanır:

```json
{
  "theme": "dark",
  "links": [
    {
      "id": "a1b2c3",
      "name": "GitHub",
      "url": "https://github.com",
      "emoji": "",
      "clicks": 14,
      "createdAt": 1734000000000
    }
  ]
}
```

## Olası Geliştirmeler

- Kullanıcı hesabı ile bulutta senkronizasyon (şu an tek tarayıcıya özel)
- Tarayıcı yer imlerinden toplu içe aktarma
- Link etiketleme / gruplama (isteğe bağlı, mevcut sadelikten ödün vermeden)
