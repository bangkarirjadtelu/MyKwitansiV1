import { supabase } from "../lib/supabase";
import type { DaftarHadirRecord, DaftarHadirAgenda, DaftarHadirPeserta } from "../types/daftarHadir";

// ─────────────────────────────────────────────────────────────
// Row shape from Supabase table `daftar_hadir`
// ─────────────────────────────────────────────────────────────
interface DbRow {
  id: string;
  nomor_dokumen: string;
  agenda: DaftarHadirAgenda;
  peserta: DaftarHadirPeserta[];
  admin_username: string;
  is_simulation: boolean;
  created_at: string;
  deleted_at: string | null;
}

function rowToRecord(row: DbRow): DaftarHadirRecord {
  return {
    id: row.id,
    nomor_dokumen: row.nomor_dokumen,
    agenda: row.agenda,
    peserta: row.peserta,
    admin_username: row.admin_username,
    created_at: row.created_at,
    isSimulation: row.is_simulation,
  };
}

// ─────────────────────────────────────────────────────────────
// Generate a unique id with current timestamp
// ─────────────────────────────────────────────────────────────
function newId(): string {
  return `dh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────
export const daftarHadirService = {
  async getAll(): Promise<DaftarHadirRecord[]> {
    const { data, error } = await supabase
      .from("daftar_hadir")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DaftarHadir] getAll error:", error.message);
      throw new Error("Gagal mengambil data daftar hadir: " + error.message);
    }

    return (data as DbRow[]).map(rowToRecord);
  },

  async getById(id: string): Promise<DaftarHadirRecord | null> {
    const { data, error } = await supabase
      .from("daftar_hadir")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) return null;
    return rowToRecord(data as DbRow);
  },

  async create(input: {
    agenda: DaftarHadirAgenda;
    peserta: DaftarHadirPeserta[];
    admin_username: string;
    isSimulation?: boolean;
  }): Promise<DaftarHadirRecord> {
    // Hitung nomor dokumen berikutnya
    const { count } = await supabase
      .from("daftar_hadir")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    const nextNumber = ((count ?? 0) + 1).toString().padStart(4, "0");

    const payload = {
      id: newId(),
      nomor_dokumen: nextNumber,
      agenda: input.agenda,
      peserta: input.peserta,
      admin_username: input.admin_username,
      is_simulation: input.isSimulation ?? true,
    };

    const { data, error } = await supabase
      .from("daftar_hadir")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      console.error("[DaftarHadir] create error:", error?.message);
      throw new Error("Gagal menyimpan daftar hadir: " + error?.message);
    }

    return rowToRecord(data as DbRow);
  },

  async update(id: string, input: Partial<DaftarHadirRecord>): Promise<DaftarHadirRecord> {
    const payload: Partial<DbRow> = {};
    if (input.agenda)         payload.agenda = input.agenda;
    if (input.peserta)        payload.peserta = input.peserta;
    if (input.admin_username) payload.admin_username = input.admin_username;
    if (input.isSimulation !== undefined) payload.is_simulation = input.isSimulation;

    const { data, error } = await supabase
      .from("daftar_hadir")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("[DaftarHadir] update error:", error?.message);
      throw new Error("Gagal memperbarui daftar hadir: " + error?.message);
    }

    return rowToRecord(data as DbRow);
  },

  async delete(id: string): Promise<void> {
    // Soft delete — set deleted_at so data can be recovered if needed
    const { error } = await supabase
      .from("daftar_hadir")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[DaftarHadir] delete error:", error.message);
      throw new Error("Gagal menghapus daftar hadir: " + error.message);
    }
  },

  async duplicate(id: string): Promise<DaftarHadirRecord> {
    const original = await this.getById(id);
    if (!original) throw new Error("Data tidak ditemukan.");

    return this.create({
      agenda: {
        ...original.agenda,
        namaAgenda: `${original.agenda.namaAgenda} (Salinan)`,
      },
      peserta: original.peserta,
      admin_username: original.admin_username,
      isSimulation: original.isSimulation,
    });
  },
};
