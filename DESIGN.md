# DevPocket

Panduan visual untuk aplikasi catatan koding pribadi. Fokus utamanya menyimpan temuan, membaca catatan, dan menemukan kembali item.

## Dasar desain

Referensi: [Utility App / Focus Utility](https://github.com/albemala/design-md-library/tree/main/design-md/utility-app).

Pilihan pemilik: Utility App sebagai referensi, gaya neumorphism, tanpa eyebrow, copywriting singkat, dan deskripsi hanya ketika diperlukan. Referensi memberi dasar keterbacaan, pengelompokan, dan warna netral hangat; susunan halaman mengikuti kebutuhan DevPocket.

Karakter: tenang, personal, teratur. Bahasa visual: permukaan hangat dengan kedalaman lembut. Motifnya berupa wadah catatan yang sedikit terangkat dan bidang input yang masuk ke permukaan.

Dial: ENERGY 1 / RHYTHM 1 / MOTION 1.

- ENERGY 1: isi catatan paling menonjol; warna aksen dipakai pada tindakan utama dan pilihan aktif.
- RHYTHM 1: daftar dan posisi kontrol konsisten agar mudah dipindai berulang kali.
- MOTION 1: umpan balik singkat pada hover, fokus, dan tekan; perpindahan tampilan berlangsung langsung.

## Aturan utama

- Gunakan neumorphism dengan bayangan lembut dan arah cahaya konsisten.
- Tanpa eyebrow dalam bentuk apa pun: teks kecil, badge, atau label dekoratif di atas judul.
- Judul dan label yang sudah jelas cukup berdiri sendiri. Hilangkan subtitle yang mengulang artinya.
- Gunakan bahasa Indonesia yang singkat, langsung, dan sesuai tindakan.
- Deskripsi muncul untuk membantu keputusan, menjelaskan kegagalan, atau memberi petunjuk yang memang diperlukan.
- Isi catatan milik pengguna boleh panjang. Aturan ringkas berlaku pada teks antarmuka.

## Permukaan dan neumorphism

Gunakan warna dasar yang berdekatan untuk memberi kesan komponen dibentuk dari permukaan yang sama. Cahaya datang dari kiri atas; bayangan gelap jatuh ke kanan bawah.

| Elemen | Perlakuan | Tujuan |
| --- | --- | --- |
| Wadah utama | Sedikit terangkat | Memisahkan area kerja dari kanvas |
| Input pencarian dan editor | Inset ringan | Menandai tempat memasukkan atau menulis isi |
| Tombol | Terangkat ringan; inset saat ditekan | Memberi umpan balik tindakan |
| Item daftar dan metadata | Datar, dengan jarak atau pemisah seperlunya | Menjaga daftar tetap mudah dipindai |
| Dialog dan menu | Elevasi lebih jelas | Menandai lapisan yang sedang aktif |

Batasi elevasi utama pada satu atau dua area per tampilan. Hindari bayangan besar pada setiap item dan tumpukan panel berbayang di dalam panel lain. Efek tekan tidak mengubah ukuran atau posisi layout.

Sertakan label, batas bidang, serta perubahan fokus dan seleksi yang jelas. Kontrol harus tetap bisa dikenali ketika bayangannya tidak terlihat. Status disabled dan aktif memiliki perbedaan selain kedalaman bayangan.

## Warna

Palet awal mengikuti referensi Utility App. Nilai ini menjadi titik awal implementasi dan diperiksa lagi pada komponen yang dirender.

| Token | Nilai awal | Penggunaan |
| --- | --- | --- |
| Canvas | `#F5F4F0` | Latar netral hangat untuk membaca |
| Surface | `#F5F4F0` | Permukaan neumorphic yang menyatu dengan kanvas |
| Surface inset | `#ECEAE3` | Bidang input dan area pendukung |
| Text | `#151412` | Judul, isi, dan label utama |
| Text secondary | `#57534B` | Platform, tanggal, dan metadata pendukung |
| Accent | `#2750D6` | Aksi utama, tautan, fokus, dan pilihan aktif |
| Border | `#CFCDC7` | Pemisah atau batas bidang yang diperlukan |
| Highlight | `#FFFFFF` | Sisi terang bayangan dan permukaan overlay |

Satu aksen biru mengarahkan perhatian pada tindakan yang sedang relevan. Warna feedback digunakan saat ada keberhasilan, peringatan, atau error yang nyata, selalu disertai teks atau bentuk yang membedakannya.

Target kontras teks biasa minimal 4.5:1; teks besar dan batas kontrol yang diperlukan minimal 3:1. Ukur pasangan warna aktual, termasuk hover, fokus, disabled, dan permukaan inset. Teks tidak memakai bayangan atau emboss.

Basis awal adalah tema terang hangat dari referensi yang dipilih. Jika tersedia pilihan tema, setiap tema membutuhkan token permukaan, bayangan, kontras, dan state yang diperiksa tersendiri.

## Tipografi, bentuk, dan jarak

- Font UI: Manrope dengan fallback system sans-serif, dipilih agar antarmuka terasa lebih segar sambil tetap nyaman untuk daftar dan catatan.
- Font kode: JetBrains Mono dengan fallback monospace, khusus blok kode dan inline code agar indentasi mudah dibaca.
- Isi catatan sekitar 16px dengan line-height 1.6. Metadata tetap terbaca; hierarki dibantu ukuran dan bobot, bukan teks yang terlalu pucat.
- Judul memakai sentence case. Hindari huruf kapital dengan tracking lebar dan heading monospace dekoratif.
- Radius awal: 8px untuk kontrol, 14px untuk wadah, 20px untuk dialog. Bentuk ini membedakan ukuran dan fungsi elemen.
- Skala jarak: 4, 8, 12, 16, 24, dan 32px. Kelompokkan kontrol terkait dengan jarak kecil; pisahkan kelompok dan isi bacaan dengan jarak lebih besar.

## Hierarki layar

Satu tampilan memiliki satu fokus utama: menelusuri daftar, membaca atau mengedit item, atau mencari catatan.

- Navigasi utama menggunakan Semua Item, Draft, dan Koleksi. Kategori menjadi akses ke pengelompokan item.
- Pencarian mudah dijangkau dari tampilan koleksi. Tindakan Tambah catatan terlihat jelas tanpa banner pengantar.
- Daftar menonjolkan judul. Platform, tanggal ditambahkan, kategori, dan status ditempatkan sebagai metadata ringkas.
- Potongan isi ditampilkan jika membantu mengenali item; judul yang cukup jelas tidak wajib mendapat deskripsi tambahan.
- Detail item memberi ruang utama untuk Markdown, dengan link dan embed sebagai konteks sumber.
- Filter platform, tanggal, kategori, dan status dikelompokkan agar tidak memenuhi area membaca.
- Pada mobile, navigasi dan filter bisa diringkas; daftar dan detail menggunakan area baca satu kolom.

Jumlah item boleh muncul sebagai angka kecil dari data nyata jika membantu navigasi. Hindari dashboard statistik, grafik aktivitas, kartu promosi, dan feed yang tidak diperlukan untuk mengelola catatan.

## Teks antarmuka

| Konteks | Contoh teks |
| --- | --- |
| Pencarian | Cari catatan |
| Tambah item | Tambah catatan |
| Simpan cepat | Simpan ke Draft |
| Bantuan penulisan | Buat dengan AI |
| Simpan item rapi | Simpan ke Koleksi |
| Penggunaan | Ingin dicoba / Aktif digunakan / Referensi |
| Daftar kosong | Belum ada catatan |
| Pencarian kosong | Tidak ada yang cocok |
| Gagal menyimpan | Gagal menyimpan. Coba lagi. |
| AI gagal membaca sumber | Sumber belum bisa dibaca. Tambahkan teks atau screenshot. |

Label tindakan tidak membutuhkan deskripsi di bawahnya. Placeholder memberi contoh format atau petunjuk pengisian jika diperlukan; field tetap punya label. Error ditempatkan dekat tindakan atau field yang bermasalah. Konfirmasi keberhasilan cukup singkat, misalnya Tersimpan.

Hindari slogan, sambutan panjang, istilah promosi AI, emoji dekoratif, dan tanda pisah em dash pada teks UI. Ringkasan isi catatan dari AI tetap boleh informatif sesuai sumber.

## Markdown, sumber, dan AI

- Editor membedakan mode Tulis dan Preview dengan label yang jelas. Area tulis tetap lapang dan terbaca.
- Blok kode mempertahankan indentasi, memiliki bahasa jika diketahui, dan dapat digulir horizontal di dalam bloknya.
- Link sumber tetap tersedia saat embed gagal. Embed mendapat ruang dengan ukuran atau rasio yang ditetapkan agar halaman tidak melompat saat dimuat.
- Proses AI memiliki status yang singkat, seperti Membaca sumber atau Membuat catatan. Catatan yang tersimpan tetap bisa dibuka ketika AI gagal.
- Hasil pencarian AI menampilkan item asli. Alasan kecocokan cukup satu kalimat jika berguna dan tidak mengulang judul.
- Tidak ada ringkasan seolah-olah sumber berhasil dibaca ketika pengambilannya gagal. Status penggunaan tetap pilihan pengguna.

Ikon item bersifat opsional. Pilihan bawaan memakai simbol teknis yang langsung menggambarkan isi catatan, seperti kode, terminal, database, atau dokumentasi. Logo proyek dan brand berasal dari gambar yang dipilih pemilik dan bisa dipakai ulang; aplikasi tidak membuat logo brand sendiri.

Ikon instalasi PWA memakai tanda sementara berupa folder dan simbol kode, mengikuti warna DevPocket. Ganti dengan logo final jika pemilik sudah menentukan identitas aplikasi.

## Interaksi dan aksesibilitas

- Hover, fokus, tekan, terpilih, dan disabled harus dapat dibedakan. Neumorphism mendukung umpan balik tersebut.
- Aksi menggunakan button; navigasi menggunakan link dengan tujuan nyata. Tombol berikon memiliki nama aksesibel.
- Semua kontrol dapat dioperasikan dengan keyboard dan memiliki indikator fokus yang jelas.
- Dialog dapat ditutup dengan Escape dan mengembalikan fokus ke pemicunya.
- Target sentuh minimal 44px. Teks panjang membungkus, dan halaman tidak memiliki overflow horizontal di luar blok kode atau konten yang memang perlu digulir.
- Motion mengikuti preferensi reduced motion. Tidak ada animasi dekoratif yang berulang.
- Setiap tampilan data memiliki empty, loading, dan error state dengan teks seperlunya. Penyimpanan yang gagal mempertahankan input pengguna.

## Status panduan

Arah visual berasal dari kesepakatan pemilik; token dan ukuran di atas adalah nilai awal implementasi. Dokumen ini menjadi acuan pembangunan UI. Tampilan, kontras aktual, keyboard, mobile, dan seluruh state masih perlu diverifikasi setelah aplikasi tersedia.

