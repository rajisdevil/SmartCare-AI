import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Upload, FileText, CheckSquare, 
  Copy, Clock, Check, ChevronRight,
  BrainCircuit, Trash2, ShieldAlert
} from 'lucide-react';
import type { SummaryResult } from './types';
import { generateSummary } from './utils/ai';

const MAX_HISTORY = 5;

function App() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<SummaryResult | null>(null);
  const [history, setHistory] = useState<SummaryResult[]>([]);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('smartNotesHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smartNotesHistory', JSON.stringify(history));
  }, [history]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setInputText(event.target.result as string);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    setCurrentResult(null);
    
    try {
      const result = await generateSummary(inputText);
      setCurrentResult(result);
      
      setHistory(prev => {
        const newHistory = [result, ...prev].slice(0, MAX_HISTORY);
        return newHistory;
      });
    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleActionItem = (itemId: string) => {
    if (!currentResult) return;

    const updatedResult = {
      ...currentResult,
      actionItems: currentResult.actionItems.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    };

    setCurrentResult(updatedResult);
    setHistory(prev => prev.map(h => h.id === updatedResult.id ? updatedResult : h));
  };

  const copyToMarkdown = () => {
    if (!currentResult) return;

    let md = `# Meeting Summary\n\n`;
    md += `${currentResult.summary}\n\n`;
    
    md += `## 🎯 Decisions\n`;
    currentResult.decisions.forEach(d => md += `- ${d}\n`);
    md += `\n`;

    md += `## ✅ Action Items\n`;
    currentResult.actionItems.forEach(a => {
      md += `- [${a.completed ? 'x' : ' '}] **${a.task}** (@${a.owner}, 📅 ${a.deadline})\n`;
    });
    md += `\n`;

    md += `## 🚧 Blockers\n`;
    currentResult.blockers.forEach(b => md += `- ${b}\n`);

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadFromHistory = (result: SummaryResult) => {
    setCurrentResult(result);
    setInputText(result.originalText);
  };

  const clearHistory = () => {
    setHistory([]);
    setCurrentResult(null);
    setInputText('');
  }

  return (
    <div className="app-container">
      {/* Fixed Glass Sidebar */}
      <aside className="sidebar">
        <div className="flex-between">
          <h2 className="section-title" style={{ margin: 0 }}>
            <BrainCircuit color="var(--accent-color)" /> SmartCare AI
          </h2>
        </div>
        
        <div className="flex-between" style={{ marginTop: '2.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} /> Recent Notes
          </h3>
          {history.length > 0 && (
             <button onClick={clearHistory} className="btn-icon" title="Clear history">
               <Trash2 size={16} />
             </button>
          )}
        </div>
        
        {history.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>No recent summaries yet.</p>
        ) : (
          <div className="history-container">
            {history.map(item => (
              <div 
                key={item.id} 
                className="history-item"
                onClick={() => loadFromHistory(item)}
              >
                <div className="history-item-date">
                  {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div className="history-item-title">
                  {item.summary}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header style={{ marginBottom: '3rem' }}>
          <h1 className="title">Transform your notes instantly.</h1>
          <p className="subtitle">Paste raw meeting notes below, and our AI simulation will organize them into structured insights.</p>
        </header>

        {/* Input Section */}
        <section className="glass-card">
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <div className="flex-gap" style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1E293B' }}>
              <FileText size={20} /> Input Meeting Notes
            </div>
            <div>
              <input 
                type="file" 
                accept=".txt" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} /> Upload .txt
              </button>
            </div>
          </div>
          
          <div className="textarea-wrapper">
            <textarea 
              className="textarea"
              placeholder="Paste your meeting notes here...&#10;Try mentioning 'Decision:', 'Action: @Name !Today', or 'Blocker:' to see the extraction magic."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleGenerate}
              disabled={isProcessing || !inputText.trim()}
            >
              {isProcessing ? (
                <>Processing... <span className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'inline-block' }}></span></>
              ) : (
                <><Sparkles size={18} /> Generate Summary</>
              )}
            </button>
          </div>
        </section>

        {/* Loading State */}
        {isProcessing && (
          <div className="glass-card animate-fade-in">
            <div className="skeleton-text"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text short"></div>
            <div style={{ marginTop: '2.5rem' }}></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text short"></div>
          </div>
        )}

        {/* Results Section */}
        {currentResult && !isProcessing && (
          <div className="animate-fade-in" style={{ marginTop: '3rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 className="title" style={{ fontSize: '2rem' }}>Insights extracted</h2>
              <button className="btn btn-secondary" onClick={copyToMarkdown}>
                {copied ? <><Check size={18} color="var(--success-color)" /> Copied!</> : <><Copy size={18} /> Copy Markdown</>}
              </button>
            </div>

            {/* Summary Card */}
            <div className="glass-card">
              <div className="card-header">
                <FileText size={22} color="var(--accent-color)" /> Executive Summary
              </div>
              <p style={{ fontSize: '1.1rem', color: '#334155' }}>{currentResult.summary}</p>
            </div>

            <div className="result-grid">
              
              {/* Decisions Card */}
              <div className="glass-card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <ChevronRight size={22} color="#F59E0B" /> Key Decisions
                </div>
                <ul className="result-list">
                  {currentResult.decisions.map((decision, idx) => (
                    <li key={idx}>{decision}</li>
                  ))}
                </ul>
              </div>

              {/* Action Items Card */}
              <div className="glass-card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <CheckSquare size={22} color="var(--success-color)" /> Action Items
                </div>
                <div>
                  {currentResult.actionItems.map(item => (
                    <div key={item.id} className="action-item">
                      <input 
                        type="checkbox" 
                        className="action-checkbox"
                        checked={item.completed}
                        onChange={() => toggleActionItem(item.id)}
                      />
                      <div className={`action-content ${item.completed ? 'completed' : ''}`}>
                        <div style={{ fontWeight: 500 }}>{item.task}</div>
                        <div className="action-meta">
                          <span className="badge badge-owner">@{item.owner}</span>
                          <span className="badge badge-deadline">⏱ {item.deadline}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockers Card */}
              <div className="glass-card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <ShieldAlert size={22} color="var(--danger-color)" /> Blockers & Risks
                </div>
                <ul className="result-list">
                  {currentResult.blockers.map((blocker, idx) => (
                    <li key={idx}>{blocker}</li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
