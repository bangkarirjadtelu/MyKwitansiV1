import ExcelJS from "exceljs";
import type { DaftarHadirData } from "../types/daftarHadir";
import { excelLogoRawBase64 } from "../assets/excelLogoBase64";

/**
 * Service to generate and download Excel (.xlsx) file
 * replicating the exact layout, borders, fonts, and dimensions of template-daftar-hadir.xlsx
 */
export async function exportDaftarHadirToExcel(data: DaftarHadirData, filename?: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Daftar Hadir");

  // Exact page setup matching template
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: "portrait",
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
    horizontalCentered: true,
  };

  // Exact column widths from template-daftar-hadir.xlsx
  ws.columns = [
    { width: 22.66 }, // Col A
    { width: 33.83 }, // Col B
    { width: 22.41 }, // Col C
    { width: 12.00 }, // Col D
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // ── ROW 1 ──
  ws.getCell("A1").border = {
    top: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };

  const cellB1 = ws.getCell("B1");
  cellB1.value = "UNIVERSITAS TELKOM";
  cellB1.font = { name: "Times New Roman", size: 12 };
  cellB1.alignment = { horizontal: "left", vertical: "middle" };
  cellB1.border = thinBorder;

  const cellC1 = ws.getCell("C1");
  cellC1.value = "No. Formulir";
  cellC1.font = { name: "Times New Roman", size: 12 };
  cellC1.alignment = { horizontal: "left", vertical: "middle" };
  cellC1.border = thinBorder;

  const cellD1 = ws.getCell("D1");
  cellD1.value = data.agenda.noFormulir || "";
  cellD1.font = { name: "Times New Roman", size: 12 };
  cellD1.alignment = { horizontal: "center", vertical: "middle" };
  cellD1.border = thinBorder;

  // ── ROW 2 ──
  ws.getRow(2).height = 27.75;
  ws.getCell("A2").border = { left: { style: "thin" }, right: { style: "thin" } };

  const cellB2 = ws.getCell("B2");
  cellB2.value = "Jl. Telekomunikasi No. 1 Terusan Buah Batu Bandung 40257";
  cellB2.font = { name: "Times New Roman", size: 12 };
  cellB2.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  cellB2.border = thinBorder;

  const cellC2 = ws.getCell("C2");
  cellC2.value = "Revisi";
  cellC2.font = { name: "Times New Roman", size: 12 };
  cellC2.alignment = { horizontal: "left", vertical: "middle" };
  cellC2.border = thinBorder;

  const cellD2 = ws.getCell("D2");
  cellD2.value = data.agenda.revisi || "";
  cellD2.font = { name: "Times New Roman", size: 12 };
  cellD2.alignment = { horizontal: "center", vertical: "middle" };
  cellD2.border = thinBorder;

  // ── ROW 3 ──
  ws.getCell("A3").border = { left: { style: "thin" }, right: { style: "thin" } };
  ws.getCell("B3").border = thinBorder;

  const cellC3 = ws.getCell("C3");
  cellC3.value = "Berlaku Efektif";
  cellC3.font = { name: "Times New Roman", size: 11 };
  cellC3.alignment = { horizontal: "left", vertical: "middle" };
  cellC3.border = thinBorder;

  const cellD3 = ws.getCell("D3");
  cellD3.value = data.agenda.berlakuEfektif || "";
  cellD3.font = { name: "Times New Roman", size: 11 };
  cellD3.alignment = { horizontal: "center", vertical: "middle" };
  cellD3.border = thinBorder;

  // Merge B2:B3 (Jl. Telekomunikasi...)
  ws.mergeCells("B2:B3");

  // ── ROW 4 ──
  ws.getCell("A4").border = {
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };

  const cellB4 = ws.getCell("B4");
  cellB4.value = "Daftar Hadir";
  cellB4.font = { name: "Times New Roman", size: 11 };
  cellB4.alignment = { horizontal: "left", vertical: "middle" };
  cellB4.border = thinBorder;

  const cellC4 = ws.getCell("C4");
  cellC4.value = "Hal";
  cellC4.font = { name: "Times New Roman", size: 11 };
  cellC4.alignment = { horizontal: "left", vertical: "middle" };
  cellC4.border = thinBorder;

  const cellD4 = ws.getCell("D4");
  cellD4.value = data.agenda.hal || "";
  cellD4.font = { name: "Times New Roman", size: 11 };
  cellD4.alignment = { horizontal: "center", vertical: "middle" };
  cellD4.border = thinBorder;

  // ── Embed Telkom University Logo into A1:A4 ──
  try {
    const imageId = wb.addImage({
      base64: excelLogoRawBase64,
      extension: "png",
    });

    ws.addImage(imageId, {
      tl: { col: 0.05, row: 0.1 },
      br: { col: 0.95, row: 3.8 },
      editAs: "oneCell",
    });
  } catch (err) {
    console.warn("Failed to embed image in Excel:", err);
  }

  // ── ROW 5: Spacing Row ──
  ws.getRow(5).height = 14;

  // ── ROWS 6-9: Agenda Block ──
  const agendaList: { label: string; value: string }[] = [
    { label: "Hari, Tanggal", value: data.agenda.hariTanggal },
    { label: "Agenda",        value: data.agenda.namaAgenda },
    { label: "Tempat",        value: data.agenda.tempat },
    { label: "Waktu",         value: data.agenda.waktu },
  ];

  agendaList.forEach((item, idx) => {
    const r = 6 + idx;
    const cellA = ws.getCell(`A${r}`);
    cellA.value = item.label;
    cellA.font = { name: "Times New Roman", size: 11 };
    cellA.alignment = { horizontal: "left", vertical: "middle" };
    cellA.border = thinBorder;

    const cellB = ws.getCell(`B${r}`);
    cellB.value = item.value;
    cellB.font = { name: "Times New Roman", size: 11 };
    cellB.alignment = { horizontal: "left", vertical: "middle" };
    cellB.border = thinBorder;

    ws.getCell(`C${r}`).border = thinBorder;
    ws.getCell(`D${r}`).border = thinBorder;

    ws.mergeCells(`B${r}:D${r}`);
  });

  // ── ROW 10: Spacing Row ──
  ws.getRow(10).height = 14;

  // ── ROW 11: Table Header ──
  const headers = ["Nomor", "Nama", "Tanggal Check-in", "Status"];
  const cols = ["A", "B", "C", "D"];
  headers.forEach((h, idx) => {
    const cell = ws.getCell(`${cols[idx]}11`);
    cell.value = h;
    cell.font = { name: "Times New Roman", size: 10, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  // ── ROWS 12+: Attendance Data ──
  data.peserta.forEach((peserta, idx) => {
    const r = 12 + idx;

    const cA = ws.getCell(`A${r}`);
    cA.value = peserta.nomor;
    cA.font = { name: "Times New Roman", size: 10 };
    cA.alignment = { horizontal: "center", vertical: "middle" };
    cA.border = thinBorder;

    const cB = ws.getCell(`B${r}`);
    cB.value = peserta.nama;
    cB.font = { name: "Cambria", size: 10 }; // FONT CAMBRIA for participant name!
    cB.alignment = { horizontal: "left", vertical: "middle" };
    cB.border = thinBorder;

    const cC = ws.getCell(`C${r}`);
    cC.value = peserta.tanggalCheckin;
    cC.font = { name: "Times New Roman", size: 10 };
    cC.alignment = { horizontal: "center", vertical: "middle" };
    cC.border = thinBorder;

    const cD = ws.getCell(`D${r}`);
    cD.value = peserta.status || "CheckIn";
    cD.font = { name: "Times New Roman", size: 10 };
    cD.alignment = { horizontal: "center", vertical: "middle" };
    cD.border = thinBorder;
  });

  // ── Trigger Download in Browser ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const safeTitle = data.agenda.namaAgenda
    ? data.agenda.namaAgenda.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)
    : "Daftar_Hadir";
  anchor.download = filename || `Daftar_Hadir_${safeTitle}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
