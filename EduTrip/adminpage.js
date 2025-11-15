const body = document.querySelector("body"),
    sidebar = body.querySelector(".sidebar"),
    toggle = body.querySelector(".toggle");

toggle.addEventListener("click", () => {
    sidebar.classList.toggle("close");
});


const navLinks = document.querySelectorAll('.nav-link a');
const dashboard = document.getElementById('dashboard');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const page = link.querySelector('.nav-text').textContent.trim();
        if (page === 'Dashboard') {
            dashboard.style.display = 'block';
        } else {
            dashboard.style.display = 'none';
        }
    });
});

document.getElementById('reg-request').addEventListener('click', () => {
    const requestLink = Array.from(navLinks).find(link => link.querySelector('.nav-text').textContent.trim() === 'Request');
    if (requestLink) requestLink.click();
});

document.getElementById('bus-request').addEventListener('click', () => {
    const requestLink = Array.from(navLinks).find(link => link.querySelector('.nav-text').textContent.trim() === 'Request');
    if (requestLink) requestLink.click();
});

document.getElementById('participants').addEventListener('click', () => {
    const participantsLink = Array.from(navLinks).find(link => link.querySelector('.nav-text').textContent.trim() === 'Participants');
    if (participantsLink) participantsLink.click();
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', function() {
    const logoutLink = document.querySelector('a[href="#"]'); // Find logout link
    if (logoutLink && logoutLink.querySelector('.nav-text').textContent.includes('Logout')) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});