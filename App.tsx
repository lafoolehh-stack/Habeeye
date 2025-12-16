import React, { useState, useRef } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Sparkles, 
  Upload, 
  Download, 
  FileOutput, 
  AlertCircle,
  Loader2,
  Copy,
  Search
} from 'lucide-react';
import { generateBrandingProfile, performFactCheck } from './services/geminiService';
import { BrandingResult, FactCheckResult, AppState } from './types';
import { ResultCard } from './components/ResultCard';

// jsPDF is loaded via CDN in index.html
declare const jspdf: any;

const App: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [brandingResult, setBrandingResult] = useState<BrandingResult | null>(null);
  const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
  const [activeTab, setActiveTab] = useState<'branding' | 'factcheck'>('branding');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
    };
    reader.readAsText(file);
  };

  const processContent = async () => {
    if (!inputText.trim()) return;

    setAppState(AppState.PROCESSING);
    setBrandingResult(null);
    setFactCheckResult(null);

    try {
      // Run both tasks in parallel for efficiency
      const [branding, facts] = await Promise.all([
        generateBrandingProfile(inputText),
        performFactCheck(inputText)
      ]);

      setBrandingResult(branding);
      setFactCheckResult(facts);
      setAppState(AppState.COMPLETE);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
    }
  };

  const exportPDF = () => {
    if (!brandingResult) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Professional Profile", 20, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", 20, 35);
    doc.setFont("helvetica", "normal");
    const splitSummary = doc.splitTextToSize(brandingResult.summary, 170);
    doc.text(splitSummary, 20, 42);

    let yPos = 42 + (splitSummary.length * 7) + 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("Biography", 20, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    const splitBio = doc.splitTextToSize(brandingResult.bio, 170);
    doc.text(splitBio, 20, yPos);

    yPos += (splitBio.length * 7) + 10;

    doc.setFont("helvetica", "bold");
    doc.text("Key Impact & Achievements", 20, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    
    brandingResult.impact.forEach((point) => {
      const splitPoint = doc.splitTextToSize(`• ${point}`, 170);
      doc.text(splitPoint, 20, yPos);
      yPos += (splitPoint.length * 7) + 2;
    });

    if (factCheckResult) {
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Fact Check Report", 20, 20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      
      const splitAnalysis = doc.splitTextToSize(factCheckResult.analysis, 170);
      doc.text(splitAnalysis, 20, 35);
    }

    doc.save("Professional_Profile_Report.pdf");
  };

  const exportWord = () => {
    if (!brandingResult) return;
    
    // Create an HTML structure for the Word document
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Profile Document</title></head>
      <body>
        <h1>Professional Profile</h1>
        <h2>Executive Summary</h2>
        <p>${brandingResult.summary}</p>
        <h2>Biography</h2>
        <p>${brandingResult.bio}</p>
        <h2>Key Impact & Achievements</h2>
        <ul>
          ${brandingResult.impact.map(i => `<li>${i}</li>`).join('')}
        </ul>
        <br/>
        <hr/>
        <h1>Fact Check Analysis</h1>
        <p>${factCheckResult?.analysis.replace(/\n/g, '<br/>') || 'No analysis available.'}</p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', content], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Profile_Report.doc'; // .doc opens in Word nicely with HTML content
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">
              Profyle AI
            </h1>
          </div>
          <div className="text-sm text-slate-500 font-medium hidden sm:block">
            Bio Generator & Fact Checker
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full flex flex-col gap-8">
        
        {/* Input Section */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Source Material</h2>
              <p className="text-slate-500 mt-1">Paste your text or upload a document to begin.</p>
            </div>
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".txt,.md" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors shadow-sm font-medium text-sm"
              >
                <Upload className="w-4 h-4" />
                Import Text File
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              className="w-full h-48 p-4 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-slate-700"
              placeholder="Paste raw bio data, resume text, or article content here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            {inputText && (
               <button 
                 onClick={() => setInputText('')}
                 className="absolute top-4 right-4 text-xs text-slate-400 hover:text-red-500 transition-colors"
               >
                 Clear
               </button>
            )}
          </div>

          <button
            onClick={processContent}
            disabled={!inputText || appState === AppState.PROCESSING}
            className={`
              w-full py-4 rounded-xl flex items-center justify-center gap-2 text-white font-semibold shadow-md transition-all
              ${!inputText || appState === AppState.PROCESSING 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'
              }
            `}
          >
            {appState === AppState.PROCESSING ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Intelligence...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Profile & Verify Facts
              </>
            )}
          </button>
        </section>

        {/* Results Section */}
        {appState === AppState.ERROR && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5" />
            <p>Something went wrong processing your request. Please try again.</p>
          </div>
        )}

        {appState === AppState.COMPLETE && brandingResult && factCheckResult && (
          <section className="animate-fade-in flex flex-col gap-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 pb-4 gap-4">
               <div className="flex bg-slate-100 p-1 rounded-lg">
                 <button 
                   onClick={() => setActiveTab('branding')}
                   className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'branding' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   Profile Branding
                 </button>
                 <button 
                   onClick={() => setActiveTab('factcheck')}
                   className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'factcheck' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   Fact Check
                 </button>
               </div>

               <div className="flex gap-2">
                  <button 
                    onClick={exportWord}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-600 rounded-lg transition-all shadow-sm text-sm font-medium"
                  >
                    <FileOutput className="w-4 h-4" />
                    Word
                  </button>
                  <button 
                    onClick={exportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all shadow-sm text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
               </div>
            </div>

            {activeTab === 'branding' ? (
              <div className="grid gap-6">
                <ResultCard title="Executive Summary" icon={<FileText className="w-5 h-5"/>}>
                  <p>{brandingResult.summary}</p>
                </ResultCard>

                <ResultCard title="Professional Bio" icon={<FileText className="w-5 h-5"/>}>
                  <p className="whitespace-pre-wrap">{brandingResult.bio}</p>
                </ResultCard>

                <ResultCard title="Impact & Achievements" icon={<CheckCircle className="w-5 h-5"/>}>
                   <ul className="space-y-3">
                     {brandingResult.impact.map((item, idx) => (
                       <li key={idx} className="flex gap-3 items-start">
                         <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                         <span>{item}</span>
                       </li>
                     ))}
                   </ul>
                </ResultCard>
              </div>
            ) : (
              <div className="grid gap-6">
                 <ResultCard title="Analysis & Verification" icon={<Search className="w-5 h-5 text-emerald-600"/>} className="border-emerald-100">
                    <div className="prose prose-slate max-w-none">
                       {/* Handle potential markdown from Gemini */}
                       {factCheckResult.analysis.split('\n').map((line, i) => (
                         <p key={i} className="mb-2">{line}</p>
                       ))}
                    </div>
                 </ResultCard>

                 {factCheckResult.sources.length > 0 && (
                   <div className="bg-slate-100 rounded-xl p-6">
                     <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       <CheckCircle className="w-4 h-4 text-emerald-600"/>
                       Verified Sources
                     </h3>
                     <div className="grid gap-3 sm:grid-cols-2">
                        {factCheckResult.sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                          >
                            <span className="text-sm font-medium text-indigo-600 group-hover:underline truncate">
                              {source.title}
                            </span>
                            <span className="text-xs text-slate-400 truncate mt-1">
                              {source.uri}
                            </span>
                          </a>
                        ))}
                     </div>
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