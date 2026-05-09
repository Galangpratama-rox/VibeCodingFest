export type UrgencyLevel = 'Rendah' | 'Sedang' | 'Tinggi' | 'Darurat';

export interface DiagnosisResult {
  probabilitas: Array<{ kondisi: string; skor: string }>;
  urgensi: UrgencyLevel;
  saran_awal: string[];
  rekomendasi_spesialis: string;
  kategori_faskes: 'RS Umum' | 'Puskesmas' | 'Klinik';
  pertanyaan_lanjutan: string;
}

export interface MedicalHistory {
  id: string;
  timestamp: number;
  input: string;
  diagnosis: DiagnosisResult;
}

export interface FaskesLocation {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  address: string;
  distance?: number;
  duration?: string;
  isOpen24h?: boolean;
  rating?: number;
  photoUrl?: string;
}
