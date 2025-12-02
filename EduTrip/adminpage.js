const body = document.querySelector("body"),
    sidebar = body.querySelector(".sidebar"),
    toggle = body.querySelector(".toggle");

toggle.addEventListener("click", () => {
    sidebar.classList.toggle("close");
});

// Navigation functionality
const navLinks = document.querySelectorAll('.nav-link a');
const pages = document.querySelectorAll('.page-container');

// Initialize dashboard as active
document.getElementById('dashboard').classList.add('active');

// Event Management Functions
async function loadAdminEvents() {
    try {
        const response = await fetch('/api/events');
        const events = await response.json();
        
        const eventsList = document.getElementById('admin-events-list');
        
        if (events.length === 0) {
            eventsList.innerHTML = '<p>No events created yet.</p>';
            return;
        }
        
eventsList.innerHTML = events.map(event => `
    <div class="admin-event-card">
        <h3>${event.title}</h3>
        <p><strong>Description:</strong> ${event.description}</p>
        <p><strong>Date:</strong> ${event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p><strong>Status:</strong> ${event.status || 'active'}</p>
        <p><strong>Registrations:</strong> ${event.current_participants || 0} / ${event.max_participants || 'Unlimited'}</p>
        <div class="admin-event-actions">
            <button class="btn btn-edit" onclick="editEvent(${event.id})">
                <i class='bx bx-edit'></i> Edit
            </button>
            <button class="btn btn-delete" onclick="deleteEvent(${event.id})">
                <i class='bx bx-trash'></i> Delete
            </button>
        </div>
    </div>
`).join('');
        
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('admin-events-list').innerHTML = '<p>Error loading events.</p>';
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
            loadAdminEvents(); // Reload the events list
        } else {
            alert('Error creating event: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating event:', error);
        alert('Error creating event: ' + error.message);
    }
}
function checkForCriticalChanges(eventId, oldEvent, newEvent) {
    const criticalFields = ['date', 'location', 'status'];
    const changes = {};
    
    criticalFields.forEach(field => {
        if (oldEvent[field] !== newEvent[field]) {
            changes[field] = {
                old: oldEvent[field],
                new: newEvent[field]
            };
        }
    });
    
    if (Object.keys(changes).length > 0) {
        let message = "You're making critical changes:\n";
        Object.keys(changes).forEach(field => {
            message += `• ${field}: ${changes[field].old} → ${changes[field].new}\n`;
        });
        message += "\nThis may affect registered students. Continue?";
        return confirm(message);
    }
    
    return true;
}
// Event editing functionality
let editingEventId = null;

async function editEvent(eventId) {
    editingEventId = eventId;
    
    try {
        // Fetch event details
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
        document.getElementById('edit-event-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading event for editing:', error);
        alert('Error loading event: ' + error.message);
    }
}

async function updateEvent(eventId, eventData) {
    try {
        // First get the original event to compare
        const originalEventResponse = await fetch(`/api/events/${eventId}`);
        const originalEvent = await originalEventResponse.json();
        
        if (!originalEvent) {
            throw new Error('Original event not found');
        }
        
        // Check for specific changes
        const changes = {};
        if (originalEvent.date !== eventData.date) changes.date = true;
        if (originalEvent.location !== eventData.location) changes.location = true;
        if (originalEvent.status !== eventData.status) changes.status = true;
        
        // Determine notification type
        let notificationType = 'updated';
        if (eventData.status === 'cancelled') {
            notificationType = 'cancelled';
        } else if (changes.date && changes.location) {
            notificationType = 'rescheduled';
        } else if (changes.date) {
            notificationType = 'date_changed';
        } else if (changes.location) {
            notificationType = 'location_changed';
        }
        
        // Ask for confirmation based on changes
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
            // Show success message
            let successMsg = 'Event updated successfully!';
            
            // Send notifications if there were changes
            if (Object.keys(changes).length > 0) {
                // Auto-notify students for important changes
                if (eventData.status === 'cancelled' || changes.date || changes.location) {
                    const notificationResult = await notifyRegisteredStudents(eventId, eventData, notificationType);
                    
                    if (notificationResult.sent > 0) {
                        successMsg += `\nNotifications sent to ${notificationResult.sent} registered student(s).`;
                    } else if (notificationResult.total > 0) {
                        successMsg += `\nNo students needed notification.`;
                    }
                }
            }
            
            alert(successMsg);
            document.getElementById('edit-event-modal').style.display = 'none';
            loadAdminEvents(); // Reload events list
            loadRegistrationRequests(); // Reload registration requests
            
        } else {
            alert('Error updating event: ' + result.error);
        }
        
    } catch (error) {
        console.error('Error updating event:', error);
        alert('Error updating event: ' + error.message);
    }
}

// Handle edit form submission
document.getElementById('edit-event-form').addEventListener('submit', function(e) {
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

// Close edit modal
document.getElementById('close-edit-modal').addEventListener('click', () => {
    document.getElementById('edit-event-modal').style.display = 'none';
});

document.getElementById('cancel-edit').addEventListener('click', () => {
    document.getElementById('edit-event-modal').style.display = 'none';
});

// Optional: Notify registered students
// Update the notifyRegisteredStudents function to be more robust
async function notifyRegisteredStudents(eventId, updatedEvent, changeType = 'updated') {
    console.log(`Notification process started for ${changeType}:`, eventId, updatedEvent.title);
    
    try {
        // Get all registrations for this event
        const allRequestsResponse = await fetch('/api/registration-requests');
        const allRequests = await allRequestsResponse.json();
        
        const registrations = allRequests.filter(req => req.event_id == eventId);
        console.log(`Found ${registrations.length} registrations for event ${eventId}`);
        
        if (registrations.length === 0) {
            console.log('No registered students found for this event.');
            return { success: true, message: 'No students to notify' };
        }
        
        // Create notification messages based on change type
        const notificationConfigs = {
            'cancelled': {
                title: 'Event Cancelled',
                message: `The event "${updatedEvent.title}" has been cancelled.`,
                type: 'warning'
            },
            'updated': {
                title: 'Event Updated',
                message: `The event "${updatedEvent.title}" has been updated. Please check the new details.\nDate: ${updatedEvent.date}\nLocation: ${updatedEvent.location}`,
                type: 'info'
            },
            'date_changed': {
                title: 'Event Date Changed',
                message: `The date for "${updatedEvent.title}" has been changed to ${updatedEvent.date}.`,
                type: 'warning'
            },
            'location_changed': {
                title: 'Event Location Changed',
                message: `The location for "${updatedEvent.title}" has been changed to ${updatedEvent.location}.`,
                type: 'warning'
            },
            'rescheduled': {
                title: 'Event Rescheduled',
                message: `The event "${updatedEvent.title}" has been rescheduled to ${updatedEvent.date} at ${updatedEvent.location}.`,
                type: 'warning'
            }
        };
        
        const config = notificationConfigs[changeType] || notificationConfigs.updated;
        
        let notificationCount = 0;
        let errorCount = 0;
        
        // Send notifications to each registered student
        for (const reg of registrations) {
            try {
                console.log(`Creating notification for student ${reg.user_id} (${reg.name})`);
                
                // Create notification
                const notificationResponse = await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: reg.user_id,
                        title: config.title,
                        message: config.message,
                        type: config.type
                    })
                });
                
                if (notificationResponse.ok) {
                    notificationCount++;
                    console.log(`Notification sent to student ${reg.user_id}`);
                } else {
                    console.error(`Failed to send notification to student ${reg.user_id}`);
                    errorCount++;
                }
                
            } catch (error) {
                console.error(`Error notifying student ${reg.user_id}:`, error);
                errorCount++;
            }
        }
        
        console.log('Notification process complete:', {
            total: registrations.length,
            sent: notificationCount,
            errors: errorCount
        });
        
        return {
            success: notificationCount > 0,
            total: registrations.length,
            sent: notificationCount,
            errors: errorCount
        };
        
    } catch (error) {
        console.error('Error in notifyRegisteredStudents:', error);
        return { success: false, error: error.message };
    }
}

// Optional: Email notifications
async function sendEmailNotifications(registrations, updatedEvent) {
    // This is a placeholder for email functionality
    // In a real app, you would integrate with an email service like SendGrid, Nodemailer, etc.
    console.log('Email notifications would be sent to:', registrations.map(r => r.email));
    
    registrations.forEach(reg => {
        console.log(`Email to ${reg.email}: Event "${updatedEvent.title}" has been updated.`);
    });
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
            loadAdminEvents(); // Reload the events list
        } else {
            alert('Error deleting event: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event: ' + error.message);
    }
}

// File viewing functionality
let currentRequestFiles = [];

function openFileViewer(requestId, requestName, registrationForm, waiverForm) {
    console.log('Opening file viewer for request:', requestId, {
        name: requestName,
        registrationForm: registrationForm,
        waiverForm: waiverForm
    });
    
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
    document.querySelector('.file-header h3').textContent = `Documents - ${requestName}`;
    
    // Load file previews
    const previewContainer = document.getElementById('file-preview-container');
    previewContainer.innerHTML = '';
    
    currentRequestFiles.forEach((file, index) => {
        const filePreview = createFilePreview(file, index);
        previewContainer.innerHTML += filePreview;
    });
    
    // Show modal
    document.getElementById('file-modal').style.display = 'block';
    
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
        <div class="file-preview" id="file-preview-${index}">
            <h4>${file.title} <span class="file-type-badge">${fileExt.toUpperCase()}</span></h4>
            <div id="file-viewer-${index}" class="file-viewer">
                <div class="file-loading">
                    <i class='bx bx-loader-circle bx-spin'></i>
                    <p>Loading file...</p>
                </div>
            </div>
            <div class="document-info">
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
        viewer.innerHTML = `<img src="${fileUrl}" alt="${file.title}" class="image-viewer" onerror="handleFileError(${index})">`;
    } else if (isPdf) {
        viewer.innerHTML = `
            <iframe src="${fileUrl}" class="pdf-viewer" title="${file.title}"></iframe>
        `;
    } else {
        viewer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <i class='bx bx-file' style="font-size: 48px; color: var(--tex-color);"></i>
                <p style="margin-top: 10px; color: var(--tex-color);">Document preview not available for .${fileExt} files</p>
                <a href="${fileUrl}" target="_blank" class="btn btn-download" style="margin-top: 10px;">
                    <i class='bx bx-download'></i> Download File
                </a>
            </div>
        `;
    }
}

function handleFileError(index) {
    const viewer = document.getElementById(`file-viewer-${index}`);
    viewer.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <i class='bx bx-error' style="font-size: 48px; color: #dc3545;"></i>
            <p style="margin-top: 10px; color: var(--tex-color);">Unable to load file</p>
            <p style="font-size: 12px; color: var(--tex-color);">The file may have been deleted or is unavailable</p>
        </div>
    `;
}

// Download all files
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

// Registration Requests Management
// Registration Requests Management
async function loadRegistrationRequests() {
    console.log('Loading registration requests...');
    
    try {
        const statusFilter = document.getElementById('status-filter').value;
        const eventStatusFilter = document.getElementById('event-status-filter').value;
        
        // Always fetch all requests from the server
        const response = await fetch('/api/registration-requests');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let requests = await response.json();
        console.log('Received requests:', requests.length, 'Event filter:', eventStatusFilter);
        
        // Filter based on event status on the client side
        if (eventStatusFilter === 'active') {
            // Filter out cancelled events
            requests = requests.filter(req => req.event_status !== 'cancelled');
            console.log(`After filtering cancelled events: ${requests.length}`);
        }
        
        // Filter requests based on registration status
        const filteredRequests = statusFilter === 'all' 
            ? requests 
            : requests.filter(req => req.status === statusFilter);
        
        console.log(`Filtered requests: ${filteredRequests.length}`);
        
        const requestsList = document.getElementById('requests-list');
        
        if (filteredRequests.length === 0) {
            requestsList.innerHTML = `
                <div class="no-requests">
                    <i class='bxr bx-inbox'></i>
                    <p>No registration requests found</p>
                    <p class="debug-info">Status filter: "${statusFilter}", Event filter: "${eventStatusFilter}"</p>
                    <button class="btn" onclick="checkDatabaseState()" style="margin-top: 10px;">
                        Check Database State
                    </button>
                </div>
            `;
            return;
        }
        
        // Generate HTML for each request WITH FILE VIEWING LINKS
        requestsList.innerHTML = filteredRequests.map(request => {
            // Create file links HTML
            let fileLinksHTML = '';
            const hasRegForm = request.registration_form && request.registration_form !== 'null';
            const hasWaiverForm = request.waiver_form && request.waiver_form !== 'null';
            
            if (hasRegForm || hasWaiverForm) {
                fileLinksHTML = '<div class="file-links">';
                
                if (hasRegForm) {
                    const safeName = request.name ? request.name.replace(/'/g, "\\'") : 'Student';
                    fileLinksHTML += `
                        <p>
                            <a href="#" class="view-file-link" 
                               onclick="openFileViewer(${request.id}, '${safeName}', '${request.registration_form}', '${request.waiver_form || ''}'); return false;"
                               title="View uploaded registration form">
                                <i class='bx bx-file'></i> View Registration Form
                            </a>
                        </p>
                    `;
                }
                
                if (hasWaiverForm) {
                    const safeName = request.name ? request.name.replace(/'/g, "\\'") : 'Student';
                    fileLinksHTML += `
                        <p>
                            <a href="#" class="view-file-link" 
                               onclick="openFileViewer(${request.id}, '${safeName}', '${request.registration_form || ''}', '${request.waiver_form}'); return false;"
                               title="View uploaded waiver form">
                                <i class='bx bx-file'></i> View Waiver Form
                            </a>
                        </p>
                    `;
                }
                
                fileLinksHTML += '</div>';
            } else {
                fileLinksHTML = '<div class="file-links"><p>No files uploaded</p></div>';
            }
            
            // Add event status badge
            const eventStatusBadge = request.event_status === 'cancelled' 
                ? `<span class="event-status-badge status-cancelled">Event Cancelled</span>` 
                : '';
            
            return `
                <div class="request-item ${request.event_status === 'cancelled' ? 'cancelled-event' : ''}">
                    <div class="request-header">
                        <div class="request-info">
                            <h3>${request.name || 'Unknown Student'} ${eventStatusBadge}</h3>
                            <p><strong>Student Number:</strong> ${request.student_number || 'N/A'}</p>
                            <p><strong>Email:</strong> ${request.email || 'N/A'}</p>
                            <p><strong>Event:</strong> ${request.event_title || 'Unknown Event'}</p>
                            <p><strong>Date:</strong> ${request.event_date ? new Date(request.event_date).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Location:</strong> ${request.event_location || 'N/A'}</p>
                            <p><strong>Event Status:</strong> ${request.event_status || 'active'}</p>
                            <p><strong>Submitted:</strong> ${request.created_at ? new Date(request.created_at).toLocaleString() : 'N/A'}</p>
                            
                            <!-- FILE LINKS WILL APPEAR HERE -->
                            ${fileLinksHTML}
                            
                        </div>
                        <div class="request-status status-${request.status || 'pending'}">
                            ${(request.status || 'pending').toUpperCase()}
                        </div>
                    </div>
                    ${request.event_status !== 'cancelled' ? `
                        <div class="request-actions">
                            ${request.status !== 'approved' ? `
                                <button class="btn btn-approve" onclick="updateRequestStatus(${request.id}, 'approved')">
                                    Approve
                                </button>
                            ` : ''}
                            ${request.status !== 'rejected' ? `
                                <button class="btn btn-reject" onclick="updateRequestStatus(${request.id}, 'rejected')">
                                    Reject
                                </button>
                            ` : ''}
                            ${request.status !== 'pending' ? `
                                <button class="btn btn-pending" onclick="updateRequestStatus(${request.id}, 'pending')">
                                    Set Pending
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="request-actions">
                            <button class="btn btn-disabled" disabled>
                                Event Cancelled - No Actions Available
                            </button>
                        </div>
                    `}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading registration requests:', error);
        document.getElementById('requests-list').innerHTML = `
            <div class="no-requests">
                <i class='bxr bx-error'></i>
                <p>Error loading registration requests</p>
                <p class="debug-info">${error.message}</p>
                <button class="btn" onclick="checkDatabaseState()" style="margin-top: 10px;">
                    Check Database State
                </button>
                <button class="btn" onclick="loadRegistrationRequests()" style="margin-top: 5px;">
                    Retry
                </button>
            </div>
        `;
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
            loadRegistrationRequests(); // Reload the requests
        } else {
            alert('Error updating request status: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating request status:', error);
        alert('Error updating request status: ' + error.message);
    }
}

// Debug function to check database state
async function checkDatabaseState() {
    try {
        const response = await fetch('/api/debug/db-state');
        const dbState = await response.json();
        console.log('Database state:', dbState);
        alert('Check console for database state details');
    } catch (error) {
        console.error('Error checking database state:', error);
        alert('Error checking database state: ' + error.message);
    }
}

// Navigation setup
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
        const targetPage = document.getElementById(pageId === 'participants' ? 'participants-page' : pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Load data based on page
            switch(pageId) {
                case 'requests':
                    loadRegistrationRequests();
                    break;
                case 'events':
                    loadAdminEvents();
                    break;
            }
        }
    });
});

// Dashboard item click handlers
document.getElementById('reg-request').addEventListener('click', () => {
    const requestLink = Array.from(navLinks).find(link => link.getAttribute('data-page') === 'requests');
    if (requestLink) requestLink.click();
});

document.getElementById('bus-request').addEventListener('click', () => {
    const requestLink = Array.from(navLinks).find(link => link.getAttribute('data-page') === 'bus');
    if (requestLink) requestLink.click();
});

document.getElementById('participants').addEventListener('click', () => {
    const participantsLink = Array.from(navLinks).find(link => link.getAttribute('data-page') === 'participants');
    if (participantsLink) participantsLink.click();
});

// Handle create event form submission
document.getElementById('create-event-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const eventData = {
        title: formData.get('title'),
        description: formData.get('description'),
        date: formData.get('date'),
        location: formData.get('location')
    };
    
    createEvent(eventData);
});

// Status filter change handler
document.getElementById('status-filter').addEventListener('change', loadRegistrationRequests);
document.getElementById('event-status-filter').addEventListener('change', loadRegistrationRequests);

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// File modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    const logoutLink = document.querySelector('a[href="#"]'); // Find logout link
    if (logoutLink && logoutLink.querySelector('.nav-text').textContent.includes('Logout')) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // File modal setup
    const fileModal = document.getElementById('file-modal');
    const closeFileModal = document.getElementById('close-file-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    
    if (closeFileModal) {
        closeFileModal.addEventListener('click', () => {
            fileModal.style.display = 'none';
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            fileModal.style.display = 'none';
        });
    }
    
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', downloadAllFiles);
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === fileModal) {
            fileModal.style.display = 'none';
        }
    });
    
    // Load initial data if on requests page
    if (document.getElementById('requests').classList.contains('active')) {
        loadRegistrationRequests();
    }
});