/**
 * TransaksiPage — protected route (/transaksi).
 *
 * Full CRUD:
 *   Create  — "Tambah Transaksi" button opens a validated form modal.
 *   Read    — table reflects live service state; re-fetches after every mutation.
 *   Update  — row action "Edit" opens the same form pre-filled.
 *   Delete  — row action "Hapus" opens a confirmation modal before deleting.
 *
 * Search — client-side against the current rows state (re-applied after mutations).
 * Show entries — controlled pageSize state slices the filtered list.
 *
 * Business/data logic stays in transactionService.
 * This component manages UI state only.
 */
import { useState, useEffect } from "react";
import { tokens } from "../styles/tokens";
import { Ico } from "../utils/icons";
import { formatRp, formatAdminName, formatDocumentNumber, formatCurrencyInput, parseCurrencyInput, formatDateInput, terbilang, formatDateNoDay } from "../utils/formatters";
import {
  PageHeader, Card, PrimaryBtn, OutlineBtn, Modal, FormField,
  CardToolbar, TableControls, DataTable, Td,
} from "../components/ui";
import { transactionService, printService, pdfService } from "../services";
import { useAuth } from "../contexts/AuthContext";
import type { DataTransaksiView, CreateFormulirTransaksiInput } from "../types";

const { color } = tokens;

const HEADERS = [
  "No. Transaksi",
  "Tgl Transaksi",
  "Tgl Input",
  "Admin",
  "Terima Dari",
  "Jumlah Uang",
  "Untuk Pembayaran",
  "Aksi",
];

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM: CreateFormulirTransaksiInput = {
  tanggal_transaksi: "",
  terima_dari:       "Universitas Telkom",
  jumlah_uang:       0,
  untuk_pembayaran:  "",
  penerima_uang:     "Toufan Tambunan",
  kota:              "Bandung",
  total_harga:       0,
};

// ─── Field-level validation errors type ──────────────────────────────────────

type FormErrors = Partial<Record<keyof CreateFormulirTransaksiInput, string>>;

// ─── Component ───────────────────────────────────────────────────────────────

interface TransaksiPageProps {
  onToast: (message: string) => void;
}

export function TransaksiPage({ onToast }: TransaksiPageProps) {
  const { currentAdmin } = useAuth();
  const adminId          = currentAdmin?.id_admin ?? 0;

  // ── Data state ─────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<DataTransaksiView[]>([]);

  // ── Search & pagination ────────────────────────────────────────────────────
  const [search,      setSearch]      = useState("");
  const [pageSize,    setPageSize]    = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Create / Edit form modal ───────────────────────────────────────────────
  const [formMode,   setFormMode]   = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<DataTransaksiView | null>(null);
  const [form,       setForm]       = useState<CreateFormulirTransaksiInput>(EMPTY_FORM);
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [saving,     setSaving]     = useState(false);

  // ── Delete confirmation modal ──────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<DataTransaksiView | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── View modal ─────────────────────────────────────────────────────────────
  const [viewTarget, setViewTarget] = useState<DataTransaksiView | null>(null);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    transactionService.getAll().then(setRows);
  }, []);

  // ── Pagination helpers ────────────────────────────────────────────────────
  function handleSearch(v: string) { setSearch(v); setCurrentPage(1); }
  function handlePageSize(v: number) { setPageSize(v); setCurrentPage(1); }

  // ── Derived: search → paginate ────────────────────────────────────────────
  const filtered   = rows.filter((t) =>
    [t.admin_username, t.terima_dari, t.untuk_pembayaran].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paged      = filtered.slice(startIndex, startIndex + pageSize);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setField<K extends keyof CreateFormulirTransaksiInput>(
    key: K, value: CreateFormulirTransaksiInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // clear the error for this field as soon as the user edits it
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditTarget(null);
    setFormMode("create");
  }

  function openEdit(row: DataTransaksiView) {
    setForm({
      tanggal_transaksi: row.tanggal_transaksi,
      terima_dari:       row.terima_dari,
      jumlah_uang:       row.jumlah_uang,
      untuk_pembayaran:  row.untuk_pembayaran,
      penerima_uang:     row.penerima_uang,
      kota:              row.kota,
      total_harga:       row.total_harga,
    });
    setErrors({});
    setEditTarget(row);
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode(null);
    setEditTarget(null);
    setErrors({});
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: FormErrors = {};

    if (!form.tanggal_transaksi.trim())
      e.tanggal_transaksi = "Tanggal transaksi wajib diisi.";

    if (!form.terima_dari.trim())
      e.terima_dari = "Terima dari wajib diisi.";

    if (!form.jumlah_uang || isNaN(form.jumlah_uang) || form.jumlah_uang <= 0)
      e.jumlah_uang = "Jumlah uang harus berupa angka lebih dari 0.";

    if (!form.untuk_pembayaran.trim())
      e.untuk_pembayaran = "Untuk pembayaran wajib diisi.";

    if (!form.penerima_uang.trim())
      e.penerima_uang = "Penerima uang wajib diisi.";

    if (!form.kota.trim())
      e.kota = "Kota wajib diisi.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── CRUD handlers ──────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (saving || !validate()) return;
    setSaving(true);
    try {
      if (formMode === "create") {
        await transactionService.create(form, adminId);
        onToast("Data transaksi berhasil ditambahkan.");
      } else if (formMode === "edit" && editTarget) {
        await transactionService.update(editTarget.id_data_transaksi, form, adminId);
        onToast("Data transaksi berhasil diperbarui.");
      }
      const updated = await transactionService.getAll();
      setRows(updated);
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await transactionService.delete(deleteTarget.id_data_transaksi);
      const updated = await transactionService.getAll();
      setRows(updated);
      // Clamp page if the deletion emptied the current page
      const newFiltered = updated.filter((t) =>
        [t.admin_username, t.terima_dari, t.untuk_pembayaran].some((v) =>
          v.toLowerCase().includes(search.toLowerCase())
        )
      );
      const newTotalPages = Math.max(1, Math.ceil(newFiltered.length / pageSize));
      setCurrentPage((p) => Math.min(p, newTotalPages));
      onToast("Data transaksi berhasil dihapus.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader title="Data Transaksi" subtitle="Kelola semua data transaksi pembayaran" />

      <Card className="p-5">
        <CardToolbar
          left={
            <PrimaryBtn onClick={openCreate}>
              {Ico.plus()} Tambah Transaksi
            </PrimaryBtn>
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
          shownEntries={paged.length}
          totalEntries={filtered.length}
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        >
          {paged.map((t) => (
            <tr key={t.id_data_transaksi} className="tr-hover">
              <Td>{formatDocumentNumber(t.id_data_transaksi)}</Td>
              <Td>{t.tanggal_transaksi}</Td>
              <Td>{formatDateInput(t.tanggal_input)}</Td>
              <Td accent>{formatAdminName(t.admin_username)}</Td>
              <Td>{t.terima_dari}</Td>
              <Td mono>{formatCurrencyInput(String(t.jumlah_uang))}</Td>
              <Td>{t.untuk_pembayaran}</Td>
              {/* ── Row actions ── */}
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <div className="flex items-center gap-1.5 justify-center">
                  <button
                    onClick={() => setViewTarget(t)}
                    title="Lihat transaksi"
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-xs font-semibold
                      border transition-colors duration-100"
                    style={{ color: "#374151", borderColor: "#e5e7eb", background: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {Ico.receipt()}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    title="Edit transaksi"
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-xs font-semibold
                      border transition-colors duration-100"
                    style={{ color: color.brand, borderColor: color.brand, background: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = color.brandSoft; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {Ico.edit()}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    title="Hapus transaksi"
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-xs font-semibold
                      border border-red-200 text-red-600 bg-transparent transition-colors duration-100
                      hover:bg-red-50"
                  >
                    {Ico.trash()}
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {paged.length === 0 && (
            <tr>
              <td colSpan={HEADERS.length + 1} className="px-4 py-10 text-center text-sm text-gray-400">
                {search ? `Tidak ada hasil untuk "${search}".` : "Belum ada data transaksi."}
              </td>
            </tr>
          )}
        </DataTable>
      </Card>

      {/* ── Create / Edit form modal ─────────────────────────────────────── */}
      {formMode !== null && (
        <Modal
          title={formMode === "create" ? "Tambah Transaksi" : "Edit Transaksi"}
          onClose={closeForm}
          wide
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <FormField
              label="Tanggal Transaksi"
              type="date"
              value={form.tanggal_transaksi}
              onChange={(v) => setField("tanggal_transaksi", v)}
              error={errors.tanggal_transaksi}
            />
            <FormField
              label="Terima Dari"
              type="text"
              value={form.terima_dari}
              onChange={(v) => setField("terima_dari", v)}
              placeholder="Nama instansi / perorangan"
              error={errors.terima_dari}
            />
            <FormField
              label="Jumlah Uang (Rp)"
              type="text"
              value={formatCurrencyInput(String(form.jumlah_uang))}
              onChange={(v) => setField("jumlah_uang", parseCurrencyInput(v))}
              placeholder="Rp 0"
              error={errors.jumlah_uang}
            />
            <FormField
              label="Untuk Pembayaran"
              type="text"
              value={form.untuk_pembayaran}
              onChange={(v) => setField("untuk_pembayaran", v)}
              placeholder="Keterangan pembayaran"
              error={errors.untuk_pembayaran}
            />
            <FormField
              label="Penerima Uang"
              type="text"
              value={form.penerima_uang}
              onChange={(v) => setField("penerima_uang", v)}
              placeholder="Nama penerima"
              error={errors.penerima_uang}
            />
            <FormField
              label="Kota"
              type="text"
              value={form.kota}
              onChange={(v) => setField("kota", v)}
              placeholder="Jakarta"
              error={errors.kota}
            />
          </div>

          <div className="flex gap-2 mt-5">
            <PrimaryBtn
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 justify-center"
            >
              {saving ? "Menyimpan…" : formMode === "create" ? "Simpan Transaksi" : "Perbarui Transaksi"}
            </PrimaryBtn>
            <OutlineBtn onClick={closeForm} className="px-4">
              Batal
            </OutlineBtn>
          </div>
        </Modal>
      )}

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="Hapus Transaksi" onClose={() => !deleting && setDeleteTarget(null)}>
          <div className="text-center py-2">
            {/* Warning icon */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#fef2f2" }}
            >
              <svg viewBox="0 0 24 24" fill="#dc2626" className="w-6 h-6">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>

            <p className="text-sm font-semibold text-gray-900 mb-1">
              Hapus transaksi ini?
            </p>
            <p className="text-xs text-gray-400 mb-1">
              No. {deleteTarget.id_data_transaksi} — {deleteTarget.terima_dari}
            </p>
            <p className="text-xs text-gray-400 mb-6">
              {formatRp(deleteTarget.jumlah_uang)} · {deleteTarget.untuk_pembayaran}
            </p>
            <p className="text-xs text-red-500 mb-6">
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                  transition-colors disabled:opacity-40"
                style={{ background: "#dc2626" }}
                onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = "#b91c1c"; }}
                onMouseLeave={(e) => { if (!deleting) e.currentTarget.style.background = "#dc2626"; }}
              >
                {deleting ? "Menghapus…" : "Ya, Hapus"}
              </button>
              <OutlineBtn
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 justify-center"
              >
                Batal
              </OutlineBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── View Modal (Read-Only) ─────────────────────────────────────────── */}
      {viewTarget && (
        <Modal title="Detail Kwitansi (Dari Transaksi)" onClose={() => setViewTarget(null)} wide>
          <div className="w-full overflow-hidden flex justify-center">
            <style>{`
              .kwitansi-zoom { width: 520px; max-width: none; }
              @media (max-width: 600px) { .kwitansi-zoom { zoom: 0.8; } }
              @media (max-width: 480px) { .kwitansi-zoom { zoom: 0.65; } }
              @media (max-width: 380px) { .kwitansi-zoom { zoom: 0.55; } }
            `}</style>
            <div className="kwitansi-zoom p-4 relative text-sm font-sans">

              {/* Title */}
              <div className="text-center border-b-2 border-black pb-3 mb-5">
                <h2 className="text-base font-bold tracking-widest text-black">KWITANSI PEMBAYARAN</h2>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {[
                  { label: "No Kwitansi",      value: "",                                                 bold: true },
                  { label: "Diterima Dari",    value: viewTarget.terima_dari,                             bold: false },
                  { label: "Terbilang",        value: terbilang(viewTarget.jumlah_uang) + " Rupiah",      bold: true },
                  { label: "Untuk Pembayaran", value: viewTarget.untuk_pembayaran,                        bold: false },
                ].map((row) => (
                  <div key={row.label} className="flex gap-4 items-end">
                    <span className="text-[11px] text-gray-500 font-normal text-right flex-shrink-0 pb-1" style={{ width: 130 }}>
                      {row.label}
                    </span>
                    <span className={`flex-1 text-[12px] text-black border-b border-gray-400 pb-1 pl-1 ${row.bold ? "font-bold" : "font-normal"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-7">
                {/* Amount */}
                <div className="flex items-center border-y border-black py-1.5 w-44">
                  <span className="text-[11px] text-gray-600 font-normal mr-1 ml-1">Rp</span>
                  <span className="text-sm font-bold text-black">
                    {formatRp(viewTarget.jumlah_uang).replace("Rp ", "")}
                  </span>
                </div>

                {/* Signature */}
                <div className="flex flex-col items-center" style={{ width: 170 }}>
                  <span className="text-[10px] text-gray-600 font-normal mb-1">
                    {viewTarget.kota}, {formatDateNoDay(viewTarget.tanggal_transaksi)}
                  </span>
                  <div className="w-full border-b border-gray-500" />

                  {/* Materai box jika >= 5 juta */}
                  {viewTarget.jumlah_uang >= 5_000_000 ? (
                    <div className="my-2.5 flex justify-center">
                      <div className="border border-dashed border-gray-400 flex items-center justify-center text-center"
                        style={{ width: 70, height: 50 }}>
                        <span className="text-[7px] text-gray-400 leading-tight">Materai<br/>Rp 10.000</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 56 }} />
                  )}

                  <div className="w-full border-b border-gray-500 mb-1" />
                  <span className="text-[11px] font-bold text-black text-center truncate w-full">
                    {viewTarget.penerima_uang}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <OutlineBtn onClick={() => setViewTarget(null)}>
              Tutup
            </OutlineBtn>
            <div className="hidden md:block">
              <OutlineBtn onClick={() => pdfService.downloadKwitansiPdf(viewTarget)}>
                {Ico.download()} Download PDF
              </OutlineBtn>
            </div>
            <PrimaryBtn
              className="!bg-blue-600 hover:!bg-blue-700 !border-blue-600 px-6"
              onClick={() => pdfService.downloadKwitansiPdf(viewTarget)}
            >
              {Ico.download()} Save PDF
            </PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}
