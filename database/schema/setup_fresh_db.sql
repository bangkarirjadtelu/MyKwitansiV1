-- =============================================================================
-- MyKwitansi — Complete Master Database Setup
-- Run this script in Supabase SQL Editor on a Fresh Project
-- =============================================================================

-- ── 1. Create Core Tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin (
    id_admin SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    jabatan TEXT NOT NULL CONSTRAINT chk_admin_jabatan CHECK (jabatan IN ('bang_karir', 'bang_tensi')),
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.formulir_transaksi (
    id_formulir_transaksi SERIAL PRIMARY KEY,
    terima_dari VARCHAR(255) NOT NULL,
    jumlah_uang DECIMAL(11, 2) NOT NULL,
    untuk_pembayaran VARCHAR(255) NOT NULL,
    penerima_uang VARCHAR(255) NOT NULL,
    tanggal_transaksi TEXT NOT NULL,
    tanggal_input TEXT NOT NULL,
    kota VARCHAR(100) NOT NULL,
    total_harga DECIMAL(11, 2) NOT NULL,
    id_admin INTEGER NOT NULL REFERENCES public.admin (id_admin) ON DELETE RESTRICT ON UPDATE CASCADE,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.formulir_nota (
    id_formulir_nota SERIAL PRIMARY KEY,
    tanggal_transaksi TEXT NOT NULL,
    tanggal_input TEXT NOT NULL,
    total_harga DECIMAL(11, 2) NOT NULL,
    id_admin INTEGER NOT NULL REFERENCES public.admin (id_admin) ON DELETE RESTRICT ON UPDATE CASCADE,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.item_nota (
    id_item_nota SERIAL PRIMARY KEY,
    id_formulir_nota INTEGER NOT NULL REFERENCES public.formulir_nota (id_formulir_nota) ON DELETE CASCADE ON UPDATE CASCADE,
    nama_barang VARCHAR(255) NOT NULL,
    satuan VARCHAR(50) NOT NULL,
    jumlah_item INTEGER NOT NULL,
    harga DECIMAL(11, 2) NOT NULL,
    sub_total_harga DECIMAL(11, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.print_kwitansi (
    id_print_kwitansi SERIAL PRIMARY KEY,
    id_formulir_transaksi INTEGER NOT NULL REFERENCES public.formulir_transaksi (id_formulir_transaksi) ON DELETE RESTRICT ON UPDATE CASCADE,
    id_admin INTEGER NOT NULL REFERENCES public.admin (id_admin) ON DELETE RESTRICT ON UPDATE CASCADE,
    print_timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.print_nota (
    id_print_nota SERIAL PRIMARY KEY,
    id_formulir_nota INTEGER NOT NULL REFERENCES public.formulir_nota (id_formulir_nota) ON DELETE RESTRICT ON UPDATE CASCADE,
    id_admin INTEGER NOT NULL REFERENCES public.admin (id_admin) ON DELETE RESTRICT ON UPDATE CASCADE,
    print_timestamp TEXT NOT NULL
);

-- Undangan Table
CREATE TABLE IF NOT EXISTS public.formulir_undangan (
    id_formulir_undangan UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_admin INTEGER NOT NULL REFERENCES public.admin(id_admin) ON DELETE RESTRICT ON UPDATE CASCADE,
    acara TEXT NOT NULL,
    penyelenggara TEXT NOT NULL,
    tanggal_acara DATE NOT NULL,
    waktu_mulai TIME NOT NULL,
    waktu_selesai TIME NOT NULL,
    tempat_acara TEXT NOT NULL,
    agenda TEXT,
    peserta TEXT,
    dokumen_pendukung TEXT,
    hasil_pertemuan TEXT,
    tembusan TEXT,
    tempat_surat TEXT,
    tanggal_surat DATE,
    nama_ttd TEXT,
    jabatan_ttd TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT valid_waktu CHECK (waktu_selesai >= waktu_mulai)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_formulir_transaksi_id_admin ON public.formulir_transaksi (id_admin);
CREATE INDEX IF NOT EXISTS idx_formulir_transaksi_deleted_at ON public.formulir_transaksi (deleted_at);
CREATE INDEX IF NOT EXISTS idx_formulir_nota_id_admin ON public.formulir_nota (id_admin);
CREATE INDEX IF NOT EXISTS idx_formulir_nota_deleted_at ON public.formulir_nota (deleted_at);
CREATE INDEX IF NOT EXISTS idx_item_nota_id_formulir_nota ON public.item_nota (id_formulir_nota);
CREATE INDEX IF NOT EXISTS idx_print_kwitansi_id_formulir_transaksi ON public.print_kwitansi (id_formulir_transaksi);
CREATE INDEX IF NOT EXISTS idx_print_kwitansi_id_admin ON public.print_kwitansi (id_admin);
CREATE INDEX IF NOT EXISTS idx_print_nota_id_formulir_nota ON public.print_nota (id_formulir_nota);
CREATE INDEX IF NOT EXISTS idx_print_nota_id_admin ON public.print_nota (id_admin);
CREATE INDEX IF NOT EXISTS idx_formulir_undangan_deleted_at ON public.formulir_undangan (deleted_at);
CREATE INDEX IF NOT EXISTS idx_formulir_undangan_id_admin ON public.formulir_undangan (id_admin);
CREATE INDEX IF NOT EXISTS idx_formulir_undangan_tanggal_acara ON public.formulir_undangan (tanggal_acara);

-- View for Undangan
CREATE OR REPLACE VIEW public.vw_undangan AS
SELECT 
    fu.id_formulir_undangan,
    fu.id_formulir_undangan AS id_data_undangan,
    fu.id_admin,
    a.username AS admin_username,
    fu.acara,
    fu.penyelenggara,
    fu.tanggal_acara,
    fu.waktu_mulai,
    fu.waktu_selesai,
    fu.tempat_acara,
    fu.agenda,
    fu.peserta,
    fu.dokumen_pendukung,
    fu.hasil_pertemuan,
    fu.tembusan,
    fu.tempat_surat,
    fu.tanggal_surat,
    fu.nama_ttd,
    fu.jabatan_ttd,
    fu.created_at AS tanggal_input,
    fu.updated_at,
    fu.deleted_at
FROM 
    public.formulir_undangan fu
JOIN 
    public.admin a ON fu.id_admin = a.id_admin;

-- ── 2. Helper Functions & RPCs ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_current_admin_id() RETURNS INTEGER AS $$
    SELECT id_admin FROM public.admin WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_current_admin_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_admin_id() TO authenticated;

-- Resolves email for username to facilitate Supabase password login
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_username TEXT) RETURNS TEXT AS $$
DECLARE
    v_auth_id UUID;
    v_email TEXT;
BEGIN
    SELECT auth_id INTO v_auth_id FROM public.admin WHERE username = p_username;
    IF v_auth_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT email INTO v_email FROM auth.users WHERE id = v_auth_id;
    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated;

-- Create Nota Atomicity
CREATE OR REPLACE FUNCTION public.create_nota(
    p_tanggal_transaksi TEXT,
    p_items JSONB
) RETURNS SETOF public.formulir_nota AS $$
DECLARE
    v_id_formulir_nota INTEGER;
    v_total_harga DECIMAL(11,2) := 0;
    v_item JSONB;
    v_sub_total DECIMAL(11,2);
    v_id_admin INTEGER;
BEGIN
    v_id_admin := public.get_current_admin_id();
    IF v_id_admin IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin profile.';
    END IF;

    INSERT INTO public.formulir_nota (tanggal_transaksi, total_harga, id_admin, tanggal_input)
    VALUES (p_tanggal_transaksi, 0, v_id_admin, to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    RETURNING id_formulir_nota INTO v_id_formulir_nota;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_sub_total := (v_item->>'harga')::DECIMAL * (v_item->>'jumlah_item')::INTEGER;
        v_total_harga := v_total_harga + v_sub_total;

        INSERT INTO public.item_nota (id_formulir_nota, nama_barang, satuan, jumlah_item, harga, sub_total_harga)
        VALUES (
            v_id_formulir_nota,
            v_item->>'nama_barang',
            v_item->>'satuan',
            (v_item->>'jumlah_item')::INTEGER,
            (v_item->>'harga')::DECIMAL,
            v_sub_total
        );
    END LOOP;

    UPDATE public.formulir_nota
    SET total_harga = v_total_harga
    WHERE id_formulir_nota = v_id_formulir_nota;

    RETURN QUERY SELECT * FROM public.formulir_nota WHERE id_formulir_nota = v_id_formulir_nota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.create_nota(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_nota(TEXT, JSONB) TO authenticated;

-- Update Nota Atomicity
CREATE OR REPLACE FUNCTION public.update_nota(
    p_id_formulir_nota INTEGER,
    p_tanggal_transaksi TEXT,
    p_items JSONB
) RETURNS SETOF public.formulir_nota AS $$
DECLARE
    v_total_harga DECIMAL(11,2) := 0;
    v_item JSONB;
    v_sub_total DECIMAL(11,2);
    v_id_admin INTEGER;
    v_owner_id INTEGER;
BEGIN
    v_id_admin := public.get_current_admin_id();
    IF v_id_admin IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin profile.';
    END IF;

    SELECT id_admin INTO v_owner_id FROM public.formulir_nota WHERE id_formulir_nota = p_id_formulir_nota;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not Found: Nota does not exist.';
    END IF;
    
    IF v_owner_id != v_id_admin THEN
        RAISE EXCEPTION 'Forbidden: You do not have permission to modify this Nota.';
    END IF;

    DELETE FROM public.item_nota WHERE id_formulir_nota = p_id_formulir_nota;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_sub_total := (v_item->>'harga')::DECIMAL * (v_item->>'jumlah_item')::INTEGER;
        v_total_harga := v_total_harga + v_sub_total;

        INSERT INTO public.item_nota (id_formulir_nota, nama_barang, satuan, jumlah_item, harga, sub_total_harga)
        VALUES (
            p_id_formulir_nota,
            v_item->>'nama_barang',
            v_item->>'satuan',
            (v_item->>'jumlah_item')::INTEGER,
            (v_item->>'harga')::DECIMAL,
            v_sub_total
        );
    END LOOP;

    UPDATE public.formulir_nota
    SET 
        tanggal_transaksi = p_tanggal_transaksi,
        total_harga = v_total_harga
    WHERE id_formulir_nota = p_id_formulir_nota;

    RETURN QUERY SELECT * FROM public.formulir_nota WHERE id_formulir_nota = p_id_formulir_nota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.update_nota(INTEGER, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_nota(INTEGER, TEXT, JSONB) TO authenticated;

-- ── 3. Row Level Security (RLS) Policies ─────────────────────────────────────

ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulir_transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulir_nota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_nota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_kwitansi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_nota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulir_undangan ENABLE ROW LEVEL SECURITY;

-- Admin Policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.admin;
CREATE POLICY "Admins can view all profiles" ON public.admin 
  FOR SELECT TO authenticated USING (public.get_current_admin_id() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update own profile only" ON public.admin;
CREATE POLICY "Admins can update own profile only" ON public.admin 
  FOR UPDATE TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS "Disallow client admin inserts" ON public.admin;
CREATE POLICY "Disallow client admin inserts" ON public.admin 
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Disallow client admin deletes" ON public.admin;
CREATE POLICY "Disallow client admin deletes" ON public.admin 
  FOR DELETE TO authenticated USING (false);

-- Formulir Transaksi Policies
DROP POLICY IF EXISTS "Admins can select transactions" ON public.formulir_transaksi;
CREATE POLICY "Admins can select transactions" ON public.formulir_transaksi 
  FOR SELECT TO authenticated USING (public.get_current_admin_id() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert transactions" ON public.formulir_transaksi;
CREATE POLICY "Admins can insert transactions" ON public.formulir_transaksi 
  FOR INSERT TO authenticated WITH CHECK (id_admin = public.get_current_admin_id());

DROP POLICY IF EXISTS "Admins can update transactions" ON public.formulir_transaksi;
CREATE POLICY "Admins can update transactions" ON public.formulir_transaksi 
  FOR UPDATE TO authenticated 
  USING (id_admin = public.get_current_admin_id()) 
  WITH CHECK (id_admin = public.get_current_admin_id());

DROP POLICY IF EXISTS "Admins can delete transactions" ON public.formulir_transaksi;
CREATE POLICY "Admins can delete transactions" ON public.formulir_transaksi 
  FOR DELETE TO authenticated USING (id_admin = public.get_current_admin_id());

-- Formulir Nota Policies
DROP POLICY IF EXISTS "Admins can select nota" ON public.formulir_nota;
CREATE POLICY "Admins can select nota" ON public.formulir_nota 
  FOR SELECT TO authenticated USING (public.get_current_admin_id() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert nota" ON public.formulir_nota;
CREATE POLICY "Admins can insert nota" ON public.formulir_nota 
  FOR INSERT TO authenticated WITH CHECK (id_admin = public.get_current_admin_id());

DROP POLICY IF EXISTS "Admins can update nota" ON public.formulir_nota;
CREATE POLICY "Admins can update nota" ON public.formulir_nota 
  FOR UPDATE TO authenticated 
  USING (id_admin = public.get_current_admin_id()) 
  WITH CHECK (id_admin = public.get_current_admin_id());

DROP POLICY IF EXISTS "Admins can delete nota" ON public.formulir_nota;
CREATE POLICY "Admins can delete nota" ON public.formulir_nota 
  FOR DELETE TO authenticated USING (id_admin = public.get_current_admin_id());

-- Item Nota Policies
DROP POLICY IF EXISTS "Admins can select item nota" ON public.item_nota;
CREATE POLICY "Admins can select item nota" ON public.item_nota 
  FOR SELECT TO authenticated USING (public.get_current_admin_id() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert item nota" ON public.item_nota;
CREATE POLICY "Admins can insert item nota" ON public.item_nota 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formulir_nota fn 
      WHERE fn.id_formulir_nota = item_nota.id_formulir_nota 
      AND fn.id_admin = public.get_current_admin_id()
    )
  );

DROP POLICY IF EXISTS "Admins can update item nota" ON public.item_nota;
CREATE POLICY "Admins can update item nota" ON public.item_nota 
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.formulir_nota fn 
      WHERE fn.id_formulir_nota = item_nota.id_formulir_nota 
      AND fn.id_admin = public.get_current_admin_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formulir_nota fn 
      WHERE fn.id_formulir_nota = item_nota.id_formulir_nota 
      AND fn.id_admin = public.get_current_admin_id()
    )
  );

DROP POLICY IF EXISTS "Admins can delete item nota" ON public.item_nota;
CREATE POLICY "Admins can delete item nota" ON public.item_nota 
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.formulir_nota fn 
      WHERE fn.id_formulir_nota = item_nota.id_formulir_nota 
      AND fn.id_admin = public.get_current_admin_id()
    )
  );

-- Print Policies
DROP POLICY IF EXISTS "Admins can select print kwitansi" ON public.print_kwitansi;
CREATE POLICY "Admins can select print kwitansi" ON public.print_kwitansi 
  FOR SELECT TO authenticated USING (public.get_current_admin_id() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert print kwitansi" ON public.print_kwitansi;
CREATE POLICY "Admins can insert print kwitansi" ON public.print_kwitansi 
  FOR INSERT TO authenticated WITH CHECK (id_admin = public.get_current_admin_id());

DROP POLICY IF EXISTS "Disallow update print kwitansi" ON public.print_kwitansi;
CREATE POLICY "Disallow update print kwitansi" ON public.print_kwitansi 
  FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "Disallow delete print kwitansi" ON public.print_kwitansi;
CREATE POLICY "Disallow delete print kwitansi" ON public.print_kwitansi 
  FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Admins can select print nota" ON public.print_nota;
CREATE POLICY "Admins can select print nota" ON public.print_nota 
  FOR SELECT TO authenticated USING (public.get_current_admin_id() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert print nota" ON public.print_nota;
CREATE POLICY "Admins can insert print nota" ON public.print_nota 
  FOR INSERT TO authenticated WITH CHECK (id_admin = public.get_current_admin_id());

DROP POLICY IF EXISTS "Disallow update print nota" ON public.print_nota;
CREATE POLICY "Disallow update print nota" ON public.print_nota 
  FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "Disallow delete print nota" ON public.print_nota;
CREATE POLICY "Disallow delete print nota" ON public.print_nota 
  FOR DELETE TO authenticated USING (false);

-- Undangan Policies
DROP POLICY IF EXISTS "Admins can select undangan" ON public.formulir_undangan;
CREATE POLICY "Admins can select undangan" ON public.formulir_undangan 
  FOR SELECT TO authenticated USING (public.get_current_admin_id() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert undangan" ON public.formulir_undangan;
CREATE POLICY "Admins can insert undangan" ON public.formulir_undangan 
  FOR INSERT TO authenticated WITH CHECK (id_admin = public.get_current_admin_id());

DROP POLICY IF EXISTS "Admins can update undangan" ON public.formulir_undangan;
CREATE POLICY "Admins can update undangan" ON public.formulir_undangan 
  FOR UPDATE TO authenticated 
  USING (id_admin = public.get_current_admin_id()) 
  WITH CHECK (id_admin = public.get_current_admin_id());

DROP POLICY IF EXISTS "Admins can delete undangan" ON public.formulir_undangan;
CREATE POLICY "Admins can delete undangan" ON public.formulir_undangan 
  FOR DELETE TO authenticated USING (id_admin = public.get_current_admin_id());

-- ── 4. Grant Global Schema Permissions ───────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ── 5. Seed Initial Admin Record ─────────────────────────────────────────────

INSERT INTO public.admin (id_admin, username, password, jabatan)
VALUES (1, 'bang_karir', 'bangkarir2026', 'bang_karir')
ON CONFLICT (username) DO NOTHING;

-- Reset sequence to ensure future records start properly
SELECT setval(
  pg_get_serial_sequence('public.admin', 'id_admin'),
  COALESCE((SELECT MAX(id_admin) FROM public.admin), 1)
);

