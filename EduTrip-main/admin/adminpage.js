let currentUser = null;
let editingEventId = null;
let busFilterInitialized = false; // Track if bus filter is already initialized

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
        
        // Create date in local timezone without shifting
        // MM/DD/YYYY format
        return `${month}/${day}/${year}`;
    }
    
    return dateString;
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
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
    initializeDashboardRefreshButton();
    initParticipantsFilters();
    initializeModalListeners();
    initializeEditBusForm();
    initAnnouncementForm();
    initAnnouncementFeatures();
    initCertificatePage();
    
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

    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', loadRegistrationRequests);
    }

    // Event filter
    const eventFilter = document.getElementById('event-filter');
    if (eventFilter) {
        eventFilter.addEventListener('change', loadRegistrationRequests);
    }

    // Search input
    const requestsSearch = document.getElementById('requests-search');
    if (requestsSearch) {
        let searchTimeout;
        requestsSearch.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => loadRegistrationRequests(), 300);
        });
    }

    navLinks.forEach(link => link.classList.remove('active', 'bg-blue-600'));
    // Set dashboard as active
    const dashboardLink = document.querySelector('[data-page="dashboard"]');
    if (dashboardLink) dashboardLink.classList.add('active', 'bg-blue-600');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            navLinks.forEach(l => l.classList.remove('active', 'bg-blue-600'));
            pages.forEach(page => page.classList.add('hidden'));

            link.classList.add('active', 'bg-blue-600');

            // Show corresponding page
            const pageId = link.getAttribute('data-page');
            const targetPage = document.getElementById(pageId === 'participants' ? 'participants-page' : pageId);
            if (targetPage) {
                targetPage.classList.remove('hidden');

                // Load data based on page
                switch (pageId) {
                    case 'requests':
                        loadEventsForRequestFilter();
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
                    case 'announcement':
                        loadAnnouncements();
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
    createEventForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const eventData = new FormData();
        
        const titleEl = document.getElementById('event-title');
        const descEl = document.getElementById('event-description');
        const dateEl = document.getElementById('event-date');
        const locationEl = document.getElementById('event-location');
        const courseEl = document.getElementById('event-course');
        const targetYearEl = document.getElementById('event-target-year');
        const imageEl = document.getElementById('event-image');
        const urlEl = document.getElementById('event-url');
        
        if (!titleEl || !descEl || !dateEl || !locationEl || !courseEl) {
            showError('Error: Form fields are missing. Please refresh the page.');
            return;
        }
        
        const selectedDate = dateEl.value;
        
        eventData.append('title', titleEl.value);
        eventData.append('description', descEl.value);
        eventData.append('date', selectedDate);
        eventData.append('location', locationEl.value);
        eventData.append('course', courseEl.value);
        eventData.append('target_year', targetYearEl.value);
        
        if (urlEl && urlEl.value.trim()) {
            eventData.append('external_url', urlEl.value.trim());
        }

        if (imageEl?.files?.[0]) {
            eventData.append('image', imageEl.files[0]);
        }

        createEvent(eventData);
    });
}

    // Handle edit event form submission
    const editEventForm = document.getElementById('edit-event-form');
    if (editEventForm) {
        editEventForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const eventData = {
                title: document.getElementById('edit-event-title').value,
                description: document.getElementById('edit-event-description').value,
                date: document.getElementById('edit-event-date').value,
                location: document.getElementById('edit-event-location').value,
                course: document.getElementById('edit-event-course').value,
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

        initializeAutoAssignButton();
    
    // Add sort filter listener
    const sortFilter = document.getElementById('participants-sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', loadParticipants);
    }
}

// Update the updateDashboardStats function to handle spinner animation
async function updateDashboardStats() {
    try {
        console.log('Updating dashboard stats...');

        // Get the refresh button
        const refreshBtn = document.getElementById('refresh-dashboard-btn');
        const refreshIcon = refreshBtn?.querySelector('i.bx-refresh');

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

function initializeDashboardRefreshButton() {
    const refreshBtn = document.getElementById('refresh-dashboard-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function (e) {
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

// Update the loadRegistrationRequests function to refresh dashboard stats when requests are updated
async function updateRequestStatus(requestId, status) {
    const confirmed = await showConfirm({
        title: `${status.charAt(0).toUpperCase() + status.slice(1)} Request`,
        message: `Are you sure you want to ${status} this registration request?`,
        type: status === 'rejected' ? 'error' : 'info',
        confirmText: `Yes, ${status}`,
        cancelText: 'Cancel'
    });
    if (!confirmed) return;

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
            showSuccess('Request status updated successfully!');
            loadRegistrationRequests();
            updateDashboardStats(); // Refresh dashboard stats
        } else {
            showError('Error updating request status: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating request status:', error);
        showError('Error updating request status: ' + error.message);
    }
}

// Update the deleteEvent function
async function deleteEvent(eventId) {
    const confirmed = await showConfirm({
        title: 'Delete Event',
        message: 'Are you sure you want to delete this event? This action cannot be undone.',
        type: 'error',
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel'
    });
    
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Event deleted successfully!');
            loadAdminEvents();
            updateDashboardStats(); // Refresh dashboard after deleting event
        } else {
            showError('Error deleting event: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        showError('Error deleting event: ' + error.message);
    }
}

// Update the assignToBus function to refresh dashboard
async function assignToBus(assignmentData) {
    try {
        // Validate bus selection
        if (!assignmentData.bus_id) {
            showAlert('Please select a bus');
            return;
        }

        const response = await fetch('/api/bus-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assignmentData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('✅ Participant assigned to bus successfully!');
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
            showError('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error assigning to bus:', error);
        showError('❌ Error assigning to bus: ' + error.message);
    }
}

// Remove bus assignment
async function removeBusAssignment(assignmentId, userName) {
    const confirmed = await showConfirm({
        title: 'Remove Bus Assignment',
        message: `Are you sure you want to remove ${userName} from their bus assignment?\n\nThis will free up their seat on the bus and they will need to be reassigned.`,
        type: 'warning',
        confirmText: 'Yes, Remove',
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/bus-assignments/${assignmentId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(`✅ ${userName} has been removed from the bus assignment!`, 'Assignment Removed');

            // Refresh data
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
                loadEligibleParticipants(eventId);
            }
            loadBuses();
        } else {
            showError('❌ Error: ' + (result.error || 'Failed to remove assignment'), 'Error');
        }
    } catch (error) {
        console.error('Error removing bus assignment:', error);
        showError('❌ Error removing bus assignment: ' + error.message, 'Error');
    }
}

function startDashboardAutoRefresh() {
    // Update stats immediately
    updateDashboardStats();

    // Update every 30 seconds
    setInterval(updateDashboardStats, 30000);
}
// Event Management Functions
let allEvents = []; // Store all events for filtering

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

        // Add ?all=true to get ALL events including hidden ones
        const response = await fetch('/api/events?all=true');
        allEvents = await response.json();
        console.log('📊 Loaded events:', allEvents.length);

        // Set up filter listener
        const filterSelect = document.getElementById('admin-events-course-filter');
        if (filterSelect) {
            const newFilter = filterSelect.cloneNode(true);
            filterSelect.parentNode.replaceChild(newFilter, filterSelect);
            
            newFilter.addEventListener('change', (e) => {
                filterEventsByCourse(e.target.value);
            });
        }

        // Initial render
        filterEventsByCourse('ALL');

    } catch (error) {
        console.error('Error loading events:', error);
        const eventsList = document.getElementById('admin-events-list');
        if (eventsList) {
            eventsList.innerHTML = '<p class="text-red-400 text-center py-8">Error loading events.</p>';
        }
    }
}

function filterEventsByCourse(course) {
    console.log('filterEventsByCourse called with course:', course, 'allEvents length:', allEvents.length);
    const eventsList = document.getElementById('admin-events-list');
    if (!eventsList) return;

    const filteredEvents = course === 'ALL' 
        ? allEvents 
        : allEvents.filter(event => event.course === course || event.course === 'ALL');

    if (filteredEvents.length === 0) {
        eventsList.innerHTML = `
            <div class="text-center py-8">
                <i class='bx bx-calendar-x text-4xl text-gray-500 mb-3'></i>
                <p class="text-gray-400">No events found for ${course}</p>
            </div>
        `;
        return;
    }

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    eventsList.innerHTML = filteredEvents.map(event => {
        const isHidden = event.status === 'hidden';
        const isCancelled = event.status === 'cancelled';
        const isCompleted = event.status === 'completed';
        const isActive = event.status === 'active' || event.status === 'upcoming' || !event.status;
        
        // Check if event date has passed
        const eventDate = event.date ? new Date(event.date) : null;
        if (eventDate) eventDate.setHours(0, 0, 0, 0);
        const hasEventPassed = eventDate && eventDate < today;
        
        // Determine status badge HTML
        let statusBadge = '';
        let statusColor = '';
        
        if (isCancelled) {
            statusBadge = 'CANCELLED';
            statusColor = 'bg-red-900/30 text-red-400 border-red-800';
        } else if (isCompleted) {
            statusBadge = 'COMPLETED';
            statusColor = 'bg-purple-900/30 text-purple-400 border-purple-800';
        } else if (isHidden) {
            statusBadge = 'HIDDEN';
            statusColor = 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
        } else {
            statusBadge = 'ACTIVE';
            statusColor = 'bg-green-900/30 text-green-400 border-green-800';
        }
        
        // Determine toggle button
        const toggleButton = !isCancelled && !isCompleted ? `
            <button class="px-3 py-2 ${isHidden ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white rounded-lg text-sm font-medium transition-colors" 
                    onclick="toggleEventVisibility(${event.id}, ${isHidden})">
                <i class='bx ${isHidden ? 'bx-show' : 'bx-hide'} mr-1'></i>
                ${isHidden ? 'Show' : 'Hide'}
            </button>
        ` : '';
        
            // Determine finish button - only show if event has passed and not already completed/cancelled
            // AND all participants are assigned (we'll check this when clicked, but show a warning indicator)
            const finishButton = !isCancelled && !isCompleted && hasEventPassed ? `
                <button class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors" 
                        onclick="finishEvent(${event.id})">
                    <i class='bx bx-check-circle mr-1'></i>Finish
                </button>
            ` : '';

            // Locked finish button - show if event hasn't passed yet
            const lockedFinishButton = !isCancelled && !isCompleted && !hasEventPassed ? `
                <button class="px-3 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed" 
                        onclick="showAlert('This event cannot be finished until after its scheduled date', 'info', 'Event Not Finished')"
                        title="Event date hasn't passed yet">
                    <i class='bx bx-lock-alt mr-1'></i>Finish
                </button>
            ` : '';
        
        return `
            <div class="bg-gray-900 border ${isCancelled ? 'border-red-800/50' : isHidden ? 'border-yellow-800/50' : 'border-gray-800'} rounded-lg p-5 hover:border-blue-500/30 transition-colors ${isHidden ? 'opacity-75' : ''}">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="text-lg font-semibold text-white">${event.title}</h3>
                        <div class="text-xs text-gray-400 mt-1">Course: ${event.course || 'ALL'}</div>
                    </div>
                    <span class="px-3 py-1 ${statusColor} border rounded-full text-xs font-medium">
                        ${statusBadge}
                    </span>
                </div>
                <p class="text-gray-400 text-sm mb-3">${event.description || 'No description'}</p>
                <div class="flex justify-between text-gray-500 text-sm mb-4">
                    <span><i class='bx bx-calendar mr-1'></i>${event.date ? formatPHDateShort(event.date) : 'TBA'}</span>
                    <span><i class='bx bx-map mr-1'></i>${event.location || 'TBA'}</span>
                </div>
                <div class="flex space-x-2">
                    <button class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="editEvent(${event.id})">
                        <i class='bx bx-edit mr-1'></i>Edit
                    </button>
                    ${toggleButton}
                    ${finishButton}
                    ${lockedFinishButton}
                    <button class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="deleteEvent(${event.id})">
                        <i class='bx bx-trash mr-1'></i>Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function finishEvent(eventId) {
    // Find the event to get its details
    const event = allEvents.find(e => e.id === eventId);
    
    if (!event) {
        showError('Event not found', 'Error');
        return;
    }
    
    // Check if event can be finished
    if (event.status === 'completed') {
        showAlert('This event is already completed', 'info', 'Already Completed');
        return;
    }
    
    if (event.status === 'cancelled') {
        showAlert('Cannot finish a cancelled event', 'warning', 'Cannot Finish');
        return;
    }
    
    // Check if event date has passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = event.date ? new Date(event.date) : null;
    if (eventDate) eventDate.setHours(0, 0, 0, 0);
    
    if (eventDate && eventDate >= today) {
        showAlert('This event cannot be finished until after its scheduled date', 'warning', 'Cannot Finish Yet');
        return;
    }
    
    try {
        // Check if all approved participants are assigned to buses
        console.log('Checking bus assignments for event:', eventId);
        
        // Get eligible participants (approved but NOT assigned)
        const eligibleResponse = await fetch(`/api/events/${eventId}/eligible-participants`);
        const eligibleParticipants = await eligibleResponse.json();
        
        // Get total approved participants count
        const requestsResponse = await fetch('/api/registration-requests');
        const allRequests = await requestsResponse.json();
        const approvedForEvent = allRequests.filter(req => 
            req.event_id == eventId && req.status === 'approved'
        );
        
        // Get assigned participants count
        const assignmentsResponse = await fetch(`/api/events/${eventId}/bus-assignments`);
        const assignments = await assignmentsResponse.json();
        
        const unassignedCount = eligibleParticipants.length;
        const assignedCount = assignments.length;
        const totalApproved = approvedForEvent.length;
        
        console.log(`Event ${eventId} stats: ${assignedCount} assigned, ${unassignedCount} unassigned, ${totalApproved} total approved`);
        
        // If there are approved participants but none are assigned, block
        if (totalApproved > 0 && assignedCount === 0) {
            showError(
                `Cannot finish this event because none of the ${totalApproved} approved participant(s) have been assigned to a bus.\n\n` +
                `Please assign all approved participants to buses first.`,
                'Bus Assignment Required'
            );
            return;
        }
        
        // If there are unassigned participants, block
        if (unassignedCount > 0) {
            showError(
                `Cannot finish this event because ${unassignedCount} approved participant(s) have not been assigned to a bus.\n\n` +
                `Assigned: ${assignedCount}/${totalApproved}\n` +
                `Unassigned: ${unassignedCount}\n\n` +
                `Please assign all approved participants to buses before finishing the event.`,
                'Bus Assignment Required'
            );
            return;
        }
        
        // All checks passed, proceed with finishing the event
        const confirmed = await showConfirm({
            title: 'Finish Event',
            message: `Are you sure you want to mark "${event.title}" as completed?\n\n` +
                `This will:\n` +
                `• Move the event to completed status\n` +
                `• Prevent new registrations\n` +
                `• Allow certificate generation\n\n` +
                `✅ All ${totalApproved} approved participant(s) are assigned to buses.`,
            type: 'info',
            confirmText: 'Yes, Finish Event',
            cancelText: 'Cancel'
        });
        
        if (!confirmed) return;
        
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'completed'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Event "${event.title}" has been marked as completed!`, 'Event Finished');
            
            // Refresh events list
            const eventsResponse = await fetch('/api/events?all=true');
            allEvents = await eventsResponse.json();
            
            const courseFilter = document.getElementById('admin-events-course-filter');
            filterEventsByCourse(courseFilter ? courseFilter.value : 'ALL');
            updateDashboardStats();
        } else {
            showError(result.error || 'Failed to finish event', 'Error');
        }
    } catch (error) {
        console.error('Error finishing event:', error);
        showError('Error: ' + error.message, 'Error');
    }
}

async function autoCompleteOldEvents() {
    // Count eligible events first
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const eligibleEvents = allEvents.filter(event => {
        if (event.status === 'completed' || event.status === 'cancelled') return false;
        const eventDate = event.date ? new Date(event.date) : null;
        if (eventDate) eventDate.setHours(0, 0, 0, 0);
        return eventDate && eventDate < today;
    });
    
    if (eligibleEvents.length === 0) {
        showAlert('No events are eligible for auto-completion yet. Events must be past their scheduled date.', 'info', 'No Eligible Events');
        return;
    }
    
    const confirmed = await showConfirm({
        title: 'Auto-Complete Events',
        message: `Found ${eligibleEvents.length} event(s) that have passed their scheduled date.\n\nThis will mark them as completed. Continue?`,
        type: 'info',
        confirmText: `Yes, Complete ${eligibleEvents.length} Event(s)`,
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch('/api/events/auto-complete', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`${result.completed} event(s) marked as completed!`, 'Auto-Complete Done');
            
            // Refresh events
            const eventsResponse = await fetch('/api/events?all=true');
            allEvents = await eventsResponse.json();
            
            const courseFilter = document.getElementById('admin-events-course-filter');
            filterEventsByCourse(courseFilter ? courseFilter.value : 'ALL');
            updateDashboardStats();
        } else {
            showError(result.error || 'Failed to auto-complete events', 'Error');
        }
    } catch (error) {
        console.error('Error auto-completing events:', error);
        showError('Error: ' + error.message, 'Error');
    }
}

// Initialize button
document.getElementById('auto-complete-events-btn')?.addEventListener('click', autoCompleteOldEvents);

async function toggleEventVisibility(eventId, currentlyHidden) {
    const action = currentlyHidden ? 'show' : 'hide';
    
    const confirmed = await showConfirm({
        title: `${action === 'show' ? 'Show' : 'Hide'} Event`,
        message: `Are you sure you want to ${action} this event?`,
        type: 'info',
        confirmText: `Yes, ${action}`,
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;

    try {
        // Toggle status
        const newStatus = currentlyHidden ? 'active' : 'hidden';
        
        console.log(`Toggling event ${eventId} to ${newStatus}`);
        
        // ONLY send the status field
        const updateResponse = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await updateResponse.json();

        if (result.success) {
            const eventsResponse = await fetch('/api/events?all=true');
            allEvents = await eventsResponse.json();
            
            const courseFilter = document.getElementById('admin-events-course-filter');
            filterEventsByCourse(courseFilter ? courseFilter.value : 'ALL');
            updateDashboardStats();
        } else {
            showError('Error: ' + (result.error || 'Failed to update event'));
        }
    } catch (error) {
        console.error('Error toggling event:', error);
        showError('Error: ' + error.message);
    }
}

// Make function globally available
window.toggleEventVisibility = toggleEventVisibility;

async function createEvent(eventData) {
    try {
        // Ensure status is set to 'hidden' for new events
        eventData.append('status', 'hidden');
        
        const response = await fetch('/api/events', {
            method: 'POST',
            body: eventData
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('✅ Event created! It is currently HIDDEN from students. Click "Show" to make it visible.');
            
            // Reset form
            const createEventForm = document.getElementById('create-event-form');
            if (createEventForm) createEventForm.reset();
            const eventImage = document.getElementById('event-image');
            if (eventImage) eventImage.value = '';
            
            // Refresh events list - use ?all=true
            const eventsResponse = await fetch('/api/events?all=true');
            allEvents = await eventsResponse.json();
            
            const courseFilter = document.getElementById('admin-events-course-filter');
            filterEventsByCourse(courseFilter ? courseFilter.value : 'ALL');
            
            updateDashboardStats();
        } else {
            showError('Error: ' + (result.error || 'Failed to create event'));
        }
    } catch (error) {
        console.error('Error creating event:', error);
        showError('Error: ' + error.message);
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

        document.getElementById('edit-event-id').value = eventId;
        document.getElementById('edit-event-title').value = event.title || '';
        document.getElementById('edit-event-description').value = event.description || '';
        document.getElementById('edit-event-date').value = event.date || '';
        document.getElementById('edit-event-location').value = event.location || '';
        document.getElementById('edit-event-course').value = event.course || 'ALL';
        document.getElementById('edit-event-target-year').value = event.target_year || 'ALL';  // ADD THIS
        document.getElementById('edit-event-status').value = event.status || 'active';
        document.getElementById('edit-event-url').value = event.external_url || '';

        document.getElementById('edit-event-modal').classList.remove('hidden');

    } catch (error) {
        console.error('Error loading event for editing:', error);
        showError('Error loading event: ' + error.message);
    }
}

async function updateEvent(eventId, eventData) {
    try {
        if (eventData.date && typeof eventData.date === 'string') {
            eventData.date = eventData.date.split('T')[0];
        }

        const urlEl = document.getElementById('edit-event-url');
        if (urlEl) {
            eventData.external_url = urlEl.value.trim() || null;
        }

        const targetYearEl = document.getElementById('edit-event-target-year');
        if (targetYearEl) {
            eventData.target_year = targetYearEl.value;
        }

        const response = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Event updated successfully!');
            document.getElementById('edit-event-modal').classList.add('hidden');
            loadAdminEvents();
            loadRegistrationRequests();
        } else {
            showError('Error updating event: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating event:', error);
        showError('Error updating event: ' + error.message);
    }
}

// Registration Requests Management
async function loadRegistrationRequests() {
    try {
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const eventFilter = document.getElementById('event-filter')?.value || 'all';
        const searchInput = document.getElementById('requests-search')?.value.toLowerCase().trim() || '';

        const requestsList = document.getElementById('requests-list');
        const resultCountDiv = document.getElementById('requests-result-count');
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

        // Filter by event
        if (eventFilter !== 'all') {
            requests = requests.filter(req => req.event_id == eventFilter);
        }

        // Filter by status
        let filteredRequests = statusFilter === 'all'
            ? requests
            : requests.filter(req => req.status === statusFilter);
            
        // Apply search filter
        if (searchInput) {
            filteredRequests = filteredRequests.filter(request => {
                const name = (request.name || '').toLowerCase();
                const email = (request.email || '').toLowerCase();
                const studentNumber = (request.student_number || '').toLowerCase();
                
                return name.includes(searchInput) || 
                       email.includes(searchInput) || 
                       studentNumber.includes(searchInput);
            });
        }

        // Update result count
        if (resultCountDiv) {
            const totalCount = filteredRequests.length;
            const pendingCount = filteredRequests.filter(r => r.status === 'pending').length;
            const approvedCount = filteredRequests.filter(r => r.status === 'approved').length;
            const rejectedCount = filteredRequests.filter(r => r.status === 'rejected').length;
            
            resultCountDiv.innerHTML = `
                <div class="flex items-center space-x-4">
                    <span>Total: <span class="text-white font-medium">${totalCount}</span> requests</span>
                    <span class="text-yellow-400"><i class='bx bx-time mr-1'></i>${pendingCount} Pending</span>
                    <span class="text-green-400"><i class='bx bx-check-circle mr-1'></i>${approvedCount} Approved</span>
                    <span class="text-red-400"><i class='bx bx-x-circle mr-1'></i>${rejectedCount} Rejected</span>
                    ${searchInput ? `<span class="text-blue-400"><i class='bx bx-search mr-1'></i>Search: "${searchInput}"</span>` : ''}
                </div>
            `;
        }

        if (filteredRequests.length === 0) {
            requestsList.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-inbox text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No registration requests found</p>
                    <p class="text-gray-500 text-sm">${searchInput || eventFilter !== 'all' ? 'Try adjusting your filters' : ''}</p>
                </div>
            `;
            return;
        }

        requestsList.innerHTML = filteredRequests.map(request => {
            // Create file links HTML
            let fileLinksHTML = '';
            const hasRegForm = request.registration_form && request.registration_form !== 'null' && request.registration_form !== '';
            const hasWaiverForm = request.waiver_form && request.waiver_form !== 'null' && request.waiver_form !== '';

            const safeName = request.name ? request.name.replace(/'/g, "\\'").replace(/"/g, '\\"') : 'Student';
            const safeRegForm = hasRegForm ? request.registration_form.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
            const safeWaiverForm = hasWaiverForm ? request.waiver_form.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';

            // Highlight search term
            let displayName = request.name || 'Unknown Student';
            let displayEmail = request.email || 'N/A';
            let displayStudentNumber = request.student_number || 'N/A';
            
            if (searchInput) {
                const highlightText = (text) => {
                    if (!text) return text;
                    const regex = new RegExp(`(${searchInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                    return text.replace(regex, '<mark class="bg-yellow-600/50 text-white px-1 rounded">$1</mark>');
                };
                displayName = highlightText(displayName);
                displayEmail = highlightText(displayEmail);
                displayStudentNumber = highlightText(displayStudentNumber);
            }

            if (hasRegForm || hasWaiverForm) {
                fileLinksHTML = '<div class="mt-3 space-y-2">';

                if (hasRegForm) {
                    fileLinksHTML += `
                        <p>
                            <a href="/api/uploads/${encodeURIComponent(request.registration_form)}" 
                               target="_blank"
                               class="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center">
                                <i class='bx bx-file mr-1'></i> Registration Form
                            </a>
                        </p>
                    `;
                }

                if (hasWaiverForm) {
                    fileLinksHTML += `
                        <p>
                            <a href="/api/uploads/${encodeURIComponent(request.waiver_form)}" 
                               target="_blank"
                               class="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center">
                                <i class='bx bx-file mr-1'></i> Waiver Form
                            </a>
                        </p>
                    `;
                }

                fileLinksHTML += `
                    <div class="pt-2">
                        <button onclick="openFileViewer(${request.id}, '${safeName}', '${safeRegForm}', '${safeWaiverForm}')"
                                class="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors">
                            <i class='bx bx-expand mr-1'></i> Preview All Files
                        </button>
                    </div>
                `;

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
                            <h3 class="text-lg font-semibold text-white">${displayName} ${eventStatusBadge}</h3>
                            <p class="text-gray-400 text-sm mt-1"><strong>Student #:</strong> ${displayStudentNumber}</p>
                            <p class="text-gray-400 text-sm"><strong>Email:</strong> ${displayEmail}</p>
                            <p class="text-gray-400 text-sm"><strong>Event:</strong> ${request.event_title || 'Unknown Event'}</p>
                            <p class="text-gray-400 text-sm"><strong>Event Date:</strong> ${request.event_date ? formatPHDateShort(request.event_date) : 'N/A'}</p>
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
                                    <i class='bx bx-check mr-1'></i> Approve
                                </button>
                            ` : ''}
                            ${request.status !== 'rejected' ? `
                                <button class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="updateRequestStatus(${request.id}, 'rejected')">
                                    <i class='bx bx-x mr-1'></i> Reject
                                </button>
                            ` : ''}
                            ${request.status !== 'pending' ? `
                                <button class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors" onclick="updateRequestStatus(${request.id}, 'pending')">
                                    <i class='bx bx-time mr-1'></i> Set Pending
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="text-center p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
                            <p class="text-red-400 text-sm"><i class='bx bx-error mr-1'></i> Event Cancelled - No Actions Available</p>
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
                        <i class='bx bx-refresh mr-2'></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// File viewing functionality - FIXED VERSION
let currentRequestFiles = [];

function openFileViewer(requestId, requestName, registrationForm, waiverForm) {
    console.log('Opening file viewer:', { requestId, requestName, registrationForm, waiverForm });

    currentRequestFiles = [];

    // Only add files that actually exist
    if (registrationForm && registrationForm.trim() !== '' && registrationForm !== 'null') {
        currentRequestFiles.push({
            type: 'registration',
            filename: registrationForm.trim(),
            title: 'Registration Form',
            // FIX: Use the correct API endpoint
            url: `/api/uploads/${encodeURIComponent(registrationForm.trim())}`
        });
    }

    if (waiverForm && waiverForm.trim() !== '' && waiverForm !== 'null') {
        currentRequestFiles.push({
            type: 'waiver',
            filename: waiverForm.trim(),
            title: 'Waiver Form',
            // FIX: Use the correct API endpoint
            url: `/api/uploads/${encodeURIComponent(waiverForm.trim())}`
        });
    }

    if (currentRequestFiles.length === 0) {
        showAlert('No files uploaded for this request.');
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
            <div class="flex flex-wrap gap-3 items-center">
                <div class="text-gray-400 text-sm">
                    <p><strong>File name:</strong> ${file.filename}</p>
                    <p><strong>Type:</strong> ${isImage ? 'Image' : isPdf ? 'PDF Document' : 'Document'}</p>
                </div>
                <div class="ml-auto">
                    <a href="${file.url}" target="_blank" 
                       class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center">
                        <i class='bx bx-download mr-2'></i> Download
                    </a>
                </div>
            </div>
        </div>
    `;
}

function loadFileContent(file, index) {
    const viewer = document.getElementById(`file-viewer-${index}`);
    const fileExt = file.filename.split('.').pop().toLowerCase();

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExt);
    const isPdf = fileExt === 'pdf';

    if (isImage) {
        viewer.innerHTML = `<img src="${file.url}" alt="${file.title}" class="w-full h-auto max-h-[400px] object-contain" onerror="handleFileError(${index})">`;
    } else if (isPdf) {
        viewer.innerHTML = `
            <iframe src="${file.url}" class="w-full h-[400px]" title="${file.title}"></iframe>
        `;
    } else {
        viewer.innerHTML = `
            <div class="text-center p-8">
                <i class='bx bx-file text-6xl text-gray-500 mb-4'></i>
                <p class="text-gray-400 mb-4">Document preview not available for .${fileExt} files</p>
                <a href="${file.url}" target="_blank" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
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

    // Show download progress
    let downloaded = 0;
    const total = currentRequestFiles.length;

    currentRequestFiles.forEach(file => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        downloaded++;
        if (downloaded === total) {
            showSuccess(`✅ Downloaded ${total} file(s) successfully!`);
        }
    });
}
// Load events for request filter dropdown
async function loadEventsForRequestFilter() {
    try {
        const eventFilter = document.getElementById('event-filter');
        if (!eventFilter) return;
        
        const response = await fetch('/api/events?all=true');
        const events = await response.json();
        
        // Clear existing options except "All Events"
        eventFilter.innerHTML = '<option value="all">All Events</option>';
        
        // Sort events by date (most recent first)
        const sortedEvents = events.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.title} (${event.date ? formatPHDateShort(event.date) : 'TBA'})`;
            eventFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading events for filter:', error);
    }
}

// Remove participant from event
async function removeParticipantFromEvent(userId, eventId, userName) {
    const confirmed = await showConfirm({
        title: 'Remove Participant',
        message: `Are you sure you want to remove ${userName} from this event?\n\nThis will:\n• Delete their registration request\n• Remove them from any bus assignment\n• They will need to register again to rejoin`,
        type: 'warning',
        confirmText: 'Yes, Remove',
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
        // First, find the registration request ID
        const requestsResponse = await fetch('/api/registration-requests');
        const requests = await requestsResponse.json();
        
        const request = requests.find(req => 
            req.user_id == userId && req.event_id == eventId
        );
        
        if (!request) {
            showError('Registration request not found', 'Error');
            return;
        }
        
        // Check if participant has a bus assignment
        const assignmentsResponse = await fetch(`/api/events/${eventId}/bus-assignments`);
        const assignments = await assignmentsResponse.json();
        
        const assignment = assignments.find(a => a.user_id == userId);
        
        // Remove bus assignment if exists
        if (assignment) {
            await fetch(`/api/bus-assignments/${assignment.id}`, {
                method: 'DELETE'
            });
        }
        
        // Delete the registration request
        const deleteResponse = await fetch(`/api/registration-requests/${request.id}`, {
            method: 'DELETE'
        });
        
        const result = await deleteResponse.json();
        
        if (result.success) {
            showSuccess(`✅ ${userName} has been removed from the event!`, 'Participant Removed');
            
            // Refresh the participants list
            loadParticipants();
            
            // Refresh dashboard stats
            updateDashboardStats();
        } else {
            showError(result.error || 'Failed to remove participant', 'Error');
        }
    } catch (error) {
        console.error('Error removing participant:', error);
        showError('Error removing participant: ' + error.message, 'Error');
    }
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
                course: request.course || 'N/A',
                year: request.year || '',
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
                    <p class="text-gray-500 text-sm">${searchFilter ? 'Try a different search term' : 'Try selecting a different event or check if participants are approved'}</p>
                </div>
            `;
            return;
        }

        // Show result summary
        const totalParticipants = filteredEvents.reduce((sum, event) => sum + event.participants.length, 0);
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'mb-4 text-gray-400 text-sm';
        summaryDiv.innerHTML = `
            <div class="flex items-center space-x-4">
                <span>Total: <span class="text-white font-medium">${totalParticipants}</span> participant${totalParticipants !== 1 ? 's' : ''}</span>
                <span class="text-green-400"><i class='bx bx-check-circle mr-1'></i>${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}</span>
                ${searchFilter ? `<span class="text-blue-400"><i class='bx bx-search mr-1'></i>Search: "${searchFilter}"</span>` : ''}
            </div>
        `;
        participantsContent.appendChild(summaryDiv);

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
                                ${event.participants.map(participant => {
                                    // Highlight search terms
                                    let displayName = participant.name;
                                    let displayStudentNumber = participant.student_number;
                                    let displayEmail = participant.email;
                                    
                                    if (searchFilter) {
                                        const highlightText = (text) => {
                                            if (!text) return text;
                                            const regex = new RegExp(`(${searchFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                            return text.replace(regex, '<mark class="bg-yellow-600/50 text-white px-1 rounded">$1</mark>');
                                        };
                                        displayName = highlightText(displayName);
                                        displayStudentNumber = highlightText(displayStudentNumber);
                                        displayEmail = highlightText(displayEmail);
                                    }
                                    
                                    return `
                                    <tr class="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                                        <td class="py-4">
                                            <div class="text-white font-medium">${displayName}</div>
                                        </td>
                                        <td class="py-4 text-gray-300">${displayStudentNumber}</td>
                                        <td class="py-4 text-gray-300">${displayEmail}</td>
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
                                                <button onclick="removeParticipantFromEvent(${participant.id}, ${event.event_id}, '${participant.name.replace(/'/g, "\\'")}')"
                                                        class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors">
                                                    <i class='bx bx-user-x mr-1'></i> Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `}).join('')}
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
        
        // Get sort filter
        const sortFilter = document.getElementById('participants-sort-filter')?.value || 'name';
        
        // Sort participants before rendering (already done above, but keeping for consistency)
        filteredEvents.forEach(event => {
            event.participants = sortParticipants(event.participants, sortFilter);
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
// Initialize auto-assign button
function initializeAutoAssignButton() {
    const autoAssignBtn = document.getElementById('auto-assign-all-btn');
    if (autoAssignBtn) {
        autoAssignBtn.addEventListener('click', () => {
            const eventId = document.getElementById('bus-event-filter')?.value;
            autoAssignAllParticipants(eventId);
        });
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

// Export participants list as CSV
async function exportParticipants(eventId) {
    try {
        // Show loading
        showAlert('Preparing export...', 'info', 'Exporting');
        
        // Fetch all registration requests with full user details
        const response = await fetch('/api/registration-requests');
        
        if (!response.ok) {
            throw new Error('Failed to fetch participants');
        }
        
        const allRequests = await response.json();
        
        // Filter for approved requests for this event
        const approvedRequests = allRequests.filter(req => 
            req.event_id == eventId && 
            req.status === 'approved' && 
            req.event_status !== 'cancelled'
        );
        
        if (approvedRequests.length === 0) {
            showAlert('No approved participants to export', 'warning', 'No Data');
            return;
        }
        
        // Get event details
        const eventResponse = await fetch(`/api/events/${eventId}`);
        const event = await eventResponse.json();
        
        // Create CSV content
        let csvContent = '';
        
        // Add event info as header rows
        csvContent += `"EVENT:","${event.title || 'Unknown Event'}"\n`;
        csvContent += `"DATE:","${event.date ? new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA'}"\n`;
        csvContent += `"LOCATION:","${event.location || 'TBA'}"\n`;
        csvContent += `"TOTAL PARTICIPANTS:","${approvedRequests.length}"\n`;
        csvContent += `"EXPORT DATE:","${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}"\n`;
        csvContent += `\n`;
        
        // Column headers
        csvContent += [
            'No',
            'Student Number',
            'Full Name',
            'Email',
            'Course',
            'Year',
            'Section',
            'Sex',
            'Age',
            'Approved Date'
        ].join(',') + '\n';
        
        // Add participant rows
        approvedRequests.forEach((req, index) => {
            // Format approved date - simple MM/DD/YYYY
            let approvedDate = '-';
            if (req.updated_at) {
                const date = new Date(req.updated_at);
                approvedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            } else if (req.created_at) {
                const date = new Date(req.created_at);
                approvedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            }
            
            // Build row
            const row = [
                index + 1,
                req.student_number || '-',
                req.name || '-',
                req.email || '-',
                req.course || '-',
                req.year || '-',
                req.section || '-',
                req.sex || '-',
                req.age || '-',
                approvedDate
            ];
            
            // Escape and join
            csvContent += row.map(cell => {
                if (cell === null || cell === undefined) return '"-"';
                const str = String(cell);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            }).join(',') + '\n';
        });
        
        // Add spacing before summary
        csvContent += `\n\n`;
        csvContent += `"══════════════════════════ SUMMARY STATISTICS ══════════════════════════"\n`;
        csvContent += `\n`;
        csvContent += `"Total Participants:",${approvedRequests.length}\n`;
        csvContent += `\n`;
        
        // Count by course
        const courseCount = {};
        approvedRequests.forEach(req => {
            const course = req.course || 'Undeclared';
            courseCount[course] = (courseCount[course] || 0) + 1;
        });
        
        csvContent += `"PARTICIPANTS BY COURSE:"\n`;
        Object.entries(courseCount)
            .sort((a, b) => b[1] - a[1])
            .forEach(([course, count]) => {
                const percentage = ((count / approvedRequests.length) * 100).toFixed(1);
                csvContent += `"  • ${course}:",${count},"(${percentage}%)"\n`;
            });
        
        csvContent += `\n`;
        
        // Count by year
        const yearCount = {};
        approvedRequests.forEach(req => {
            const year = req.year || 'Undeclared';
            yearCount[year] = (yearCount[year] || 0) + 1;
        });
        
        csvContent += `"PARTICIPANTS BY YEAR:"\n`;
        const yearOrder = ['1st yr', '2nd yr', '3rd yr', '4th yr', 'Undeclared'];
        yearOrder.forEach(year => {
            if (yearCount[year]) {
                const percentage = ((yearCount[year] / approvedRequests.length) * 100).toFixed(1);
                csvContent += `"  • ${year}:",${yearCount[year]},"(${percentage}%)"\n`;
            }
        });
        Object.entries(yearCount).forEach(([year, count]) => {
            if (!yearOrder.includes(year)) {
                const percentage = ((count / approvedRequests.length) * 100).toFixed(1);
                csvContent += `"  • ${year}:",${count},"(${percentage}%)"\n`;
            }
        });
        
        csvContent += `\n`;
        
        // Count by section
        const sectionCount = {};
        approvedRequests.forEach(req => {
            const section = req.section || 'Undeclared';
            sectionCount[section] = (sectionCount[section] || 0) + 1;
        });
        
        csvContent += `"PARTICIPANTS BY SECTION:"\n`;
        const sectionOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Undeclared'];
        sectionOrder.forEach(section => {
            if (sectionCount[section]) {
                const percentage = ((sectionCount[section] / approvedRequests.length) * 100).toFixed(1);
                csvContent += `"  • Section ${section}:",${sectionCount[section]},"(${percentage}%)"\n`;
            }
        });
        
        csvContent += `\n`;
        csvContent += `"═══════════════════════════════════════════════════════════════════════"\n`;
        csvContent += `"Generated by EduEvent System on ${new Date().toLocaleString()}"\n`;
        
        // Create and download file
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generate filename
        const eventTitle = (event.title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const exportDate = new Date().toISOString().split('T')[0];
        const filename = `participants_${eventTitle}_${exportDate}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showSuccess(`✅ Exported ${approvedRequests.length} participants successfully!`, 'Export Complete');
        
    } catch (error) {
        console.error('Error exporting participants:', error);
        showError('Error exporting participants: ' + error.message, 'Export Failed');
    }
}

async function sendCertificate(userId, eventId) {
    const confirmed = await showConfirm({
        title: 'Send Certificate',
        message: 'Send e-certificate to this participant?',
        type: 'info',
        confirmText: 'Yes, Send',
        cancelText: 'Cancel'
    });
    if (!confirmed) return;

    showSuccess(`E-certificate sent to participant!`, 'Certificate Sent');
}

function initParticipantsFilters() {
    const eventFilter = document.getElementById('participants-event-filter');
    const searchInput = document.getElementById('participants-search');
    const sortFilter = document.getElementById('participants-sort-filter');

    if (eventFilter) {
        const newEventFilter = eventFilter.cloneNode(true);
        eventFilter.parentNode.replaceChild(newEventFilter, eventFilter);
        const freshEventFilter = document.getElementById('participants-event-filter');
        freshEventFilter.addEventListener('change', loadParticipants);
    }

    if (sortFilter) {
        const newSortFilter = sortFilter.cloneNode(true);
        sortFilter.parentNode.replaceChild(newSortFilter, sortFilter);
        const freshSortFilter = document.getElementById('participants-sort-filter');
        freshSortFilter.addEventListener('change', loadParticipants);
    }

    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => loadParticipants(), 500);
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
        const newAddBusBtn = addBusBtn.cloneNode(true);
        addBusBtn.parentNode.replaceChild(newAddBusBtn, addBusBtn);

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
            const eventDate = event.date ? formatPHDateShort(event.date) : 'TBA';

            // Truncate long event titles (max 50 characters)
            let displayTitle = event.title;
            if (displayTitle.length > 50) {
                displayTitle = displayTitle.substring(0, 47) + '...';
            }

            option.textContent = `${displayTitle} (${eventDate})`;
            option.title = `${event.title} (${eventDate})`; // Full title as tooltip
            freshEventFilter.appendChild(option);
        });

        freshEventFilter.classList.add('max-w-xs', 'truncate');

        // Event listener for filter change
        freshEventFilter.addEventListener('change', function () {
            const eventId = this.value;
            console.log('Event filter changed to:', eventId);
            handleEventFilterChange(eventId);
        });

        // Clear filter button listener
        const clearFilterBtn = document.getElementById('clear-event-filter');
        if (clearFilterBtn) {

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
            const eventDate = event.date ? formatPHDateShort(event.date) : 'TBA';

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
            const eventDate = event.date ? formatPHDateShort(event.date) : 'TBA';
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
        const eventDate = event.date ? formatPHDateShort(event.date) : 'TBA';
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
                                                ${formatPHDateShort(assignment.assignment_date)}
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

            showError(errorMessage);
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
        select.addEventListener('change', function () {
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
        showError('Error: ' + error.message + '\n\nCheck console for details.');
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
        showError('Error loading bus information');
    }
}

async function assignToBus(assignmentData) {
    try {
        // Validate bus selection
        if (!assignmentData.bus_id) {
            showAlert('Please select a bus');
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
            showSuccess('✅ Participant assigned to bus successfully!');
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
            showError('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error assigning to bus:', error);
        showError('❌ Error assigning to bus: ' + error.message);
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
            showSuccess('Participant moved to new bus successfully!');
            document.getElementById('move-bus-form').reset();
            document.getElementById('move-bus-modal').classList.add('hidden');

            // Refresh assignments
            const eventId = document.getElementById('bus-event-filter').value;
            if (eventId) {
                loadEventBusAssignments(eventId);
            }

            loadBuses(); // Refresh bus list
        } else {
            showError('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error moving bus assignment:', error);
        showError('Error moving bus assignment: ' + error.message);
    }
}

async function viewBusAssignments(busId) {
    try {
        const response = await fetch(`/api/buses/${busId}/assignments`);
        const assignments = await response.json();

        if (assignments.length === 0) {
            showAlert('No assignments for this bus yet.');
            return;
        }

        let message = `Bus Assignments:\n\n`;
        assignments.forEach((assignment, index) => {
            message += `${index + 1}. ${assignment.user_name} (${assignment.student_number})\n`;
            message += `   Event: ${assignment.event_title}\n`;
            message += `   Date: ${new Date(assignment.event_date).toLocaleDateString()}\n`;
            message += `   Assigned: ${formatPHDateShort(assignment.assignment_date)}\n\n`;
        });

        showAlert(message);
    } catch (error) {
        console.error('Error viewing bus assignments:', error);
        showError('Error loading bus assignments');
    }
}

// Open Edit Bus Modal
async function editBus(busId) {
    openEditBusModal(busId);
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
            showSuccess('Bus added successfully!');
            document.getElementById('add-bus-form').reset();
            document.getElementById('add-bus-modal').classList.add('hidden');
            loadBuses();
        } else {
            showError('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding bus:', error);
        showError('Error adding bus: ' + error.message);
    }
}

// Edit existing bus
let currentEditBusId = null;
let currentEditBusData = null;

async function openEditBusModal(busId) {
    try {
        // Fetch current bus details
        const response = await fetch(`/api/buses/${busId}`);
        const bus = await response.json();
        
        if (!bus) {
            showError('Bus not found', 'Error');
            return;
        }
        
        currentEditBusId = busId;
        currentEditBusData = bus;
        
        // Populate form
        document.getElementById('edit-bus-id').value = busId;
        document.getElementById('edit-bus-number').value = bus.bus_number;
        document.getElementById('edit-bus-capacity').value = bus.capacity;
        
        // Show warning if capacity is being reduced
        const warningEl = document.getElementById('edit-bus-warning');
        warningEl.classList.add('hidden');
        
        // Add input listener for capacity changes
        const capacityInput = document.getElementById('edit-bus-capacity');
        capacityInput.addEventListener('input', function() {
            const newCapacity = parseInt(this.value);
            if (newCapacity < currentEditBusData.current_passengers) {
                warningEl.textContent = `⚠️ Cannot set capacity below current passengers (${currentEditBusData.current_passengers})`;
                warningEl.classList.remove('hidden');
                this.classList.add('border-red-500');
            } else {
                warningEl.classList.add('hidden');
                this.classList.remove('border-red-500');
            }
        });
        
        // Show modal
        document.getElementById('edit-bus-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error opening edit bus modal:', error);
        showError('Error loading bus details: ' + error.message, 'Error');
    }
}

async function updateBus(e) {
    e.preventDefault();
    
    const busId = document.getElementById('edit-bus-id').value;
    const newBusNumber = document.getElementById('edit-bus-number').value.trim();
    const newCapacity = parseInt(document.getElementById('edit-bus-capacity').value);
    
    // Validation
    if (!newBusNumber) {
        showAlert('Please enter a bus number', 'warning', 'Invalid Input');
        return;
    }
    
    if (isNaN(newCapacity) || newCapacity <= 0) {
        showAlert('Please enter a valid capacity (minimum 1)', 'warning', 'Invalid Input');
        return;
    }
    
    if (currentEditBusData && newCapacity < currentEditBusData.current_passengers) {
        showAlert(`Cannot set capacity lower than current passengers (${currentEditBusData.current_passengers})`, 'error', 'Invalid Capacity');
        return;
    }
    
    // Confirm update
    const confirmed = await showConfirm({
        title: 'Update Bus',
        message: `Update ${currentEditBusData.bus_number} to "${newBusNumber}" with capacity ${newCapacity}?`,
        type: 'info',
        confirmText: 'Yes, Update',
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/buses/${busId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bus_number: newBusNumber,
                capacity: newCapacity
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Bus "${newBusNumber}" updated successfully!`, 'Bus Updated');
            document.getElementById('edit-bus-modal').classList.add('hidden');
            
            // Refresh buses list
            loadBuses();
            
            // Refresh assignments if viewing an event
            const eventFilter = document.getElementById('bus-event-filter');
            if (eventFilter && eventFilter.value) {
                loadEventBusAssignments(eventFilter.value);
            }
        } else {
            showError(result.error || 'Failed to update bus', 'Error');
        }
    } catch (error) {
        console.error('Error updating bus:', error);
        showError('Error updating bus: ' + error.message, 'Error');
    }
}

// Initialize edit bus form listener
function initializeEditBusForm() {
    const editBusForm = document.getElementById('edit-bus-form');
    if (editBusForm) {
        editBusForm.addEventListener('submit', updateBus);
    }
}

// Delete bus
async function deleteBus(busId) {
    const confirmed = await showConfirm({
        title: 'Delete Bus',
        message: 'Are you sure you want to delete this bus?\n\nThis action cannot be undone.',
        type: 'error',
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/buses/${busId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Bus deleted successfully!', 'Deleted');
            loadBuses();
        } else {
            showError(result.error || 'Failed to delete bus', 'Error');
        }
    } catch (error) {
        console.error('Error deleting bus:', error);
        showError('Error: ' + error.message, 'Error');
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
            option.textContent = `${event.title} (${formatPHDateShort(event.date)})`;
            eventFilter.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading events for filter:', error);
    }
}

// Refresh Function
function refreshEligibleList() {
    const eventId = document.getElementById('bus-event-filter').value;
    if (eventId) {
        console.log('Refreshing eligible list for event:', eventId);
        loadEligibleParticipants(eventId);
    }
}

// View bus details and assignments
async function viewBusDetails(busId) {
    try {
        // Fetch bus details and assignments
        const [busResponse, assignmentsResponse] = await Promise.all([
            fetch(`/api/buses/${busId}`),
            fetch(`/api/buses/${busId}/assignments`)
        ]);

        if (!busResponse.ok) {
            throw new Error('Failed to fetch bus details');
        }

        const bus = await busResponse.json();
        const assignments = await assignmentsResponse.json();

        let message = `🚌 Bus ${bus.bus_number}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📊 Capacity: ${bus.current_passengers}/${bus.capacity} seats\n`;
        message += `📊 Available: ${bus.capacity - bus.current_passengers} seats\n\n`;

        if (assignments.length > 0) {
            message += `👥 Current Assignments (${assignments.length}):\n`;
            message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            // Group by event
            const byEvent = {};
            assignments.forEach(a => {
                if (!byEvent[a.event_title]) {
                    byEvent[a.event_title] = [];
                }
                byEvent[a.event_title].push(a);
            });
            
            for (const [eventTitle, eventAssignments] of Object.entries(byEvent)) {
                message += `📅 ${eventTitle}\n`;
                message += `   (${eventAssignments[0].event_date ? new Date(eventAssignments[0].event_date).toLocaleDateString() : 'TBA'})\n\n`;
                
                eventAssignments.forEach((a, i) => {
                    message += `   ${i + 1}. ${a.user_name}\n`;
                    message += `      Student #: ${a.student_number}\n`;
                    message += `      Email: ${a.email}\n`;
                    if (a.notes) {
                        message += `      Notes: ${a.notes}\n`;
                    }
                    message += `\n`;
                });
            }
        } else {
            message += `📭 No assignments for this bus yet.\n`;
        }

        // Show in a modal instead of alert
        showAlert(message, 'info', `Bus ${bus.bus_number} Details`);

    } catch (error) {
        console.error('Error viewing bus details:', error);
        showError('Error loading bus details: ' + error.message);
    }
}
// Auto-assign all eligible participants to buses
async function autoAssignAllParticipants(eventId) {
    if (!eventId) {
        showAlert('Please select an event first', 'warning', 'No Event Selected');
        return;
    }
    
    const confirmed = await showConfirm({
        title: 'Auto Assign',
        message: 'This will assign all eligible participants to available buses. Continue?',
        type: 'info',
        confirmText: 'Yes, Assign All',
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
        showAlert('Auto-assigning participants...', 'info', 'Processing');
        
        // Get eligible participants
        const eligibleResponse = await fetch(`/api/events/${eventId}/eligible-participants`);
        const eligibleParticipants = await eligibleResponse.json();
        
        // Get available buses
        const busesResponse = await fetch('/api/buses');
        const buses = await busesResponse.json();
        
        let assigned = 0;
        let failed = 0;
        
        for (const participant of eligibleParticipants) {
            // Find available bus with capacity
            const availableBus = buses.find(bus => bus.current_passengers < bus.capacity);
            
            if (availableBus) {
                try {
                    const assignResponse = await fetch('/api/bus-assignments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: participant.id,
                            event_id: eventId,
                            bus_id: availableBus.id,
                            notes: 'Auto-assigned'
                        })
                    });
                    
                    const result = await assignResponse.json();
                    
                    if (result.success) {
                        assigned++;
                        // Update bus passenger count locally
                        availableBus.current_passengers++;
                    } else {
                        failed++;
                    }
                } catch (error) {
                    console.error('Error assigning participant:', error);
                    failed++;
                }
            } else {
                failed++;
            }
        }
        
        // Refresh the view
        loadEventBusAssignments(eventId);
        loadEligibleParticipants(eventId);
        loadBuses();
        
        showSuccess(`Auto-assignment complete! ${assigned} assigned, ${failed} pending.`, 'Assignment Complete');
        
    } catch (error) {
        console.error('Error in auto-assign:', error);
        showError('Error during auto-assignment: ' + error.message);
    }
}

// Sort participants function
function sortParticipants(participants, sortBy) {
    return [...participants].sort((a, b) => {
        switch (sortBy) {
            case 'course':
                return (a.course || '').localeCompare(b.course || '');
            case 'year':
                return (a.year || '').localeCompare(b.year || '');
            case 'section':
                return (a.section || '').localeCompare(b.section || '');
            case 'name':
            default:
                return (a.name || '').localeCompare(b.name || '');
        }
    });
}

// Create announcement
async function createAnnouncement(formData) {
    try {
        const response = await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                created_by: currentUser?.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Announcement created successfully!');
            document.getElementById('announcement-modal').classList.add('hidden');
            document.getElementById('create-announcement-form').reset();
            loadAnnouncements();
        } else {
            showError(result.error || 'Failed to create announcement');
        }
    } catch (error) {
        console.error('Error creating announcement:', error);
        showError('Error creating announcement');
    }
}

// Delete announcement
async function deleteAnnouncement(id) {
    const confirmed = await showConfirm({
        title: 'Delete Announcement',
        message: 'Are you sure you want to delete this announcement?',
        type: 'warning',
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Announcement deleted!');
            loadAnnouncements();
        } else {
            showError(result.error || 'Failed to delete announcement');
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showError('Error deleting announcement');
    }
}
// Load events for announcement target select
async function loadEventsForAnnouncementSelect() {
    try {
        const select = document.getElementById('announcement-target-event');
        if (!select) return;
        
        const response = await fetch('/api/events?all=true');
        const events = await response.json();
        
        const activeEvents = events.filter(e => e.status === 'active' || e.status === 'upcoming');
        
        select.innerHTML = '<option value="">Select an event</option>';
        activeEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.title} (${event.date ? formatPHDateShort(event.date) : 'TBA'})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Open modal for creating announcement
function openCreateAnnouncementModal() {
    document.getElementById('announcement-modal-title').textContent = 'Create Announcement';
    document.getElementById('announcement-id').value = '';
    document.getElementById('announcement-form').reset();
    document.getElementById('target-course-container').classList.add('hidden');
    document.getElementById('target-event-container').classList.add('hidden');
    loadEventsForAnnouncementSelect();
    document.getElementById('announcement-modal').classList.remove('hidden');
}

// Open modal for editing announcement
async function openEditAnnouncementModal(id) {
    try {
        const response = await fetch('/api/announcements');
        const announcements = await response.json();
        const announcement = announcements.find(a => a.id === id);
        
        if (!announcement) {
            showError('Announcement not found');
            return;
        }
        
        document.getElementById('announcement-modal-title').textContent = 'Edit Announcement';
        document.getElementById('announcement-id').value = announcement.id;
        document.getElementById('announcement-title').value = announcement.title;
        document.getElementById('announcement-message').value = announcement.message;
        document.getElementById('announcement-type').value = announcement.type || 'info';
        document.getElementById('announcement-target-type').value = announcement.target_type || 'all';
        
        // Show/hide target fields based on type
        const targetType = announcement.target_type;
        document.getElementById('target-course-container').classList.toggle('hidden', targetType !== 'course');
        document.getElementById('target-event-container').classList.toggle('hidden', targetType !== 'event');
        
        if (targetType === 'course') {
            document.getElementById('announcement-target-course').value = announcement.target_course || '';
        }
        
        if (targetType === 'event') {
            await loadEventsForAnnouncementSelect();
            document.getElementById('announcement-target-event').value = announcement.target_event_id || '';
        }
        
        document.getElementById('announcement-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading announcement:', error);
        showError('Error loading announcement');
    }
}

// Close announcement modal
function closeAnnouncementModal() {
    document.getElementById('announcement-modal').classList.add('hidden');
    document.getElementById('announcement-form').reset();
}

// Save announcement (create or update)
async function saveAnnouncement(e) {
    e.preventDefault();
    
    const id = document.getElementById('announcement-id').value;
    const title = document.getElementById('announcement-title').value;
    const message = document.getElementById('announcement-message').value;
    const type = document.getElementById('announcement-type').value;
    const targetType = document.getElementById('announcement-target-type').value;
    
    const data = {
        title,
        message,
        type,
        target_type: targetType,
        created_by: currentUser?.id
    };
    
    if (targetType === 'course') {
        data.target_course = document.getElementById('announcement-target-course').value;
        if (!data.target_course) {
            showAlert('Please select a course', 'warning');
            return;
        }
    } else if (targetType === 'event') {
        data.target_event_id = document.getElementById('announcement-target-event').value;
        if (!data.target_event_id) {
            showAlert('Please select an event', 'warning');
            return;
        }
    }
    
    try {
        const url = id ? `/api/announcements/${id}` : '/api/announcements';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(id ? 'Announcement updated!' : 'Announcement created!');
            closeAnnouncementModal();
            loadAnnouncements();
        } else {
            showError(result.error || 'Failed to save announcement');
        }
    } catch (error) {
        console.error('Error saving announcement:', error);
        showError('Error saving announcement');
    }
}

// Load Announcements
async function loadAnnouncements() {
    try {
        const container = document.getElementById('announcements-list');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-8">
                <i class='bx bx-loader-circle bx-spin text-2xl text-blue-500'></i>
            </div>
        `;
        
        const response = await fetch('/api/announcements');
        const announcements = await response.json();
        
        if (announcements.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10">
                    <i class='bx bx-message text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No announcements yet</p>
                    <p class="text-gray-500 text-sm">Create your first announcement to get started</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = announcements.map(a => {
            const typeColors = {
                info: 'border-blue-800 bg-blue-900/20',
                success: 'border-green-800 bg-green-900/20',
                warning: 'border-yellow-800 bg-yellow-900/20',
                urgent: 'border-red-800 bg-red-900/20'
            };
            
            const typeIcons = {
                info: 'bx-info-circle text-blue-400',
                success: 'bx-check-circle text-green-400',
                warning: 'bx-error text-yellow-400',
                urgent: 'bx-alarm-exclamation text-red-400'
            };
            
            let targetText = 'All Users';
            if (a.target_type === 'course') targetText = `Course: ${a.target_course}`;
            else if (a.target_type === 'event') targetText = `Specific Event`;
            
            return `
                <div class="bg-black border ${typeColors[a.type] || 'border-gray-800'} rounded-xl p-5">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center">
                            <i class='bx ${typeIcons[a.type] || 'bx-info-circle'} text-xl mr-3'></i>
                            <div>
                                <h3 class="text-lg font-semibold text-white">${a.title}</h3>
                                <p class="text-gray-500 text-xs">${new Date(a.created_at).toLocaleString()} • ${targetText}</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="openEditAnnouncementModal(${a.id})" class="text-gray-400 hover:text-blue-400">
                                <i class='bx bx-edit'></i>
                            </button>
                            <button onclick="deleteAnnouncement(${a.id})" class="text-gray-400 hover:text-red-400">
                                <i class='bx bx-trash'></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-gray-300 text-sm whitespace-pre-line">${a.message}</p>
                    ${a.creator_name ? `<p class="text-gray-500 text-xs mt-3">Posted by: ${a.creator_name}</p>` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        showError('Error loading announcements', 'Error');
    }
}
// Initialize announcement form
function initAnnouncementForm() {
    const form = document.getElementById('create-announcement-form');
    if (!form) return;
    
    const audienceSelect = document.getElementById('announcement-audience');
    const courseSelect = document.getElementById('announcement-course');
    const eventSelect = document.getElementById('announcement-event');
    
    // Show/hide additional fields based on audience
    audienceSelect?.addEventListener('change', () => {
        const value = audienceSelect.value;
        document.getElementById('course-select-container')?.classList.toggle('hidden', value !== 'course');
        document.getElementById('event-select-container')?.classList.toggle('hidden', value !== 'event');
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const audience = audienceSelect?.value || 'all';
        const data = {
            title: document.getElementById('announcement-title').value,
            message: document.getElementById('announcement-message').value,
            type: document.getElementById('announcement-type').value,
            target_type: audience
        };
        
        if (audience === 'course') {
            data.target_course = document.getElementById('announcement-course')?.value;
        } else if (audience === 'event') {
            data.target_event_id = document.getElementById('announcement-event')?.value;
        }
        
        await createAnnouncement(data);
    });
}
// Initialize announcement features
function initAnnouncementFeatures() {
    // Create button
    const createBtn = document.getElementById('create-announcement-btn');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateAnnouncementModal);
    }
    
    // Form submission
    const form = document.getElementById('announcement-form');
    if (form) {
        form.addEventListener('submit', saveAnnouncement);
    }
    
    // Target type change
    const targetTypeSelect = document.getElementById('announcement-target-type');
    if (targetTypeSelect) {
        targetTypeSelect.addEventListener('change', function() {
            const value = this.value;
            document.getElementById('target-course-container').classList.toggle('hidden', value !== 'course');
            document.getElementById('target-event-container').classList.toggle('hidden', value !== 'event');
            
            if (value === 'event') {
                loadEventsForAnnouncementSelect();
            }
        });
    }
}

// Certificate Management Functions
let currentTemplates = [];

// Load certificate page
async function loadCertificatePage() {
    await loadTemplates();
    await loadEventsForCertificateSelect();
}

// Load templates
async function loadTemplates() {
    try {
        const templatesList = document.getElementById('templates-list');
        if (!templatesList) return;

        const response = await fetch('/api/certificates/templates');
        const templates = await response.json();
        currentTemplates = templates;

        if (templates.length === 0) {
            templatesList.innerHTML = `
                <div class="col-span-3 text-center py-8">
                    <i class='bx bx-file text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No templates uploaded yet</p>
                    <p class="text-gray-500 text-sm">Upload a PDF template to get started</p>
                </div>
            `;
            return;
        }

        templatesList.innerHTML = templates.map(template => `
            <div class="bg-black border ${template.is_default ? 'border-green-800' : 'border-gray-800'} rounded-xl p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <i class='bx bx-file text-2xl text-blue-400 mr-3'></i>
                        <div>
                            <h4 class="text-white font-medium">${template.name}</h4>
                            <p class="text-gray-500 text-xs">${new Date(template.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    ${template.is_default ? `
                        <span class="px-2 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded text-xs">Default</span>
                    ` : `
                        <button onclick="setDefaultTemplate(${template.id})" class="text-gray-400 hover:text-white">
                            <i class='bx bx-star'></i>
                        </button>
                    `}
                </div>
                <div class="flex space-x-2 mt-3">
                    <a href="${template.template_url}" target="_blank" 
                    class="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors text-center">
                        <i class='bx bx-download mr-1'></i> Download
                    </a>
                    <button onclick="openTemplateEditor(${template.id})" 
                            class="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <i class='bx bx-edit-alt'></i>
                    </button>
                    <button onclick="deleteTemplate(${template.id})" 
                            class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading templates:', error);
        showError('Error loading templates', 'Error');
    }
}

// Load events for certificate select
async function loadEventsForCertificateSelect() {
    try {
        const select = document.getElementById('certificate-event-select');
        if (!select) return;

        const response = await fetch('/api/events?all=true');
        const events = await response.json();

        // Filter for completed events (eligible for certificates)
        const eligibleEvents = events.filter(e => e.status === 'completed');

        select.innerHTML = '<option value="">Select an event</option>';
        
        eligibleEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.title} (${event.date ? formatPHDateShort(event.date) : 'TBA'})`;
            select.appendChild(option);
        });

        // Add change listener
        select.addEventListener('change', (e) => {
            if (e.target.value) {
                loadEventCertificates(e.target.value);
            }
        });

    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Load certificates for an event
async function loadEventCertificates(eventId) {
    try {
        const container = document.getElementById('certificates-list');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-8">
                <i class='bx bx-loader-circle bx-spin text-2xl text-blue-500'></i>
            </div>
        `;

        const response = await fetch(`/api/certificates/event/${eventId}`);
        const certificates = await response.json();
        
        // Store current event ID for Send All button
        window.currentCertificateEventId = eventId;

        if (certificates.length === 0) {
            // Update total count
            const totalSpan = document.getElementById('total-certificates-count');
            if (totalSpan) totalSpan.textContent = '0';
            
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class='bx bx-certification text-4xl text-gray-500 mb-3'></i>
                    <p class="text-gray-400">No certificates generated yet</p>
                    <p class="text-gray-500 text-sm">Generate certificates for completed events</p>
                </div>
            `;
            return;
        }

        // Update total count
        const totalSpan = document.getElementById('total-certificates-count');
        if (totalSpan) totalSpan.textContent = certificates.length;
        
        const sentCount = certificates.filter(c => c.sent).length;
        const unsentCount = certificates.length - sentCount;

        container.innerHTML = `
            <div class="bg-black border border-gray-800 rounded-xl p-4 mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-white">Total Certificates: ${certificates.length}</span>
                        <span class="text-gray-400 text-sm ml-4">
                            <span class="text-green-400">✓ ${sentCount} Sent</span>
                            ${unsentCount > 0 ? `<span class="text-yellow-400 ml-2">⌛ ${unsentCount} Pending</span>` : ''}
                        </span>
                    </div>
                    <div class="flex space-x-2">
                        ${unsentCount > 0 ? `
                            <button onclick="sendAllCertificates()" 
                                    class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                                <i class='bx bx-envelope mr-1'></i> Send All (${unsentCount})
                            </button>
                        ` : ''}
                        <button onclick="downloadAllCertificates(${eventId})" 
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                            <i class='bx bx-download mr-1'></i> Download All
                        </button>
                    </div>
                </div>
            </div>
            <div class="space-y-3">
                ${certificates.map(cert => `
                    <div class="bg-black border ${cert.sent ? 'border-green-800/50' : 'border-gray-800'} rounded-lg p-4 flex justify-between items-center">
                        <div>
                            <h4 class="text-white font-medium">${cert.name}</h4>
                            <p class="text-gray-400 text-sm">${cert.student_number} • ${cert.email}</p>
                            <p class="text-gray-500 text-xs mt-1">
                                Generated: ${new Date(cert.generated_at).toLocaleString()}
                                ${cert.sent ? '<span class="ml-2 text-green-400"><i class="bx bx-check-circle"></i> Sent</span>' : '<span class="ml-2 text-yellow-400"><i class="bx bx-time"></i> Not Sent</span>'}
                            </p>
                        </div>
                        <div class="flex space-x-2">
                            <a href="${cert.certificate_url}" target="_blank" 
                               class="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">
                                <i class='bx bx-download'></i>
                            </a>
                            ${!cert.sent ? `
                                <button onclick="sendCertificateEmail(${cert.id}, ${cert.user_id})" 
                                        class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                                    <i class='bx bx-envelope'></i>
                                </button>
                            ` : `
                                <button onclick="sendCertificateEmail(${cert.id}, ${cert.user_id})" 
                                        class="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                                        title="Resend certificate">
                                    <i class='bx bx-envelope'></i>
                                </button>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading certificates:', error);
        showError('Error loading certificates', 'Error');
    }
}
// Upload template form handler
function initCertificateUpload() {
    const uploadBtn = document.getElementById('upload-template-btn');
    const modal = document.getElementById('upload-template-modal');
    const form = document.getElementById('upload-template-form');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('name', document.getElementById('template-name').value);
            formData.append('is_default', document.getElementById('template-default').checked);
            
            const fileInput = form.querySelector('input[type="file"]');
            if (fileInput.files[0]) {
                formData.append('template', fileInput.files[0]);
            }

            try {
                const response = await fetch('/api/certificates/template', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    showSuccess('Template uploaded successfully!', 'Success');
                    modal.classList.add('hidden');
                    form.reset();
                    loadTemplates();
                } else {
                    showError(result.error || 'Failed to upload template', 'Error');
                }
            } catch (error) {
                console.error('Error uploading template:', error);
                showError('Error uploading template', 'Error');
            }
        });
    }
}
// Template Editor Variables
let currentPositioningType = null;
let templateEditorData = {
    id: null,
    imageWidth: 0,
    imageHeight: 0,
    namePosition: { x: 50, y: 50, size: 36, color: '#1a1a4d' }
};

// Open template editor
async function openTemplateEditor(templateId) {
    try {
        const response = await fetch(`/api/certificates/templates/${templateId}`);
        const template = await response.json();
        
        if (!template) {
            showError('Template not found', 'Error');
            return;
        }
        
        templateEditorData.id = templateId;
        
        // Parse saved position if any
        if (template.name_position) {
            try {
                const saved = JSON.parse(template.name_position);
                templateEditorData.namePosition = { ...templateEditorData.namePosition, ...saved };
            } catch (e) {
                console.error('Error parsing saved position:', e);
            }
        }
        
        // Load values into inputs immediately
        loadPositionInputs();
        
        // Get the preview container
        const previewContainer = document.getElementById('template-preview-container');
        
        // Check if it's a PDF
        if (template.template_url.toLowerCase().endsWith('.pdf')) {
            previewContainer.innerHTML = `
                <div class="relative" style="width: 100%;">
                    <iframe id="template-preview-pdf" 
                            src="${template.template_url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" 
                            frameborder="0"
                            scrolling="no">
                    </iframe>
                    <div id="preview-name-indicator" 
                        class="absolute border-2 border-blue-500 bg-blue-500/20 rounded pointer-events-none" 
                        style="display: none; width: 120px; height: 40px; transform: translate(-50%, -50%);">
                        <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded whitespace-nowrap">Name Position</span>
                    </div>
                    <div id="pdf-click-overlay" 
                        class="absolute inset-0" 
                        style="background: transparent; cursor: default;"
                        title="Click to set name position"></div>
                </div>
            `;

            showAlert('For PDF templates, click on the preview area where you want the name to appear, or use the X/Y input fields.', 'info', 'PDF Template');

            // Setup click handler for PDF overlay
            setTimeout(() => {
                const overlay = document.getElementById('pdf-click-overlay');
                const pdfFrame = document.getElementById('template-preview-pdf');
                
                if (overlay) {
                    overlay.addEventListener('click', function(e) {
                        if (currentPositioningType !== 'name') return;
                        
                        const rect = this.getBoundingClientRect();
                        
                        // Calculate percentage position (0-100)
                        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
                        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
                        
                        // Clamp values between 0 and 100
                        const clampedX = Math.max(0, Math.min(100, Math.round(xPercent)));
                        const clampedY = Math.max(0, Math.min(100, Math.round(yPercent)));
                        
                        // Update the position
                        templateEditorData.namePosition.x = clampedX;
                        templateEditorData.namePosition.y = clampedY;
                        
                        // Update inputs
                        document.getElementById('name-x').value = clampedX;
                        document.getElementById('name-y').value = clampedY;
                        
                        // Update preview indicator
                        const indicator = document.getElementById('preview-name-indicator');
                        if (indicator) {
                            indicator.style.display = 'block';
                            indicator.style.left = clampedX + '%';
                            indicator.style.top = clampedY + '%';
                        }
                        
                        // Exit positioning mode
                        currentPositioningType = null;
                        if (indicator) {
                            indicator.style.borderWidth = '2px';
                            indicator.style.borderColor = '#3b82f6';
                        }
                        
                        showSuccess(`Name position set to ${clampedX}%, ${clampedY}%`, 'Position Updated');
                    });
                    
                    // Update cursor when in positioning mode
                    overlay.addEventListener('mouseenter', () => {
                        if (currentPositioningType === 'name') {
                            overlay.style.cursor = 'crosshair';
                        }
                    });
                    
                    overlay.addEventListener('mouseleave', () => {
                        overlay.style.cursor = 'default';
                    });
                }
                
                // Save position
                setTimeout(() => {
                    updatePreviewIndicator();
                }, 200);
            }, 100);
            
        } else {
            // For images, use img tag
            previewContainer.innerHTML = `
                <div class="relative" style="width: 100%;">
                    <img id="template-preview-image" 
                        src="${template.template_url}" 
                        alt="Template Preview" 
                        style="width: 100%; height: auto; background: white; border-radius: 0.5rem;">
                    <div id="preview-name-indicator" 
                        class="absolute border-2 border-blue-500 bg-blue-500/20 rounded pointer-events-none" 
                        style="display: none; width: 120px; height: 40px; transform: translate(-50%, -50%);">
                        <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded whitespace-nowrap">Name Position</span>
                    </div>
                </div>
            `;
            
            const newPreviewImg = document.getElementById('template-preview-image');
            newPreviewImg.onload = function() {
                templateEditorData.imageWidth = this.naturalWidth;
                templateEditorData.imageHeight = this.naturalHeight;
                updatePreviewIndicator();
            };
            
            if (newPreviewImg.complete) {
                templateEditorData.imageWidth = newPreviewImg.naturalWidth;
                templateEditorData.imageHeight = newPreviewImg.naturalHeight;
                updatePreviewIndicator();
            }
        }
        
        // Show the modal
        document.getElementById('edit-template-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error opening template editor:', error);
        showError('Error loading template: ' + error.message, 'Error');
    }
}

// Update preview indicator
function updatePreviewIndicator() {
    const container = document.getElementById('template-preview-container');
    const indicator = document.getElementById('preview-name-indicator');
    const previewImg = document.getElementById('template-preview-image');
    const pdfOverlay = document.getElementById('pdf-click-overlay');
    
    if (!indicator) return;
    
    const pos = templateEditorData.namePosition;
    
    if (pos.x !== undefined && pos.y !== undefined) {
        indicator.style.display = 'block';
        indicator.style.left = pos.x + '%';
        indicator.style.top = pos.y + '%';
    }
    
    // For PDFs, ensure overlay is ready
    if (pdfOverlay && currentPositioningType === 'name') {
        pdfOverlay.style.cursor = 'crosshair';
    }
}

// Save template positions
async function saveTemplatePositions() {
    try {
        // Get values from inputs
        templateEditorData.namePosition = {
            x: parseInt(document.getElementById('name-x').value) || 50,
            y: parseInt(document.getElementById('name-y').value) || 50,
            size: parseInt(document.getElementById('name-size').value) || 36,
            color: document.getElementById('name-color').value || '#1a1a4d'
        };
        
        const response = await fetch(`/api/certificates/templates/${templateEditorData.id}/positions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name_position: JSON.stringify(templateEditorData.namePosition)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Template position saved!', 'Success');
            document.getElementById('edit-template-modal').classList.add('hidden');
            loadTemplates();
        } else {
            showError(result.error || 'Failed to save position', 'Error');
        }
    } catch (error) {
        console.error('Error saving position:', error);
        showError('Error saving position', 'Error');
    }
}

// Initialize template preview click handler
setTimeout(() => {
    initTemplatePreviewClick();
}, 500);

// Close modal when clicking outside
document.getElementById('edit-template-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-template-modal') {
        document.getElementById('edit-template-modal').classList.add('hidden');
    }
});
// Load position values into input fields
function loadPositionInputs() {
    // Use namePosition if it exists, otherwise fallback to positions.name
    const pos = templateEditorData.positions || {
        name: templateEditorData.namePosition || { x: 50, y: 50, size: 36, color: '#1a1a4d' }
    };
    
    const namePos = pos.name || templateEditorData.namePosition || { x: 50, y: 50, size: 36, color: '#1a1a4d' };
    
    document.getElementById('name-x').value = namePos.x || 50;
    document.getElementById('name-y').value = namePos.y || 50;
    document.getElementById('name-size').value = namePos.size || 36;
    document.getElementById('name-color').value = namePos.color || '#1a1a4d';
}

// Start positioning mode
function startPositioning(type) {
    currentPositioningType = type;
    
    // Highlight the indicator
    const indicator = document.getElementById(`preview-${type}-indicator`) || document.getElementById('preview-name-indicator');
    if (indicator) {
        indicator.style.borderWidth = '4px';
        indicator.style.borderColor = '#3b82f6';
    }
    
    // Update cursor for PDF overlay
    const pdfOverlay = document.getElementById('pdf-click-overlay');
    if (pdfOverlay) {
        pdfOverlay.style.cursor = 'crosshair';
    }
    
    const previewImg = document.getElementById('template-preview-image');
    if (previewImg) {
        previewImg.style.cursor = 'crosshair';
    }
    
    showAlert('Click on the preview area to set the name position', 'info', 'Positioning Mode');
}

// Handle click on preview image
function initTemplatePreviewClick() {
    const previewImg = document.getElementById('template-preview-image');
    
    if (!previewImg) return;
    
    // Remove old listener and add new one
    const newImg = previewImg.cloneNode(true);
    previewImg.parentNode.replaceChild(newImg, previewImg);
    
    newImg.addEventListener('click', function(e) {
        if (currentPositioningType !== 'name') return;
        
        const rect = this.getBoundingClientRect();
        
        // Calculate percentage position (0-100)
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Clamp values between 0 and 100
        const clampedX = Math.max(0, Math.min(100, Math.round(xPercent)));
        const clampedY = Math.max(0, Math.min(100, Math.round(yPercent)));
        
        // Update the position
        templateEditorData.namePosition.x = clampedX;
        templateEditorData.namePosition.y = clampedY;
        
        // Update inputs
        document.getElementById('name-x').value = clampedX;
        document.getElementById('name-y').value = clampedY;
        
        // Update preview indicator
        updatePreviewIndicator();
        
        // Exit positioning mode
        currentPositioningType = null;
        const indicator = document.getElementById('preview-name-indicator');
        if (indicator) {
            indicator.style.borderWidth = '2px';
            indicator.style.borderColor = '#3b82f6';
        }
        
        showSuccess(`Name position set to ${clampedX}%, ${clampedY}%`, 'Position Updated');
    });
    
    // Set cursor
    newImg.addEventListener('mouseenter', () => {
        if (currentPositioningType === 'name') {
            newImg.style.cursor = 'crosshair';
        }
    });
    
    newImg.addEventListener('mouseleave', () => {
        newImg.style.cursor = 'default';
    });
}

// Close template editor
function closeTemplateEditor() {
    document.getElementById('edit-template-modal').classList.add('hidden');
    currentPositioningType = null;
}


// Initialize template preview click handler
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initTemplatePreviewClick();
    }, 1000);
});
document.addEventListener('DOMContentLoaded', function() {
    // Ensure edit template modal is hidden on page load
    const modal = document.getElementById('edit-template-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
});
// Generate certificates
async function generateCertificates() {
    const eventSelect = document.getElementById('certificate-event-select');
    const eventId = eventSelect?.value;
    
    if (!eventId) {
        showAlert('Please select an event first', 'warning', 'No Event Selected');
        return;
    }

    // Get default template or let user choose
    const defaultTemplate = currentTemplates.find(t => t.is_default);
    const templateId = defaultTemplate ? defaultTemplate.id : null;

    if (!templateId) {
        showAlert('No default template found. Please upload and set a default template first.', 'warning', 'No Template');
        return;
    }

    const confirmed = await showConfirm({
        title: 'Generate Certificates',
        message: 'This will generate certificates for all approved participants in this event. Continue?',
        type: 'info',
        confirmText: 'Yes, Generate',
        cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
        showAlert('Generating certificates... This may take a moment.', 'info', 'Processing');

        const response = await fetch(`/api/certificates/generate/${eventId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(`${result.generated} certificate(s) generated successfully!`, 'Success');
            loadEventCertificates(eventId);
        } else {
            showError(result.error || 'Failed to generate certificates', 'Error');
        }
    } catch (error) {
        console.error('Error generating certificates:', error);
        showError('Error generating certificates', 'Error');
    }
}

// Set default template
async function setDefaultTemplate(templateId) {
    try {
        const response = await fetch(`/api/certificates/templates/${templateId}/default`, {
            method: 'PUT'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Default template updated!', 'Success');
            loadTemplates();
        } else {
            showError(result.error || 'Failed to update template', 'Error');
        }
    } catch (error) {
        console.error('Error setting default template:', error);
        showError('Error updating template', 'Error');
    }
}

// Delete template
async function deleteTemplate(templateId) {
    const confirmed = await showConfirm({
        title: 'Delete Template',
        message: 'Are you sure you want to delete this template?',
        type: 'warning',
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/certificates/templates/${templateId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Template deleted!', 'Success');
            loadTemplates();
        } else {
            showError(result.error || 'Failed to delete template', 'Error');
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        showError('Error deleting template', 'Error');
    }
}

// Send certificate email
async function sendCertificateEmail(certificateId, userId) {
    try {
        const response = await fetch(`/api/certificates/${certificateId}/send`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Certificate sent successfully!', 'Email Sent');
            const eventSelect = document.getElementById('certificate-event-select');
            if (eventSelect.value) {
                loadEventCertificates(eventSelect.value);
            }
        } else {
            showError(result.error || 'Failed to send certificate', 'Error');
        }
    } catch (error) {
        console.error('Error sending certificate:', error);
        showError('Error sending certificate', 'Error');
    }
}

// Download all certificates
function downloadAllCertificates(eventId) {
    showAlert('This feature will download all certificates as a ZIP file', 'info', 'Coming Soon');
}
// Send all certificates for the selected event
async function sendAllCertificates() {
    const eventSelect = document.getElementById('certificate-event-select');
    const eventId = eventSelect?.value;
    
    if (!eventId) {
        showAlert('Please select an event first', 'warning', 'No Event Selected');
        return;
    }
    
    // Get certificates for this event
    try {
        const response = await fetch(`/api/certificates/event/${eventId}`);
        const certificates = await response.json();
        
        if (certificates.length === 0) {
            showAlert('No certificates found for this event', 'info', 'No Certificates');
            return;
        }
        
        // Count unsent certificates
        const unsentCertificates = certificates.filter(cert => !cert.sent);
        const alreadySent = certificates.length - unsentCertificates.length;
        
        if (unsentCertificates.length === 0) {
            showAlert(`All ${certificates.length} certificate(s) have already been sent!`, 'info', 'Already Sent');
            return;
        }
        
        // Confirm with user
        let message = `Send certificates to ${unsentCertificates.length} participant(s)?`;
        if (alreadySent > 0) {
            message += `\n\n${alreadySent} certificate(s) already sent will be skipped.`;
        }
        
        const confirmed = await showConfirm({
            title: 'Send All Certificates',
            message: message,
            type: 'info',
            confirmText: `Yes, Send ${unsentCertificates.length}`,
            cancelText: 'Cancel'
        });
        
        if (!confirmed) return;
        
        // Show progress
        showAlert(`Sending ${unsentCertificates.length} certificate(s)... This may take a moment.`, 'info', 'Sending');
        
        let sent = 0;
        let failed = 0;
        const failedList = [];
        
        // Send each unsent certificate
        for (const cert of unsentCertificates) {
            try {
                const sendResponse = await fetch(`/api/certificates/${cert.id}/send`, {
                    method: 'POST'
                });
                
                const result = await sendResponse.json();
                
                if (result.success) {
                    sent++;
                } else {
                    failed++;
                    failedList.push(`${cert.name} (${cert.email}): ${result.error || 'Unknown error'}`);
                }
            } catch (error) {
                failed++;
                failedList.push(`${cert.name} (${cert.email}): ${error.message}`);
            }
        }
        
        // Refresh the certificates list
        loadEventCertificates(eventId);
        
        // Show results
        if (failed === 0) {
            showSuccess(
                `✅ Successfully sent ${sent} certificate(s)!`,
                'All Sent'
            );
        } else {
            let errorDetails = failedList.slice(0, 5).join('\n');
            if (failedList.length > 5) {
                errorDetails += `\n... and ${failedList.length - 5} more`;
            }
            
            showError(
                `Sent: ${sent} certificate(s)\nFailed: ${failed} certificate(s)\n\nFailed details:\n${errorDetails}`,
                'Partial Success'
            );
        }
        
    } catch (error) {
        console.error('Error sending certificates:', error);
        showError('Error sending certificates: ' + error.message, 'Error');
    }
}

// Initialize certificate page
function initCertificatePage() {
    initCertificateUpload();
    
    const generateBtn = document.getElementById('generate-certificates-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateCertificates);
    }

    // Load data when certificate page is shown
    const certLink = document.querySelector('[data-page="certificate"]');
    if (certLink) {
        certLink.addEventListener('click', () => {
            setTimeout(loadCertificatePage, 100);
        });
    }
}

let modalListenersInitialized = false;

function initializeModalListeners() {
    if (modalListenersInitialized) {
        console.log('Modal listeners already initialized, skipping...');
        return;
    }
    modalListenersInitialized = true;
    
    // Add Bus Modal
    const addBusForm = document.getElementById('add-bus-form');
    if (addBusForm) {
        addBusForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn.disabled) return;
            
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bx bx-loader-circle bx-spin mr-2"></i>Adding...';
            submitBtn.disabled = true;

            const busData = {
                bus_number: document.getElementById('bus-number').value.trim(),
                capacity: parseInt(document.getElementById('bus-capacity').value)
            };

            if (!busData.bus_number) {
                showAlert('Please enter a bus number');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }

            if (isNaN(busData.capacity) || busData.capacity < 1) {
                showAlert('Please enter a valid capacity (minimum 1)');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }

            try {
                const response = await fetch('/api/buses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(busData)
                });

                const result = await response.json();

                if (result.success) {
                    showSuccess('Bus added successfully!');
                    addBusForm.reset();
                    document.getElementById('add-bus-modal').classList.add('hidden');
                    loadBuses();
                } else {
                    showError(result.error || 'Failed to add bus');
                }
            } catch (error) {
                console.error('Error adding bus:', error);
                showError('Error adding bus: ' + error.message);
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Assign Bus Modal
    const assignBusForm = document.getElementById('assign-bus-form');
    if (assignBusForm) {
        assignBusForm.addEventListener('submit', function (e) {
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
        moveBusForm.addEventListener('submit', function (e) {
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

    // Button listeners
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

// Alert Modal
function showAlert(message, type = 'info', title = 'Notification') {
    showToast({
        type,
        title,
        message,
        confirmText: 'OK'
    });
}

// Success Modal
function showSuccess(message, title = 'Success!') {
    showToast({
        type: 'success',
        title,
        message,
        confirmText: 'Great!'
    });
}

// Error Modal
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
window.formatPHDate = formatPHDate;
window.formatPHDateShort = formatPHDateShort;
window.formatPHTime = formatPHTime;
window.loadEventsForRequestFilter = loadEventsForRequestFilter;
window.autoAssignAllParticipants = autoAssignAllParticipants;
window.sortParticipants = sortParticipants;
window.removeParticipantFromEvent = removeParticipantFromEvent;
window.viewBusDetails = viewBusDetails;
window.deleteBus = deleteBus;
window.openEditBusModal = openEditBusModal;
window.finishEvent = finishEvent;
window.openCreateAnnouncementModal = openCreateAnnouncementModal;
window.openEditAnnouncementModal = openEditAnnouncementModal;
window.closeAnnouncementModal = closeAnnouncementModal;
window.deleteAnnouncement = deleteAnnouncement;
window.setDefaultTemplate = setDefaultTemplate;
window.deleteTemplate = deleteTemplate;
window.sendCertificateEmail = sendCertificateEmail;
window.downloadAllCertificates = downloadAllCertificates;
window.sendAllCertificates = sendAllCertificates;
window.generateCertificates = generateCertificates;
window.openTemplateEditor = openTemplateEditor;
window.closeTemplateEditor = closeTemplateEditor;
window.startPositioning = startPositioning;
window.saveTemplatePositions = saveTemplatePositions;