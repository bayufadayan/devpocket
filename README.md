# DevPocket

Catatan pribadi untuk menyimpan temuan coding dari media sosial dan sumber lain: konsep, tools, library, contoh kode, dan project open source.

## Isi

- Simpan catatan Markdown beserta platform dan tautan sumber.
- Atur catatan dalam folder, atau simpan sebagai draft.
- Tandai catatan koleksi sebagai **Ingin dicoba**, **Aktif digunakan**, atau **Referensi**.
- Cari semua catatan lewat pencarian teks atau pencarian AI opsional.
- Pasang aplikasi sebagai PWA. Shell aplikasi bisa dibuka offline, tetapi catatan memerlukan koneksi internet.
- Tambahkan ikon pada catatan dengan memilih ikon atau mengunggah ikon sendiri.

## Teknologi

- React, TypeScript, dan Vite
- Cloudflare Worker dan Hono
- Cloudflare D1 untuk catatan dan folder
- Cloudflare R2 untuk ikon yang diunggah
- Gemini API opsional untuk membuat saran catatan dari tautan dan pencarian semantik

## Menjalankan lokal

```sh
cd app
npm install
npm run db:migrate:local
npm run dev
```

Untuk fitur AI lokal, salin `app/.dev.vars.example` ke `app/.dev.vars`, lalu isi `GEMINI_API_KEY`. File `.dev.vars` tidak boleh di-commit.

Perintah tambahan dan detail Cloudflare ada di [README aplikasi](app/README.md) dan [dokumen setup](docs/CLOUDFLARE_SETUP.md). Arah desain dan alur data dijelaskan di [DESIGN.md](DESIGN.md) dan [docs/APP_OVERVIEW.md](docs/APP_OVERVIEW.md).

## Produksi

Worker produksi: [devpocket.fadayan.workers.dev](https://devpocket.fadayan.workers.dev). Aplikasi dilindungi Cloudflare Access dan memerlukan login.
