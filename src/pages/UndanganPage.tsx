import React, { useState, useEffect, lazy, Suspense } from "react";
import { tokens } from "../styles/tokens";
import { Ico } from "../utils/icons";
import { formatAdminName, formatDocumentNumber, formatDateFullIndo } from "../utils/formatters";
import {
  PageHeader, Card, PrimaryBtn, OutlineBtn, Modal, FormField,
  CardToolbar, TableControls, DataTable, Td,
} from "../components/ui";
import { undanganService, pdfService } from "../services";
import { useAuth } from "../contexts/AuthContext";
import type { DataUndanganView, CreateFormulirUndanganInput } from "../types";

const { color } = tokens;

const PdfPreview = lazy(() => import("../components/PdfPreview"));

const HEADERS = [
  "No. Undangan",
  "Tgl Acara",
  "Tgl Input",
  "Admin",
  "Acara",
  "Tempat",
  "Aksi",
];

const EMPTY_FORM: CreateFormulirUndanganInput = {
  acara: "",
  penyelenggara: "Kabag Bang SDM",
  tanggal_acara: "",
  waktu_mulai: "",
  waktu_selesai: "",
  tempat_acara: "Ruang Rapat SDM Lantai 2 Gedung E. Kultubai Utara",
  agenda: "",
  peserta: "Kabag Bang SDM, Tim Bang Karir",
  dokumen_pendukung: "",
  hasil_pertemuan: "",
  tembusan: "",
  tempat_surat: "",
  tanggal_surat: "",
  nama_ttd: "",
  jabatan_ttd: "",
};

export default function UndanganPage() {
  const { currentAdmin } = useAuth();
  
  // Data state
  const [rows, setRows] = useState<DataUndanganView[]>([]);
  const [loading, setLoading] = useState(true);

  // Table controls
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateFormulirUndanganInput>(EMPTY_FORM);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DataUndanganView | null>(null);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentData.map(r => r.id_formulir_undangan)));
    }
  };

  const selectedRows = rows.filter(r => selectedIds.has(r.id_formulir_undangan));

  const handleBulkDownload = async () => {
    if (selectedRows.length === 0) return;
    await pdfService.downloadMultipleUndanganPdf(selectedRows);
  };

  const handleBulkPrint = async () => {
    if (selectedRows.length === 0) return;
    await pdfService.printMultipleUndanganPdf(selectedRows);
  };

  // View modal state
  const [viewTarget, setViewTarget] = useState<DataUndanganView | null>(null);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await undanganService.getAll();
      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter & pagination
  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return [r.acara, r.tempat_acara, r.penyelenggara].some((v) => v?.toLowerCase().includes(q));
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handlePageSize = (v: number) => { setPageSize(v); setPage(1); };

  // Form handlers
  const openCreate = () => {
    setFormError("");
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      nama_ttd: localStorage.getItem("mykwitansi_undangan_nama_ttd") || "",
      jabatan_ttd: localStorage.getItem("mykwitansi_undangan_jabatan_ttd") || "",
      tempat_surat: "Bandung"
    });
    setIsFormOpen(true);
  };

  const openEdit = (row: DataUndanganView) => {
    setFormError("");
    setEditingId(row.id_formulir_undangan);
    setFormData({
      ...row
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.acara || !formData.tanggal_acara || !formData.waktu_mulai || !formData.waktu_selesai || !formData.tempat_acara) {
      const msg = "Kolom Acara, Tanggal, Waktu Mulai, Waktu Selesai, dan Tempat wajib diisi!";
      setFormError(msg);
      alert(msg);
      return;
    }
    
    if (formData.waktu_selesai < formData.waktu_mulai) {
      const msg = "Waktu selesai tidak boleh lebih awal dari waktu mulai!";
      setFormError(msg);
      alert(msg);
      return;
    }
    
    if (!currentAdmin?.id_admin) {
      const msg = "Anda harus login untuk menyimpan data!";
      setFormError(msg);
      alert(msg);
      return;
    }
    
    try {
      if (editingId) {
        await undanganService.update(editingId, formData, currentAdmin.id_admin);
      } else {
        await undanganService.create(formData, currentAdmin.id_admin);
      }
      
      localStorage.setItem("mykwitansi_undangan_nama_ttd", formData.nama_ttd);
      localStorage.setItem("mykwitansi_undangan_jabatan_ttd", formData.jabatan_ttd);
      
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data");
    }
  };

  const fillDummyData = () => {
    setFormData({
      ...formData,
      acara: "Rapat Koordinasi Tim Pengembang",
      penyelenggara: "Bagian IT Telkom University",
      tanggal_acara: new Date().toISOString().substring(0, 10),
      waktu_mulai: "09:00",
      waktu_selesai: "11:30",
      tempat_acara: "Ruang Rapat Gedung Tokong Nanas",
      agenda: "Membahas progres migrasi server dan pembaruan UI aplikasi internal",
      peserta: "Seluruh Anggota Tim IT, Manajer Proyek",
      dokumen_pendukung: "Laporan Sprint 4",
      hasil_pertemuan: "-",
      tembusan: "Direktur IT",
      tempat_surat: "Bandung",
      tanggal_surat: new Date().toISOString().substring(0, 10),
    });
  };

  // Delete handlers
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await undanganService.delete(deleteTarget.id_formulir_undangan);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data.");
    }
  };

  const openDelete = (row: DataUndanganView) => {
    setDeleteTarget(row);
    setIsDeleteOpen(true);
  };

  const handleDownloadPdf = async () => {
    if (!viewTarget) return;
    await pdfService.downloadUndanganPdf(viewTarget);
  };

  return (
    <div>
      <PageHeader
        title="Data Undangan"
        subtitle="Kelola semua data surat undangan"
      />

      <Card className="p-5">
        <CardToolbar
          left={
            <div className="flex flex-wrap gap-2">
              <PrimaryBtn onClick={openCreate} className="flex-shrink-0">
                {Ico.plus()} <span className="hidden sm:inline">Buat </span>Undangan
              </PrimaryBtn>
              
              <div className="hidden md:block flex-shrink-0">
                <PrimaryBtn onClick={handleBulkPrint} disabled={selectedIds.size === 0} className="flex-shrink-0">
                  {Ico.print()} Print{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                </PrimaryBtn>
              </div>
              <div className="block md:hidden flex-shrink-0">
                <PrimaryBtn disabled={true} className="opacity-50 cursor-not-allowed flex-shrink-0">
                  {Ico.print()} Print{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                </PrimaryBtn>
              </div>

              <PrimaryBtn 
                onClick={handleBulkDownload}
                disabled={selectedIds.size === 0}
                className="!bg-blue-400 hover:!bg-blue-500 !border-blue-400 text-white flex-shrink-0"
              >
                {Ico.download()} Save PDF{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </PrimaryBtn>
            </div>
          }
          right={
            <TableControls
              search={search}
              onSearch={handleSearch}
              pageSize={pageSize}
              onPageSize={handlePageSize}
            />
          }
        />

        <DataTable
          headers={HEADERS}
          shownEntries={currentData.length}
          totalEntries={filtered.length}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          showLeadingColumn
          leadingHeader={
            <input
              type="checkbox"
              title="Pilih semua"
              checked={currentData.length > 0 && currentData.every((n) => selectedIds.has(n.id_formulir_undangan))}
              onChange={toggleSelectAll}
            />
          }
        >
          {currentData.map((row, index) => {
            const visualId = filtered.length - ((page - 1) * pageSize + index);
            return (
            <tr 
              key={row.id_formulir_undangan} 
              className="tr-hover cursor-pointer"
              onClick={() => setViewTarget(row)}
            >
              <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id_formulir_undangan)}
                  onChange={() => toggleSelect(row.id_formulir_undangan)}
                />
              </td>
              <Td><span className="whitespace-nowrap">{formatDocumentNumber(visualId)}</span></Td>
              <Td><span className="whitespace-nowrap">{row.tanggal_acara.includes("-") ? formatDateFullIndo(row.tanggal_acara) : row.tanggal_acara}</span></Td>
              <Td><span className="whitespace-nowrap">{row.tanggal_input.substring(0, 10)}</span></Td>
              <Td>
                <span className={`font-semibold whitespace-nowrap ${row.admin_username === "Bang Karir" ? "text-brand-600" : "text-brand-800"}`}>
                  {formatAdminName(row.admin_username)}
                </span>
              </Td>
              <Td>
                <span className="block max-w-[150px] truncate" title={row.acara}>{row.acara}</span>
              </Td>
              <Td>
                <span className="block max-w-[130px] truncate" title={row.tempat_acara}>{row.tempat_acara}</span>
              </Td>
              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                <div className="flex items-center gap-1.5 justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewTarget(row); }}
                    title="Lihat Undangan"
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-xs font-semibold
                      border transition-colors duration-100"
                    style={{ color: "#374151", borderColor: "#e5e7eb", background: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {Ico.receipt()}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                    title="Edit Undangan"
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-xs font-semibold
                      border transition-colors duration-100"
                    style={{ color: color.brand, borderColor: color.brand, background: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = color.brandSoft; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {Ico.edit()}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDelete(row); }}
                    title="Hapus Undangan"
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-xs font-semibold
                      border border-red-200 text-red-600 bg-transparent transition-colors duration-100
                      hover:bg-red-50"
                  >
                    {Ico.trash()}
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
          {currentData.length === 0 && (
            <tr>
              <td colSpan={HEADERS.length} className="px-4 py-10 text-center text-sm text-gray-400">
                {search ? `Tidak ada hasil untuk "${search}".` : "Belum ada data undangan."}
              </td>
            </tr>
          )}
        </DataTable>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (
        <Modal
          onClose={() => setIsFormOpen(false)}
          title={editingId ? "Edit Undangan" : "Tambah Undangan"}
          wide
        >
          <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Acara" value={formData.acara} onChange={(val) => setFormData({ ...formData, acara: val })} error={formError && !formData.acara ? "Wajib diisi" : undefined} />
            <FormField label="Penyelenggara" value={formData.penyelenggara} onChange={(val) => setFormData({ ...formData, penyelenggara: val })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Hari/Tanggal Acara" type="date" value={formData.tanggal_acara.includes("-") ? formData.tanggal_acara : ""} onChange={(val) => setFormData({ ...formData, tanggal_acara: val })} error={formError && !formData.tanggal_acara ? "Wajib diisi" : undefined} />
            <FormField label="Waktu Mulai" type="time" value={formData.waktu_mulai} onChange={(val) => setFormData({ ...formData, waktu_mulai: val })} />
            <FormField label="Waktu Selesai" type="time" value={formData.waktu_selesai} onChange={(val) => setFormData({ ...formData, waktu_selesai: val })} />
          </div>
          
          <FormField label="Tempat" value={formData.tempat_acara} onChange={(val) => setFormData({ ...formData, tempat_acara: val })} />

          <FormField label="Agenda" type="textarea" value={formData.agenda} onChange={(val) => setFormData({ ...formData, agenda: val })} />

          <FormField label="Peserta" type="textarea" value={formData.peserta} onChange={(val) => setFormData({ ...formData, peserta: val })} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Dokumen Pendukung" value={formData.dokumen_pendukung} onChange={(val) => setFormData({ ...formData, dokumen_pendukung: val })} />
            <FormField label="Hasil Pertemuan" value={formData.hasil_pertemuan} onChange={(val) => setFormData({ ...formData, hasil_pertemuan: val })} />
          </div>

          <FormField label="Tembusan" value={formData.tembusan} onChange={(val) => setFormData({ ...formData, tembusan: val })} />

          <div className="border-t border-gray-100 pt-4 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Tempat Surat" value={formData.tempat_surat} onChange={(val) => setFormData({ ...formData, tempat_surat: val })} placeholder="Contoh: Bandung" />
            <FormField label="Tanggal Surat" type="date" value={formData.tanggal_surat.includes("-") ? formData.tanggal_surat : ""} onChange={(val) => setFormData({ ...formData, tanggal_surat: val })} />
            <FormField label="Nama TTD" value={formData.nama_ttd} onChange={(val) => setFormData({ ...formData, nama_ttd: val })} />
            <FormField label="Jabatan TTD" value={formData.jabatan_ttd} onChange={(val) => setFormData({ ...formData, jabatan_ttd: val })} />
          </div>

          {formError && (
            <div className="text-red-500 text-sm font-medium">{formError}</div>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              onClick={fillDummyData}
              className="px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded transition-colors"
            >
              Isi Dummy Data
            </button>
            <div className="flex gap-3">
              <OutlineBtn onClick={() => setIsFormOpen(false)}>Batal</OutlineBtn>
              <PrimaryBtn onClick={handleFormSubmit}>
                {editingId ? "Simpan Perubahan" : "Simpan Data"}
              </PrimaryBtn>
            </div>
          </div>
        </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {isDeleteOpen && (
        <Modal
          onClose={() => setIsDeleteOpen(false)}
          title="Hapus Undangan"
        >
          <div className="py-4">
          <p className="text-gray-600 mb-6">
            Apakah Anda yakin ingin menghapus data undangan ini?
          </p>
          <div className="flex justify-end gap-3">
            <OutlineBtn onClick={() => setIsDeleteOpen(false)}>Batal</OutlineBtn>
            <button
              onClick={confirmDelete}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
        </Modal>
      )}

      {/* VIEW / PREVIEW MODAL */}
      {!!viewTarget && (
        <Modal
          onClose={() => setViewTarget(null)}
          title="Preview Undangan"
          wide
        >
          <div className="h-[75vh] mt-4 flex flex-col">
            <div className="flex-1 border border-gray-200">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500">Memuat Preview PDF...</div>}>
                <PdfPreview data={viewTarget} />
              </Suspense>
            </div>
            
            <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
              <OutlineBtn onClick={() => setViewTarget(null)}>Tutup</OutlineBtn>
              <OutlineBtn onClick={handleDownloadPdf}>
                {Ico.download()} Download PDF
              </OutlineBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
