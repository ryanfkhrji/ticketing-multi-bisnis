# HelpDesk Mini

Aplikasi ticketing **multi-bisnis (multi-tenant)**. Pelanggan mengirim keluhan, lalu tiket itu menjadi ruang chat real-time dengan staf bisnis yang bersangkutan. Satu platform melayani banyak bisnis, dan **data satu bisnis tidak pernah terlihat oleh bisnis lain**.

Proyek ini dibuat untuk Test Junior Developer @SVO Connect.

- **Video demo:** https://drive.google.com/file/d/1TY-b7J8hDo-1ZQvj2W3KYEcOyukHXqa0/view?usp=sharing
- **Estimasi waktu menjalankan dari nol:** sekitar 10–15 menit

## Daftar isi

1. [Tech stack](#tech-stack)
2. [Fitur](#fitur)
3. [Cara menjalankan dari nol](#cara-menjalankan-dari-nol)
4. [Environment variable](#environment-variable)
5. [Akun demo](#akun-demo)
6. [Peran dan hak akses](#peran-dan-hak-akses)
7. [Isolasi data antar-bisnis](#isolasi-data-antar-bisnis)
8. [Alur status tiket](#alur-status-tiket)
9. [Live chat (WebSocket)](#live-chat-websocket)
10. [Endpoint API](#endpoint-api)
11. [Model data](#model-data)
12. [Struktur proyek](#struktur-proyek)
13. [Skenario video demo](#skenario-video-demo)
14. [Catatan](#catatan)

---

## Tech stack

| Lapisan | Yang dipakai | Keterangan |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript | Wajib di soal |
| Styling dan UI | Tailwind CSS, shadcn/ui | Tailwind disarankan di soal. shadcn/ui tambahan |
| Data fetching | TanStack React Query | Disarankan di soal |
| Form dan state | react-hook-form, zustand | Tambahan. zustand hanya untuk sesi login |
| Backend | Python 3.11+, FastAPI | Wajib Python. FastAPI disarankan di soal |
| Database | PostgreSQL | Disarankan di soal |
| ORM dan migrasi | SQLAlchemy 2.0, Alembic | Skema dibuat lewat migrasi |
| Auth | JWT (access dan refresh token), hash password **Argon2** | Soal mengizinkan bcrypt atau argon2 |
| Real-time | WebSocket bawaan FastAPI | Sesuai soal |

Tidak ada pilihan di kolom "Disarankan" yang diganti. Tambahan (shadcn/ui, react-hook-form, zustand) tidak menggantikan apa pun dari soal.

---

## Fitur

Mengikuti daftar "Fitur wajib" di soal.

**Auth**

- [x] Daftar bisnis baru: membuat satu bisnis sekaligus akun Business Admin-nya
- [x] Login email dan password, mengembalikan access token dan refresh token
- [x] Endpoint refresh token dan `/auth/me`
- [x] Business Admin membuat akun Agent dan Customer untuk bisnisnya
- [x] Password disimpan sebagai hash dan tidak pernah dikembalikan di response
- [x] Halaman yang butuh login otomatis diarahkan ke `/login` kalau belum login atau token habis

**Tiket**

- [x] Customer membuat tiket: judul, kategori, prioritas (`low`, `medium`, `high`), dan pesan pertama
- [x] Daftar tiket sesuai peran, dengan filter status, diurutkan dari aktivitas terbaru
- [x] Agent mengambil tiket, Admin meng-assign tiket ke agen tertentu
- [x] Status `open` → `in_progress` → `resolved` → `closed`, Customer bisa membuka kembali tiket `resolved`

**Live chat**

- [x] Setiap tiket adalah satu ruang chat, pesan baru muncul tanpa refresh
- [x] Riwayat pesan tersimpan di database dan dimuat saat tiket dibuka
- [x] Setiap pesan menampilkan nama pengirim, perannya, dan waktu kirim
- [x] WebSocket diautentikasi dengan token yang sama, koneksi tanpa token valid ditolak
- [x] Perubahan status tiket ikut terkirim real-time ke semua yang membuka tiket itu
- [x] Tiket `closed` tidak bisa menerima pesan baru

**Halaman frontend:** `/login`, `/register`, `/tickets`, `/tickets/new`, `/tickets/[id]`, `/admin/users`. Tampilan daftar tiket berubah menjadi kartu di layar HP, dan setiap halaman punya state loading dan error.

---

## Cara menjalankan dari nol

### Yang perlu terpasang

| Kebutuhan | Versi |
|---|---|
| Python | 3.11 atau lebih baru |
| Node.js | 20.9 atau lebih baru |
| PostgreSQL | 14 atau lebih baru |
| Git | terbaru |

Docker tidak dipakai (lihat [Catatan](#belum-selesai)). Database berjalan langsung di PostgreSQL lokal.

Perintah di bawah memakai **Windows PowerShell**. Untuk macOS atau Linux, bedanya hanya dua:

| Windows PowerShell | macOS / Linux |
|---|---|
| `.venv\Scripts\Activate.ps1` | `source .venv/bin/activate` |
| `Copy-Item .env.example .env` | `cp .env.example .env` |

### 1. Ambil kode

```powershell
git clone https://github.com/ryanfkhrji/ticketing-multi-bisnis.git
cd ticketing-multi-bisnis
```

### 2. Siapkan database

Masuk ke PostgreSQL sebagai user `postgres` (password-nya yang Anda isi saat memasang PostgreSQL):

```powershell
psql -U postgres -h localhost
```

Lalu buat database kosong. Pemiliknya otomatis `postgres`:

```sql
CREATE DATABASE ticketing_db;
\q
```

### 3. Jalankan backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Buat `SECRET_KEY` acak, lalu isi `backend/.env` (lihat [Environment variable](#environment-variable)):

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Buat tabel lewat migrasi, isi data demo, lalu jalankan server:

```powershell
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

Cek di browser:

- `http://127.0.0.1:8000/test` harus menampilkan `{"status":"ok","database":"connected"}`
- `http://127.0.0.1:8000/docs` adalah dokumentasi API interaktif (Swagger)

### 4. Jalankan frontend

Buka terminal baru dari root repo:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Buka `http://localhost:3000` dan login dengan salah satu [akun demo](#akun-demo).

### Kalau ada masalah

| Gejala | Penyebab dan solusi |
|---|---|
| `password gagal diotentikasi` atau `password authentication failed` | Password atau nama database di `DATABASE_URL` tidak cocok. Karakter khusus di password harus di-encode (`$` menjadi `%24`, `@` menjadi `%40`), atau pakai password huruf dan angka saja |
| `ModuleNotFoundError` | Virtual environment belum aktif. Prompt harus diawali `(.venv)` |
| `database "ticketing_db" does not exist` | Langkah 2 belum dijalankan, atau nama database di `DATABASE_URL` berbeda dengan yang dibuat |
| Error CORS di console browser | `FRONTEND_ORIGINS` harus sama persis dengan alamat yang dibuka (`localhost` dan `127.0.0.1` dianggap berbeda). Restart backend setelah mengubah `.env` |
| Login berhasil di API tapi frontend tidak bisa tersambung | Pastikan `NEXT_PUBLIC_API_URL` di `frontend/.env.local` menunjuk ke backend, lalu restart `npm run dev` |

---

## Environment variable

Contoh nilai ada di file `.env.example` (tanpa secret asli). File `.env` dan `.env.local` tidak ikut di-commit.

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/DBNAME
SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=1
CORS_ORIGINS=http://localhost:3000
```

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | Alamat PostgreSQL. Contoh: `postgresql+psycopg://postgres:PASSWORD@localhost:5432/ticketing_db`, dengan `PASSWORD` diisi password user `postgres` Anda. Karakter khusus di password harus di-encode (`$` menjadi `%24`, `@` menjadi `%40`) |
| `SECRET_KEY` | Ya | Kunci penanda tangan JWT. Buat acak, minimal 32 byte, dan jangan dibagikan |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tidak | Umur access token. Default `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Tidak | Umur refresh token. Default `7` |
| `FRONTEND_ORIGINS` | Tidak | Alamat frontend yang diizinkan (CORS), dipisahkan koma. Default `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Tidak | Alamat backend. Alamat WebSocket diturunkan otomatis dari sini (`http` menjadi `ws`). Default `http://127.0.0.1:8000` |

---

## Akun demo

Dibuat oleh `python -m scripts.seed`. **Password semua akun: `Demo12345`**

| Bisnis | Peran | Nama | Email |
|---|---|---|---|
| Toko Elektronik Demo | Admin | Anton Admin | `admin@toko-demo.com` |
| Toko Elektronik Demo | Agent | Siska Agent | `agent@toko-demo.com` |
| Toko Elektronik Demo | Customer | Citra Customer | `customer1@toko-demo.com` |
| Toko Elektronik Demo | Customer | Dimas Customer | `customer2@toko-demo.com` |
| Warung Kopi Demo | Admin | Eka Admin | `admin@kopi-demo.com` |
| Warung Kopi Demo | Agent | Fajar Agent | `agent@kopi-demo.com` |
| Warung Kopi Demo | Customer | Gita Customer | `customer1@kopi-demo.com` |
| Warung Kopi Demo | Customer | Hadi Customer | `customer2@kopi-demo.com` |

Script seed aman dijalankan berulang kali: bisnis dan akun yang sudah ada dilewati. Password ini hanya untuk data demo.

---

## Peran dan hak akses

| Aksi | Admin | Agent | Customer |
|---|---|---|---|
| Kelola user (lihat daftar, buat Agent atau Customer) | Ya | Tidak | Tidak |
| Membuat tiket | Tidak | Tidak | Ya |
| Melihat tiket | Semua tiket bisnisnya | Semua tiket bisnisnya | Hanya tiket miliknya |
| Mengambil tiket (assign ke diri sendiri) | Tidak | Ya, tiket `open` yang belum punya agen | Tidak |
| Meng-assign atau mengganti agen | Ya, ke agen mana pun di bisnisnya | Tidak | Tidak |
| Mengubah status | Semua tiket, mengikuti alur status | Hanya tiket yang di-assign ke dirinya | Hanya membuka kembali tiket miliknya yang `resolved` |
| Membalas chat | Ya | Ya | Hanya di tiket miliknya |

Tombol dan menu yang tidak boleh dipakai suatu peran **tidak ditampilkan** di frontend, tetapi penolakan sebenarnya ada di backend (403 atau 404 kalau dipanggil langsung).

---

## Isolasi data antar-bisnis

Semua query tiket dan pesan difilter berdasarkan `business_id` user yang login. Filter ini dipaksa **di backend**, bukan hanya disembunyikan di UI.

| Aturan dari soal | Cara penerapannya |
|---|---|
| User bisnis A yang menebak ID tiket bisnis B mendapat **404** | Semua pengambilan tiket lewat satu fungsi, `get_ticket_for_user` di `backend/app/services/ticket_service.py`. Query-nya selalu memakai `WHERE business_id = <bisnis user>`. Kalau tidak ketemu, hasilnya 404 |
| Customer tidak bisa membuka tiket customer lain, meski satu bisnis | Fungsi yang sama menambah `AND customer_id = <user>` untuk peran Customer, hasilnya 404 |
| Koneksi WebSocket ke tiket yang bukan haknya ditolak | Handshake WebSocket memanggil fungsi yang sama. Kalau gagal, koneksi ditutup **sebelum** diterima |
| Email unik di seluruh platform | Constraint `UNIQUE` pada kolom `users.email`, ditambah pengecekan di aplikasi (email disimpan huruf kecil) |

`business_id` tidak pernah diambil dari input client. Selalu dari user yang sedang login. Pesan (`messages`) tidak punya `business_id` sendiri (sesuai model data di soal), jadi isolasinya lewat tiket: tiket divalidasi dulu, baru pesannya diambil.

---

## Alur status tiket

```
open ──(diambil Agent)──▶ in_progress ──(diselesaikan)──▶ resolved ──(ditutup)──▶ closed
  ▲                                                          │
  └──────────────── (Customer membuka kembali) ──────────────┘
```

- Hanya `resolved` yang bisa kembali ke `open`. `closed` adalah akhir dan terkunci untuk pesan baru.
- Mengambil atau meng-assign tiket `open` otomatis mengubah statusnya menjadi `in_progress`.
- Perubahan di luar alur ditolak dengan **409**.

---

## Live chat (WebSocket)

Alamat: `WS /ws/tickets/{id}?token=<access_token>`

- Token dicek sebelum koneksi diterima. Token tidak valid atau tiket bukan hak user akan ditolak (koneksi ditutup dengan kode 1008).
- Klien mengirim pesan dalam format JSON: `{"body": "isi pesan"}`. Pesan disimpan ke database, lalu disiarkan ke semua yang membuka tiket itu, termasuk pengirimnya.
- Server mengirim tiga jenis event:

```json
{"type": "message", "data": {"id": "...", "body": "...", "created_at": "...", "sender": {"name": "Citra", "role": "customer"}}}
{"type": "ticket_updated", "data": {"id": "...", "status": "in_progress", "assigned_agent": {"name": "Siska"}}}
{"type": "error", "detail": "Tiket sudah closed dan tidak bisa menerima pesan baru"}
```

- `ticket_updated` dikirim setiap ada perubahan status atau assignee lewat `PATCH /tickets/{id}`.
- Status `closed` dicek di database setiap kali pesan dikirim. Event `error` hanya dikirim ke pengirimnya.
- Di frontend, koneksi yang terputus disambung ulang otomatis (maksimal 5 kali, jeda bertambah), dan data yang mungkin terlewat diambil ulang setelah tersambung.

---

## Endpoint API

Dokumentasi interaktif tersedia di `/docs` (Swagger). Ringkasan:

| Method | Path | Peran | Fungsi |
|---|---|---|---|
| POST | `/auth/register-business` | Publik | Buat bisnis dan Business Admin |
| POST | `/auth/login` | Publik | Login, mengembalikan access dan refresh token |
| POST | `/auth/refresh` | Publik (refresh token) | Terbitkan access token baru |
| GET | `/auth/me` | Semua | Data user yang login dan bisnisnya |
| GET | `/users` | Admin | Daftar user di bisnisnya |
| POST | `/users` | Admin | Buat akun Agent atau Customer |
| GET | `/tickets` | Semua | Daftar tiket sesuai peran, filter `?status=` |
| POST | `/tickets` | Customer | Buat tiket dan pesan pertama |
| GET | `/tickets/{id}` | Sesuai akses | Detail tiket |
| PATCH | `/tickets/{id}` | Agent, Admin, Customer (reopen) | Ubah status **atau** assignee (isi salah satu) |
| GET | `/tickets/{id}/messages` | Sesuai akses | Riwayat pesan |
| WS | `/ws/tickets/{id}?token=...` | Sesuai akses | Kirim dan terima pesan dan perubahan status |
| GET | `/health` | Publik | Cek server dan database |

Semua endpoint selain yang berstatus Publik membutuhkan header `Authorization: Bearer <access_token>`.

### Format error

Semua error berbentuk JSON yang sama:

```json
{"error": {"status": 404, "message": "Tiket tidak ditemukan"}}
```

Untuk 422, ada tambahan `details`:

```json
{"error": {"status": 422, "message": "Input tidak valid", "details": [{"field": "password", "message": "String should have at least 8 characters"}]}}
```

| Kode | Arti |
|---|---|
| 401 | Belum login atau token tidak valid dan kedaluwarsa |
| 403 | Peran tidak berhak |
| 404 | Data tidak ada, atau milik bisnis atau customer lain |
| 409 | Konflik: email sudah terdaftar, perubahan di luar alur status, tiket sudah diambil, atau tiket sudah `closed` |
| 422 | Input tidak valid |

---

## Model data

Empat tabel sesuai batas minimum di soal, tanpa kolom atau tabel tambahan.

```mermaid
erDiagram
    businesses ||--o{ users : "punya"
    businesses ||--o{ tickets : "memiliki"
    users ||--o{ tickets : "membuat (customer_id)"
    users |o--o{ tickets : "ditangani (assigned_agent_id)"
    tickets ||--o{ messages : "berisi"
    users ||--o{ messages : "mengirim"

    businesses {
        uuid id PK
        string name
        string slug UK
        timestamptz created_at
    }
    users {
        uuid id PK
        uuid business_id FK
        string name
        string email UK
        string password_hash
        string role
        timestamptz created_at
    }
    tickets {
        uuid id PK
        uuid business_id FK
        uuid customer_id FK
        uuid assigned_agent_id FK
        string subject
        string category
        string priority
        string status
        timestamptz created_at
        timestamptz updated_at
    }
    messages {
        uuid id PK
        uuid ticket_id FK
        uuid sender_id FK
        text body
        timestamptz created_at
    }
```

- `role` dibatasi `admin`, `agent`, `customer`. `priority` dibatasi `low`, `medium`, `high`. `status` dibatasi `open`, `in_progress`, `resolved`, `closed`. Semuanya dengan `CHECK constraint`.
- `assigned_agent_id` boleh kosong. Index: `(business_id, status)` pada `tickets`.
- `business_id` disimpan langsung di `tickets` supaya setiap query bisa difilter per bisnis tanpa join ke `users`.
- Skema dibuat lewat migrasi Alembic (`backend/alembic/versions`), bukan manual.

---

## Struktur proyek

```
.
├── backend/
│   ├── alembic/versions/        # migrasi database
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py          # get_current_user, require_roles
│   │   │   └── routers/         # auth, users, tickets, messages, ws
│   │   ├── core/                # config, security (hash dan JWT), format error
│   │   ├── db/                  # Base dan session SQLAlchemy
│   │   ├── models/              # tabel (business, user, ticket, message)
│   │   ├── schemas/             # bentuk request dan response (Pydantic)
│   │   ├── services/            # aturan bisnis (auth, user, ticket, message)
│   │   ├── realtime/manager.py  # daftar koneksi WebSocket per tiket
│   │   └── main.py
│   ├── scripts/seed.py          # data demo
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/          # /login, /register
    │   │   └── (app)/           # halaman yang butuh login: /tickets, /tickets/new, /tickets/[id], /admin/users
    │   ├── components/          # komponen aplikasi, dan ui/ dari shadcn
    │   ├── hooks/               # useTicketSocket
    │   ├── lib/                 # klien API, klien WebSocket, aturan tombol aksi
    │   ├── store/               # sesi login (zustand)
    │   └── types/               # tipe data API
    └── .env.example
```

Di backend, kode dipisah per lapisan: **router** (menerima request), **service** (aturan bisnis), dan **model** (tabel).

---

## Skenario video demo

Video 3–5 menit memperlihatkan tiga hal yang diminta soal. Link video ada di bagian atas README.

1. **Chat real-time di dua browser.** Buka dua jendela (satu biasa, satu incognito atau browser lain). Login sebagai `customer1@toko-demo.com` di satu sisi dan `agent@toko-demo.com` di sisi lain. Customer membuat tiket, Agent membuka tiketnya, lalu keduanya saling berbalas pesan dan pesan muncul di kedua layar tanpa refresh.
2. **Perubahan status dari sisi Agent.** Agent menekan **Ambil tiket**, lalu **Tandai selesai**, lalu **Tutup tiket**. Status berubah di layar Customer tanpa refresh, dan setelah `closed` kolom pesan Customer terkunci.
3. **Bisnis A gagal membuka tiket bisnis B.** Salin alamat `/tickets/<id>` milik tiket Toko Elektronik Demo, login sebagai `admin@kopi-demo.com`, lalu buka alamat itu. Hasilnya "Tiket tidak ditemukan atau Anda tidak berhak mengaksesnya" (404 dari backend).

---

## Catatan

### Keputusan teknis

**Stack dan struktur**

- Pilihan stack mengikuti kolom "Disarankan" di soal: FastAPI, PostgreSQL, SQLAlchemy dengan Alembic, Tailwind, dan React Query. Tambahan di luar soal: shadcn/ui (komponen siap pakai), react-hook-form (form dengan validasi), dan zustand (khusus sesi login, sedangkan data dari server ditangani React Query).
- Hash password memakai **Argon2id**. Soal mengizinkan bcrypt atau argon2, dan Argon2 tidak punya batas panjang password 72 byte seperti bcrypt.
- Backend dipisah menjadi router, service, dan model. Router hanya menerima request dan memanggil service. Aturan bisnis ada di service.
- `relationship()` di model hanya pemetaan di Python untuk mengambil nama customer dan agen. Tabel di database tidak berubah.

**Auth**

- Ada dua jenis JWT (access dan refresh) dengan klaim `type`, sehingga refresh token tidak bisa dipakai sebagai access token (dan sebaliknya).
- Email disimpan dalam huruf kecil supaya `Budi@x.com` dan `budi@x.com` dianggap sama.
- Frontend memperbarui access token otomatis satu kali kalau menerima 401. Kalau refresh gagal, sesi dihapus dan user diarahkan ke `/login`. Kalau beberapa request gagal bersamaan, hanya satu proses refresh yang berjalan.

**Isolasi**

- Tiket bisnis lain dan tiket customer lain dijawab **404**, bukan 403, supaya keberadaan tiket tidak bocor. Id yang bukan format UUID dijawab 422 (input tidak valid).
- Semua jalur (REST dan WebSocket) memakai satu fungsi pengambil tiket, jadi tidak ada jalur yang lupa memfilter.

**Aturan yang tidak ditegaskan soal (asumsi saya)**

- Agent hanya boleh mengubah status tiket yang di-assign ke dirinya. Agent tidak bisa menutup tiket agen lain.
- Admin boleh meng-assign dan mengubah status tiket mana pun, tetapi tetap mengikuti alur status.
- Mengambil atau meng-assign tiket `open` otomatis menjadi `in_progress`.
- Setelah dibuka kembali, tiket tetap memiliki agen yang sama. Agen itu melanjutkan dengan mengubah status ke `in_progress`.
- Membuka kembali tiket hanya oleh Customer pemilik tiket, atau Admin sebagai override. Agent tidak bisa.
- Admin hanya bisa membuat Agent dan Customer, tidak bisa membuat Admin lain.
- Semua yang punya akses ke tiket boleh mengirim pesan (termasuk Admin), kecuali tiket `closed`.
- Hanya Customer yang boleh membuat tiket, sesuai kolom "Peran" di tabel endpoint soal.
- Kode **409** dipakai untuk konflik (email sudah terdaftar, di luar alur status, tiket sudah diambil, tiket `closed`). Soal hanya menyebut 401, 403, 404, dan 422.
- Path `/auth/register-business` memakai tanda hubung (di soal tertulis `/auth/registerbusiness`).
- `PATCH /tickets/{id}` hanya menerima salah satu dari `status` atau `assigned_agent_id` dalam satu request.

**Live chat**

- Pesan hanya dikirim lewat WebSocket. Tidak ada `POST` pesan di REST karena tidak ada di tabel endpoint soal.
- Setiap pesan baru dan setiap perubahan status memperbarui `updated_at` tiket, sehingga daftar tiket urut dari aktivitas terbaru.
- Event dari WebSocket langsung ditulis ke cache React Query di frontend, jadi tampilan selalu memakai satu sumber data yang sama.

### Trade-off

- **Token di `localStorage`.** Sederhana dan mudah dipakai untuk REST dan WebSocket, tetapi lebih rentan terhadap XSS dibanding cookie `httpOnly`. Cookie butuh perubahan di backend.
- **Token WebSocket lewat query string** (`?token=`), sesuai format di soal, karena WebSocket di browser tidak bisa mengirim header `Authorization`. Konsekuensinya token bisa muncul di log server.
- **Token WebSocket hanya dicek saat koneksi dibuka.** Kalau access token habis di tengah chat, koneksi yang sudah terbuka tetap hidup. Frontend memperbarui token lalu menyambung ulang kalau koneksi terputus.
- **Daftar koneksi WebSocket disimpan di memori satu proses.** Kalau backend dijalankan dengan beberapa worker atau instance, siaran tidak sampai ke koneksi di proses lain. Solusi lanjutannya Redis pub/sub.
- **Refresh token tanpa rotasi dan tanpa pencabutan.** Logout hanya menghapus token di sisi klien. Token yang bocor tetap berlaku sampai kedaluwarsa.
- **Tidak ada penguncian baris di database.** Kalau dua agen mengambil tiket yang sama pada saat yang sama, atau tiket ditutup tepat saat sebuah pesan disimpan, hasilnya bisa tidak konsisten.
- **Index hanya yang diminta soal**, yaitu `(business_id, status)`. Pengurutan berdasarkan `updated_at` belum punya index sendiri. Pada skala data tes ini cukup.
- **Daftar tiket dan user tanpa pagination**, jadi semua data dimuat sekaligus.
- Query database bersifat sinkron. Di jalur WebSocket dan `PATCH`, query dijalankan di thread terpisah supaya tidak menghentikan server saat melayani banyak koneksi.
- Pengujian dilakukan manual (REST client dan browser), belum ada tes otomatis.

### Belum selesai

Semua fitur wajib di soal sudah dikerjakan. Yang belum:

| Hal | Alasan atau rencana |
|---|---|
| Docker Compose (bonus) | Tidak bisa dijalankan di perangkat pengembangan, jadi tidak dibuat daripada menyertakan file yang tidak teruji. Rencana: `Dockerfile` untuk backend dan frontend dan `docker-compose.yml` bersama PostgreSQL |
| Tes otomatis pytest (bonus) | Prioritas pertama berikutnya: tes isolasi antar-bisnis (404 untuk tiket bisnis lain dan customer lain), alur status, dan penolakan WebSocket |
| Indikator mengetik dan status pesan dibaca (bonus) | Rencana: event WebSocket baru `typing` dan kolom waktu baca per pesan |
| Badge pesan belum dibaca (bonus) | Butuh pencatatan waktu baca terakhir per user per tiket |
| Upload lampiran gambar (bonus) | Belum direncanakan detailnya |
| Pagination dan pencarian tiket (bonus) | Rencana: `limit` dan `offset` di `GET /tickets` dan parameter `?q=` |
| Notifikasi real-time di daftar tiket (bonus) | Rencana: satu WebSocket per user untuk event tiket dan pesan baru |
| Rate limiting endpoint login (bonus) | Rencana: batasi percobaan per alamat IP dan per email |
| Deploy online (bonus) | Belum dikerjakan |
| Ubah atau reset password, ubah atau nonaktifkan user | Tidak diminta soal. Admin saat ini hanya bisa melihat dan menambah user |
| Tes otomatis frontend | Belum ada |