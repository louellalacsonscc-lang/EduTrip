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
            
            // Load requests if navigating to requests page
            if (pageId === 'requests') {
                loadRegistrationRequests();
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

// Registration Requests Management
async function loadRegistrationRequests() {
    console.log('Loading registration requests...');
    
    try {
        const response = await fetch('/api/registration-requests');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const requests = await response.json();
        console.log('Received requests:', requests);
        
        const requestsList = document.getElementById('requests-list');
        const statusFilter = document.getElementById('status-filter').value;
        
        // Filter requests based on status
        const filteredRequests = statusFilter === 'all' 
            ? requests 
            : requests.filter(req => req.status === statusFilter);
        
        console.log(`Filtered requests: ${filteredRequests.length}`);
        
        if (filteredRequests.length === 0) {
            requestsList.innerHTML = `
                <div class="no-requests">
                    <i class='bxr bx-inbox'></i>
                    <p>No registration requests found</p>
                    <p class="debug-info">Status filter: "${statusFilter}"</p>
                    <button class="btn" onclick="checkDatabaseState()" style="margin-top: 10px;">
                        Check Database State
                    </button>
                </div>
            `;
            return;
        }
        
        requestsList.innerHTML = filteredRequests.map(request => `
            <div class="request-item">
                <div class="request-header">
                    <div class="request-info">
                        <h3>${request.name}</h3>
                        <p><strong>Student Number:</strong> ${request.student_number || 'N/A'}</p>
                        <p><strong>Email:</strong> ${request.email}</p>
                        <p><strong>Event:</strong> ${request.event_title}</p>
                        <p><strong>Date:</strong> ${request.event_date ? new Date(request.event_date).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Location:</strong> ${request.event_location || 'N/A'}</p>
                        <p><strong>Submitted:</strong> ${request.created_at ? new Date(request.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div class="request-status status-${request.status}">
                        ${request.status ? request.status.toUpperCase() : 'UNKNOWN'}
                    </div>
                </div>
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
            </div>
        `).join('');
        
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

// Status filter change handler
document.getElementById('status-filter').addEventListener('change', loadRegistrationRequests);

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
    
    // Load initial data if on requests page
    if (document.getElementById('requests').classList.contains('active')) {
        loadRegistrationRequests();
    }
    
    // Add debug button to dashboard for testing
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        const debugButton = document.createElement('button');
        debugButton.textContent = 'Debug Database';
        debugButton.className = 'btn';
        debugButton.style.marginTop = '20px';
        debugButton.onclick = checkDatabaseState;
        dashboard.querySelector('.dashboard-items').appendChild(debugButton);
    }
});