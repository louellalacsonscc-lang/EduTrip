let currentUser = null;

// Format date for Philippines timezone (GMT+8)
function formatPHDate(dateString, options = {}) {
    if (!dateString) return 'TBA';
    
    const date = new Date(dateString);
    
    // Default options for date display
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
    };
    
    return date.toLocaleString('en-PH', { ...defaultOptions, ...options });
}

// Short date format (MM/DD/YYYY)
function formatPHDateShort(dateString) {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Manila'
    });
}

// Time only format
function formatPHTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
    });
}

// Helper function to display dates without timezone shift
function formatDateForDisplay(dateString) {
    if (!dateString) return 'TBA';
    
    // MySQL returns YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2].split('T')[0]; // Remove any time part
        
        // Return in MM/DD/YYYY format
        return `${month}/${day}/${year}`;
    }
    
    return dateString;
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
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

    initSidebarToggle();
    initializePage();
    loadUserProfile();
    loadNotifications();

    // Load notification count on startup
    setTimeout(() => {
        loadNotificationCount();
    }, 1000);
    
    // Refresh notification count every 30 seconds
    setInterval(loadNotificationCount, 30000);
});

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

                // Hide header text
                if (headerText) headerText.classList.add('hidden');

                // Hide menu text
                document.querySelectorAll('.sidebar-item .text').forEach(text => {
                    text.classList.add('opacity-0', 'w-0', 'overflow-hidden');
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

                // Update toggle icon
                toggle.classList.remove('bx-chevron-right');
                toggle.classList.add('bx-chevron-left');
            }
        });
    }
}

function initializePage() {
    const navLinks = document.querySelectorAll('.sidebar-item');
    const pages = document.querySelectorAll('.page-container');

    navLinks.forEach(link => {
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
    });

    const freshNavLinks = document.querySelectorAll('.sidebar-item');
    
    freshNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const pageId = link.getAttribute('data-page');
            if (!pageId) return;

            freshNavLinks.forEach(l => l.classList.remove('active', 'bg-blue-600'));
            pages.forEach(page => page.classList.add('hidden'));

            link.classList.add('active', 'bg-blue-600');
            const targetPage = document.getElementById(pageId);
            
            if (targetPage) {
                targetPage.classList.remove('hidden');

                    switch (pageId) {
                        case 'profile':
                            loadUserProfile();
                            break;
                        case 'events':
                            loadEvents();
                            break;
                        case 'my-registrations':
                            loadMyRegistrations();
                            break;
                        case 'notification':
                            loadNotifications();
                            loadNotificationCount();
                            break;
                        case 'bus':
                            loadBusAssignment();
                            break;
                        case 'announcement':
                            loadStudentAnnouncements();
                            break;
                        case 'certificate':
                            loadCertificates();
                            break;
                    }
            }
        });
    });

    setupModals();
    setupProfileModal();
}

function setupModals() {
    const modal = document.getElementById('registration-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.cancel-modal');

        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        const newForm = registrationForm.cloneNode(true);
        registrationForm.parentNode.replaceChild(newForm, registrationForm);
        newForm.addEventListener('submit', handleRegistrationSubmit);
    }
}

function loadUserProfile() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.name || 'Not available';
        document.getElementById('user-student-number').textContent = currentUser.student_number || 'Not provided';
        document.getElementById('user-email').textContent = currentUser.email || 'Not available';
        document.getElementById('user-course').textContent = currentUser.course || 'Not provided';
        document.getElementById('user-section').textContent = currentUser.section || 'Not provided';
        document.getElementById('user-year').textContent = currentUser.year || 'Not provided';
        document.getElementById('user-birthdate').textContent = currentUser.birthdate || 'Not provided';
        document.getElementById('user-age').textContent = currentUser.age || 'Not provided';
        document.getElementById('user-sex').textContent = currentUser.sex || 'Not provided';
        
        // Load stats
        loadUserStats();
    }

    if (isProfileIncomplete(currentUser)) {
        setTimeout(() => openProfileModal(), 500);
    }
}

async function loadUserStats() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        const response = await fetch(`/api/user/registration-requests?user_id=${currentUser.id}`);
        const registrations = await response.json();
        
        const total = registrations.length;
        const approved = registrations.filter(r => r.status === 'approved').length;
        const pending = registrations.filter(r => r.status === 'pending').length;
        
        document.getElementById('stats-registered').textContent = total;
        document.getElementById('stats-approved').textContent = approved;
        document.getElementById('stats-pending').textContent = pending;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function isProfileIncomplete(user) {
    return !user || !user.course || !user.section || !user.year || !user.birthdate || !user.age || !user.sex;
}

function openProfileModal() {
    const modal = document.getElementById('profile-complete-modal');
    if (!modal) return;
    
    if (currentUser) {
        document.getElementById('profile-course').value = currentUser.course || '';
        document.getElementById('profile-section').value = currentUser.section || '';
        document.getElementById('profile-year').value = currentUser.year || '';
        document.getElementById('profile-birthdate').value = currentUser.birthdate || '';
        document.getElementById('profile-age').value = currentUser.age || '';
        document.getElementById('profile-sex').value = currentUser.sex || '';
    }
    
    modal.classList.remove('hidden');
}

function closeProfileModal() {
    document.getElementById('profile-complete-modal')?.classList.add('hidden');
}

async function submitProfileCompleteForm(e) {
    e.preventDefault();

    const course = document.getElementById('profile-course')?.value;
    const section = document.getElementById('profile-section')?.value;
    const year = document.getElementById('profile-year')?.value;
    const birthdate = document.getElementById('profile-birthdate')?.value;
    const age = document.getElementById('profile-age')?.value;
    const sex = document.getElementById('profile-sex')?.value;

    if (!currentUser?.id) {
        showAlert('User information is missing. Please log in again.');
        return;
    }

    if (!course || !section || !year || !birthdate || !age || !sex) {
        showAlert('Please fill in all required profile fields.');
        return;
    }

    try {
        const response = await fetch('/api/user/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, course, section, year, birthdate, age, sex })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to update profile');

        currentUser = { ...currentUser, course, section, year, birthdate, age, sex };
        localStorage.setItem('user', JSON.stringify(currentUser));
        loadUserProfile();
        closeProfileModal();
        showSuccess('Profile updated successfully');
    } catch (error) {
        console.error('Profile update error:', error);
        showAlert('Failed to save profile. Please try again.');
    }
}

function setupProfileModal() {
    document.getElementById('close-profile-modal')?.addEventListener('click', closeProfileModal);
    document.getElementById('profile-modal-cancel')?.addEventListener('click', closeProfileModal);
    
    const profileForm = document.getElementById('profile-complete-form');
    if (profileForm) {
        const newForm = profileForm.cloneNode(true);
        profileForm.parentNode.replaceChild(newForm, profileForm);
        newForm.addEventListener('submit', submitProfileCompleteForm);
    }
}

async function loadEvents() {
    const eventsList = document.getElementById('events-list');
    if (!eventsList) return;

    eventsList.innerHTML = `<div class="col-span-3 text-center py-10"><i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i><p class="text-gray-400">Loading events...</p></div>`;

    try {
        const course = currentUser?.course ? encodeURIComponent(currentUser.course) : '';
        const year = currentUser?.year ? encodeURIComponent(currentUser.year) : '';
        
        let url = '/api/events';
        const params = [];
        
        if (course) params.push(`course=${course}`);
        if (year) params.push(`year=${year}`);
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        const response = await fetch(url);
        const events = await response.json();

        // Filter to only show active events
        const activeEvents = events.filter(event => 
            event.status === 'active' || event.status === 'upcoming'
        );

        if (activeEvents.length === 0) {
            eventsList.innerHTML = `<div class="col-span-3 text-center py-10"><i class='bx bx-calendar-x text-4xl text-gray-500 mb-3'></i><p class="text-gray-400">No events available</p></div>`;
            return;
        }

        eventsList.innerHTML = activeEvents.map(event => {
            const titleElement = event.external_url 
                ? `<a href="${event.external_url}" target="_blank" rel="noopener noreferrer" class="text-lg font-semibold text-white hover:text-blue-400 transition-colors flex items-center">
                    ${event.title || 'Untitled Event'}
                    <i class='bx bx-link-external ml-2 text-sm'></i>
                </a>`
                : `<h3 class="text-lg font-semibold text-white">${event.title || 'Untitled Event'}</h3>`;
            
            return `
                <div class="bg-black border border-gray-800 rounded-xl p-6 hover:border-blue-500/30 transition-all">
                    ${event.image_url ? `<div class="mb-4 overflow-hidden rounded-xl"><img src="${event.image_url}" alt="${event.title}" class="w-full h-48 object-cover" /></div>` : ''}
                    <div class="flex justify-between items-start mb-4">
                        ${titleElement}
                        <span class="px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-800 rounded text-xs font-medium">${event.course || 'ALL'}</span>
                    </div>
                    <p class="text-gray-400 text-sm mb-4 line-clamp-2">${event.description || 'No description'}</p>
                    <div class="space-y-3 mb-6">
                        <div class="flex items-center text-gray-500 text-sm"><i class='bx bx-calendar mr-2'></i>${event.date ? formatDateForDisplay(event.date) : 'TBA'}</div>
                        <div class="flex items-center text-gray-500 text-sm"><i class='bx bx-map mr-2'></i>${event.location || 'TBA'}</div>
                    </div>
                    <button onclick="openRegistrationModal(${event.id})" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">Register Now</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading events:', error);
        eventsList.innerHTML = `<div class="col-span-3 text-center py-10"><i class='bx bx-error text-4xl text-red-500 mb-3'></i><p class="text-gray-400">Error loading events</p><button onclick="loadEvents()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Try Again</button></div>`;
    }
}

function openRegistrationModal(eventId) {
    if (!currentUser?.id) {
        showAlert('Please login to register');
        window.location.href = '/';
        return;
    }

    if (isProfileIncomplete(currentUser)) {
        showAlert('Please complete your profile before registering.');
        openProfileModal();
        return;
    }

    const form = document.getElementById('registration-form');
    let eventInput = form.querySelector('input[name="event_id"]');
    let userInput = form.querySelector('input[name="user_id"]');

    if (!eventInput) {
        eventInput = document.createElement('input');
        eventInput.type = 'hidden';
        eventInput.name = 'event_id';
        form.appendChild(eventInput);
    }
    if (!userInput) {
        userInput = document.createElement('input');
        userInput.type = 'hidden';
        userInput.name = 'user_id';
        form.appendChild(userInput);
    }

    eventInput.value = eventId;
    userInput.value = currentUser.id;
    form.querySelectorAll('input[type="file"]').forEach(i => i.value = '');
    document.getElementById('registration-modal').classList.remove('hidden');
}

async function handleRegistrationSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bx bx-loader-circle bx-spin mr-2"></i> Submitting...';

        const response = await fetch('/api/registration-requests', { method: 'POST', body: new FormData(form) });
        const result = await response.json();

        if (result.success) {
            document.getElementById('registration-modal').classList.add('hidden');
            showSuccess('Registration submitted! Pending approval.', 'Success!');
            document.querySelector('[data-page="my-registrations"]')?.click();
        } else {
            showError('❌ Error: ' + (result.error || 'Failed to submit'));
        }
    } catch (error) {
        console.error('Error:', error);
        showError('❌ Network error. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function loadMyRegistrations() {
    const list = document.getElementById('registrations-list');
    if (!list) return;

    list.innerHTML = `<div class="text-center py-10"><i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i><p class="text-gray-400">Loading...</p></div>`;

    if (!currentUser?.id) {
        list.innerHTML = `<div class="text-center py-10"><i class='bx bx-user-x text-4xl text-gray-500 mb-3'></i><p class="text-gray-400">Please login</p></div>`;
        return;
    }

    try {
        const response = await fetch(`/api/user/registration-requests?user_id=${currentUser.id}`);
        const registrations = await response.json();

        if (registrations.length === 0) {
            list.innerHTML = `<div class="text-center py-10"><i class='bx bx-inbox text-4xl text-gray-500 mb-3'></i><p class="text-gray-400">No registrations found</p><button onclick="document.querySelector('[data-page=\\'events\\']')?.click()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Browse Events</button></div>`;
            return;
        }

        list.innerHTML = registrations.map(reg => {
            if (reg.event_status === 'cancelled') {
                return `<div class="bg-black border border-red-800/50 rounded-xl p-6 opacity-80"><div class="flex justify-between items-start mb-4"><div><h3 class="text-lg font-semibold text-white">${reg.event_title} <span class="ml-2 px-2 py-1 bg-red-900/30 text-red-400 border border-red-800 rounded text-xs">CANCELLED</span></h3><div class="flex items-center space-x-4 text-gray-400 text-sm mt-2"><span>${reg.event_date ? formatPHDateShort(reg.event_date) : 'TBA'}</span><span>${reg.event_location || 'TBA'}</span></div></div></div><p class="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg p-3"><i class='bx bx-error mr-2'></i>This event has been cancelled.</p></div>`;
            }

            const statusColors = {
                approved: 'bg-green-900/30 text-green-400 border-green-800',
                rejected: 'bg-red-900/30 text-red-400 border-red-800',
                pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
            };

            return `<div class="bg-black border border-gray-800 rounded-xl p-6 hover:border-blue-500/30 transition-colors"><div class="flex justify-between items-start mb-4"><div><h3 class="text-lg font-semibold text-white">${reg.event_title || 'Unknown Event'}</h3><div class="flex items-center space-x-4 text-gray-400 text-sm mt-2"><span>${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</span><span>${reg.event_location || 'TBA'}</span></div></div><span class="px-3 py-1 rounded-full text-sm font-medium ${statusColors[reg.status] || statusColors.pending}">${reg.status ? reg.status.toUpperCase() : 'PENDING'}</span></div><div class="text-gray-400 text-sm"><p><strong>Submitted:</strong> ${reg.created_at ? formatPHDate(reg.created_at) : 'Unknown'}</p>_${reg.registration_form ? `<p class="mt-2"><a href="/api/uploads/${reg.registration_form}" target="_blank" class="text-blue-400 hover:text-blue-300"><i class='bx bx-link-external mr-1'></i>View Registration Form</a></p>` : ''}${reg.waiver_form ? `<p class="mt-1"><a href="/api/uploads/${reg.waiver_form}" target="_blank" class="text-blue-400 hover:text-blue-300"><i class='bx bx-link-external mr-1'></i>View Waiver Form</a></p>` : ''}</div></div>`;
        }).join('');
    } catch (error) {
        console.error('Error:', error);
        list.innerHTML = `<div class="text-center py-10"><i class='bx bx-error text-4xl text-red-500 mb-3'></i><p class="text-gray-400">Error loading registrations</p><button onclick="loadMyRegistrations()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Try Again</button></div>`;
    }
}

async function loadNotifications() {
    if (!currentUser?.id) return;

    const container = document.querySelector('#notification .notifications-container');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-10">
            <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500'></i>
            <p class="text-gray-400 mt-2">Loading notifications...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/notifications/user/${currentUser.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }

        const notifications = await response.json();
        const badge = document.querySelector('.notification-badge');
        
        if (badge) {
            const unread = notifications.filter(n => !n.is_read).length;
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-bell text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No notifications yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(n => {
            const typeColors = {
                success: 'border-green-800 bg-green-900/20',
                warning: 'border-yellow-800 bg-yellow-900/20',
                error: 'border-red-800 bg-red-900/20',
                info: 'border-blue-800 bg-blue-900/20'
            };
            
            const typeIcons = {
                success: 'bx-check-circle text-green-400',
                warning: 'bx-error text-yellow-400',
                error: 'bx-error-circle text-red-400',
                info: 'bx-info-circle text-blue-400'
            };
            
            return `
                <div class="bg-black border ${n.is_read ? 'border-gray-800' : 'border-blue-800/50'} rounded-xl p-5 cursor-pointer hover:bg-gray-900/50 transition-all"
                     onclick="handleNotificationClick(${n.id}, '${n.link || ''}')">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center">
                            <i class='bx ${typeIcons[n.type] || 'bx-info-circle'} text-xl mr-3'></i>
                            <h3 class="text-lg font-semibold text-white">${n.title}</h3>
                        </div>
                        <span class="text-gray-500 text-sm">${formatTimeAgo(n.created_at)}</span>
                    </div>
                    <p class="text-gray-400">${n.message}</p>
                    ${!n.is_read ? '<span class="inline-block mt-2 text-xs text-blue-400"><i class="bx bx-circle mr-1"></i>New</span>' : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="text-center py-10">
                <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                <p class="text-gray-400">Error loading notifications</p>
            </div>
        `;
    }
}

async function markNotificationAsRead(id) {
    try {
        await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
        loadNotifications();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadBusAssignment() {
    const container = document.getElementById('bus-content');
    if (!container || !currentUser?.id) {
        console.error('Container or user not found');
        return;
    }

    container.innerHTML = `
        <div class="text-center py-10">
            <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
            <p class="text-gray-400">Loading bus assignments...</p>
        </div>
    `;

    try {
        // Get user's approved registrations
        const response = await fetch(`/api/user/registration-requests?user_id=${currentUser.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch registrations');
        }
        
        const registrations = await response.json();
        
        // Filter for approved registrations from active events
        const approvedRegistrations = registrations.filter(r => 
            r.status === 'approved' && r.event_status !== 'cancelled'
        );

        if (approvedRegistrations.length === 0) {
            container.innerHTML = `
                <div class="bg-black border border-gray-800 rounded-xl p-8 text-center">
                    <i class='bx bx-bus text-5xl text-gray-500 mb-4'></i>
                    <h3 class="text-lg font-semibold text-white mb-2">No Approved Registrations</h3>
                    <p class="text-gray-400">You don't have any approved event registrations yet.</p>
                    <p class="text-gray-500 text-sm mt-2">Bus assignments will appear here once your registration is approved.</p>
                    <button onclick="document.querySelector('[data-page=\\'events\\']')?.click()" 
                            class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        <i class='bx bx-calendar mr-2'></i>Browse Events
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        let hasAnyAssignment = false;

        // For each approved registration, check bus assignment
        for (const reg of approvedRegistrations) {
            try {
                const busRes = await fetch(`/api/events/${reg.event_id}/bus-assignments`);
                
                if (!busRes.ok) {
                    html += createBusCard(reg, null);
                    continue;
                }
                
                const assignments = await busRes.json();
                const myAssignment = assignments.find(a => a.user_id === currentUser.id);
                
                if (myAssignment) {
                    hasAnyAssignment = true;
                }
                
                html += createBusCard(reg, myAssignment);
                
            } catch (e) {
                console.error('Error loading bus for event:', reg.event_id, e);
                html += createBusCard(reg, null);
            }
        }

        container.innerHTML = html || `
            <div class="bg-black border border-gray-800 rounded-xl p-8 text-center">
                <i class='bx bx-time text-5xl text-yellow-500 mb-4'></i>
                <h3 class="text-lg font-semibold text-white mb-2">Bus Assignments Pending</h3>
                <p class="text-gray-400">Your bus assignments are being prepared.</p>
                <p class="text-gray-500 text-sm mt-2">Check back soon for your bus assignment details.</p>
            </div>
        `;

    } catch (error) {
        console.error('Error loading bus assignments:', error);
        container.innerHTML = `
            <div class="bg-black border border-red-800/50 rounded-xl p-8 text-center">
                <i class='bx bx-error text-5xl text-red-500 mb-4'></i>
                <h3 class="text-lg font-semibold text-white mb-2">Error Loading Assignments</h3>
                <p class="text-gray-400 mb-4">Unable to load bus assignments at this time.</p>
                <button onclick="loadBusAssignment()" 
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    <i class='bx bx-refresh mr-2'></i>Try Again
                </button>
            </div>
        `;
    }
}

// Helper function to create bus card HTML
function createBusCard(registration, busAssignment) {
    const eventDate = registration.event_date ? formatPHDateShort(registration.event_date) : 'Date TBA';
    
    if (busAssignment) {
        // User has a bus assignment
        return `
            <div class="bg-black border border-green-800/50 rounded-xl p-6 hover:border-green-500/30 transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-white">${registration.event_title}</h3>
                        <div class="flex items-center space-x-4 text-gray-400 text-sm mt-2">
                            <span class="flex items-center">
                                <i class='bx bx-calendar mr-1'></i>${eventDate}
                            </span>
                            <span class="flex items-center">
                                <i class='bx bx-map mr-1'></i>${registration.event_location || 'Location TBA'}
                            </span>
                        </div>
                    </div>
                    <span class="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-full text-xs font-medium">
                        ASSIGNED
                    </span>
                </div>
                
                <div class="bg-green-900/20 border border-green-800 rounded-lg p-5 mt-4">
                    <div class="flex items-center mb-4">
                        <div class="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mr-4">
                            <i class='bx bx-bus text-3xl text-green-400'></i>
                        </div>
                        <div>
                            <h4 class="text-white font-semibold text-lg">Bus ${busAssignment.bus_number}</h4>
                            <p class="text-gray-400 text-sm">Your assigned bus for this event</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div class="bg-black/30 rounded-lg p-3">
                            <p class="text-gray-400 mb-1">Bus Capacity</p>
                            <p class="text-white font-medium">${busAssignment.capacity} seats</p>
                        </div>
                        <div class="bg-black/30 rounded-lg p-3">
                            <p class="text-gray-400 mb-1">Assigned On</p>
                            <p class="text-white font-medium">${formatPHDateShort(busAssignment.assignment_date)}</p>
                        </div>
                    </div>
                    
                    ${busAssignment.notes ? `
                        <div class="mt-4 bg-black/30 rounded-lg p-3">
                            <p class="text-gray-400 mb-1">Notes</p>
                            <p class="text-white">${busAssignment.notes}</p>
                        </div>
                    ` : ''}
                    
                    <div class="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                        <p class="text-blue-300 text-sm flex items-start">
                            <i class='bx bx-info-circle mr-2 mt-0.5'></i>
                            <span>Please arrive at least 15 minutes before departure. Bring your student ID.</span>
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else {
        // User doesn't have a bus assignment yet
        return `
            <div class="bg-black border border-gray-800 rounded-xl p-6 hover:border-blue-500/30 transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-white">${registration.event_title}</h3>
                        <div class="flex items-center space-x-4 text-gray-400 text-sm mt-2">
                            <span class="flex items-center">
                                <i class='bx bx-calendar mr-1'></i>${eventDate}
                            </span>
                            <span class="flex items-center">
                                <i class='bx bx-map mr-1'></i>${registration.event_location || 'Location TBA'}
                            </span>
                        </div>
                    </div>
                    <span class="px-3 py-1 bg-yellow-900/30 text-yellow-400 border border-yellow-800 rounded-full text-xs font-medium">
                        PENDING
                    </span>
                </div>
                
                <div class="bg-gray-900/50 border border-gray-800 rounded-lg p-5 mt-4 text-center">
                    <i class='bx bx-time text-4xl text-yellow-400 mb-3'></i>
                    <h4 class="text-white font-medium mb-2">Bus Assignment Pending</h4>
                    <p class="text-gray-400 text-sm">Your bus assignment will be announced soon.</p>
                    <p class="text-gray-500 text-xs mt-2">Check back later or contact the event coordinator.</p>
                </div>
            </div>
        `;
    }
}

// Load announcements for student
async function loadStudentAnnouncements() {
    const container = document.querySelector('#announcement .announcements-container');
    if (!container || !currentUser?.id) return;
    
    container.innerHTML = `
        <div class="text-center py-10">
            <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500'></i>
            <p class="text-gray-400 mt-2">Loading announcements...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/announcements/user/${currentUser.id}`);
        const announcements = await response.json();
        
        if (announcements.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-message text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No announcements yet</p>
                    <p class="text-gray-500 text-sm">Check back later for updates</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = announcements.map(a => {
            // ✅ PUT THE typeConfig OBJECT RIGHT HERE
            const typeConfig = {
                info: {
                    border: 'border-blue-800',
                    bg: 'bg-blue-900/20',
                    icon: 'bx-info-circle',
                    iconColor: 'text-blue-400'
                },
                success: {
                    border: 'border-green-800',
                    bg: 'bg-green-900/20',
                    icon: 'bx-check-circle',
                    iconColor: 'text-green-400'
                },
                warning: {
                    border: 'border-yellow-800',
                    bg: 'bg-yellow-900/20',
                    icon: 'bx-error',
                    iconColor: 'text-yellow-400'
                },
                urgent: {
                    border: 'border-red-800',
                    bg: 'bg-red-900/30',
                    icon: 'bx-alarm-exclamation',
                    iconColor: 'text-red-400'
                }
            };
            
            const config = typeConfig[a.type] || typeConfig.info;
            
            return `
                <div class="bg-black border ${config.border} ${config.bg} rounded-xl p-5 mb-4 cursor-pointer hover:opacity-90 transition-all ${!a.is_read ? 'border-l-4 border-l-blue-500' : ''}"
                     onclick="markAnnouncementRead(${a.id})">
                    <div class="flex items-start mb-3">
                        <i class='bx ${config.icon} ${config.iconColor} text-xl mr-3 mt-0.5'></i>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <h3 class="text-lg font-semibold text-white">${a.title}</h3>
                                <span class="text-gray-400 text-xs ml-2 whitespace-nowrap">${formatTimeAgo(a.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    <p class="text-gray-300 text-sm whitespace-pre-line ml-9">${a.message}</p>
                    <div class="flex justify-between items-center mt-3 ml-9">
                        <div class="flex items-center">
                            ${!a.is_read ? '<span class="inline-flex items-center text-xs text-blue-400"><i class="bx bx-circle mr-1 text-[8px]"></i>New</span>' : '<span class="text-gray-500 text-xs">Read</span>'}
                        </div>
                        ${a.creator_name ? `<span class="text-gray-500 text-xs">Posted by: ${a.creator_name}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        container.innerHTML = `
            <div class="text-center py-10">
                <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                <p class="text-gray-400">Error loading announcements</p>
                <button onclick="loadStudentAnnouncements()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Try Again</button>
            </div>
        `;
    }
}

// Mark announcement as read
async function markAnnouncementRead(announcementId) {
    if (!currentUser?.id) return;
    
    try {
        await fetch(`/api/announcements/${announcementId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        loadStudentAnnouncements();
    } catch (error) {
        console.error('Error marking announcement read:', error);
    }
}

// Load notifications count (for badge)
async function loadNotificationCount() {
    if (!currentUser?.id) return;
    
    try {
        const response = await fetch(`/api/notifications/unread/${currentUser.id}`);
        const data = await response.json();
        
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = data.count;
            badge.style.display = data.count > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error loading notification count:', error);
    }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
    if (!currentUser?.id) return;
    
    try {
        await fetch(`/api/notifications/read-all/${currentUser.id}`, { method: 'PUT' });
        loadNotifications();
        loadNotificationCount();
    } catch (error) {
        console.error('Error marking all read:', error);
    }
}

// Call loadNotificationCount periodically
setInterval(loadNotificationCount, 30000); // Every 30 seconds

// Load student certificates
async function loadCertificates() {
    const container = document.getElementById('certificate-content');
    if (!container || !currentUser?.id) return;

    container.innerHTML = `
        <div class="text-center py-10">
            <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
            <p class="text-gray-400">Loading certificates...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/certificates/user/${currentUser.id}`);
        const certificates = await response.json();

        if (certificates.length === 0) {
            container.innerHTML = `
                <div class="bg-black border border-gray-800 rounded-xl p-8 text-center">
                    <i class='bx bx-certification text-5xl text-gray-500 mb-4'></i>
                    <h3 class="text-lg font-semibold text-white mb-2">No Certificates Yet</h3>
                    <p class="text-gray-400">Your certificates will appear here after completing events.</p>
                    <p class="text-gray-500 text-sm mt-2">Certificates are generated after the event ends.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = certificates.map(cert => `
            <div class="bg-black border border-green-800/50 rounded-xl p-6 hover:border-green-500/30 transition-all">
                <div class="flex justify-between items-start">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mr-4">
                            <i class='bx bx-certification text-3xl text-green-400'></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-white">${cert.event_title}</h3>
                            <p class="text-gray-400 text-sm">${cert.event_date ? formatPHDateShort(cert.event_date) : 'Date TBA'}</p>
                            <p class="text-gray-500 text-xs mt-1">Generated: ${formatPHDateShort(cert.generated_at)}</p>
                        </div>
                    </div>
                    <a href="${cert.certificate_url}" target="_blank" 
                       class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                        <i class='bx bx-download mr-2'></i> Download
                    </a>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading certificates:', error);
        container.innerHTML = `
            <div class="bg-black border border-red-800/50 rounded-xl p-8 text-center">
                <i class='bx bx-error text-5xl text-red-500 mb-4'></i>
                <h3 class="text-lg font-semibold text-white mb-2">Error Loading Certificates</h3>
                <p class="text-gray-400">Please try again later.</p>
            </div>
        `;
    }
}

// Format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

// Handle notification click
async function handleNotificationClick(id, link) {
    try {
        await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
        loadNotificationCount();
        
        if (link) {
            // Navigate to the linked page
            const pageMap = {
                '/my-registrations': 'my-registrations',
                '/bus': 'bus',
                '/certificate': 'certificate'
            };
            
            const pageId = pageMap[link];
            if (pageId) {
                document.querySelector(`[data-page="${pageId}"]`)?.click();
            }
        }
        
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

// Toast Modal System
function showToast(options) {
    const {
        type = 'info', // success, error, warning, info
        title = 'Notification',
        message = '',
        confirmText = 'OK',
        cancelText = null,
        onConfirm = null,
        onCancel = null
    } = options;

    const modal = document.getElementById('toast-modal');
    const iconElement = document.getElementById('toast-icon-element');
    const titleElement = document.getElementById('toast-title');
    const messageElement = document.getElementById('toast-message');
    const confirmBtn = document.getElementById('toast-confirm');
    const cancelBtn = document.getElementById('toast-cancel');

    // Remove existing type classes
    modal.classList.remove('toast-success', 'toast-error', 'toast-warning', 'toast-info');
    modal.classList.add(`toast-${type}`);

    // Set icon based on type
    const icons = {
        success: 'bx-check-circle',
        error: 'bx-error-circle',
        warning: 'bx-error',
        info: 'bx-info-circle'
    };
    iconElement.className = `bx ${icons[type]} text-3xl`;

    // Set content
    titleElement.textContent = title;
    messageElement.textContent = message;
    confirmBtn.textContent = confirmText;

    // Handle cancel button
    if (cancelText) {
        cancelBtn.textContent = cancelText;
        cancelBtn.classList.remove('hidden');
    } else {
        cancelBtn.classList.add('hidden');
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('show');

    // Handle confirm
    const handleConfirm = () => {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        if (onConfirm) onConfirm();
        cleanup();
    };

    // Handle cancel
    const handleCancel = () => {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        if (onCancel) onCancel();
        cleanup();
    };

    // Handle outside click
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            handleCancel();
        }
    };

    // Cleanup listeners
    const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        modal.removeEventListener('click', handleOutsideClick);
    };

    // Add listeners
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleOutsideClick);
}

// Confirmation Dialog (returns Promise)
function showConfirm(options) {
    return new Promise((resolve) => {
        showToast({
            ...options,
            type: options.type || 'warning',
            cancelText: options.cancelText || 'Cancel',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
}

// Simple alert replacement
function showAlert(message, type = 'info', title = 'Notification') {
    showToast({
        type,
        title,
        message,
        confirmText: 'OK'
    });
}

// Success alert
function showSuccess(message, title = 'Success!') {
    showToast({
        type: 'success',
        title,
        message,
        confirmText: 'Great!'
    });
}

// Error alert
function showError(message, title = 'Error!') {
    showToast({
        type: 'error',
        title,
        message,
        confirmText: 'OK'
    });
}
async function logout() {
    const confirmed = await showConfirm({
        title: 'Logout',
        message: 'Are you sure you want to logout?',
        type: 'warning',
        confirmText: 'Yes, Logout',
        cancelText: 'Cancel'
    });
    
    if (confirmed) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

// Make functions globally available
window.openRegistrationModal = openRegistrationModal;
window.markNotificationAsRead = markNotificationAsRead;
window.handleNotificationClick = handleNotificationClick;
window.markAllNotificationsRead = markAllNotificationsRead;
window.loadEvents = loadEvents;
window.loadMyRegistrations = loadMyRegistrations;
window.markAnnouncementRead = markAnnouncementRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.logout = logout;