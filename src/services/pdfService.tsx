/**
 * PDF Service — handles generation and downloading of PDF documents.
 * Keeps React-PDF generation logic out of the UI components.
 * 
 * Uses dynamic imports (lazy loading) to ensure the 1MB+ PDF engine
 * is not included in the main application bundle until requested.
 */
import React from "react";
import type { DataTransaksiView, DataNotaView } from "../types";

export interface PdfService {
  downloadKwitansiPdf(data: DataTransaksiView): Promise<void>;
  downloadNotaPdf(data: DataNotaView): Promise<void>;
  downloadMultipleKwitansiPdf(items: DataTransaksiView[]): Promise<void>;
  downloadMultipleNotaPdf(items: DataNotaView[]): Promise<void>;
  printKwitansiPdf(data: DataTransaksiView): Promise<void>;
  printMultipleKwitansiPdf(items: DataTransaksiView[]): Promise<void>;
  printNotaPdf(data: DataNotaView): Promise<void>;
  printMultipleNotaPdf(items: DataNotaView[]): Promise<void>;
  downloadUndanganPdf(data: import("../types").DataUndanganView): Promise<void>;
  printUndanganPdf(data: import("../types").DataUndanganView): Promise<void>;
  downloadMultipleUndanganPdf(items: import("../types").DataUndanganView[]): Promise<void>;
  printMultipleUndanganPdf(items: import("../types").DataUndanganView[]): Promise<void>;
  downloadDaftarHadirPdf(data: import("../types").DaftarHadirData): Promise<void>;
  printDaftarHadirPdf(data: import("../types").DaftarHadirData): Promise<void>;
}

/** Sanitize string for use in Windows/Linux filenames */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_\.]/g, "_");
}

/** Helper to trigger browser download of a Blob */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Bypassing mobile browser async-click blockers using a synchronous click overlay
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(0,0,0,0.75)";
    overlay.style.zIndex = "999999";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "1rem";
    
    const box = document.createElement("div");
    box.style.backgroundColor = "white";
    box.style.padding = "2rem";
    box.style.borderRadius = "1rem";
    box.style.textAlign = "center";
    box.style.width = "100%";
    box.style.maxWidth = "320px";
    
    const title = document.createElement("h3");
    title.innerText = "PDF Siap Disimpan!";
    title.style.marginBottom = "1.5rem";
    title.style.fontWeight = "bold";
    title.style.color = "#111827";
    title.style.fontSize = "1.125rem";
    
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.innerText = "Download PDF";
    a.style.display = "block";
    a.style.backgroundColor = "#7b1113"; // brand color
    a.style.color = "white";
    a.style.padding = "0.75rem 1.5rem";
    a.style.borderRadius = "0.5rem";
    a.style.fontWeight = "bold";
    a.style.textDecoration = "none";
    a.style.marginBottom = "1rem";
    
    a.onclick = () => {
      setTimeout(() => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        URL.revokeObjectURL(url);
      }, 1000);
    };
    
    const cancel = document.createElement("button");
    cancel.innerText = "Batal";
    cancel.style.display = "block";
    cancel.style.width = "100%";
    cancel.style.padding = "0.5rem";
    cancel.style.color = "#6b7280";
    cancel.style.fontWeight = "600";
    cancel.style.background = "transparent";
    cancel.style.border = "none";
    cancel.onclick = () => {
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
      URL.revokeObjectURL(url);
    };
    
    box.appendChild(title);
    box.appendChild(a);
    box.appendChild(cancel);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    return;
  }

  // Desktop standard programmatic download
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 5000);
}

/** Helper to trigger browser print of a Blob via hidden iframe */
function triggerPrint(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  
  iframe.onload = () => {
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }, 200);
  };
  
  document.body.appendChild(iframe);
}

export const pdfService: PdfService = {
  async downloadKwitansiPdf(data: DataTransaksiView) {
    try {
      // Lazy load the PDF engine and document component
      const { pdf } = await import("@react-pdf/renderer");
      const { KwitansiDocument } = await import("../documents/KwitansiDocument");

      // Generate Blob from the KwitansiDocument component
      // @ts-ignore
      const blob = await pdf(<KwitansiDocument data={data} />).toBlob();
      
      // Kwitansi_[id_data_transaksi]_[terima_dari].pdf
      const cleanId = String(data.id_data_transaksi).padStart(4, "0");
      const cleanName = sanitizeFilename(data.terima_dari);
      const filename = `Kwitansi_${cleanId}_${cleanName}.pdf`;
      
      triggerDownload(blob, filename);
    } catch (error) {
      console.error("[PdfService] Error generating Kwitansi PDF:", error);
      throw new Error("Gagal membuat PDF Kwitansi.");
    }
  },

  async downloadNotaPdf(data: DataNotaView) {
    try {
      // Lazy load the PDF engine and document component
      const { pdf } = await import("@react-pdf/renderer");
      const { NotaDocument } = await import("../documents/NotaDocument");

      // Generate Blob from the NotaDocument component
      // @ts-ignore
      const blob = await pdf(<NotaDocument data={data} />).toBlob();
      
      // Nota_[id_data_nota]_[admin_username].pdf
      const cleanId = String(data.id_data_nota).padStart(4, "0");
      const cleanName = sanitizeFilename(data.admin_username);
      const filename = `Nota_${cleanId}_${cleanName}.pdf`;
      
      triggerDownload(blob, filename);
    } catch (error) {
      console.error("[PdfService] Error generating Nota PDF:", error);
      throw new Error("Gagal membuat PDF Nota.");
    }
  },

  async downloadMultipleKwitansiPdf(items: DataTransaksiView[]) {
    if (items.length === 0) return;
    if (items.length === 1) {
      return this.downloadKwitansiPdf(items[0]);
    }
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { MultiKwitansiDocument } = await import("../documents/KwitansiDocument");
      // @ts-ignore
      const blob = await pdf(<MultiKwitansiDocument items={items} />).toBlob();
      const filename = `Batch_Kwitansi_${items.length}_items.pdf`;
      triggerDownload(blob, filename);
    } catch (error) {
      console.error("[PdfService] Error generating multiple Kwitansi PDFs:", error);
      throw new Error("Gagal membuat PDF Kwitansi.");
    }
  },

  async downloadMultipleNotaPdf(items: DataNotaView[]) {
    if (items.length === 0) return;
    if (items.length === 1) {
      return this.downloadNotaPdf(items[0]);
    }
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { MultiNotaDocument } = await import("../documents/NotaDocument");
      // @ts-ignore
      const blob = await pdf(<MultiNotaDocument items={items} />).toBlob();
      const filename = `Batch_Nota_${items.length}_items.pdf`;
      triggerDownload(blob, filename);
    } catch (error) {
      console.error("[PdfService] Error generating multiple Nota PDFs:", error);
      throw new Error("Gagal membuat PDF Nota.");
    }
  },

  async printKwitansiPdf(data: DataTransaksiView) {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { KwitansiDocument } = await import("../documents/KwitansiDocument");
      // @ts-ignore
      const blob = await pdf(<KwitansiDocument data={data} />).toBlob();
      triggerPrint(blob);
    } catch (error) {
      console.error("[PdfService] Error printing Kwitansi PDF:", error);
      throw new Error("Gagal print PDF Kwitansi.");
    }
  },

  async printMultipleKwitansiPdf(items: DataTransaksiView[]) {
    if (items.length === 0) return;
    if (items.length === 1) {
      return this.printKwitansiPdf(items[0]);
    }
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { MultiKwitansiDocument } = await import("../documents/KwitansiDocument");
      // @ts-ignore
      const blob = await pdf(<MultiKwitansiDocument items={items} />).toBlob();
      triggerPrint(blob);
    } catch (error) {
      console.error("[PdfService] Error printing multiple Kwitansi PDFs:", error);
      throw new Error("Gagal print PDF Kwitansi.");
    }
  },

  async printNotaPdf(data: DataNotaView) {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { NotaDocument } = await import("../documents/NotaDocument");
      // @ts-ignore
      const blob = await pdf(<NotaDocument data={data} />).toBlob();
      triggerPrint(blob);
    } catch (error) {
      console.error("[PdfService] Error printing Nota PDF:", error);
      throw new Error("Gagal print PDF Nota.");
    }
  },

  async printMultipleNotaPdf(items: DataNotaView[]) {
    if (items.length === 0) return;
    if (items.length === 1) {
      return this.printNotaPdf(items[0]);
    }
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { MultiNotaDocument } = await import("../documents/NotaDocument");
      // @ts-ignore
      const blob = await pdf(<MultiNotaDocument items={items} />).toBlob();
      triggerPrint(blob);
    } catch (error) {
      console.error("[PdfService] Error printing multiple Nota PDFs:", error);
      throw new Error("Gagal print PDF Nota.");
    }
  },

  async downloadUndanganPdf(data: import("../types").DataUndanganView) {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { UndanganDocument } = await import("../documents/UndanganDocument");
      const blob = await pdf(<UndanganDocument data={data} />).toBlob();
      const filename = `Undangan_${data.id_formulir_undangan}_${sanitizeFilename(data.acara)}.pdf`;
      triggerDownload(blob, filename);
    } catch (e) {
      console.error("PDF generation error:", e);
      alert("Gagal membuat PDF Undangan.");
    }
  },

  async printUndanganPdf(data: import("../types").DataUndanganView) {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { UndanganDocument } = await import("../documents/UndanganDocument");
      const blob = await pdf(<UndanganDocument data={data} />).toBlob();
      triggerPrint(blob);
    } catch (e) {
      console.error("Print PDF error:", e);
      alert("Gagal memproses PDF untuk diprint.");
    }
  },

  async downloadMultipleUndanganPdf(items: import("../types").DataUndanganView[]) {
    if (items.length === 0) return;
    if (items.length === 1) return this.downloadUndanganPdf(items[0]);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { MultiUndanganDocument } = await import("../documents/UndanganDocument");
      // @ts-ignore
      const blob = await pdf(<MultiUndanganDocument items={items} />).toBlob();
      const filename = `Batch_Undangan_${items.length}_items.pdf`;
      triggerDownload(blob, filename);
    } catch (e) {
      console.error("[PdfService] Bulk undangan download error:", e);
      alert("Gagal membuat PDF Undangan.");
    }
  },

  async printMultipleUndanganPdf(items: import("../types").DataUndanganView[]) {
    if (items.length === 0) return;
    if (items.length === 1) return this.printUndanganPdf(items[0]);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { MultiUndanganDocument } = await import("../documents/UndanganDocument");
      // @ts-ignore
      const blob = await pdf(<MultiUndanganDocument items={items} />).toBlob();
      triggerPrint(blob);
    } catch (e) {
      console.error("[PdfService] Bulk undangan print error:", e);
      alert("Gagal memproses PDF untuk diprint.");
    }
  },

  async downloadDaftarHadirPdf(data: import("../types").DaftarHadirData) {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { DaftarHadirDocument } = await import("../documents/DaftarHadirDocument");
      const blob = await pdf(<DaftarHadirDocument data={data} />).toBlob();
      const safeTitle = data.agenda.namaAgenda
        ? sanitizeFilename(data.agenda.namaAgenda).slice(0, 30)
        : "Kegiatan";
      const filename = `Daftar_Hadir_${safeTitle}.pdf`;
      triggerDownload(blob, filename);
    } catch (e) {
      console.error("[PdfService] Error generating Daftar Hadir PDF:", e);
      alert("Gagal membuat PDF Daftar Hadir.");
    }
  },

  async printDaftarHadirPdf(data: import("../types").DaftarHadirData) {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { DaftarHadirDocument } = await import("../documents/DaftarHadirDocument");
      const blob = await pdf(<DaftarHadirDocument data={data} />).toBlob();
      triggerPrint(blob);
    } catch (e) {
      console.error("[PdfService] Error printing Daftar Hadir PDF:", e);
      alert("Gagal memproses PDF Daftar Hadir untuk diprint.");
    }
  }
};
