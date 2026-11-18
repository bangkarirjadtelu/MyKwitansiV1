import React, { useState, useMemo } from "react";
import { tokens } from "../styles/tokens";
import { Ico } from "../utils/icons";
import {
  PageHeader,
  Card,
  PrimaryBtn,
  OutlineBtn,
  FormField,
} from "../components/ui";
import { pdfService } from "../services/pdfService";
import { exportDaftarHadirToExcel } from "../services/excelDaftarHadirService";
import type { DaftarHadirAgenda, DaftarHadirPeserta, DaftarHadirData } from "../types/daftarHadir";
import { excelLogoBase64 } from "../assets/excelLogoBase64";

const { color } = tokens;

interface Props {
  onToast?: (msg: string) => void;
}

// ── Sample data from template-daftar-hadir.xlsx ──
const SAMPLE_AGENDA: DaftarHadirAgenda = {
  hariTanggal: "Jumat, 15 Oktober 2026",
  namaAgenda: "Rapat ….",
  tempat: "Ruang Rapat SDM Lantai 2 Gedung E. Ruang Kultubai",
  waktu: "08.00 - 13.00 WIB",
  waktuMulai: "08:00",
  waktuSelesai: "13:00",
  noFormulir: "",
  revisi: "",
  berlakuEfektif: "",
  hal: "",
};

const SAMPLE_NAMES = [
  "AULIA FITRAH FAJRIANI",
  "WAHYU NURROSYID",
  "GHEAVIRA MELLINIA",
  "AGNY NADYA YUSNIAULIA",
  "WIWIN RATNA SARI",
  "TOUFAN DIANSYAH TAMBUNAN",
  "ASYA AZHAR FATHINA",
];

const SAMPLE_PESERTA: DaftarHadirPeserta[] = [
  { id: "1", nomor: 1, nama: "AULIA FITRAH FAJRIANI",       tanggalCheckin: "15 Oktober 2026, 08:40:30", status: "CheckIn" },
  { id: "2", nomor: 2, nama: "WAHYU NURROSYID",             tanggalCheckin: "15 Oktober 2026, 08:31:02", status: "CheckIn" },
  { id: "3", nomor: 3, nama: "GHEAVIRA MELLINIA",           tanggalCheckin: "15 Oktober 2026, 08:31:15", status: "CheckIn" },
  { id: "4", nomor: 4, nama: "AGNY NADYA YUSNIAULIA",       tanggalCheckin: "15 Oktober 2026, 08:31:30", status: "CheckIn" },
  { id: "5", nomor: 5, nama: "WIWIN RATNA SARI",            tanggalCheckin: "15 Oktober 2026, 08:41:00", status: "CheckIn" },
  { id: "6", nomor: 6, nama: "TOUFAN DIANSYAH TAMBUNAN",    tanggalCheckin: "15 Oktober 2026, 08:38:30", status: "CheckIn" },
  { id: "7", nomor: 7, nama: "ASYA AZHAR FATHINA",          tanggalCheckin: "15 Oktober 2026, 08:40:30", status: "CheckIn" },
];

/**
 * Extracts a date string portion from hariTanggal, e.g.
 * "Jumat, 15 Oktober 2026" -> "15 Oktober 2026"
 */
function extractDateStr(hariTanggal: string): string {
  const parts = hariTanggal.split(",");
  if (parts.length > 1) {
    return parts.slice(1).join(",").trim();
  }
  return hariTanggal.trim() || "15 Oktober 2026";
}

/**
 * Generates distinct, realistic check-in timestamps within the agenda timeframe.
 * E.g., for start time 08:00, arrival window typically ranges from 08:25 to 08:45
 * with realistic second/minute variations so no two participants have the same exact time.
 */
function generateCheckinTime(dateStr: string, startTime: string, index: number, total: number): string {
  let startHour = 8;
  let startMinute = 0;

  if (startTime) {
    const cleanTime = startTime.replace(/[^\d:]/g, "");
    const parts = cleanTime.includes(":") ? cleanTime.split(":") : cleanTime.split(".");
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h)) startHour = h;
      if (!isNaN(m)) startMinute = m;
    }
  }

  // Realistic distribution: attendees arrive between startMinute + 5 and startMinute + 45
  const baseMinutesOffset = 25 + Math.floor((index / Math.max(total, 1)) * 18);
  const jitterMinute = (index * 7 + (index % 3) * 2) % 15;
  const totalOffsetMinutes = baseMinutesOffset + jitterMinute;

  let totalMinutes = startHour * 60 + startMinute + totalOffsetMinutes;
  const checkHour = Math.floor(totalMinutes / 60) % 24;
  const checkMinute = totalMinutes % 60;

  // Staggered distinct seconds
  const checkSecond = (12 + index * 17 + (index % 5) * 7) % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeFormatted = `${pad(checkHour)}:${pad(checkMinute)}:${pad(checkSecond)}`;

  return `${dateStr}, ${timeFormatted}`;
}

export function DaftarHadirPage({ onToast }: Props) {
  // ── Form State ──
  const [agenda, setAgenda] = useState<DaftarHadirAgenda>(SAMPLE_AGENDA);
  const [showMetadata, setShowMetadata] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [pesertaList, setPesertaList] = useState<DaftarHadirPeserta[]>(SAMPLE_PESERTA);
  const [isSimulation, setIsSimulation] = useState(true);

  // ── Active Tab ──
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [isExporting, setIsExporting] = useState(false);

  // Update agenda waktu string when waktuMulai or waktuSelesai changes
  const handleTimeChange = (type: "waktuMulai" | "waktuSelesai", val: string) => {
    setAgenda((prev) => {
      const next = { ...prev, [type]: val };
      const mulai = type === "waktuMulai" ? val : prev.waktuMulai || "08.00";
      const selesai = type === "waktuSelesai" ? val : prev.waktuSelesai || "13.00";
      next.waktu = `${mulai.replace(":", ".")} - ${selesai.replace(":", ".")} WIB`;
      return next;
    });
  };

  // ── Process Bulk Textarea Input ──
  const handleProcessBulkNames = () => {
    if (!bulkText.trim()) {
      onToast?.("Silakan masukkan daftar nama peserta terlebih dahulu.");
      return;
    }

    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      onToast?.("Tidak ada nama valid yang ditemukan.");
      return;
    }

    const dateStr = extractDateStr(agenda.hariTanggal);
    const startTime = agenda.waktuMulai || "08.00";

    const newPeserta: DaftarHadirPeserta[] = lines.map((name, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      nomor: idx + 1,
      nama: name, // Preserve exact casing!
      tanggalCheckin: generateCheckinTime(dateStr, startTime, idx, lines.length),
      status: "CheckIn",
    }));

    setPesertaList(newPeserta);
    setIsSimulation(true);
    onToast?.(`Berhasil memproses ${newPeserta.length} peserta.`);
  };

  // ── Load Sample Template ──
  const handleLoadSample = () => {
    setAgenda(SAMPLE_AGENDA);
    setBulkText(SAMPLE_NAMES.join("\n"));
    setPesertaList(SAMPLE_PESERTA);
    setIsSimulation(true);
    onToast?.("Data contoh template berhasil dimuat.");
  };

  // ── Reshuffle / Regenerate Check-in Times ──
  const handleRegenerateTimes = () => {
    const dateStr = extractDateStr(agenda.hariTanggal);
    const startTime = agenda.waktuMulai || "08.00";

    setPesertaList((prev) =>
      prev.map((p, idx) => ({
        ...p,
        tanggalCheckin: generateCheckinTime(dateStr, startTime, idx, prev.length),
      }))
    );
    setIsSimulation(true);
    onToast?.("Waktu check-in peserta berhasil disimulasikan ulang.");
  };

  // ── Inline Edit Peserta ──
  const handleUpdatePeserta = (id: string, field: keyof DaftarHadirPeserta, value: any) => {
    setPesertaList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // ── Delete Peserta ──
  const handleDeletePeserta = (id: string) => {
    setPesertaList((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return filtered.map((p, idx) => ({ ...p, nomor: idx + 1 }));
    });
  };

  // ── Add Single Peserta Row ──
  const handleAddSinglePeserta = () => {
    const dateStr = extractDateStr(agenda.hariTanggal);
    const startTime = agenda.waktuMulai || "08.00";
    const nextNomor = pesertaList.length + 1;

    const newOne: DaftarHadirPeserta = {
      id: `${Date.now()}-${nextNomor}`,
      nomor: nextNomor,
      nama: "",
      tanggalCheckin: generateCheckinTime(dateStr, startTime, nextNomor - 1, nextNomor),
      status: "CheckIn",
    };

    setPesertaList((prev) => [...prev, newOne]);
  };

  // ── Document Payload ──
  const docData: DaftarHadirData = useMemo(
    () => ({
      agenda,
      peserta: pesertaList,
      isSimulation,
    }),
    [agenda, pesertaList, isSimulation]
  );

  // ── Export Handlers ──
  const handleDownloadExcel = async () => {
    if (pesertaList.length === 0) {
      onToast?.("Daftar peserta masih kosong. Masukkan nama peserta terlebih dahulu.");
      return;
    }
    try {
      setIsExporting(true);
      await exportDaftarHadirToExcel(docData);
      onToast?.("File Excel (.xlsx) berhasil diunduh.");
    } catch (err) {
      console.error("Gagal export Excel:", err);
      onToast?.("Gagal mengunduh Excel. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (pesertaList.length === 0) {
      onToast?.("Daftar peserta masih kosong. Masukkan nama peserta terlebih dahulu.");
      return;
    }
    try {
      setIsExporting(true);
      await pdfService.downloadDaftarHadirPdf(docData);
      onToast?.("File PDF (.pdf) berhasil diunduh.");
    } catch (err) {
      console.error("Gagal export PDF:", err);
      onToast?.("Gagal mengunduh PDF. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    if (pesertaList.length === 0) {
      onToast?.("Daftar peserta masih kosong. Masukkan nama peserta terlebih dahulu.");
      return;
    }
    try {
      await pdfService.printDaftarHadirPdf(docData);
    } catch (err) {
      console.error("Gagal print PDF:", err);
      onToast?.("Gagal membuka jendela cetak.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Page Header ── */}
      <PageHeader
        title="Generator Daftar Hadir"
        subtitle="Buat dokumen daftar hadir otomatis sesuai template resmi Universitas Telkom."
      >
        <div className="flex flex-wrap items-center gap-2">
          <OutlineBtn
            onClick={handleDownloadExcel}
            disabled={isExporting || pesertaList.length === 0}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
          >
            {Ico.download("w-4 h-4 text-emerald-700")}
            <span>Download Excel (.xlsx)</span>
          </OutlineBtn>

          <OutlineBtn
            onClick={handleDownloadPdf}
            disabled={isExporting || pesertaList.length === 0}
            className="flex items-center gap-2 bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
          >
            {Ico.download("w-4 h-4 text-red-700")}
            <span>Download PDF (.pdf)</span>
          </OutlineBtn>

          <PrimaryBtn
            onClick={handlePrintPdf}
            disabled={isExporting || pesertaList.length === 0}
            className="flex items-center gap-2"
          >
            {Ico.print("w-4 h-4")}
            <span>Cetak Dokumen</span>
          </PrimaryBtn>
        </div>
      </PageHeader>

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("form")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "form"
              ? "border-[#8B1E1E] text-[#8B1E1E]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {Ico.edit("w-4 h-4")}
          <span>Formulir & Peserta</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 font-medium">
            {pesertaList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "preview"
              ? "border-[#8B1E1E] text-[#8B1E1E]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {Ico.eye("w-4 h-4")}
          <span>Preview Dokumen Template</span>
        </button>
      </div>

      {/* ── TAB 1: FORMULIR & DATA PESERTA ── */}
      {activeTab === "form" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ── Left Column: Agenda Info Form (5 cols) ── */}
            <div className="lg:col-span-5 space-y-6">
              <Card>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#8B1E1E] flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Informasi Agenda</h3>
                      <p className="text-xs text-gray-500">Sesuaikan rincian kegiatan</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-xs text-[#8B1E1E] hover:underline font-semibold"
                  >
                    Muat Contoh Template
                  </button>
                </div>

                <div className="space-y-4">
                  <FormField label="Hari & Tanggal Kegiatan" required>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E]"
                      placeholder="Contoh: Jumat, 15 Oktober 2026"
                      value={agenda.hariTanggal}
                      onChange={(e) => setAgenda({ ...agenda, hariTanggal: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Nama Agenda / Kegiatan" required>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E]"
                      placeholder="Contoh: Rapat Persiapan Wisuda Semester Ganjil"
                      value={agenda.namaAgenda}
                      onChange={(e) => setAgenda({ ...agenda, namaAgenda: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Tempat Kegiatan" required>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E]"
                      placeholder="Contoh: Ruang Rapat SDM Lantai 2 Gedung E"
                      value={agenda.tempat}
                      onChange={(e) => setAgenda({ ...agenda, tempat: e.target.value })}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Waktu Mulai">
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E]"
                        placeholder="08.00"
                        value={agenda.waktuMulai}
                        onChange={(e) => handleTimeChange("waktuMulai", e.target.value)}
                      />
                    </FormField>

                    <FormField label="Waktu Selesai">
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E]"
                        placeholder="13.00 WIB"
                        value={agenda.waktuSelesai}
                        onChange={(e) => handleTimeChange("waktuSelesai", e.target.value)}
                      />
                    </FormField>
                  </div>

                  <FormField label="Teks Rentang Waktu (di Dokumen)">
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] bg-gray-50"
                      value={agenda.waktu}
                      onChange={(e) => setAgenda({ ...agenda, waktu: e.target.value })}
                    />
                  </FormField>

                  {/* Collapsible Metadata Kop */}
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowMetadata(!showMetadata)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-gray-600 hover:text-gray-900 py-1"
                    >
                      <span>Pengaturan No. Formulir & Kop (Opsional)</span>
                      <span>{showMetadata ? "▲ Sembunyikan" : "▼ Tampilkan"}</span>
                    </button>

                    {showMetadata && (
                      <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-2">
                          <FormField label="No. Formulir">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white"
                              value={agenda.noFormulir || ""}
                              onChange={(e) => setAgenda({ ...agenda, noFormulir: e.target.value })}
                            />
                          </FormField>
                          <FormField label="Revisi">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white"
                              value={agenda.revisi || ""}
                              onChange={(e) => setAgenda({ ...agenda, revisi: e.target.value })}
                            />
                          </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <FormField label="Berlaku Efektif">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white"
                              value={agenda.berlakuEfektif || ""}
                              onChange={(e) => setAgenda({ ...agenda, berlakuEfektif: e.target.value })}
                            />
                          </FormField>
                          <FormField label="Hal">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white"
                              value={agenda.hal || ""}
                              onChange={(e) => setAgenda({ ...agenda, hal: e.target.value })}
                            />
                          </FormField>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Right Column: Bulk Paste Nama Peserta (7 cols) ── */}
            <div className="lg:col-span-7 space-y-6">
              <Card>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#8B1E1E] flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Input Nama Peserta (Bulk Paste)</h3>
                      <p className="text-xs text-gray-500">
                        Copy-paste nama langsung dari Excel, Word, atau teks (1 baris = 1 peserta)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBulkText(SAMPLE_NAMES.join("\n"))}
                    className="text-xs text-[#8B1E1E] hover:underline font-semibold"
                  >
                    Tempel Data Contoh
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      rows={9}
                      className="w-full p-3 text-sm font-mono border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] leading-relaxed"
                      placeholder={`AULIA FITRAH FAJRIANI\nWAHYU NURROSYID\nGHEAVIRA MELLINIA\nAGNY NADYA YUSNIAULIA\nWIWIN RATNA SARI`}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <div className="text-[11px] text-gray-400 mt-1 flex justify-between">
                      <span>* Penulisan huruf kapital/kecil akan dipertahankan persis sesuai input.</span>
                      <span>{bulkText.split(/\r?\n/).filter((l) => l.trim()).length} baris terdeteksi</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Waktu check-in unik akan otomatis di-generate dalam rentang agenda.</span>
                    </div>

                    <PrimaryBtn
                      onClick={handleProcessBulkNames}
                      className="flex items-center gap-2 px-5 py-2"
                    >
                      {Ico.check("w-3.5 h-3.5")}
                      <span>Proses & Buat Daftar Hadir</span>
                    </PrimaryBtn>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* ── Section 3: Review & Edit Tabel Peserta ── */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#8B1E1E] flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>Tinjau & Edit Daftar Peserta</span>
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-[#8B1E1E]/10 text-[#8B1E1E] font-bold">
                      {pesertaList.length} Orang
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Periksa nama, waktu check-in, dan status sebelum diunduh ke Excel atau PDF.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <OutlineBtn
                  onClick={handleRegenerateTimes}
                  className="text-xs flex items-center gap-1.5 py-1.5 px-3"
                  title="Acak ulang waktu check-in dengan rentang waktu agenda"
                >
                  {Ico.sync ? Ico.sync("w-3.5 h-3.5") : Ico.edit("w-3.5 h-3.5")}
                  <span>Simulasi Ulang Waktu</span>
                </OutlineBtn>

                <OutlineBtn
                  onClick={handleAddSinglePeserta}
                  className="text-xs flex items-center gap-1.5 py-1.5 px-3 bg-gray-50"
                >
                  {Ico.plus("w-3.5 h-3.5")}
                  <span>Tambah Baris</span>
                </OutlineBtn>
              </div>
            </div>

            {/* Simulation Notice Banner */}
            {isSimulation && pesertaList.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
                <span className="text-amber-600 font-bold text-sm leading-none mt-0.5">ℹ️</span>
                <div>
                  <span className="font-bold">Mode Simulasi Presensi:</span> Waktu check-in peserta dihasilkan secara
                  otomatis dan realistis dalam rentang waktu agenda untuk kebutuhan simulasi dokumen. Anda dapat mengedit
                  setiap waktu dan nama secara manual pada tabel di bawah.
                </div>
              </div>
            )}

            {/* Interactive Review Table */}
            <div className="mt-4 overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3 w-16 text-center border-r border-gray-200">Nomor</th>
                    <th className="py-2.5 px-4 min-w-[240px] border-r border-gray-200">Nama Peserta</th>
                    <th className="py-2.5 px-4 w-64 border-r border-gray-200 text-center">Tanggal Check-in</th>
                    <th className="py-2.5 px-3 w-32 border-r border-gray-200 text-center">Status</th>
                    <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pesertaList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Belum ada peserta. Silakan tempel daftar nama di kotak input atas.
                      </td>
                    </tr>
                  ) : (
                    pesertaList.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        {/* Nomor */}
                        <td className="py-2 px-3 text-center border-r border-gray-200 font-semibold text-gray-600">
                          {p.nomor}
                        </td>

                        {/* Nama */}
                        <td className="py-1.5 px-3 border-r border-gray-200">
                          <input
                            type="text"
                            value={p.nama}
                            onChange={(e) => handleUpdatePeserta(p.id, "nama", e.target.value)}
                            className="w-full px-2 py-1 text-xs font-serif border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] focus:bg-white rounded transition-colors"
                            placeholder="Nama Peserta..."
                          />
                        </td>

                        {/* Tanggal Check-in */}
                        <td className="py-1.5 px-3 border-r border-gray-200">
                          <input
                            type="text"
                            value={p.tanggalCheckin}
                            onChange={(e) => handleUpdatePeserta(p.id, "tanggalCheckin", e.target.value)}
                            className="w-full px-2 py-1 text-xs text-center border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] focus:bg-white rounded transition-colors"
                          />
                        </td>

                        {/* Status */}
                        <td className="py-1.5 px-3 border-r border-gray-200 text-center">
                          <input
                            type="text"
                            value={p.status}
                            onChange={(e) => handleUpdatePeserta(p.id, "status", e.target.value)}
                            className="w-full px-2 py-1 text-xs text-center border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] focus:bg-white rounded font-medium text-emerald-700"
                          />
                        </td>

                        {/* Delete Button */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePeserta(p.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                            title="Hapus baris ini"
                          >
                            {Ico.trash("w-3.5 h-3.5")}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Total <strong>{pesertaList.length}</strong> peserta terdaftar. Dokumen siap diekspor.
              </span>

              <div className="flex items-center gap-2">
                <OutlineBtn
                  onClick={() => setActiveTab("preview")}
                  className="flex items-center gap-1.5 text-xs py-2 px-4"
                >
                  {Ico.eye("w-3.5 h-3.5")}
                  <span>Lihat Preview Format Dokumen</span>
                </OutlineBtn>

                <OutlineBtn
                  onClick={handleDownloadExcel}
                  disabled={isExporting || pesertaList.length === 0}
                  className="flex items-center gap-1.5 text-xs py-2 px-4 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                >
                  {Ico.download("w-3.5 h-3.5 text-emerald-700")}
                  <span>Export Excel (.xlsx)</span>
                </OutlineBtn>

                <PrimaryBtn
                  onClick={handleDownloadPdf}
                  disabled={isExporting || pesertaList.length === 0}
                  className="flex items-center gap-1.5 text-xs py-2 px-4"
                >
                  {Ico.download("w-3.5 h-3.5")}
                  <span>Export PDF (.pdf)</span>
                </PrimaryBtn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: PREVIEW DOKUMEN ── */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preview Layout Sesuai Template Referensi</h3>
              <p className="text-xs text-gray-500">
                Format kop surat, jenis font, ukuran, border, dan tata letak persis dengan file template.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <OutlineBtn
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 text-xs py-2 px-3 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
              >
                {Ico.download("w-3.5 h-3.5 text-emerald-700")}
                <span>Unduh Excel (.xlsx)</span>
              </OutlineBtn>

              <PrimaryBtn
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 text-xs py-2 px-3"
              >
                {Ico.download("w-3.5 h-3.5")}
                <span>Unduh PDF (.pdf)</span>
              </PrimaryBtn>
            </div>
          </div>

          {/* Document Preview Paper (Simulating A4 on Screen) */}
          <div className="bg-gray-100 p-4 md:p-8 rounded-xl flex justify-center overflow-x-auto">
            <div
              className="bg-white shadow-xl border border-gray-300 p-8 w-[800px] min-h-[1050px] text-[#000000]"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {/* ── KOP SURAT ── */}
              <div className="border border-black mb-3">
                <div className="grid grid-cols-12">
                  
                  {/* Left Column: Logo Telkom (Col span 3) */}
                  <div className="col-span-3 border-r border-black p-3 flex items-center justify-center">
                    <img
                      src={excelLogoBase64}
                      alt="Telkom University"
                      className="max-h-16 w-auto object-contain"
                    />
                  </div>

                  {/* Middle Column: Universitas Telkom & Alamat & Daftar Hadir (Col span 5) */}
                  <div className="col-span-5 border-r border-black flex flex-col justify-between">
                    <div className="p-1.5 border-b border-black font-bold text-sm tracking-wide">
                      UNIVERSITAS TELKOM
                    </div>
                    <div className="p-1.5 border-b border-black text-[11px] leading-tight flex-1 flex items-center">
                      Jl. Telekomunikasi No. 1 Terusan Buah Batu Bandung 40257
                    </div>
                    <div className="p-1.5 font-bold text-xs tracking-wide">
                      Daftar Hadir
                    </div>
                  </div>

                  {/* Right Column: Metadata Box (Col span 4) */}
                  <div className="col-span-4 flex flex-col justify-between text-xs">
                    <div className="grid grid-cols-2 border-b border-black min-h-[22px] items-center">
                      <span className="border-r border-black px-2 py-0.5 font-normal">No. Formulir</span>
                      <span className="px-2 py-0.5 text-center">{agenda.noFormulir || ""}</span>
                    </div>
                    <div className="grid grid-cols-2 border-b border-black min-h-[22px] items-center">
                      <span className="border-r border-black px-2 py-0.5 font-normal">Revisi</span>
                      <span className="px-2 py-0.5 text-center">{agenda.revisi || ""}</span>
                    </div>
                    <div className="grid grid-cols-2 border-b border-black min-h-[22px] items-center">
                      <span className="border-r border-black px-2 py-0.5 font-normal">Berlaku Efektif</span>
                      <span className="px-2 py-0.5 text-center">{agenda.berlakuEfektif || ""}</span>
                    </div>
                    <div className="grid grid-cols-2 min-h-[22px] items-center">
                      <span className="border-r border-black px-2 py-0.5 font-normal">Hal</span>
                      <span className="px-2 py-0.5 text-center">{agenda.hal || ""}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── AGENDA BLOCK ── */}
              <div className="border border-black mb-3 text-xs leading-normal">
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-3 border-r border-black px-3 py-1 font-normal">Hari, Tanggal</div>
                  <div className="col-span-9 px-3 py-1 font-normal">{agenda.hariTanggal}</div>
                </div>
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-3 border-r border-black px-3 py-1 font-normal">Agenda</div>
                  <div className="col-span-9 px-3 py-1 font-normal">{agenda.namaAgenda}</div>
                </div>
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-3 border-r border-black px-3 py-1 font-normal">Tempat</div>
                  <div className="col-span-9 px-3 py-1 font-normal">{agenda.tempat}</div>
                </div>
                <div className="grid grid-cols-12">
                  <div className="col-span-3 border-r border-black px-3 py-1 font-normal">Waktu</div>
                  <div className="col-span-9 px-3 py-1 font-normal">{agenda.waktu}</div>
                </div>
              </div>

              {/* ── ATTENDANCE TABLE ── */}
              <div className="border border-black text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-black font-bold">
                      <th className="border-r border-black py-1.5 px-2 text-center w-[10%]">Nomor</th>
                      <th className="border-r border-black py-1.5 px-3 text-center w-[48%]">Nama</th>
                      <th className="border-r border-black py-1.5 px-2 text-center w-[27%]">Tanggal Check-in</th>
                      <th className="py-1.5 px-2 text-center w-[15%]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pesertaList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-400">
                          (Daftar peserta kosong)
                        </td>
                      </tr>
                    ) : (
                      pesertaList.map((p) => (
                        <tr key={p.id} className="border-b border-black last:border-b-0">
                          <td className="border-r border-black py-1 px-2 text-center">{p.nomor}</td>
                          <td
                            className="border-r border-black py-1 px-3 text-left"
                            style={{ fontFamily: "Cambria, Georgia, serif" }}
                          >
                            {p.nama}
                          </td>
                          <td className="border-r border-black py-1 px-2 text-center">{p.tanggalCheckin}</td>
                          <td className="py-1 px-2 text-center">{p.status || "CheckIn"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DaftarHadirPage;
