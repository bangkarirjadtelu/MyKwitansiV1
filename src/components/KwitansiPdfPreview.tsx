import React from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { KwitansiDocument } from "../documents/KwitansiDocument";
import type { DataTransaksiView } from "../types";

export default function KwitansiPdfPreview({ data }: { data: DataTransaksiView }) {
  return (
    <PDFViewer className="w-full h-full border-0">
      <KwitansiDocument data={data} />
    </PDFViewer>
  );
}
