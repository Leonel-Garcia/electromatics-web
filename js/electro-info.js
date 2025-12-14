/**
 * ELECTRO-INFO.JS
 * JavaScript functionality for Electro Info section
 * Handles tabs and accordion interactions
 */

document.addEventListener('DOMContentLoaded', function() {
  
  // ===================================
  // TAB SYSTEM
  // ===================================
  const tabs = document.querySelectorAll('.info-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      
      // Close all accordions when switching tabs
      const accordions = document.querySelectorAll('.accordion-header');
      accordions.forEach(accordion => {
        accordion.classList.remove('active');
        const content = accordion.nextElementSibling;
        if (content) {
          content.classList.remove('active');
        }
      });
    });
  });

  // ===================================
  // ACCORDION SYSTEM
  // ===================================
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const isActive = header.classList.contains('active');

      // Optional: Close other accordions (single-open mode)
      // Remove this block if you want multiple accordions open at once
      /*
      accordionHeaders.forEach(otherHeader => {
        if (otherHeader !== header) {
          otherHeader.classList.remove('active');
          const otherContent = otherHeader.nextElementSibling;
          if (otherContent) {
            otherContent.classList.remove('active');
          }
        }
      });
      */

      // Toggle current accordion
      if (isActive) {
        header.classList.remove('active');
        content.classList.remove('active');
      } else {
        header.classList.add('active');
        content.classList.add('active');
      }
    });
  });

  // ===================================
  // SMOOTH SCROLL FOR ANCHOR LINKS
  // ===================================
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // ===================================
  // ENTRANCE ANIMATIONS
  // ===================================
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe accordion items for entrance animation
  const accordionItems = document.querySelectorAll('.accordion-item');
  accordionItems.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = `all 0.5s ease ${index * 0.1}s`;
    observer.observe(item);
  });

  // Observe book and software cards
  const cards = document.querySelectorAll('.book-card, .software-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `all 0.5s ease ${index * 0.05}s`;
    observer.observe(card);
  });

  // ===================================
  // BOOK DOWNLOAD HANDLER
  // ===================================
  const downloadButtons = document.querySelectorAll('.book-download');

  downloadButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Find the parent card
      const card = this.closest('.book-card');
      if (!card) return;

      // Get title and author
      const title = card.querySelector('.book-title').textContent.trim();
      const author = card.querySelector('.book-author').textContent.trim();

      // Construct search query
      // Query: filetype:pdf "Book Title" "Author"
      const query = `filetype:pdf "${title}" "${author}"`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      // Open in new tab
      window.open(searchUrl, '_blank');
    });
  });

  console.log('Electro Info page initialized successfully');
});
