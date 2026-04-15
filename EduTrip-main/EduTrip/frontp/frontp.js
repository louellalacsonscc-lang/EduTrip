class InfiniteCarousel {
    constructor() {
        this.events = [];
        this.track = document.getElementById('infiniteTrack');
        this.isPlaying = true;
        this.animationSpeed = 30;
        this.duplicateFactor = 2;
        this.init();
    }
    
    async init() {
        await this.loadEvents();
        if (this.events.length > 0) {
            this.createInfiniteTrack();
            this.setupHoverPause();
            this.startAnimation();
        }
    }
    
    async loadEvents() {
        const loadingState = document.getElementById('loadingState');
        const noEventsState = document.getElementById('noEventsState');
        
        try {
            const response = await fetch('/api/frontpage-events');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.events = await response.json();
            
            if (this.events.length === 0) {
                loadingState.classList.add('hidden');
                noEventsState.classList.remove('hidden');
                return;
            }
            
            loadingState.classList.add('hidden');
            
        } catch (error) {
            console.error('Error loading events:', error);
            loadingState.classList.add('hidden');
            noEventsState.classList.remove('hidden');
        }
    }
    
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString || 'Date TBA';
        }
    }
    
    getEventImage(eventId) {
        const imageUrls = [
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            'https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
        ];
        
        const imageIndex = eventId ? eventId % imageUrls.length : 0;
        return imageUrls[imageIndex];
    }
    
    createEventCard(event) {
        const imageUrl = this.getEventImage(event.id);
        
        return `
            <div class="carousel-card">
                <div class="modern-card">
                    <div class="visual">
                        <img
                            class="img"
                            width="384"
                            height="192"
                            src="${imageUrl}"
                            alt="${event.title || 'Educational event'}"
                        />
                    </div>
                    <div class="content">
                        <div class="content-wrapper">
                            <h3 class="title">${event.title || 'New Event'}</h3>
                            <p class="desc">
                                ${event.description || 'No description available'}
                            </p>
                        </div>
                        <div class="mt-4 flex items-center justify-between">
                            <div class="text-sm text-gray-500">
                                <div class="flex items-center gap-2">
                                    <i class='bx bx-calendar'></i>
                                    <span>${this.formatDate(event.date)}</span>
                                </div>
                                <div class="flex items-center gap-2 mt-1">
                                    <i class='bx bx-map'></i>
                                    <span>${event.location || 'Location TBA'}</span>
                                </div>
                            </div>
                            <a href="/login" class="card-link">
                                View Details
                                <i class='bx bx-chevron-right'></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createInfiniteTrack() {
        if (this.events.length === 0) return;
        
        this.track.innerHTML = '';
        
        // Create enough cards for seamless infinite scrolling
        const totalCardsNeeded = this.events.length * this.duplicateFactor;
        
        for (let i = 0; i < totalCardsNeeded; i++) {
            const eventIndex = i % this.events.length;
            this.track.innerHTML += this.createEventCard(this.events[eventIndex]);
        }
        
        this.updateAnimation();
    }
    
    updateAnimation() {
        const cardWidth = 320 + 24; // width + gap
        const trackWidth = this.track.scrollWidth;
        const animationDuration = trackWidth / (cardWidth / this.animationSpeed);
        
        this.track.style.animation = 'none';
        
        // Force reflow
        void this.track.offsetWidth;
        
        this.track.style.animation = `scroll ${animationDuration}s linear infinite`;
        
        if (!this.isPlaying) {
            this.track.classList.add('paused');
        } else {
            this.track.classList.remove('paused');
        }
    }
    
    startAnimation() {
        this.isPlaying = true;
        this.updateAnimation();
    }
    
    pauseAnimation() {
        this.isPlaying = false;
        this.updateAnimation();
    }
    
    toggleAnimation() {
        this.isPlaying = !this.isPlaying;
        this.updateAnimation();
    }
    
    setupHoverPause() {
        const carousel = document.querySelector('.infinite-carousel');
        
        carousel.addEventListener('mouseenter', () => {
            if (this.isPlaying) {
                this.pauseAnimation();
            }
        });
        
        carousel.addEventListener('mouseleave', () => {
            if (this.isPlaying) {
                this.startAnimation();
            }
        });
    }
    
    updateSpeed(speed) {
        this.animationSpeed = speed;
        this.updateAnimation();
    }
}

// Initialize carousel when page loads
document.addEventListener('DOMContentLoaded', () => {
    const carousel = new InfiniteCarousel();
    
    // Auto-refresh events every 30 seconds
    setInterval(async () => {
        try {
            const response = await fetch('/api/frontpage-events');
            if (response.ok) {
                const newEvents = await response.json();
                if (JSON.stringify(newEvents) !== JSON.stringify(carousel.events)) {
                    carousel.events = newEvents;
                    if (carousel.events.length > 0) {
                        carousel.createInfiniteTrack();
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing events:', error);
        }
    }, 30000);
});