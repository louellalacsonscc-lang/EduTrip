let currentUser = null;
let editingEventId = null;
let busFilterInitialized = false; // Track if bus filter is already initialized

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

    // Start auto-refresh for dashboard stats
    startDashboardAutoRefresh();
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
    initializeModalListeners();
    initializeDashboardRefreshButton();
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
                        break;
                    case 'bus':
                        // Reset the bus filter initialization flag when coming back to bus page
                        busFilterInitialized = false;
                        // Initialize bus assignment when page is shown
                        initializeBusAssignment();
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
// Add this function to update dashboard stats
// Update the updateDashboardStats function to handle spinner animation
async function updateDashboardStats() {
    try {
        console.log('Updating dashboard stats...');
        
        // Get the refresh button
        const refreshBtn = document.getElementById('refresh-dashboard-btn');
        const refreshIcon = refreshBtn?.querySelector('i.bx-refresh');
        
        // Add spinning animation to refresh button
        if (refreshIcon) {
            refreshIcon.classList.add('bx-spin');
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
        }
        
        // 1. Get registration request count (pending only)
        const regRequestsResponse = await fetch('/api/registration-requests');
        if (regRequestsResponse.ok) {
            const allRequests = await regRequestsResponse.json();
            const pendingRequests = allRequests.filter(req => 
                req.status === 'pending' && req.event_status !== 'cancelled'
            );
            
            const regRequestElement = document.querySelector('#reg-request .text-3xl');
            if (regRequestElement) {
                regRequestElement.textContent = pendingRequests.length;
            }
            
            // Also update the text below
            const regRequestText = document.querySelector('#reg-request .text-gray-500');
            if (regRequestText && pendingRequests.length === 1) {
                regRequestText.textContent = 'pending request';
            } else if (regRequestText) {
                regRequestText.textContent = 'pending requests';
            }
        }
        
        // 2. Get bus assignment request count
        // This counts participants who are approved but not assigned to any bus
        let busRequestCount = 0;
        try {
            // Get all events
            const eventsResponse = await fetch('/api/events');
            if (eventsResponse.ok) {
                const events = await eventsResponse.json();
                const activeEvents = events.filter(event => 
                    event.status === 'active' || event.status === 'upcoming'
                );
                
                // For each event, count eligible participants (approved but not assigned)
                for (const event of activeEvents) {
                    try {
                        const eligibleResponse = await fetch(`/api/events/${event.id}/eligible-participants`);
                        if (eligibleResponse.ok) {
                            const eligibleParticipants = await eligibleResponse.json();
                            busRequestCount += eligibleParticipants.length;
                        }
                    } catch (error) {
                        console.error(`Error fetching eligible participants for event ${event.id}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error calculating bus request count:', error);
        }
        
        const busRequestElement = document.querySelector('#bus-request .text-3xl');
        if (busRequestElement) {
            busRequestElement.textContent = busRequestCount;
        }
        
        // Update bus request text
        const busRequestText = document.querySelector('#bus-request .text-gray-500');
        if (busRequestText && busRequestCount === 1) {
            busRequestText.textContent = 'request';
        } else if (busRequestText) {
            busRequestText.textContent = 'requests';
        }
        
        // 3. Get total participants count (approved registrations across all events)
        let totalParticipants = 0;
        try {
            const requestsResponse = await fetch('/api/registration-requests');
            if (requestsResponse.ok) {
                const allRequests = await requestsResponse.json();
                const approvedRequests = allRequests.filter(req => 
                    req.status === 'approved' && req.event_status !== 'cancelled'
                );
                totalParticipants = approvedRequests.length;
            }
        } catch (error) {
            console.error('Error calculating total participants:', error);
        }
        
        const participantsElement = document.querySelector('#participants .text-3xl');
        if (participantsElement) {
            participantsElement.textContent = totalParticipants;
        }
        
        // Update participants text
        const participantsText = document.querySelector('#participants .text-gray-500');
        if (participantsText && totalParticipants === 1) {
            participantsText.textContent = 'participant';
        } else if (participantsText) {
            participantsText.textContent = 'participants';
        }
        
        console.log('Dashboard stats updated:', {
            pendingRequests: document.querySelector('#reg-request .text-3xl')?.textContent,
            busRequests: document.querySelector('#bus-request .text-3xl')?.textContent,
            totalParticipants: document.querySelector('#participants .text-3xl')?.textContent
        });
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    } finally {
        // Always remove spinning animation regardless of success/failure
        const refreshBtn = document.getElementById('refresh-dashboard-btn');
        const refreshIcon = refreshBtn?.querySelector('i.bx-refresh');
        
        if (refreshIcon) {
            // Wait a moment before removing the spin (makes it feel more natural)
            setTimeout(() => {
                refreshIcon.classList.remove('bx-spin');
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }, 500);
        }
    }
}

// Add event listener for the refresh button
function initializeDashboardRefreshButton() {
    const refreshBtn = document.getElementById('refresh-dashboard-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
            e.preventDefault();
            updateDashboardStats();
        });
    }
}
function animateNumberUpdate(element) {
    if (element) {
        element.classList.add('number-update');
        setTimeout(() => {
            element.classList.remove('number-update');
        }, 500);
    }
}

// Then update each number update section like this:
// In the updateDashboardStats function, update each counter like this:

// For registration requests:
if (regRequestElement) {
    const oldValue = parseInt(regRequestElement.textContent) || 0;
    const newValue = pendingRequests.length;
    regRequestElement.textContent = newValue;
    if (oldValue !== newValue) {
        animateNumberUpdate(regRequestElement);
    }
}

// For bus requests:
if (busRequestElement) {
    const oldValue = parseInt(busRequestElement.textContent) || 0;
    const newValue = busRequestCount;
    busRequestElement.textContent = newValue;
    if (oldValue !== newValue) {
        animateNumberUpdate(busRequestElement);
    }
}

// For participants:
if (participantsElement) {
    const oldValue = parseInt(participantsElement.textContent) || 0;
    const newValue = totalParticipants;
    participantsElement.textContent = newValue;
    if (oldValue !== newValue) {
        animateNumberUpdate(participantsElement);
    }
}

// Update the initializePage function to call updateDashboardStats
function initializePage() {
    initParticipantsFilters();
    initializeModalListeners();
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
        
        // Update dashboard stats when dashboard is shown
        updateDashboardStats();
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
                    case 'dashboard':
                        updateDashboardStats(); // Update stats when returning to dashboard
                        break;
                    case 'requests':
                        loadRegistrationRequests();
                        break;
                    case 'events':
                        loadAdminEvents();
                        break;
                    case 'participants':
                        loadParticipants();
                        break;
                    case 'bus':
                        // Reset the bus filter initialization flag when coming back to bus page
                        busFilterInitialized = false;
                        // Initialize bus assignment when page is shown
                        initializeBusAssignment();
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

// Update the loadRegistrationRequests function to refresh dashboard stats when requests are updated
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
            updateDashboardStats(); // Refresh dashboard stats
        } else {
            alert('Error updating request status: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating request status:', error);
        alert('Error updating request status: ' + error.message);
    }
}

// Update the createEvent function to refresh dashboard
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
            updateDashboardStats(); // Refresh dashboard after creating event
        } else {
            alert('Error creating event: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating event:', error);
        alert('Error creating event: ' + error.message);
    }
}

// Update the deleteEvent function
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
            updateDashboardStats(); // Refresh dashboard after deleting event
        } else {
            alert('Error deleting event: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event: ' + error.message);
    }
}

// Update the assignToBus function to refresh dashboard
async function assignToBus(assignmentData) {
    try {
        // Validate bus selection
        if (!assignmentData.bus_id) {
            alert('Please select a bus');
            return;
        }
        
        const response = await fetch('/api/bus-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assignmentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Participant assigned to bus successfully!');
            document.getElementById('assign-bus-form').reset();
            document.getElementById('assign-bus-modal').classList.add('hidden');
            
            // Refresh data
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
                loadEligibleParticipants(eventId);
            }
            loadBuses();
            updateDashboardStats(); // Refresh dashboard stats
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error assigning to bus:', error);
        alert('❌ Error assigning to bus: ' + error.message);
    }
}

// Update the removeBusAssignment function
async function removeBusAssignment(assignmentId, userName) {
    if (!confirm(`Are you sure you want to remove ${userName} from their bus assignment?\n\nThis will free up their seat on the bus.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bus-assignments/${assignmentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Bus assignment removed successfully!');
            
            // Refresh data
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
                loadEligibleParticipants(eventId);
            }
            loadBuses();
            updateDashboardStats(); // Refresh dashboard stats
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error removing bus assignment:', error);
        alert('❌ Error removing bus assignment: ' + error.message);
    }
}

// Add this function to periodically update dashboard stats
function startDashboardAutoRefresh() {
    // Update stats immediately
    updateDashboardStats();
    
    // Update every 30 seconds
    setInterval(updateDashboardStats, 30000);
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
async function checkExistingBusAssignment(userId, eventId) {
    try {
        const response = await fetch(`/api/events/${eventId}/bus-assignments`);
        const assignments = await response.json();
        
        return assignments.find(assignment => assignment.user_id == userId);
    } catch (error) {
        console.error('Error checking existing assignment:', error);
        return null;
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
async function testApiConnection() {
    console.log('Testing API connection...');
    
    const endpoints = [
        '/api/buses',
        '/api/events',
        '/api/registration-requests'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint}...`);
            const response = await fetch(endpoint);
            console.log(`${endpoint}: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                console.error(`❌ ${endpoint} failed: ${response.status}`);
            } else {
                console.log(`✅ ${endpoint} OK`);
            }
        } catch (error) {
            console.error(`❌ ${endpoint} error:`, error.message);
        }
    }
    
    // Test specific bus assignments endpoint
    try {
        console.log('Testing bus assignments endpoint...');
        const response = await fetch('/api/bus-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
        });
        console.log('Bus assignments POST:', response.status);
    } catch (error) {
        console.error('Bus assignments endpoint error:', error.message);
    }
}
// Bus Management Functions

function initializeBusAssignment() {
    console.log('initializeBusAssignment called, busFilterInitialized:', busFilterInitialized);
    
    // Prevent multiple initializations
    if (busFilterInitialized) {
        console.log('Bus filter already initialized, skipping...');
        return;
    }
    
    // Test API connection
    console.log('Testing API before initialization...');
    testApiConnection();
    
    // Add Bus Button
    const addBusBtn = document.getElementById('add-bus-btn');
    if (addBusBtn) {
        // Remove existing event listeners first
        const newAddBusBtn = addBusBtn.cloneNode(true);
        addBusBtn.parentNode.replaceChild(newAddBusBtn, addBusBtn);
        
        // Add fresh event listener
        document.getElementById('add-bus-btn').addEventListener('click', () => {
            console.log('Add bus button clicked');
            document.getElementById('add-bus-form').reset();
            document.getElementById('add-bus-modal').classList.remove('hidden');
        });
    }
    
    // Initialize event filter
    initBusEventFilter();
    
    // Initialize modal listeners
    initializeModalListeners();
    
    // Set the flag to prevent re-initialization
    busFilterInitialized = true;
}

async function initBusEventFilter() {
    console.log('initBusEventFilter called');
    
    const eventFilter = document.getElementById('bus-event-filter');
    if (!eventFilter) {
        console.error('Bus event filter not found');
        return;
    }
    
    // Remove existing event listener
    const newEventFilter = eventFilter.cloneNode(true);
    eventFilter.parentNode.replaceChild(newEventFilter, eventFilter);
    
    // Get fresh reference
    const freshEventFilter = document.getElementById('bus-event-filter');
    
    try {
        // Load events
        const response = await fetch('/api/events');
        const events = await response.json();
        
        // Clear existing options
        freshEventFilter.innerHTML = '<option value="">Select Event</option>';
        
        // Filter for active events
        const activeEvents = events.filter(event => 
            event.status === 'active' || event.status === 'upcoming'
        );
        
        activeEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBA';
            
            // Truncate long event titles (max 50 characters)
            let displayTitle = event.title;
            if (displayTitle.length > 50) {
                displayTitle = displayTitle.substring(0, 47) + '...';
            }
            
            option.textContent = `${displayTitle} (${eventDate})`;
            option.title = `${event.title} (${eventDate})`; // Full title as tooltip
            freshEventFilter.appendChild(option);
        });
        
        // Add CSS class to control dropdown width
        freshEventFilter.classList.add('max-w-xs', 'truncate');
        
        // Add event listener for filter change
        freshEventFilter.addEventListener('change', function() {
            const eventId = this.value;
            console.log('Event filter changed to:', eventId);
            handleEventFilterChange(eventId);
        });
        
        // Add clear filter button listener
        const clearFilterBtn = document.getElementById('clear-event-filter');
        if (clearFilterBtn) {
            // Remove existing event listener
            const newClearBtn = clearFilterBtn.cloneNode(true);
            clearFilterBtn.parentNode.replaceChild(newClearBtn, clearFilterBtn);
            
            document.getElementById('clear-event-filter').addEventListener('click', () => {
                freshEventFilter.value = '';
                handleEventFilterChange('');
            });
        }
        
        // Check if there's a saved filter value
        const savedFilter = localStorage.getItem('busEventFilter');
        if (savedFilter) {
            freshEventFilter.value = savedFilter;
            if (savedFilter) {
                handleEventFilterChange(savedFilter);
            }
        } else {
            // Load initial bus list
            loadBuses();
        }
        
    } catch (error) {
        console.error('Error loading events for filter:', error);
        // Still load buses if event filter fails
        loadBuses();
    }
}

function handleEventFilterChange(eventId) {
    console.log('handleEventFilterChange called with eventId:', eventId);
    
    // Save filter selection
    if (eventId) {
        localStorage.setItem('busEventFilter', eventId);
    } else {
        localStorage.removeItem('busEventFilter');
    }
    
    const fleetSection = document.getElementById('bus-fleet-section');
    const eventSection = document.getElementById('event-assignments-section');
    const clearFilterBtn = document.getElementById('clear-event-filter');
    
    if (eventId) {
        // Hide bus fleet, show event assignments
        if (fleetSection) fleetSection.classList.add('hidden');
        if (eventSection) eventSection.classList.remove('hidden');
        if (clearFilterBtn) clearFilterBtn.classList.remove('hidden');
        
        // Load event-specific data
        loadEventBusAssignments(eventId);
        loadEligibleParticipants(eventId);
        
        // Update page title or add event info
        updateEventTitle(eventId);
    } else {
        // Show bus fleet, hide event assignments
        if (fleetSection) fleetSection.classList.remove('hidden');
        if (eventSection) eventSection.classList.add('hidden');
        if (clearFilterBtn) clearFilterBtn.classList.add('hidden');
        
        // Load all buses
        loadBuses();
        
        // Reset page title
        const pageTitle = document.querySelector('#bus h1');
        if (pageTitle) {
            pageTitle.textContent = 'Bus Assignment Management';
        }
    }
}

async function updateEventTitle(eventId) {
    try {
        const response = await fetch(`/api/events/${eventId}`);
        const event = await response.json();
        
        const pageTitle = document.querySelector('#bus h1');
        if (pageTitle && event) {
            const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBA';
            
            // Truncate long titles with CSS instead of JavaScript
            pageTitle.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-2xl font-bold text-white truncate" title="${event.title} (${eventDate})">
                        Bus Assignment Management - ${event.title}
                    </span>
                    <span class="text-gray-400 text-sm mt-1">${eventDate}</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating event title:', error);
    }
}

async function loadBuses() {
    try {
        const busList = document.getElementById('bus-list');
        if (!busList) return;
        
        busList.innerHTML = `
            <div class="col-span-3 flex items-center justify-center h-48">
                <div class="text-center">
                    <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
                    <p class="text-gray-400">Loading buses...</p>
                </div>
            </div>
        `;

        const response = await fetch('/api/buses');
        const buses = await response.json();
        
        if (buses.length === 0) {
            busList.innerHTML = `
                <div class="col-span-3 text-center py-10">
                    <i class='bx bx-bus text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No buses added yet</p>
                    <button id="add-first-bus" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        Add Your First Bus
                    </button>
                </div>
            `;
            
            document.getElementById('add-first-bus')?.addEventListener('click', () => {
                document.getElementById('add-bus-modal').classList.remove('hidden');
            });
            
            return;
        }
        
        busList.innerHTML = buses.map(bus => `
            <div class="bg-black border border-gray-800 rounded-xl p-5 hover:border-blue-500/30 transition-colors">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-white">${bus.bus_number}</h3>
                        <p class="text-gray-400 text-sm">Capacity: ${bus.current_passengers}/${bus.capacity}</p>
                    </div>
                    <span class="px-2 py-1 ${bus.current_passengers >= bus.capacity ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'} rounded text-xs font-medium">
                        ${bus.current_passengers >= bus.capacity ? 'FULL' : 'AVAILABLE'}
                    </span>
                </div>
                
                <div class="mb-4">
                    <div class="w-full bg-gray-800 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full" 
                             style="width: ${(bus.current_passengers / bus.capacity) * 100}%"></div>
                    </div>
                </div>
                
                <div class="flex space-x-2">
                    <button class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            onclick="viewBusAssignments(${bus.id})">
                        <i class='bx bx-group mr-1'></i> View
                    </button>
                    <button class="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                            onclick="editBus(${bus.id})">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                            onclick="deleteBus(${bus.id})">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading buses:', error);
        const busList = document.getElementById('bus-list');
        if (busList) {
            busList.innerHTML = `
                <div class="col-span-3 text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading buses</p>
                    <button onclick="loadBuses()" 
                            class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

async function loadEventsForBusFilter() {
    // This function is now handled by initBusEventFilter
    initBusEventFilter();
}

async function loadEventBusAssignments(eventId) {
    try {
        const container = document.getElementById('bus-assignments-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="flex items-center justify-center h-48">
                <div class="text-center">
                    <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
                    <p class="text-gray-400">Loading event bus assignments...</p>
                </div>
            </div>
        `;

        // Fetch event details and assignments in parallel
        const [eventResponse, assignmentsResponse] = await Promise.all([
            fetch(`/api/events/${eventId}`),
            fetch(`/api/events/${eventId}/bus-assignments`)
        ]);
        
        const event = await eventResponse.json();
        const assignments = await assignmentsResponse.json();
        
        if (assignments.length === 0) {
            const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBA';
            container.innerHTML = `
                <div class="text-center py-10 bg-gray-900/50 rounded-lg">
                    <i class='bx bx-bus text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400 text-lg font-medium mb-2">${event.title}</p>
                    <p class="text-gray-500 mb-4">${eventDate} • ${event.location || 'Location TBA'}</p>
                    <p class="text-gray-400">No bus assignments for this event yet</p>
                    <p class="text-gray-500 text-sm">Assign participants from the list below</p>
                </div>
            `;
            return;
        }
        
        // Group assignments by bus
        const assignmentsByBus = {};
        assignments.forEach(assignment => {
            const busId = assignment.bus_id;
            if (!assignmentsByBus[busId]) {
                assignmentsByBus[busId] = {
                    bus_id: busId,
                    bus_number: assignment.bus_number,
                    capacity: assignment.capacity,
                    assignments: []
                };
            }
            assignmentsByBus[busId].assignments.push(assignment);
        });
        
        // Show event info
const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBA';
container.innerHTML = `
    <div class="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
        <div class="flex flex-col">
            <h3 class="text-lg font-semibold text-white mb-1 truncate" title="${event.title}">
                ${event.title}
            </h3>
            <div class="flex flex-wrap gap-4 text-gray-400 text-sm">
                <span class="flex items-center">
                    <i class='bx bx-calendar mr-2'></i>${eventDate}
                </span>
                <span class="flex items-center">
                    <i class='bx bx-map mr-2'></i>${event.location || 'Location TBA'}
                </span>
                <span class="flex items-center">
                    <i class='bx bx-group mr-2'></i>${assignments.length} participants assigned
                </span>
            </div>
        </div>
    </div>
            
            <div class="space-y-6">
                ${Object.values(assignmentsByBus).map(bus => `
                    <div class="bg-black border border-gray-800 rounded-xl p-5 hover:border-blue-500/30 transition-colors">
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <h3 class="text-lg font-semibold text-white">Bus ${bus.bus_number}</h3>
                                <p class="text-gray-400 text-sm">Assigned: ${bus.assignments.length}/${bus.capacity}</p>
                            </div>
                            <span class="px-3 py-1 ${bus.assignments.length >= bus.capacity ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'} rounded-full text-sm font-medium">
                                ${bus.assignments.length >= bus.capacity ? 'FULL' : `${bus.capacity - bus.assignments.length} seats available`}
                            </span>
                        </div>
                        
                        <div class="space-y-3">
                            ${bus.assignments.map(assignment => `
                                <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex justify-between items-center">
                                    <div class="flex-1">
                                        <h4 class="text-white font-medium">${assignment.user_name}</h4>
                                        <p class="text-gray-400 text-sm">${assignment.student_number} • ${assignment.email}</p>
                                        <div class="flex items-center space-x-3 text-gray-500 text-xs mt-1">
                                            <span>
                                                <i class='bx bx-calendar'></i> 
                                                ${new Date(assignment.assignment_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        ${assignment.notes ? `
                                            <div class="mt-2 text-gray-400 text-xs">
                                                <i class='bx bx-note'></i> ${assignment.notes}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="flex space-x-2 ml-4">
                                        <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                                                onclick="openMoveBusModal(${assignment.id}, ${assignment.bus_id}, ${assignment.user_id}, '${assignment.user_name.replace(/'/g, "\\'")}', '${assignment.bus_number}')">
                                            <i class='bx bx-transfer mr-1'></i> Move
                                        </button>
                                        <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                                onclick="removeBusAssignment(${assignment.id}, '${assignment.user_name.replace(/'/g, "\\'")}')">
                                            <i class='bx bx-user-x mr-1'></i> Remove
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading event bus assignments:', error);
        const container = document.getElementById('bus-assignments-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading bus assignments</p>
                    <button onclick="loadEventBusAssignments(${eventId})" 
                            class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

async function loadEligibleParticipants(eventId) {
    try {
        const list = document.getElementById('eligible-participants-list');
        const section = document.getElementById('eligible-participants-section');
        if (!list || !section) return;
        
        list.innerHTML = `
            <div class="text-center py-8">
                <i class='bx bx-loader-circle bx-spin text-2xl text-blue-500 mb-2'></i>
                <p class="text-gray-400">Loading eligible participants...</p>
            </div>
        `;

        const response = await fetch(`/api/events/${eventId}/eligible-participants`);
        const participants = await response.json();
        
        if (participants.length === 0) {
            list.innerHTML = `
                <div class="text-center py-6 bg-gray-900/50 rounded-lg">
                    <i class='bx bx-check-circle text-2xl text-green-500 mb-2'></i>
                    <p class="text-gray-400">All approved participants have been assigned to buses!</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = participants.map(participant => `
            <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex justify-between items-center">
                <div>
                    <h4 class="text-white font-medium">${participant.name}</h4>
                    <p class="text-gray-400 text-sm">${participant.student_number} • ${participant.email}</p>
                    <p class="text-gray-500 text-xs mt-1">
                        Approved: ${new Date(participant.registration_date).toLocaleDateString()}
                    </p>
                </div>
                <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        onclick="openAssignBusModal(${participant.id}, ${eventId}, '${participant.name}', '${participant.student_number}', '${participant.email}')">
                    Assign to Bus
                </button>
            </div>
        `).join('');
        
        section.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading eligible participants:', error);
        const list = document.getElementById('eligible-participants-list');
        if (list) {
            list.innerHTML = `
                <div class="text-center py-6">
                    <i class='bx bx-error text-2xl text-red-500 mb-2'></i>
                    <p class="text-gray-400">Error loading participants</p>
                </div>
            `;
        }
    }
}

async function openAssignBusModal(userId, eventId, userName, studentNumber, userEmail) {
    try {
        console.log('Opening assign modal for:', { userId, eventId, userName });
        
        // First verify the user can be assigned
        console.log('Verifying assignment eligibility...');
        
        const verifyResponse = await fetch(`/api/debug/assignment/${userId}/${eventId}`);
        const verification = await verifyResponse.json();
        
        console.log('Verification result:', verification);
        
        if (!verification.summary.canAssign) {
            let errorMessage = `Cannot assign ${userName} to a bus:\n\n`;
            
            if (!verification.summary.userExists) {
                errorMessage += "• User does not exist\n";
            }
            if (!verification.summary.eventExists) {
                errorMessage += "• Event does not exist\n";
            }
            if (!verification.summary.hasApprovedRegistration) {
                errorMessage += "• User does not have approved registration for this event\n";
            }
            if (verification.summary.hasExistingAssignment) {
                const assignment = verification.checks.assignment.data;
                errorMessage += `• User is already assigned to Bus ${assignment.bus_number}\n`;
            }
            
            alert(errorMessage);
            return;
        }
        
        // Load available buses
        console.log('Loading available buses...');
        const response = await fetch('/api/buses');
        const buses = await response.json();
        
        const select = document.getElementById('assign-bus-select');
        select.innerHTML = '<option value="">Select a bus</option>';
        
        // Filter buses with available capacity
        const availableBuses = buses.filter(bus => {
            const available = bus.capacity - bus.current_passengers;
            console.log(`Bus ${bus.bus_number}: ${bus.current_passengers}/${bus.capacity} (${available} available)`);
            return available > 0;
        });
        
        console.log(`Found ${availableBuses.length} available buses`);
        
        if (availableBuses.length === 0) {
            select.innerHTML = '<option value="">No available buses</option>';
            select.disabled = true;
        } else {
            availableBuses.forEach(bus => {
                const option = document.createElement('option');
                option.value = bus.id;
                const available = bus.capacity - bus.current_passengers;
                option.textContent = `${bus.bus_number} (${available} seats available)`;
                select.appendChild(option);
            });
            select.disabled = false;
        }
        
        // Set participant info
        document.getElementById('assign-user-id').value = userId;
        document.getElementById('assign-event-id').value = eventId;
        
        const infoDiv = document.getElementById('assign-participant-info');
        infoDiv.innerHTML = `
            <div class="flex items-center mb-2">
                <i class='bx bx-user-circle text-blue-400 text-xl mr-3'></i>
                <div>
                    <p class="text-white font-medium">${userName}</p>
                    <p class="text-gray-400 text-sm">${studentNumber} • ${userEmail}</p>
                    <p class="text-gray-500 text-xs mt-1">✅ Verified eligible</p>
                </div>
            </div>
        `;
        
        // Show capacity info when bus is selected
        const capacityInfo = document.getElementById('bus-capacity-info');
        select.addEventListener('change', function() {
            const selectedBus = buses.find(bus => bus.id == this.value);
            if (selectedBus) {
                const available = selectedBus.capacity - selectedBus.current_passengers;
                capacityInfo.innerHTML = `
                    <div class="mt-2 p-2 bg-blue-900/20 border border-blue-800 rounded text-sm">
                        <p class="text-blue-300">Capacity: ${selectedBus.current_passengers}/${selectedBus.capacity}</p>
                        <p class="text-green-300">Available: ${available} seats</p>
                    </div>
                `;
            } else {
                capacityInfo.textContent = '';
            }
        });
        
        // Show modal
        document.getElementById('assign-bus-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error opening assign bus modal:', error);
        alert('Error: ' + error.message + '\n\nCheck console for details.');
    }
}

async function openMoveBusModal(assignmentId, currentBusId, userId, userName, currentBusNumber) {
    try {
        // Load all buses except current one
        const response = await fetch('/api/buses');
        const buses = await response.json();
        
        const select = document.getElementById('move-bus-select');
        select.innerHTML = '<option value="">Select a new bus</option>';
        
        buses.forEach(bus => {
            if (bus.id != currentBusId) {
                const option = document.createElement('option');
                option.value = bus.id;
                const available = bus.capacity - bus.current_passengers;
                option.textContent = `${bus.bus_number} (${available} seats available)`;
                select.appendChild(option);
            }
        });
        
        // Set form data
        document.getElementById('move-assignment-id').value = assignmentId;
        document.getElementById('move-current-bus-id').value = currentBusId;
        
        const infoDiv = document.getElementById('move-participant-info');
        infoDiv.innerHTML = `
            <p class="text-white font-medium">${userName}</p>
            <p class="text-gray-400 text-sm">Currently on: ${currentBusNumber}</p>
        `;
        
        // Show modal
        document.getElementById('move-bus-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error opening move bus modal:', error);
        alert('Error loading bus information');
    }
}

async function addBus(busData) {
    try {
        const response = await fetch('/api/buses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(busData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Bus added successfully!');
            document.getElementById('add-bus-form').reset();
            document.getElementById('add-bus-modal').classList.add('hidden');
            loadBuses();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding bus:', error);
        alert('Error adding bus: ' + error.message);
    }
}

async function assignToBus(assignmentData) {
    try {
        // Validate bus selection
        if (!assignmentData.bus_id) {
            alert('Please select a bus');
            return;
        }
        
        console.log('Sending assignment to simple endpoint:', assignmentData);
        
        const response = await fetch('/api/bus-assignments-simple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assignmentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Participant assigned to bus successfully!');
            document.getElementById('assign-bus-form').reset();
            document.getElementById('assign-bus-modal').classList.add('hidden');
            
            // Refresh data
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
                loadEligibleParticipants(eventId);
            }
            loadBuses();
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error assigning to bus:', error);
        alert('❌ Error assigning to bus: ' + error.message);
    }
}

async function moveBusAssignment(assignmentId, newBusId, reason) {
    try {
        const response = await fetch(`/api/bus-assignments/${assignmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_bus_id: newBusId, notes: reason })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Participant moved to new bus successfully!');
            document.getElementById('move-bus-form').reset();
            document.getElementById('move-bus-modal').classList.add('hidden');
            
            // Refresh assignments
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
            }
            
            loadBuses(); // Refresh bus list
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error moving bus assignment:', error);
        alert('Error moving bus assignment: ' + error.message);
    }
}

async function removeBusAssignment(assignmentId, userName) {
    if (!confirm(`Are you sure you want to remove ${userName} from their bus assignment?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bus-assignments/${assignmentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Bus assignment removed successfully!');
            
            // Refresh assignments and eligible participants
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
                loadEligibleParticipants(eventId);
            }
            
            loadBuses(); // Refresh bus list
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error removing bus assignment:', error);
        alert('Error removing bus assignment: ' + error.message);
    }
}

async function viewBusAssignments(busId) {
    try {
        const response = await fetch(`/api/buses/${busId}/assignments`);
        const assignments = await response.json();
        
        if (assignments.length === 0) {
            alert('No assignments for this bus yet.');
            return;
        }
        
        let message = `Bus Assignments:\n\n`;
        assignments.forEach((assignment, index) => {
            message += `${index + 1}. ${assignment.user_name} (${assignment.student_number})\n`;
            message += `   Event: ${assignment.event_title}\n`;
            message += `   Date: ${new Date(assignment.event_date).toLocaleDateString()}\n`;
            message += `   Assigned: ${new Date(assignment.assignment_date).toLocaleDateString()}\n\n`;
        });
        
        alert(message);
    } catch (error) {
        console.error('Error viewing bus assignments:', error);
        alert('Error loading bus assignments');
    }
}

async function editBus(busId) {
    try {
        const response = await fetch(`/api/buses/${busId}`);
        const bus = await response.json();
        
        const newBusNumber = prompt('Enter new bus number:', bus.bus_number);
        if (!newBusNumber) return;
        
        const newCapacity = prompt('Enter new capacity:', bus.capacity);
        if (!newCapacity) return;
        
        const capacityNum = parseInt(newCapacity);
        if (isNaN(capacityNum) || capacityNum <= 0) {
            alert('Please enter a valid capacity number greater than 0');
            return;
        }
        
        if (capacityNum < bus.current_passengers) {
            alert(`Cannot set capacity lower than current passengers (${bus.current_passengers})`);
            return;
        }
        
        const updateResponse = await fetch(`/api/buses/${busId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bus_number: newBusNumber, capacity: capacityNum })
        });
        
        const result = await updateResponse.json();
        
        if (result.success) {
            alert('Bus updated successfully!');
            loadBuses();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error editing bus:', error);
        alert('Error editing bus: ' + error.message);
    }
}

async function deleteBus(busId) {
    if (!confirm('Are you sure you want to delete this bus? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/buses/${busId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Bus deleted successfully!');
            loadBuses();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting bus:', error);
        alert('Error deleting bus: ' + error.message);
    }
}

// Load all buses
async function loadBuses() {
    try {
        const busList = document.getElementById('bus-list');
        if (!busList) return;
        
        busList.innerHTML = `
            <div class="col-span-3 flex items-center justify-center h-48">
                <div class="text-center">
                    <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
                    <p class="text-gray-400">Loading buses...</p>
                </div>
            </div>
        `;

        const response = await fetch('/api/buses');
        const buses = await response.json();
        
        if (buses.length === 0) {
            busList.innerHTML = `
                <div class="col-span-3 text-center py-10">
                    <i class='bx bx-bus text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No buses added yet</p>
                    <button id="add-first-bus" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        Add Your First Bus
                    </button>
                </div>
            `;
            
            document.getElementById('add-first-bus')?.addEventListener('click', () => {
                document.getElementById('add-bus-modal').classList.remove('hidden');
            });
            
            return;
        }
        
        busList.innerHTML = buses.map(bus => `
            <div class="bg-black border border-gray-800 rounded-xl p-5 hover:border-blue-500/30 transition-colors">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-white">${bus.bus_number}</h3>
                        <p class="text-gray-400 text-sm">Capacity: ${bus.current_passengers}/${bus.capacity}</p>
                        <p class="text-gray-500 text-xs mt-1">ID: ${bus.id}</p>
                    </div>
                    <span class="px-2 py-1 ${bus.current_passengers >= bus.capacity ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'} rounded text-xs font-medium">
                        ${bus.current_passengers >= bus.capacity ? 'FULL' : 'AVAILABLE'}
                    </span>
                </div>
                
                <div class="mb-4">
                    <div class="w-full bg-gray-800 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full" 
                             style="width: ${(bus.current_passengers / bus.capacity) * 100}%"></div>
                    </div>
                </div>
                
                <div class="flex space-x-2">
                    <button class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            onclick="viewBusDetails(${bus.id})">
                        <i class='bx bx-group mr-1'></i> View Details
                    </button>
                    <button class="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                            onclick="editBus(${bus.id})">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                            onclick="deleteBus(${bus.id})">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading buses:', error);
        const busList = document.getElementById('bus-list');
        if (busList) {
            busList.innerHTML = `
                <div class="col-span-3 text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading buses</p>
                    <button onclick="loadBuses()" 
                            class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Add new bus
async function addBus(busData) {
    try {
        const response = await fetch('/api/buses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(busData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Bus added successfully!');
            document.getElementById('add-bus-form').reset();
            document.getElementById('add-bus-modal').classList.add('hidden');
            loadBuses();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding bus:', error);
        alert('Error adding bus: ' + error.message);
    }
}

// Edit existing bus
async function editBus(busId) {
    try {
        // Fetch current bus details
        const response = await fetch(`/api/buses/${busId}`);
        const bus = await response.json();
        
        // Create a modal for editing
        const newBusNumber = prompt('Enter new bus number:', bus.bus_number);
        if (!newBusNumber || newBusNumber.trim() === '') {
            alert('Bus number cannot be empty');
            return;
        }
        
        const newCapacity = prompt('Enter new capacity:', bus.capacity);
        if (!newCapacity) return;
        
        const capacityNum = parseInt(newCapacity);
        if (isNaN(capacityNum) || capacityNum <= 0) {
            alert('Please enter a valid capacity number greater than 0');
            return;
        }
        
        if (capacityNum < bus.current_passengers) {
            alert(`Cannot set capacity lower than current passengers (${bus.current_passengers})`);
            return;
        }
        
        if (!confirm(`Change bus ${bus.bus_number} to ${newBusNumber} with capacity ${capacityNum}?`)) {
            return;
        }
        
        const updateResponse = await fetch(`/api/buses/${busId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                bus_number: newBusNumber, 
                capacity: capacityNum 
            })
        });
        
        const result = await updateResponse.json();
        
        if (result.success) {
            alert('Bus updated successfully!');
            loadBuses();
            
            // Refresh bus assignments if viewing an event
            const eventFilter = document.getElementById('bus-event-filter');
            if (eventFilter && eventFilter.value) {
                loadEventBusAssignments(eventFilter.value);
            }
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error editing bus:', error);
        alert('Error editing bus: ' + error.message);
    }
}

// Delete bus
async function deleteBus(busId) {
    if (!confirm('Are you sure you want to delete this bus? This will remove all assignments to this bus.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/buses/${busId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Bus deleted successfully!');
            loadBuses();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting bus:', error);
        alert('Error deleting bus: ' + error.message);
    }
}

// Load events for bus filter dropdown
async function loadEventsForBusFilter() {
    try {
        const eventFilter = document.getElementById('bus-event-filter');
        if (!eventFilter) return;
        
        const response = await fetch('/api/events');
        const events = await response.json();
        
        // Clear existing options except first
        eventFilter.innerHTML = '<option value="">Select Event</option>';
        
        // Filter for active events
        const activeEvents = events.filter(event => 
            event.status === 'active' || event.status === 'upcoming'
        );
        
        activeEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.title} (${new Date(event.date).toLocaleDateString()})`;
            eventFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading events for filter:', error);
    }
}

// Load bus assignments for a specific event
async function loadEventBusAssignments(eventId) {
    try {
        const container = document.getElementById('bus-assignments-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="flex items-center justify-center h-48">
                <div class="text-center">
                    <i class='bx bx-loader-circle bx-spin text-4xl text-blue-500 mb-2'></i>
                    <p class="text-gray-400">Loading bus assignments...</p>
                </div>
            </div>
        `;

        const response = await fetch(`/api/events/${eventId}/bus-assignments`);
        const assignments = await response.json();
        
        if (assignments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 bg-gray-900/50 rounded-lg">
                    <i class='bx bx-bus text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No bus assignments for this event yet</p>
                    <p class="text-gray-500 text-sm">Assign participants from the list below</p>
                </div>
            `;
            return;
        }
        
        // Group assignments by bus
        const assignmentsByBus = {};
        assignments.forEach(assignment => {
            const busId = assignment.bus_id;
            if (!assignmentsByBus[busId]) {
                assignmentsByBus[busId] = {
                    bus_id: busId,
                    bus_number: assignment.bus_number,
                    capacity: assignment.capacity,
                    assignments: []
                };
            }
            assignmentsByBus[busId].assignments.push(assignment);
        });
        
        container.innerHTML = Object.values(assignmentsByBus).map(bus => `
            <div class="bg-black border border-gray-800 rounded-xl p-5 mb-4">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-white">${bus.bus_number}</h3>
                        <p class="text-gray-400 text-sm">Capacity: ${bus.assignments.length}/${bus.capacity}</p>
                    </div>
                    <span class="px-3 py-1 ${bus.assignments.length >= bus.capacity ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-green-900/30 text-green-400 border-green-800'} rounded-full text-sm font-medium">
                        ${bus.assignments.length >= bus.capacity ? 'FULL' : 'AVAILABLE'}
                    </span>
                </div>
                
                <div class="space-y-3">
                    ${bus.assignments.map(assignment => `
                        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex justify-between items-center">
                            <div class="flex-1">
                                <h4 class="text-white font-medium">${assignment.user_name}</h4>
                                <p class="text-gray-400 text-sm">${assignment.student_number} • ${assignment.email}</p>
                                <div class="flex items-center space-x-3 text-gray-500 text-xs mt-1">
                                    <span>
                                        <i class='bx bx-calendar'></i> 
                                        ${new Date(assignment.assignment_date).toLocaleDateString()}
                                    </span>
                                    <span>
                                        <i class='bx bx-time'></i> 
                                        ${new Date(assignment.assignment_date).toLocaleTimeString()}
                                    </span>
                                </div>
                                ${assignment.notes ? `
                                    <div class="mt-2 text-gray-400 text-xs">
                                        <i class='bx bx-note'></i> ${assignment.notes}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="flex space-x-2 ml-4">
                                <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                                        onclick="openMoveBusModal(${assignment.id}, ${assignment.bus_id}, ${assignment.user_id}, '${assignment.user_name.replace(/'/g, "\\'")}', '${assignment.bus_number}')">
                                    <i class='bx bx-transfer mr-1'></i> Move
                                </button>
                                <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                        onclick="removeBusAssignment(${assignment.id}, '${assignment.user_name.replace(/'/g, "\\'")}')">
                                    <i class='bx bx-user-x mr-1'></i> Remove
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading event bus assignments:', error);
        const container = document.getElementById('bus-assignments-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-error text-4xl text-red-500 mb-3'></i>
                    <p class="text-gray-400">Error loading bus assignments</p>
                    <button onclick="loadEventBusAssignments(${eventId})" 
                            class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Load eligible participants (approved but not assigned)
async function loadEligibleParticipants(eventId) {
    try {
        console.log(`Loading eligible participants for event ${eventId}...`);
        
        const list = document.getElementById('eligible-participants-list');
        const section = document.getElementById('eligible-participants-section');
        
        if (!list || !section) return;
        
        list.innerHTML = `
            <div class="text-center py-8">
                <i class='bx bx-loader-circle bx-spin text-2xl text-blue-500 mb-2'></i>
                <p class="text-gray-400">Loading eligible participants...</p>
            </div>
        `;

        // Load participants
        const response = await fetch(`/api/events/${eventId}/eligible-participants`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const participants = await response.json();
        
        console.log(`Received ${participants.length} participants from server`);
        
        if (participants.length === 0) {
            list.innerHTML = `
                <div class="text-center py-6 bg-gray-900/50 rounded-lg">
                    <i class='bx bx-check-circle text-2xl text-green-500 mb-2'></i>
                    <p class="text-gray-400">All approved participants have been assigned to buses!</p>
                    <p class="text-gray-500 text-sm mt-1">No eligible participants remaining.</p>
                    <button onclick="refreshEligibleList()" 
                            class="mt-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors">
                        <i class='bx bx-refresh mr-1'></i> Refresh List
                    </button>
                </div>
            `;
            return;
        }
        
        // Render participants
        list.innerHTML = participants.map(participant => {
            // Safety check: Log each participant
            console.log(`Rendering participant: ${participant.name} (ID: ${participant.id})`);
            
            return `
                <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex justify-between items-center hover:bg-gray-800/50 transition-colors mb-3">
                    <div class="flex-1">
                        <h4 class="text-white font-medium">${participant.name}</h4>
                        <p class="text-gray-400 text-sm">${participant.student_number} • ${participant.email}</p>
                        <div class="flex items-center mt-2">
                            <span class="inline-block px-2 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded text-xs mr-2">
                                Approved
                            </span>
                            <span class="text-gray-500 text-xs">
                                <i class='bx bx-calendar mr-1'></i>
                                ${new Date(participant.registration_date).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                            onclick="openAssignBusModal(${participant.id}, ${eventId}, '${participant.name.replace(/'/g, "\\'")}', '${participant.student_number}', '${participant.email.replace(/'/g, "\\'")}')">
                        <i class='bx bx-bus mr-1'></i> Assign to Bus
                    </button>
                </div>
            `;
        }).join('');
        
        // Add refresh button at bottom
        list.innerHTML += `
            <div class="text-center mt-4">
                <button onclick="refreshEligibleList()" 
                        class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <i class='bx bx-refresh mr-2'></i> Refresh List
                </button>
            </div>
        `;
        
        section.classList.remove('hidden');
        console.log('Eligible participants list rendered successfully');
        
    } catch (error) {
        console.error('❌ Error loading eligible participants:', error);
        const list = document.getElementById('eligible-participants-list');
        if (list) {
            list.innerHTML = `
                <div class="text-center py-6">
                    <i class='bx bx-error text-2xl text-red-500 mb-2'></i>
                    <p class="text-gray-400">Error loading participants</p>
                    <p class="text-gray-500 text-sm mb-3">${error.message}</p>
                    <button onclick="loadEligibleParticipants(${eventId})" 
                            class="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Add refresh function
function refreshEligibleList() {
    const eventId = document.getElementById('bus-event-filter').value;
    if (eventId) {
        console.log('Refreshing eligible list for event:', eventId);
        loadEligibleParticipants(eventId);
    }
}

// Open modal to assign participant to bus
async function openAssignBusModal(userId, eventId, userName, studentNumber, userEmail) {
    try {
        console.log('Opening assign modal for:', { userId, eventId, userName });
        
        // First check if user already has a bus assignment for this event
        try {
            const checkResponse = await fetch(`/api/events/${eventId}/bus-assignments`);
            const assignments = await checkResponse.json();
            
            const existingAssignment = assignments.find(assignment => 
                assignment.user_id == userId
            );
            
            if (existingAssignment) {
                alert(`⚠️ ${userName} is already assigned to Bus ${existingAssignment.bus_number}.\n\nUse the "Move" option instead.`);
                return;
            }
        } catch (checkError) {
            console.warn('Could not check existing assignments:', checkError);
        }
        
        // Load available buses
        const response = await fetch('/api/buses');
        const buses = await response.json();
        
        const select = document.getElementById('assign-bus-select');
        select.innerHTML = '<option value="">Select a bus</option>';
        
        // Filter buses with available capacity
        const availableBuses = buses.filter(bus => bus.current_passengers < bus.capacity);
        
        if (availableBuses.length === 0) {
            select.innerHTML = '<option value="">No available buses</option>';
            select.disabled = true;
        } else {
            availableBuses.forEach(bus => {
                const option = document.createElement('option');
                option.value = bus.id;
                const available = bus.capacity - bus.current_passengers;
                option.textContent = `${bus.bus_number} (${available} seats available)`;
                select.appendChild(option);
            });
            select.disabled = false;
        }
        
        // Set participant info
        document.getElementById('assign-user-id').value = userId;
        document.getElementById('assign-event-id').value = eventId;
        
        const infoDiv = document.getElementById('assign-participant-info');
        infoDiv.innerHTML = `
            <div class="flex items-center mb-2">
                <i class='bx bx-user-circle text-blue-400 text-xl mr-3'></i>
                <div>
                    <p class="text-white font-medium">${userName}</p>
                    <p class="text-gray-400 text-sm">${studentNumber} • ${userEmail}</p>
                </div>
            </div>
        `;
        
        // Show modal
        document.getElementById('assign-bus-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error opening assign bus modal:', error);
        alert('Error loading bus information: ' + error.message);
    }
}

// Open modal to move participant to different bus
async function openMoveBusModal(assignmentId, currentBusId, userId, userName, currentBusNumber) {
    try {
        // Load all buses except current one
        const response = await fetch('/api/buses');
        const buses = await response.json();
        
        const select = document.getElementById('move-bus-select');
        select.innerHTML = '<option value="">Select a new bus</option>';
        
        // Filter buses with available capacity (excluding current bus)
        const availableBuses = buses.filter(bus => 
            bus.id != currentBusId && bus.current_passengers < bus.capacity
        );
        
        if (availableBuses.length === 0) {
            select.innerHTML = '<option value="">No available buses</option>';
            select.disabled = true;
        } else {
            availableBuses.forEach(bus => {
                const option = document.createElement('option');
                option.value = bus.id;
                const available = bus.capacity - bus.current_passengers;
                option.textContent = `${bus.bus_number} (${available} seats available)`;
                select.appendChild(option);
            });
            select.disabled = false;
        }
        
        // Set form data
        document.getElementById('move-assignment-id').value = assignmentId;
        document.getElementById('move-current-bus-id').value = currentBusId;
        
        const infoDiv = document.getElementById('move-participant-info');
        infoDiv.innerHTML = `
            <div class="flex items-center">
                <i class='bx bx-user-circle text-yellow-400 text-xl mr-3'></i>
                <div>
                    <p class="text-white font-medium">${userName}</p>
                    <p class="text-gray-400 text-sm">Currently on: ${currentBusNumber}</p>
                </div>
            </div>
        `;
        
        // Reset form
        document.getElementById('move-reason').value = '';
        
        // Show modal
        document.getElementById('move-bus-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error opening move bus modal:', error);
        alert('Error loading bus information: ' + error.message);
    }
}

// Assign participant to bus
async function assignToBus(assignmentData) {
    try {
        // Validate bus selection
        if (!assignmentData.bus_id) {
            alert('Please select a bus');
            return;
        }
        
        const response = await fetch('/api/bus-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assignmentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Participant assigned to bus successfully!');
            document.getElementById('assign-bus-form').reset();
            document.getElementById('assign-bus-modal').classList.add('hidden');
            
            // Refresh data
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
                loadEligibleParticipants(eventId);
            }
            loadBuses();
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error assigning to bus:', error);
        alert('❌ Error assigning to bus: ' + error.message);
    }
}

// Move participant to different bus
async function moveBusAssignment(assignmentId, newBusId, reason) {
    try {
        console.log('Moving assignment:', { assignmentId, newBusId, reason });
        
        // Validate bus selection
        if (!newBusId) {
            alert('Please select a new bus');
            return;
        }
        
        // Validate assignmentId is a number
        const assignmentIdNum = parseInt(assignmentId);
        const newBusIdNum = parseInt(newBusId);
        
        if (isNaN(assignmentIdNum) || isNaN(newBusIdNum)) {
            alert('Invalid assignment or bus ID');
            return;
        }
        
        const payload = { 
            new_bus_id: newBusIdNum, 
            notes: reason ? `Moved: ${reason}` : 'Moved to different bus' 
        };
        
        console.log('Sending move request to:', `/api/bus-assignments/${assignmentIdNum}`);
        console.log('Payload:', payload);
        
        // Try to call the API
        let response;
        try {
            response = await fetch(`/api/bus-assignments/${assignmentIdNum}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            throw new Error(`Network error: ${fetchError.message}. Please check if the server is running.`);
        }
        
        console.log('Response status:', response.status, response.statusText);
        
        // Check if we got a response
        if (!response.ok) {
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;
            
            try {
                const errorText = await response.text();
                console.error('Error response text:', errorText);
                
                // Try to parse as JSON
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorJson.message || errorMessage;
                } catch {
                    // If not JSON, use the text
                    errorMessage = errorText || errorMessage;
                }
            } catch (textError) {
                console.error('Could not read error response:', textError);
            }
            
            throw new Error(errorMessage);
        }
        
        // Try to parse successful response
        let result;
        try {
            const responseText = await response.text();
            console.log('Response text:', responseText);
            
            if (responseText) {
                result = JSON.parse(responseText);
            } else {
                result = { success: true }; // Empty response treated as success
            }
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            throw new Error('Server returned invalid JSON response');
        }
        
        if (result.success) {
            alert('✅ Participant moved to new bus successfully!');
            document.getElementById('move-bus-form').reset();
            document.getElementById('move-bus-modal').classList.add('hidden');
            
            // Refresh data
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
            }
            loadBuses();
        } else {
            throw new Error(result.error || 'Unknown error from server');
        }
    } catch (error) {
        console.error('Error moving bus assignment:', error);
        
        // Show detailed error message
        let userMessage = error.message;
        
        // Provide more helpful messages based on error type
        if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
            userMessage = `Cannot connect to server. Please check:\n
1. Is your backend server running?\n
2. Check browser console for CORS errors\n
3. Try refreshing the page`;
        } else if (error.message.includes('404')) {
            userMessage = 'API endpoint not found. The server may be misconfigured.';
        } else if (error.message.includes('500')) {
            userMessage = 'Server internal error. Check backend logs for details.';
        }
        
        alert(`❌ Error moving bus assignment:\n\n${userMessage}`);
    }
}

// Remove bus assignment
async function removeBusAssignment(assignmentId, userName) {
    if (!confirm(`Are you sure you want to remove ${userName} from their bus assignment?\n\nThis will free up their seat on the bus.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bus-assignments/${assignmentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Bus assignment removed successfully!');
            
            // Refresh data
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
                loadEligibleParticipants(eventId);
            }
            loadBuses();
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error removing bus assignment:', error);
        alert('❌ Error removing bus assignment: ' + error.message);
    }
}

// View bus details and assignments
async function viewBusDetails(busId) {
    try {
        const [busResponse, assignmentsResponse] = await Promise.all([
            fetch(`/api/buses/${busId}`),
            fetch(`/api/buses/${busId}/assignments`)
        ]);
        
        const bus = await busResponse.json();
        const assignments = await assignmentsResponse.json();
        
        let message = `🚌 **Bus ${bus.bus_number}**\n`;
        message += `Capacity: ${bus.current_passengers}/${bus.capacity}\n`;
        message += `Availability: ${bus.capacity - bus.current_passengers} seats\n\n`;
        
        if (assignments.length > 0) {
            message += `**Current Assignments (${assignments.length}):**\n\n`;
            assignments.forEach((assignment, index) => {
                message += `${index + 1}. **${assignment.user_name}**\n`;
                message += `   Student #: ${assignment.student_number}\n`;
                message += `   Email: ${assignment.email}\n`;
                message += `   Event: ${assignment.event_title}\n`;
                message += `   Assigned: ${new Date(assignment.assignment_date).toLocaleString()}\n`;
                if (assignment.notes) {
                    message += `   Notes: ${assignment.notes}\n`;
                }
                message += `\n`;
            });
        } else {
            message += `No assignments for this bus.\n`;
        }
        
        alert(message);
    } catch (error) {
        console.error('Error viewing bus details:', error);
        alert('Error loading bus details: ' + error.message);
    }
}

// Initialize modal event listeners
function initializeModalListeners() {
    // Add Bus Modal
    const addBusForm = document.getElementById('add-bus-form');
    if (addBusForm) {
        addBusForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const busData = {
                bus_number: document.getElementById('bus-number').value.trim(),
                capacity: parseInt(document.getElementById('bus-capacity').value)
            };
            
            if (!busData.bus_number) {
                alert('Please enter a bus number');
                return;
            }
            
            if (isNaN(busData.capacity) || busData.capacity < 1) {
                alert('Please enter a valid capacity (minimum 1)');
                return;
            }
            
            addBus(busData);
        });
    }
    
    // Assign Bus Modal
    const assignBusForm = document.getElementById('assign-bus-form');
    if (assignBusForm) {
        assignBusForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const assignmentData = {
                user_id: parseInt(document.getElementById('assign-user-id').value),
                event_id: parseInt(document.getElementById('assign-event-id').value),
                bus_id: parseInt(document.getElementById('assign-bus-select').value),
                notes: document.getElementById('assign-notes').value.trim()
            };
            
            assignToBus(assignmentData);
        });
    }
    
    // Move Bus Modal
    const moveBusForm = document.getElementById('move-bus-form');
    if (moveBusForm) {
        moveBusForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const assignmentId = parseInt(document.getElementById('move-assignment-id').value);
            const newBusId = parseInt(document.getElementById('move-bus-select').value);
            const reason = document.getElementById('move-reason').value.trim();
            
            moveBusAssignment(assignmentId, newBusId, reason);
        });
    }
    
    // Modal close buttons
    const closeButtons = [
        ['close-add-bus-modal', 'add-bus-modal'],
        ['cancel-add-bus', 'add-bus-modal'],
        ['close-assign-bus-modal', 'assign-bus-modal'],
        ['cancel-assign-bus', 'assign-bus-modal'],
        ['close-move-bus-modal', 'move-bus-modal'],
        ['cancel-move-bus', 'move-bus-modal']
    ];
    
    closeButtons.forEach(([buttonId, modalId]) => {
        const button = document.getElementById(buttonId);
        const modal = document.getElementById(modalId);
        if (button && modal) {
            button.addEventListener('click', () => modal.classList.add('hidden'));
        }
    });
    
    // Close modals when clicking outside
    const modals = ['add-bus-modal', 'assign-bus-modal', 'move-bus-modal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }
    });
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}