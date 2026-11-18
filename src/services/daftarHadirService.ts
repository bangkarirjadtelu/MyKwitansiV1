import type { DaftarHadirRecord, DaftarHadirAgenda, DaftarHadirPeserta } from "../types/daftarHadir";

const STORAGE_KEY = "mykwitansi_daftar_hadir_records";

const INITIAL_RECORDS: DaftarHadirRecord[] = [
  {
    id: "dh-0001",
    nomor_dokumen: "0001",
    agenda: {
      hariTanggal: "Jumat, 15 Oktober 2026",
      namaAgenda: "Rapat Koordinasi SDM & Kultubai",
      tempat: "Ruang Rapat SDM Lantai 2 Gedung E. Ruang Kultubai",
      waktu: "08.00 - 13.00 WIB",
      waktuMulai: "08.00",
      waktuSelesai: "13.00",
      noFormulir: "",
      revisi: "",
      berlakuEfektif: "",
      hal: "",
    },
    peserta: [
      { id: "p1", nomor: 1, nama: "AULIA FITRAH FAJRIANI",    tanggalCheckin: "15 Oktober 2026, 08:40:30", status: "CheckIn" },
      { id: "p2", nomor: 2, nama: "WAHYU NURROSYID",          tanggalCheckin: "15 Oktober 2026, 08:31:02", status: "CheckIn" },
      { id: "p3", nomor: 3, nama: "GHEAVIRA MELLINIA",        tanggalCheckin: "15 Oktober 2026, 08:31:15", status: "CheckIn" },
      { id: "p4", nomor: 4, nama: "AGNY NADYA YUSNIAULIA",    tanggalCheckin: "15 Oktober 2026, 08:31:30", status: "CheckIn" },
      { id: "p5", nomor: 5, nama: "WIWIN RATNA SARI",         tanggalCheckin: "15 Oktober 2026, 08:41:00", status: "CheckIn" },
      { id: "p6", nomor: 6, nama: "TOUFAN DIANSYAH TAMBUNAN", tanggalCheckin: "15 Oktober 2026, 08:38:30", status: "CheckIn" },
      { id: "p7", nomor: 7, nama: "ASYA AZHAR FATHINA",       tanggalCheckin: "15 Oktober 2026, 08:40:30", status: "CheckIn" },
    ],
    admin_username: "Bang Karir",
    created_at: "2026-11-18T10:00:00.000Z",
    isSimulation: true,
  },
  {
    id: "dh-0002",
    nomor_dokumen: "0002",
    agenda: {
      hariTanggal: "Jumat, 16 Oktober 2026",
      namaAgenda: "Briefing Tim Public Relations & Publikasi Kampus",
      tempat: "Auditorium Gedung Damar Lantai 2",
      waktu: "13.30 - 16.30 WIB",
      waktuMulai: "13.30",
      waktuSelesai: "16.30",
      noFormulir: "",
      revisi: "",
      berlakuEfektif: "",
      hal: "",
    },
    peserta: Array.from({ length: 15 }, (_, i) => ({
      id: `pr-${i + 1}`,
      nomor: i + 1,
      nama: `Staff PR ${i + 1}`,
      tanggalCheckin: `16 Oktober 2026, 13:${30 + Math.floor(i * 1.5)}:${(10 + i * 3) % 60}`,
      status: "CheckIn",
    })),
    admin_username: "Bang Karir",
    created_at: "2026-11-18T11:15:00.000Z",
    isSimulation: true,
  },
];

function loadFromStorage(): DaftarHadirRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RECORDS));
      return INITIAL_RECORDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_RECORDS;
  }
}

function saveToStorage(records: DaftarHadirRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

export const daftarHadirService = {
  async getAll(): Promise<DaftarHadirRecord[]> {
    return loadFromStorage();
  },

  async getById(id: string): Promise<DaftarHadirRecord | null> {
    const all = loadFromStorage();
    return all.find((r) => r.id === id) || null;
  },

  async create(data: {
    agenda: DaftarHadirAgenda;
    peserta: DaftarHadirPeserta[];
    admin_username: string;
    isSimulation?: boolean;
  }): Promise<DaftarHadirRecord> {
    const all = loadFromStorage();
    const nextNumber = (all.length + 1).toString().padStart(4, "0");
    const newRecord: DaftarHadirRecord = {
      id: `dh-${Date.now()}`,
      nomor_dokumen: nextNumber,
      agenda: data.agenda,
      peserta: data.peserta,
      admin_username: data.admin_username,
      created_at: new Date().toISOString(),
      isSimulation: data.isSimulation ?? true,
    };
    all.unshift(newRecord);
    saveToStorage(all);
    return newRecord;
  },

  async update(id: string, data: Partial<DaftarHadirRecord>): Promise<DaftarHadirRecord> {
    const all = loadFromStorage();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Record not found");
    const updated = { ...all[idx], ...data };
    all[idx] = updated;
    saveToStorage(all);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const all = loadFromStorage();
    const filtered = all.filter((r) => r.id !== id);
    saveToStorage(filtered);
  },

  async duplicate(id: string): Promise<DaftarHadirRecord> {
    const all = loadFromStorage();
    const target = all.find((r) => r.id === id);
    if (!target) throw new Error("Target not found");

    const nextNumber = (all.length + 1).toString().padStart(4, "0");
    const duplicated: DaftarHadirRecord = {
      ...target,
      id: `dh-${Date.now()}`,
      nomor_dokumen: nextNumber,
      agenda: {
        ...target.agenda,
        namaAgenda: `${target.agenda.namaAgenda} (Salinan)`,
      },
      created_at: new Date().toISOString(),
    };
    all.unshift(duplicated);
    saveToStorage(all);
    return duplicated;
  },
};
