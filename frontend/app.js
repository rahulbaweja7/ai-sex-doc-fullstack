const voiceBtn = document.getElementById('voiceBtn');
const userLine = document.getElementById('userLine');
const botLine = document.getElementById('botLine');

// Check for browser support
if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
  voiceBtn.disabled = true;
  voiceBtn.textContent = 'Voice Not Supported';
  botLine.textContent = 'Your browser does not support speech recognition';
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

let isProcessing = false;

voiceBtn.addEventListener('click', async () => {
  if (isProcessing) return;
  
  try {
    voiceBtn.disabled = true;
    voiceBtn.textContent = 'Listening...';
    recognition.start();
  } catch (error) {
    console.error('Recognition start error:', error);
    botLine.textContent = 'Failed to start voice recognition';
    resetButton();
  }
});

recognition.onresult = async (event) => {
  isProcessing = true;
  const userSpeech = event.results[0][0].transcript.trim();
  
  if (!userSpeech) {
    botLine.textContent = 'Could not understand speech';
    resetButton();
    return;
  }

  userLine.textContent = `You: ${userSpeech}`;
  botLine.textContent = 'Dr. AI: Thinking...';
  
  try {
    const aiResponse = await getAIResponse(userSpeech);
    botLine.textContent = `Dr. AI: ${aiResponse}`;
    speakResponseWithFemaleVoice(aiResponse);
  } catch (error) {
    console.error('AI response error:', error);
    botLine.textContent = 'Sorry, I encountered an error processing your request';
  } finally {
    resetButton();
  }
};

recognition.onerror = (event) => {
  console.error('Recognition error:', event.error);
  botLine.textContent = `Error: ${event.error === 'no-speech' ? 'No speech detected' : 'Voice recognition failed'}`;
  resetButton();
};

recognition.onend = () => {
  if (voiceBtn.textContent === 'Listening...') {
    resetButton();
  }
};

function resetButton() {
  voiceBtn.textContent = 'Start Talking';
  voiceBtn.disabled = false;
  isProcessing = false;
}

function speakResponseWithFemaleVoice(text) {
  if ('speechSynthesis' in window) {
    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Find a female voice (filter for English female voices)
    let femaleVoice = voices.find(voice => {
      return voice.lang.includes('en') && 
             (voice.name.includes('Female') || 
              voice.name.includes('Woman') || 
              voice.name.includes('Samantha') || 
              voice.name.includes('Zira'));
    });

    // Fallback to first available English voice if no specific female voice found
    if (!femaleVoice) {
      femaleVoice = voices.find(voice => voice.lang.includes('en'));
    }

    if (femaleVoice) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = femaleVoice;
      utterance.rate = 1; // Slightly slower than normal
      utterance.pitch = 1.1; // Slightly higher pitch
      speechSynthesis.speak(utterance);
    } else {
      console.warn('No female voice found - using default voice');
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  }
}

// Load voices when they become available
window.speechSynthesis.onvoiceschanged = function() {
  console.log('Voices loaded');
};

async function getAIResponse(input) {
  // First check if input is empty
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return "I didn't quite catch that. Could you please repeat your question?";
  }

  try {
    // Try to get response from API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate the response structure
    if (!data || typeof data.reply !== 'string') {
      throw new Error('Invalid response format from API');
    }
    
    return data.reply;
    
  } catch (error) {
    console.error('Error getting AI response:', error);
  }
}