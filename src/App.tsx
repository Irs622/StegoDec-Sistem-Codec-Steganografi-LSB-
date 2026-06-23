import React, { useState, useRef, useEffect } from "react";
import { 
  Shield, 
  Lock, 
  Unlock, 
  Download, 
  Upload, 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Copy, 
  Check, 
  AlertTriangle, 
  Cpu, 
  Terminal,
  Activity,
  Maximize2,
  Database,
  ArrowRight,
  Gauge,
  Clock,
  Eye,
  Settings
} from "lucide-react";
import { encryptText, decryptText, encodeImageLSB, decodeImageLSB, encodeEOFBytes, decodeEOFBytes } from "./utils/stego";

interface AnalysisResult {
  stealthScore: number;
  visualRisk: "Low" | "Medium" | "High";
  sizeRisk: "Low" | "Medium" | "High";
  cryptoRisk: "Low" | "Medium" | "High";
  analysisText: string;
  tips: string[];
}

export default function App() {
  // Encoder States
  const [encoderFile, setEncoderFile] = useState<File | null>(null);
  const [encoderPreview, setEncoderPreview] = useState<string | null>(null);
  const [encoderFileType, setEncoderFileType] = useState<string>("");
  const [secretMessage, setSecretMessage] = useState("");
  const [password, setPassword] = useState("");
  const [compression, setCompression] = useState<"none" | "light" | "medium" | "ultra">("light");
  const [decoyCategory, setDecoyCategory] = useState("Sharing Holiday Photos");
  
  // Decoy & Generation States
  const [decoyText, setDecoyText] = useState("");
  const [isGeneratingDecoy, setIsGeneratingDecoy] = useState(false);
  const [isProcessingStego, setIsProcessingStego] = useState(false);
  const [encodedFileUrl, setEncodedFileUrl] = useState<string | null>(null);
  const [encodedFileName, setEncodedFileName] = useState("");
  
  // Decoder States
  const [decoderFile, setDecoderFile] = useState<File | null>(null);
  const [decoderPreview, setDecoderPreview] = useState<string | null>(null);
  const [decoderFileType, setDecoderFileType] = useState<string>("");
  const [decodePassword, setDecodePassword] = useState("");
  const [extractedMessage, setExtractedMessage] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState("");
  
  // Live Analysis State
  const [securityAnalysis, setSecurityAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedDecoy, setCopiedDecoy] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);

  // System Stats Simulation
  const [systemUptime, setSystemUptime] = useState("10:14:00");
  const [activeThreads, setActiveThreads] = useState(12);

  // Timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const parts = systemUptime.split(":");
      let hrs = parseInt(parts[0]);
      let mins = parseInt(parts[1]);
      let secs = parseInt(parts[2]) + 1;
      if (secs >= 60) {
        secs = 0;
        mins += 1;
      }
      if (mins >= 60) {
        mins = 0;
        hrs += 1;
      }
      setSystemUptime(
        `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [systemUptime]);

  // Handle Encoder drop zone files
  const handleEncoderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setupEncoderFile(e.target.files[0]);
    }
  };

  const setupEncoderFile = (file: File) => {
    setEncoderFile(file);
    setEncodedFileUrl(null);
    setSecurityAnalysis(null);
    
    if (file.type.startsWith("image/")) {
      setEncoderFileType("IMAGE");
      const reader = new FileReader();
      reader.onload = () => setEncoderPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("audio/")) {
      setEncoderFileType("AUDIO");
      setEncoderPreview(null);
    } else if (file.type.startsWith("video/")) {
      setEncoderFileType("VIDEO");
      setEncoderPreview(null);
    } else {
      setEncoderFileType("GENERAL");
      setEncoderPreview(null);
    }
  };

  // Handle Decoder drop zone files
  const handleDecoderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setupDecoderFile(e.target.files[0]);
    }
  };

  const setupDecoderFile = (file: File) => {
    setDecoderFile(file);
    setExtractedMessage("");
    setDecodeError("");
    
    if (file.type.startsWith("image/")) {
      setDecoderFileType("IMAGE");
      const reader = new FileReader();
      reader.onload = () => setDecoderPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("audio/")) {
      setDecoderFileType("AUDIO");
      setDecoderPreview(null);
    } else if (file.type.startsWith("video/")) {
      setDecoderFileType("VIDEO");
      setDecoderPreview(null);
    } else {
      setDecoderFileType("GENERAL");
      setDecoderPreview(null);
    }
  };

  // Gemini decoy generator trigger
  const generateDecoyText = async () => {
    if (!secretMessage) {
      alert("Masukkan pesan rahasia terlebih dahulu agar AI mengetahui konteksnya.");
      return;
    }
    setIsGeneratingDecoy(true);
    try {
      const response = await fetch("/api/gemini/decoy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secretMessage,
          category: decoyCategory
        })
      });
      const data = await response.json();
      if (data.decoyText) {
        setDecoyText(data.decoyText);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingDecoy(false);
    }
  };

  // Steganography Processor
  const processHush = async () => {
    if (!encoderFile) {
      alert("Harap unggah file cover (Media Gambar/Audio/Video) terlebih dahulu.");
      return;
    }
    if (!secretMessage) {
      alert("Harap ketik pesan rahasia yang ingin disembunyikan.");
      return;
    }

    setIsProcessingStego(true);
    setEncodedFileUrl(null);

    try {
      const encryptedMsgPayload = encryptText(secretMessage, password || undefined);

      if (encoderFileType === "IMAGE" && encoderPreview) {
        const tempImg = new Image();
        tempImg.src = encoderPreview;
        tempImg.onload = () => {
          try {
            const result = encodeImageLSB(tempImg, encryptedMsgPayload, compression);
            setEncodedFileUrl(result.dataUrl);
            setEncodedFileName(`hushed_${encoderFile.name.split('.')[0]}.png`);
            setIsProcessingStego(false);
            
            runSecurityAudit(encoderFile.size / 1024, "IMAGE (PNG-LSB)", secretMessage.length, !!password);
          } catch (e: any) {
            alert("Gagal memproses piksel gambar: " + e.message);
            setIsProcessingStego(false);
          }
        };
      } else {
        const fileReader = new FileReader();
        fileReader.onload = () => {
          try {
            const arrayBuffer = fileReader.result as ArrayBuffer;
            const coverBytes = new Uint8Array(arrayBuffer);
            const encodedBytes = encodeEOFBytes(coverBytes, encryptedMsgPayload);
            
            const blob = new Blob([encodedBytes], { type: encoderFile.type });
            const blobUrl = URL.createObjectURL(blob);
            setEncodedFileUrl(blobUrl);
            setEncodedFileName(`hushed_${encoderFile.name}`);
            setIsProcessingStego(false);

            runSecurityAudit(encoderFile.size / 1024, encoderFileType, secretMessage.length, !!password);
          } catch (e: any) {
            alert("Error encoding bytes container: " + e.message);
            setIsProcessingStego(false);
          }
        };
        fileReader.readAsArrayBuffer(encoderFile);
      }
    } catch (err: any) {
      alert("Proses enkripsi gagal: " + err.message);
      setIsProcessingStego(false);
    }
  };

  // Perform Gemini AI Security Audit
  const runSecurityAudit = async (fileSizeKB: number, fileType: string, messageLength: number, hasPassword: boolean) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileSizeKB: Math.round(fileSizeKB),
          fileType,
          messageLength,
          hasPassword
        })
      });
      const data = await response.json();
      setSecurityAnalysis(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Decode Steganography
  const processExtraction = async () => {
    if (!decoderFile) {
      alert("Harap unggah file media yang telah disisipi (encoded media).");
      return;
    }

    setIsDecoding(true);
    setDecodeError("");
    setExtractedMessage("");

    try {
      if (decoderFileType === "IMAGE" && decoderPreview) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const tempImg = new Image();
        tempImg.src = decoderPreview;
        tempImg.onload = () => {
          try {
            canvas.width = tempImg.naturalWidth;
            canvas.height = tempImg.naturalHeight;
            ctx?.drawImage(tempImg, 0, 0);
            
            const imgData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            if (!imgData) throw new Error("Gagal memindai piksel gambar.");

            const rawSecret = decodeImageLSB(imgData.data);
            
            if (rawSecret) {
              try {
                const plaintext = decryptText(rawSecret, decodePassword || undefined);
                setExtractedMessage(plaintext);
              } catch (decryptErr: any) {
                setDecodeError(decryptErr.message || "Gagal mendekripsi payload.");
              }
            } else {
              tryEOFExtraction();
            }
          } catch (e: any) {
            setDecodeError("Gagal membaca steganografi piksel. File mungkin rusak atau tidak memuat kunci.");
            setIsDecoding(false);
          }
        };
      } else {
        tryEOFExtraction();
      }
    } catch (err: any) {
      setDecodeError(err.message || "Gagal mengekstrak.");
      setIsDecoding(false);
    }
  };

  const tryEOFExtraction = () => {
    if (!decoderFile) return;
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const arrayBuffer = fileReader.result as ArrayBuffer;
        const fileBytes = new Uint8Array(arrayBuffer);
        const rawSecret = decodeEOFBytes(fileBytes);

        if (!rawSecret) {
          setDecodeError("Pesan rahasia tidak ditemukan dalam file ini! Pastikan file benar-benar memuat rahasia.");
        } else {
          try {
            const plaintext = decryptText(rawSecret, decodePassword || undefined);
            setExtractedMessage(plaintext);
          } catch (decryptErr: any) {
            setDecodeError(decryptErr.message || "Gagal mendekripsi file.");
          }
        }
      } catch (e: any) {
        setDecodeError("Sistem parser gagal membaca payload EOF.");
      } finally {
        setIsDecoding(false);
      }
    };
    fileReader.readAsArrayBuffer(decoderFile);
  };

  const copyToClipboard = (text: string, type: "decoy" | "result") => {
    navigator.clipboard.writeText(text);
    if (type === "decoy") {
      setCopiedDecoy(true);
      setTimeout(() => setCopiedDecoy(false), 2000);
    } else {
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2000);
    }
  };

  // M Tricolor Stripe Component
  const MTricolorDivider = () => (
    <div className="flex h-1 w-full overflow-hidden select-none">
      <div className="bg-[#0066b1] h-full flex-1"></div>
      <div className="bg-[#1c69d4] h-full flex-1"></div>
      <div className="bg-[#e22718] h-full flex-1"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] font-sans flex flex-col selection:bg-[#e22718] selection:text-white overflow-x-hidden antialiased">
      
      {/* 4px M Tricolor Divider pinned at the very top of the window */}
      <div className="fixed top-0 left-0 w-full z-50">
        <MTricolorDivider />
      </div>

      {/* TOP NAVIGATION CHROME */}
      <nav className="h-16 border-b border-[#262626] bg-[#000000] flex items-center justify-between px-6 lg:px-12 mt-1 z-40">
        <div className="flex items-center gap-4">
          {/* Simulation of BMW M motorsport badge with HUSH_MEDIA wordmark */}
          <div className="flex items-center gap-1.5 font-bold tracking-tighter text-xl">
            <span className="text-white font-black italic tracking-widest text-[#ffffff]">HUSH</span>
            <span className="text-white italic tracking-widest font-light mr-1">MEDIA</span>
            <div className="flex flex-col gap-[2px] w-6 h-5 justify-center">
              <div className="h-[3px] w-full bg-[#0066b1]"></div>
              <div className="h-[3px] w-[85%] bg-[#1c69d4]"></div>
              <div className="h-[3px] w-[70%] bg-[#e22718]"></div>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono text-[#bbbbbb] border-l border-[#3c3c3c] pl-4 uppercase font-light">
            SECURITY MEDIA COURIER
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-5 text-[12px] font-bold tracking-[1.5px] uppercase">
            <span className="text-[#ffffff] border-b border-white pb-1">ENCODER</span>
            <span className="text-[#muted] opacity-60 hover:opacity-100 transition-opacity cursor-pointer">DECODER</span>
            <span className="text-[#muted] opacity-60 hover:opacity-100 transition-opacity cursor-pointer">LABS_API</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[#e22718] bg-[#e22718]/10 px-2.5 py-0.5 rounded-sm border border-[#e22718]/30 tracking-widest uppercase font-bold animate-pulse">
              LINE SECURED
            </span>
            <span className="text-[10px] font-mono text-[#bbbbbb]">V2.04</span>
          </div>
        </div>
      </nav>

      {/* FULL-BLEED AUTOMOTIVE INSPIRED BRAND BANNER */}
      <section className="relative bg-[#0d0d0d] border-b border-[#262626] py-16 px-6 lg:px-12 overflow-hidden flex flex-col justify-end min-h-[340px]">
        {/* Abstract Technical Matrix Lines Backdrop (Geometric & Carbon fiber vibe) */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none bg-[radial-gradient(#3c3c3c_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#e20015]/10 via-transparent to-transparent pointer-events-none opacity-45"></div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <span className="text-[14px] font-bold tracking-[2px] text-[#e22718] uppercase block mb-3 font-mono">
            // STEGANOGRAPHY INTEGRATION SYSTEM
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter uppercase mb-4 text-[#ffffff] font-sans max-w-4xl leading-none">
            ENGINEERED TO CONCEAL.<br />
            COMPRESSED FOR DELIVERIES.
          </h1>
          <p className="text-[16px] font-light text-[#bbbbbb] max-w-2xl leading-relaxed mb-6">
            HushMedia adalah brankas kurir pesan terenkripsi. Sembunyikan instruksi, password, atau teks rahasia ke dalam berkas media (Foto Liburan, Rekaman Lagu, Video) secara ringkas, ringan, dan tidak terdeteksi oleh sistem filter pihak ketiga.
          </p>
          
          <div className="flex gap-4">
            <a href="#payload-terminal" className="bg-[#ffffff] text-[#000] hover:bg-[#bbbbbb] h-12 px-8 flex items-center justify-center text-xs font-bold tracking-[2px] transition-all uppercase rounded-none">
              INTEGRASI PANELS
            </a>
            <div className="border border-[#3c3c3c] hover:border-white text-white h-12 px-6 flex items-center justify-center text-xs font-bold tracking-[1.5px] transition-all uppercase rounded-none gap-2 font-mono">
              <Clock className="w-4 h-4 text-[#0066b1]" />
              UPTIME: {systemUptime}
            </div>
          </div>
        </div>

        {/* Brand identity accent marker bottom margin */}
        <div className="absolute bottom-0 left-0 w-full h-[3px]">
          <MTricolorDivider />
        </div>
      </section>

      {/* CORE WORKING PANELS: TWO COLUMN INTENSE LAYOUT */}
      <main id="payload-terminal" className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-16 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* INPUT ENCODER PANEL */}
        <section className="bg-[#0d0d0d] border border-[#262626] rounded-none p-6 md:p-8 relative flex flex-col justify-between">
          
          {/* Subtle decoration marker */}
          <div className="absolute top-0 right-0 w-16 h-[2px] bg-[#e22718]"></div>
          
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-mono text-[#bbbbbb] tracking-widest uppercase">
                [ SERVICE_MODULE_01 ]
              </span>
              <span className="text-[10px] font-mono text-[#e22718] font-bold">ENCODER ACTIVE</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tighter uppercase text-white mb-6 flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-[#e22718] inline-block rounded-none"></span>
              SEMBUNYIKAN PESAN (ENCODE)
            </h2>

            <div className="space-y-6">
              
              {/* Cover File Upload - 0px radius custom drop container */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold tracking-[1px] text-white uppercase font-mono">
                  01. UNGGAH COVER CONTAINER (FILE MEDIA)
                </label>
                <div className="relative border border-[#3c3c3c] bg-[#000000] p-6 text-center hover:border-white transition-all flex flex-col items-center justify-center min-h-[140px] rounded-none group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*,audio/*,video/*" 
                    onChange={handleEncoderFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  
                  {encoderFile ? (
                    <div className="relative z-20 pointer-events-none flex flex-col items-center">
                      {encoderFileType === "IMAGE" && encoderPreview ? (
                        <img 
                          src={encoderPreview} 
                          alt="Encoder preview" 
                          className="max-h-24 w-auto object-contain border border-[#3c3c3c] mb-3"
                        />
                      ) : encoderFileType === "AUDIO" ? (
                        <Music className="w-10 h-10 text-[#0066b1] mb-2 animate-pulse" />
                      ) : (
                        <Video className="w-10 h-10 text-[#e22718] mb-2" />
                      )}
                      
                      <span className="text-xs text-white font-bold tracking-tight max-w-[280px] truncate block mb-1">
                        {encoderFile.name}
                      </span>
                      <span className="text-[10px] text-[#bbbbbb] font-mono lowercase">
                        {encoderFileType} • {(encoderFile.size / 1024).toFixed(1)} KB • {encoderFile.type || "binary"}
                      </span>
                    </div>
                  ) : (
                    <div className="pointer-events-none flex flex-col items-center">
                      <Upload className="w-8 h-8 text-[#bbbbbb] group-hover:text-white transition-colors mb-2 font-light" />
                      <span className="text-[12px] text-[#ffffff] font-bold tracking-[1px] block mb-1">
                        DRAG & DROP COVER FILE (MAX 10MB)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block uppercase">
                        SUPPORTED: PNG, JPG, JPEG, MP3, WAV, MP4
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Secret Message Input */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold tracking-[1px] text-white uppercase font-mono">
                    02. PESAN RAHASIA YANG AKAN DISISIPKAN
                  </label>
                  <span className="text-[9px] font-mono text-[#bbbbbb] bg-[#262626] px-1.5 py-0.5">{secretMessage.length} CHR</span>
                </div>
                <textarea
                  value={secretMessage}
                  onChange={(e) => setSecretMessage(e.target.value)}
                  placeholder="Ketik rahasia terdalam Anda di sini..."
                  className="w-full bg-[#000000] border border-[#3c3c3c] text-white focus:outline-none focus:border-white p-3 text-xs font-mono h-28 rounded-none leading-relaxed"
                />
              </div>

              {/* Password and Compression Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold tracking-[1px] text-white uppercase font-mono">
                    PASSWORD LOCK (OPTIONAL)
                  </label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="SANDI DEKRIPSI"
                      className="w-full bg-[#000000] border border-[#3c3c3c] text-white focus:outline-none focus:border-white px-3 py-2 text-xs font-mono rounded-none"
                    />
                    <Lock className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#3c3c3c]" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold tracking-[1px] text-white uppercase font-mono">
                    COMPRESSION POWER
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(["none", "light", "medium", "ultra"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setCompression(lvl)}
                        className={`text-[9px] font-bold py-2 rounded-none text-center border uppercase transition-all ${
                          compression === lvl 
                            ? "bg-[#ffffff] text-black border-white" 
                            : "bg-[#000000] text-[#bbbbbb] border-[#3c3c3c] hover:border-[#bbbbbb]"
                        }`}
                      >
                        {lvl === "none" ? "OFF" : lvl === "light" ? "LIGHT" : lvl === "medium" ? "MED" : "ULTRA"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gemini Decoy Block */}
              <div className="border border-[#262626] p-4 bg-[#050505] space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-[11px] font-bold tracking-[1px] text-white uppercase font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#e22718]" />
                    AI DECOY SAMARAN (GEMINI 3.5 FLASH)
                  </span>
                  <select
                    value={decoyCategory}
                    onChange={(e) => setDecoyCategory(e.target.value)}
                    className="bg-[#000000] text-[10px] text-white border border-[#3c3c3c] rounded-none px-2 py-0.5 font-mono focus:outline-none"
                  >
                    <option value="Casual Greeting">Sapaan Santai</option>
                    <option value="Sharing Holiday Photos">Berbagi Foto Liburan</option>
                    <option value="Academic Project">Tugas Sekolah / Rekan Kuliah</option>
                    <option value="Job Proposal / Business">Korespondensi Kerja</option>
                    <option value="Technical Documentation">Dokumentasi IT</option>
                  </select>
                </div>

                <p className="text-[11px] text-[#bbbbbb] leading-normal font-light">
                  AI akan memformulasikan kalimat kamuflase yang sangat terlihat natural saat disandingkan dengan media rahasia, guna mengaburkan kecurigaan saat dikirim lewat chat.
                </p>

                <button
                  type="button"
                  onClick={generateDecoyText}
                  disabled={isGeneratingDecoy || !secretMessage}
                  className="w-full bg-[#000000] text-[#ffffff] hover:bg-white hover:text-black border border-[#3c3c3c] py-2 text-xs font-bold tracking-[1.5px] transition-all uppercase rounded-none cursor-pointer disabled:opacity-30"
                >
                  {isGeneratingDecoy ? "PROSESING PEMBUATAN..." : "GENERILASI SAMARAN (AI)"}
                </button>

                {decoyText && (
                  <div className="bg-[#000000] border border-[#262626] p-2.5 relative">
                    <div className="absolute top-2.5 right-2.5 flex gap-1 z-20">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(decoyText, "decoy")}
                        className="p-1 rounded-none bg-[#1a1a1a] border border-[#3c3c3c] text-white hover:bg-[#333333]"
                        title="Salin Teks Umpan"
                      >
                        {copiedDecoy ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[9px] text-[#bbbbbb] tracking-widest block mb-1 uppercase font-mono">UMPAN KAMUFLASE GENERATED:</span>
                    <p className="text-xs text-white pr-7 break-words font-mono whitespace-pre-wrap leading-relaxed">
                      {decoyText}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="mt-8 border-t border-[#262626] pt-6 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={processHush}
              disabled={isProcessingStego || !encoderFile || !secretMessage}
              className="flex-1 bg-white text-black font-extrabold hover:bg-[#bbbbbb] py-3 text-xs tracking-[2px] uppercase rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
            >
              {isProcessingStego ? (
                <span>MEMPROSES PENYISIPAN...</span>
              ) : (
                <>
                  <Shield className="w-4 h-4 fill-black text-black" />
                  PROCESS & HUSH MEDIA
                </>
              )}
            </button>

            {encodedFileUrl && (
              <a
                href={encodedFileUrl}
                download={encodedFileName}
                className="bg-[#1c69d4] hover:bg-blue-600 text-white font-extrabold px-6 py-3 text-xs tracking-[1.5px] uppercase rounded-none flex items-center justify-center gap-2 border border-blue-400/50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                UNDUH FILE STEGO
              </a>
            )}
          </div>
        </section>

        {/* OUTPUT DECODER PANEL */}
        <section className="bg-[#0d0d0d] border border-[#262626] rounded-none p-6 md:p-8 relative flex flex-col justify-between">
          
          {/* Subtle blue decoration marker */}
          <div className="absolute top-0 right-0 w-16 h-[2px] bg-[#1c69d4]"></div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-mono text-[#bbbbbb] tracking-widest uppercase">
                [ SERVICE_MODULE_02 ]
              </span>
              <span className="text-[10px] font-mono text-[#60a5fa] font-bold">DECODER STANDBY</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tighter uppercase text-white mb-6 flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-[#1c69d4] inline-block rounded-none"></span>
              BONGKAR PESAN RAHASIA (DECODE)
            </h2>

            <div className="space-y-6">
              
              {/* Stego File Input Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold tracking-[1px] text-white uppercase font-mono">
                  01. UNGGAH FILE STEGO YG INGIN DI-EXTRACT
                </label>
                <div className="relative border border-[#3c3c3c] bg-[#000000] p-6 text-center hover:border-white transition-all flex flex-col items-center justify-center min-h-[140px] rounded-none group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*,audio/*,video/*"
                    onChange={handleDecoderFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  {decoderFile ? (
                    <div className="relative z-20 pointer-events-none flex flex-col items-center">
                      {decoderFileType === "IMAGE" && decoderPreview ? (
                        <img 
                          src={decoderPreview} 
                          alt="Decoder preview" 
                          className="max-h-24 w-auto object-contain border border-[#3c3c3c] mb-3"
                        />
                      ) : decoderFileType === "AUDIO" ? (
                        <Music className="w-10 h-10 text-[#0066b1] mb-2 animate-pulse" />
                      ) : (
                        <Video className="w-10 h-10 text-[#e22718] mb-2" />
                      )}

                      <span className="text-xs text-white font-bold tracking-tight max-w-[280px] truncate block mb-1">
                        {decoderFile.name}
                      </span>
                      <span className="text-[10px] text-[#bbbbbb] font-mono lowercase">
                        {decoderFileType} • {(decoderFile.size / 1024).toFixed(1)} KB • {decoderFile.type || "binary"}
                      </span>
                    </div>
                  ) : (
                    <div className="pointer-events-none flex flex-col items-center">
                      <Upload className="w-8 h-8 text-[#bbbbbb] group-hover:text-white transition-colors mb-2 font-light" />
                      <span className="text-[12px] text-[#60a5fa] font-bold tracking-[1px] block mb-1">
                        UPLOAD MEDIA STEGO HERE
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block uppercase">
                        MASUKKAN FILE GAMBAR / SUARA / VIDEO HASIL SISIPAN
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Decode Password Input */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold tracking-[1px] text-white uppercase font-mono">
                  MASUKKAN KATA SANDI (JIKA DIKUNCI PAS ENCODE)
                </label>
                <div className="relative">
                  <input 
                    type="password"
                    value={decodePassword}
                    onChange={(e) => setDecodePassword(e.target.value)}
                    placeholder="KUNCI PENGAMAN"
                    className="w-full bg-[#000000] border border-[#3c3c3c] text-white focus:outline-none focus:border-white px-3 py-2 text-xs font-mono rounded-none"
                  />
                  <Unlock className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#3c3c3c]" />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={processExtraction}
                disabled={isDecoding || !decoderFile}
                className="w-full border border-white text-white hover:bg-white hover:text-black font-extrabold py-3 text-xs tracking-[2px] transition-all uppercase rounded-none cursor-pointer disabled:opacity-30"
              >
                {isDecoding ? "MENGEKSTRAK..." : "PROSES EKSTRAKSI (START DECODE)"}
              </button>

              {/* Decrypted Payload Result block */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold tracking-[1px] text-white uppercase font-mono">
                  EXTRACTED DECRYPTION PAYLOAD
                </label>
                <div className="bg-[#000000] border border-[#3c3c3c] min-h-[142px] p-4 font-mono text-xs relative overflow-y-auto max-h-[220px]">
                  
                  {!extractedMessage && !decodeError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-3 text-center">
                      <Lock className="w-5 h-5 text-slate-400 mb-2 animate-pulse" />
                      <span className="text-[10px] text-slate-400 tracking-[1px] uppercase block mb-1">
                        SILAKAN UNGGAH DAN DECODE MEDIA LIAR
                      </span>
                      <span className="text-[8px] text-slate-600 uppercase">
                        Keluaran teks rahasia akan dicetak di sini setelah proses dekripsi
                      </span>
                    </div>
                  )}

                  {decodeError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c0205] text-center p-4 border border-red-500/30">
                      <AlertTriangle className="w-6 h-6 text-[#e22718] mb-2 animate-bounce" />
                      <span className="text-[10px] text-red-500 font-extrabold uppercase">DECODE_FAILS</span>
                      <p className="text-[11px] text-[#bbbbbb] mt-2 font-mono whitespace-pre-wrap leading-relaxed max-w-sm border border-red-500/20 bg-black/60 p-2">
                        {decodeError}
                      </p>
                    </div>
                  )}

                  {extractedMessage && (
                    <div className="relative">
                      <div className="flex justify-between items-center border-b border-[#262626] pb-2 mb-3">
                        <span className="text-[10px] text-green-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> EXTRACT_FOUND_SUCCESS:
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(extractedMessage, "result")}
                          className="p-1 rounded-none bg-[#111111] hover:bg-[#333333] border border-[#3c3c3c] text-white"
                          title="Salin hasil pesan"
                        >
                          {copiedResult ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-white bg-[#0a0a0a] p-3 border border-emerald-500/20 rounded-none text-xs leading-relaxed whitespace-pre font-mono break-all selection:bg-emerald-600 select-text">
                        {extractedMessage}
                      </p>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>

          <div className="text-[9px] text-slate-500 font-mono tracking-widest mt-8 uppercase border-t border-[#262626] pt-4 text-right">
            COURIER DECODER UNIT INTEL
          </div>
        </section>

      </main>

      {/* SYSTEM HARDWARE AUDIT: STEG-ANALYSIS REPORT PORTLET */}
      <section className="bg-[#000000] border-t border-b border-[#262626] py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto w-full">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#262626] pb-6 mb-8 gap-4">
            <div>
              <span className="text-[13px] font-bold tracking-[2px] text-[#e22718] block uppercase font-mono mb-2">
                // SYSTEM SECURITY INTEGRITY REPORT
              </span>
              <h3 className="text-3xl font-black uppercase tracking-tight text-white m-0">
                CYBER STEG-AUDIT METRICS
              </h3>
            </div>
            <div className="text-xs text-[#bbbbbb] font-mono flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-green-500 animate-pulse"></span>
              <span>ENGINE STATS: ACTIVE (12 THREADS MULTIPROCESSOR)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Thread Uptime Panel */}
            <div className="bg-[#0d0d0d] border border-[#262626] p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#bbbbbb] block uppercase font-mono tracking-widest mb-4">// DEVICE STATUS</span>
                
                <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between border-b border-[#262626] pb-2">
                    <span className="text-[#bbbbbb]">CPU_CORE_STATUS</span>
                    <span className="text-white font-bold uppercase">SECURED</span>
                  </div>
                  <div className="flex justify-between border-b border-[#262626] pb-2">
                    <span className="text-[#bbbbbb]">ACTIVE_COURIER_THREADS</span>
                    <span className="text-white font-bold">{activeThreads} INSTANCES</span>
                  </div>
                  <div className="flex justify-between border-b border-[#262626] pb-2">
                    <span className="text-[#bbbbbb]">DECRYPT_LATENCY</span>
                    <span className="text-white font-bold">1.2ms / AVERAGE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#bbbbbb]">AUDIT_PROTOCOL</span>
                    <span className="text-[#e22718] font-black uppercase">AES_VIGENERE_INTEGRAL</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#262626]">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                  <span>Hush Stealth Compression ratio</span>
                  <span>64.2%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1a1a1a] rounded-none flex overflow-hidden">
                  <div className="bg-[#0066b1] h-full" style={{ width: '33.3%' }}></div>
                  <div className="bg-[#1c69d4] h-full" style={{ width: '33.3%' }}></div>
                  <div className="bg-[#e22718] h-full" style={{ width: '33.3%' }}></div>
                </div>
              </div>
            </div>

            {/* AI Security Diagnostics */}
            <div className="lg:col-span-2 bg-[#0d0d0d] border border-[#262626] p-6">
              <span className="text-[10px] text-[#bbbbbb] block uppercase font-mono tracking-widest mb-4">// INTEL SPECTRAL RECONNAISSANCE</span>

              {securityAnalysis ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-mono font-bold uppercase">STEALTH POWER:</span>
                      <span className="text-lg font-black text-[#e22718] bg-white font-mono text-black px-2.5 py-0.5">
                        {securityAnalysis.stealthScore} / 100
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-none border ${
                        securityAnalysis.visualRisk === "Low" ? "text-green-500 border-green-500/30 bg-green-500/5" : "text-amber-500 border-amber-500/30 bg-amber-500/5"
                      }`}>
                        VIS_RISK: {securityAnalysis.visualRisk}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-none border ${
                        securityAnalysis.sizeRisk === "Low" ? "text-green-500 border-green-500/30 bg-green-500/5" : "text-amber-500 border-amber-500/30 bg-amber-500/5"
                      }`}>
                        SIZE_RISK: {securityAnalysis.sizeRisk}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-none border ${
                        securityAnalysis.cryptoRisk === "Low" ? "text-green-500 border-green-500/30 bg-green-500/5" : "text-[#e22718] border-red-500/30 bg-red-500/5"
                      }`}>
                        CRYPTO_RISK: {securityAnalysis.cryptoRisk}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#000000] border-l-4 border-[#e22718] p-4">
                    <p className="text-xs font-mono text-white leading-relaxed whitespace-pre-wrap">
                      {securityAnalysis.analysisText}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">REWARDING PROCEDURES (RECOMMENDED TIPS):</span>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {securityAnalysis.tips.map((tip, idx) => (
                        <li key={idx} className="text-xs text-[#bbbbbb] font-mono flex items-start gap-2">
                          <span className="text-[#e22718] font-black">▶</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="h-44 flex flex-col items-center justify-center text-center">
                  <div className="flex gap-[3px] mb-3 select-none">
                    <div className="w-2.5 h-6 bg-[#0066b1] animate-bounce delay-75"></div>
                    <div className="w-2.5 h-6 bg-[#1c69d4] animate-bounce delay-150"></div>
                    <div className="w-2.5 h-6 bg-[#e22718] animate-bounce delay-300"></div>
                  </div>
                  <span className="text-xs font-mono text-white uppercase tracking-widest animate-pulse">
                    GENERATING ADVANCED MULTILAYER SECURITY REPORT VIA GEMINI...
                  </span>
                  <span className="text-[10px] text-slate-500 mt-2 uppercase font-mono">
                    Menganalisa payload distortion, byte density anomalies, dan entropy visual...
                  </span>
                </div>
              ) : (
                <div className="h-44 border border-dashed border-[#262626] flex flex-col items-center justify-center text-center p-6">
                  <Eye className="w-8 h-8 text-[#3c3c3c] mb-2" />
                  <span className="text-xs font-mono text-[#bbbbbb] uppercase tracking-widest block mb-1">
                    STANDBY LOG SECURED ENCODER DETECTOR
                  </span>
                  <span className="text-[10px] text-slate-500 max-w-md font-mono uppercase">
                    Silakan letakkan data pesan dan cover file lantas luncurkan operasi HUSH di sebelah kiri untuk menghasilkan status intel steganografi di panel analisis ini.
                  </span>
                </div>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* MOTORSPORT-INSPIRED HARDWARE OPERATING USER-MANUAL SECTION */}
      <section className="bg-[#050505] py-16 px-6 lg:px-12 text-[#ffffff]">
        <div className="max-w-7xl mx-auto w-full">
          
          <div className="border-b border-[#262626] pb-6 mb-8">
            <span className="text-[13px] font-bold tracking-[2px] text-[#0066b1] uppercase font-mono block mb-2">
              // HUSH_MEDIA PROTOCOL LABS
            </span>
            <h3 className="text-3xl font-black uppercase tracking-tight text-white">
              MANUAL OPERASIONAL (AGENT HANDBOOK)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs font-mono text-[#bbbbbb] leading-relaxed">
            <div className="border-l-2 border-[#0066b1] pl-4 space-y-2">
              <span className="text-white font-extrabold uppercase block tracking-wider text-[11px]">
                01_ALUR PENYANDIAN (ENCODER)
              </span>
              <p className="font-light">
                Unggah file utama Anda sebagai penyamar (cover) pesan rahasia di dalam form pembungkus. Ketikkan pesan inti yang ingin diisikan. Agar terlindung dari analisis visual yang tajam, kami sarankan Anda memasang Kata Sandi pembuka. Tekan tombol &apos;PROCESS & HUSH&apos; untuk memicu algoritma penyisipan bit LSB/EOF kami.
              </p>
            </div>

            <div className="border-l-2 border-[#1c69d4] pl-4 space-y-2">
              <span className="text-white font-extrabold uppercase block tracking-wider text-[11px]">
                02_PENGIRIMAN KAMUFLASE (CARRIER)
              </span>
              <p className="font-light">
                Setelah dokumen stego berhasil diunduh, manfaatkan fitur AI Decoy generator yang ditenagai Gemini AI untuk merangkai kalimat sapaan/korespondensi yang kasual sehingga file yang Anda lampirkan sekilas terlihat normal dan wajar. Pengiriman lewat email/WA kini aman dari sensor.
              </p>
            </div>

            <div className="border-l-2 border-[#e22718] pl-4 space-y-2">
              <span className="text-white font-extrabold uppercase block tracking-wider text-[11px]">
                03_EKSTRAKSI DAN BONGKAR (DECODER)
              </span>
              <p className="font-light">
                Penerima mengunduh lampiran Anda, membuka modul pembongkar di panel sisi kanan HushMedia, melaraskan file tersebut, menyematkan Kunci Kata Sandi yang tepat, dan mengetuk &apos;START EXTRACTION&apos;. Sistem Hush-core akan mendeteksi penanda khusus steganografi dan memulihkan payload pesan asli.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* BRUTALIST INDUSTRIAL HARDWARE FOOTER */}
      <footer className="bg-[#000000] border-t border-[#262626] py-12 px-6 lg:px-12 mt-auto">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-[11px] font-mono text-[#bbbbbb] font-light">
          
          <div className="space-y-1.5 text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-white font-black italic tracking-wider text-xs">HUSH_MEDIA</span>
              <span className="text-[#3c3c3c]">|</span>
              <span className="text-white uppercase font-bold text-[10px]">COURIER TEAM INDUSTRIAL</span>
            </div>
            <p className="text-[10px] uppercase tracking-wide">
              Secure Communications Platform // Manufactured in strict accordance with cryptographic compliance.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            <div>
              TOTAL_DATA_CONCEALED: <span className="text-white">12.4 GB</span>
            </div>
            <div>
              CRYPTO_INTEGRITY: <span className="text-[#0066b1]">SHA-256 SYSTEM ACTIVE</span>
            </div>
            <div>
              ACCURACY_LIMITS: <span className="text-green-400">100% BIT PERFECT</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto w-full text-center mt-12 text-[9px] text-[#3c3c3c] tracking-[0.4em] uppercase select-none">
          HUSHMEDIA MOTORSPORT COURIER CO — PROPRIETARY LABS INTERFACE v2.04
        </div>
      </footer>

    </div>
  );
}
