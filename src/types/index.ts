/**
 * Domain types aligned with the FINAL locked database schema.
 *
 * FINAL DATABASE DECISIONS:
 *   • data_transaksi table → REMOVED
 *   • data_nota table      → REMOVED
 *   • Admin ownership stored directly on formulir_transaksi and formulir_nota.
 *   • INTEGER auto-increment PKs throughout.
 *   • TEXT (ISO 8601) for all date fields.
 *
 * UI COMPATIBILITY NOTES:
 *   • DataTransaksiView.id_data_transaksi is kept as a UI display alias for
 *     id_formulir_transaksi. The mock service sets them equal. The real service
 *     implementation should populate id_data_transaksi from id_formulir_transaksi.
 *   • DataNotaView.id_data_nota is kept as a UI display alias for
 *     id_formulir_nota. Same rule applies.
 *   • This preserves zero UI/page changes while the Service Layer is migrated.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type AdminJabatan = "bang_karir" | "bang_tensi";

// ─────────────────────────────────────────────────────────────────────────────
// Core ERD Entities (final schema tables only)
// ─────────────────────────────────────────────────────────────────────────────

/** admin — final schema table */
export interface Admin {
  id_admin:  number;
  jabatan:   AdminJabatan;
  username:  string;
  /** Stored as bcrypt/Argon2 hash; never returned to the client after login. */
  password?: string;
}

/**
 * formulir_transaksi — final schema table
 *
 * NOTE: data_transaksi has been removed. id_admin is stored directly here.
 */
export interface FormulirTransaksi {
  id_formulir_transaksi: number;
  terima_dari:           string;
  jumlah_uang:           number;   // DECIMAL(11,2)
  untuk_pembayaran:      string;
  penerima_uang:         string;
  tanggal_transaksi:     string;   // TEXT — ISO 8601
  tanggal_input:         string;   // TEXT — ISO 8601, set at creation
  total_harga:           number;   // DECIMAL(11,2) — cached; mirrors jumlah_uang currently
  kota:                  string;
  id_admin:              number;   // FK → admin.id_admin
}

/**
 * formulir_nota — final schema table
 *
 * NOTE: data_nota has been removed. id_admin is stored directly here.
 */
export interface FormulirNota {
  id_formulir_nota:  number;
  tanggal_transaksi: string;   // TEXT — ISO 8601
  total_harga:       number;   // DECIMAL(11,2) — cached SUM(item_nota.sub_total_harga)
  id_admin:          number;   // FK → admin.id_admin
}

/** item_nota — final schema table. N items belong to one formulir_nota. */
export interface ItemNota {
  id_item_nota:     number;
  id_formulir_nota: number;    // FK → formulir_nota.id_formulir_nota  ON DELETE CASCADE
  nama_barang:      string;
  satuan:           string;
  harga:            number;    // DECIMAL(11,2)
  jumlah_item:      number;
  sub_total_harga:  number;    // DECIMAL(11,2) — cached: harga × jumlah_item
}

/**
 * print_kwitansi — append-only audit log table.
 *
 * Each print action inserts a new row.
 * Links to formulir_transaksi directly (data_transaksi removed).
 */
export interface PrintKwitansi {
  id_print_kwitansi:     number;
  id_formulir_transaksi: number;   // FK → formulir_transaksi.id_formulir_transaksi
  id_admin:              number;   // FK → admin.id_admin
  print_timestamp:       string;   // TEXT — ISO 8601
}

/**
 * print_nota — append-only audit log table.
 *
 * Each print action inserts a new row.
 * Links to formulir_nota directly (data_nota removed).
 */
export interface PrintNota {
  id_print_nota:    number;
  id_formulir_nota: number;   // FK → formulir_nota.id_formulir_nota
  id_admin:         number;   // FK → admin.id_admin
  print_timestamp:  string;   // TEXT — ISO 8601
}

// ─────────────────────────────────────────────────────────────────────────────
// View / Joined Types — used by the UI
//
// These flatten foreign key joins for display. They introduce no new domain
// concepts — every field maps back to a final schema table or admin.username.
//
// UI COMPATIBILITY:
//   id_data_transaksi  →  alias for id_formulir_transaksi (display number)
//   id_data_nota       →  alias for id_formulir_nota      (display number)
//
// The real service implementation must populate these from the formulir tables.
// ─────────────────────────────────────────────────────────────────────────────

/** Row shape for the Transaction table and Kwitansi view. */
export interface DataTransaksiView {
  // ── From formulir_transaksi ──────────────────────────────────────────────
  id_formulir_transaksi: number;
  /**
   * UI display alias for id_formulir_transaksi.
   * Set equal to id_formulir_transaksi by the service layer.
   * Kept for zero-change UI compatibility during migration.
   */
  id_data_transaksi:     number;
  id_admin:              number;
  tanggal_transaksi:     string;
  tanggal_input:         string;
  terima_dari:           string;
  jumlah_uang:           number;
  untuk_pembayaran:      string;
  penerima_uang:         string;
  kota:                  string;
  total_harga:           number;
  deleted_at:            string | null;
  // ── From admin ──────────────────────────────────────────────────────────
  admin_username:        string;
}

/** Row shape for the Nota table (header + nested items). */
export interface DataNotaView {
  // ── From formulir_nota ───────────────────────────────────────────────────
  id_formulir_nota:  number;
  /**
   * UI display alias for id_formulir_nota.
   * Set equal to id_formulir_nota by the service layer.
   * Kept for zero-change UI compatibility during migration.
   */
  id_data_nota:      number;
  id_admin:          number;
  tanggal_transaksi: string;
  tanggal_input:     string;
  total_harga:       number;
  deleted_at:        string | null;
  // ── From admin ──────────────────────────────────────────────────────────
  admin_username:    string;
  // ── From item_nota ───────────────────────────────────────────────────────
  items:             ItemNota[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Input Types
//
// Fields the user fills in when creating/updating a record.
// Server-generated fields (PKs, tanggal_input, computed totals) are excluded.
// ─────────────────────────────────────────────────────────────────────────────

export type CreateFormulirTransaksiInput = Omit<
  FormulirTransaksi,
  "id_formulir_transaksi" | "tanggal_input" | "id_admin"
>;

export interface CreateFormulirNotaInput {
  tanggal_transaksi: string;
  items: Array<{
    nama_barang: string;
    satuan:      string;
    harga:       number;
    jumlah_item: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Undangan (New Feature)
// ─────────────────────────────────────────────────────────────────────────────

export interface FormulirUndangan {
  id_formulir_undangan: string; // UUID
  acara:                string;
  penyelenggara:        string;
  tanggal_acara:        string; // DATE
  waktu_mulai:          string; // TIME
  waktu_selesai:        string; // TIME
  tempat_acara:         string;
  agenda:               string;
  peserta:              string;
  dokumen_pendukung:    string;
  hasil_pertemuan:      string;
  tembusan:             string;
  tempat_surat:         string;
  tanggal_surat:        string; // DATE
  nama_ttd:             string;
  jabatan_ttd:          string;
  tanggal_input:        string; // ISO 8601 (mapped from created_at)
  id_admin:             number;
}

export interface DataUndanganView extends FormulirUndangan {
  id_data_undangan: string; // alias for UI compatibility
  admin_username:   string;
  deleted_at:       string | null;
}

export type CreateFormulirUndanganInput = Omit<
  FormulirUndangan,
  "id_formulir_undangan" | "tanggal_input" | "id_admin"
>;

export * from "./daftarHadir";
