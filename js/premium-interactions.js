/**
 * PREMIUM-INTERACTIONS.JS - v1.0
 * Mejoras de interactividad y animaciones para Electromatics
 */

(function() {
  'use strict';

  // ================================================
  // 1. INTERSECTION OBSERVER - Animaciones al Scroll
  // ================================================
  function initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          
          // Si tiene hijos con delay, animarlos en secuencia
          const delayedChildren = entry.target.querySelectorAll('[class*="delay-"]');
          delayedChildren.forEach((child, index) => {
            setTimeout(() => {
              child.style.opacity = '1';
              child.style.transform = 'translateY(0)';
            }, index * 100);
          });
        }
      });
    }, observerOptions);

    // Observar todos los elementos con clases de animación
    document.querySelectorAll('.animate-fadeInUp, .animate-fadeInDown, .animate-scaleIn, .glass-card, .feature-card-premium').forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  // ================================================
  // 2. EFECTO PARALLAX EN BACKGROUND
  // ================================================
  function initParallaxEffect() {
    document.addEventListener('mousemove', (e) => {
      const cards = document.querySelectorAll('.glass-card-premium, .feature-card-premium');
      
      cards.forEach(card => {
        const speed = 5;
        const x = (window.innerWidth - e.pageX * speed) / 100;
        const y = (window.innerHeight - e.pageY * speed) / 100;
        
        card.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg)`;
      });
    });

    // Reset en mouse leave
    document.addEventListener('mouseleave', () => {
      const cards = document.querySelectorAll('.glass-card-premium, .feature-card-premium');
      cards.forEach(card => {
        card.style.transform = '';
      });
    });
  }

  // ================================================
  // 3. TYPING EFFECT PARA PLACEHOLDERS
  // ================================================
  function initTypingEffect() {
    const input = document.getElementById('ai-input');
    if (!input) return;

    const phrases = [
      '💬 Calcula un motor de 10HP a 230V trifásico...',
      '🏠 ¿Cuál es la carga de una residencia de 150m²?',
      '⚡ Dimensiona conductor para 50A...',
      '📖 ¿Qué dice la norma sobre iluminación?',
      '🔧 Calcula caída de tensión en 50 metros...'
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
      const currentPhrase = phrases[phraseIndex];

      if (isDeleting) {
        input.placeholder = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50;
      } else {
        input.placeholder = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
      }

      if (!isDeleting && charIndex === currentPhrase.length) {
        typingSpeed = 2000; // Pausa al final
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typingSpeed = 500; // Pausa antes de empezar nueva frase
      }

      setTimeout(type, typingSpeed);
    }

    // Iniciar typing effect solo si el input está vacío
    if (!input.value) {
      setTimeout(type, 1000);
    }

    // Detener typing cuando el usuario empiece a escribir
    input.addEventListener('focus', () => {
      if (!input.value) {
        input.placeholder = '💬 Escribe tu consulta aquí...';
      }
    });
  }

  // ================================================
  // 4. PARTÍCULAS FLOTANTES EN BACKGROUND
  // ================================================
  function initFloatingParticles() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'floating-particles';
    particleContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    `;

    // Crear partículas
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const size = Math.random() * 4 + 2;
      const left = Math.random() * 100;
      const delay = Math.random() * 20;
      const duration = Math.random() * 20 + 15;
      
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, rgba(0, 229, 255, 0.6), transparent);
        border-radius: 50%;
        left: ${left}%;
        bottom: -50px;
        animation: floatUp ${duration}s linear infinite;
        animation-delay: ${delay}s;
        opacity: ${Math.random() * 0.5 + 0.3};
      `;
      
      particleContainer.appendChild(particle);
    }

    document.body.appendChild(particleContainer);

    // CSS Animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes floatUp {
        to {
          transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ================================================
  // 5. HOVER GLOW EFFECT EN SUGGESTION CHIPS
  // ================================================
  function initSuggestionChipEffects() {
    const chips = document.querySelectorAll('.suggestion-chip');
    
    chips.forEach(chip => {
      chip.addEventListener('mouseenter', function(e) {
        this.style.transform = 'translateY(-3px) scale(1.05)';
        this.style.boxShadow = '0 8px 16px rgba(0, 229, 255, 0.3)';
      });
      
      chip.addEventListener('mouseleave', function(e) {
        this.style.transform = '';
        this.style.boxShadow = '';
      });

      // Ripple effect al click
      chip.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.style.cssText = `
          position: absolute;
          border-radius: 50%;
          background: rgba(0, 229, 255, 0.6);
          width: 20px;
          height: 20px;
          left: ${e.offsetX}px;
          top: ${e.offsetY}px;
          transform: translate(-50%, -50%) scale(0);
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // CSS para ripple animation
    if (!document.getElementById('ripple-animation')) {
      const style = document.createElement('style');
      style.id = 'ripple-animation';
      style.textContent = `
        @keyframes ripple {
          to {
            transform: translate(-50%, -50%) scale(20);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ================================================
  // 6. SMOOTH SCROLL MEJORADO
  // ================================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ================================================
  // 7. LOADING ANIMATION PARA BOTÓN DE ENVÍO
  // ================================================
  function enhanceSendButton() {
    const sendBtn = document.getElementById('ai-send');
    if (!sendBtn) return;

    const originalContent = sendBtn.innerHTML;

    sendBtn.addEventListener('click', function() {
      if (!sendBtn.classList.contains('loading')) {
        sendBtn.classList.add('loading');
        sendBtn.innerHTML = '<div class="spinner-premium" style="width: 20px; height: 20px; border-width: 2px;"></div>';
        sendBtn.style.pointerEvents = 'none';

        // Restaurar después de simular envío
        setTimeout(() => {
          sendBtn.classList.remove('loading');
          sendBtn.innerHTML = originalContent;
          sendBtn.style.pointerEvents = '';
        }, 2000);
      }
    });
  }

  // ================================================
  // 8. BADGE ANIMADO DE "NUEVO"
  // ================================================
  function addNewBadges() {
    const newItems = document.querySelectorAll('[data-new="true"]');
    
    newItems.forEach(item => {
      const badge = document.createElement('span');
      badge.className = 'badge-premium badge-orange';
      badge.style.cssText = `
        position: absolute;
        top: -10px;
        right: -10px;
        font-size: 10px;
        animation: pulse 2s ease-in-out infinite;
      `;
      badge.innerHTML = '<i class="fa-solid fa-star"></i> NUEVO';
      
      item.style.position = 'relative';
      item.appendChild(badge);
    });
  }

  // ================================================
  // 9. INICIALIZAR TODO
  // ================================================
  function init() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    console.log('🚀 Inicializando efectos premium de Electromatics...');

    // Inicializar todas las mejoras
    initScrollAnimations();
    // initParallaxEffect(); // Descomentado si quieres el efecto 3D
    initTypingEffect();
    // initFloatingParticles(); // Descomentado si quieres partículas
    initSuggestionChipEffects();
    initSmoothScroll();
    enhanceSendButton();
    // enhanceMobileMenu(); // Eliminar para evitar conflicto con ui.js

    console.log('✨ Efectos premium cargados exitosamente');
  }

  // Auto-inicializar
  init();

})();
