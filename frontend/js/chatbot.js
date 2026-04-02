document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('chatbotTrigger');
    const windowEl = document.getElementById('chatbotWindow');
    const closeBtn = document.getElementById('chatCloseBtn');
    const sendBtn = document.getElementById('chatSendBtn');
    const inputEl = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');

    if (!trigger || !windowEl) return;

    trigger.addEventListener('click', () => {
        windowEl.style.display = 'flex';
        trigger.style.display = 'none';
        inputEl.focus();
    });

    closeBtn.addEventListener('click', () => {
        windowEl.style.display = 'none';
        trigger.style.display = 'flex';
    });

    function appendMessage(text, isBot) {
        const div = document.createElement('div');
        div.className = `chat-msg ${isBot ? 'bot-msg' : 'user-msg'}`;
        div.innerText = text;
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    async function sendMessage() {
        const text = inputEl.value.trim();
        if (!text) return;

        appendMessage(text, false);
        inputEl.value = '';

        // Add loading Indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-msg bot-msg';
        loadingDiv.innerText = '...';
        loadingDiv.id = 'chatLoading';
        chatBody.appendChild(loadingDiv);
        chatBody.scrollTop = chatBody.scrollHeight;

        try {
            const res = await fetch(`${window.VIGILX_CONFIG.apiUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text })
            });
            const data = await res.json();
            
            chatBody.removeChild(document.getElementById('chatLoading'));
            appendMessage(data.response, true);
        } catch (e) {
            chatBody.removeChild(document.getElementById('chatLoading'));
            appendMessage("Sorry, I'm offline right now.", true);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});
