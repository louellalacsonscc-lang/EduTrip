// studpage.js - FIXED VERSION
let currentUser = null;

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
                        break;
                    case 'bus':
                        loadBusAssignment();
                        break;
                    case 'announcement':
                        // Already has placeholder
                        break;
                    case 'certificate':
                        // Already has placeholder
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
        alert('User information is missing. Please log in again.');
        return;
    }

    if (!course || !section || !year || !birthdate || !age || !sex) {
        alert('Please fill in all required profile fields.');
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
        alert('Profile updated successfully');
    } catch (error) {
        console.error('Profile update error:', error);
        alert('Failed to save profile. Please try again.');
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
        const url = course ? `/api/events?course=${course}` : '/api/events';
        const response = await fetch(url);
        const events = await response.json();

        // Filter to only show active events (not hidden, cancelled, or completed)
        const activeEvents = events.filter(event => 
            event.status === 'active' && event.status !== 'hidden' && event.status !== 'cancelled'
        );

        if (activeEvents.length === 0) {
            eventsList.innerHTML = `<div class="col-span-3 text-center py-10"><i class='bx bx-calendar-x text-4xl text-gray-500 mb-3'></i><p class="text-gray-400">No events available</p></div>`;
            return;
        }

        eventsList.innerHTML = activeEvents.map(event => `
            <div class="bg-black border border-gray-800 rounded-xl p-6 hover:border-blue-500/30 transition-all">
                ${event.image_url ? `<div class="mb-4 overflow-hidden rounded-xl"><img src="${event.image_url}" alt="${event.title}" class="w-full h-48 object-cover" /></div>` : ''}
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-semibold text-white">${event.title || 'Untitled Event'}</h3>
                    <span class="px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-800 rounded text-xs font-medium">${event.course || 'ALL'}</span>
                </div>
                <p class="text-gray-400 text-sm mb-4 line-clamp-2">${event.description || 'No description'}</p>
                <div class="space-y-3 mb-6">
                    <div class="flex items-center text-gray-500 text-sm"><i class='bx bx-calendar mr-2'></i>${event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</div>
                    <div class="flex items-center text-gray-500 text-sm"><i class='bx bx-map mr-2'></i>${event.location || 'TBA'}</div>
                </div>
                <button onclick="openRegistrationModal(${event.id})" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">Register Now</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading events:', error);
        eventsList.innerHTML = `<div class="col-span-3 text-center py-10"><i class='bx bx-error text-4xl text-red-500 mb-3'></i><p class="text-gray-400">Error loading events</p><button onclick="loadEvents()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Try Again</button></div>`;
    }
}

function openRegistrationModal(eventId) {
    if (!currentUser?.id) {
        alert('Please login to register');
        window.location.href = '/';
        return;
    }

    if (isProfileIncomplete(currentUser)) {
        alert('Please complete your profile before registering.');
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
            alert('✅ Registration submitted! Pending approval.');
            document.getElementById('registration-modal').classList.add('hidden');
            document.querySelector('[data-page="my-registrations"]')?.click();
        } else {
            alert('❌ Error: ' + (result.error || 'Failed to submit'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Network error. Please try again.');
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
                return `<div class="bg-black border border-red-800/50 rounded-xl p-6 opacity-80"><div class="flex justify-between items-start mb-4"><div><h3 class="text-lg font-semibold text-white">${reg.event_title} <span class="ml-2 px-2 py-1 bg-red-900/30 text-red-400 border border-red-800 rounded text-xs">CANCELLED</span></h3><div class="flex items-center space-x-4 text-gray-400 text-sm mt-2"><span>${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</span><span>${reg.event_location || 'TBA'}</span></div></div></div><p class="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg p-3"><i class='bx bx-error mr-2'></i>This event has been cancelled.</p></div>`;
            }

            const statusColors = {
                approved: 'bg-green-900/30 text-green-400 border-green-800',
                rejected: 'bg-red-900/30 text-red-400 border-red-800',
                pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
            };

            return `<div class="bg-black border border-gray-800 rounded-xl p-6 hover:border-blue-500/30 transition-colors"><div class="flex justify-between items-start mb-4"><div><h3 class="text-lg font-semibold text-white">${reg.event_title || 'Unknown Event'}</h3><div class="flex items-center space-x-4 text-gray-400 text-sm mt-2"><span>${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</span><span>${reg.event_location || 'TBA'}</span></div></div><span class="px-3 py-1 rounded-full text-sm font-medium ${statusColors[reg.status] || statusColors.pending}">${reg.status ? reg.status.toUpperCase() : 'PENDING'}</span></div><div class="text-gray-400 text-sm"><p><strong>Submitted:</strong> ${reg.created_at ? new Date(reg.created_at).toLocaleString() : 'Unknown'}</p>${reg.registration_form ? `<p class="mt-2"><a href="/api/uploads/${reg.registration_form}" target="_blank" class="text-blue-400 hover:text-blue-300"><i class='bx bx-link-external mr-1'></i>View Registration Form</a></p>` : ''}${reg.waiver_form ? `<p class="mt-1"><a href="/api/uploads/${reg.waiver_form}" target="_blank" class="text-blue-400 hover:text-blue-300"><i class='bx bx-link-external mr-1'></i>View Waiver Form</a></p>` : ''}</div></div>`;
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

    try {
        const response = await fetch(`/api/notifications/user/${currentUser.id}`);
        
        if (!response.ok) {
            container.innerHTML = `<div class="text-center py-10"><i class='bx bx-bell text-4xl text-gray-500 mb-3'></i><p class="text-gray-400">No notifications yet</p></div>`;
            return;
        }

        const notifications = await response.json();
        const badge = document.querySelector('.notification-badge');
        
        if (badge) {
            const unread = notifications.filter(n => !n.is_read).length;
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }

        if (notifications.length === 0) {
            container.innerHTML = `<div class="text-center py-10"><i class='bx bx-bell text-4xl text-gray-500 mb-3'></i><p class="text-gray-400">No notifications</p></div>`;
            return;
        }

        container.innerHTML = notifications.map(n => `
            <div class="bg-black border ${n.is_read ? 'border-gray-800' : 'border-blue-800/50'} rounded-xl p-5 cursor-pointer hover:bg-gray-900/50" onclick="markNotificationAsRead(${n.id})">
                <div class="flex justify-between items-start mb-3"><h3 class="text-lg font-semibold text-white">${n.title}</h3><span class="text-gray-500 text-sm">${new Date(n.created_at).toLocaleString()}</span></div>
                <p class="text-gray-400">${n.message}</p>
                <span class="inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${n.type === 'warning' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : n.type === 'success' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-blue-900/30 text-blue-400 border-blue-800'}">${n.type || 'info'}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `<div class="text-center py-10"><i class='bx bx-error text-4xl text-red-500 mb-3'></i><p class="text-gray-400">Error loading notifications</p></div>`;
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
    const container = document.querySelector('#bus .bus-content');
    if (!container || !currentUser?.id) return;

    container.innerHTML = `<div class="text-center py-10"><i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i></div>`;

    try {
        const response = await fetch(`/api/user/registration-requests?user_id=${currentUser.id}`);
        const registrations = await response.json();
        const approved = registrations.filter(r => r.status === 'approved' && r.event_status !== 'cancelled');

        if (approved.length === 0) {
            container.innerHTML = `<div class="text-center py-10"><i class='bx bx-bus text-4xl text-gray-500 mb-3'></i><p class="text-gray-400">No approved registrations</p><p class="text-gray-500 text-sm">Bus assignment appears after approval</p></div>`;
            return;
        }

        let html = '';
        for (const reg of approved) {
            try {
                const busRes = await fetch(`/api/events/${reg.event_id}/bus-assignments`);
                const assignments = await busRes.json();
                const userAssignment = assignments.find(a => a.user_id === currentUser.id);

                html += `<div class="bg-black border border-gray-800 rounded-xl p-6 mb-4"><div class="flex justify-between items-start mb-4"><div><h3 class="text-lg font-semibold text-white">${reg.event_title}</h3><div class="flex items-center space-x-4 text-gray-400 text-sm mt-2"><span>${reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'}</span><span>${reg.event_location || 'TBA'}</span></div></div></div>`;
                
                if (userAssignment) {
                    html += `<div class="bg-green-900/20 border border-green-800 rounded-lg p-4"><div class="flex items-center mb-3"><i class='bx bx-bus text-2xl text-green-400 mr-3'></i><div><h4 class="text-white font-semibold">Bus ${userAssignment.bus_number}</h4><p class="text-gray-400 text-sm">Your assigned bus</p></div></div><div class="text-gray-300 text-sm space-y-1"><p><strong>Capacity:</strong> ${userAssignment.capacity} seats</p><p><strong>Assigned on:</strong> ${new Date(userAssignment.assignment_date).toLocaleString()}</p>${userAssignment.notes ? `<p><strong>Notes:</strong> ${userAssignment.notes}</p>` : ''}</div></div>`;
                } else {
                    html += `<div class="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center"><i class='bx bx-time text-2xl text-yellow-400 mb-2'></i><p class="text-gray-400">Bus assignment pending</p><p class="text-gray-500 text-sm">Will be announced soon</p></div>`;
                }
                html += `</div>`;
            } catch (e) {
                console.error('Error loading bus for event:', e);
            }
        }

        container.innerHTML = html || `<div class="text-center py-10"><i class='bx bx-time text-4xl text-yellow-500 mb-3'></i><p class="text-gray-400">Bus assignments being prepared</p></div>`;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `<div class="text-center py-10"><i class='bx bx-error text-4xl text-red-500 mb-3'></i><p class="text-gray-400">Error loading bus assignments</p></div>`;
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Make functions globally available
window.openRegistrationModal = openRegistrationModal;
window.markNotificationAsRead = markNotificationAsRead;
window.loadEvents = loadEvents;
window.loadMyRegistrations = loadMyRegistrations;
window.logout = logout;