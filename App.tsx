import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Sparkles, 
  Upload, 
  Download, 
  FileOutput, 
  AlertCircle,
  Loader2,
  BookOpen,
  Lightbulb,
  Eye,
  Briefcase,
  Dna,
  Languages,
  Search,
  User,
  Globe,
  Settings,
  ShieldCheck,
  Camera,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { generateBrandingProfile, performFactCheck, translateBrandingProfileContent, researchPersonOnWeb, generateProfessionalPortrait } from './services/geminiService';
import { BrandingResult, FactCheckResult, AppState } from './types';
import { ResultCard } from './components/ResultCard';

// jsPDF is loaded via CDN in index.html
declare const jspdf: any;
declare const window: any;

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [inputType, setInputType] = useState<'text' | 'search'>('search');
  const [searchName, setSearchName] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [processingStep, setProcessingStep] = useState<string>("");
  
  const [originalBrandingResult, setOriginalBrandingResult] = useState<BrandingResult | null>(null);
  const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
  const [activeTab, setActiveTab] = useState<'branding' | 'factcheck'>('branding');
  
  const [outputLanguage, setOutputLanguage] = useState<'auto' | 'en' | 'ar' | 'so'>('auto'); 
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'ar' | 'so'>('en'); 
  const [translatedBrandingCache, setTranslatedBrandingCache] = useState<Record<string, BrandingResult | null>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const exists = await window.aistudio.hasSelectedApiKey();
      setHasKey(exists);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    setHasKey(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setInputText(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setProfileImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const generateAIPortrait = async () => {
    if (!searchName.trim()) {
      setErrorMessage("Please enter a name first to generate a portrait.");
      return;
    }
    setIsGeneratingPortrait(true);
    try {
      const portrait = await generateProfessionalPortrait(searchName, searchTitle);
      setProfileImage(portrait);
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to generate AI portrait. Try manual upload.");
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  const processContent = async () => {
    setAppState(AppState.PROCESSING);
    setErrorMessage(null);
    setOriginalBrandingResult(null);
    setFactCheckResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setErrorMessage("Request timed out. Search or generation took too long.");
      setAppState(AppState.ERROR);
    }, 180000);

    try {
      let finalInputText = inputText;

      if (inputType === 'search') {
        if (!searchName.trim()) throw new Error("Please enter a name to search.");
        setProcessingStep("Searching internet records (requires project quota)...");
        finalInputText = await researchPersonOnWeb(searchName, searchTitle);
      }

      setProcessingStep("Generating comprehensive professional profile...");
      const [branding, facts] = await Promise.all([
        generateBrandingProfile(finalInputText, outputLanguage),
        performFactCheck(finalInputText)
      ]);

      clearTimeout(timeoutId);
      setOriginalBrandingResult(branding);
      setTranslatedBrandingCache({ [branding.language]: branding });
      setDisplayLanguage(branding.language);
      setFactCheckResult(facts);
      setAppState(AppState.COMPLETE);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(error);
      let msg = error.message || "An error occurred.";
      if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("429")) {
        msg = "Quota Exhausted: Your current project has reached its Gemini API limit.";
      }
      setErrorMessage(msg);
      setAppState(AppState.ERROR);
    } finally {
      setProcessingStep("");
    }
  };

  const handleDisplayLanguageChange = async (newLang: 'en' | 'ar' | 'so') => {
    if (!originalBrandingResult || isTranslating || newLang === displayLanguage) return;
    setDisplayLanguage(newLang);
    if (translatedBrandingCache[newLang]) return;

    setIsTranslating(true);
    try {
      const translated = await translateBrandingProfileContent(originalBrandingResult, originalBrandingResult.language, newLang);
      setTranslatedBrandingCache(prev => ({ ...prev, [newLang]: translated }));
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const currentBrandingResult = translatedBrandingCache[displayLanguage] || originalBrandingResult;

  const exportPDF = () => {
    if (!currentBrandingResult) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    let yPos = 20;
    const margin = 20;
    const lineHeight = 7;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = pageWidth - (2 * margin);

    if (profileImage) {
      // Add profile image at top center
      const imgWidth = 40;
      const imgHeight = 40;
      const xPos = (pageWidth - imgWidth) / 2;
      doc.addImage(profileImage, 'PNG', xPos, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
    }

    const addText = (text: string, isBold: boolean = false, fontSize: number = 12, indent: number = 0) => {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      const splitText = doc.splitTextToSize(text, textWidth - indent);
      if (yPos + (splitText.length * lineHeight) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(splitText, margin + indent, yPos);
      yPos += (splitText.length * lineHeight) + 5;
    };

    const addHeading = (title: string, fontSize: number = 16) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      if (yPos > margin && yPos + 15 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
      } else {
        yPos += 10;
      }
      doc.text(title, margin, yPos);
      yPos += 10;
    };

    if (currentBrandingResult.language === 'ar') doc.setR2L(true);
    else doc.setR2L(false);

    addHeading("Executive Summary", 20);
    addText(currentBrandingResult.executiveSummary);
    addHeading("Professional Biography");
    addText(currentBrandingResult.professionalBio);
    addHeading("Key Impact & Achievements");
    currentBrandingResult.keyAchievements.forEach((point) => addText(`• ${point}`, false, 12, 10));
    addHeading("Core Expertise & Skills");
    currentBrandingResult.coreExpertise.forEach((skill) => addText(`• ${skill}`, false, 12, 10));
    addHeading("Professional Philosophy & Values");
    addText(currentBrandingResult.professionalPhilosophy);
    addHeading("Vision & Future Outlook");
    addText(currentBrandingResult.visionAndOutlook);
    addHeading("Project Highlights");
    currentBrandingResult.projectHighlights.forEach((p, i) => {
      addText(`Project ${i + 1}: ${p.title}`, true, 14);
      addText(p.description, false, 12, 10);
      yPos += 5;
    });

    doc.save(`Professional_Profile_${currentBrandingResult.language.toUpperCase()}.pdf`);
  };

  const exportWord = () => {
    if (!currentBrandingResult) return;
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>body { font-family: 'Inter', sans-serif; line-height: 1.6; margin: 40px; } h1 { font-size: 24px; color: #1e293b; } h2 { font-size: 20px; color: #334155; } p { margin-bottom: 10px; text-align: ${currentBrandingResult.language === 'ar' ? 'right' : 'left'}; } .profile-img { width: 150px; height: 150px; border-radius: 75px; margin: 0 auto 20px; display: block; }</style></head>
      <body dir="${currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}">
        ${profileImage ? `<img src="${profileImage}" class="profile-img" />` : ''}
        <h1>Professional Profile (${currentBrandingResult.language.toUpperCase()})</h1>
        <h2>Executive Summary</h2><p>${currentBrandingResult.executiveSummary}</p>
        <h2>Professional Biography</h2><p>${currentBrandingResult.professionalBio}</p>
        <h2>Key Impact & Achievements</h2><ul>${currentBrandingResult.keyAchievements.map(i => `<li>${i}</li>`).join('')}</ul>
        <h2>Core Expertise & Skills</h2><ul>${currentBrandingResult.coreExpertise.map(i => `<li>${i}</li>`).join('')}</ul>
        <h2>Philosophy</h2><p>${currentBrandingResult.professionalPhilosophy}</p>
        <h2>Vision</h2><p>${currentBrandingResult.visionAndOutlook}</p>
        <h2>Projects</h2>${currentBrandingResult.projectHighlights.map(p => `<h3>${p.title}</h3><p>${p.description}</p>`).join('')}
      </body></html>`;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Profile_${currentBrandingResult.language.toUpperCase()}.doc`;
    link.click();
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Project Setup Required</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            To use the advanced search and branding features, you must select an API key from a <strong>paid Google Cloud project</strong>.
          </p>
          <button onClick={handleSelectKey} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95 mb-4">
            Connect API Project
          </button>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm font-medium hover:underline">
            Learn about API billing & quotas
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg"><Sparkles className="w-5 h-5 text-white" /></div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">Profyle AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 font-medium hidden sm:block">Advanced Somali AI Engine</div>
            <button onClick={handleSelectKey} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Change API Project">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full flex flex-col gap-8">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Research & Design</h2>
              <p className="text-slate-500">Choose how to gather profile information.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setInputType('search')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${inputType === 'search' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Search className="w-4 h-4" /> Web Search
              </button>
              <button onClick={() => setInputType('text')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${inputType === 'text' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <FileText className="w-4 h-4" /> Manual Text
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_240px] gap-8">
            <div className="flex flex-col gap-4">
              {inputType === 'search' ? (
                <div className="flex flex-col gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Magaca oo buuxa (e.g. Yusuf Hussein)" 
                        className="w-full pl-12 pr-4 py-4 bg-slate-800 text-white rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Xilka ama Shaqada (e.g. Xildhibaan)" 
                        className="w-full pl-12 pr-4 py-4 bg-slate-800 text-white rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTitle}
                        onChange={(e) => setSearchTitle(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> AI-du waxay internet-ka ka soo baari doontaa dhamaan macluumaadka la heli karo.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    className="w-full h-48 p-4 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Paste raw data here or import a text file."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-4 right-4 text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-600 transition-colors flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Import
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md" />
                </div>
              )}
            </div>

            {/* Profile Picture Section */}
            <div className="flex flex-col items-center gap-4">
              <label className="text-sm font-semibold text-slate-700 w-full text-center">Profile Picture (1:1)</label>
              <div className="relative w-40 h-40 group">
                <div className="w-full h-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-300">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  )}
                  {isGeneratingPortrait && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                  )}
                </div>
                {profileImage && (
                  <button onClick={() => setProfileImage(null)} className="absolute -top-2 -right-2 bg-white border border-slate-200 p-1 rounded-full shadow-sm hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full">
                <button onClick={() => imageInputRef.current?.click()} className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">
                  <Camera className="w-3.5 h-3.5" /> Upload Photo
                </button>
                <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                <button 
                  onClick={generateAIPortrait} 
                  disabled={isGeneratingPortrait || !searchName}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-medium hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Portrait
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={outputLanguage}
                        onChange={(e) => setOutputLanguage(e.target.value as any)}
                        className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm outline-none appearance-none font-medium"
                    >
                        <option value="auto">Auto-detect Input Language</option>
                        <option value="en">Generate in English</option>
                        <option value="ar">Generate in Arabic</option>
                        <option value="so">Generate in Somali</option>
                    </select>
                </div>
                <button
                    onClick={processContent}
                    disabled={appState === AppState.PROCESSING || (inputType === 'search' ? !searchName : !inputText)}
                    className={`flex-[2] py-4 rounded-xl flex items-center justify-center gap-2 text-white font-bold shadow-md transition-all ${appState === AppState.PROCESSING ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                >
                    {appState === AppState.PROCESSING ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {appState === AppState.PROCESSING ? processingStep || "Processing..." : "Launch Search & Document Generation"}
                </button>
            </div>
          </div>
        </section>

        {appState === AppState.ERROR && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Generation Paused</p>
              <p className="text-sm opacity-90">{errorMessage}</p>
            </div>
          </div>
        )}

        {appState === AppState.COMPLETE && currentBrandingResult && (
          <section className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 pb-4 gap-4">
               <div className="flex bg-slate-100 p-1 rounded-lg">
                 <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'branding' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Profile Document</button>
                 <button onClick={() => setActiveTab('factcheck')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'factcheck' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Fact Check</button>
               </div>
               <div className="flex gap-2">
                  <button onClick={exportWord} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:text-blue-700 rounded-lg shadow-sm text-sm font-medium"><FileOutput className="w-4 h-4" /> Word</button>
                  <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg shadow-sm text-sm font-medium"><Download className="w-4 h-4" /> PDF</button>
               </div>
            </div>

            {activeTab === 'branding' ? (
              <div className="grid gap-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {profileImage && (
                        <div className="w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-100 shrink-0">
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{searchName || "Professional Profile"}</h3>
                        <p className="text-sm text-slate-500">{searchTitle}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                        {isTranslating && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                        <select value={displayLanguage} onChange={(e) => handleDisplayLanguageChange(e.target.value as any)} disabled={isTranslating} className="pl-4 pr-10 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm outline-none text-sm font-medium">
                            <option value="en">English View</option>
                            <option value="ar">Arabic View</option>
                            <option value="so">Somali View</option>
                        </select>
                    </div>
                </div>
                <ResultCard title="Executive Summary" icon={<FileText className="w-5 h-5"/>}><p dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}>{currentBrandingResult.executiveSummary}</p></ResultCard>
                <ResultCard title="Professional Biography" icon={<BookOpen className="w-5 h-5"/>}><p className="whitespace-pre-wrap" dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}>{currentBrandingResult.professionalBio}</p></ResultCard>
                <ResultCard title="Key Impact & Achievements" icon={<CheckCircle className="w-5 h-5"/>}>
                  <ul className="space-y-3" dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}>
                    {currentBrandingResult.keyAchievements.map((item, idx) => <li key={idx} className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>{item}</li>)}
                  </ul>
                </ResultCard>
                <ResultCard title="Expertise & Philosophy" icon={<Dna className="w-5 h-5"/>}><p dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}>{currentBrandingResult.professionalPhilosophy}</p></ResultCard>
                <ResultCard title="Projects" icon={<Briefcase className="w-5 h-5"/>}>
                  <div className="space-y-4">
                    {currentBrandingResult.projectHighlights.map((p, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100" dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}>
                        <h4 className="font-bold text-slate-800">{p.title}</h4>
                        <p className="text-sm mt-1">{p.description}</p>
                      </div>
                    ))}
                  </div>
                </ResultCard>
              </div>
            ) : (
              <div className="grid gap-6">
                 <ResultCard title="Fact Verification" icon={<CheckCircle className="w-5 h-5 text-emerald-600"/>}>{factCheckResult?.analysis}</ResultCard>
                 {factCheckResult && factCheckResult.sources.length > 0 && (
                   <div className="grid gap-3 sm:grid-cols-2">
                      {factCheckResult.sources.map((s, i) => <a key={i} href={s.uri} target="_blank" className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-indigo-600 truncate hover:underline">{s.title}</a>)}
                   </div>
                 )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;