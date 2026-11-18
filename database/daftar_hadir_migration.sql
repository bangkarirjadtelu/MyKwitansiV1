-- ============================================================
-- Tabel: daftar_hadir
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS daftar_hadir (
  id              TEXT        PRIMARY KEY DEFAULT ('dh-' || extract(epoch from now())::bigint::text),
  nomor_dokumen   TEXT        NOT NULL,
  agenda          JSONB       NOT NULL,
  peserta         JSONB       NOT NULL DEFAULT '[]',
  admin_username  TEXT        NOT NULL DEFAULT 'Admin',
  is_simulation   BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ          DEFAULT null
);

-- Index agar query cepat
CREATE INDEX IF NOT EXISTS idx_daftar_hadir_created_at ON daftar_hadir (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daftar_hadir_deleted_at ON daftar_hadir (deleted_at);

-- RLS (Row Level Security) — biarkan semua user autentikasi bisa baca dan tulis
ALTER TABLE daftar_hadir ENABLE ROW LEVEL SECURITY;

-- Policy: semua user yg sudah login bisa baca semua data
CREATE POLICY "Allow authenticated read"
  ON daftar_hadir FOR SELECT
  TO authenticated
  USING (true);

-- Policy: semua user yg sudah login bisa insert
CREATE POLICY "Allow authenticated insert"
  ON daftar_hadir FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: semua user yg sudah login bisa update
CREATE POLICY "Allow authenticated update"
  ON daftar_hadir FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: semua user yg sudah login bisa delete
CREATE POLICY "Allow authenticated delete"
  ON daftar_hadir FOR DELETE
  TO authenticated
  USING (true);

-- Selesai! Cek dengan: SELECT * FROM daftar_hadir;
