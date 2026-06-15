# OnFlow

Planner harian dan cashflow pribadi, disiapkan sebagai aplikasi single-user di Vercel dengan penyimpanan Supabase.

## Menjalankan secara lokal

Untuk melihat UI statis:

```bash
python3 -m http.server 8127
```

Untuk menguji API autentikasi dan sinkronisasi:

```bash
npm install -g vercel
cp .env.example .env.local
vercel dev
```

## Menyiapkan Supabase

1. Buat proyek Supabase.
2. Jalankan isi `supabase/schema.sql` melalui SQL Editor.
3. Salin Project URL dan `service_role` key ke environment variables Vercel.
4. Jangan pernah menaruh service role key di `app.js`, HTML, atau repository.

## Environment variables Vercel

- `APP_USERNAME`: username login OnFlow.
- `APP_PASSWORD`: password panjang dan unik.
- `SESSION_SECRET`: minimal 32 karakter acak.
- `SUPABASE_URL`: URL proyek Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key Supabase.
- `APP_STATE_ID`: ID dokumen state, biasanya `primary`.

## Deploy

1. Commit proyek ke Git.
2. Import repository di Vercel.
3. Tambahkan seluruh environment variables.
4. Deploy.
5. Setelah login pertama, data lokal perangkat tersebut akan menjadi data awal cloud jika cloud masih kosong.

Data tetap dicache di `localStorage` agar UI cepat dan dapat dibuka saat koneksi terputus. Saat sesi cloud aktif, perubahan disinkronkan ke Supabase.

Jika environment Supabase belum dipasang, login tetap bisa masuk sebagai mode sementara dan data tersimpan lokal di perangkat tersebut.
