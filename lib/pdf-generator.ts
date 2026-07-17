import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { supabase } from './supabase';

interface LaporanData {
  id: string;
  nomor_dokumen: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  lokasi: string;
  tanggal_kejadian: string;
  status: string;
  dokumentasi?: string[];
  dasar_kegiatan?: string;
  waktu?: string;
  agenda?: string;
  jumlah_peserta?: number;
  hasil_kegiatan?: string;
  pdf_url?: string;
  status_admin?: string;
  created_at: string;
  profiles?: { nama: string; jabatan: string; nik: string };
}

async function getLogoBase64(): Promise<string> {
  try {
    const asset = Asset.fromModule(require('../assets/images/logo-pkk.png'));
    await asset.downloadAsync();
    if (!asset.localUri) return '';
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch (_) {
    return '';
  }
}

function formatTanggal(dateStr: string): string {
  if (!dateStr) return '-';
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
    'Agustus','September','Oktober','November','Desember'];
  const d = new Date(dateStr);
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function buildPhotoTag(url?: string): string {
  if (!url) return '<span style="color:#aaa;font-size:11pt;">Tidak ada foto</span>';
  return `<img src="${url}" style="width:100%;height:100%;object-fit:cover;" />`;
}

function generateF4HTML(data: LaporanData, namaKetua: string, logoSrc: string): string {
  const docs = data.dokumentasi || [];
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" style="width:72px;height:72px;object-fit:contain;" />`
    : '<div style="width:72px;height:72px;"></div>';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Kegiatan PKK</title>
<style>
@page { size:215mm 330mm; margin:12mm; }
body{font-family:"Times New Roman",serif;font-size:13pt;color:#111;}
.container{border:2px solid #000;padding:12px;}
.header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #000;padding-bottom:12px;margin-bottom:12px;}
.header-logo{flex-shrink:0;}
.header-text{flex:1;text-align:center;}
.header-text h1{margin:4px 0;font-size:22pt;}
.header-text h2{margin:0;font-size:16pt;}
.header-text .sub{font-size:11pt;margin-top:2px;}
.role-badge{display:inline-block;margin-top:8px;padding:5px 16px;border-radius:20px;background:#2f6db3;color:#fff;font-weight:bold;text-transform:uppercase;font-size:10pt;}
.meta-table{width:100%;border-collapse:collapse;}
.meta-table td{padding:5px;vertical-align:top;}
.label{width:195px;font-weight:bold;}
.section-title{margin-top:12px;padding:6px;border:1px solid #000;background:#f1f1f1;font-weight:bold;}
.content-box{border:1px solid #000;min-height:65px;padding:10px;line-height:1.5;}
.photo-grid{border:1px solid #000;padding:10px;}
.photos{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.photo-box{border:2px solid #000;height:300px;display:flex;justify-content:center;align-items:center;overflow:hidden;}
.caption{text-align:center;font-size:10.5pt;margin-top:3px;}
.signature-wrapper{display:flex;justify-content:space-between;gap:40px;margin-top:28px;}
.signature-box{width:45%;text-align:center;}
.signature-space{height:85px;}
.footer{margin-top:22px;text-align:center;font-size:8pt;line-height:1.4;font-style:italic;}
.footer-blue{color:#1f4fa8;font-weight:bold;}
.footer-green{color:#14a89a;font-weight:bold;}
</style>
</head>
<body>
<div class="container">
<div class="header">
  <div class="header-logo">${logoHtml}</div>
  <div class="header-text">
    <h1>LAPORAN KEGIATAN</h1>
    <h2>TP PKK RW 212</h2>
    <div class="sub">Kelurahan Sumberrejo</div>
    <div class="role-badge">${data.profiles?.jabatan ?? '-'}</div>
  </div>
</div>

<table class="meta-table">
<tr><td class="label">Dasar Kegiatan</td><td>: ${data.dasar_kegiatan ?? data.deskripsi ?? '-'}</td></tr>
<tr><td class="label">Hari / Tanggal</td><td>: ${formatTanggal(data.tanggal_kejadian ?? data.created_at)}</td></tr>
<tr><td class="label">Waktu</td><td>: ${data.waktu ?? '-'}</td></tr>
<tr><td class="label">Tempat</td><td>: ${data.lokasi ?? '-'}</td></tr>
<tr><td class="label">Agenda / Acara</td><td>: ${data.agenda ?? data.judul ?? '-'}</td></tr>
<tr><td class="label">Jumlah Peserta</td><td>: ${data.jumlah_peserta ?? '-'}</td></tr>
</table>

<div class="section-title">HASIL KEGIATAN</div>
<div class="content-box">${(data.hasil_kegiatan ?? '-').replace(/\n/g, '<br>')}</div>

<div class="section-title">DOKUMENTASI KEGIATAN</div>
<div class="photo-grid"><div class="photos">
<div><div class="photo-box">${buildPhotoTag(docs[0])}</div><div class="caption">Dokumentasi 1</div></div>
<div><div class="photo-box">${buildPhotoTag(docs[1])}</div><div class="caption">Dokumentasi 2</div></div>
<div><div class="photo-box">${buildPhotoTag(docs[2])}</div><div class="caption">Dokumentasi 3</div></div>
<div><div class="photo-box">${buildPhotoTag(docs[3])}</div><div class="caption">Dokumentasi 4</div></div>
</div></div>

<div class="signature-wrapper">
<div class="signature-box">
  Mengetahui,<br>Ketua TP PKK
  <div class="signature-space"></div>
  <strong>${namaKetua}</strong><br>Ketua TP PKK
</div>
<div class="signature-box">
  Pembuat Laporan,<br>${data.profiles?.jabatan ?? '-'}
  <div class="signature-space"></div>
  <strong>${data.profiles?.nama ?? '-'}</strong><br>${data.profiles?.jabatan ?? '-'}
</div>
</div>

<div class="footer">
  <span class="footer-blue">Dokumen ini merupakan hasil laporan resmi kegiatan anggota PKK RW 212 Kelurahan Sumberrejo</span><br>
  <span>Dibuat melalui aplikasi </span><span class="footer-green">LaporPKK</span>
</div>
</div>
</body>
</html>`;
}

export async function generatePdf(laporanId: string): Promise<string> {
  const { data: laporan, error: laporanErr } = await supabase
    .from('laporan')
    .select('*, profiles:user_id (nama, jabatan, nik)')
    .eq('id', laporanId)
    .single();
  if (laporanErr || !laporan) throw new Error('Laporan tidak ditemukan');

  let namaKetua = 'Ketua TP PKK';
  try {
    const { data: cfg } = await supabase
      .from('app_config')
      .select('admin_access_code')
      .eq('id', 1)
      .single();
    if ((cfg as any)?.nama_ketua) namaKetua = (cfg as any).nama_ketua;
  } catch (_) { /* fallback */ }

  // Logo PKK sebagai base64 untuk embed di HTML
  const logoSrc = await getLogoBase64();

  const html = generateF4HTML(laporan as unknown as LaporanData, namaKetua, logoSrc);
  const { uri: tempUri } = await Print.printToFileAsync({ html, base64: false });
  const fileName = `Laporan_${laporan.nomor_dokumen.replace(/\//g, '_')}.pdf`;
  const localUri = (FileSystem.documentDirectory ?? '') + fileName;
  await FileSystem.moveAsync({ from: tempUri, to: localUri });

  let pdfPublicUrl: string | null = null;
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const storagePath = `laporan-pdf/${laporanId}.pdf`;
    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(storagePath, byteArray, { contentType: 'application/pdf', upsert: true });
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);
      pdfPublicUrl = urlData?.publicUrl ?? null;
    }
  } catch (_) { /* upload opsional */ }

  await supabase
    .from('laporan')
    .update({ pdf_url: pdfPublicUrl, status: 'terkirim', status_admin: 'baru' })
    .eq('id', laporanId);

  return localUri;
}

export async function sharePdf(fileUri: string, title = 'Laporan PKK') {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: title,
      UTI: 'com.adobe.pdf',
    });
  }
}

export async function downloadPdfFromUrl(pdfUrl: string, fileName: string): Promise<string> {
  const localUri = (FileSystem.documentDirectory ?? '') + fileName;
  const { uri } = await FileSystem.downloadAsync(pdfUrl, localUri);
  return uri;
}
