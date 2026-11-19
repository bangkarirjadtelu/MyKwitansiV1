import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { DaftarHadirData } from "../types/daftarHadir";
import { excelLogoBase64 } from "../assets/excelLogoBase64";

const styles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 35,
    paddingLeft: 35,
    paddingRight: 35,
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    lineHeight: 1.25,
    color: "#000000",
  },

  // ── KOP SURAT ──
  kopTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 8,
    flexDirection: "row",
  },
  kopLogoCol: {
    width: "25%",
    borderRightWidth: 1,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  logoImg: {
    width: 105,
    height: 38,
    objectFit: "contain",
  },
  kopRightCol: {
    width: "75%",
    flexDirection: "column",
  },
  kopRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    minHeight: 18,
    alignItems: "stretch",
  },
  kopRowLast: {
    flexDirection: "row",
    minHeight: 18,
    alignItems: "stretch",
  },
  kopMiddleText: {
    width: "60%",
    paddingLeft: 6,
    paddingRight: 4,
    borderRightWidth: 1,
    borderColor: "#000000",
    height: "100%",
    justifyContent: "center",
  },
  metaLabel: {
    width: "24%",
    paddingLeft: 4,
    paddingRight: 2,
    borderRightWidth: 1,
    borderColor: "#000000",
    fontSize: 8.5,
    height: "100%",
    justifyContent: "center",
  },
  metaValue: {
    width: "16%",
    paddingLeft: 2,
    paddingRight: 2,
    fontSize: 8.5,
    textAlign: "center",
    height: "100%",
    justifyContent: "center",
  },

  // ── AGENDA BLOCK ──
  agendaTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 8,
  },
  agendaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    minHeight: 18,
    alignItems: "center",
  },
  agendaRowLast: {
    flexDirection: "row",
    minHeight: 18,
    alignItems: "center",
  },
  agendaLabel: {
    width: "25%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingLeft: 6,
    paddingRight: 4,
    paddingTop: 3,
    paddingBottom: 3,
    fontSize: 9.5,
  },
  agendaValue: {
    width: "75%",
    paddingLeft: 6,
    paddingRight: 4,
    paddingTop: 3,
    paddingBottom: 3,
    fontSize: 9.5,
  },

  // ── ATTENDANCE TABLE ──
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#ffffff",
    minHeight: 20,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    minHeight: 18,
    alignItems: "center",
  },
  tableRowLast: {
    flexDirection: "row",
    minHeight: 18,
    alignItems: "center",
  },
  thNomor: {
    width: "10%",
    borderRightWidth: 1,
    borderColor: "#000000",
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 9.5,
    padding: 3,
  },
  thNama: {
    width: "48%",
    borderRightWidth: 1,
    borderColor: "#000000",
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 9.5,
    padding: 3,
  },
  thCheckin: {
    width: "27%",
    borderRightWidth: 1,
    borderColor: "#000000",
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 9.5,
    padding: 3,
  },
  thStatus: {
    width: "15%",
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 9.5,
    padding: 3,
  },

  tdNomor: {
    width: "10%",
    borderRightWidth: 1,
    borderColor: "#000000",
    textAlign: "center",
    fontSize: 9,
    padding: 3,
  },
  tdNama: {
    width: "48%",
    borderRightWidth: 1,
    borderColor: "#000000",
    textAlign: "left",
    fontSize: 9,
    paddingLeft: 6,
    paddingRight: 4,
    paddingTop: 3,
    paddingBottom: 3,
  },
  tdCheckin: {
    width: "27%",
    borderRightWidth: 1,
    borderColor: "#000000",
    textAlign: "center",
    fontSize: 9,
    padding: 3,
  },
  tdStatus: {
    width: "15%",
    textAlign: "center",
    fontSize: 9,
    padding: 3,
  },
});

interface Props {
  data: DaftarHadirData;
}

export function DaftarHadirPageItem({ data }: Props) {
  const { agenda, peserta } = data;

  return (
    <Page size="A4" style={styles.page}>
      
      {/* ── KOP SURAT TABLE (Full Outer Border) ── */}
      <View style={styles.kopTable}>
        {/* Logo Column */}
        <View style={styles.kopLogoCol}>
          <Image src={excelLogoBase64} style={styles.logoImg} />
        </View>

        {/* Right 4-row Column matching template */}
        <View style={styles.kopRightCol}>
          {/* Row 1 */}
          <View style={styles.kopRow}>
            <View style={styles.kopMiddleText}>
              <Text style={{ fontFamily: "Times-Bold", fontSize: 10.5 }}>UNIVERSITAS TELKOM</Text>
            </View>
            <View style={styles.metaLabel}>
              <Text>No. Formulir</Text>
            </View>
            <View style={styles.metaValue}>
              <Text>{agenda.noFormulir || ""}</Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.kopRow}>
            <View style={styles.kopMiddleText}>
              <Text style={{ fontSize: 8.5 }}>
                Jl. Telekomunikasi No. 1 Terusan Buah Batu Bandung 40257
              </Text>
            </View>
            <View style={styles.metaLabel}>
              <Text>Revisi</Text>
            </View>
            <View style={styles.metaValue}>
              <Text>{agenda.revisi || ""}</Text>
            </View>
          </View>

          {/* Row 3 */}
          <View style={styles.kopRow}>
            <View style={styles.kopMiddleText}>
              <Text style={{ fontSize: 8.5 }}></Text>
            </View>
            <View style={styles.metaLabel}>
              <Text>Berlaku Efektif</Text>
            </View>
            <View style={styles.metaValue}>
              <Text>{agenda.berlakuEfektif || ""}</Text>
            </View>
          </View>

          {/* Row 4 */}
          <View style={styles.kopRowLast}>
            <View style={styles.kopMiddleText}>
              <Text style={{ fontFamily: "Times-Bold", fontSize: 10 }}>Daftar Hadir</Text>
            </View>
            <View style={styles.metaLabel}>
              <Text>Hal</Text>
            </View>
            <View style={styles.metaValue}>
              <Text>{agenda.hal || ""}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── AGENDA TABLE (Full Outer Border) ── */}
      <View style={styles.agendaTable}>
        <View style={styles.agendaRow}>
          <Text style={styles.agendaLabel}>Hari, Tanggal</Text>
          <Text style={styles.agendaValue}>{agenda.hariTanggal}</Text>
        </View>
        <View style={styles.agendaRow}>
          <Text style={styles.agendaLabel}>Agenda</Text>
          <Text style={styles.agendaValue}>{agenda.namaAgenda}</Text>
        </View>
        <View style={styles.agendaRow}>
          <Text style={styles.agendaLabel}>Tempat</Text>
          <Text style={styles.agendaValue}>{agenda.tempat}</Text>
        </View>
        <View style={styles.agendaRowLast}>
          <Text style={styles.agendaLabel}>Waktu</Text>
          <Text style={styles.agendaValue}>{agenda.waktu}</Text>
        </View>
      </View>

      {/* ── ATTENDANCE TABLE (Full Outer Border) ── */}
      <View style={styles.table}>
        {/* Header Row */}
        <View style={styles.tableHeaderRow} fixed>
          <Text style={styles.thNomor}>Nomor</Text>
          <Text style={styles.thNama}>Nama</Text>
          <Text style={styles.thCheckin}>Tanggal Check-in</Text>
          <Text style={styles.thStatus}>Status</Text>
        </View>

        {/* Data Rows */}
        {peserta.map((p, idx) => {
          const isLast = idx === peserta.length - 1;
          return (
            <View key={p.id} style={isLast ? styles.tableRowLast : styles.tableRow} wrap={false}>
              <Text style={styles.tdNomor}>{p.nomor}</Text>
              <Text style={styles.tdNama}>{p.nama}</Text>
              <Text style={styles.tdCheckin}>{p.tanggalCheckin}</Text>
              <Text style={styles.tdStatus}>{p.status || "CheckIn"}</Text>
            </View>
          );
        })}
      </View>

    </Page>
  );
}

export function DaftarHadirDocument({ data }: Props) {
  return (
    <Document title={`Daftar Hadir - ${data.agenda.namaAgenda || "Kegiatan"}`}>
      <DaftarHadirPageItem data={data} />
    </Document>
  );
}

export function MultiDaftarHadirDocument({ items }: { items: DaftarHadirData[] }) {
  return (
    <Document title={`Batch Daftar Hadir - ${items.length} Dokumen`}>
      {items.map((item, idx) => (
        <DaftarHadirPageItem key={idx} data={item} />
      ))}
    </Document>
  );
}

export default DaftarHadirDocument;
