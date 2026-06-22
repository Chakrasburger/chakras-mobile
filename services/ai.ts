import axios from 'axios';

const SYSTEM_PROMPT = `Eres un asistente experto en música integrado en el reproductor ChakrasPlayer. 
Tu objetivo es ayudar al usuario a crear playlists, recomendar canciones basándote en sus gustos, y analizar música.
Tienes conocimiento de la biblioteca local del usuario (que se te proporcionará en el contexto).
Responde de manera amigable, concisa y útil.`;

export async function sendMessage(
  message: string,
  provider: 'gemini' | 'openrouter',
  apiKey: string,
  model: string,
  context?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('API Key is required');
  }

  const fullPrompt = context 
    ? `CONTEXTO BIBLIOTECA DEL USUARIO:\n${context}\n\nPREGUNTA DEL USUARIO:\n${message}`
    : message;

  if (provider === 'gemini') {
    return fetchGemini(fullPrompt, apiKey, model);
  } else {
    return fetchOpenRouter(fullPrompt, apiKey, model);
  }
}

async function fetchGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    }
    throw new Error('Invalid response format from Gemini API');
  } catch (error: any) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Error connecting to AI service');
  }
}

async function fetchOpenRouter(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const payload = {
    model: model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/chakrasburger/antigravity-music-player',
        'X-Title': 'ChakrasPlayer Mobile'
      }
    });
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }
    throw new Error('Invalid response format from OpenRouter API');
  } catch (error: any) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Error connecting to AI service');
  }
}
