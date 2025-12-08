// studpage.js - COMPLETE FIXED VERSION
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
    
    // Initialize sidebar toggle
    initSidebarToggle();
    
    // Initialize page
    initializePage();
    
    // Load initial data
    loadNotifications();
});

// Clean sidebar toggle - keeps everything in place
function initSidebarToggle() {
    const toggle = document.querySelector('.toggle');
    const sidebar = document.querySelector('.sidebar');
    const headerText = document.querySelector('.header-text');
    
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            const isClosing = sidebar.classList.contains('w-64');
            
            if (isClosing) {
                // Close sidebar
                sidebar.classList.remove('w-64');
                sidebar.classList.add('w-20');
                document.querySelector('main')?.classList.remove('ml-64');
                document.querySelector('main')?.classList.add('ml-20');
                
                // Hide header text (logo stays visible naturally)
                if (headerText) headerText.classList.add('hidden');
                
                // Hide menu text but keep everything else in place
                document.querySelectorAll('.sidebar-item .text').forEach(text => {
                    text.classList.add('opacity-0', 'w-0', 'overflow-hidden');
                });
                
                // Keep notification badge in place but hide text
                document.querySelectorAll('.notification-badge').forEach(badge => {
                    badge.classList.add('absolute', 'right-2');
                });
                
                // Update toggle icon
                toggle.classList.remove('bx-chevron-left');
                toggle.classList.add('bx-chevron-right');
                
            } else {
                // Open sidebar
                sidebar.classList.remove('w-20');
                sidebar.classList.add('w-64');
                document.querySelector('main')?.classList.remove('ml-20');
                document.querySelector('main')?.classList.add('ml-64');
                
                // Show header text
                if (headerText) headerText.classList.remove('hidden');
                
                // Show menu text
                document.querySelectorAll('.sidebar-item .text').forEach(text => {
                    text.classList.remove('opacity-0', 'w-0', 'overflow-hidden');
                });
                
                // Restore notification badge
                document.querySelectorAll('.notification-badge').forEach(badge => {
                    badge.classList.remove('absolute', 'right-2');
                });
                
                // Update toggle icon
                toggle.classList.remove('bx-chevron-right');
                toggle.classList.add('bx-chevron-left');
            }
        });
    }
}

function initializePage() {
    // Navigation functionality
    const navLinks = document.querySelectorAll('.sidebar-item');
    const pages = document.querySelectorAll('.page-container');

    // Initialize profile as active
    const profilePage = document.getElementById('profile');
    if (profilePage) {
        profilePage.classList.remove('hidden');
        document.querySelectorAll('.page-container').forEach(p => {
            if (p.id !== 'profile') p.classList.add('hidden');
        });
    }
    
    loadUserProfile();

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all
            navLinks.forEach(l => l.classList.remove('active', 'bg-blue-600'));
            pages.forEach(page => page.classList.add('hidden'));
            
            // Add active class to clicked
            link.classList.add('active', 'bg-blue-600');
            
            // Show corresponding page
            const pageId = link.getAttribute('data-page');
            const targetPage = document.getElementById(pageId === 'participants' ? 'participants-page' : pageId);
            if (targetPage) {
                targetPage.classList.remove('hidden');
                
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
                    case 'bus':
                        loadBusAssignment();
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
    if (modal) {
        const closeBtn = modal.querySelector('.text-2xl');
        const cancelBtn = modal.querySelector('button[type="button"]');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }

    // Handle registration form submission
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistrationSubmit);
    }
}

// Load user profile
function loadUserProfile() {
    if (currentUser) {
        const nameEl = document.getElementById('user-name');
        const studentNumEl = document.getElementById('user-student-number');
        const emailEl = document.getElementById('user-email');
        
        if (nameEl) nameEl.textContent = currentUser.name || 'Not available';
        if (studentNumEl) studentNumEl.textContent = currentUser.student_number || 'Not provided';
        if (emailEl) emailEl.textContent = currentUser.email || 'Not available';
    }
}

// Load events - UPDATED for Tailwind
async function loadEvents() {
    try {
        const eventsList = document.getElementById('events-list');
        if (!eventsList) return;
        
        eventsList.innerHTML = `
            <div class="flex items-center justify-center h-64">
                <div class="text-center">
                    <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
                    <p class="text-gray-400">Loading events...</p>
                </div>
            </div>
        `;

        const response = await fetch('/api/events');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const events = await response.json();
        
        if (events.length === 0) {
            eventsList.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-calendar-x text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No events available at the moment</p>
                    <p class="text-gray-500 text-sm">Check back later for upcoming events</p>
                </div>
            `;
            return;
        }
        
        // Create event cards with Tailwind classes
        eventsList.innerHTML = events.map(event => `
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-semibold text-white">${event.title || 'Untitled Event'}</h3>
                    <span class="px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-800 rounded text-xs font-medium">
                        Upcoming
                    </span>
                </div>
                <p class="text-gray-400 text-sm mb-4 line-clamp-2">${event.description || 'No description available for this event.'}</p>
                <div class="space-y-3 mb-6">
                    <div class="flex items-center text-gray-500 text-sm">
                        <i class='bx bx-calendar mr-2'></i>
                        ${event.date ? new Date(event.date).toLocaleDateString() : 'Date TBA'}
                    </div>
                    <div class="flex items-center text-gray-500 text-sm">
                        <i class='bx bx-map mr-2'></i>
                        ${event.location || 'Location TBA'}
                    </div>
                </div>
                <button onclick="openRegistrationModal(${event.id})" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300">
                    Register Now
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading events:', error);
        const eventsList = document.getElementById('events-list');
        if (eventsList) {
            eventsList.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading events</p>
                    <p class="text-gray-500 text-sm mb-4">Please check your connection and try again</p>
                    <button onclick="loadEvents()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        <i class='bx bx-refresh mr-2'></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Open registration modal - FIXED
function openRegistrationModal(eventId) {
    if (!currentUser || !currentUser.id) {
        alert('Please login to register for events');
        window.location.href = '/';
        return;
    }
    
    // Try multiple selectors to find the inputs
    const eventIdInput = document.getElementById('event-id') || 
                         document.querySelector('input[name="event_id"]') ||
                         document.querySelector('[name="event_id"]');
    
    const userIdInput = document.getElementById('user-id') || 
                       document.querySelector('input[name="user_id"]') ||
                       document.querySelector('[name="user_id"]');
    
    const registrationForm = document.getElementById('registration-form');
    const modal = document.getElementById('registration-modal');
    
    console.log('Opening modal for event:', eventId);
    console.log('Found inputs:', { eventIdInput, userIdInput, registrationForm, modal });
    
    if (eventIdInput) {
        eventIdInput.value = eventId;
    } else {
        // Create hidden input if it doesn't exist
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'event_id';
        input.value = eventId;
        if (registrationForm) {
            registrationForm.appendChild(input);
        }
    }
    
    if (userIdInput) {
        userIdInput.value = currentUser.id;
    } else {
        // Create hidden input if it doesn't exist
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'user_id';
        input.value = currentUser.id;
        if (registrationForm) {
            registrationForm.appendChild(input);
        }
    }
    
    if (registrationForm) {
        registrationForm.reset();
        // Re-add the hidden values after reset
        const eventInput = registrationForm.querySelector('[name="event_id"]');
        const userInput = registrationForm.querySelector('[name="user_id"]');
        if (eventInput) eventInput.value = eventId;
        if (userInput) userInput.value = currentUser.id;
    }
    
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Registration modal not found!');
    }
}

// Handle registration form submission - FIXED
async function handleRegistrationSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bx bx-loader-circle bx-spin mr-2"></i> Submitting...';
        
        const formData = new FormData(form);
        
        // Log form data for debugging
        console.log('Form data:', {
            event_id: formData.get('event_id'),
            user_id: formData.get('user_id'),
            registration_form: formData.get('registration_form')?.name,
            waiver_form: formData.get('waiver_form')?.name
        });
        
        const response = await fetch('/api/registration-requests', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Registration submitted successfully! Your request is pending approval.');
            const modal = document.getElementById('registration-modal');
            if (modal) modal.classList.add('hidden');
            
            // Switch to My Registrations page
            const registrationsLink = document.querySelector('[data-page="my-registrations"]');
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

// Load notifications - UPDATED for Tailwind
async function loadNotifications() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        const response = await fetch(`/api/notifications/${currentUser.id}`);
        const notifications = await response.json();
        
        const notificationPage = document.getElementById('notification');
        if (notificationPage) {
            let notificationsList = notificationPage.querySelector('.notifications-list');
            if (!notificationsList) {
                notificationsList = document.createElement('div');
                notificationsList.className = 'notifications-list space-y-4';
                notificationPage.appendChild(notificationsList);
            }
            
            if (notifications.length === 0) {
                notificationsList.innerHTML = `
                    <div class="text-center py-10">
                        <i class='bx bx-bell text-4xl text-gray-500 mb-3'></i>
                        <p class="text-gray-400">No notifications</p>
                        <p class="text-gray-500 text-sm">You'll see important updates here</p>
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
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
            
            notificationsList.innerHTML = notifications.map(notification => `
                <div class="bg-gray-900 border ${notification.is_read ? 'border-gray-800' : 'border-blue-800/50'} rounded-xl p-5 cursor-pointer hover:bg-gray-800/50 transition-colors"
                     onclick="markNotificationAsRead(${notification.id})">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-lg font-semibold text-white">${notification.title}</h3>
                        <span class="text-gray-500 text-sm">
                            ${new Date(notification.created_at).toLocaleString()}
                        </span>
                    </div>
                    <p class="text-gray-400">${notification.message}</p>
                    <span class="inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${
                        notification.type === 'warning' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' :
                        notification.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                        'bg-blue-900/30 text-blue-400 border border-blue-800'
                    }">
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
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Load user's registrations - UPDATED for Tailwind
async function loadMyRegistrations() {
    if (!currentUser || !currentUser.id) {
        const registrationsList = document.getElementById('registrations-list');
        if (registrationsList) {
            registrationsList.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-user-x text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">Please login to view your registrations</p>
                </div>
            `;
        }
        return;
    }
    
    try {
        const registrationsList = document.getElementById('registrations-list');
        if (!registrationsList) return;
        
        registrationsList.innerHTML = `
            <div class="flex items-center justify-center h-64">
                <div class="text-center">
                    <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
                    <p class="text-gray-400">Loading your registrations...</p>
                </div>
            </div>
        `;

        const response = await fetch(`/api/user/registration-requests?user_id=${currentUser.id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const registrations = await response.json();
        
        if (registrations.length === 0) {
            registrationsList.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-inbox text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No active registration requests found</p>
                    <p class="text-gray-500 text-sm mb-4">Register for events to see them here</p>
                    <button onclick="document.querySelector('[data-page=\\'events\\']')?.click()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        <i class='bx bx-calendar mr-2'></i> Browse Events
                    </button>
                </div>
            `;
            return;
        }
        
        registrationsList.innerHTML = registrations.map(reg => {
            // Check if event is cancelled
            if (reg.event_status === 'cancelled') {
                return `
                    <div class="bg-gray-900 border border-red-800/50 rounded-xl p-6 opacity-80">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-semibold text-white">${reg.event_title || 'Unknown Event'} 
                                    <span class="ml-2 px-2 py-1 bg-red-900/30 text-red-400 border border-red-800 rounded text-xs font-medium">
                                        CANCELLED
                                    </span>
                                </h3>
                                <div class="flex items-center space-x-4 text-gray-400 text-sm mt-2">
                                    <span>${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</span>
                                    <span>${reg.event_location || 'TBA'}</span>
                                </div>
                            </div>
                        </div>
                        <p class="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg p-3 mb-4">
                            <i class='bx bx-error mr-2'></i>
                            This event has been cancelled. Your registration is no longer valid.
                        </p>
                    </div>
                `;
            }
            
            return `
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/30 transition-colors">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-semibold text-white">${reg.event_title || 'Unknown Event'}</h3>
                            <div class="flex items-center space-x-4 text-gray-400 text-sm mt-2">
                                <span>${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</span>
                                <span>${reg.event_location || 'TBA'}</span>
                            </div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${
                            reg.status === 'approved' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                            reg.status === 'rejected' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                            'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
                        }">
                            ${reg.status ? reg.status.toUpperCase() : 'PENDING'}
                        </span>
                    </div>
                    <div class="text-gray-400 text-sm mb-4">
                        <p><strong>Submitted:</strong> ${reg.created_at ? new Date(reg.created_at).toLocaleString() : 'Unknown'}</p>
                        ${reg.registration_form ? `
                            <p class="mt-2">
                                <a href="/uploads/${reg.registration_form}" target="_blank" 
                                   class="text-blue-400 hover:text-blue-300 inline-flex items-center">
                                    <i class='bx bx-link-external mr-1'></i> View Registration Form
                                </a>
                            </p>
                        ` : ''}
                        ${reg.waiver_form ? `
                            <p class="mt-1">
                                <a href="/uploads/${reg.waiver_form}" target="_blank" 
                                   class="text-blue-400 hover:text-blue-300 inline-flex items-center">
                                    <i class='bx bx-link-external mr-1'></i> View Waiver Form
                                </a>
                            </p>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading registrations:', error);
        const registrationsList = document.getElementById('registrations-list');
        if (registrationsList) {
            registrationsList.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading registrations</p>
                    <p class="text-gray-500 text-sm mb-4">Please try again later</p>
                    <button onclick="loadMyRegistrations()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        <i class='bx bx-refresh mr-2'></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}
// Add this function to studpage.js
async function loadBusAssignment() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        const busPage = document.getElementById('bus');
        if (!busPage) return;
        
        // First, get user's approved registrations
        const response = await fetch(`/api/user/registration-requests?user_id=${currentUser.id}`);
        const registrations = await response.json();
        
        // Filter for approved registrations
        const approvedRegistrations = registrations.filter(reg => 
            reg.status === 'approved' && reg.event_status !== 'cancelled'
        );
        
        if (approvedRegistrations.length === 0) {
            busPage.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-bus text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No approved registrations found</p>
                    <p class="text-gray-500 text-sm">Your bus assignment will appear here once your registration is approved</p>
                </div>
            `;
            return;
        }
        
        let busAssignmentsHTML = '';
        
        // For each approved registration, try to get bus assignment
        for (const registration of approvedRegistrations) {
            try {
                const busResponse = await fetch(`/api/events/${registration.event_id}/bus-assignments`);
                const assignments = await busResponse.json();
                
                const userAssignment = assignments.find(assignment => 
                    assignment.user_id === currentUser.id
                );
                
                busAssignmentsHTML += `
                    <div class="bg-black border border-gray-800 rounded-xl p-6 mb-4">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-semibold text-white">${registration.event_title}</h3>
                                <div class="flex items-center space-x-4 text-gray-400 text-sm mt-2">
                                    <span>${registration.event_date ? new Date(registration.event_date).toLocaleDateString() : 'TBA'}</span>
                                    <span>${registration.event_location || 'TBA'}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${userAssignment ? `
                            <div class="bg-green-900/20 border border-green-800 rounded-lg p-4">
                                <div class="flex items-center mb-3">
                                    <i class='bx bx-bus text-2xl text-green-400 mr-3'></i>
                                    <div>
                                        <h4 class="text-white font-semibold">Bus ${userAssignment.bus_number}</h4>
                                        <p class="text-gray-400 text-sm">Your assigned bus</p>
                                    </div>
                                </div>
                                <div class="text-gray-300 text-sm space-y-1">
                                    <p><strong>Capacity:</strong> ${userAssignment.capacity} seats</p>
                                    <p><strong>Assigned on:</strong> ${new Date(userAssignment.assignment_date).toLocaleString()}</p>
                                    ${userAssignment.notes ? `
                                        <p><strong>Notes:</strong> ${userAssignment.notes}</p>
                                    ` : ''}
                                </div>
                            </div>
                        ` : `
                            <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
                                <i class='bx bx-time text-2xl text-yellow-400 mb-2'></i>
                                <p class="text-gray-400">Bus assignment pending</p>
                                <p class="text-gray-500 text-sm">Your bus assignment will be announced soon</p>
                            </div>
                        `}
                    </div>
                `;
            } catch (error) {
                console.error('Error loading bus assignment for event:', error);
            }
        }
        
        if (busAssignmentsHTML === '') {
            busPage.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-time text-4xl text-yellow-500 mb-3'></i>
                    <p class="text-gray-400">Bus assignments being prepared</p>
                    <p class="text-gray-500 text-sm">Check back later for your bus assignment</p>
                </div>
            `;
        } else {
            busPage.innerHTML = `
                <h1 class="text-2xl font-bold text-white mb-6">Bus Assignment</h1>
                ${busAssignmentsHTML}
            `;
        }
        
    } catch (error) {
        console.error('Error loading bus assignments:', error);
        const busPage = document.getElementById('bus');
        if (busPage) {
            busPage.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading bus assignments</p>
                    <p class="text-gray-500 text-sm">Please try again later</p>
                </div>
            `;
        }
    }
}
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}