/**
 * Types for Generator Daftar Hadir (Attendance Sheet Generator)
 */

export interface DaftarHadirAgenda {
  hariTanggal:   string; // e.g. "Jumat, 15 Oktober 2026"
  namaAgenda:    string; // e.g. "Rapat ...."
  tempat:        string; // e.g. "Ruang Rapat SDM Lantai 2 Gedung E, Ruang Kultubai"
  waktu:         string; // e.g. "08.00 - 13.00 WIB"
  waktuMulai?:   string; // e.g. "08:00"
  waktuSelesai?: string; // e.g. "13:00"
  noFormulir?:   string; // default: ""
  revisi?:       string; // default: ""
  berlakuEfektif?: string; // default: ""
  hal?:          string; // default: ""
}

export interface DaftarHadirPeserta {
  id:             string;
  nomor:          number;
  nama:           string;
  tanggalCheckin: string; // e.g. "15 Oktober 2026, 08:40:30"
  status:         string; // default "CheckIn"
}

export interface DaftarHadirData {
  agenda:       DaftarHadirAgenda;
  peserta:      DaftarHadirPeserta[];
  isSimulation: boolean;
}

export interface DaftarHadirRecord {
  id:             string;
  nomor_dokumen:  string; // e.g. "0001"
  agenda:         DaftarHadirAgenda;
  peserta:        DaftarHadirPeserta[];
  admin_username: string;
  created_at:     string; // ISO date string
  isSimulation?:  boolean;
}

