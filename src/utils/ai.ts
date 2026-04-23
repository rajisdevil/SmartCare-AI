import type { SummaryResult, ActionItem } from '../types';

// Helper to generate a UUID
const uuid = () => crypto.randomUUID();

export const generateSummary = async (text: string): Promise<SummaryResult> => {
  // Simulate network delay to maintain the illusion of AI processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  const sentences = text
    .split(/(?<=[.?!])\s+/) // Split by sentences
    .map(s => s.trim())
    .filter(s => s.length > 5);
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const decisions: string[] = [];
  const actionItems: ActionItem[] = [];
  const blockers: string[] = [];

  // Patterns for extraction
  const decisionPatterns = [
    /decided\s+(?:to\s+)?(.+)/i,
    /agreed\s+(?:to|that)\s+(.+)/i,
    /will\s+proceed\s+with\s+(.+)/i,
    /chose\s+to\s+(.+)/i,
    /resolution:\s+(.+)/i,
    /we\s+(?:are|will\s+be)\s+going\s+with\s+(.+)/i,
    /^decision:\s*(.+)/i
  ];

  const blockerPatterns = [
    /waiting\s+(?:on|for)\s+(.+)/i,
    /blocked\s+by\s+(.+)/i,
    /issue\s+with\s+(.+)/i,
    /concern(?:ed)?\s+(?:about|with)\s+(.+)/i,
    /risk\s+(?:of|is)\s+(.+)/i,
    /dependency\s+(?:on|is)\s+(.+)/i,
    /^blocker:\s*(.+)/i,
    /^risk:\s*(.+)/i
  ];

  const actionPatterns = [
    /^action:\s*(.+)/i,
    /^todo:\s*(.+)/i,
    /(?:need|needs)\s+to\s+(.+)/i,
    /(.+?)\s+(?:will|needs\s+to|should)\s+(.+)/i, // Matches "John will update the docs"
    /task:\s*(.+)/i
  ];

  // Names extraction helper (very basic capitalization heuristic for simulation)
  const extractOwner = (text: string): { owner: string, cleanTask: string } => {
    let owner = "Unassigned";
    let cleanTask = text;

    // Explicit @ mention
    const atMatch = text.match(/@([a-zA-Z]+)/);
    if (atMatch) {
      owner = atMatch[1];
      cleanTask = text.replace(atMatch[0], '').trim();
      return { owner, cleanTask };
    }

    // Try to extract from "Name will..." pattern
    const willMatch = text.match(/^([A-Z][a-z]+)\s+(?:will|needs\s+to|should)\s+(.+)/i);
    if (willMatch) {
      owner = willMatch[1];
      cleanTask = willMatch[2];
      return { owner, cleanTask };
    }

    return { owner, cleanTask };
  };

  // Date extraction helper
  const extractDeadline = (text: string): { deadline: string, cleanTask: string } => {
    let deadline = "TBD";
    let cleanTask = text;

    // Explicit !Date or "by Date"
    const explicitDate = text.match(/!(.*?)(?:\s|$)|(?:by|before)\s([A-Z][a-z]+|tomorrow|next week|end of (?:week|day)|[0-9/]+)(?:\s|$|.)/i);
    if (explicitDate) {
      deadline = (explicitDate[1] || explicitDate[2]).trim();
      cleanTask = text.replace(explicitDate[0], '').trim();
      return { deadline, cleanTask };
    }

    // Common temporal words
    const temporalMatch = text.match(/\b(tomorrow|today|next (?:week|month)|monday|tuesday|wednesday|thursday|friday)\b/i);
    if (temporalMatch) {
      deadline = temporalMatch[1];
      cleanTask = text.replace(temporalMatch[0], '').trim();
      // capitalize first letter
      deadline = deadline.charAt(0).toUpperCase() + deadline.slice(1);
    }

    return { deadline, cleanTask };
  };

  // Process line by line and sentence by sentence to capture different contexts
  const combinedPhrases = [...new Set([...sentences, ...lines])];

  combinedPhrases.forEach(phrase => {
    const lowerPhrase = phrase.toLowerCase();
    
    // Check Decisions
    for (const pattern of decisionPatterns) {
      const match = phrase.match(pattern);
      if (match && !decisions.includes(match[0])) {
        // Capitalize first letter
        let cleanDec = match[1] || match[0];
        cleanDec = cleanDec.charAt(0).toUpperCase() + cleanDec.slice(1);
        decisions.push(cleanDec);
        break; // Only match one decision pattern per phrase
      }
    }

    // Check Blockers
    for (const pattern of blockerPatterns) {
      const match = phrase.match(pattern);
      if (match && !blockers.includes(match[0])) {
        let cleanBlocker = match[1] || match[0];
        cleanBlocker = cleanBlocker.charAt(0).toUpperCase() + cleanBlocker.slice(1);
        blockers.push(cleanBlocker);
        break;
      }
    }

    // Check Actions
    for (const pattern of actionPatterns) {
      const match = phrase.match(pattern);
      if (match) {
        const rawTask = match[1] || match[0];
        // Extract owner and deadline
        let { owner, cleanTask } = extractOwner(rawTask);
        let { deadline, cleanTask: finalTask } = extractDeadline(cleanTask);
        
        // If the task extracted is too short, probably a false positive
        if (finalTask.length > 5) {
            finalTask = finalTask.charAt(0).toUpperCase() + finalTask.slice(1);
            
            // Prevent duplicates
            if (!actionItems.some(a => a.task.toLowerCase() === finalTask.toLowerCase())) {
              actionItems.push({
                id: uuid(),
                task: finalTask,
                owner,
                deadline,
                completed: false
              });
            }
        }
        break;
      }
    }
  });

  // Generate a plausible summary based on the text length and content
  let summary = "";
  if (sentences.length > 0) {
    // If we have explicit summary, use it
    const summaryMatch = text.match(/summary:\s*([^]+?)(?:\n\n|$)/i);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    } else {
      // Otherwise synthesize from the first 2-3 sentences
      const topSentences = sentences.slice(0, Math.min(3, sentences.length));
      summary = topSentences.join(" ");
      
      if (summary.length > 300) {
         summary = summary.substring(0, 300) + "...";
      }
    }
  }

  // Fallbacks if text was too short or nothing was found, but make it contextual to the input text if possible
  if (!summary) {
     summary = "The provided notes were too brief to generate a comprehensive summary. Please provide more detailed meeting context.";
  }

  return {
    id: uuid(),
    timestamp: Date.now(),
    originalText: text,
    summary,
    decisions,
    actionItems,
    blockers
  };
};
