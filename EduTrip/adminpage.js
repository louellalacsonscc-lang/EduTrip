// adminpage.js - COMPLETE FIXED VERSION
let currentUser = null;
let editingEventId = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id || !user.role) {
        console.log('No user found, redirecting to login');
        window.location.href = '/';
        return;
    }
    
    if (user.role !== 'admin') {
        console.log('User is not an admin, redirecting');
        window.location.href = '/';
        return;
    }
    
    currentUser = user;
    console.log('Admin logged in:', user.name);
    
    // Initialize sidebar toggle FIRST
    initSidebarToggle();
    
    // Initialize page navigation
    initializePage();
    
    // Load initial data if needed
    if (document.getElementById('requests')?.classList.contains('active')) {
        loadRegistrationRequests();
    }
    if (document.getElementById('events')?.classList.contains('active')) {
        loadAdminEvents();
    }
});

// Clean sidebar toggle - matches studpage.js
function initSidebarToggle() {
    const toggle = document.querySelector('.toggle');
    const sidebar = document.querySelector('.sidebar');
    const headerText = document.querySelector('.header-text');
    
    console.log('Sidebar elements:', { toggle, sidebar, headerText });
    
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
    initParticipantsFilters();
    // Navigation functionality
    const navLinks = document.querySelectorAll('.sidebar-item');
    const pages = document.querySelectorAll('.page-container');

    // Initialize dashboard as active
    const dashboardPage = document.getElementById('dashboard');
    if (dashboardPage) {
        dashboardPage.classList.remove('hidden');
        document.querySelectorAll('.page-container').forEach(p => {
            if (p.id !== 'dashboard') p.classList.add('hidden');
        });
    }
    
    // Remove active class from all links first
    navLinks.forEach(link => link.classList.remove('active', 'bg-blue-600'));
    // Set dashboard as active
    const dashboardLink = document.querySelector('[data-page="dashboard"]');
    if (dashboardLink) dashboardLink.classList.add('active', 'bg-blue-600');

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
                    case 'requests':
                        loadRegistrationRequests();
                        break;
                    case 'events':
                        loadAdminEvents();
                        break;
                     case 'participants':
                        loadParticipants();
                            // Check dropdown options after loading
    setTimeout(checkEventFilterOptions, 500);
                        break;
                }
            }
        });
    });

    // Dashboard item click handlers - ONLY IF ELEMENTS EXIST
    const regRequestEl = document.getElementById('reg-request');
    const busRequestEl = document.getElementById('bus-request');
    const participantsEl = document.getElementById('participants');
    
    if (regRequestEl) {
        regRequestEl.addEventListener('click', () => {
            const requestLink = Array.from(navLinks).find(link => link.getAttribute('data-page') === 'requests');
            if (requestLink) requestLink.click();
        });
    }
    
    if (busRequestEl) {
        busRequestEl.addEventListener('click', () => {
            const requestLink = Array.from(navLinks).find(link => link.getAttribute('data-page') === 'bus');
            if (requestLink) requestLink.click();
        });
    }
    
    if (participantsEl) {
        participantsEl.addEventListener('click', () => {
            const participantsLink = Array.from(navLinks).find(link => link.getAttribute('data-page') === 'participants');
            if (participantsLink) participantsLink.click();
        });
    }

    // Handle create event form submission
    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
        createEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const eventData = {
                title: document.getElementById('event-title').value,
                description: document.getElementById('event-description').value,
                date: document.getElementById('event-date').value,
                location: document.getElementById('event-location').value
            };
            
            createEvent(eventData);
        });
    }

    // Handle edit event form submission
    const editEventForm = document.getElementById('edit-event-form');
    if (editEventForm) {
        editEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const eventData = {
                title: document.getElementById('edit-event-title').value,
                description: document.getElementById('edit-event-description').value,
                date: document.getElementById('edit-event-date').value,
                location: document.getElementById('edit-event-location').value,
                status: document.getElementById('edit-event-status').value
            };
            
            if (editingEventId) {
                updateEvent(editingEventId, eventData);
            }
        });
    }

    // Close edit modal buttons
    const closeEditModal = document.getElementById('close-edit-modal');
    const cancelEdit = document.getElementById('cancel-edit');
    
    if (closeEditModal) {
        closeEditModal.addEventListener('click', () => {
            document.getElementById('edit-event-modal').classList.add('hidden');
        });
    }
    
    if (cancelEdit) {
        cancelEdit.addEventListener('click', () => {
            document.getElementById('edit-event-modal').classList.add('hidden');
        });
    }

    // File modal setup
    const fileModal = document.getElementById('file-modal');
    const closeFileModal = document.getElementById('close-file-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');

    if (closeFileModal) {
        closeFileModal.addEventListener('click', () => {
            fileModal.classList.add('hidden');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            fileModal.classList.add('hidden');
        });
    }

    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', downloadAllFiles);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const fileModal = document.getElementById('file-modal');
        const editModal = document.getElementById('edit-event-modal');
        
        if (e.target === fileModal) {
            fileModal.classList.add('hidden');
        }
        if (e.target === editModal) {
            editModal.classList.add('hidden');
        }
    });

    // Status filter change handlers
    const statusFilter = document.getElementById('status-filter');
    const eventStatusFilter = document.getElementById('event-status-filter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', loadRegistrationRequests);
    }
    
    if (eventStatusFilter) {
        eventStatusFilter.addEventListener('change', loadRegistrationRequests);
    }
}

// Event Management Functions
async function loadAdminEvents() {
    try {
        const eventsList = document.getElementById('admin-events-list');
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
        const events = await response.json();
        
        if (events.length === 0) {
            eventsList.innerHTML = '<p class="text-gray-400 text-center py-8">No events created yet.</p>';
            return;
        }
        
        eventsList.innerHTML = events.map(event => `
            <div class="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-blue-500/30 transition-colors">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-semibold text-white">${event.title}</h3>
                    <span class="px-3 py-1 ${event.status === 'cancelled' ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'} rounded-full text-xs font-medium">
                        ${event.status || 'active'}
                    </span>
                </div>
                <p class="text-gray-400 text-sm mb-3">${event.description || 'No description'}</p>
                <div class="flex justify-between text-gray-500 text-sm mb-4">
                    <span>${event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</span>
                    <span>${event.location || 'TBA'}</span>
                </div>
                <div class="flex space-x-3">
                    <button class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="editEvent(${event.id})">
                        Edit
                    </button>
                    <button class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="deleteEvent(${event.id})">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading events:', error);
        const eventsList = document.getElementById('admin-events-list');
        if (eventsList) {
            eventsList.innerHTML = '<p class="text-red-400 text-center py-8">Error loading events.</p>';
        }
    }
}

async function createEvent(eventData) {
    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Event created successfully!');
            document.getElementById('create-event-form').reset();
            loadAdminEvents();
        } else {
            alert('Error creating event: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating event:', error);
        alert('Error creating event: ' + error.message);
    }
}

async function editEvent(eventId) {
    editingEventId = eventId;
    
    try {
        const response = await fetch(`/api/events/${eventId}`);
        const event = await response.json();
        
        if (!event) {
            throw new Error('Event not found');
        }
        
        // Populate form
        document.getElementById('edit-event-id').value = eventId;
        document.getElementById('edit-event-title').value = event.title || '';
        document.getElementById('edit-event-description').value = event.description || '';
        document.getElementById('edit-event-date').value = event.date || '';
        document.getElementById('edit-event-location').value = event.location || '';
        document.getElementById('edit-event-status').value = event.status || 'active';
        
        // Show modal
        document.getElementById('edit-event-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading event for editing:', error);
        alert('Error loading event: ' + error.message);
    }
}

// ADD THIS MISSING FUNCTION
async function updateEvent(eventId, eventData) {
    try {
        // Get original event to compare
        const originalResponse = await fetch(`/api/events/${eventId}`);
        const originalEvent = await originalResponse.json();
        
        if (!originalEvent) {
            throw new Error('Original event not found');
        }
        
        // Check for changes
        const changes = {};
        if (originalEvent.date !== eventData.date) changes.date = true;
        if (originalEvent.location !== eventData.location) changes.location = true;
        if (originalEvent.status !== eventData.status) changes.status = true;
        
        // Ask for confirmation if there are important changes
        let shouldProceed = true;
        if (Object.keys(changes).length > 0) {
            let message = "You're making the following changes:\n";
            if (changes.date) message += `• Date: ${originalEvent.date} → ${eventData.date}\n`;
            if (changes.location) message += `• Location: ${originalEvent.location} → ${eventData.location}\n`;
            if (changes.status) message += `• Status: ${originalEvent.status} → ${eventData.status}\n`;
            message += `\nThis will affect registered students. Do you want to proceed?`;
            
            shouldProceed = confirm(message);
        }
        
        if (!shouldProceed) {
            return;
        }
        
        // Update the event
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Event updated successfully!');
            document.getElementById('edit-event-modal').classList.add('hidden');
            loadAdminEvents();
            loadRegistrationRequests();
        } else {
            alert('Error updating event: ' + result.error);
        }
        
    } catch (error) {
        console.error('Error updating event:', error);
        alert('Error updating event: ' + error.message);
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Event deleted successfully!');
            loadAdminEvents();
        } else {
            alert('Error deleting event: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event: ' + error.message);
    }
}

// Registration Requests Management
async function loadRegistrationRequests() {
    try {
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const eventStatusFilter = document.getElementById('event-status-filter')?.value || 'active';
        
        const requestsList = document.getElementById('requests-list');
        if (!requestsList) return;
        
        requestsList.innerHTML = `
            <div class="flex items-center justify-center h-64">
                <div class="text-center">
                    <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
                    <p class="text-gray-400">Loading requests...</p>
                </div>
            </div>
        `;

        const response = await fetch('/api/registration-requests');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let requests = await response.json();
        
        // Filter based on event status
        if (eventStatusFilter === 'active') {
            requests = requests.filter(req => req.event_status !== 'cancelled');
        }
        
        // Filter based on registration status
        const filteredRequests = statusFilter === 'all' 
            ? requests 
            : requests.filter(req => req.status === statusFilter);
        
        if (filteredRequests.length === 0) {
            requestsList.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-inbox text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No registration requests found</p>
                </div>
            `;
            return;
        }
        
        requestsList.innerHTML = filteredRequests.map(request => {
            // Create file links HTML
            let fileLinksHTML = '';
            const hasRegForm = request.registration_form && request.registration_form !== 'null' && request.registration_form !== '';
            const hasWaiverForm = request.waiver_form && request.waiver_form !== 'null' && request.waiver_form !== '';
            
            // FIX: Use safer string escaping
            const safeName = request.name ? request.name.replace(/'/g, "\\'").replace(/"/g, '\\"') : 'Student';
            const safeRegForm = hasRegForm ? request.registration_form.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
            const safeWaiverForm = hasWaiverForm ? request.waiver_form.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
            
            // FIX: Use double quotes for onclick to avoid escaping issues
            if (hasRegForm || hasWaiverForm) {
                fileLinksHTML = '<div class="mt-3 space-y-2">';
                
                if (hasRegForm) {
                    fileLinksHTML += `
                        <p>
                            <a href="#" class="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center" 
                               onclick="openFileViewer(${request.id}, '${safeName}', '${safeRegForm}', '${safeWaiverForm}'); return false;"
                               title="View uploaded registration form">
                                <i class='bx bx-file mr-1'></i> Registration Form uploaded
                            </a>
                        </p>
                    `;
                }
                
                if (hasWaiverForm) {
                    fileLinksHTML += `
                        <p>
                            <a href="#" class="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center" 
                               onclick="openFileViewer(${request.id}, '${safeName}', '${safeRegForm}', '${safeWaiverForm}'); return false;"
                               title="View uploaded waiver form">
                                <i class='bx bx-file mr-1'></i> Waiver Form uploaded
                            </a>
                        </p>
                    `;
                }
                
                fileLinksHTML += '</div>';
            }
            
            const eventStatusBadge = request.event_status === 'cancelled' 
                ? `<span class="ml-2 px-2 py-1 bg-red-900/30 text-red-400 border border-red-800 rounded text-xs font-medium">Event Cancelled</span>` 
                : '';
            
            const statusColor = request.status === 'approved' ? 'bg-green-900/30 text-green-400 border-green-800' :
                               request.status === 'rejected' ? 'bg-red-900/30 text-red-400 border-red-800' :
                               'bg-yellow-900/30 text-yellow-400 border-yellow-800';
            
            return `
                <div class="bg-black border ${request.event_status === 'cancelled' ? 'border-red-800/50' : 'border-gray-800'} rounded-lg p-5 hover:border-blue-500/30 transition-colors ${request.event_status === 'cancelled' ? 'opacity-80' : ''}">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-semibold text-white">${request.name || 'Unknown Student'} ${eventStatusBadge}</h3>
                            <p class="text-gray-400 text-sm mt-1"><strong>Student #:</strong> ${request.student_number || 'N/A'}</p>
                            <p class="text-gray-400 text-sm"><strong>Email:</strong> ${request.email || 'N/A'}</p>
                            <p class="text-gray-400 text-sm"><strong>Event:</strong> ${request.event_title || 'Unknown Event'}</p>
                            <p class="text-gray-400 text-sm"><strong>Date:</strong> ${request.event_date ? new Date(request.event_date).toLocaleDateString() : 'N/A'}</p>
                            <p class="text-gray-400 text-sm"><strong>Location:</strong> ${request.event_location || 'N/A'}</p>
                            <p class="text-gray-400 text-sm"><strong>Submitted:</strong> ${request.created_at ? new Date(request.created_at).toLocaleString() : 'N/A'}</p>
                            
                            ${fileLinksHTML}
                        </div>
                        <span class="px-3 py-1 ${statusColor} border rounded-full text-sm font-medium">
                            ${(request.status || 'pending').toUpperCase()}
                        </span>
                    </div>
                    ${request.event_status !== 'cancelled' ? `
                        <div class="flex space-x-3">
                            ${request.status !== 'approved' ? `
                                <button class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="updateRequestStatus(${request.id}, 'approved')">
                                    Approve
                                </button>
                            ` : ''}
                            ${request.status !== 'rejected' ? `
                                <button class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="updateRequestStatus(${request.id}, 'rejected')">
                                    Reject
                                </button>
                            ` : ''}
                            ${request.status !== 'pending' ? `
                                <button class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="updateRequestStatus(${request.id}, 'pending')">
                                    Set Pending
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="text-center p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
                            <p class="text-red-400 text-sm">Event Cancelled - No Actions Available</p>
                        </div>
                    `}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading registration requests:', error);
        const requestsList = document.getElementById('requests-list');
        if (requestsList) {
            requestsList.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading registration requests</p>
                    <button class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="loadRegistrationRequests()">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

async function updateRequestStatus(requestId, status) {
    if (!confirm(`Are you sure you want to ${status} this registration request?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/registration-requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Request status updated successfully!');
            loadRegistrationRequests();
        } else {
            alert('Error updating request status: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating request status:', error);
        alert('Error updating request status: ' + error.message);
    }
}

// File viewing functionality
let currentRequestFiles = [];

function openFileViewer(requestId, requestName, registrationForm, waiverForm) {
    console.log('Opening file viewer:', { requestId, requestName, registrationForm, waiverForm });
    
    currentRequestFiles = [];
    
    // Only add files that actually exist
    if (registrationForm && registrationForm.trim() !== '' && registrationForm !== 'null') {
        currentRequestFiles.push({
            type: 'registration',
            filename: registrationForm.trim(),
            title: 'Registration Form'
        });
    }
    
    if (waiverForm && waiverForm.trim() !== '' && waiverForm !== 'null') {
        currentRequestFiles.push({
            type: 'waiver',
            filename: waiverForm.trim(),
            title: 'Waiver Form'
        });
    }
    
    if (currentRequestFiles.length === 0) {
        alert('No files uploaded for this request.');
        return;
    }
    
    // Set modal title
    document.querySelector('#file-modal h3').textContent = `Documents - ${requestName}`;
    
    // Load file previews
    const previewContainer = document.getElementById('file-preview-container');
    previewContainer.innerHTML = '';
    
    currentRequestFiles.forEach((file, index) => {
        const filePreview = createFilePreview(file, index);
        previewContainer.innerHTML += filePreview;
    });
    
    // Show modal
    document.getElementById('file-modal').classList.remove('hidden');
    
    // Load file content
    currentRequestFiles.forEach((file, index) => {
        loadFileContent(file, index);
    });
}

function createFilePreview(file, index) {
    const fileExt = file.filename.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExt);
    const isPdf = fileExt === 'pdf';
    
    return `
        <div class="mb-6" id="file-preview-${index}">
            <h4 class="text-lg font-semibold text-white mb-3">${file.title} 
                <span class="ml-2 px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs font-medium">${fileExt.toUpperCase()}</span>
            </h4>
            <div id="file-viewer-${index}" class="bg-black border border-gray-800 rounded-lg mb-3 min-h-[300px] flex items-center justify-center">
                <div class="text-center">
                    <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
                    <p class="text-gray-400">Loading file...</p>
                </div>
            </div>
            <div class="text-gray-400 text-sm">
                <p><strong>File name:</strong> ${file.filename}</p>
                <p><strong>Type:</strong> ${isImage ? 'Image' : isPdf ? 'PDF Document' : 'Document'}</p>
            </div>
        </div>
    `;
}

function loadFileContent(file, index) {
    const viewer = document.getElementById(`file-viewer-${index}`);
    const fileExt = file.filename.split('.').pop().toLowerCase();
    const fileUrl = `/uploads/${file.filename}`;
    
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExt);
    const isPdf = fileExt === 'pdf';
    
    if (isImage) {
        viewer.innerHTML = `<img src="${fileUrl}" alt="${file.title}" class="w-full h-auto max-h-[400px] object-contain" onerror="handleFileError(${index})">`;
    } else if (isPdf) {
        viewer.innerHTML = `
            <iframe src="${fileUrl}" class="w-full h-[400px]" title="${file.title}"></iframe>
        `;
    } else {
        viewer.innerHTML = `
            <div class="text-center p-8">
                <i class='bx bx-file text-6xl text-gray-500 mb-4'></i>
                <p class="text-gray-400 mb-4">Document preview not available for .${fileExt} files</p>
                <a href="${fileUrl}" target="_blank" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <i class='bx bx-download mr-2'></i> Download File
                </a>
            </div>
        `;
    }
}

function handleFileError(index) {
    const viewer = document.getElementById(`file-viewer-${index}`);
    viewer.innerHTML = `
        <div class="text-center p-8">
            <i class='bx bx-error text-6xl text-red-500 mb-4'></i>
            <p class="text-gray-400 mb-2">Unable to load file</p>
            <p class="text-gray-500 text-sm">The file may have been deleted or is unavailable</p>
        </div>
    `;
}

function downloadAllFiles() {
    if (currentRequestFiles.length === 0) return;
    
    currentRequestFiles.forEach(file => {
        const fileUrl = `/uploads/${file.filename}`;
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    alert('Download started for all files');
}

async function loadParticipants() {
    try {
        console.log('=== loadParticipants() called ===');
        
        const participantsContent = document.getElementById('participants-content');
        const participantsLoading = document.getElementById('participants-loading');
        const noParticipants = document.getElementById('no-participants');
        
        if (!participantsContent || !participantsLoading || !noParticipants) return;
        
        // Show loading
        participantsContent.classList.add('hidden');
        noParticipants.classList.add('hidden');
        participantsLoading.classList.remove('hidden');
        
        // Fetch all registration requests
        const response = await fetch('/api/registration-requests');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let allRequests = await response.json();
        console.log('All requests:', allRequests);
        
        // Filter for approved requests only
        const approvedRequests = allRequests.filter(req => req.status === 'approved' && req.event_status !== 'cancelled');
        console.log('Approved requests:', approvedRequests);
        
        // Hide loading
        participantsLoading.classList.add('hidden');
        
        if (approvedRequests.length === 0) {
            participantsContent.classList.add('hidden');
            noParticipants.classList.remove('hidden');
            updateEventFilter([]);
            return;
        }
        
        // Group participants by event
        const eventsMap = {};
        
        approvedRequests.forEach(request => {
            const eventId = request.event_id;
            
            if (!eventsMap[eventId]) {
                eventsMap[eventId] = {
                    event_id: eventId,
                    event_title: request.event_title || 'Unknown Event',
                    event_date: request.event_date,
                    event_location: request.event_location,
                    participants: []
                };
            }
            
            eventsMap[eventId].participants.push({
                id: request.user_id || request.id,
                name: request.name || 'Unknown Student',
                student_number: request.student_number || 'N/A',
                email: request.email || 'N/A',
                approved_at: request.updated_at || request.created_at,
                registration_form: request.registration_form,
                waiver_form: request.waiver_form
            });
        });
        
        // Convert to array and sort by event date
        const events = Object.values(eventsMap).sort((a, b) => {
            return new Date(a.event_date) - new Date(b.event_date);
        });
        
        console.log('Events grouped:', events);
        
        // Update event filter dropdown
        updateEventFilter(events);
        
        // Get selected event filter and search filter
        const eventFilter = document.getElementById('participants-event-filter');
        const searchInput = document.getElementById('participants-search');
        
        const selectedEventId = eventFilter ? eventFilter.value : 'all';
        const searchFilter = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        console.log('Selected Event ID:', selectedEventId, 'Type:', typeof selectedEventId);
        console.log('Available events:', events.map(e => ({ id: e.event_id, title: e.event_title })));
        
        // Filter events based on selection
        let filteredEvents = [...events];
        
        if (selectedEventId && selectedEventId !== 'all') {
            console.log(`Filtering for event ID: ${selectedEventId}`);
            // Convert both to string for comparison
            filteredEvents = events.filter(event => String(event.event_id) === String(selectedEventId));
            console.log(`Found ${filteredEvents.length} events after filtering`);
            
            if (filteredEvents.length === 0 && events.length > 0) {
                console.warn('No events match the selected filter, showing all events');
                filteredEvents = events;
            }
        }
        
        // Apply search filter if exists
        if (searchFilter) {
            console.log(`Applying search filter: "${searchFilter}"`);
            filteredEvents = filteredEvents.map(event => {
                const filteredParticipants = event.participants.filter(participant => 
                    participant.name.toLowerCase().includes(searchFilter) ||
                    participant.student_number.toLowerCase().includes(searchFilter) ||
                    participant.email.toLowerCase().includes(searchFilter)
                );
                
                return {
                    ...event,
                    participants: filteredParticipants
                };
            }).filter(event => event.participants.length > 0);
        }
        
        console.log(`Total events to display: ${filteredEvents.length}`);
        
        // Clear existing content
        participantsContent.innerHTML = '';
        
        if (filteredEvents.length === 0) {
            console.log('No events to display');
            participantsContent.classList.add('hidden');
            noParticipants.classList.remove('hidden');
            noParticipants.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-search text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No participants found</p>
                    <p class="text-gray-500 text-sm">Try selecting a different event or check if participants are approved</p>
                </div>
            `;
            return;
        }
        
        // Render each event
        filteredEvents.forEach(event => {
            console.log(`Rendering event: ${event.event_title} with ${event.participants.length} participants`);
            
            const eventElement = document.createElement('div');
            eventElement.className = 'bg-black border border-gray-800 rounded-xl p-6 hover:border-blue-500/30 transition-colors mb-6';
            
            eventElement.innerHTML = `
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-xl font-semibold text-white mb-2">${event.event_title}</h2>
                        <div class="flex items-center space-x-4 text-gray-400 text-sm">
                            <span class="flex items-center">
                                <i class='bx bx-calendar mr-1'></i>
                                ${event.event_date ? new Date(event.event_date).toLocaleDateString() : 'Date TBA'}
                            </span>
                            <span class="flex items-center">
                                <i class='bx bx-map mr-1'></i>
                                ${event.event_location || 'Location TBA'}
                            </span>
                            <span class="px-2 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded text-xs">
                                ${event.participants.length} Approved
                            </span>
                        </div>
                    </div>
                    <button onclick="exportParticipants(${event.event_id})" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <i class='bx bx-download mr-1'></i> Export List
                    </button>
                </div>
                
                ${event.participants.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="text-left text-gray-400 text-sm border-b border-gray-800">
                                    <th class="pb-3 font-medium">Student</th>
                                    <th class="pb-3 font-medium">Student Number</th>
                                    <th class="pb-3 font-medium">Email</th>
                                    <th class="pb-3 font-medium">Approved On</th>
                                    <th class="pb-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${event.participants.map(participant => `
                                    <tr class="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                                        <td class="py-4">
                                            <div class="text-white font-medium">${participant.name}</div>
                                        </td>
                                        <td class="py-4 text-gray-300">${participant.student_number}</td>
                                        <td class="py-4 text-gray-300">${participant.email}</td>
                                        <td class="py-4">
                                            <div class="text-gray-300 text-sm">
                                                ${participant.approved_at ? new Date(participant.approved_at).toLocaleString() : 'Unknown'}
                                            </div>
                                        </td>
                                        <td class="py-4">
                                            <div class="flex space-x-2">
                                                ${participant.registration_form ? `
                                                    <button onclick="openFileViewer(${participant.id}, '${participant.name.replace(/'/g, "\\'")}', '${participant.registration_form}', '${participant.waiver_form || ''}')"
                                                            class="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors">
                                                        <i class='bx bx-file mr-1'></i> Docs
                                                    </button>
                                                ` : ''}
                                                <button onclick="sendCertificate(${participant.id}, ${event.event_id})"
                                                        class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors">
                                                    <i class='bx bx-envelope mr-1'></i> Cert
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="text-center py-10 bg-gray-900/50 rounded-lg">
                        <i class='bx bx-user-x text-4xl text-gray-500 mb-3'></i>
                        <p class="text-gray-400">No participants in this event</p>
                    </div>
                `}
                
                ${event.participants.length > 10 ? `
                    <div class="mt-4 text-center text-gray-500 text-sm">
                        Showing ${event.participants.length} participants
                    </div>
                ` : ''}
            `;
            
            participantsContent.appendChild(eventElement);
        });
        
        participantsContent.classList.remove('hidden');
        console.log('Participants page rendered successfully');
        
    } catch (error) {
        console.error('Error loading participants:', error);
        
        const participantsLoading = document.getElementById('participants-loading');
        const participantsContent = document.getElementById('participants-content');
        
        if (participantsLoading) participantsLoading.classList.add('hidden');
        if (participantsContent) {
            participantsContent.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading participants</p>
                    <p class="text-gray-500 text-sm mb-4">${error.message}</p>
                    <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors" 
                            onclick="loadParticipants()">
                        <i class='bx bx-refresh mr-2'></i> Try Again
                    </button>
                </div>
            `;
            participantsContent.classList.remove('hidden');
        }
    }
}
function checkEventFilterOptions() {
    const eventFilter = document.getElementById('participants-event-filter');
    if (!eventFilter) {
        console.error('Event filter not found');
        return;
    }
    
    console.log('=== Event Filter Options ===');
    console.log('Current selected value:', eventFilter.value);
    
    for (let i = 0; i < eventFilter.options.length; i++) {
        const option = eventFilter.options[i];
        console.log(`Option ${i}: value="${option.value}", text="${option.text}"`);
    }
}

function updateEventFilter(events) {
    const eventFilter = document.getElementById('participants-event-filter');
    if (!eventFilter) {
        console.error('Event filter element not found!');
        return;
    }
    
    // Save current selection
    const currentValue = eventFilter.value;
    console.log('Current filter value before update:', currentValue);
    console.log('Events to add to filter:', events.map(e => ({ id: e.event_id, title: e.event_title })));
    
    // Clear existing options (keep "All Events")
    eventFilter.innerHTML = '<option value="all">All Events</option>';
    
    // Add event options
    events.forEach(event => {
        const option = document.createElement('option');
        option.value = event.event_id;
        option.textContent = `${event.event_title} (${event.participants.length})`;
        eventFilter.appendChild(option);
    });
    
    // Restore selection if possible
    if (currentValue && events.some(event => String(event.event_id) === String(currentValue))) {
        eventFilter.value = currentValue;
        console.log('Restored previous selection:', currentValue);
    } else {
        eventFilter.value = 'all';
        console.log('Using default selection: "all"');
    }
}

function exportParticipants(eventId) {
    alert(`Exporting participants list for event ID: ${eventId}\n\nThis feature would generate a CSV/Excel file with all approved participants for this event.`);
    // In a real implementation, you would:
    // 1. Fetch participants for this specific event
    // 2. Format them as CSV/Excel
    // 3. Trigger download
}

function sendCertificate(userId, eventId) {
    if (!confirm('Send e-certificate to this participant?')) {
        return;
    }
    
    alert(`Sending e-certificate to user ${userId} for event ${eventId}\n\nThis feature would:\n1. Generate an e-certificate\n2. Send it via email to the student\n3. Log the action in the database.`);
    // In a real implementation, you would:
    // 1. Call an API to generate and send certificate
    // 2. Update UI to show success/error
    // 3. Possibly track certificate status
}

function initParticipantsFilters() {
    const eventFilter = document.getElementById('participants-event-filter');
    const searchInput = document.getElementById('participants-search');
    
    console.log('Initializing participants filters...');
    console.log('Event filter found:', !!eventFilter);
    console.log('Search input found:', !!searchInput);
    
    if (eventFilter) {
        // Remove any existing event listeners first
        const newEventFilter = eventFilter.cloneNode(true);
        eventFilter.parentNode.replaceChild(newEventFilter, eventFilter);
        
        // Re-get the element
        const freshEventFilter = document.getElementById('participants-event-filter');
        freshEventFilter.addEventListener('change', function() {
            console.log('Event filter changed to:', this.value);
            console.log('Calling loadParticipants()...');
            loadParticipants();
        });
        
        // Force initial load if on participants page
        if (document.getElementById('participants-page') && !document.getElementById('participants-page').classList.contains('hidden')) {
            console.log('On participants page, loading data...');
            loadParticipants();
        }
    }
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            console.log('Search input:', this.value);
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                console.log('Executing search');
                loadParticipants();
            }, 500);
        });
    }
}
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}