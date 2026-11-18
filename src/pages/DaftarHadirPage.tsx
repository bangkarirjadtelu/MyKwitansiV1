import React, { useState, useEffect, useMemo } from "react";
import { tokens } from "../styles/tokens";
import { Ico } from "../utils/icons";
import {
  PageHeader,
  Card,
  PrimaryBtn,
  OutlineBtn,
  Modal,
  CardToolbar,
  TableControls,
  DataTable,
  Td,
} from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { daftarHadirService } from "../services/daftarHadirService";
import { pdfService } from "../services/pdfService";
import { exportDaftarHadirToExcel } from "../services/excelDaftarHadirService";
import type { DaftarHadirRecord, DaftarHadirAgenda, DaftarHadirPeserta, DaftarHadirData } from "../types/daftarHadir";
import { excelLogoBase64 } from "../assets/excelLogoBase64";
import { formatAdminName } from "../utils/formatters";

const { color } = tokens;

interface Props {
  onToast?: (msg: string) => void;
}

const TABLE_HEADERS = [
  "No. Dokumen",
  "Tgl Acara",
  "Tgl Input",
  "Admin",
  "Agenda",
  "Tempat",
  "Peserta",
  "Aksi",
];

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

export function DaftarHadirPage({ onToast }: Props) {
  const { currentAdmin } = useAuth();
  const adminName = currentAdmin?.username ?? "Bang Karir";

  // Data & Table State
  const [records, setRecords] = useState<DaftarHadirRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form Modal State (Create / Edit / Duplicate)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [formAgenda, setFormAgenda] = useState<DaftarHadirAgenda>(DEFAULT_AGENDA);
  const [formBulkText, setFormBulkText] = useState(DEFAULT_NAMES_TEXT);
  const [formPeserta, setFormPeserta] = useState<DaftarHadirPeserta[]>([]);
  const [showKopSettings, setShowKopSettings] = useState(false);

  // View Modal State
  const [viewTarget, setViewTarget] = useState<DaftarHadirRecord | null>(null);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<DaftarHadirRecord | null>(null);

  // Load records
  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await daftarHadirService.getAll();
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Filter & Pagination
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) =>
      r.nomor_dokumen.toLowerCase().includes(q) ||
      r.agenda.namaAgenda.toLowerCase().includes(q) ||
      r.agenda.tempat.toLowerCase().includes(q) ||
      r.agenda.hariTanggal.toLowerCase().includes(q) ||
      r.admin_username.toLowerCase().includes(q)
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentData = filtered.slice(startIndex, startIndex + pageSize);

  // Multi-select toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentData.map((r) => r.id)));
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingId(null);
    setIsDuplicate(false);
    setFormAgenda(DEFAULT_AGENDA);
    setFormBulkText(DEFAULT_NAMES_TEXT);

    const dateStr = extractDateStr(DEFAULT_AGENDA.hariTanggal);
    const lines = DEFAULT_NAMES_TEXT.split("\n");
    const initPeserta: DaftarHadirPeserta[] = lines.map((name, idx) => ({
      id: `p-${idx + 1}`,
      nomor: idx + 1,
      nama: name,
      tanggalCheckin: generateCheckinTime(dateStr, DEFAULT_AGENDA.waktuMulai || "08.00", idx, lines.length),
      status: "CheckIn",
    }));
    setFormPeserta(initPeserta);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rec: DaftarHadirRecord) => {
    setEditingId(rec.id);
    setIsDuplicate(false);
    setFormAgenda({ ...rec.agenda });
    setFormPeserta([...rec.peserta]);
    setFormBulkText(rec.peserta.map((p) => p.nama).join("\n"));
    setIsFormOpen(true);
  };

  // Open Duplicate Modal
  const openDuplicateModal = (rec: DaftarHadirRecord) => {
    setEditingId(null);
    setIsDuplicate(true);
    setFormAgenda({
      ...rec.agenda,
      namaAgenda: `${rec.agenda.namaAgenda} (Salinan)`,
    });
    setFormPeserta([...rec.peserta]);
    setFormBulkText(rec.peserta.map((p) => p.nama).join("\n"));
    setIsFormOpen(true);
  };

  // Form: handle time change
  const handleTimeChange = (type: "waktuMulai" | "waktuSelesai", val: string) => {
    setFormAgenda((prev) => {
      const next = { ...prev, [type]: val };
      const m = type === "waktuMulai" ? val : prev.waktuMulai || "08.00";
      const s = type === "waktuSelesai" ? val : prev.waktuSelesai || "13.00";
      next.waktu = `${m.replace(":", ".")} - ${s.replace(":", ".")} WIB`;
      return next;
    });
  };

  // Form: process bulk names
  const handleProcessBulkNames = () => {
    if (!formBulkText.trim()) {
      onToast?.("Silakan masukkan daftar nama peserta.");
      return;
    }

    const lines = formBulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      onToast?.("Tidak ada nama valid yang ditemukan.");
      return;
    }

    const dateStr = extractDateStr(formAgenda.hariTanggal);
    const startTime = formAgenda.waktuMulai || "08.00";

    const newPeserta: DaftarHadirPeserta[] = lines.map((name, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      nomor: idx + 1,
      nama: name,
      tanggalCheckin: generateCheckinTime(dateStr, startTime, idx, lines.length),
      status: "CheckIn",
    }));

    setFormPeserta(newPeserta);
    onToast?.(`Berhasil memproses ${newPeserta.length} peserta.`);
  };

  // Form: reshuffle checkin times
  const handleRegenerateTimes = () => {
    const dateStr = extractDateStr(formAgenda.hariTanggal);
    const startTime = formAgenda.waktuMulai || "08.00";

    setFormPeserta((prev) =>
      prev.map((p, idx) => ({
        ...p,
        tanggalCheckin: generateCheckinTime(dateStr, startTime, idx, prev.length),
      }))
    );
    onToast?.("Waktu check-in peserta berhasil diacak ulang.");
  };

  // Save form
  const handleSaveForm = async () => {
    if (!formAgenda.namaAgenda.trim()) {
      onToast?.("Nama agenda kegiatan wajib diisi.");
      return;
    }
    if (formPeserta.length === 0) {
      onToast?.("Daftar peserta masih kosong.");
      return;
    }

    try {
      if (editingId) {
        await daftarHadirService.update(editingId, {
          agenda: formAgenda,
          peserta: formPeserta,
        });
        onToast?.("Data daftar hadir berhasil diperbarui.");
      } else {
        await daftarHadirService.create({
          agenda: formAgenda,
          peserta: formPeserta,
          admin_username: adminName,
          isSimulation: true,
        });
        onToast?.("Data daftar hadir baru berhasil disimpan.");
      }
      setIsFormOpen(false);
      await loadRecords();
    } catch (e) {
      console.error(e);
      onToast?.("Gagal menyimpan data.");
    }
  };

  // Delete action
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await daftarHadirService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadRecords();
      onToast?.("Data daftar hadir berhasil dihapus.");
    } catch (e) {
      console.error(e);
      onToast?.("Gagal menghapus data.");
    }
  };

  // Direct export helpers
  const exportRecordToExcel = async (rec: DaftarHadirRecord) => {
    try {
      await exportDaftarHadirToExcel({
        agenda: rec.agenda,
        peserta: rec.peserta,
        isSimulation: rec.isSimulation ?? true,
      });
      onToast?.("File Excel berhasil diunduh.");
    } catch (e) {
      console.error(e);
      onToast?.("Gagal mengunduh Excel.");
    }
  };

  const exportRecordToPdf = async (rec: DaftarHadirRecord) => {
    try {
      await pdfService.downloadDaftarHadirPdf({
        agenda: rec.agenda,
        peserta: rec.peserta,
        isSimulation: rec.isSimulation ?? true,
      });
      onToast?.("File PDF berhasil diunduh.");
    } catch (e) {
      console.error(e);
      onToast?.("Gagal mengunduh PDF.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Data Daftar Hadir"
        subtitle="Kelola semua riwayat data daftar hadir kegiatan"
      />

      {/* ── MAIN TABLE CARD ── */}
      <Card className="p-5">
        <CardToolbar
          left={
            <div className="flex gap-2 w-full overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              <PrimaryBtn
                onClick={openCreateModal}
                className="flex items-center gap-2 flex-shrink-0 cursor-pointer"
              >
                {Ico.plus("w-4 h-4")}
                <span>+ Buat Daftar Hadir</span>
              </PrimaryBtn>

              {/* Bulk actions */}
              {selectedIds.size > 0 && (
                <button
                  onClick={() => {
                    const first = records.find((r) => selectedIds.has(r.id));
                    if (first) exportRecordToExcel(first);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex-shrink-0"
                >
                  {Ico.download("w-3.5 h-3.5 text-white")}
                  <span>Export Excel ({selectedIds.size})</span>
                </button>
              )}

              {selectedIds.size > 0 && (
                <button
                  onClick={() => {
                    const first = records.find((r) => selectedIds.has(r.id));
                    if (first) exportRecordToPdf(first);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors cursor-pointer flex-shrink-0"
                >
                  {Ico.download("w-3.5 h-3.5 text-white")}
                  <span>Save PDF ({selectedIds.size})</span>
                </button>
              )}
            </div>
          }
          right={
            <TableControls
              search={search}
              onSearch={(v) => { setSearch(v); setPage(1); }}
              pageSize={pageSize}
              onPageSize={(v) => { setPageSize(v); setPage(1); }}
            />
          }
        />

        {/* ── DATA TABLE ── */}
        <DataTable
          headers={TABLE_HEADERS}
          shownEntries={currentData.length}
          totalEntries={filtered.length}
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          showLeadingColumn
          leadingHeader={
            <input
              type="checkbox"
              title="Pilih semua"
              checked={currentData.length > 0 && currentData.every((r) => selectedIds.has(r.id))}
              onChange={toggleSelectAll}
            />
          }
        >
          {currentData.map((row) => (
            <tr
              key={row.id}
              className="tr-hover cursor-pointer"
              onClick={() => setViewTarget(row)}
            >
              <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  onChange={() => toggleSelect(row.id)}
                />
              </td>

              {/* No. Dokumen */}
              <Td>
                <span className="font-mono text-gray-700 font-semibold">{row.nomor_dokumen}</span>
              </Td>

              {/* Tgl Acara */}
              <Td>
                <span className="whitespace-nowrap">{row.agenda.hariTanggal}</span>
              </Td>

              {/* Tgl Input */}
              <Td>
                <span className="whitespace-nowrap text-gray-500">{row.created_at.substring(0, 10)}</span>
              </Td>

              {/* Admin */}
              <Td>
                <span className="font-semibold whitespace-nowrap text-brand-600">
                  {formatAdminName(row.admin_username)}
                </span>
              </Td>

              {/* Agenda */}
              <Td>
                <span className="block max-w-[200px] truncate font-medium text-gray-900" title={row.agenda.namaAgenda}>
                  {row.agenda.namaAgenda}
                </span>
              </Td>

              {/* Tempat */}
              <Td>
                <span className="block max-w-[160px] truncate text-gray-600" title={row.agenda.tempat}>
                  {row.agenda.tempat}
                </span>
              </Td>

              {/* Total Peserta */}
              <Td>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-[#8B1E1E]">
                  {row.peserta.length} Orang
                </span>
              </Td>

              {/* Aksi */}
              <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1 justify-center">
                  {/* View Document */}
                  <button
                    onClick={() => setViewTarget(row)}
                    title="Lihat Pratinjau Dokumen"
                    className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    {Ico.eye("w-3.5 h-3.5")}
                  </button>

                  {/* Excel */}
                  <button
                    onClick={() => exportRecordToExcel(row)}
                    title="Unduh Excel (.xlsx)"
                    className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    {Ico.download("w-3.5 h-3.5 text-emerald-600")}
                  </button>

                  {/* PDF */}
                  <button
                    onClick={() => exportRecordToPdf(row)}
                    title="Unduh PDF (.pdf)"
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    {Ico.receipt ? Ico.receipt("w-3.5 h-3.5 text-red-600") : Ico.download("w-3.5 h-3.5 text-red-600")}
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => openDuplicateModal(row)}
                    title="Duplikat Daftar Hadir"
                    className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    {Ico.copy("w-3.5 h-3.5")}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(row)}
                    title="Edit Daftar Hadir"
                    className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                  >
                    {Ico.edit("w-3.5 h-3.5")}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(row)}
                    title="Hapus Daftar Hadir"
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    {Ico.trash("w-3.5 h-3.5")}
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {currentData.length === 0 && (
            <tr>
              <td colSpan={TABLE_HEADERS.length + 1} className="px-4 py-12 text-center text-sm text-gray-400">
                {search ? `Tidak ada data yang cocok dengan "${search}".` : "Belum ada riwayat daftar hadir."}
              </td>
            </tr>
          )}
        </DataTable>
      </Card>

      {/* ── CREATE / EDIT / DUPLICATE MODAL ── */}
      {isFormOpen && (
        <Modal
          onClose={() => setIsFormOpen(false)}
          title={
            editingId
              ? "Edit Data Daftar Hadir"
              : isDuplicate
              ? "Duplikat Data Daftar Hadir"
              : "Buat Daftar Hadir Baru"
          }
          wide
        >
          <div className="space-y-6 pt-2 pb-2">
            {isDuplicate && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2">
                <span className="font-bold">Mode Duplikat:</span>
                <span>Data agenda dan peserta telah disalin. Anda dapat mengubah tanggal, jam, atau nama agenda.</span>
              </div>
            )}

            {/* Grid 2 Kolom: Kiri Agenda, Kanan Bulk Paste */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Kolom Kiri: Form Agenda */}
              <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    1. Informasi Agenda Kegiatan
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setFormAgenda(DEFAULT_AGENDA);
                      setFormBulkText(DEFAULT_NAMES_TEXT);
                    }}
                    className="text-[11px] text-[#8B1E1E] hover:underline font-semibold cursor-pointer"
                  >
                    Contoh Template
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                    Hari & Tanggal Kegiatan
                  </label>
                  <input
                    type="text"
                    value={formAgenda.hariTanggal}
                    onChange={(e) => setFormAgenda({ ...formAgenda, hariTanggal: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1E1E]"
                    placeholder="Contoh: Jumat, 15 Oktober 2026"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                    Nama Agenda / Kegiatan
                  </label>
                  <input
                    type="text"
                    value={formAgenda.namaAgenda}
                    onChange={(e) => setFormAgenda({ ...formAgenda, namaAgenda: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1E1E]"
                    placeholder="Contoh: Rapat Koordinasi..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                    Tempat Kegiatan
                  </label>
                  <input
                    type="text"
                    value={formAgenda.tempat}
                    onChange={(e) => setFormAgenda({ ...formAgenda, tempat: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1E1E]"
                    placeholder="Contoh: Ruang Rapat SDM Lantai 2 Gedung E"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Waktu Mulai</label>
                    <input
                      type="text"
                      value={formAgenda.waktuMulai}
                      onChange={(e) => handleTimeChange("waktuMulai", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 bg-white"
                      placeholder="08.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Waktu Selesai</label>
                    <input
                      type="text"
                      value={formAgenda.waktuSelesai}
                      onChange={(e) => handleTimeChange("waktuSelesai", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 bg-white"
                      placeholder="13.00 WIB"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                    Teks Waktu di Dokumen
                  </label>
                  <input
                    type="text"
                    value={formAgenda.waktu}
                    onChange={(e) => setFormAgenda({ ...formAgenda, waktu: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-gray-100"
                  />
                </div>

                {/* Collapsible Kop Settings */}
                <div className="pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowKopSettings(!showKopSettings)}
                    className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 cursor-pointer flex justify-between w-full"
                  >
                    <span>Pengaturan No. Formulir Kop (Opsional)</span>
                    <span>{showKopSettings ? "▲" : "▼"}</span>
                  </button>

                  {showKopSettings && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200 text-[10px]">
                      <div>
                        <span className="block text-gray-500 mb-0.5">No. Formulir:</span>
                        <input
                          type="text"
                          value={formAgenda.noFormulir || ""}
                          onChange={(e) => setFormAgenda({ ...formAgenda, noFormulir: e.target.value })}
                          className="w-full border rounded px-1.5 py-1 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-gray-500 mb-0.5">Revisi:</span>
                        <input
                          type="text"
                          value={formAgenda.revisi || ""}
                          onChange={(e) => setFormAgenda({ ...formAgenda, revisi: e.target.value })}
                          className="w-full border rounded px-1.5 py-1 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-gray-500 mb-0.5">Berlaku Efektif:</span>
                        <input
                          type="text"
                          value={formAgenda.berlakuEfektif || ""}
                          onChange={(e) => setFormAgenda({ ...formAgenda, berlakuEfektif: e.target.value })}
                          className="w-full border rounded px-1.5 py-1 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-gray-500 mb-0.5">Hal:</span>
                        <input
                          type="text"
                          value={formAgenda.hal || ""}
                          onChange={(e) => setFormAgenda({ ...formAgenda, hal: e.target.value })}
                          className="w-full border rounded px-1.5 py-1 bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Bulk Paste Textarea */}
              <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-2">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      2. Tempel Nama Peserta (Bulk Paste)
                    </h4>
                    <span className="text-[11px] text-gray-500 font-mono">1 baris = 1 nama</span>
                  </div>

                  <textarea
                    rows={10}
                    value={formBulkText}
                    onChange={(e) => setFormBulkText(e.target.value)}
                    placeholder="Tempel nama peserta di sini (dari Excel, Word, atau teks)..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1E1E] leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                    <span>* Penulisan huruf kapital/kecil asli dipertahankan.</span>
                    <span className="font-semibold text-gray-600">
                      {formBulkText.split(/\r?\n/).filter((l) => l.trim()).length} baris nama
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProcessBulkNames}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm cursor-pointer"
                    style={{ background: color.brand }}
                  >
                    {Ico.check("w-3.5 h-3.5 text-white")}
                    <span>Proses & Masukkan ke Tabel</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Bagian Bawah: Tabel Review Peserta */}
            <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    3. Tinjau & Edit Peserta ({formPeserta.length} Orang)
                  </h4>
                  <span className="text-[11px] text-gray-400">| Anda dapat mengedit nama atau waktu di tabel</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateTimes}
                    className="px-2.5 py-1 text-[11px] font-semibold border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    Acak Ulang Waktu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const dateStr = extractDateStr(formAgenda.hariTanggal);
                      const startTime = formAgenda.waktuMulai || "08.00";
                      const n = formPeserta.length + 1;
                      setFormPeserta([
                        ...formPeserta,
                        {
                          id: `p-new-${Date.now()}`,
                          nomor: n,
                          nama: "",
                          tanggalCheckin: generateCheckinTime(dateStr, startTime, n - 1, n),
                          status: "CheckIn",
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    + Tambah Baris
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3 w-14 text-center border-r border-gray-200">No</th>
                      <th className="py-2 px-3 border-r border-gray-200">Nama Peserta</th>
                      <th className="py-2 px-3 w-56 border-r border-gray-200 text-center">Tanggal Check-in</th>
                      <th className="py-2 px-3 w-28 border-r border-gray-200 text-center">Status</th>
                      <th className="py-2 px-2 w-12 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {formPeserta.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">
                          Belum ada peserta. Silakan klik "Proses & Masukkan ke Tabel" di atas.
                        </td>
                      </tr>
                    ) : (
                      formPeserta.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="py-1.5 px-3 text-center border-r border-gray-100 text-gray-500 font-semibold">
                            {p.nomor}
                          </td>
                          <td className="py-1 px-2 border-r border-gray-100">
                            <input
                              type="text"
                              value={p.nama}
                              onChange={(e) => {
                                const updated = [...formPeserta];
                                updated[idx].nama = e.target.value;
                                setFormPeserta(updated);
                              }}
                              className="w-full px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] rounded text-xs"
                              placeholder="Nama peserta..."
                              style={{ fontFamily: "Cambria, Georgia, serif" }}
                            />
                          </td>
                          <td className="py-1 px-2 border-r border-gray-100 text-center">
                            <input
                              type="text"
                              value={p.tanggalCheckin}
                              onChange={(e) => {
                                const updated = [...formPeserta];
                                updated[idx].tanggalCheckin = e.target.value;
                                setFormPeserta(updated);
                              }}
                              className="w-full px-1.5 py-0.5 text-center border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] rounded text-xs"
                            />
                          </td>
                          <td className="py-1 px-2 border-r border-gray-100 text-center">
                            <input
                              type="text"
                              value={p.status}
                              onChange={(e) => {
                                const updated = [...formPeserta];
                                updated[idx].status = e.target.value;
                                setFormPeserta(updated);
                              }}
                              className="w-full px-1.5 py-0.5 text-center text-emerald-700 font-semibold border border-transparent hover:border-gray-300 focus:border-[#8B1E1E] rounded text-xs"
                            />
                          </td>
                          <td className="py-1 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = formPeserta.filter((_, i) => i !== idx);
                                setFormPeserta(filtered.map((item, i) => ({ ...item, nomor: i + 1 })));
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded cursor-pointer"
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
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Total <strong>{formPeserta.length}</strong> peserta terdaftar.
              </span>

              <div className="flex items-center gap-2">
                <OutlineBtn onClick={() => setIsFormOpen(false)}>
                  Batal
                </OutlineBtn>

                <PrimaryBtn onClick={handleSaveForm} className="flex items-center gap-1.5 px-5">
                  {Ico.check("w-3.5 h-3.5 text-white")}
                  <span>Simpan Data</span>
                </PrimaryBtn>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── VIEW / DOCUMENT PREVIEW MODAL ── */}
      {viewTarget && (
        <Modal
          onClose={() => setViewTarget(null)}
          title={`Pratinjau Dokumen - ${viewTarget.agenda.namaAgenda || "Daftar Hadir"}`}
          wide
        >
          <div className="space-y-4 pt-2 pb-2">
            <div className="flex flex-wrap items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 gap-2">
              <div className="text-xs text-gray-600">
                Dokumen No. <strong>{viewTarget.nomor_dokumen}</strong> | {viewTarget.peserta.length} Peserta
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportRecordToExcel(viewTarget)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
                >
                  {Ico.download("w-3.5 h-3.5 text-white")}
                  <span>Download Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => exportRecordToPdf(viewTarget)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer"
                  style={{ background: color.brand }}
                >
                  {Ico.download("w-3.5 h-3.5 text-white")}
                  <span>Download PDF (.pdf)</span>
                </button>

                <button
                  onClick={() => pdfService.printDaftarHadirPdf({
                    agenda: viewTarget.agenda,
                    peserta: viewTarget.peserta,
                    isSimulation: viewTarget.isSimulation ?? true,
                  })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors cursor-pointer"
                >
                  {Ico.print("w-3.5 h-3.5 text-gray-700")}
                  <span>Cetak</span>
                </button>
              </div>
            </div>

            {/* A4 Paper Preview */}
            <div className="bg-gray-200 p-4 sm:p-6 rounded-xl flex justify-center overflow-x-auto max-h-[70vh]">
              <div
                className="bg-white shadow-xl border border-gray-300 p-6 sm:p-8 w-[720px] min-h-[950px] text-black text-xs"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                {/* ── KOP SURAT ── */}
                <div className="border border-black mb-3">
                  <div className="grid grid-cols-12">
                    <div className="col-span-3 border-r border-black p-2 flex items-center justify-center">
                      <img
                        src={excelLogoBase64}
                        alt="Universitas Telkom"
                        className="max-h-14 w-auto object-contain"
                      />
                    </div>
                    <div className="col-span-5 border-r border-black flex flex-col justify-between">
                      <div className="p-1.5 border-b border-black font-bold text-xs tracking-wide">
                        UNIVERSITAS TELKOM
                      </div>
                      <div className="p-1.5 border-b border-black text-[10px] leading-tight flex-1 flex items-center">
                        Jl. Telekomunikasi No. 1 Terusan Buah Batu Bandung 40257
                      </div>
                      <div className="p-1.5 font-bold text-[11px] tracking-wide">
                        Daftar Hadir
                      </div>
                    </div>
                    <div className="col-span-4 flex flex-col justify-between text-[11px]">
                      <div className="grid grid-cols-2 border-b border-black min-h-[20px] items-center">
                        <span className="border-r border-black px-1.5 py-0.5">No. Formulir</span>
                        <span className="px-1.5 py-0.5 text-center">{viewTarget.agenda.noFormulir || ""}</span>
                      </div>
                      <div className="grid grid-cols-2 border-b border-black min-h-[20px] items-center">
                        <span className="border-r border-black px-1.5 py-0.5">Revisi</span>
                        <span className="px-1.5 py-0.5 text-center">{viewTarget.agenda.revisi || ""}</span>
                      </div>
                      <div className="grid grid-cols-2 border-b border-black min-h-[20px] items-center">
                        <span className="border-r border-black px-1.5 py-0.5">Berlaku Efektif</span>
                        <span className="px-1.5 py-0.5 text-center">{viewTarget.agenda.berlakuEfektif || ""}</span>
                      </div>
                      <div className="grid grid-cols-2 min-h-[20px] items-center">
                        <span className="border-r border-black px-1.5 py-0.5">Hal</span>
                        <span className="px-1.5 py-0.5 text-center">{viewTarget.agenda.hal || ""}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── AGENDA ── */}
                <div className="border border-black mb-3 text-xs leading-normal">
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-3 border-r border-black px-2.5 py-1">Hari, Tanggal</div>
                    <div className="col-span-9 px-2.5 py-1">{viewTarget.agenda.hariTanggal}</div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-3 border-r border-black px-2.5 py-1">Agenda</div>
                    <div className="col-span-9 px-2.5 py-1">{viewTarget.agenda.namaAgenda}</div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-3 border-r border-black px-2.5 py-1">Tempat</div>
                    <div className="col-span-9 px-2.5 py-1">{viewTarget.agenda.tempat}</div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-3 border-r border-black px-2.5 py-1">Waktu</div>
                    <div className="col-span-9 px-2.5 py-1">{viewTarget.agenda.waktu}</div>
                  </div>
                </div>

                {/* ── TABLE ── */}
                <div className="border border-black text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-black font-bold">
                        <th className="border-r border-black py-1 px-2 text-center w-[10%]">Nomor</th>
                        <th className="border-r border-black py-1 px-3 text-center w-[48%]">Nama</th>
                        <th className="border-r border-black py-1 px-2 text-center w-[27%]">Tanggal Check-in</th>
                        <th className="py-1 px-2 text-center w-[15%]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewTarget.peserta.map((p) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <Modal
          onClose={() => setDeleteTarget(null)}
          title="Konfirmasi Hapus"
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">
              Apakah Anda yakin ingin menghapus data daftar hadir nomor{" "}
              <strong className="text-gray-900 font-mono">{deleteTarget.nomor_dokumen}</strong> (
              <em>{deleteTarget.agenda.namaAgenda}</em>)?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <OutlineBtn onClick={() => setDeleteTarget(null)}>Batal</OutlineBtn>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DaftarHadirPage;
