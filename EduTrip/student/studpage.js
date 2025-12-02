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
    loadNotifications(); // Load notifications on startup
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
                    case 'notification':
                        loadNotifications();
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

    startNotificationPolling();
    
    // Handle registration form submission
    document.getElementById('registration-form').addEventListener('submit', handleRegistrationSubmit);
}

// Add real-time notification polling
function startNotificationPolling() {
    if (!currentUser || !currentUser.id) return;
    
    // Check for new notifications every 30 seconds
    setInterval(() => {
        loadNotifications();
    }, 30000);
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

// Load notifications
async function loadNotifications() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        const response = await fetch(`/api/notifications/${currentUser.id}`);
        const notifications = await response.json();
        
        const notificationPage = document.getElementById('notification');
        if (notificationPage) {
            const notificationsList = notificationPage.querySelector('.notifications-list') || 
                                     (() => {
                                         const div = document.createElement('div');
                                         div.className = 'notifications-list';
                                         notificationPage.innerHTML = '<h1>Notifications</h1>';
                                         notificationPage.appendChild(div);
                                         return div;
                                     })();
            
            if (notifications.length === 0) {
                notificationsList.innerHTML = `
                    <div class="no-data">
                        <i class='bx bx-bell'></i>
                        <p>No notifications</p>
                        <p>You'll see important updates here</p>
                    </div>
                `;
                return;
            }
            
            // Update badge
            const unreadCount = notifications.filter(n => !n.is_read).length;
            const badge = document.getElementById('notification-badge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
            
            notificationsList.innerHTML = notifications.map(notification => `
                <div class="notification-item ${notification.is_read ? '' : 'unread'}" 
                     onclick="markNotificationAsRead(${notification.id})">
                    <div class="notification-header">
                        <h3 class="notification-title">${notification.title}</h3>
                        <span class="notification-time">
                            ${new Date(notification.created_at).toLocaleString()}
                        </span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    <span class="notification-type type-${notification.type || 'info'}">
                        ${notification.type || 'info'}
                    </span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        await fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
        // Reload notifications
        if (document.getElementById('notification').classList.contains('active')) {
            loadNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Load user's registrations
// Load user's registrations - UPDATED VERSION
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
                    <p>No active registration requests found</p>
                    <p>Register for events to see them here</p>
                    <button class="btn btn-primary" onclick="document.querySelector('a[data-page=\\'events\\']').click()" style="margin-top: 15px;">
                        <i class='bx bx-calendar'></i> Browse Events
                    </button>
                </div>
            `;
            return;
        }
        
        registrationsList.innerHTML = registrations.map(reg => {
            // Check if event is cancelled (even though API filters them out, this is a safety check)
            if (reg.event_status === 'cancelled') {
                return `
                    <div class="registration-item cancelled">
                        <div class="registration-header">
                            <div class="registration-info">
                                <h3>${reg.event_title || 'Unknown Event'} <span class="cancelled-badge">CANCELLED</span></h3>
                                <p><strong>Date:</strong> ${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</p>
                                <p><strong>Location:</strong> ${reg.event_location || 'TBA'}</p>
                                <p><strong>Submitted:</strong> ${reg.created_at ? new Date(reg.created_at).toLocaleString() : 'Unknown'}</p>
                                <p class="cancelled-notice"><i class='bx bx-error'></i> This event has been cancelled. Your registration is no longer valid.</p>
                            </div>
                            <div class="registration-status status-cancelled">
                                EVENT CANCELLED
                            </div>
                        </div>
                    </div>
                `;
            }
            
            return `
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
            `;
        }).join('');
        
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
// After the existing registrationsList.innerHTML = ... mapping code:
const registrationsListElement = document.getElementById('registrations-list');
if (registrationsListElement) {
    registrationsListElement.innerHTML += `
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="loadRegistrationHistory()">
                <i class='bx bx-history'></i> View Registration History (Including Cancelled)
            </button>
        </div>
    `;
}
// Add function to load registration history
async function loadRegistrationHistory() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        const response = await fetch(`/api/user/all-registration-requests?user_id=${currentUser.id}`);
        const allRegistrations = await response.json();
        
        // Filter out active registrations (already shown)
        const cancelledRegistrations = allRegistrations.filter(reg => reg.event_status === 'cancelled');
        
        if (cancelledRegistrations.length === 0) {
            alert('No cancelled event registrations found.');
            return;
        }
        
        // Show cancelled registrations in a modal
        showCancelledRegistrationsModal(cancelledRegistrations);
        
    } catch (error) {
        console.error('Error loading registration history:', error);
        alert('Error loading registration history');
    }
}
function showCancelledRegistrationsModal(cancelledRegistrations) {
    const modalHTML = `
        <div class="modal" id="history-modal">
            <div class="modal-content">
                <span class="close" onclick="document.getElementById('history-modal').style.display='none'">&times;</span>
                <h2>Cancelled Event Registrations</h2>
                <div class="cancelled-registrations-list">
                    ${cancelledRegistrations.map(reg => `
                        <div class="registration-item cancelled">
                            <div class="registration-info">
                                <h3>${reg.event_title}</h3>
                                <p><strong>Date:</strong> ${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</p>
                                <p><strong>Location:</strong> ${reg.event_location || 'TBA'}</p>
                                <p><strong>Submitted:</strong> ${new Date(reg.created_at).toLocaleString()}</p>
                                <p><strong>Registration Status:</strong> ${reg.status.toUpperCase()}</p>
                                <p class="cancelled-notice"><i class='bx bx-error'></i> This event has been cancelled.</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="document.getElementById('history-modal').style.display='none'">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('history-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    document.getElementById('history-modal').style.display = 'block';
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}