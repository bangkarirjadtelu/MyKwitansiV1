import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { DaftarHadirData } from "../types/daftarHadir";
import { excelLogoBase64 } from "../assets/excelLogoBase64";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 30,
    paddingRight: 30,
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    lineHeight: 1.25,
    color: "#000000",
  },

  // ── KOP SURAT ──
  kopTable: {
    width: "100%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#000000",
    marginBottom: 8,
  },
  kopMainRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
  },
  kopLogoCell: {
    width: "25%",
    borderRightWidth: 1,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  logoImg: {
    width: 110,
    height: 38,
    objectFit: "contain",
  },
  kopMiddleCell: {
    width: "45%",
    borderRightWidth: 1,
    borderColor: "#000000",
    flexDirection: "column",
  },
  kopMiddleTop: {
    padding: 4,
    borderBottomWidth: 1,
    borderColor: "#000000",
    justifyContent: "center",
    minHeight: 20,
  },
  kopMiddleAddress: {
    padding: 4,
    borderBottomWidth: 1,
    borderColor: "#000000",
    justifyContent: "center",
    flex: 1,
  },
  kopMiddleBottom: {
    padding: 4,
    justifyContent: "center",
    minHeight: 18,
  },
  kopRightCell: {
    width: "30%",
    flexDirection: "column",
  },
  metaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    minHeight: 18,
    alignItems: "center",
  },
  metaRowLast: {
    flexDirection: "row",
    minHeight: 18,
    alignItems: "center",
  },
  metaLabel: {
    width: "60%",
    paddingLeft: 4,
    paddingRight: 2,
    borderRightWidth: 1,
    borderColor: "#000000",
    fontSize: 9,
    fontFamily: "Times-Roman",
  },
  metaValue: {
    width: "40%",
    paddingLeft: 4,
    paddingRight: 2,
    fontSize: 9,
    fontFamily: "Times-Roman",
    textAlign: "center",
  },

  // ── AGENDA BLOCK ──
  agendaTable: {
    width: "100%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
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
  agendaLabel: {
    width: "25%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingLeft: 6,
    paddingRight: 4,
    paddingTop: 3,
    paddingBottom: 3,
    fontSize: 9.5,
    fontFamily: "Times-Roman",
  },
  agendaValue: {
    width: "75%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingLeft: 6,
    paddingRight: 4,
    paddingTop: 3,
    paddingBottom: 3,
    fontSize: 9.5,
    fontFamily: "Times-Roman",
  },

  // ── ATTENDANCE TABLE ──
  table: {
    width: "100%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
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
    borderRightWidth: 1,
    borderColor: "#000000",
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
    fontFamily: "Times-Roman",
    padding: 3,
  },
  tdNama: {
    width: "48%",
    borderRightWidth: 1,
    borderColor: "#000000",
    textAlign: "left",
    fontSize: 9,
    fontFamily: "Times-Roman", // Serif font corresponding to Cambria
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
    fontFamily: "Times-Roman",
    padding: 3,
  },
  tdStatus: {
    width: "15%",
    borderRightWidth: 1,
    borderColor: "#000000",
    textAlign: "center",
    fontSize: 9,
    fontFamily: "Times-Roman",
    padding: 3,
  },
});

interface Props {
  data: DaftarHadirData;
}

export function DaftarHadirDocument({ data }: Props) {
  const { agenda, peserta } = data;

  return (
    <Document title={`Daftar Hadir - ${agenda.namaAgenda || "Kegiatan"}`}>
      <Page size="A4" style={styles.page}>
        
        {/* ── KOP SURAT TABLE ── */}
        <View style={styles.kopTable}>
          <View style={styles.kopMainRow}>
            
            {/* Logo Left */}
            <View style={styles.kopLogoCell}>
              <Image src={excelLogoBase64} style={styles.logoImg} />
            </View>

            {/* Middle Section: 3 stacked sub-rows */}
            <View style={styles.kopMiddleCell}>
              <View style={styles.kopMiddleTop}>
                <Text style={{ fontFamily: "Times-Bold", fontSize: 10.5 }}>UNIVERSITAS TELKOM</Text>
              </View>
              <View style={styles.kopMiddleAddress}>
                <Text style={{ fontSize: 8.5 }}>
                  Jl. Telekomunikasi No. 1 Terusan Buah Batu Bandung 40257
                </Text>
              </View>
              <View style={styles.kopMiddleBottom}>
                <Text style={{ fontFamily: "Times-Bold", fontSize: 10 }}>Daftar Hadir</Text>
              </View>
            </View>

            {/* Right Section: 4 metadata key-value rows */}
            <View style={styles.kopRightCell}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>No. Formulir</Text>
                <Text style={styles.metaValue}>{agenda.noFormulir || ""}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Revisi</Text>
                <Text style={styles.metaValue}>{agenda.revisi || ""}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Berlaku Efektif</Text>
                <Text style={styles.metaValue}>{agenda.berlakuEfektif || ""}</Text>
              </View>
              <View style={styles.metaRowLast}>
                <Text style={styles.metaLabel}>Hal</Text>
                <Text style={styles.metaValue}>{agenda.hal || ""}</Text>
              </View>
            </View>

          </View>
        </View>

        {/* ── AGENDA TABLE ── */}
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
          <View style={styles.agendaRow}>
            <Text style={styles.agendaLabel}>Waktu</Text>
            <Text style={styles.agendaValue}>{agenda.waktu}</Text>
          </View>
        </View>

        {/* ── ATTENDANCE LIST TABLE ── */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeaderRow} fixed>
            <Text style={styles.thNomor}>Nomor</Text>
            <Text style={styles.thNama}>Nama</Text>
            <Text style={styles.thCheckin}>Tanggal Check-in</Text>
            <Text style={styles.thStatus}>Status</Text>
          </View>

          {/* Data Rows */}
          {peserta.map((p) => (
            <View key={p.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.tdNomor}>{p.nomor}</Text>
              <Text style={styles.tdNama}>{p.nama}</Text>
              <Text style={styles.tdCheckin}>{p.tanggalCheckin}</Text>
              <Text style={styles.tdStatus}>{p.status || "CheckIn"}</Text>
            </View>
          ))}
        </View>

      </Page>
    </Document>
  );
}
