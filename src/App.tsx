/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Mic, 
  MicOff, 
  Search, 
  History as HistoryIcon, 
  AlertTriangle, 
  Phone, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Loader2,
  MapPin,
  ChevronRight,
  Stethoscope,
  Menu,
  X,
  Home,
  Brain,
  History as HistoryIconLucide,
  Map as MapIcon
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './components/ui/accordion';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

import { useSpeechToText } from './hooks/useSpeechToText';
import { analyzeSymptoms } from './services/geminiService';
import { DiagnosisResult, MedicalHistory, UrgencyLevel, FaskesLocation } from './types';
import FaskesMap from './components/Map';

export default function App() {
  const [history, setHistory] = useState<MedicalHistory[]>([]);
  const [currentResult, setCurrentResult] = useState<DiagnosisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [view, setView] = useState<'landing' | 'home' | 'result' | 'history' | 'explore'>('landing');
  const [exploreFilter, setExploreFilter] = useState({ distance: 5, open24h: false, rating: 0 });
  const [exploreTrigger, setExploreTrigger] = useState(0);
  const [exploreLocation, setExploreLocation] = useState<{lat: number, lng: number} | null>(null);
  const [exploreLocStatus, setExploreLocStatus] = useState<'idle' | 'detecting' | 'success' | 'denied'>('idle');
  const [realFaskes, setRealFaskes] = useState<FaskesLocation[]>([]);
  const [activeInput, setActiveInput] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { transcript, isListening, startListening, stopListening, setTranscript } = useSpeechToText();

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('medicepat_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // Handle explore view location
  useEffect(() => {
    if (view === 'explore') {
      requestLocation();
    }
  }, [view]);

  const requestLocation = () => {
    setExploreLocStatus('detecting');
    setRealFaskes([]);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setExploreLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setExploreLocStatus('success');
        toast.success("Lokasi ditemukan");
      },
      (error) => {
        console.error("Geolocation error:", error);
        setExploreLocStatus('denied');
        toast.error(`Gagal mendapatkan lokasi: ${error.message}. (Coba buka di tab baru jika izin diblokir browser)`);
      },
    );
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Sync transcript to input
  useEffect(() => {
    if (transcript) {
      setActiveInput(transcript);
    }
  }, [transcript]);

  const handleStartAnalysis = async () => {
    if (!activeInput.trim()) {
      toast.error("Silakan berikan deskripsi keluhan terlebih dahulu.");
      return;
    }

    setIsAnalyzing(true);
    setView('result');
    try {
      const result = await analyzeSymptoms(activeInput);
      setCurrentResult(result);
      
      // Save to history
      const newHistory: MedicalHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        input: activeInput,
        diagnosis: result
      };
      const updatedHistory = [newHistory, ...history].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem('medicepat_history', JSON.stringify(updatedHistory));

      if (result.urgensi === 'Darurat' || result.urgensi === 'Tinggi') {
        toast.warning("Status DARURAT dideteksi. Segera hubungi bantuan medis!");
      }
    } catch (err) {
      toast.error("Gagal menganalisis gejala. Coba lagi.");
      setView('home');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyColor = (urgensi: UrgencyLevel) => {
    switch (urgensi) {
      case 'Darurat': return 'bg-red-600 text-white';
      case 'Tinggi': return 'bg-orange-500 text-white';
      case 'Sedang': return 'bg-yellow-500 text-slate-900';
      default: return 'bg-emerald-500 text-white';
    }
  };

  const isEmergency = currentResult?.urgensi === 'Darurat' || currentResult?.urgensi === 'Tinggi';

  return (
    <div id="app-container" className={`min-h-screen flex flex-col ${isEmergency ? 'emergency-mode' : 'bg-[#F8FAFC]'}`}>
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 z-50 sticky top-0 shadow-sm w-full">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
            <div className="w-10 h-10 bg-[#0F766E] rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.505 4.044 3 5.5L12 21l7-7z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-[#0F766E] tracking-tight hidden sm:block">MediCepat</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            <button 
              onClick={() => setView('landing')}
              className={`text-xs font-black uppercase tracking-widest hover:text-teal-600 transition-colors ${view === 'landing' ? 'text-teal-600' : 'text-slate-400'}`}
            >
              Beranda
            </button>
            <button 
              onClick={() => setView('home')}
              className={`text-xs font-black uppercase tracking-widest hover:text-teal-600 transition-colors ${view === 'home' ? 'text-teal-600' : 'text-slate-400'}`}
            >
              Analisis AI
            </button>
            <button 
              onClick={() => setView('explore')}
              className={`text-xs font-black uppercase tracking-widest hover:text-teal-600 transition-colors ${view === 'explore' ? 'text-teal-600' : 'text-slate-400'}`}
            >
              Eksplorasi
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {view !== 'landing' && isEmergency && view === 'result' && (
            <div className="px-3 py-1 bg-red-100 border border-red-200 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse-slow"></div>
              <span className="text-red-700 font-semibold text-[10px] uppercase">Mode Darurat Aktif</span>
            </div>
          )}
          {view !== 'landing' && isEmergency && (
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white font-black rounded-full shadow-lg h-9 px-4 text-xs"
              onClick={() => window.open('tel:119')}
            >
              PANGGIL 119
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            {view !== 'landing' && (
              <Button variant="ghost" size="icon" onClick={() => setView('history')} className="rounded-full hidden sm:flex">
                <HistoryIconLucide className="w-5 h-5 text-slate-600" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden rounded-full"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-white z-[101] shadow-2xl p-6 flex flex-col gap-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#0F766E] rounded-lg flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.505 4.044 3 5.5L12 21l7-7z"/>
                    </svg>
                  </div>
                  <span className="font-bold text-[#0F766E] tracking-tight">MediCepat</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-slate-400" />
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { id: 'landing', label: 'Beranda', icon: Home },
                  { id: 'home', label: 'Analisis AI', icon: Brain },
                  { id: 'explore', label: 'Eksplorasi', icon: MapIcon },
                  { id: 'history', label: 'Riwayat', icon: HistoryIconLucide },
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setView(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${view === item.id ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <item.icon className={`w-5 h-5 ${view === item.id ? 'text-teal-600' : 'text-slate-400'}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100 italic text-[10px] text-slate-400 text-center">
                Solusi kesehatan cepat berbasis kecerdasan buatan.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className={`flex-1 mx-auto w-full p-6 overflow-x-hidden pb-32 ${view === 'landing' || view === 'explore' || view === 'result' ? 'max-w-7xl' : 'max-w-2xl'}`}>
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16 pt-4"
            >
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1 space-y-8 text-center lg:text-left">
                  <div className="relative inline-block">
                    <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-50 border-teal-200 px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase mb-4">
                      AI Powered Health Assistant
                    </Badge>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                    Kesehatan Anda, <span className="text-teal-600">Prioritas Tercepat</span> Kami.
                  </h2>
                  <p className="text-slate-500 text-lg md:text-xl leading-relaxed">
                    Asisten medis berbasis AI yang siap mendengarkan keluhan Anda dan memberikan panduan darurat serta navigasi faskes terdekat dalam hitungan detik.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      className="flex-1 h-16 bg-[#0F766E] hover:bg-[#115E59] text-lg font-bold rounded-2xl shadow-xl shadow-teal-500/20 active:scale-[0.98] transition-all"
                      onClick={() => setView('home')}
                    >
                      Mulai Analisis <ArrowRight className="ml-2 w-6 h-6" />
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 h-16 border-2 border-slate-200 hover:bg-slate-50 text-lg font-bold rounded-2xl active:scale-[0.98] transition-all"
                      onClick={() => setView('explore')}
                    >
                      Cari Rumah Sakit <Search className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 w-full max-w-2xl">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative glass-card rounded-3xl overflow-hidden aspect-[16/9] shadow-2xl">
                      <img 
                        src="https://picsum.photos/seed/medical-tech/1200/800" 
                        alt="Medical Hero" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                    </div>
                    {/* Floating elements */}
                    <div className="absolute -bottom-6 -left-6 glass-card p-4 rounded-2xl shadow-xl border border-white/50 backdrop-blur-xl animate-bounce hidden md:block">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="text-red-600 w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Panggilan Darurat</p>
                          <p className="text-sm font-bold text-slate-800 tracking-tighter">Respon {"<"} 5 Menit</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center gap-4 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                    <Mic className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">AI Voice Analysis</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">Teknologi pengenalan suara canggih untuk memproses keluhan medis Anda dengan akurasi tinggi.</p>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center gap-4 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">Real-time Emergency</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">Deteksi otomatis kondisi kritis yang memerlukan tindakan medis segera dan akses darurat 119.</p>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center gap-4 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">Faskes Finder</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">Navigasi cerdas ke unit gawat darurat dan klinik terdekat berdasarkan lokasi real-time Anda.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 md:p-12 mb-20">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-800">Misi Kami: Menyelamatkan Nyawa Melalui Teknologi</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    MediCepat hadir sebagai jembatan informasi antara pasien dan tenaga medis profesional di saat-saat paling krusial. Kami berkomitmen untuk menyediakan akses kesehatan yang merata dan responsif melalui inovasi AI.
                  </p>
                  <div className="flex justify-center gap-8 pt-4">
                    <div className="text-center">
                      <p className="text-3xl font-black text-teal-600">99%</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Uptime Server</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-teal-600">{"<"} 3s</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Waktu Analisis</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-teal-600">100+</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Mitra Faskes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="max-w-3xl mx-auto mb-20 space-y-8">
                <div className="text-center space-y-4">
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Pertanyaan Umum</h3>
                  <p className="text-slate-500 text-lg">Temukan jawaban atas pertanyaan seputar penggunaan MediCepat.</p>
                </div>
                
                <Accordion type="single" collapsible className="w-full space-y-4">
                  <AccordionItem value="item-1" className="bg-white border border-slate-200 rounded-2xl px-6 data-[state=open]:shadow-md transition-all">
                    <AccordionTrigger className="text-left text-lg font-bold text-slate-800 hover:no-underline py-6">Apa itu MediCepat?</AccordionTrigger>
                    <AccordionContent className="text-slate-600 leading-relaxed text-base pb-6">
                      MediCepat adalah platform kesehatan berbasis AI yang membantu pengguna menganalisis gejala, mendeteksi kondisi darurat, dan menemukan fasilitas kesehatan terdekat secara real-time.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2" className="bg-white border border-slate-200 rounded-2xl px-6 data-[state=open]:shadow-md transition-all">
                    <AccordionTrigger className="text-left text-lg font-bold text-slate-800 hover:no-underline py-6">Apakah hasil analisis AI akurat?</AccordionTrigger>
                    <AccordionContent className="text-slate-600 leading-relaxed text-base pb-6">
                      Sistem AI kami dirancang untuk memberikan analisis awal berdasarkan gejala yang Anda berikan. Hasil ini bukan pengganti diagnosis dokter, namun dapat membantu menentukan langkah awal yang tepat.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3" className="bg-white border border-slate-200 rounded-2xl px-6 data-[state=open]:shadow-md transition-all">
                    <AccordionTrigger className="text-left text-lg font-bold text-slate-800 hover:no-underline py-6">Bagaimana sistem darurat bekerja?</AccordionTrigger>
                    <AccordionContent className="text-slate-600 leading-relaxed text-base pb-6">
                      Jika gejala terdeteksi berisiko tinggi, MediCepat akan memberikan peringatan darurat dan menyarankan tindakan medis segera, termasuk akses menuju rumah sakit atau layanan darurat.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4" className="bg-white border border-slate-200 rounded-2xl px-6 data-[state=open]:shadow-md transition-all">
                    <AccordionTrigger className="text-left text-lg font-bold text-slate-800 hover:no-underline py-6">Apakah lokasi saya aman?</AccordionTrigger>
                    <AccordionContent className="text-slate-600 leading-relaxed text-base pb-6">
                      Ya, data lokasi hanya digunakan untuk menemukan fasilitas kesehatan terdekat dan tidak dibagikan tanpa izin pengguna.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5" className="bg-white border border-slate-200 rounded-2xl px-6 data-[state=open]:shadow-md transition-all">
                    <AccordionTrigger className="text-left text-lg font-bold text-slate-800 hover:no-underline py-6">Apakah MediCepat gratis digunakan?</AccordionTrigger>
                    <AccordionContent className="text-slate-600 leading-relaxed text-base pb-6">
                      Ya, seluruh fitur MediCepat saat ini dapat digunakan secara gratis, termasuk analisis gejala berbasis AI, deteksi kondisi darurat, dan pencarian fasilitas kesehatan terdekat. Kami berkomitmen menyediakan akses kesehatan digital yang mudah dijangkau untuk semua pengguna.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Comprehensive Landing Footer */}
              <footer className="border-t border-slate-200 pt-16 pb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-12">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#0F766E] rounded-lg flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.505 4.044 3 5.5L12 21l7-7z"/>
                        </svg>
                      </div>
                      <span className="text-xl font-bold text-[#0F766E] tracking-tight">MediCepat</span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-xs">Platform kesehatan darurat berbasis AI yang menghubungkan Anda dengan layanan medis tercepat di saat kritis.</p>
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 mb-4 uppercase text-[10px] tracking-widest">Link Cepat</h5>
                    <ul className="space-y-3 text-sm text-slate-500 font-bold">
                      <li onClick={() => setView('home')} className="hover:text-teal-600 cursor-pointer transition-colors px-0 py-0">Mulai Analisis</li>
                      <li onClick={() => setView('explore')} className="hover:text-teal-600 cursor-pointer transition-colors px-0 py-0">Cari Rumah Sakit</li>
                      <li onClick={() => setView('history')} className="hover:text-teal-600 cursor-pointer transition-colors px-0 py-0">Riwayat Medis</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 mb-4 uppercase text-[10px] tracking-widest">Kontak</h5>
                    <ul className="space-y-3 text-sm text-slate-500">
                      <li className="flex items-center gap-2 px-0 py-0"><Phone className="w-4 h-4 text-teal-600" /> +62 21 555 0123</li>
                      <li className="flex items-center gap-2 px-0 py-0"><ShieldAlert className="w-4 h-4 text-red-600" /> Tanggap Darurat: 119</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 mb-4 uppercase text-[10px] tracking-widest">Negara</h5>
                    <p className="text-sm text-slate-500 font-bold px-0 py-0">Indonesia 🇮🇩</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[2px]">© 2026 MediCepat Tech</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Smart Healthcare Ecosystem</p>
                </div>
              </footer>

              <div className="bg-slate-900 rounded-2xl p-6 text-white text-center">
                <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2">Terintegrasi Dengan</p>
                <div className="flex justify-center gap-6 opacity-60 grayscale brightness-200">
                  <span className="font-black text-lg">GEMINI AI</span>
                  <span className="font-black text-lg">LOCALS</span>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'explore' && (
            <motion.div 
              key="explore"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pt-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setView('landing')} className="font-bold text-slate-500 uppercase text-[10px] p-0 h-auto hover:bg-transparent hover:text-teal-600">
                    &larr; Beranda
                  </Button>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Eksplorasi Faskes Terdekat</h2>
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-white border-slate-200 w-fit">
                  {exploreLocStatus === 'success' ? 'GPS AKTIF' : 'GPS NONAKTIF'}
                </Badge>
              </div>

              {/* Real Data Fetcher (Hidden Map) */}
              <div className="hidden">
                 <FaskesMap 
                   urgency="Rendah" 
                   onHospitalsFound={setRealFaskes} 
                   refreshTrigger={exploreTrigger} 
                   explicitUserLocation={exploreLocation}
                   radius={exploreFilter.distance * 1000}
                 />
              </div>

              <div className="glass-card p-6 rounded-3xl shadow-sm space-y-6 border border-white/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Radius Pencarian</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        value={exploreFilter.distance}
                        onChange={(e) => setExploreFilter({...exploreFilter, distance: parseInt(e.target.value)})}
                      >
                        <option value="1">0 - 1 km</option>
                        <option value="3">0 - 3 km</option>
                        <option value="5">0 - 5 km</option>
                        <option value="10">0 - 10 km</option>
                        <option value="20">0 - 20 km</option>
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Minimum Rating</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        value={exploreFilter.rating}
                        onChange={(e) => setExploreFilter({...exploreFilter, rating: parseFloat(e.target.value)})}
                      >
                        <option value="0">Semua Rating</option>
                        <option value="3">3.0+ Bintang</option>
                        <option value="4">4.0+ Bintang</option>
                        <option value="4.5">4.5+ Bintang</option>
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90" />
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <label htmlFor="open24_explore" className="text-sm font-bold text-slate-700 cursor-pointer">IGD 24 Jam</label>
                      <input 
                        type="checkbox" 
                        id="open24_explore" 
                        checked={exploreFilter.open24h}
                        onChange={(e) => setExploreFilter({...exploreFilter, open24h: e.target.checked})}
                        className="w-6 h-6 accent-teal-600 rounded-lg cursor-pointer"
                      />
                    </div>
                    <Button 
                      className="bg-[#0F766E] hover:bg-[#115E59] text-white font-black rounded-2xl h-[52px] px-8 uppercase tracking-widest shadow-xl shadow-teal-900/10 active:scale-[0.98] transition-all"
                      onClick={() => {
                        if (exploreLocStatus !== 'success') {
                          requestLocation();
                        } else {
                          setRealFaskes([]); 
                          setExploreTrigger(prev => prev + 1);
                          toast.success("Mencari faskes dalam radius " + exploreFilter.distance + "km...");
                        }
                      }}
                    >
                      {exploreLocStatus !== 'success' ? 'LOKASI' : 'CARI'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                {exploreLocStatus === 'detecting' ? (
                  <div className="col-span-full py-32 text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[3px]">Mendeteksi Lokasi Anda...</p>
                  </div>
                ) : exploreLocStatus === 'denied' ? (
                  <div className="col-span-full py-32 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Izin Lokasi Ditolak</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">Kami memerlukan akses lokasi untuk menemukan fasilitas kesehatan terdekat darurat di sekitar Anda.</p>
                    <Button onClick={requestLocation} className="mt-4 bg-teal-600 hover:bg-teal-700 font-bold px-8">Refresh Izin Lokasi</Button>
                  </div>
                ) : realFaskes.length === 0 ? (
                  <div className="col-span-full py-32 text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[3px]">Mensinkronkan Data Faskes...</p>
                  </div>
                ) : (
                  realFaskes
                  .filter(f => !exploreFilter.open24h || f.isOpen24h)
                  .filter(f => (f.rating || 0) >= exploreFilter.rating)
                  .map(f => {
                    const distKm = exploreLocation ? calculateDistance(exploreLocation.lat, exploreLocation.lng, f.location.lat, f.location.lng) : 0;
                    return { ...f, distKm };
                  })
                  .filter(f => f.distKm <= exploreFilter.distance)
                  .sort((a, b) => a.distKm - b.distKm)
                  .map(f => (
                    <motion.div 
                      key={f.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:border-teal-500/20 transition-all flex flex-col group"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={f.photoUrl} 
                          alt={f.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                          {f.isOpen24h && <Badge className="bg-emerald-600 text-white border-none text-[8px] font-black uppercase px-3 shadow-lg">BUKA 24 JAM</Badge>}
                          <Badge className="bg-white/95 text-teal-700 backdrop-blur-md border-none text-[10px] font-black uppercase px-3 shadow-lg">⭐ {f.rating || 'N/A'}</Badge>
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-teal-600/90 text-white backdrop-blur-md border-none text-[10px] font-black uppercase px-3 shadow-lg">
                            {f.distKm.toFixed(1)} km
                          </Badge>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h4 className="font-bold text-slate-800 text-xl leading-tight mb-2 group-hover:text-teal-700 transition-colors">{f.name}</h4>
                        <p className="text-xs text-slate-500 flex items-start gap-2 mb-6 line-clamp-2">
                          <MapPin className="w-4 h-4 shrink-0 text-slate-300" />
                          {f.address}
                        </p>
                        <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
                          <Button 
                            variant="outline" 
                            className="rounded-xl text-[10px] font-black h-11 border-slate-200 uppercase tracking-widest hover:bg-slate-50"
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(f.name + ' ' + f.address)}`)}
                          >
                            DETAIL INFO
                          </Button>
                          <Button 
                            className="rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-[10px] font-black h-11 uppercase tracking-widest"
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}`)}
                          >
                            NAVIGASI
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12 pt-4"
            >
              <div className="flex flex-col lg:flex-row gap-12 items-start">
                <div className="flex-1 space-y-8 w-full">
                  <div className="space-y-4">
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Analisis <span className="text-teal-600 italic">Cerdas</span> Keluhan Anda.</h2>
                    <p className="text-slate-500 text-lg">AI kami akan mengevaluasi tingkat urgensi dan memberikan panduan serta lokasi bantuan tercepat.</p>
                  </div>

                  <div className="glass-card rounded-[32px] shadow-2xl border-4 border-white overflow-hidden bg-white">
                    <textarea 
                      className="w-full h-56 p-8 bg-transparent border-none focus:ring-0 text-2xl font-medium resize-none placeholder:text-slate-300 placeholder:font-normal leading-relaxed outline-none"
                      placeholder="Apa yang Anda rasakan saat ini? Jelaskan sejelas mungkin..."
                      value={activeInput}
                      onChange={(e) => setActiveInput(e.target.value)}
                    />
                    <div className="px-8 py-6 bg-slate-50/80 flex justify-between items-center border-t border-slate-100">
                      <div className="flex gap-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`w-12 h-12 rounded-full transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-white text-slate-400 border border-slate-200 hover:text-teal-600'}`}
                          onClick={isListening ? stopListening : startListening}
                        >
                          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </Button>
                      </div>
                      <Button 
                        className="bg-[#0F766E] hover:bg-[#115E59] rounded-2xl px-10 h-14 font-black transition-all shadow-xl shadow-teal-900/20 active:scale-95"
                        onClick={handleStartAnalysis}
                        disabled={!activeInput.trim()}
                      >
                        MULAI ANALISIS <ArrowRight className="ml-3 w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {isListening && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center lg:items-start gap-4 px-4"
                    >
                      <div className="flex items-center gap-3 h-10">
                        {[1,2,3,4,5,2,3,4,2,1].map((v, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: [12, 32, 12] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                            className="w-1.5 bg-teal-50 rounded-full shadow-sm"
                          />
                        ))}
                      </div>
                      <p className="text-xs font-black text-teal-600 uppercase tracking-[3px] animate-pulse">Menyimak Aktif Gejala Anda...</p>
                    </motion.div>
                  )}
                </div>

                <div className="lg:w-[350px] space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div 
                      className="glass-card p-6 rounded-3xl shadow-sm border-2 border-white transition-all hover:translate-y-[-4px] cursor-pointer bg-white group"
                      onClick={() => setView('explore')}
                    >
                      <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-[#0F766E] mb-4 group-hover:scale-110 transition-transform">
                        <Search className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">Eksplorasi UGD</h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest leading-loose">Temukan RS Terdekat Tanpa Analisis</p>
                    </div>
                    <div className="glass-card p-6 rounded-3xl shadow-sm border-2 border-white transition-all hover:translate-y-[-4px] cursor-pointer bg-white group">
                      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                        <Phone className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">Panggilan Darurat</h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest leading-loose">Direct Call ke Layanan 119 Jakarta</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 transition-transform group-hover:scale-125">
                       <ShieldAlert className="w-20 h-20" />
                    </div>
                    <h4 className="text-[10px] font-black text-teal-400 uppercase tracking-[3px] mb-4">Privasi & Keamanan</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">Data keluhan Anda dienkripsi dan diproses secara anonim untuk keamanan privasi medis Anda.</p>
                  </div>
                </div>
              </div>

              {/* Comprehensive Guide Section */}
              <div className="space-y-12 pt-8 pb-32">
                <div className="flex flex-col md:flex-row items-end justify-between border-b pb-8 border-slate-200 gap-4">
                  <div>
                    <Badge variant="outline" className="mb-4 text-[10px] font-black tracking-widest px-4 py-1.5 opacity-50 border-slate-300">PROTOKOL ANALISIS</Badge>
                    <h3 className="text-3xl font-bold text-slate-800">Bagaimana MediCepat Bekerja?</h3>
                  </div>
                  <p className="text-slate-500 text-sm md:max-w-md font-medium">Sistem kami menggunakan model AI Gemini untuk melakukan triase awal berdasarkan protokol medis standar internasional.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-6 relative">
                    <div className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-200 shadow-sm relative z-10">01</div>
                    <div className="absolute top-8 left-16 right-0 h-0.5 bg-slate-100 hidden md:block" />
                    <div className="bg-white p-2 rounded-2xl">
                      <h5 className="text-xl font-bold text-slate-800 mb-3">Deteksi Keluhan</h5>
                      <p className="text-sm text-slate-500 leading-relaxed">Masukkan gejala fisik atau mental secara bebas. AI kami mendeteksi kata kunci medis secara cerdas.</p>
                    </div>
                  </div>
                  <div className="space-y-6 relative">
                    <div className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-200 shadow-sm relative z-10">02</div>
                    <div className="absolute top-8 left-16 right-0 h-0.5 bg-slate-100 hidden md:block" />
                    <div className="bg-white p-2 rounded-2xl">
                      <h5 className="text-xl font-bold text-slate-800 mb-3">Triase Urgensi</h5>
                      <p className="text-sm text-slate-500 leading-relaxed">Sistem menentukan apakah kondisi Anda masuk kategori Hijau, Kuning, atau Merah (Gawat Darurat).</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-teal-600/30">03</div>
                    <div className="bg-white p-2 rounded-2xl">
                      <h5 className="text-xl font-bold text-slate-800 mb-3">Navigasi Langsung</h5>
                      <p className="text-sm text-slate-500 leading-relaxed">Dalam hitungan detik, Anda akan diarahkan ke unit gawat darurat atau klinik pengobatan spesialis terdekat.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 pt-2 pb-12"
            >
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6 max-w-md mx-auto">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-teal-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-teal-600" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">AI Menganalisis...</h3>
                    <p className="text-slate-500 text-sm max-w-[280px]">Mengevaluasi keluhan dalam database medis digital kami.</p>
                  </div>
                </div>
              ) : currentResult && (
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <div className="flex-1 space-y-6 w-full lg:max-w-xl">
                    <div className="flex items-center justify-between mb-2">
                      <Button variant="ghost" size="sm" onClick={() => setView('home')} className="font-bold text-slate-500 uppercase text-[10px] p-0 h-auto hover:bg-transparent hover:text-teal-600">
                         &larr; Mulai Ulang Analisis
                      </Button>
                      <Badge className={`${getUrgencyColor(currentResult.urgensi)} font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-[10px] shadow-sm`}>
                        SKOR URGENSI: {currentResult.urgensi}
                      </Badge>
                    </div>

                    <div className={`glass-card p-8 rounded-3xl shadow-xl border-l-8 ${isEmergency ? 'border-red-600' : 'border-teal-600'} bg-white overflow-hidden relative`}>
                      {isEmergency && (
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <AlertTriangle className="w-24 h-24 text-red-600" />
                        </div>
                      )}
                      
                      <div className="mb-8">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mb-4">Input Gejala Terdeteksi</h2>
                        <p className="text-2xl font-bold text-slate-800 leading-tight italic">"{activeInput}"</p>
                      </div>

                      <div className="grid grid-cols-1 gap-8">
                        <section className="space-y-6">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Brain className="w-4 h-4" /> Diagnosis Probabilitas
                          </h4>
                          <div className="space-y-6">
                            {currentResult.probabilitas.map((p, i) => (
                              <div key={i} className="space-y-3">
                                <div className="flex justify-between items-end">
                                  <span className="text-slate-800 font-extrabold text-lg">{p.kondisi}</span>
                                  <span className={`font-black text-lg ${isEmergency ? 'text-red-600' : 'text-teal-600'} bg-slate-50 px-2 rounded-lg`}>{p.skor}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: p.skor }}
                                    className={`h-full ${isEmergency ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-lg' : 'bg-gradient-to-r from-teal-500 to-emerald-600 shadow-lg'}`}
                                    transition={{ duration: 1.2, ease: "circOut" }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        <div className={`${isEmergency ? 'bg-red-50/50 border-red-100' : 'bg-teal-50/50 border-teal-100'} p-6 rounded-2xl border-2 backdrop-blur-sm`}>
                          <div className="flex items-center gap-2 mb-4">
                             <ShieldAlert className={`w-5 h-5 ${isEmergency ? 'text-red-600' : 'text-teal-600'}`} />
                             <h4 className={`text-[10px] font-black uppercase tracking-widest ${isEmergency ? 'text-red-700' : 'text-teal-700'}`}>TINDAKAN DARURAT AWAL:</h4>
                          </div>
                          <ul className={`text-base font-medium ${isEmergency ? 'text-red-900' : 'text-teal-900'} space-y-4`}>
                            {currentResult.saran_awal.map((s, i) => (
                              <li key={i} className="flex gap-4">
                                <span className={`mt-2 w-2 h-2 rounded-full shrink-0 ${isEmergency ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-teal-500 shadow-sm shadow-teal-500'}`} />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-100 bg-white">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Rekomendasi Spesialis</h3>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-[#0F766E] shrink-0">
                            <Stethoscope className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-slate-800 leading-snug">{currentResult.rekomendasi_spesialis}</p>
                        </div>
                      </div>
                      <div className="glass-card p-6 rounded-2xl shadow-sm border border-slate-100 bg-white">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Jenis Fasilitas</h3>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                            <MapIcon className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-slate-800 leading-snug">{currentResult.kategori_faskes}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-[1.2] w-full lg:sticky lg:top-24 space-y-6">
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-teal-600" />
                          Lokasi Bantuan Terdekat
                        </h3>
                        <Badge variant="outline" className="text-[8px] uppercase font-black tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100">GPS ONLINE</Badge>
                      </div>
                      <div className="rounded-3xl overflow-hidden border-4 border-white shadow-2xl h-[400px] lg:h-[500px]">
                        <FaskesMap urgency={currentResult.urgensi} onHospitalsFound={setRealFaskes} />
                      </div>
                    </section>

                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                       <div className="flex items-center justify-between mb-4">
                          <h4 className="font-black text-[10px] uppercase tracking-[2px] text-slate-500">Unit Reaksi Cepat</h4>
                          <span className="bg-teal-500 text-white font-black text-[8px] px-2 py-0.5 rounded uppercase">{realFaskes.length} RS Ditemukan</span>
                       </div>
                       <div className="space-y-4">
                         {realFaskes.slice(0, 3).map((f, i) => (
                           <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="flex items-center gap-3">
                                <img src={f.photoUrl} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                                <div>
                                  <p className="text-sm font-bold truncate max-w-[120px]">{f.name}</p>
                                  <p className="text-[10px] text-slate-400">⭐ {f.rating || '4.5'}</p>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                className="bg-teal-600 hover:bg-teal-500 h-8 rounded-lg text-[10px] font-black"
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}`)}
                              >
                                NAVIGASI
                              </Button>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Riwayat Keluhan</h3>
                <Button variant="ghost" size="sm" onClick={() => setView('home')} className="font-black text-[10px] uppercase">Tutup</Button>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-24 opacity-30 space-y-4">
                  <HistoryIcon className="w-16 h-16 mx-auto stroke-[1]" />
                  <p className="text-sm font-bold uppercase tracking-widest">Belum ada riwayat</p>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-180px)] pr-4">
                  <div className="space-y-4 pb-12">
                    {history.map((item) => (
                      <div 
                        key={item.id} 
                        className="glass-card p-5 rounded-2xl cursor-pointer hover:border-teal-500/30 transition-all border border-slate-100 group shadow-sm"
                        onClick={() => {
                          setCurrentResult(item.diagnosis);
                          setActiveInput(item.input);
                          setView('result');
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-black text-slate-400 flex items-center uppercase tracking-tighter">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Badge className={`${getUrgencyColor(item.diagnosis.urgensi)} text-[8px] font-black uppercase px-2 py-0`}>
                            {item.diagnosis.urgensi}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-700 line-clamp-2 leading-relaxed group-hover:text-teal-700 transition-colors">"{item.input}"</p>
                        <div className="mt-4 flex items-center text-[10px] font-black text-teal-600 uppercase tracking-widest">
                          Lihat Analisis <ChevronRight className="w-3 h-3 ml-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Interface */}
      {(view === 'home' || view === 'result' || view === 'history' || view === 'explore') && (
        <footer className="h-24 bg-white border-t border-slate-200 flex items-center justify-between px-8 fixed bottom-0 left-0 right-0 z-50">
          <div className="w-1/3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Status AI</p>
              <p className="text-[11px] text-slate-800 font-black">Aktif (V3 Flash)</p>
            </div>
          </div>

          <div className="w-1/3 flex justify-end gap-3">
            <Button 
              variant="outline" 
              className="rounded-xl border-2 border-teal-600 text-teal-600 font-black text-[10px] uppercase tracking-wider h-10 px-4 hidden sm:flex"
              onClick={() => setView('history')}
            >
              RIWAYAT
            </Button>
            <Button 
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] uppercase tracking-wider h-10 px-4"
              disabled={!currentResult}
              onClick={() => setView('result')}
            >
              HASIL
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

