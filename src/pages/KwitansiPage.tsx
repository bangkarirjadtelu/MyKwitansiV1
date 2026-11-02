/**
 * KwitansiPage — protected route (/kwitansi).
 *
 * adminId: read from AuthContext — removes the old adminId prop.
 * Visual design and business logic unchanged.
 */
import { useState, useEffect, lazy, Suspense } from "react";
import { tokens } from "../styles/tokens";
import { formatRp, terbilang, CURRENT_YEAR, formatDocumentNumber, formatAdminName, formatCurrencyInput, formatDateInput } from "../utils/formatters";
import { Ico } from "../utils/icons";
import {
  PageHeader, Card, PrimaryBtn, OutlineBtn, Modal,
  CardToolbar, TableControls, DataTable, Td,
} from "../components/ui";
import { transactionService, printService, pdfService } from "../services";

const KwitansiPdfPreview = lazy(() => import("../components/KwitansiPdfPreview"));
import { useAuth } from "../contexts/AuthContext";
import type { DataTransaksiView } from "../types";

const { color } = tokens;

const HEADERS = [
  "No. Transaksi",
  "Tgl Transaksi",
  "Tgl Input",
  "Admin",
  "Terima Dari",
  "Jumlah Uang",
  "Untuk Pembayaran",
];

export function KwitansiPage() {
  const { currentAdmin } = useAuth();
  const adminId          = currentAdmin?.id_admin ?? 0;

  const [rows,     setRows]     = useState<DataTransaksiView[]>([]);
  const [search,      setSearch]      = useState("");
  const [pageSize,    setPageSize]    = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<DataTransaksiView[]>([]);
  const [preview, setPreview] = useState<DataTransaksiView | null>(null);

  useEffect(() => {
    transactionService.getAll().then(setRows);
  }, []);

  function handleSearch(v: string) { setSearch(v); setCurrentPage(1); }
  function handlePageSize(v: number) { setPageSize(v); setCurrentPage(1); }

  const filtered = rows.filter((t) =>
    [t.admin_username, t.terima_dari].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paged      = filtered.slice(startIndex, startIndex + pageSize);

  function toggleSelect(t: DataTransaksiView) {
    setSelected((prev) =>
      prev.some((s) => s.id_data_transaksi === t.id_data_transaksi)
        ? prev.filter((s) => s.id_data_transaksi !== t.id_data_transaksi)
        : [...prev, t]
    );
  }

  function toggleSelectAll() {
    if (selected.length === paged.length) {
      setSelected([]);
    } else {
      setSelected(paged);
    }
  }

  async function handlePrint() {
    if (selected.length === 0) return;
    await printService.printMultipleKwitansi(selected, adminId);
  }

  async function handleDownloadPdf() {
    if (!preview) return;
    await pdfService.downloadKwitansiPdf(preview);
  }

  async function handleDownloadMultiplePdf() {
    if (selected.length === 0) return;
    await pdfService.downloadMultipleKwitansiPdf(selected);
  }

  return (
    <div>
      <PageHeader title="Print Kwitansi" subtitle="Pilih transaksi untuk mencetak kwitansi" />

      <Card className="p-5">
        <CardToolbar
          left={
            <div className="flex gap-2 w-full overflow-x-auto pb-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {/* Desktop Print Button */}
              <div className="hidden md:block flex-shrink-0">
                <PrimaryBtn onClick={handlePrint} disabled={selected.length === 0} className="flex-shrink-0">
                  {Ico.print()} Print Kwitansi{selected.length > 0 ? ` (${selected.length})` : ""}
                </PrimaryBtn>
              </div>
              {/* Mobile Print Button Disabled */}
              <div className="block md:hidden flex-shrink-0">
                <PrimaryBtn disabled={true} className="opacity-50 cursor-not-allowed flex-shrink-0">
                  {Ico.print()} Print{selected.length > 0 ? ` (${selected.length})` : ""}
                </PrimaryBtn>
              </div>

              {/* Save PDF Button */}
              <PrimaryBtn 
                onClick={handleDownloadMultiplePdf} 
                disabled={selected.length === 0}
                className="!bg-blue-600 hover:!bg-blue-700 !border-blue-600 flex-shrink-0"
              >
                {Ico.download()} Save PDF{selected.length > 0 ? ` (${selected.length})` : ""}
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
          shownEntries={paged.length}
          totalEntries={filtered.length}
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          showLeadingColumn
          leadingHeader={
            <input
              type="checkbox"
              title="Pilih semua"
              checked={paged.length > 0 && paged.every((t) => selected.some((s) => s.id_data_transaksi === t.id_data_transaksi))}
              onChange={toggleSelectAll}
            />
          }
        >
          {paged.map((t) => (
            <tr
              key={t.id_data_transaksi}
              className="tr-hover cursor-pointer"
              onClick={() => setPreview(t)}
            >
              <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.some((s) => s.id_data_transaksi === t.id_data_transaksi)}
                  onChange={() => toggleSelect(t)}
                />
              </td>
              <Td>{formatDocumentNumber(t.id_data_transaksi)}</Td>
              <Td>{t.tanggal_transaksi}</Td>
              <Td>{formatDateInput(t.tanggal_input)}</Td>
              <Td accent>{formatAdminName(t.admin_username)}</Td>
              <Td>{t.terima_dari}</Td>
              <Td mono>{formatCurrencyInput(String(t.jumlah_uang))}</Td>
              <Td>{t.untuk_pembayaran}</Td>
            </tr>
          ))}
        </DataTable>
      </Card>

      {preview && (
        <Modal title="Detail Kwitansi" onClose={() => setPreview(null)} wide>
          <div className="h-[75vh] mt-4 flex flex-col">
            <div className="flex-1 border border-gray-200">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Memuat Preview PDF...
                  </div>
                }
              >
                <KwitansiPdfPreview data={preview} />
              </Suspense>
            </div>

            <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
              <OutlineBtn onClick={() => setPreview(null)}>Tutup</OutlineBtn>
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
