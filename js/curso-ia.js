/**
 * CursoAPP - AI-Powered Course Builder
 * Generates personalized courses in electrical engineering, electronics, automation and AI
 */

const CursoIA = {
    // State management
    state: {
        currentStep: 1,
        topic: '',
        pillars: [],
        selectedPillar: null,
        variations: [],
        selectedVariation: null,
        course: null,
        course: null,
        quizAnswers: {},
        presentationMode: false,
        currentSlide: 0,
        slides: []
    },

    // Initialize the application
    init: () => {
        // Check authentication - wait for SimpleAuth to finish loading
        CursoIA.checkAuthWithRetry();

        // Setup event listeners
        const generateBtn = document.getElementById('generate-pillars-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', CursoIA.generatePillars);
        }

        const topicInput = document.getElementById('topic-input');
        if (topicInput) {
            topicInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    CursoIA.generatePillars();
                }
            });
        }

        // Setup tab functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => CursoIA.switchTab(btn.dataset.tab));
        });

        // Keyboard navigation for presentation
        document.addEventListener('keydown', (e) => {
            if (CursoIA.state.presentationMode) {
                if (e.key === 'ArrowRight' || e.key === 'Space') CursoIA.nextSlide();
                if (e.key === 'ArrowLeft') CursoIA.prevSlide();
                if (e.key === 'Escape') CursoIA.togglePresentation();
            }
        });

        console.log('✅ CursoAPP initialized');
    },

    // Check authentication with retry to wait for async session load
    checkAuthWithRetry: () => {
        if (typeof SimpleAuth === 'undefined') {
            // SimpleAuth not loaded, show login after short delay
            setTimeout(() => CursoIA.showLoginPrompt(), 500);
            return;
        }

        // Check immediately if already logged in (from localStorage fast path)
        let token = null;
        try {
            token = localStorage.getItem('auth_token');
        } catch (e) {
            console.warn('Storage access disabled');
        }

        if (token && SimpleAuth.state.isLoggedIn) {
            // Already logged in, no prompt needed
            return;
        }

        // If there's a token but session not loaded yet, wait for it
        if (token) {
            let attempts = 0;
            const maxAttempts = 20; // Wait up to 10 seconds (20 * 500ms)
            
            const checkInterval = setInterval(() => {
                attempts++;
                if (SimpleAuth.state.isLoggedIn) {
                    clearInterval(checkInterval);
                    CursoIA.removeLoginPrompt(); // Remove if it was shown
                    return;
                }
                if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    // Token exists but couldn't validate - show login
                    CursoIA.showLoginPrompt();
                }
            }, 500);
        } else {
            // No token at all - show login after short delay
            setTimeout(() => {
                if (!SimpleAuth.state.isLoggedIn) {
                    CursoIA.showLoginPrompt();
                }
            }, 1000);
        }
    },

    // Remove login prompt overlay if it exists
    removeLoginPrompt: () => {
        const overlay = document.querySelector('.login-prompt-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    // Show login prompt for non-authenticated users
    showLoginPrompt: () => {
        // Don't show if already logged in
        if (SimpleAuth && SimpleAuth.state.isLoggedIn) {
            return;
        }

        // Don't show if already visible
        if (document.querySelector('.login-prompt-overlay')) {
            return;
        }

        const container = document.querySelector('.curso-app-container');
        if (!container) return;

        const overlay = document.createElement('div');
        overlay.className = 'login-prompt-overlay';
        overlay.id = 'curso-login-overlay';
        overlay.innerHTML = `
            <div class="login-prompt">
                <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--electric-blue); margin-bottom: 20px;"></i>
                <h2>Acceso Requerido</h2>
                <p>Para crear cursos personalizados con IA, necesitas iniciar sesión.</p>
                <button class="btn btn-primary" onclick="CursoIA.openLoginModal()">
                    <i class="fa-solid fa-sign-in-alt"></i> Iniciar Sesión
                </button>
                <p style="margin-top: 15px; font-size: 13px; color: var(--text-secondary);">
                    ¿No tienes cuenta? <a href="#" onclick="CursoIA.openRegisterModal(); return false;" style="color: var(--electric-blue);">Regístrate gratis</a>
                </p>
            </div>
        `;
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(10, 12, 18, 0.95);
            display: flex; align-items: center; justify-content: center;
            z-index: 999;
        `;
        overlay.querySelector('.login-prompt').style.cssText = `
            text-align: center; padding: 40px; background: var(--card-bg);
            border-radius: 16px; border: 1px solid var(--border-color);
            max-width: 400px;
        `;
        container.appendChild(overlay);

        // Monitor for successful login and remove overlay
        CursoIA.startLoginMonitor();
    },

    // Open login modal and start monitoring
    openLoginModal: () => {
        if (window.openAuthModal) {
            window.openAuthModal('login');
        } else {
            alert('Por favor inicia sesión');
        }
    },

    // Open register modal
    openRegisterModal: () => {
        if (window.openAuthModal) {
            window.openAuthModal('register');
        }
    },

    // Monitor for successful login to remove overlay
    startLoginMonitor: () => {
        if (CursoIA._loginMonitor) {
            clearInterval(CursoIA._loginMonitor);
        }
        
        CursoIA._loginMonitor = setInterval(() => {
            if (typeof SimpleAuth !== 'undefined' && SimpleAuth.state.isLoggedIn) {
                CursoIA.removeLoginPrompt();
                clearInterval(CursoIA._loginMonitor);
                CursoIA._loginMonitor = null;
            }
        }, 500);
    },

    // Set topic from suggestion
    setTopic: (topic) => {
        const input = document.getElementById('topic-input');
        if (input) {
            input.value = topic;
            input.focus();
        }
    },

    // Navigate to a specific step
    goToStep: (step) => {
        CursoIA.state.currentStep = step;

        // Update step content visibility
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById(`step-${step}`).classList.add('active');

        // Update stepper
        document.querySelectorAll('.step').forEach(el => {
            const stepNum = parseInt(el.dataset.step);
            el.classList.remove('active', 'completed');
            if (stepNum < step) el.classList.add('completed');
            if (stepNum === step) el.classList.add('active');
        });

        // Update step lines
        document.querySelectorAll('.step-line').forEach((el, idx) => {
            el.classList.toggle('active', idx < step - 1);
        });
    },

    // Show loading overlay
    showLoading: (text = 'Generando contenido...') => {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (overlay) overlay.classList.remove('hidden');
        if (loadingText) loadingText.textContent = text;
    },

    // Hide loading overlay
    hideLoading: () => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    // Generate pillar topics using AI
    generatePillars: async () => {
        const input = document.getElementById('topic-input');
        const topic = input?.value.trim();

        if (!topic) {
            alert('Por favor ingresa un tema para comenzar.');
            return;
        }

        CursoIA.state.topic = topic;
        CursoIA.showLoading('Analizando tu tema y generando 5 temas pilar...');

        const prompt = `Actúa como un experto en formación técnica especializado en ingeniería eléctrica, electrónica, automatización, control industrial e inteligencia artificial.

El usuario quiere aprender sobre: "${topic}"

Genera exactamente 5 TEMAS PILAR amplios relacionados con este interés. Cada tema pilar debe ser un área de conocimiento fundamental que pueda expandirse en múltiples lecciones.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin texto adicional):
{
    "pillars": [
        {"id": 1, "title": "Título del Pilar 1", "description": "Breve descripción de 1-2 oraciones explicando qué cubre este pilar"},
        {"id": 2, "title": "Título del Pilar 2", "description": "Breve descripción..."},
        ...
    ]
}

Los temas deben ser prácticos, aplicables en la industria y ordenados de básico a avanzado.`;

        try {
            const response = await CursoIA.callGeminiAPI(prompt);
            const data = CursoIA.parseJSON(response);

            if (data && data.pillars && data.pillars.length > 0) {
                CursoIA.state.pillars = data.pillars;
                CursoIA.renderPillars(data.pillars);
            } else {
                throw new Error('Respuesta inválida de la IA');
            }
        } catch (error) {
            console.error('Error generating pillars:', error);
            alert(`Error al generar los temas: ${error.message}`);
        } finally {
            CursoIA.hideLoading();
        }
    },

    // Render pillar cards
    renderPillars: (pillars) => {
        const container = document.getElementById('pillars-list');
        const wrapper = document.getElementById('pillars-container');

        if (!container || !wrapper) return;

        container.innerHTML = pillars.map(pillar => `
            <div class="option-card" onclick="CursoIA.selectPillar(${pillar.id})">
                <span class="card-number">${pillar.id}</span>
                <h3>${pillar.title}</h3>
                <p>${pillar.description}</p>
            </div>
        `).join('');

        wrapper.classList.remove('hidden');
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // Select a pillar and generate variations
    selectPillar: async (id) => {
        const pillar = CursoIA.state.pillars.find(p => p.id === id);
        if (!pillar) return;

        CursoIA.state.selectedPillar = pillar;
        document.getElementById('selected-pillar-name').textContent = pillar.title;

        CursoIA.showLoading('Generando 3 variaciones de lección...');

        const prompt = `Actúa como un experto en diseño instruccional especializado en ingeniería eléctrica, electrónica, automatización y control industrial.

Tema central del usuario: "${CursoIA.state.topic}"
Tema pilar seleccionado: "${pillar.title}" - ${pillar.description}

Genera exactamente 3 VARIACIONES DE LECCIÓN específicas para este pilar. Cada variación debe ser un enfoque único o ángulo diferente para enseñar este tema.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin texto adicional):
{
    "variations": [
        {"id": 1, "title": "Título de la Variación 1", "description": "Descripción del enfoque y qué aprenderá el estudiante", "level": "Básico|Intermedio|Avanzado", "duration": "X horas"},
        {"id": 2, "title": "Título de la Variación 2", "description": "...", "level": "...", "duration": "..."},
        ...
    ]
}

Las variaciones deben cubrir diferentes niveles de dificultad y enfoques prácticos.`;

        try {
            const response = await CursoIA.callGeminiAPI(prompt);
            const data = CursoIA.parseJSON(response);

            if (data && data.variations && data.variations.length > 0) {
                CursoIA.state.variations = data.variations;
                CursoIA.renderVariations(data.variations);
                CursoIA.goToStep(2);
            } else {
                throw new Error('Respuesta inválida de la IA');
            }
        } catch (error) {
            console.error('Error generating variations:', error);
            alert(`Error al generar las variaciones: ${error.message}`);
        } finally {
            CursoIA.hideLoading();
        }
    },

    // Render variation cards
    renderVariations: (variations) => {
        const container = document.getElementById('variations-list');
        if (!container) return;

        const levelColors = {
            'Básico': '#4CAF50',
            'Intermedio': '#FF9800',
            'Avanzado': '#f44336'
        };

        container.innerHTML = variations.map(v => `
            <div class="option-card" onclick="CursoIA.selectVariation(${v.id})">
                <span class="card-number">${v.id}</span>
                <h3>${v.title}</h3>
                <p>${v.description}</p>
                <div style="margin-top: 12px; display: flex; gap: 10px; font-size: 12px;">
                    <span style="padding: 4px 10px; background: ${levelColors[v.level] || '#666'}; border-radius: 12px; color: white;">${v.level}</span>
                    <span style="padding: 4px 10px; background: rgba(0,229,255,0.2); border-radius: 12px; color: var(--electric-blue);">
                        <i class="fa-solid fa-clock"></i> ${v.duration}
                    </span>
                </div>
            </div>
        `).join('');
    },

    // Select a variation and generate full course
    selectVariation: async (id) => {
        const variation = CursoIA.state.variations.find(v => v.id === id);
        if (!variation) return;

        CursoIA.state.selectedVariation = variation;
        CursoIA.showLoading('Generando curso completo con contenido, ejemplos y quiz...');

        const prompt = `Actúa como un instructor experto creando un curso de alta calidad en español sobre ingeniería eléctrica, electrónica o automatización.

Tema central: "${CursoIA.state.topic}"
Pilar: "${CursoIA.state.selectedPillar.title}"
Lección seleccionada: "${variation.title}" - ${variation.description}
Nivel: ${variation.level}
Duración estimada: ${variation.duration}

Genera un CURSO COMPLETO estructurado con todo el contenido formativo. El curso debe ser profesional, práctico y aplicable en la industria.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin texto adicional):
{
    "course": {
        "title": "Título completo del curso",
        "description": "Descripción detallada de qué aprenderá el estudiante",
        "objectives": ["Objetivo 1", "Objetivo 2", "Objetivo 3"],
        "prerequisites": ["Requisito previo 1", "Requisito previo 2"],
        "blocks": [
            {
                "id": 1,
                "title": "Título del Bloque 1",
                "content": "Contenido detallado del bloque en formato HTML. Incluir párrafos <p>, listas <ul><li>, subtítulos <h4>, código <code> o <pre> si aplica. Mínimo 3-4 párrafos por bloque.",
                "keyPoints": ["Punto clave 1", "Punto clave 2", "Punto clave 3"]
            },
            {
                "id": 2,
                "title": "Título del Bloque 2",
                "content": "...",
                "keyPoints": ["..."]
            }
        ],
        "examples": [
            {
                "title": "Ejemplo Práctico 1",
                "description": "Descripción del ejemplo",
                "steps": ["Paso 1", "Paso 2", "Paso 3"],
                "result": "Resultado esperado"
            }
        ],
        "quiz": [
            {
                "id": 1,
                "question": "Pregunta 1",
                "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
                "correctIndex": 0,
                "explanation": "Explicación de por qué esta es la respuesta correcta"
            },
            {
                "id": 2,
                "question": "Pregunta 2",
                "options": ["...", "...", "...", "..."],
                "correctIndex": 1,
                "explanation": "..."
            }
        ],
        "resources": [
            {"title": "Recurso 1", "type": "PDF|Video|Web", "description": "Descripción del recurso"}
        ]
    }
}

IMPORTANTE: Genera mínimo 4 bloques de contenido y 5 preguntas de quiz. El contenido debe ser extenso y de alta calidad formativa.`;

        try {
            const response = await CursoIA.callGeminiAPI(prompt);
            const data = CursoIA.parseJSON(response);

            if (data && data.course) {
                CursoIA.state.course = data.course;
                CursoIA.renderCourse(data.course);
                CursoIA.goToStep(3);
            } else {
                throw new Error('Respuesta inválida de la IA');
            }
        } catch (error) {
            console.error('Error generating course:', error);
            alert(`Error al generar el curso: ${error.message}`);
        } finally {
            CursoIA.hideLoading();
        }
    },

    // Render the full course
    renderCourse: (course) => {
        // Header
        document.getElementById('course-title').textContent = course.title;
        document.getElementById('course-description').textContent = course.description;

        // Content blocks
        const blocksContainer = document.getElementById('course-blocks');
        if (blocksContainer) {
            let blocksHTML = `
                <div class="course-block">
                    <div class="block-header">
                        <div class="block-number"><i class="fa-solid fa-bullseye"></i></div>
                        <h3>Objetivos del Curso</h3>
                    </div>
                    <div class="block-content">
                        <ul>${course.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
                        ${course.prerequisites?.length ? `<h4>Requisitos Previos</h4><ul>${course.prerequisites.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
                    </div>
                </div>
            `;

            course.blocks.forEach(block => {
                blocksHTML += `
                    <div class="course-block">
                        <div class="block-header">
                            <div class="block-number">${block.id}</div>
                            <h3>${block.title}</h3>
                        </div>
                        <div class="block-content">
                            ${block.content}
                            ${block.keyPoints?.length ? `
                                <div style="margin-top: 20px; padding: 15px; background: rgba(0,229,255,0.1); border-radius: 8px; border-left: 4px solid var(--electric-blue);">
                                    <strong><i class="fa-solid fa-key"></i> Puntos Clave:</strong>
                                    <ul style="margin-top: 10px; margin-bottom: 0;">${block.keyPoints.map(kp => `<li>${kp}</li>`).join('')}</ul>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            blocksContainer.innerHTML = blocksHTML;
        }

        // Examples
        const examplesContainer = document.getElementById('course-examples');
        if (examplesContainer && course.examples) {
            examplesContainer.innerHTML = course.examples.map((ex, idx) => `
                <div class="course-block">
                    <div class="block-header" style="background: linear-gradient(135deg, rgba(255, 152, 0, 0.1), transparent);">
                        <div class="block-number" style="background: var(--safety-orange);">${idx + 1}</div>
                        <h3>${ex.title}</h3>
                    </div>
                    <div class="block-content">
                        <p>${ex.description}</p>
                        <h4>Pasos:</h4>
                        <ol>${ex.steps.map(s => `<li>${s}</li>`).join('')}</ol>
                        <div style="margin-top: 15px; padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 8px; border-left: 4px solid #4CAF50;">
                            <strong><i class="fa-solid fa-check-circle"></i> Resultado Esperado:</strong>
                            <p style="margin: 8px 0 0 0;">${ex.result}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Quiz
        CursoIA.renderQuiz(course.quiz);

        // Resources
        const resourcesContainer = document.getElementById('course-resources');
        if (resourcesContainer && course.resources) {
            const typeIcons = {
                'PDF': 'fa-file-pdf',
                'Video': 'fa-video',
                'Web': 'fa-globe'
            };
            resourcesContainer.innerHTML = `
                <div class="course-block">
                    <div class="block-header">
                        <div class="block-number"><i class="fa-solid fa-bookmark"></i></div>
                        <h3>Recursos Adicionales</h3>
                    </div>
                    <div class="block-content">
                        ${course.resources.map(r => `
                            <div style="padding: 15px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 15px;">
                                <i class="fa-solid ${typeIcons[r.type] || 'fa-link'}" style="font-size: 24px; color: var(--electric-blue);"></i>
                                <div>
                                    <strong>${r.title}</strong>
                                    <span style="padding: 2px 8px; background: rgba(0,229,255,0.2); border-radius: 10px; font-size: 11px; margin-left: 10px;">${r.type}</span>
                                    <p style="margin: 5px 0 0 0; font-size: 14px; color: var(--text-secondary);">${r.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    },

    // Render quiz questions
    renderQuiz: (questions) => {
        const container = document.getElementById('quiz-container');
        if (!container || !questions) return;

        CursoIA.state.quizAnswers = {};

        const optionLetters = ['A', 'B', 'C', 'D'];

        let html = questions.map(q => `
            <div class="quiz-question" data-question-id="${q.id}">
                <h4><span class="q-number">Pregunta ${q.id}:</span> ${q.question}</h4>
                <div class="quiz-options">
                    ${q.options.map((opt, idx) => `
                        <div class="quiz-option" data-question="${q.id}" data-index="${idx}" onclick="CursoIA.selectAnswer(${q.id}, ${idx})">
                            <span class="option-letter">${optionLetters[idx]}</span>
                            <span>${opt}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="quiz-explanation hidden" id="explanation-${q.id}" style="margin-top: 15px; padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
                    <strong><i class="fa-solid fa-lightbulb"></i> Explicación:</strong>
                    <p style="margin: 8px 0 0 0;">${q.explanation}</p>
                </div>
            </div>
        `).join('');

        html += `
            <button class="btn btn-primary" onclick="CursoIA.checkQuiz()" style="width: 100%; padding: 16px; margin-top: 20px;">
                <i class="fa-solid fa-check-circle"></i> Verificar Respuestas
            </button>
            <div id="quiz-results" class="quiz-results hidden"></div>
        `;

        container.innerHTML = html;
    },

    // Select quiz answer
    selectAnswer: (questionId, optionIndex) => {
        CursoIA.state.quizAnswers[questionId] = optionIndex;

        // Update UI
        document.querySelectorAll(`.quiz-option[data-question="${questionId}"]`).forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelector(`.quiz-option[data-question="${questionId}"][data-index="${optionIndex}"]`)?.classList.add('selected');
    },

    // Check quiz answers
    checkQuiz: () => {
        const quiz = CursoIA.state.course?.quiz;
        if (!quiz) return;

        let correct = 0;
        let total = quiz.length;

        quiz.forEach(q => {
            const userAnswer = CursoIA.state.quizAnswers[q.id];
            const options = document.querySelectorAll(`.quiz-option[data-question="${q.id}"]`);

            options.forEach((opt, idx) => {
                opt.classList.remove('selected');
                if (idx === q.correctIndex) {
                    opt.classList.add('correct');
                } else if (idx === userAnswer && userAnswer !== q.correctIndex) {
                    opt.classList.add('incorrect');
                }
            });

            // Show explanation
            document.getElementById(`explanation-${q.id}`)?.classList.remove('hidden');

            if (userAnswer === q.correctIndex) {
                correct++;
            }
        });

        // Show results
        const resultsDiv = document.getElementById('quiz-results');
        const percentage = Math.round((correct / total) * 100);
        const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '📚';

        resultsDiv.innerHTML = `
            <h3>${emoji} Resultados del Quiz</h3>
            <div class="score">${correct}/${total}</div>
            <p>Has acertado el <strong>${percentage}%</strong> de las preguntas.</p>
            <p style="color: var(--text-secondary); margin-top: 10px;">
                ${percentage >= 80 ? '¡Excelente trabajo! Dominas muy bien este tema.' :
                  percentage >= 60 ? 'Buen trabajo. Repasa los puntos donde fallaste.' :
                  'Te recomendamos revisar el contenido y volver a intentarlo.'}
            </p>
        `;
        resultsDiv.classList.remove('hidden');
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    },

    // Switch between tabs
    switchTab: (tabName) => {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    },

    // Download course as PDF (placeholder - would need jsPDF)
    downloadCourse: () => {
        alert('Función de descarga PDF en desarrollo. Por ahora puedes usar Ctrl+P para imprimir la página.');
    },

    // Call Gemini API via Backend Proxy
    callGeminiAPI: async (prompt) => {
        try {
            const response = await fetch(`${API_BASE_URL}/generate-content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192
                    }
                })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Has excedido el límite de consultas de la IA (Error 429). Por favor espera un minuto e intenta de nuevo.');
                }
                const errData = await response.json();
                const errMsg = errData.error?.message || response.statusText;
                throw new Error(`API error (${response.status}): ${errMsg}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
        } catch (error) {
            console.error("Proxy Error:", error);
            throw error;
        }
    },

    // Presentation Mode Logic
    togglePresentation: () => {
        const overlay = document.getElementById('presentation-overlay');
        const course = CursoIA.state.course;
        
        if (!course) return;

        CursoIA.state.presentationMode = !CursoIA.state.presentationMode;

        if (CursoIA.state.presentationMode) {
            // Prepare slides
            CursoIA.prepareSlides(course);
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            CursoIA.renderSlide(0);
        } else {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    prepareSlides: (course) => {
        const slides = [];

        // Title Slide
        slides.push({
            type: 'Introducción',
            title: course.title,
            content: `<p>${course.description}</p>`,
            isTitle: true
        });

        // Objectives Slide
        slides.push({
            type: 'Objetivos',
            title: '¿Qué aprenderás?',
            content: `<ul>${course.objectives.map(o => `<li>${o}</li>`).join('')}</ul>`
        });

        // Content Blocks (Split into digestible chunks if needed, keeping simple for now)
        course.blocks.forEach((block, idx) => {
            slides.push({
                type: `Módulo ${block.id}`,
                title: block.title,
                content: block.content, // HTML content
                keyPoints: block.keyPoints
            });
        });

        // Examples
        if (course.examples) {
            course.examples.forEach((ex, idx) => {
                slides.push({
                    type: 'Ejemplo Práctico',
                    title: ex.title,
                    content: `
                        <p>${ex.description}</p>
                        <div style="margin-top: 20px; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                            <strong>Pasos:</strong>
                            <ol style="margin-top: 10px;">${ex.steps.map(s => `<li>${s}</li>`).join('')}</ol>
                        </div>
                        <div style="margin-top: 20px; color: #4caf50;">
                            <strong><i class="fa-solid fa-check-circle"></i> Resultado:</strong> ${ex.result}
                        </div>
                    `
                });
            });
        }

        CursoIA.state.slides = slides;
        CursoIA.state.currentSlide = 0;
    },

    renderSlide: (index) => {
        if (index < 0 || index >= CursoIA.state.slides.length) return;
        
        CursoIA.state.currentSlide = index;
        const slide = CursoIA.state.slides[index];
        const container = document.getElementById('slide-content');
        
        // Check for special key points formatting
        let extraContent = '';
        if (slide.keyPoints) {
            extraContent = `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <strong style="color: var(--electric-blue); text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Puntos Clave</strong>
                    <ul style="margin-top: 15px;">${slide.keyPoints.map(k => `<li>${k}</li>`).join('')}</ul>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="slide-type">${slide.type}</div>
            <h2 class="slide-title" style="${slide.isTitle ? 'font-size: 56px; text-align: center;' : ''}">${slide.title}</h2>
            <div class="slide-body" style="${slide.isTitle ? 'text-align: center;' : ''}">
                ${slide.content}
                ${extraContent}
            </div>
        `;

        // Update progress
        document.getElementById('current-slide').textContent = index + 1;
        document.getElementById('total-slides').textContent = CursoIA.state.slides.length;
        
        const progressPercent = ((index + 1) / CursoIA.state.slides.length) * 100;
        document.getElementById('slide-progress-bar').style.width = `${progressPercent}%`;
    },

    nextSlide: () => {
        if (CursoIA.state.currentSlide < CursoIA.state.slides.length - 1) {
            CursoIA.renderSlide(CursoIA.state.currentSlide + 1);
        }
    },

    prevSlide: () => {
        if (CursoIA.state.currentSlide > 0) {
            CursoIA.renderSlide(CursoIA.state.currentSlide - 1);
        }
    },

    // Parse JSON from AI response (handles markdown code blocks)
    parseJSON: (text) => {
        try {
            // Remove markdown code blocks if present
            let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('JSON parse error:', e, 'Text:', text);
            return null;
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', CursoIA.init);
