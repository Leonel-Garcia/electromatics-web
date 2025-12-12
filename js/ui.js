/**
 * UI Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const desktopNav = document.querySelector('.desktop-nav');

    if (mobileNavToggle && desktopNav) {
        mobileNavToggle.addEventListener('click', () => {
            desktopNav.classList.toggle('active');
            
            // Toggle icon between bars and times (X)
            const icon = mobileNavToggle.querySelector('i');
            if (icon) {
                if (desktopNav.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-xmark');
                } else {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!desktopNav.contains(e.target) && !mobileNavToggle.contains(e.target) && desktopNav.classList.contains('active')) {
                desktopNav.classList.remove('active');
                const icon = mobileNavToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }
});
