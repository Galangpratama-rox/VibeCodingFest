import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisResult } from "../types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const medicalDiagnosisSchema = {
  type: Type.OBJECT,
  properties: {
    probabilitas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          kondisi: { type: Type.STRING },
          skor: { type: Type.STRING }
        },
        required: ["kondisi", "skor"]
      }
    },
    urgensi: { 
      type: Type.STRING,
      enum: ["Rendah", "Sedang", "Tinggi", "Darurat"]
    },
    saran_awal: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    rekomendasi_spesialis: { type: Type.STRING },
    kategori_faskes: { 
      type: Type.STRING,
      enum: ["RS Umum", "Puskesmas", "Klinik"]
    },
    pertanyaan_lanjutan: { type: Type.STRING }
  },
  required: ["probabilitas", "urgensi", "saran_awal", "rekomendasi_spesialis", "kategori_faskes", "pertanyaan_lanjutan"]
};

export async function analyzeSymptoms(input: string): Promise<DiagnosisResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analisis keluhan dalam konteks medis awal: "${input}"`,
    config: {
      systemInstruction: "Anda adalah asisten medis darurat AI. Analisis keluhan pengguna dan berikan rekomendasi awal. Selalu sertakan medical disclaimer bahwa ini bukan pengganti saran dokter profesional. Jawaban HARUS dalam bahasa Indonesia dan mengikuti skema JSON yang ditentukan.",
      responseMimeType: "application/json",
      responseSchema: medicalDiagnosisSchema as any
    }
  });

  const text = response.text;
  if (!text) throw new Error("Gagal mendapatkan analisis dari AI.");
  
  return JSON.parse(text) as DiagnosisResult;
}
