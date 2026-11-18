import React, { useState, useMemo } from "react";
import { tokens } from "../styles/tokens";
import { Ico } from "../utils/icons";
import { PageHeader, Card } from "../components/ui";
import { pdfService } from "../services/pdfService";
import { exportDaftarHadirToExcel } from "../services/excelDaftarHadirService";
import type { DaftarHadirAgenda, DaftarHadirPeserta, DaftarHadirData } from "../types/daftarHadir";
import { excelLogoBase64 } from "../assets/excelLogoBase64";

const { color } = tokens;

interface Props {
  onToast?: (msg: string) => void;
}

// ── Default sample data matching template-daftar-hadir.xlsx ──
const DEFAULT_AGENDA: DaftarHadirAgenda = {
  hariTanggal: "Jumat, 15 Oktober 2026",
  namaAgenda: "Rapat ….",
  tempat: "Ruang Rapat SDM Lantai 2 Gedung E. Ruang Kultubai",
  waktu: "08.00 - 13.00 WIB",
  waktuMulai: "08.00",
  waktuSelesai: "13.00",
  noFormulir: "",
  revisi: "",
  berlakuEfektif: "",
  hal: "",
};

const DEFAULT_NAMES_TEXT = [
  "AULIA FITRAH FAJRIANI",
  "WAHYU NURROSYID",
  "GHEAVIRA MELLINIA",
  "AGNY NADYA YUSNIAULIA",
  "WIWIN RATNA SARI",
  "TOUFAN DIANSYAH TAMBUNAN",
  "ASYA AZHAR FATHINA",
].join("\n");

const DEFAULT_PESERTA: DaftarHadirPeserta[] = [
  { id: "1", nomor: 1, nama: "AULIA FITRAH FAJRIANI",    tanggalCheckin: "15 Oktober 2026, 08:40:30", status: "CheckIn" },
  { id: "2", nomor: 2, nama: "WAHYU NURROSYID",          tanggalCheckin: "15 Oktober 2026, 08:31:02", status: "CheckIn" },
  { id: "3", nomor: 3, nama: "GHEAVIRA MELLINIA",        tanggalCheckin: "15 Oktober 2026, 08:31:15", status: "CheckIn" },
  { id: "4", nomor: 4, nama: "AGNY NADYA YUSNIAULIA",    tanggalCheckin: "15 Oktober 2026, 08:31:30", status: "CheckIn" },
  { id: "5", nomor: 5, nama: "WIWIN RATNA SARI",         tanggalCheckin: "15 Oktober 2026, 08:41:00", status: "CheckIn" },
  { id: "6", nomor: 6, nama: "TOUFAN DIANSYAH TAMBUNAN", tanggalCheckin: "15 Oktober 2026, 08:38:30", status: "CheckIn" },
  { id: "7", nomor: 7, nama: "ASYA AZHAR FATHINA",       tanggalCheckin: "15 Oktober 2026, 08:40:30", status: "CheckIn" },
];

function extractDateStr(hariTanggal: string): string {
  const parts = hariTanggal.split(",");
  if (parts.length > 1) {
    return parts.slice(1).join(",").trim();
  }
  return hariTanggal.trim() || "15 Oktober 2026";
}

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

  // Realistic distribution within first 15-45 minutes of event
  const baseMinutesOffset = 25 + Math.floor((index / Math.max(total, 1)) * 16);
  const jitterMinute = (index * 7 + (index % 3) * 2) % 15;
  const totalOffsetMinutes = baseMinutesOffset + jitterMinute;

  const totalMinutes = startHour * 60 + startMinute + totalOffsetMinutes;
  const checkHour = Math.floor(totalMinutes / 60) % 24;
  const checkMinute = totalMinutes % 60;
  const checkSecond = (12 + index * 17 + (index % 5) * 7) % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${dateStr}, ${pad(checkHour)}:${pad(checkMinute)}:${pad(checkSecond)}`;
}

export default function DaftarHadirPage({ onToast }: Props) {
  const [agenda, setAgenda] = useState<DaftarHadirAgenda>(DEFAULT_AGENDA);
  const [showKopSettings, setShowKopSettings] = useState(false);
  const [bulkText, setBulkText] = useState(DEFAULT_NAMES_TEXT);
  const [pesertaList, setPesertaList] = useState<DaftarHadirPeserta[]>(DEFAULT_PESERTA);
  const [isSimulation, setIsSimulation] = useState(true);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [isExporting, setIsExporting] = useState(false);

  // Synchronize waktu string
  const handleTimeChange = (type: "waktuMulai" | "waktuSelesai", val: string) => {
    setAgenda((prev) => {
      const next = { ...prev, [type]: val };
      const m = type === "waktuMulai" ? val : prev.waktuMulai || "08.00";
      const s = type === "waktuSelesai" ? val : prev.waktuSelesai || "13.00";
      next.waktu = `${m.replace(":", ".")} - ${s.replace(":", ".")} WIB`;
      return next;
    });
  };

  // Process pasted names
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
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      nomor: idx + 1,
      nama: name, // Exact casing preserved!
      tanggalCheckin: generateCheckinTime(dateStr, startTime, idx, lines.length),
      status: "CheckIn",
    }));

    setPesertaList(newPeserta);
    setIsSimulation(true);
    onToast?.(`Berhasil memproses ${newPeserta.length} nama peserta.`);
  };

  // Reset to default template sample
  const handleResetSample = () => {
    setAgenda(DEFAULT_AGENDA);
    setBulkText(DEFAULT_NAMES_TEXT);
    setPesertaList(DEFAULT_PESERTA);
    setIsSimulation(true);
    onToast?.("Data contoh template berhasil dimuat.");
  };

  // Reshuffle checkin times
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
    onToast?.("Waktu check-in berhasil diacak ulang secara realistis.");
  };

  // Inline update
  const handleUpdatePeserta = (id: string, field: keyof DaftarHadirPeserta, value: any) => {
    setPesertaList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Delete row
  const handleDeletePeserta = (id: string) => {
    setPesertaList((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return filtered.map((p, idx) => ({ ...p, nomor: idx + 1 }));
    });
  };

  // Add row
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

  const docData: DaftarHadirData = useMemo(
    () => ({
      agenda,
      peserta: pesertaList,
      isSimulation,
    }),
    [agenda, pesertaList, isSimulation]
  );

  // Export handlers
  const handleDownloadExcel = async () => {
    if (pesertaList.length === 0) {
      onToast?.("Daftar peserta masih kosong.");
      return;
    }
    try {
      setIsExporting(true);
      await exportDaftarHadirToExcel(docData);
      onToast?.("File Excel (.xlsx) berhasil diunduh.");
    } catch (err) {
      console.error(err);
      onToast?.("Gagal mengunduh Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (pesertaList.length === 0) {
      onToast?.("Daftar peserta masih kosong.");
      return;
    }
    try {
      setIsExporting(true);
      await pdfService.downloadDaftarHadirPdf(docData);
      onToast?.("File PDF (.pdf) berhasil diunduh.");
    } catch (err) {
      console.error(err);
      onToast?.("Gagal mengunduh PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    if (pesertaList.length === 0) {
      onToast?.("Daftar peserta masih kosong.");
      return;
    }
    try {
      await pdfService.printDaftarHadirPdf(docData);
    } catch (err) {
      console.error(err);
      onToast?.("Gagal membuka jendela cetak.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── TOP HEADER & ACTION BUTTONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <PageHeader
          title="Generator Daftar Hadir"
          subtitle="Buat dokumen daftar hadir otomatis sesuai template resmi Universitas Telkom."
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadExcel}
            disabled={isExporting || pesertaList.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-colors cursor-pointer"
          >
            {Ico.download("w-4 h-4 text-white")}
            <span>Download Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting || pesertaList.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            style={{ background: color.brand }}
          >
            {Ico.download("w-4 h-4 text-white")}
            <span>Download PDF (.pdf)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            disabled={isExporting || pesertaList.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {Ico.print("w-4 h-4 text-gray-700")}
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("form")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
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
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── LEFT: INFORMASI AGENDA (Card) ── */}
            <div className="lg:col-span-5">
              <Card className="p-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-[#8B1E1E]/10 text-[#8B1E1E] font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-gray-900">Informasi Agenda</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetSample}
                    className="text-xs text-[#8B1E1E] hover:underline font-semibold cursor-pointer"
                  >
                    Muat Contoh Template
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Hari & Tanggal Kegiatan
                    </label>
                    <input
                      type="text"
                      value={agenda.hariTanggal}
                      onChange={(e) => setAgenda({ ...agenda, hariTanggal: e.target.value })}
                      placeholder="Contoh: Jumat, 15 Oktober 2026"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Nama Agenda / Kegiatan
                    </label>
                    <input
                      type="text"
                      value={agenda.namaAgenda}
                      onChange={(e) => setAgenda({ ...agenda, namaAgenda: e.target.value })}
                      placeholder="Contoh: Rapat Koordinasi..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Tempat Kegiatan
                    </label>
                    <input
                      type="text"
                      value={agenda.tempat}
                      onChange={(e) => setAgenda({ ...agenda, tempat: e.target.value })}
                      placeholder="Contoh: Ruang Rapat SDM Lantai 2 Gedung E"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Waktu Mulai
                      </label>
                      <input
                        type="text"
                        value={agenda.waktuMulai}
                        onChange={(e) => handleTimeChange("waktuMulai", e.target.value)}
                        placeholder="08.00"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] focus:bg-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Waktu Selesai
                      </label>
                      <input
                        type="text"
                        value={agenda.waktuSelesai}
                        onChange={(e) => handleTimeChange("waktuSelesai", e.target.value)}
                        placeholder="13.00 WIB"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Teks Rentang Waktu (di Dokumen)
                    </label>
                    <input
                      type="text"
                      value={agenda.waktu}
                      onChange={(e) => setAgenda({ ...agenda, waktu: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-100 focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] transition-colors"
                    />
                  </div>

                  {/* Collapsible Kop Settings */}
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowKopSettings(!showKopSettings)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-gray-600 hover:text-gray-900 py-1 cursor-pointer"
                    >
                      <span>Pengaturan No. Formulir Kop (Opsional)</span>
                      <span className="text-[10px] text-gray-400">{showKopSettings ? "▲ Tutup" : "▼ Buka"}</span>
                    </button>

                    {showKopSettings && (
                      <div className="mt-2.5 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">No. Formulir</label>
                            <input
                              type="text"
                              value={agenda.noFormulir || ""}
                              onChange={(e) => setAgenda({ ...agenda, noFormulir: e.target.value })}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Revisi</label>
                            <input
                              type="text"
                              value={agenda.revisi || ""}
                              onChange={(e) => setAgenda({ ...agenda, revisi: e.target.value })}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Berlaku Efektif</label>
                            <input
                              type="text"
                              value={agenda.berlakuEfektif || ""}
                              onChange={(e) => setAgenda({ ...agenda, berlakuEfektif: e.target.value })}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Hal</label>
                            <input
                              type="text"
                              value={agenda.hal || ""}
                              onChange={(e) => setAgenda({ ...agenda, hal: e.target.value })}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* ── RIGHT: BULK PASTE NAMA PESERTA (Card) ── */}
            <div className="lg:col-span-7">
              <Card className="p-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-[#8B1E1E]/10 text-[#8B1E1E] font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Input Nama Peserta (Bulk Paste)</h3>
                      <p className="text-xs text-gray-500">1 baris = 1 peserta (bisa copy dari Excel atau Word)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkText(DEFAULT_NAMES_TEXT)}
                      className="text-xs text-[#8B1E1E] hover:underline font-semibold cursor-pointer"
                    >
                      Tempel Data Contoh
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setBulkText("")}
                      className="text-xs text-gray-500 hover:text-red-600 font-semibold cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <textarea
                      rows={8}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="Tempel daftar nama peserta di sini...&#10;AULIA FITRAH FAJRIANI&#10;WAHYU NURROSYID&#10;GHEAVIRA MELLINIA"
                      className="w-full border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-800 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] focus:bg-white transition-colors leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                      <span>* Huruf besar/kecil asli akan dipertahankan tanpa diubah otomatis.</span>
                      <span className="font-semibold text-gray-600">
                        {bulkText.split(/\r?\n/).filter((l) => l.trim()).length} nama terdeteksi
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Waktu check-in unik otomatis di-generate dalam rentang agenda.</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleProcessBulkNames}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-sm cursor-pointer transition-colors"
                      style={{ background: color.brand }}
                    >
                      {Ico.check("w-3.5 h-3.5 text-white")}
                      <span>Proses & Perbarui Tabel Peserta</span>
                    </button>
                  </div>
                </div>
              </Card>
            </div>

          </div>

          {/* ── STEP 3: REVIEW & EDIT TABEL PESERTA ── */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-[#8B1E1E]/10 text-[#8B1E1E] font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span>Daftar Peserta & Waktu Presensi</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-[#8B1E1E]/10 text-[#8B1E1E] font-bold">
                      {pesertaList.length} Orang
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Anda dapat mengedit nama, waktu presensi, dan status masing-masing peserta secara langsung.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerateTimes}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
                  title="Simulasikan ulang variasi waktu check-in"
                >
                  {Ico.sync ? Ico.sync("w-3.5 h-3.5") : Ico.edit("w-3.5 h-3.5")}
                  <span>Acak Ulang Waktu</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddSinglePeserta}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
                >
                  {Ico.plus("w-3.5 h-3.5")}
                  <span>Tambah Baris</span>
                </button>
              </div>
            </div>

            {/* Mode Simulasi Alert */}
            {isSimulation && pesertaList.length > 0 && (
              <div className="mt-3 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2.5">
                <span className="text-amber-600 font-bold text-sm">ℹ️</span>
                <span>
                  <strong>Mode Simulasi:</strong> Waktu check-in disimulasikan secara dinamis dan unik dalam rentang waktu agenda.
                </span>
              </div>
            )}

            {/* Table */}
            <div className="mt-4 overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3 w-16 text-center border-r border-gray-200">Nomor</th>
                    <th className="py-2.5 px-4 min-w-[240px] border-r border-gray-200">Nama Peserta</th>
                    <th className="py-2.5 px-4 w-60 border-r border-gray-200 text-center">Tanggal Check-in</th>
                    <th className="py-2.5 px-3 w-28 border-r border-gray-200 text-center">Status</th>
                    <th className="py-2.5 px-3 w-14 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {pesertaList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Belum ada peserta. Silakan tempel daftar nama di kotak atas.
                      </td>
                    </tr>
                  ) : (
                    pesertaList.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-3 text-center border-r border-gray-100 font-semibold text-gray-500">
                          {p.nomor}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-100">
                          <input
                            type="text"
                            value={p.nama}
                            onChange={(e) => handleUpdatePeserta(p.id, "nama", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] focus:bg-white rounded transition-colors"
                            placeholder="Nama Peserta..."
                            style={{ fontFamily: "Cambria, Georgia, serif" }}
                          />
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-100 text-center">
                          <input
                            type="text"
                            value={p.tanggalCheckin}
                            onChange={(e) => handleUpdatePeserta(p.id, "tanggalCheckin", e.target.value)}
                            className="w-full px-2 py-1 text-xs text-center border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] focus:bg-white rounded transition-colors"
                          />
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-100 text-center">
                          <input
                            type="text"
                            value={p.status}
                            onChange={(e) => handleUpdatePeserta(p.id, "status", e.target.value)}
                            className="w-full px-2 py-1 text-xs text-center font-semibold text-emerald-700 border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] focus:bg-white rounded transition-colors"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePeserta(p.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50 cursor-pointer"
                            title="Hapus baris"
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

            {/* Bottom Bar inside Card */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Total <strong>{pesertaList.length}</strong> peserta. Dokumen siap diekspor.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
                >
                  {Ico.eye("w-3.5 h-3.5")}
                  <span>Lihat Preview Format Dokumen</span>
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: PREVIEW DOKUMEN ── */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preview Layout Sesuai Template Referensi</h3>
              <p className="text-xs text-gray-500">
                Format kop surat, jenis font, border, dan ukuran persis dengan file template Excel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
              >
                {Ico.download("w-3.5 h-3.5 text-white")}
                <span>Download Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer"
                style={{ background: color.brand }}
              >
                {Ico.download("w-3.5 h-3.5 text-white")}
                <span>Download PDF (.pdf)</span>
              </button>
            </div>
          </div>

          {/* Paper Container */}
          <div className="bg-gray-200 p-4 sm:p-8 rounded-xl flex justify-center overflow-x-auto">
            <div
              className="bg-white shadow-2xl border border-gray-300 p-8 w-[780px] min-h-[1050px] text-black"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {/* ── KOP SURAT ── */}
              <div className="border border-black mb-3">
                <div className="grid grid-cols-12">
                  {/* Left: Logo */}
                  <div className="col-span-3 border-r border-black p-2 flex items-center justify-center">
                    <img
                      src={excelLogoBase64}
                      alt="Universitas Telkom"
                      className="max-h-16 w-auto object-contain"
                    />
                  </div>

                  {/* Middle: Text */}
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

                  {/* Right: Meta Box */}
                  <div className="col-span-4 flex flex-col justify-between text-xs">
                    <div className="grid grid-cols-2 border-b border-black min-h-[22px] items-center">
                      <span className="border-r border-black px-2 py-0.5">No. Formulir</span>
                      <span className="px-2 py-0.5 text-center">{agenda.noFormulir || ""}</span>
                    </div>
                    <div className="grid grid-cols-2 border-b border-black min-h-[22px] items-center">
                      <span className="border-r border-black px-2 py-0.5">Revisi</span>
                      <span className="px-2 py-0.5 text-center">{agenda.revisi || ""}</span>
                    </div>
                    <div className="grid grid-cols-2 border-b border-black min-h-[22px] items-center">
                      <span className="border-r border-black px-2 py-0.5">Berlaku Efektif</span>
                      <span className="px-2 py-0.5 text-center">{agenda.berlakuEfektif || ""}</span>
                    </div>
                    <div className="grid grid-cols-2 min-h-[22px] items-center">
                      <span className="border-r border-black px-2 py-0.5">Hal</span>
                      <span className="px-2 py-0.5 text-center">{agenda.hal || ""}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── AGENDA ── */}
              <div className="border border-black mb-3 text-xs leading-normal">
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-3 border-r border-black px-3 py-1">Hari, Tanggal</div>
                  <div className="col-span-9 px-3 py-1">{agenda.hariTanggal}</div>
                </div>
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-3 border-r border-black px-3 py-1">Agenda</div>
                  <div className="col-span-9 px-3 py-1">{agenda.namaAgenda}</div>
                </div>
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-3 border-r border-black px-3 py-1">Tempat</div>
                  <div className="col-span-9 px-3 py-1">{agenda.tempat}</div>
                </div>
                <div className="grid grid-cols-12">
                  <div className="col-span-3 border-r border-black px-3 py-1">Waktu</div>
                  <div className="col-span-9 px-3 py-1">{agenda.waktu}</div>
                </div>
              </div>

              {/* ── TABLE ── */}
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
                          (Belum ada peserta)
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
