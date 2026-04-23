import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatAPI } from '../services/api';

export default function ChatbotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(user?.language || 'en');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(-1);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const voiceModeRef = useRef(false);   // Tracks voiceMode for callbacks without stale closure
  const isSendingRef = useRef(false);   // Prevents duplicate sends in voice mode
  const isLoadingRef = useRef(false);   // Mirrors loading for recognition callbacks
  const interruptRef = useRef(null);    // Kept for cleanup only (no longer used for echo-prone background mic)
  const speechCancelledRef = useRef(false); // Set true when we manually cancel TTS to stop speakNext chain
  const isSpeakingRef = useRef(false);   // Mirrors isSpeaking state for startListening guard


  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const langMap = { en: 'English', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ', mr: 'मराठी', ta: 'தமிழ்', te: 'తెలుగు', bn: 'বাংলা', kn: 'ಕನ್ನಡ', gu: 'ગુજરાતી', ml: 'മലയാളം', or: 'ଓଡ଼ିଆ', as: 'অসমীয়া', ur: 'اردو' };
  const speechLangMap = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', kn: 'kn-IN', gu: 'gu-IN', ml: 'ml-IN', or: 'or-IN', as: 'as-IN', ur: 'ur-IN' };

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await chatAPI.getHistory(20);
        const history = res.data?.history || [];
        const mapped = [];
        history.reverse().forEach(h => {
          mapped.push({ role: 'user', content: h.message, time: h.created_at });
          mapped.push({ role: 'assistant', content: h.response, time: h.created_at });
        });
        if (mapped.length > 0) setMessages(mapped);
      } catch { /* ignore */ }
    };
    loadHistory();
  }, []);

  // Load voices when available
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // ─── Text-to-Speech ───
  const speakText = useCallback((text, msgIndex = -1) => {
    if (!('speechSynthesis' in window)) return;
    speechCancelledRef.current = false;   // Reset cancel flag for new speech
    isSpeakingRef.current = true;         // Mark as speaking
    window.speechSynthesis.cancel();

    // Clean text for natural speech
    const cleanText = text
      .replace(/[*#_`~>]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/- /g, '')
      .replace(/\d+\./g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);

    if (!cleanText) return;

    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    let currentIdx = 0;

    const speakNext = () => {
      // If manually cancelled (stopSpeaking), do NOT chain to next sentence
      if (speechCancelledRef.current) {
        isSpeakingRef.current = false;
        return;
      }

      if (currentIdx >= sentences.length) {
        // All sentences spoken naturally — done
        setIsSpeaking(false);
        setSpeakingMsgIdx(-1);
        isSpeakingRef.current = false;
        // Auto-restart listening ONLY after a 2-second silence gap
        // This lets speaker audio dissipate so the mic doesn’t hear its own echo
        if (voiceModeRef.current) {
          setTimeout(() => startListening(true), 2000);
        }
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[currentIdx].trim());
      utterance.lang = speechLangMap[language] || 'en-IN';
      utterance.rate = voiceSpeed;
      utterance.pitch = 1.0;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const langCode = utterance.lang.split('-')[0];
      const matchingVoice =
        voices.find(v => v.lang.startsWith(langCode) && !v.localService) ||
        voices.find(v => v.lang.startsWith(langCode));
      if (matchingVoice) utterance.voice = matchingVoice;

      utterance.onstart = () => { setIsSpeaking(true); setSpeakingMsgIdx(msgIndex); };

      utterance.onend = () => {
        if (speechCancelledRef.current) { isSpeakingRef.current = false; return; }
        currentIdx++;
        speakNext();
      };

      utterance.onerror = () => {
        if (!speechCancelledRef.current) { setIsSpeaking(false); setSpeakingMsgIdx(-1); }
        isSpeakingRef.current = false;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // NOTE: Background interruption mic intentionally removed.
    // It caused an echo loop — the SpeechRecognition mic was picking up the AI’s
    // own TTS output from speakers and sending it back as a new user message.
    // Users can still interrupt by tapping the Stop button.
    speakNext();
  }, [language, voiceMode, voiceSpeed]);

  // Keep refs in sync
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { isLoadingRef.current = loading; }, [loading]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  const stopSpeaking = useCallback(() => {
    speechCancelledRef.current = true;   // Prevent utterance.onend from chaining
    isSpeakingRef.current = false;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingMsgIdx(-1);
    if (interruptRef.current) { try { interruptRef.current.stop(); } catch { } interruptRef.current = null; }
  }, []);

  // ─── Speech Recognition — fixed to prevent duplicate sends & stop/pause keywords ───
  const startListening = useCallback((forceVoiceMode = null) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported. Please use Chrome.');
      return;
    }
    // Don't start a new recognition if one is already active
    if (recognitionRef.current) return;
    // Don't start listening if AI is currently speaking (prevents echo pickup)
    if (isSpeakingRef.current) return;

    stopSpeaking();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = speechLangMap[language] || 'en-IN';
    // Use forceVoiceMode (passed when toggling) OR the ref (stable value)
    const inVoiceMode = forceVoiceMode !== null ? forceVoiceMode : voiceModeRef.current;
    recognition.continuous = false;       // Always non-continuous — restart manually after each phrase
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let hasSentThisSession = false;       // Guard: send only once per recognition session

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscript = '';
      hasSentThisSession = false;
      isSendingRef.current = false;
    };

    recognition.onresult = (event) => {
      let interim = '';
      finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      // Show live interim in input box
      setInput(finalTranscript || interim);

      // Detect stop/pause keywords immediately
      const combined = (finalTranscript || interim).toLowerCase().trim();
      const stopKeywords = ['stop', 'ruko', 'bas', 'pause', 'quiet', 'chup', 'band karo'];
      if (stopKeywords.some(kw => combined.includes(kw))) {
        stopSpeaking();
        setInput('');
        return;
      }

      // Auto-send in voice mode only when final, not already sending, not loading
      if (inVoiceMode && finalTranscript.trim().length > 2 && !hasSentThisSession && !isLoadingRef.current) {
        hasSentThisSession = true;
        isSendingRef.current = true;
        setTimeout(() => {
          sendMessage(finalTranscript.trim());
          isSendingRef.current = false;
        }, 400);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      setInput('');
      // In voice mode, auto-restart listening after speaking finishes
      // (restart is handled by speakText's onend callback, not here)
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInput('');
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Toggle voice conversation mode — starts listening IMMEDIATELY
  const toggleVoiceMode = () => {
    if (voiceMode) {
      // Exit voice mode
      voiceModeRef.current = false;
      setVoiceMode(false);
      stopListening();
      stopSpeaking();
    } else {
      // Enter voice mode — update ref FIRST so startListening sees the correct value
      voiceModeRef.current = true;
      setVoiceMode(true);
      setAutoSpeak(true);
      // Pass forceVoiceMode=true so startListening doesn't use stale ref
      setTimeout(() => startListening(true), 100);
    }
  };

  // ─── Simple Markdown Renderer ───
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let listItems = [];
    let listKey = 0;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} style={{ margin: '6px 0', paddingLeft: 20, listStyleType: 'disc' }}>
            {listItems.map((li, j) => <li key={j} style={{ marginBottom: 3 }}>{formatInline(li)}</li>)}
          </ul>
        );
        listItems = [];
      }
    };

    const formatInline = (line) => {
      // Bold + Italic, Bold, Italic
      const parts = [];
      const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
        if (match[2]) parts.push(<strong key={match.index}><em>{match[2]}</em></strong>);
        else if (match[3]) parts.push(<strong key={match.index}>{match[3]}</strong>);
        else if (match[4]) parts.push(<em key={match.index}>{match[4]}</em>);
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < line.length) parts.push(line.slice(lastIndex));
      return parts.length > 0 ? parts : line;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Heading
      if (trimmed.startsWith('### ')) { flushList(); elements.push(<h4 key={i} style={{ fontSize: 14, fontWeight: 700, margin: '10px 0 4px', color: '#1b5a28' }}>{formatInline(trimmed.slice(4))}</h4>); }
      else if (trimmed.startsWith('## ')) { flushList(); elements.push(<h3 key={i} style={{ fontSize: 15, fontWeight: 700, margin: '10px 0 4px', color: '#1b5a28' }}>{formatInline(trimmed.slice(3))}</h3>); }
      else if (trimmed.startsWith('# ')) { flushList(); elements.push(<h3 key={i} style={{ fontSize: 16, fontWeight: 800, margin: '10px 0 4px', color: '#1b5a28' }}>{formatInline(trimmed.slice(2))}</h3>); }
      // Bullet point
      else if (/^[\-\*•]\s/.test(trimmed)) { listItems.push(trimmed.replace(/^[\-\*•]\s*/, '')); }
      // Numbered list
      else if (/^\d+[\.\)]\s/.test(trimmed)) { listItems.push(trimmed.replace(/^\d+[\.\)]\s*/, '')); }
      // Empty line
      else if (trimmed === '') { flushList(); elements.push(<div key={i} style={{ height: 6 }} />); }
      // Normal paragraph
      else { flushList(); elements.push(<p key={i} style={{ margin: '3px 0' }}>{formatInline(trimmed)}</p>); }
    }
    flushList();
    return <div>{elements}</div>;
  };

  // ─── Send message ───
  const sendMessage = async (text) => {
    const msg = (typeof text === 'string' ? text : '') || input.trim();
    const currentFiles = [...attachedFiles];
    if (!msg && currentFiles.length === 0) return;
    if (loading) return;

    if (isListening && !voiceMode) stopListening();

    setInput('');
    setAttachedFiles([]);

    // Build display message for user bubble — include image preview URL
    let imagePreviewUrl = null;
    const imageFile = currentFiles.find(f => f.type.startsWith('image/'));
    if (imageFile) {
      imagePreviewUrl = URL.createObjectURL(imageFile);
    }
    const displayContent = msg || (imageFile ? 'Analyze this image' : '');
    setMessages(prev => [...prev, {
      role: 'user',
      content: displayContent,
      imageUrl: imagePreviewUrl,
      time: new Date().toISOString()
    }]);
    setLoading(true);

    try {
      let res;
      // If there are attached image files, send via the image endpoint
      if (imageFile) {
        res = await chatAPI.sendMessageWithImage(msg, language, imageFile);
      } else {
        res = await chatAPI.sendMessage({ message: msg || 'Analyze this for me', language });
      }
      const data = res.data;
      const responseMsg = {
        role: 'assistant',
        content: data.response,
        suggestions: data.suggestions,
        time: new Date().toISOString()
      };
      setMessages(prev => {
        const newMsgs = [...prev, responseMsg];
        if (autoSpeak) {
          setTimeout(() => speakText(data.response, newMsgs.length - 1), 200);
        }
        return newMsgs;
      });
    } catch (err) {
      const errorMsg = `Error: ${err.response?.data?.detail || 'Failed to get response. Please try again.'}`;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMsg,
        time: new Date().toISOString()
      }]);
      if (voiceMode) {
        speakText('Sorry, I encountered an error. Please try again.');
      }
    } finally {
      setLoading(false);
      if (!voiceMode) inputRef.current?.focus();
    }
  };

  const clearChat = async () => {
    stopSpeaking();
    stopListening();
    setVoiceMode(false);
    try { await chatAPI.clearHistory(); } catch { /* ignore */ }
    setMessages([]);
  };

  const suggestions = [
    { text: 'What crop should I grow?', emoji: '🌾' },
    { text: 'Tell me about PM-KISAN', emoji: '🏛️' },
    { text: 'My plant has yellow spots', emoji: '🍂' },
    { text: 'Best fertilizer for wheat', emoji: '🧪' },
    { text: 'Government loan schemes', emoji: '💰' },
    { text: 'Organic farming tips', emoji: '🌿' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 100px)', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, flexWrap: 'wrap', gap: 8
      }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Outfit', margin: '0 0 2px 0' }}>
            Hi, <span style={{ color: 'var(--primary)' }}>{user?.name?.split(' ')[0] || 'Farmer'}!</span>
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Your smart farming assistant — ask anything
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select value={language} onChange={e => { setLanguage(e.target.value); stopSpeaking(); }}
            style={{
              padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
              fontSize: 12, background: 'white', cursor: 'pointer'
            }}>
            {Object.entries(langMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={clearChat} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 500
          }}>Clear</button>
        </div>
      </div>

      {/* Voice Mode Overlay */}
      {voiceMode && (
        <div style={{
          padding: '14px 20px', marginBottom: 12, borderRadius: 14,
          background: isListening
            ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
            : isSpeaking
              ? 'linear-gradient(135deg, #e8f5e9, #f1f8e9)'
              : 'linear-gradient(135deg, #f0f5ff, #e8eaf6)',
          border: `2px solid ${isListening ? '#dc2626' : isSpeaking ? '#2d7a3a' : '#6366f1'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          transition: 'all 0.3s'
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: isListening ? '#dc2626' : isSpeaking ? '#2d7a3a' : '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: (isListening || isSpeaking) ? 'pulse 1.5s infinite' : 'none',
            boxShadow: `0 0 0 8px ${isListening ? 'rgba(220,38,38,0.15)' : isSpeaking ? 'rgba(45,122,58,0.15)' : 'rgba(99,102,241,0.15)'}`
          }}>
            <span style={{ fontSize: 24, color: 'white' }}>
              {isListening ? '🎤' : isSpeaking ? '🔊' : '💭'}
            </span>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: isListening ? '#dc2626' : isSpeaking ? '#2d7a3a' : '#6366f1' }}>
              {isListening ? 'Listening... Speak now' : isSpeaking ? 'Speaking response...' : loading ? 'Thinking...' : 'Ready — tap mic to talk'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isListening
                ? 'I\'ll send your message when you stop speaking'
                : isSpeaking
                  ? 'I\'ll start listening when I finish speaking'
                  : 'Full voice conversation mode — like ChatGPT'}
            </p>
          </div>
          {isListening && input && (
            <div style={{
              flex: 1, padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.8)', fontSize: 13,
              color: 'var(--text-primary)', fontStyle: 'italic',
              maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              "{input}"
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 4px',
        display: 'flex', flexDirection: 'column', gap: 12
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🌾</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>AgriSmart AI Assistant</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 340, margin: '0 auto 16px', lineHeight: 1.5 }}>
              Your AI farming expert — ask about crops, weather, diseases, schemes & more.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              maxWidth: 420,
              margin: '0 auto',
              padding: '0 4px'
            }}>
              {suggestions.map((s) => (
                <button key={s.text} onClick={() => sendMessage(s.text)} style={{
                  padding: '10px 10px',
                  borderRadius: 14,
                  border: '1.5px solid var(--border)',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  lineHeight: 1.4,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#e8f5e9'; e.currentTarget.style.borderColor = '#2d7a3a'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                  <span style={{ fontSize: 18 }}>{s.emoji}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end', gap: 6
          }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: speakingMsgIdx === i ? '#2d7a3a' : '#e8f5e9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
                transition: 'all 0.3s',
                animation: speakingMsgIdx === i ? 'pulse 1.5s infinite' : 'none'
              }}>
                {speakingMsgIdx === i ? '🔊' : '🌾'}
              </div>
            )}
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 14,
              background: m.role === 'user' ? 'var(--primary)' : '#f0faf0',
              color: m.role === 'user' ? 'white' : 'var(--text-primary)',
              fontSize: 14, lineHeight: 1.6,
              borderBottomRightRadius: m.role === 'user' ? 4 : 14,
              borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
              position: 'relative',
              boxShadow: speakingMsgIdx === i ? '0 0 0 2px #2d7a3a' : 'none',
              transition: 'box-shadow 0.3s'
            }}>
              {/* Show uploaded image preview in user bubble */}
              {m.imageUrl && (
                <img src={m.imageUrl} alt="Uploaded"
                  style={{
                    maxWidth: 200, maxHeight: 200, borderRadius: 10,
                    display: 'block', marginBottom: m.content ? 8 : 0,
                    border: '2px solid rgba(255,255,255,0.3)'
                  }} />
              )}
              {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
              {/* Speaker button on assistant messages */}
              {m.role === 'assistant' && m.content && !m.content.startsWith('Error') && (
                <button
                  onClick={() => speakingMsgIdx === i ? stopSpeaking() : speakText(m.content, i)}
                  title={speakingMsgIdx === i ? 'Stop speaking' : 'Listen to this response'}
                  style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 28, height: 28, borderRadius: '50%',
                    background: speakingMsgIdx === i ? '#dc2626' : '#2d7a3a',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s',
                    animation: speakingMsgIdx === i ? 'pulse 1s infinite' : 'none'
                  }}>
                  {speakingMsgIdx === i ? '⏹️' : '🔊'}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#e8f5e9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0
            }}>🌾</div>
            <div style={{
              padding: '12px 20px', borderRadius: 14, background: '#f0faf0',
              fontSize: 14, color: '#7a9a7a', borderBottomLeftRadius: 4,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#2d7a3a',
                    animation: `bounce 1.4s infinite ${i * 0.16}s`,
                    opacity: 0.6
                  }} />
                ))}
              </div>
              <span>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length > 0 && messages[messages.length - 1]?.suggestions && (
        <div style={{
          display: 'flex', gap: 6, padding: '6px 0',
          overflowX: 'auto', flexWrap: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {messages[messages.length - 1].suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{
              padding: '6px 14px', borderRadius: 16, border: '1px solid var(--border)',
              background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 500,
              transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e8f5e9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
              {s}
            </button>
          ))}
        </div>
      )}


      {/* ═══ Unified Wide Green Search Bar ═══ */}
      <div style={{ marginTop: 8 }}>
        {/* Attached file previews */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {attachedFiles.map((f, i) => (
              <div key={i} style={{
                position: 'relative', borderRadius: 10, overflow: 'hidden',
                border: '1.5px solid rgba(76,175,80,0.3)',
                background: '#0d1f12'
              }}>
                {f.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(f)} alt={f.name}
                    style={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{
                    width: 64, height: 64, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', padding: 4
                  }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <span style={{
                      fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
                      wordBreak: 'break-all', marginTop: 2
                    }}>{f.name.slice(0, 12)}</span>
                  </div>
                )}
                <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute', top: 2, right: 2, width: 18, height: 18,
                    borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)',
                    color: 'white', cursor: 'pointer', fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Main input bar */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2e1a, #0d1f12)',
          border: `1.5px solid ${isListening ? 'rgba(239,68,68,0.5)' : 'rgba(76,175,80,0.35)'}`,
          borderRadius: 32,
          display: 'flex', alignItems: 'center',
          padding: '8px 8px 8px 18px',
          gap: 6,
          boxShadow: isListening
            ? '0 0 0 3px rgba(239,68,68,0.12), 0 4px 20px rgba(0,0,0,0.25)'
            : '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(76,175,80,0.08)',
          transition: 'all 0.25s'
        }}>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            onChange={e => {
              const files = Array.from(e.target.files);
              setAttachedFiles(prev => [...prev, ...files].slice(0, 5));
              e.target.value = '';
            }} />

          {/* Attachment + button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach files or images"
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: 'rgba(76,175,80,0.15)', color: 'rgba(76,175,80,0.85)',
              cursor: 'pointer', fontSize: 20, fontWeight: 300, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(76,175,80,0.28)'; e.currentTarget.style.color = '#4caf50'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(76,175,80,0.15)'; e.currentTarget.style.color = 'rgba(76,175,80,0.85)'; }}
          >+</button>

          {/* Text input */}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={
              isListening ? '🎤 Listening… speak now'
                : language === 'hi' ? 'कुछ भी पूछें...'
                  : language === 'pa' ? 'ਕੁਝ ਵੀ ਪੁੱਛੋ...'
                    : 'Ask anything...'
            }
            disabled={loading}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: isListening ? '#f87171' : 'rgba(255,255,255,0.9)',
              fontSize: 14, fontFamily: 'Inter', minWidth: 0,
              caretColor: '#4caf50'
            }}
          />

          {/* REC indicator */}
          {isListening && (
            <span style={{
              fontSize: 10, color: '#ef4444', fontWeight: 700,
              animation: 'blink 1s infinite', flexShrink: 0
            }}>● REC</span>
          )}

          {/* Mic button — voice-to-text recorder */}
          <button
            onClick={toggleVoice}
            title={isListening ? 'Stop recording' : 'Record voice input'}
            style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: isListening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)',
              color: isListening ? '#ef4444' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              animation: isListening ? 'listenPulse 1.5s infinite' : 'none'
            }}
            onMouseEnter={e => { if (!isListening) { e.currentTarget.style.background = 'rgba(76,175,80,0.15)'; e.currentTarget.style.color = '#4caf50'; } }}
            onMouseLeave={e => { if (!isListening) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
          >
            {isListening ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {/* Voice chat button — opens fullscreen ChatGPT overlay */}
          <button
            onClick={toggleVoiceMode}
            title="Open real-time voice conversation"
            style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: voiceMode ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.07)',
              color: voiceMode ? '#4caf50' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { if (!voiceMode) { e.currentTarget.style.background = 'rgba(76,175,80,0.15)'; e.currentTarget.style.color = '#4caf50'; } }}
            onMouseLeave={e => { if (!voiceMode) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
          >
            {/* Waveform bars icon */}
            <svg width="18" height="18" viewBox="0 0 100 60">
              {[8, 22, 36, 50, 64, 78, 92].map((x, i) => (
                <rect key={x} x={x - 5} y={15 + [8, 2, 12, 0, 10, 4, 9][i]} width="10"
                  height={[20, 32, 16, 40, 18, 28, 22][i]} rx="5" fill="currentColor" />
              ))}
            </svg>
          </button>

          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || (!input.trim() && attachedFiles.length === 0)}
            title="Send message"
            style={{
              width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: (input.trim() || attachedFiles.length > 0) && !loading
                ? 'linear-gradient(135deg, #4caf50, #2d7a3a)'
                : 'rgba(76,175,80,0.15)',
              color: (input.trim() || attachedFiles.length > 0) && !loading
                ? 'white' : 'rgba(76,175,80,0.4)',
              cursor: (input.trim() || attachedFiles.length > 0) && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (input.trim() || attachedFiles.length > 0) && !loading
                ? '0 3px 12px rgba(45,122,58,0.45)' : 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { if ((input.trim() || attachedFiles.length > 0) && !loading) e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>

        {/* Language selector row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, padding: '0 4px' }}>
          <span style={{ fontSize: 10, color: 'rgba(76,175,80,0.5)' }}>
            🌿 AgriSmart AI · Supports voice, images & files
          </span>
          <select value={language} onChange={e => setLanguage(e.target.value)} style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 8, border: '1px solid rgba(76,175,80,0.2)',
            background: 'transparent', color: 'rgba(76,175,80,0.7)', outline: 'none', cursor: 'pointer'
          }}>
            {Object.entries(langMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* ─── ChatGPT-Style Voice Mode Fullscreen Overlay ─── */}


      {voiceMode && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'radial-gradient(ellipse at center, #0d1f12 0%, #060e08 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'voiceFadeIn 0.4s ease'
        }}>
          {/* Header */}
          <div style={{ position: 'absolute', top: 24, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(76,175,80,0.7)', fontWeight: 600, letterSpacing: 2 }}>
              AGRISMART VOICE
            </span>
          </div>
          <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              style={{
                padding: '5px 10px', borderRadius: 16, border: '1px solid rgba(76,175,80,0.3)',
                background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.8)',
                fontSize: 11, fontFamily: 'Inter', outline: 'none', cursor: 'pointer'
              }}>
              {Object.entries(langMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={toggleVoiceMode} style={{
              width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>x</button>
          </div>

          {/* Animated orb */}
          <div style={{ position: 'relative', marginBottom: 40 }}>
            {[90, 115, 140].map((size, i) => (
              <div key={size} style={{
                position: 'absolute', top: '50%', left: '50%', width: size, height: size,
                borderRadius: '50%', transform: 'translate(-50%, -50%)',
                border: `1px solid rgba(76,175,80,${isListening ? 0.35 - i * 0.1 : 0.12 - i * 0.03})`,
                animation: isListening || isSpeaking ? `voiceRing ${1.8 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` : 'none'
              }} />
            ))}
            <div style={{
              width: 90, height: 90, borderRadius: '50%', position: 'relative', zIndex: 1,
              background: isListening
                ? 'radial-gradient(circle, rgba(239,68,68,0.9), rgba(185,28,28,0.8))'
                : isSpeaking
                  ? 'radial-gradient(circle, rgba(76,175,80,0.9), rgba(45,122,58,0.8))'
                  : 'radial-gradient(circle, rgba(76,175,80,0.55), rgba(30,80,38,0.5))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isListening
                ? '0 0 50px rgba(220,38,38,0.5)'
                : isSpeaking
                  ? '0 0 50px rgba(76,175,80,0.5)'
                  : '0 0 30px rgba(76,175,80,0.25)',
              animation: isListening ? 'orbPulse 1.2s ease-in-out infinite alternate' : isSpeaking ? 'orbSpeak 1s ease-in-out infinite alternate' : 'none',
              transition: 'all 0.4s'
            }}>
              <svg width="40" height="40" viewBox="0 0 100 60">
                {[8, 22, 36, 50, 64, 78, 92].map((x, i) => (
                  <rect key={x} x={x - 5} y={15 + [8, 2, 12, 0, 10, 4, 9][i]} width="10"
                    height={(isListening || isSpeaking) ? [20, 38, 16, 46, 18, 32, 22][i] : [10, 14, 8, 18, 9, 12, 10][i]}
                    rx="5" fill="white"
                    style={{ animation: (isListening || isSpeaking) ? `waveBar 0.6s ease-in-out ${i * 0.1}s infinite alternate` : 'none', transition: 'height 0.3s, y 0.3s' }} />
                ))}
              </svg>
            </div>
          </div>

          {/* Waveform bars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 28, height: 50 }}>
            {Array.from({ length: 30 }, (_, i) => {
              const h = [.3, .6, .4, .8, .5, 1, .45, .75, .35, .9, .55, .7, .4, .85, .5, .65, .35, .8, .45, .7, .3, .6, .5, .9, .4, .75, .55, .45, .38, .65][i];
              return (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  height: (isListening || isSpeaking) ? `${10 + h * 34}px` : '4px',
                  background: isListening
                    ? `rgba(239,68,68,${0.5 + h * 0.5})`
                    : isSpeaking
                      ? `rgba(76,175,80,${0.5 + h * 0.5})`
                      : 'rgba(76,175,80,0.2)',
                  animation: (isListening || isSpeaking) ? `waveBarFull 0.65s ease-in-out ${i * 0.045}s infinite alternate` : 'none',
                  transition: 'height 0.4s ease, background 0.4s'
                }} />);
            })}
          </div>

          {/* Status */}
          <p style={{
            fontSize: 20, fontWeight: 600, marginBottom: 8, textAlign: 'center', minHeight: 30,
            color: isListening ? '#f87171' : isSpeaking ? '#86efac' : loading ? '#fbbf24' : 'rgba(255,255,255,0.55)'
          }}>
            {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : loading ? 'Thinking...' : 'Tap mic to speak'}
          </p>

          {input && isListening && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 380, textAlign: 'center', lineHeight: 1.5, padding: '0 24px' }}>
              {input}
            </p>
          )}

          {/* Last assistant response */}
          {messages.filter(m => m.role === 'assistant').length > 0 && !isListening && !loading && (
            <p style={{ fontSize: 12, color: 'rgba(76,175,80,0.65)', maxWidth: 380, textAlign: 'center', lineHeight: 1.5, padding: '0 24px', marginTop: 8 }}>
              {messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content?.substring(0, 130)}…
            </p>
          )}

          {/* Bottom: Stop + Mic + Speed */}
          <div style={{ position: 'absolute', bottom: 52, display: 'flex', gap: 20, alignItems: 'center' }}>
            {isSpeaking && (
              <button onClick={stopSpeaking} style={{
                width: 52, height: 52, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }} title="Stop speaking">&#9646;&#9646;</button>
            )}
            <button onClick={isListening ? stopListening : startListening}
              style={{
                width: 74, height: 74, borderRadius: '50%', border: 'none',
                background: isListening
                  ? 'radial-gradient(circle, #ef4444, #dc2626)'
                  : 'radial-gradient(circle, #4caf50, #2d7a3a)',
                color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isListening
                  ? '0 0 0 0 rgba(239,68,68,0.4), 0 8px 30px rgba(220,38,38,0.5)'
                  : '0 8px 30px rgba(45,122,58,0.5)',
                animation: isListening ? 'listenPulse 1.5s infinite' : 'none',
                transition: 'all 0.3s'
              }}>
              {isListening ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button onClick={() => setVoiceSpeed(prev => prev === 1.0 ? 1.25 : prev === 1.25 ? 0.85 : 1.0)} style={{
              width: 52, height: 52, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }} title="Speed">{voiceSpeed}x</button>
          </div>
        </div>
      )}



      <style>{`
        @keyframes voiceFadeIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
        @keyframes voiceRing {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity:0.6; }
          100% { transform: translate(-50%,-50%) scale(1.5); opacity:0; }
        }
        @keyframes orbPulse {
          0%   { transform:scale(1);    box-shadow:0 0 30px rgba(220,38,38,0.4); }
          100% { transform:scale(1.07); box-shadow:0 0 65px rgba(220,38,38,0.65); }
        }
        @keyframes orbSpeak {
          0%   { transform:scale(1);    box-shadow:0 0 30px rgba(76,175,80,0.4); }
          100% { transform:scale(1.06); box-shadow:0 0 60px rgba(76,175,80,0.65); }
        }
        @keyframes waveBar {
          0%   { transform:scaleY(0.45); }
          100% { transform:scaleY(1.55); }
        }
        @keyframes waveBarFull {
          0%   { transform:scaleY(0.3); }
          100% { transform:scaleY(1.7); }
        }
        @keyframes listenPulse {
          0%   { box-shadow:0 0 0 0   rgba(220,38,38,0.5), 0 8px 30px rgba(220,38,38,0.5); }
          70%  { box-shadow:0 0 0 20px rgba(220,38,38,0),   0 8px 30px rgba(220,38,38,0.5); }
          100% { box-shadow:0 0 0 0   rgba(220,38,38,0),   0 8px 30px rgba(220,38,38,0.5); }
        }
        @keyframes pulse {
          0%   { box-shadow:0 0 0 0   rgba(220,38,38,0.4); }
          70%  { box-shadow:0 0 0 10px rgba(220,38,38,0); }
          100% { box-shadow:0 0 0 0   rgba(220,38,38,0); }
        }
        @keyframes blink { 0%,50% { opacity:1; } 51%,100% { opacity:0; } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-6px); } }
      `}</style>
    </div>
  );
}

