import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisResult } from "../types";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { User } from "firebase/auth";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

export async function analyzeSymptoms(input: string, locationContext?: string, user?: User | null): Promise<DiagnosisResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  const locationInfo = locationContext ? ` Lokasi pengguna saat ini: ${locationContext}.` : "";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analisis keluhan dalam konteks medis awal: "${input}".${locationInfo}`,
    config: {
      systemInstruction: "Anda adalah asisten medis darurat AI. Analisis keluhan pengguna dan berikan rekomendasi awal. Jika ada informasi lokasi, gunakan untuk memberikan konteks (misal: menyebutkan faskes tipe apa yang ada di daerah tersebut). Selalu sertakan medical disclaimer bahwa ini bukan pengganti saran dokter profesional. Jawaban HARUS dalam bahasa Indonesia dan mengikuti skema JSON yang ditentukan.",
      responseMimeType: "application/json",
      responseSchema: medicalDiagnosisSchema as any
    }
  });

  const text = response.text;
  if (!text) throw new Error("Gagal mendapatkan analisis dari AI.");
  
  const result = JSON.parse(text) as DiagnosisResult;

  // Save to Firestore if user is logged in
  if (user) {
    const path = "history_pemeriksaan";
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        userEmail: user.email,
        isi_keluhan: input,
        jawaban_ai: result,
        timestamp: serverTimestamp()
      });
    } catch (dbError) {
      handleFirestoreError(dbError, OperationType.WRITE, path);
    }
  }
  
  return result;
}
