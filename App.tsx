import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Sparkles, 
  Upload, 
  Download, 
  AlertCircle,
  Loader2,
  Briefcase,
  Search,
  User,
  Settings,
  ShieldCheck,
  Camera,
  X,
  Square,
  Eye,
  BrainCircuit,
  PlusCircle,
  Archive,
  BookUp,
  Trash2
} from 'lucide-react';
import { generateBrandingProfile, performFactCheck, translateBrandingProfileContent, researchPersonOnWeb, generateProfessionalPortrait } from './services/geminiService';
import { BrandingResult, FactCheckResult, AppState, ProjectHighlight, ArchivedDossier } from './types';

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
  const [registryId, setRegistryId] = useState("STANDBY");
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [processingStep, setProcessingStep] = useState<string>("");
  
  const [originalBrandingResult, setOriginalBrandingResult] = useState<BrandingResult | null>(null);
  const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
  
  const [outputLanguage, setOutputLanguage] = useState<'auto' | 'en' | 'ar' | 'so'>('auto'); 
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'ar' | 'so'>('en'); 
  const [translatedBrandingCache, setTranslatedBrandingCache] = useState<Record<string, BrandingResult | null>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [archives, setArchives] = useState<ArchivedDossier[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const exists = await window.aistudio.hasSelectedApiKey();
      setHasKey(exists);
    };
    checkKey();

    try {
      const storedArchives = localStorage.getItem('somaliPinArchives');
      if (storedArchives) {
          setArchives(JSON.parse(storedArchives));
      }
    } catch (error) {
        console.error("Failed to load archives from local storage", error);
        setArchives([]);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('somaliPinArchives', JSON.stringify(archives));
    } catch (error) {
        console.error("Failed to save archives to local storage", error);
    }
  }, [archives]);

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    setHasKey(true);
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
    } catch (error: any) {
      console.error(error);
      setErrorMessage("Failed to generate AI portrait.");
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  const processContent = async () => {
    setAppState(AppState.PROCESSING);
    setErrorMessage(null);
    setOriginalBrandingResult(null);
    setFactCheckResult(null);

    const newRegistryId = (() => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    })();
    setRegistryId(newRegistryId);

    try {
      let finalInputText = inputText;
      if (inputType === 'search') {
        if (!searchName.trim()) throw new Error("Please enter a name.");
        setProcessingStep("Scanning registries...");
        finalInputText = await researchPersonOnWeb(searchName, searchTitle);
      }
      setProcessingStep("Indexing dossier data...");
      const branding = await generateBrandingProfile(finalInputText, outputLanguage);
      
      setOriginalBrandingResult(branding);
      setTranslatedBrandingCache({ [branding.language]: branding });
      setDisplayLanguage(branding.language);
      setAppState(AppState.COMPLETE);

      const newArchiveEntry: ArchivedDossier = {
        registryId: newRegistryId,
        createdAt: Date.now(),
        searchName: searchName,
        searchTitle: searchTitle,
        profileImage: profileImage,
        brandingResult: branding,
      };

      setArchives(prev => [newArchiveEntry, ...prev.filter(a => a.registryId !== newRegistryId)]);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred.");
      setAppState(AppState.ERROR);
    } finally {
      setProcessingStep("");
    }
  };
  
  const currentBrandingResult = translatedBrandingCache[displayLanguage] || null;

  const handleBrandingEdit = (field: keyof Omit<BrandingResult, 'language'>, value: string | string[] | ProjectHighlight[]) => {
    if (!currentBrandingResult) return;
    const updatedResult = { ...currentBrandingResult, [field]: value };
    setTranslatedBrandingCache(prev => ({
      ...prev,
      [displayLanguage]: updatedResult,
    }));
  };

  const handleBrandingArrayItemEdit = (field: 'keyAchievements' | 'coreExpertise', index: number, value: string) => {
    if (!currentBrandingResult) return;
    const newArray = [...currentBrandingResult[field]];
    newArray[index] = value;
    handleBrandingEdit(field, newArray);
  };
  
  const handleProjectHighlightEdit = (index: number, field: 'title' | 'description', value: string) => {
    if (!currentBrandingResult) return;
    const newHighlights = [...currentBrandingResult.projectHighlights];
    newHighlights[index] = { ...newHighlights[index], [field]: value };
    handleBrandingEdit('projectHighlights', newHighlights);
  };

  const removeBrandingArrayItem = (field: 'keyAchievements' | 'coreExpertise', index: number) => {
    if (!currentBrandingResult) return;
    const newArray = [...currentBrandingResult[field]];
    newArray.splice(index, 1);
    handleBrandingEdit(field, newArray);
  };
  
  const removeProjectHighlight = (index: number) => {
    if (!currentBrandingResult) return;
    const newHighlights = [...currentBrandingResult.projectHighlights];
    newHighlights.splice(index, 1);
    handleBrandingEdit('projectHighlights', newHighlights);
  };

  const addBrandingArrayItem = (field: 'keyAchievements') => {
    if (!currentBrandingResult) return;
    const newArray = [...currentBrandingResult[field], "New item..."];
    handleBrandingEdit(field, newArray);
  };

  const addProjectHighlight = () => {
    if (!currentBrandingResult) return;
    const newHighlights = [...currentBrandingResult.projectHighlights, { title: "New Project Title", description: "New project description..." }];
    handleBrandingEdit('projectHighlights', newHighlights);
  };
  
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleLoadFromArchive = (archiveId: string) => {
    const archiveToLoad = archives.find(a => a.registryId === archiveId);
    if (archiveToLoad) {
        setRegistryId(archiveToLoad.registryId);
        setSearchName(archiveToLoad.searchName);
        setSearchTitle(archiveToLoad.searchTitle);
        setProfileImage(archiveToLoad.profileImage);
        
        const loadedBranding = archiveToLoad.brandingResult;
        setOriginalBrandingResult(loadedBranding);
        setTranslatedBrandingCache({ [loadedBranding.language]: loadedBranding });
        setDisplayLanguage(loadedBranding.language);
        
        setAppState(AppState.COMPLETE);
        setIsArchiveOpen(false);
    }
  };

  const handleDeleteFromArchive = (archiveId: string) => {
      setArchives(prev => prev.filter(a => a.registryId !== archiveId));
  };


  const exportTXT = () => {
    if (!currentBrandingResult) return;

    const {
      executiveSummary,
      professionalBio,
      keyAchievements,
      coreExpertise,
      professionalPhilosophy,
      visionAndOutlook,
      projectHighlights
    } = currentBrandingResult;
    
    const name = searchName || "Dossier Subject";

    let content = `DOSSIER RECORD: ${name.toUpperCase()}\n`;
    content += `REGISTRY ID: ${registryId}\n`;
    content += `========================================\n\n`;

    content += `01. EXECUTIVE SUMMARY\n`;
    content += `---------------------\n`;
    content += `${executiveSummary}\n\n`;

    content += `02. PROFESSIONAL BIOGRAPHY\n`;
    content += `--------------------------\n`;
    content += `${professionalBio}\n\n`;

    content += `03. KEY IMPACT & ACHIEVEMENTS\n`;
    content += `-----------------------------\n`;
    keyAchievements.forEach(a => {
      content += `- ${a}\n`;
    });
    content += `\n`;

    content += `04. CORE EXPERTISE\n`;
    content += `------------------\n`;
    content += `${coreExpertise.join(", ")}\n\n`;
    
    content += `05. PROFESSIONAL PHILOSOPHY\n`;
    content += `---------------------------\n`;
    content += `${professionalPhilosophy}\n\n`;

    content += `06. VISION & OUTLOOK\n`;
    content += `--------------------\n`;
    content += `${visionAndOutlook}\n\n`;

    if (projectHighlights && projectHighlights.length > 0) {
      content += `07. PROJECT HIGHLIGHTS\n`;
      content += `----------------------\n`;
      projectHighlights.forEach(p => {
        content += `Title: ${p.title}\n`;
        content += `Description: ${p.description}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SomaliPin_Dossier_${registryId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!currentBrandingResult) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    const applyDossierFrame = () => {
      // Background Color
      doc.setFillColor(252, 249, 244);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Heavy Black Outer Border (matching the 12px border in UI)
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(4);
      doc.rect(2, 2, pageWidth - 4, pageHeight - 4, 'S');
    };

    // --- COVER PAGE ---
    applyDossierFrame();

    // Registry Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("REGISTRY  SOURCES", pageWidth / 2, 25, { align: 'center' });
    
    // Header Diamonds
    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);
    const diamondSize = 3;
    const centerX = pageWidth / 2;
    doc.triangle(centerX - 40, 25, centerX - 42.5, 22.5, centerX - 45, 25, 'F');
    doc.triangle(centerX - 40, 25, centerX - 42.5, 27.5, centerX - 45, 25, 'F');
    doc.triangle(centerX + 40, 25, centerX + 42.5, 22.5, centerX + 45, 25, 'F');
    doc.triangle(centerX + 40, 25, centerX + 42.5, 27.5, centerX + 45, 25, 'F');

    let yPos = 50;

    // Profile Image
    if (profileImage) {
      const imgSize = 85;
      const xPos = (pageWidth - imgSize) / 2;
      
      // Image Border
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1.5);
      doc.rect(xPos - 1.5, yPos - 1.5, imgSize + 3, imgSize + 3, 'S');
      
      doc.addImage(profileImage, 'JPEG', xPos, yPos, imgSize, imgSize);
      
      // Verified Badge
      doc.setDrawColor(37, 99, 235);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(xPos + (imgSize / 2) - 15, yPos - 8, 30, 7, 1, 1, 'FD');
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text("VERIFIED", xPos + (imgSize / 2), yPos - 3, { align: 'center' });
      
      yPos += imgSize + 25;
    } else {
      yPos += 40;
    }

    // Name - Large Serif
    doc.setFont("times", "bold");
    doc.setFontSize(45);
    doc.setTextColor(15, 23, 42);
    const nameUpper = (searchName || "DOSSIER SUBJECT").toUpperCase();
    const nameLines = doc.splitTextToSize(nameUpper, pageWidth - 40);
    doc.text(nameLines, pageWidth / 2, yPos, { align: 'center' });
    yPos += (nameLines.length * 15) + 5;

    // ID - Spaced caps
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const idString = `REGISTRY ID: ${registryId}`;
    doc.text(idString.toUpperCase(), pageWidth / 2, yPos, { align: 'center', charSpace: 3 });

    // --- CONTENT PAGES ---
    doc.addPage();
    applyDossierFrame();
    yPos = 30;

    const addDossierHeading = (num: string, title: string) => {
        if (yPos > pageHeight - 50) {
            doc.addPage();
            applyDossierFrame();
            yPos = 30;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        const headingText = `${num}. ${title.toUpperCase()}`;
        doc.text(headingText, margin, yPos);
        yPos += 2;
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.8);
        // Matching the UI's inline-block border-bottom
        const textWidth = doc.getTextWidth(headingText);
        doc.line(margin, yPos, margin + textWidth + 5, yPos);
        yPos += 10;
    };

    const addDossierText = (text: string, isItalic = false, fontSize = 11, lineSpacing = 6) => {
        doc.setFont("helvetica", isItalic ? "italic" : "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(51, 65, 85);
        const splitText = doc.splitTextToSize(text, pageWidth - (2 * margin));
        
        if (yPos + splitText.length * lineSpacing > pageHeight - margin) {
            doc.addPage();
            applyDossierFrame();
            yPos = 30;
        }
        
        doc.text(splitText, margin, yPos);
        yPos += splitText.length * lineSpacing + 10;
    };

    addDossierHeading("01", "Executive Summary");
    addDossierText(currentBrandingResult.executiveSummary, true, 13, 7);

    addDossierHeading("02", "Professional Biography");
    addDossierText(currentBrandingResult.professionalBio, false, 10.5, 6);

    addDossierHeading("03", "Key Impact & Achievements");
    currentBrandingResult.keyAchievements.forEach(a => {
      doc.setFont("helvetica", "bold");
      doc.text("•", margin, yPos);
      doc.setFont("helvetica", "normal");
      const bulletSplit = doc.splitTextToSize(a, pageWidth - (2 * margin) - 10);
      doc.text(bulletSplit, margin + 5, yPos);
      yPos += bulletSplit.length * 6 + 4;
    });
    yPos += 6;

    addDossierHeading("04", "Core Expertise");
    const expertiseString = currentBrandingResult.coreExpertise.join("  |  ").toUpperCase();
    addDossierText(expertiseString, false, 9, 5);

    addDossierHeading("05", "Professional Philosophy");
    addDossierText(currentBrandingResult.professionalPhilosophy);

    addDossierHeading("06", "Vision & Outlook");
    addDossierText(currentBrandingResult.visionAndOutlook);

    if (currentBrandingResult.projectHighlights && currentBrandingResult.projectHighlights.length > 0) {
      addDossierHeading("07", "Project Highlights");
      currentBrandingResult.projectHighlights.forEach(project => {
        if (yPos > pageHeight - 40) {
            doc.addPage();
            applyDossierFrame();
            yPos = 30;
        }
        
        // Left accent line like in the UI (border-l-2)
        doc.setDrawColor(203, 213, 225); // slate-200
        doc.setLineWidth(0.5);
        
        const titleLines = doc.splitTextToSize(project.title, pageWidth - (2 * margin) - 10);
        const descLines = doc.splitTextToSize(project.description, pageWidth - (2 * margin) - 10);
        const blockHeight = (titleLines.length * 6) + (descLines.length * 5) + 8;
        
        doc.line(margin - 2, yPos - 4, margin - 2, yPos + blockHeight - 4);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(titleLines, margin + 4, yPos);
        yPos += titleLines.length * 6 + 2;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text(descLines, margin + 4, yPos);
        yPos += descLines.length * 5 + 10;
      });
    }

    doc.save(`SomaliPin_Dossier_${registryId}.pdf`);
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <ShieldCheck className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Registry Access Required</h2>
          <p className="text-slate-600 mb-8">Please connect a paid Google Cloud project to scan global registries.</p>
          <button onClick={handleSelectKey} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
            Connect API Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-1.5 rounded-sm">
              <div className="w-5 h-5 bg-white transform rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-900"></div>
              </div>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 font-serif">SOMALIPIN</h1>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase hidden sm:block">Archive Dossier Engine v2.0</span>
             <button onClick={() => setIsArchiveOpen(true)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Archive className="w-5 h-5" />
            </button>
             <button onClick={handleSelectKey} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      
      {isArchiveOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in-fast">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Archive className="w-5 h-5"/>
                Local Archives
              </h3>
              <button onClick={() => setIsArchiveOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500"/>
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {archives.length > 0 ? (
                <ul className="space-y-3">
                  {archives.map(archive => (
                    <li key={archive.registryId} className="bg-slate-50 p-3 rounded-lg flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {archive.profileImage ? (
                          <img src={archive.profileImage} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-slate-400"/>
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-800 truncate">{archive.searchName}</p>
                          <p className="text-xs text-slate-500">
                            ID: {archive.registryId} &bull; {new Date(archive.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleLoadFromArchive(archive.registryId)} className="p-2 text-slate-500 hover:bg-white hover:text-slate-900 rounded-md transition-colors" title="Load Dossier">
                          <BookUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteFromArchive(archive.registryId)} className="p-2 text-red-500/50 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors" title="Delete Dossier">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12">
                  <Archive className="w-12 h-12 mx-auto text-slate-300 mb-4"/>
                  <h4 className="font-bold text-slate-700">No Archives Found</h4>
                  <p className="text-sm text-slate-500">Generated dossiers will be saved here automatically.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full flex flex-col gap-10">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 font-serif">Dossier Initialization</h2>
              <p className="text-slate-500 text-sm">Enter subject details to begin deep registry search.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setInputType('search')} className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold transition-all ${inputType === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Search className="w-4 h-4" /> Global Registry
              </button>
              <button onClick={() => setInputType('text')} className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold transition-all ${inputType === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <FileText className="w-4 h-4" /> Local Input
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_260px] gap-10">
            <div className="flex flex-col gap-6">
              {inputType === 'search' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="E.g. Mohamed Abdullahi Hassan" 
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 text-slate-900 rounded-lg border border-slate-200 focus:border-slate-900 outline-none font-medium"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Role / Title</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="E.g. Government Official" 
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 text-slate-900 rounded-lg border border-slate-200 focus:border-slate-900 outline-none font-medium"
                                value={searchTitle}
                                onChange={(e) => setSearchTitle(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
              ) : (
                <textarea
                    className="w-full h-40 p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none resize-none font-medium"
                    placeholder="Paste subject dossier data here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
              )}
            </div>

            <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Portrait Frame</label>
              <div className="relative w-40 h-40 border-2 border-slate-900 p-1 bg-white shadow-lg">
                <div className="w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-300" />
                  )}
                  {isGeneratingPortrait && (
                    <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
                    </div>
                  )}
                </div>
                {profileImage && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-[8px] font-bold text-white px-2 py-0.5 rounded-sm flex items-center gap-1 shadow-md">
                        <CheckCircle className="w-2 h-2" /> VERIFIED
                    </div>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button onClick={() => imageInputRef.current?.click()} className="text-[10px] font-bold py-2 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50">MANUAL UPLOAD</button>
                <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                <button onClick={generateAIPortrait} disabled={isGeneratingPortrait || !searchName} className="text-[10px] font-bold py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50">AI RECONSTRUCTION</button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                 <select value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value as any)} className="w-full py-4 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none appearance-none">
                    <option value="auto">Language: Auto-detect</option>
                    <option value="so">Language: Somali</option>
                    <option value="en">Language: English</option>
                    <option value="ar">Language: Arabic</option>
                 </select>
              </div>
              <button
                onClick={processContent}
                disabled={appState === AppState.PROCESSING || (inputType === 'search' ? !searchName : !inputText)}
                className="flex-[2] bg-slate-900 text-white py-4 rounded-lg font-black tracking-widest text-xs uppercase flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {appState === AppState.PROCESSING ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {appState === AppState.PROCESSING ? processingStep : "INITIATE REGISTRY SCAN"}
              </button>
          </div>
        </section>

        {appState === AppState.ERROR && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {appState === AppState.COMPLETE && currentBrandingResult && (
          <section className="bg-dossier min-h-[800px] rounded-sm border-[12px] border-slate-900 shadow-2xl p-10 animate-fade-in relative">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <button onClick={exportPDF} className="p-3 bg-slate-900 text-white rounded-full shadow-lg hover:scale-110 transition-transform" title="Download as PDF">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={exportTXT} className="p-3 bg-slate-900 text-white rounded-full shadow-lg hover:scale-110 transition-transform" title="Save as Text Document">
                  <FileText className="w-5 h-5" />
                </button>
            </div>
            
            <div className="flex flex-col items-center mb-16">
                <div className="flex items-center gap-4 mb-10 text-[10px] font-black tracking-[0.3em] text-slate-400">
                    <Square className="w-3 h-3 fill-slate-900 rotate-45" /> REGISTRY SOURCES <Square className="w-3 h-3 fill-slate-900 rotate-45" />
                </div>

                <div className="w-64 h-64 border-4 border-slate-900 p-1.5 bg-white shadow-2xl mb-12 relative group">
                    <img src={profileImage || 'https://via.placeholder.com/400'} alt="Dossier Subject" className="w-full h-full object-cover grayscale" />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white border-2 border-blue-600 text-blue-600 font-black px-4 py-1 text-xs tracking-widest rounded-sm shadow-xl">
                        <CheckCircle className="w-3 h-3 inline-block mr-1" /> VERIFIED
                    </div>
                </div>

                <h2 className="text-6xl font-black text-slate-900 font-serif text-center mb-4 tracking-tighter uppercase leading-none max-w-2xl">
                    {searchName || "Dossier Record"}
                </h2>
                <p className="text-xs font-black tracking-[0.5em] text-slate-400 uppercase">
                    REGISTRY ID: <span className="text-slate-900">{registryId}</span>
                </p>
            </div>

            <div className="grid gap-12 max-w-4xl mx-auto pt-10 border-t border-slate-200">
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1 inline-block">01. EXECUTIVE SUMMARY</h4>
                    <textarea
                        className="w-full p-0 text-xl font-medium leading-relaxed text-slate-800 italic bg-transparent border-none focus:ring-0 resize-none outline-none"
                        value={currentBrandingResult.executiveSummary}
                        onChange={(e) => handleBrandingEdit('executiveSummary', e.target.value)}
                        onInput={handleTextareaInput}
                        rows={1}
                        dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}
                    />
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1 inline-block">02. PROFESSIONAL BIOGRAPHY</h4>
                    <textarea
                        className="w-full p-0 text-sm leading-8 text-slate-700 whitespace-pre-wrap bg-transparent border-none focus:ring-0 resize-none outline-none"
                        value={currentBrandingResult.professionalBio}
                        onChange={(e) => handleBrandingEdit('professionalBio', e.target.value)}
                        onInput={handleTextareaInput}
                        rows={5}
                        dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1 inline-block">03. KEY IMPACT</h4>
                        <ul className="space-y-2 text-sm text-slate-700" dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}>
                            {currentBrandingResult.keyAchievements.map((a, i) => (
                                <li key={i} className="flex items-start gap-3 group">
                                    <span className="shrink-0 text-slate-900 font-black mt-1">•</span>
                                    <textarea
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none outline-none leading-relaxed"
                                        value={a}
                                        onChange={(e) => handleBrandingArrayItemEdit('keyAchievements', i, e.target.value)}
                                        onInput={handleTextareaInput}
                                        rows={1}
                                    />
                                    <button onClick={() => removeBrandingArrayItem('keyAchievements', i)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity flex-shrink-0">
                                        <X className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                         <button onClick={() => addBrandingArrayItem('keyAchievements')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
                            <PlusCircle className="w-4 h-4" />
                            ADD ACHIEVEMENT
                        </button>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1 inline-block">04. EXPERTISE</h4>
                        <div className="space-y-2">
                            <textarea
                                className="w-full p-2 text-sm bg-slate-100 rounded-md border-slate-200 outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                                value={currentBrandingResult.coreExpertise.join(', ')}
                                onChange={(e) => handleBrandingEdit('coreExpertise', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                onInput={handleTextareaInput}
                                rows={2}
                                placeholder="Enter skills separated by commas..."
                            />
                            <div className="flex flex-wrap gap-2 pt-2">
                                {currentBrandingResult.coreExpertise.map((e, i) => e && (
                                    <span key={i} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 rounded-sm">
                                        {e}
                                        <button onClick={() => removeBrandingArrayItem('coreExpertise', i)} className="text-white/50 hover:text-white">
                                            <X size={12}/>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1 inline-block">05. PROFESSIONAL PHILOSOPHY</h4>
                     <div className="flex items-start gap-3">
                        <BrainCircuit className="w-5 h-5 inline-block mr-2 text-slate-500 flex-shrink-0 mt-1"/>
                        <textarea
                            className="w-full p-0 text-sm leading-8 text-slate-700 bg-transparent border-none focus:ring-0 resize-none outline-none"
                            value={currentBrandingResult.professionalPhilosophy}
                            onChange={(e) => handleBrandingEdit('professionalPhilosophy', e.target.value)}
                            onInput={handleTextareaInput}
                            rows={2}
                            dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}
                        />
                     </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1 inline-block">06. VISION & OUTLOOK</h4>
                     <div className="flex items-start gap-3">
                        <Eye className="w-5 h-5 inline-block mr-2 text-slate-500 flex-shrink-0 mt-1"/>
                        <textarea
                            className="w-full p-0 text-sm leading-8 text-slate-700 bg-transparent border-none focus:ring-0 resize-none outline-none"
                            value={currentBrandingResult.visionAndOutlook}
                            onChange={(e) => handleBrandingEdit('visionAndOutlook', e.target.value)}
                            onInput={handleTextareaInput}
                            rows={2}
                            dir={currentBrandingResult.language === 'ar' ? 'rtl' : 'ltr'}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1 inline-block">07. PROJECT HIGHLIGHTS</h4>
                    <div className="space-y-6">
                        {currentBrandingResult.projectHighlights.map((p, i) => (
                            <div key={i} className="group relative pl-4 border-l-2 border-slate-200">
                                <textarea
                                    className="w-full p-0 font-bold text-slate-800 bg-transparent border-none focus:ring-0 resize-none outline-none mb-1"
                                    value={p.title}
                                    onChange={(e) => handleProjectHighlightEdit(i, 'title', e.target.value)}
                                    onInput={handleTextareaInput}
                                    rows={1}
                                />
                                <textarea
                                    className="w-full p-0 text-sm leading-relaxed text-slate-600 bg-transparent border-none focus:ring-0 resize-none outline-none"
                                    value={p.description}
                                    onChange={(e) => handleProjectHighlightEdit(i, 'description', e.target.value)}
                                    onInput={handleTextareaInput}
                                    rows={2}
                                />
                                <button onClick={() => removeProjectHighlight(i)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addProjectHighlight} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mt-2">
                        <PlusCircle className="w-4 h-4" />
                        ADD PROJECT
                    </button>
                </div>

            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
