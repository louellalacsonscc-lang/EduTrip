const body = document.querySelector("body");
const sidebar = body.querySelector(".sidebar");
const toggle = body.querySelector(".toggle");

// Toggle sidebar
toggle.addEventListener("click", () => {
    sidebar.classList.toggle("close");
});

// Global user variable
let currentUser = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id || !user.role) {
        console.log('No user found, redirecting to login');
        window.location.href = '/';
        return;
    }
    
    if (user.role !== 'student') {
        console.log('User is not a student, redirecting');
        window.location.href = '/';
        return;
    }
    
    currentUser = user;
    console.log('Student logged in:', user.name);
    
    // Initialize the page
    initializePage();
});

function initializePage() {
    // Navigation functionality
    const navLinks = document.querySelectorAll('.nav-link a');
    const pages = document.querySelectorAll('.page-container');

    // Initialize profile as active
    document.getElementById('profile').classList.add('active');
    loadUserProfile();

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links and pages
            navLinks.forEach(l => l.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Show corresponding page
            const pageId = link.getAttribute('data-page');
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
                
                // Load data based on page
                switch(pageId) {
                    case 'events':
                        loadEvents();
                        break;
                    case 'my-registrations':
                        loadMyRegistrations();
                        break;
                    case 'profile':
                        loadUserProfile();
                        break;
                }
            }
        });
    });

    // Modal functionality
    const modal = document.getElementById('registration-modal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-registration');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle registration form submission
    document.getElementById('registration-form').addEventListener('submit', handleRegistrationSubmit);
}

// Load user profile
function loadUserProfile() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.name || 'Not available';
        document.getElementById('user-student-number').textContent = currentUser.student_number || 'Not provided';
        document.getElementById('user-email').textContent = currentUser.email || 'Not available';
    }
}

// Load events
async function loadEvents() {
    try {
        const eventsList = document.getElementById('events-list');
        eventsList.innerHTML = `
            <div class="no-data">
                <i class='bx bx-loader-circle bx-spin'></i>
                <p>Loading events...</p>
            </div>
        `;

        const response = await fetch('/api/events');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const events = await response.json();
        
        if (events.length === 0) {
            eventsList.innerHTML = `
                <div class="no-data">
                    <i class='bx bx-calendar-x'></i>
                    <p>No events available at the moment</p>
                    <p>Check back later for upcoming events</p>
                </div>
            `;
            return;
        }
        
        eventsList.innerHTML = events.map(event => `
            <div class="event-card">
                <h3>${event.title || 'Untitled Event'}</h3>
                <p>${event.description || 'No description available for this event.'}</p>
                <div class="event-meta">
                    <span><i class='bx bx-calendar'></i> ${event.date ? new Date(event.date).toLocaleDateString() : 'Date TBA'}</span>
                    <span><i class='bx bx-map'></i> ${event.location || 'Location TBA'}</span>
                </div>
                <div class="event-meta">
                    <span><i class='bx bx-group'></i> ${event.current_participants || 0} / ${event.max_participants || 'Unlimited'} participants</span>
                </div>
                <button class="btn btn-primary" onclick="openRegistrationModal(${event.id})">
                    Register Now
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('events-list').innerHTML = `
            <div class="no-data">
                <i class='bx bx-error'></i>
                <p>Error loading events</p>
                <p>Please check your connection and try again</p>
                <button class="btn btn-primary" onclick="loadEvents()" style="margin-top: 15px;">
                    <i class='bx bx-refresh'></i> Try Again
                </button>
            </div>
        `;
    }
}

// Open registration modal
function openRegistrationModal(eventId) {
    if (!currentUser || !currentUser.id) {
        alert('Please login to register for events');
        window.location.href = '/';
        return;
    }
    
    document.getElementById('event-id').value = eventId;
    document.getElementById('user-id').value = currentUser.id;
    document.getElementById('registration-form').reset();
    document.getElementById('registration-modal').style.display = 'block';
}

// Handle registration form submission
async function handleRegistrationSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bx bx-loader-circle bx-spin"></i> Submitting...';
        
        const response = await fetch('/api/registration-requests', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Registration submitted successfully! Your request is pending approval.');
            document.getElementById('registration-modal').style.display = 'none';
            
            // Switch to My Registrations page
            const registrationsLink = document.querySelector('a[data-page="my-registrations"]');
            if (registrationsLink) {
                registrationsLink.click();
            }
        } else {
            alert('❌ Error: ' + (result.error || 'Failed to submit registration'));
        }
    } catch (error) {
        console.error('Error submitting registration:', error);
        alert('❌ Network error. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Registration';
    }
}

// Load user's registrations
async function loadMyRegistrations() {
    if (!currentUser || !currentUser.id) {
        document.getElementById('registrations-list').innerHTML = `
            <div class="no-data">
                <i class='bx bx-user-x'></i>
                <p>Please login to view your registrations</p>
            </div>
        `;
        return;
    }
    
    try {
        const registrationsList = document.getElementById('registrations-list');
        registrationsList.innerHTML = `
            <div class="no-data">
                <i class='bx bx-loader-circle bx-spin'></i>
                <p>Loading your registrations...</p>
            </div>
        `;

        const response = await fetch(`/api/user/registration-requests?user_id=${currentUser.id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const registrations = await response.json();
        
        if (registrations.length === 0) {
            registrationsList.innerHTML = `
                <div class="no-data">
                    <i class='bx bx-inbox'></i>
                    <p>No registration requests found</p>
                    <p>Register for events to see them here</p>
                    <button class="btn btn-primary" onclick="document.querySelector('a[data-page=\\'events\\']').click()" style="margin-top: 15px;">
                        <i class='bx bx-calendar'></i> Browse Events
                    </button>
                </div>
            `;
            return;
        }
        
        registrationsList.innerHTML = registrations.map(reg => `
            <div class="registration-item">
                <div class="registration-header">
                    <div class="registration-info">
                        <h3>${reg.event_title || 'Unknown Event'}</h3>
                        <p><strong>Date:</strong> ${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</p>
                        <p><strong>Location:</strong> ${reg.event_location || 'TBA'}</p>
                        <p><strong>Submitted:</strong> ${reg.created_at ? new Date(reg.created_at).toLocaleString() : 'Unknown'}</p>
                        ${reg.registration_form ? `
                            <p><strong>Registration Form:</strong> 
                                <a href="/uploads/${reg.registration_form}" target="_blank" title="View uploaded file">
                                    <i class='bx bx-link-external'></i> View File
                                </a>
                            </p>
                        ` : ''}
                        ${reg.waiver_form ? `
                            <p><strong>Waiver Form:</strong> 
                                <a href="/uploads/${reg.waiver_form}" target="_blank" title="View uploaded file">
                                    <i class='bx bx-link-external'></i> View File
                                </a>
                            </p>
                        ` : ''}
                    </div>
                    <div class="registration-status status-${reg.status || 'pending'}">
                        ${reg.status ? reg.status.toUpperCase() : 'PENDING'}
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading registrations:', error);
        document.getElementById('registrations-list').innerHTML = `
            <div class="no-data">
                <i class='bx bx-error'></i>
                <p>Error loading registrations</p>
                <p>Please try again later</p>
                <button class="btn btn-primary" onclick="loadMyRegistrations()" style="margin-top: 15px;">
                    <i class='bx bx-refresh'></i> Try Again
                </button>
            </div>
        `;
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}