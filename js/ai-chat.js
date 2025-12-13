/**
 * ai-chat.js
 * ElectrIA - AI Assistant Logic (Gemini API Integration)
 */

const ElectrIA = {
    // System Prompt for the AI
    systemPrompt: `Eres ElectrIA, un asistente experto en ingeniería eléctrica y específicamente en la norma venezolana Fondonorma 200-2009 (Código Eléctrico Nacional de Venezuela). 
    Tu objetivo es ayudar a ingenieros, técnicos y estudiantes con cálculos y consultas sobre la norma.
    
    Reglas:
    1. Responde SIEMPRE basándote en la norma Fondonorma 200-2009. Cita secciones o artículos cuando sea posible (ej. "Según la Sección 220...").
    2. Si te piden cálculos, explica el procedimiento paso a paso según la norma.
    3. Sé profesional, preciso y técnico, pero accesible.
    4. Si no sabes la respuesta o no está en la norma, indícalo honestamente.
    5. Tus respuestas deben ser en formato texto plano o markdown simple (negritas, listas).
    6. Si el usuario saluda, preséntate brevemente como experto en la norma.
    `,

    history: [],

    callGeminiAPI: async (userMessage) => {
        // Use backend proxy to hide API key
        if (typeof API_BASE_URL === 'undefined') {
             console.error("API configuration not found.");
             return "Error de configuración: No se encontró la URL de la API.";
        }

        const url = `${API_BASE_URL}/generate-content`;
        
        // Construct the prompt with system instructions
        const fullPrompt = ElectrIA.systemPrompt + "\n\nUsuario: " + userMessage;

        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: fullPrompt }]
                }
            ]
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                throw new Error(`API Error ${response.status}: ${errorMessage}`);
            }

            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                 throw new Error("No candidates returned from API");
            }
            const botResponse = data.candidates[0].content.parts[0].text;
            return botResponse;

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return `Error técnico: ${error.message}. Por favor intenta más tarde.`;
        }
    },

    getResponse: async (input) => {
        // Show typing indicator or similar if needed, but the UI handles the delay.
        // Here we actually wait for the API.
        return await ElectrIA.callGeminiAPI(input);
    },

    init: () => {
        const container = document.getElementById('chat-widget-container');
        if (!container) return;

        container.innerHTML = `
            <div class="chat-widget">
                <div class="chat-window" id="chat-window">
                    <div class="chat-header">
                        <img src="images/electria-avatar.png" alt="ElectrIA" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; vertical-align: middle;">
                        <h3 style="display: inline-block; margin: 0;">ElectrIA Assistant</h3>
                        <div class="chat-status"></div>
                    </div>
                    <div class="chat-messages" id="chat-messages">
                        <div class="message bot">
                            Hola, soy ElectrIA. Tu experto en la norma Fondonorma 200-2009. Pregúntame sobre cálculos o artículos específicos.
                        </div>
                    </div>
                    <div class="chat-input-area">
                        <input type="text" id="chat-input" placeholder="Escribe tu consulta...">
                        <button class="chat-send" id="chat-send"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>
                <div class="chat-toggle" id="chat-toggle">
                    <img src="images/electria-avatar.png" alt="ElectrIA" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                </div>
            </div>
        `;

        // Event Listeners
        const toggle = document.getElementById('chat-toggle');
        const window = document.getElementById('chat-window');
        const input = document.getElementById('chat-input');
        const send = document.getElementById('chat-send');
        const messages = document.getElementById('chat-messages');

        toggle.addEventListener('click', () => {
            window.classList.toggle('open');
            if (window.classList.contains('open')) input.focus();
        });

        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text) return;

            // User Message
            messages.innerHTML += `<div class="message user">${text}</div>`;
            input.value = '';
            messages.scrollTop = messages.scrollHeight;

            // Add loading bubble
            const loadingId = 'loading-' + Date.now();
            messages.innerHTML += `<div class="message bot" id="${loadingId}"><i class="fa-solid fa-circle-notch fa-spin"></i> Analizando...</div>`;
            messages.scrollTop = messages.scrollHeight;

            // Get Response
            const response = await ElectrIA.getResponse(text);
            
            // Remove loading and add response
            const loadingMsg = document.getElementById(loadingId);
            if (loadingMsg) loadingMsg.remove();

            // Format response (simple markdown to html conversion could be added here if needed)
            // For now, we just replace newlines with <br>
            const formattedResponse = response.replace(/\n/g, '<br>');

            messages.innerHTML += `<div class="message bot">${formattedResponse}</div>`;
            messages.scrollTop = messages.scrollHeight;
        };

        send.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
};

document.addEventListener('DOMContentLoaded', ElectrIA.init);
