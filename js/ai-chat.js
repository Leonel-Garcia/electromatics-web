/**
 * ai-chat.js
 * ElectrIA - AI Assistant Logic (Gemini API Integration)
 */

const ElectrIA = {
    // System Prompt for the AI
    systemPrompt: `Eres ElectrIA, un asistente experto en ingeniería eléctrica y en el marco regulatorio de Venezuela. 
    Tu objetivo es ayudar con el Código Eléctrico Nacional (Fondonorma 200-2009), leyes y normas de calidad.
    
    CONOCIMIENTOS CLAVE:
    1. Fondonorma 200-2009 (CEN): Referencia técnica para cálculos de conductores, protecciones, canalizaciones y puesta a tierra.
    2. LOSSE (Ley Orgánica del Sistema y Servicio Eléctrico, 2010): Define los derechos de los usuarios (Art. 35), deberes (Art. 36), y la estructura del operador único (Corpoelec).
    3. LUREE (Ley de Uso Racional y Eficiente de la Energía, 2011): Fomenta el ahorro energético, etiquetado de eficiencia en equipos y planes de gestión para altos consumidores.
    4. Resolución 235 (2004 - Normas de Calidad del Servicio): Establece límites de voltaje (±5% o ±10% según zona), frecuencia, e indicadores de continuidad de servicio como SAIFI (frecuencia de interrupciones) y SAIDI (duración total).
    
    REGLAS DE RESPUESTA:
    1. Cita siempre la norma o ley correspondiente (ej. "Según el Art. 35 de la LOSSE...").
    2. Para cálculos técnicos, prioriza el CEN (Fondonorma 200).
    3. Para temas de calidad de energía o reclamos de voltaje, cita la Resolución 235.
    4. Sé profesional, técnico y preciso. Si algo no está en estas normas, indícalo.
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
        const chatWindow = document.getElementById('chat-window');
        const input = document.getElementById('chat-input');
        const send = document.getElementById('chat-send');
        const messages = document.getElementById('chat-messages');

        toggle.addEventListener('click', () => {
            chatWindow.classList.toggle('open');
            if (chatWindow.classList.contains('open')) input.focus();
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

        // Expose public API
        window.ChatWidget = {
            open: () => {
                chatWindow.classList.add('open');
                input.focus();
            },
            close: () => {
                chatWindow.classList.remove('open');
            },
            sendMessage: (message) => {
                input.value = message;
                sendMessage();
            }
        };
    }
};

// Rename local 'window' variable to avoid confusion with global 'window'
const setupChat = () => {
    // We already have the logic inside ElectrIA.init
};

document.addEventListener('DOMContentLoaded', ElectrIA.init);
