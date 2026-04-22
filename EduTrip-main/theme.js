// theme.js - Dark/Light Mode System
(function() {
    'use strict';
    
    const THEME_KEY = 'eduevent_theme';
    const DARK_MODE_CLASS = 'dark-mode';
    
    // Get saved theme or default to light
    function getSavedTheme() {
        return localStorage.getItem(THEME_KEY) || 'light';
    }
    
    // Apply theme to page
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add(DARK_MODE_CLASS);
            document.body.classList.add(DARK_MODE_CLASS);
        } else {
            document.documentElement.classList.remove(DARK_MODE_CLASS);
            document.body.classList.remove(DARK_MODE_CLASS);
        }
        localStorage.setItem(THEME_KEY, theme);
        updateToggleIcons(theme);
    }
    
    // Update all toggle buttons on the page
    function updateToggleIcons(theme) {
        const toggles = document.querySelectorAll('.theme-toggle');
        toggles.forEach(toggle => {
            const icon = toggle.querySelector('i');
            if (icon) {
                if (theme === 'dark') {
                    icon.className = 'bx bx-sun';
                } else {
                    icon.className = 'bx bx-moon';
                }
            }
            toggle.setAttribute('data-theme', theme);
        });
    }
    
    // Toggle between light and dark
    function toggleTheme() {
        const currentTheme = getSavedTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }
    
    // Initialize theme on page load
    function initTheme() {
        const savedTheme = getSavedTheme();
        applyTheme(savedTheme);
        
        // Create toggle button if it doesn't exist
        createThemeToggle();
    }
    
    // Create theme toggle button
    function createThemeToggle() {
        // Check if toggle already exists
        if (document.querySelector('.theme-toggle')) return;
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'theme-toggle';
        toggleBtn.setAttribute('data-theme', getSavedTheme());
        toggleBtn.innerHTML = getSavedTheme() === 'dark' 
            ? '<i class="bx bx-sun"></i>' 
            : '<i class="bx bx-moon"></i>';
        toggleBtn.setAttribute('aria-label', 'Toggle theme');
        toggleBtn.setAttribute('title', getSavedTheme() === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Add rotation animation
            const icon = toggleBtn.querySelector('i');
            icon.style.transition = 'transform 0.4s ease';
            icon.style.transform = 'rotate(360deg)';
            
            setTimeout(() => {
                icon.style.transform = '';
            }, 400);
            
            // Toggle theme
            toggleTheme();
            
            // Update title
            const newTheme = toggleBtn.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            toggleBtn.setAttribute('title', newTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        });
        
        // Add to page - find appropriate container
        addToggleToPage(toggleBtn);
    }
    
        // Toggle button to appropriate location
    function addToggleToPage(toggleBtn) {
        // Skip login/register page - don't add toggle
        const isLoginPage = window.location.pathname.includes('/login') || 
                            window.location.pathname.includes('/mainpage') ||
                            document.querySelector('.form-container') !== null;
        
        if (isLoginPage) {
            return; // Don't add toggle to login page
        }
        
        // For landing page (frontp.html)
        const navbar = document.querySelector('.navbar .container, nav .container, .navbar div');
        if (navbar && !navbar.querySelector('.theme-toggle')) {
            const loginBtn = navbar.querySelector('.login-btn, a[href*="login"]');
            if (loginBtn) {
                loginBtn.parentNode.insertBefore(toggleBtn, loginBtn);
            } else {
                navbar.appendChild(toggleBtn);
            }
            return;
        }
        
        // For admin/student pages - add to sidebar header
        const sidebarHeader = document.querySelector('.sidebar header, .sidebar .p-5');
        if (sidebarHeader && !sidebarHeader.querySelector('.theme-toggle')) {
            toggleBtn.classList.add('theme-toggle-sidebar');
            const headerDiv = sidebarHeader.querySelector('.flex');
            if (headerDiv) {
                headerDiv.appendChild(toggleBtn);
            } else {
                sidebarHeader.appendChild(toggleBtn);
            }
            return;
        }
        
        // Fallback - add to body (but not on login page)
        if (!isLoginPage) {
            toggleBtn.style.position = 'fixed';
            toggleBtn.style.bottom = '20px';
            toggleBtn.style.right = '20px';
            toggleBtn.style.zIndex = '9999';
            document.body.appendChild(toggleBtn);
        }
    }
    
    // Expose to window
    window.toggleTheme = toggleTheme;
    window.getCurrentTheme = getSavedTheme;
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
})();