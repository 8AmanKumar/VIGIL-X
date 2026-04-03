// Configuration
const API_URL = "http://localhost:8000";

document.addEventListener('DOMContentLoaded', async () => {
  const urlDisplay = document.getElementById('current-url');
  const rescanBtn = document.getElementById('rescan-btn');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  
  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url) {
    urlDisplay.textContent = tab.url;
    scanUrl(tab.url);
  }

  rescanBtn.addEventListener('click', () => {
    if (tab && tab.url) {
      scanUrl(tab.url);
    }
  });

  // Chatbot logic
  sendBtn.addEventListener('click', handleChat);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChat();
  });
});

async function scanUrl(url) {
  const scoreEl = document.getElementById('threat-score');
  const verdictEl = document.getElementById('threat-verdict');
  
  scoreEl.textContent = '...';
  scoreEl.className = 'score';
  verdictEl.textContent = 'Analyzing patterns...';

  try {
    // In a real scenario, this would call an API endpoint like /api/analyze-url
    // For the hackathon, we simulate a scan based on the URL text just to show the UI
    setTimeout(() => {
      let isRisky = url.includes('http://') || url.includes('login') || url.includes('.xyz');
      if (url.includes('google') || url.includes('localhost')) {
          isRisky = false;
      }
      
      const score = isRisky ? (Math.random() * 0.4).toFixed(2) : (0.7 + Math.random() * 0.3).toFixed(2);
      
      scoreEl.textContent = score;
      
      if (score < 0.4) {
        scoreEl.className = 'score danger';
        verdictEl.textContent = 'Dangerous: Phishing / Bot Activity Detected';
        verdictEl.style.color = 'var(--danger)';
      } else if (score < 0.7) {
        scoreEl.className = 'score warn';
        verdictEl.textContent = 'Suspicious: Unusual Patterns Detected';
        verdictEl.style.color = 'var(--warn)';
      } else {
        scoreEl.className = 'score safe';
        verdictEl.textContent = 'Safe: Verified Secure Connection';
        verdictEl.style.color = 'var(--safe)';
      }
    }, 800);
    
  } catch (err) {
    verdictEl.textContent = 'Analysis Failed. Backend offline.';
  }
}

async function handleChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  appendMessage('user', msg);
  input.value = '';

  const typingId = appendMessage('bot', '...', true);

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: msg, session_id: 'extension_user' })
    });

    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    
    updateMessage(typingId, data.response);
  } catch (err) {
    updateMessage(typingId, 'Error: Could not connect to VigilX Engine.');
  }
}

function appendMessage(sender, text, isTyping = false) {
  const window = document.getElementById('chat-window');
  const div = document.createElement('div');
  const id = `msg-${Date.now()}`;
  div.id = id;
  div.className = `message ${sender}`;
  if (isTyping) div.style.opacity = '0.5';
  
  // Basic markdown bolding
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  div.innerHTML = formattedText;
  
  window.appendChild(div);
  window.scrollTop = window.scrollHeight;
  return id;
}

function updateMessage(id, text) {
  const div = document.getElementById(id);
  if (div) {
    div.style.opacity = '1';
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    div.innerHTML = formattedText;
  }
}
