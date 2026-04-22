class AnnouncementsDisplay {
    constructor() {
        this.container = document.getElementById('announcements-list');
        this.loadingState = document.getElementById('loadingState');
        this.noAnnouncementsState = document.getElementById('noAnnouncementsState');
        this.init();
    }
    
    async init() {
        console.log('🚀 AnnouncementsDisplay initialized');
        await this.loadAnnouncements();
    }
    
    async loadAnnouncements() {
        try {
            console.log('📡 Fetching announcements...');
            const response = await fetch('/api/announcements/public');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const announcements = await response.json();
            console.log('📢 Announcements received:', announcements);
            
            // HIDE LOADING STATE
            if (this.loadingState) {
                this.loadingState.style.display = 'none';
                this.loadingState.classList.add('hidden');
            }
            
            if (announcements.length === 0) {
                console.log('ℹ️ No announcements found');
                if (this.noAnnouncementsState) {
                    this.noAnnouncementsState.style.display = 'block';
                    this.noAnnouncementsState.classList.remove('hidden');
                }
                return;
            }
            
            // SHOW ANNOUNCEMENTS
            if (this.noAnnouncementsState) {
                this.noAnnouncementsState.style.display = 'none';
                this.noAnnouncementsState.classList.add('hidden');
            }
            
            this.renderAnnouncements(announcements);
            
        } catch (error) {
            console.error('❌ Error loading announcements:', error);
            if (this.loadingState) {
                this.loadingState.style.display = 'none';
                this.loadingState.classList.add('hidden');
            }
        }
    }
    
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    getIconForType(type) {
        const icons = {
            info: 'bx-info-circle',
            success: 'bx-check-circle',
            warning: 'bx-error',
            urgent: 'bx-alarm-exclamation'
        };
        return icons[type] || 'bx-info-circle';
    }
    
    getBadgeText(type) {
        const badges = {
            info: 'Information',
            success: 'Success',
            warning: 'Warning',
            urgent: 'Urgent'
        };
        return badges[type] || 'Information';
    }
    
    renderAnnouncements(announcements) {
        console.log('🎨 Rendering', announcements.length, 'announcements');
        
        // Sort by newest first
        const sorted = [...announcements].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        // Clear container and build HTML
        this.container.innerHTML = '';
        
        sorted.forEach(announcement => {
            const type = announcement.type || 'info';
            const timeAgo = this.formatTimeAgo(announcement.created_at);
            const badgeText = this.getBadgeText(type);
            const icon = this.getIconForType(type);
            
            const card = document.createElement('div');
            card.className = `announcement-card ${type}`;
            card.innerHTML = `
                <div class="announcement-header">
                    <div class="announcement-icon ${type}">
                        <i class='bx ${icon}'></i>
                    </div>
                    <div class="announcement-title-section">
                        <h3 class="announcement-title">${announcement.title}</h3>
                        <span class="announcement-time">
                            <i class='bx bx-time-five'></i> ${timeAgo}
                        </span>
                    </div>
                </div>
                <div class="announcement-message">
                    ${announcement.message.replace(/\n/g, '<br>')}
                </div>
                <div class="announcement-footer">
                    <span class="announcement-badge ${type}">
                        <i class='bx ${icon}'></i> ${badgeText}
                    </span>
                    ${announcement.creator_name ? `
                        <span class="announcement-author">
                            <i class='bx bx-user'></i> ${announcement.creator_name}
                        </span>
                    ` : ''}
                </div>
            `;
            
            this.container.appendChild(card);
        });
        
        console.log('✅ Announcements rendered successfully');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting AnnouncementsDisplay');
    new AnnouncementsDisplay();
});