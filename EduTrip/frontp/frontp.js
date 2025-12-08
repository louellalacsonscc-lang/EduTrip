let events = [];
let currentIndex = 0;
let slideInterval;
let isAnimating = false;

// FETCH EVENTS FROM DATABASE
async function fetchEvents() {
    try {
        const response = await fetch('/api/frontpage-events');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

// FORMAT DATE
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return dateString || 'Date TBA';
    }
}

// CREATE EVENT CARD HTML
function createEventCard(event, position = 'center') {
    // Use different images based on event ID for variety
    const imageUrls = [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    ];
    
    const imageIndex = event.id ? event.id % imageUrls.length : 0;
    const imageUrl = imageUrls[imageIndex];
    
    // Determine card size based on position
    const isCenter = position === 'center';
    const cardClass = isCenter ? 'card-center card-center-size' : `card-${position} card-base`;
    const titleSize = isCenter ? 'text-2xl' : 'text-xl';
    
    return `
        <div class="${cardClass} glass-card p-6 flex flex-col transition-slow-smooth card-hover">
            <div class="relative overflow-hidden rounded-lg mb-4">
                <img src="${imageUrl}" 
                     class="w-full h-48 object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            <h2 class="${titleSize} font-bold text-white mb-3">${event.title || 'New Event'}</h2>
            <p class="text-gray-300 mb-4 flex-grow line-clamp-3">${event.description || 'No description available'}</p>
            <div class="text-gray-400 text-sm mb-4 space-y-2">
                <p class="flex items-center">
                    <i class='bx bx-calendar mr-2 text-blue-400'></i>
                    <span>${formatDate(event.date)}</span>
                </p>
                <p class="flex items-center">
                    <i class='bx bx-map mr-2 text-blue-400'></i>
                    <span>${event.location || 'Location TBA'}</span>
                </p>
            </div>
            <a href="/login" class="mt-auto ${isCenter ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 text-center">
                <i class='bx bx-info-circle mr-2'></i> View Details
            </a>
        </div>
    `;
}

// CREATE ALL CARDS
function createAllCards() {
    const carouselTrack = document.getElementById('carouselTrack');
    carouselTrack.innerHTML = '';
    
    if (events.length === 0) return;
    
    // Create cards for all events
    events.forEach((event, index) => {
        const card = document.createElement('div');
        card.id = `card-${index}`;
        carouselTrack.appendChild(card);
    });
    
    updateCarouselDisplay();
}

// UPDATE CAROUSEL DISPLAY
function updateCarouselDisplay() {
    if (events.length === 0) return;
    
    const totalEvents = events.length;
    
    // Update all cards based on their position relative to currentIndex
    events.forEach((event, index) => {
        const cardElement = document.getElementById(`card-${index}`);
        if (!cardElement) return;
        
        // Calculate position relative to current index
        let positionClass = 'hidden';
        let positionType = 'hidden';
        
        if (totalEvents === 1) {
            // Only one event - always center
            positionClass = 'card-center card-center-size';
            positionType = 'center';
        } else if (totalEvents === 2) {
            // Two events - show both
            if (index === currentIndex) {
                positionClass = 'card-left card-base';
                positionType = 'left';
            } else if (index === (currentIndex + 1) % totalEvents) {
                positionClass = 'card-right card-base';
                positionType = 'right';
            }
        } else if (totalEvents >= 3) {
            // Three or more events - show 3-5 cards
            const diff = (index - currentIndex + totalEvents) % totalEvents;
            
            if (diff === 0) {
                // Current card - center
                positionClass = 'card-center card-center-size';
                positionType = 'center';
            } else if (diff === 1 || (diff === totalEvents - 1 && totalEvents === 3)) {
                // Right card
                positionClass = 'card-right card-base';
                positionType = 'right';
            } else if (diff === totalEvents - 1 || (diff === 1 && totalEvents === 3)) {
                // Left card
                positionClass = 'card-left card-base';
                positionType = 'left';
            } else if (diff === 2 || diff === totalEvents - 2) {
                // Far cards (only show if we have 5+ events)
                if (totalEvents >= 5) {
                    positionClass = diff === 2 ? 'card-far-right card-base' : 'card-far-left card-base';
                    positionType = diff === 2 ? 'far-right' : 'far-left';
                }
            }
        }
        
        cardElement.className = positionClass;
        cardElement.innerHTML = positionClass === 'hidden' ? '' : createEventCard(event, positionType);
    });
}

// UPDATE INDICATORS
function updateIndicators() {
    const indicatorsContainer = document.getElementById('carouselIndicators');
    indicatorsContainer.innerHTML = '';
    
    if (events.length <= 1) return;
    
    for (let i = 0; i < events.length; i++) {
        const indicator = document.createElement('button');
        indicator.className = 'w-3 h-3 rounded-full transition-all duration-300';
        indicator.onclick = () => goToSlide(i);
        
        if (i === currentIndex) {
            indicator.classList.add('bg-blue-500', 'pulse-gentle');
            indicator.classList.remove('bg-gray-600');
        } else {
            indicator.classList.add('bg-gray-600');
            indicator.classList.remove('bg-blue-500', 'pulse-gentle');
        }
        
        indicatorsContainer.appendChild(indicator);
    }
}

// SLIDE CONTROLS
function nextSlide() {
    if (isAnimating || events.length <= 1) return;
    
    isAnimating = true;
    currentIndex = (currentIndex + 1) % events.length;
    
    updateCarouselDisplay();
    updateIndicators();
    resetSlideInterval();
    
    // Reset animation flag after transition completes
    setTimeout(() => {
        isAnimating = false;
    }, 800); // Match the CSS transition duration
}

function prevSlide() {
    if (isAnimating || events.length <= 1) return;
    
    isAnimating = true;
    currentIndex = (currentIndex - 1 + events.length) % events.length;
    
    updateCarouselDisplay();
    updateIndicators();
    resetSlideInterval();
    
    // Reset animation flag after transition completes
    setTimeout(() => {
        isAnimating = false;
    }, 800); // Match the CSS transition duration
}

function goToSlide(slideIndex) {
    if (isAnimating || slideIndex === currentIndex || events.length <= 1) return;
    
    isAnimating = true;
    currentIndex = slideIndex;
    
    updateCarouselDisplay();
    updateIndicators();
    resetSlideInterval();
    
    // Reset animation flag after transition completes
    setTimeout(() => {
        isAnimating = false;
    }, 800); // Match the CSS transition duration
}

// AUTO SLIDE - 10 SECONDS DELAY
function startAutoSlide() {
    if (events.length > 1) {
        slideInterval = setInterval(nextSlide, 10000); // 10 seconds
    }
}

function resetSlideInterval() {
    clearInterval(slideInterval);
    startAutoSlide();
}

// LOAD AND INITIALIZE EVENTS
async function loadEvents() {
    const loadingState = document.getElementById('loadingState');
    const noEventsState = document.getElementById('noEventsState');
    const carouselContainer = document.querySelector('.carousel-container');
    
    try {
        loadingState.classList.remove('hidden');
        noEventsState.classList.add('hidden');
        
        // Fetch events from API
        events = await fetchEvents();
        
        if (events.length === 0) {
            loadingState.classList.add('hidden');
            noEventsState.classList.remove('hidden');
            return;
        }
        
        // Hide loading
        loadingState.classList.add('hidden');
        
        // Initialize carousel
        createAllCards();
        updateIndicators();
        
        // Start auto-slide (10 seconds delay)
        if (events.length > 1) {
            startAutoSlide();
        }
        
        // Pause auto-slide on hover
        carouselContainer.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });
        
        carouselContainer.addEventListener('mouseleave', () => {
            startAutoSlide();
        });
        
    } catch (error) {
        console.error('Error loading events:', error);
        loadingState.classList.add('hidden');
        noEventsState.classList.remove('hidden');
    }
}

// INITIALIZE
document.addEventListener('DOMContentLoaded', function() {
    // Load events from database
    loadEvents();
    
    // Refresh events every minute to get new announcements
    setInterval(loadEvents, 60000);
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
        }
    });
    
    // Add touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    const carouselTrack = document.getElementById('carouselTrack');
    
    carouselTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        clearInterval(slideInterval);
    });
    
    carouselTrack.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
        startAutoSlide();
    });
    
    function handleSwipe() {
        if (events.length <= 1) return;
        
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next slide
                nextSlide();
            } else {
                // Swipe right - previous slide
                prevSlide();
            }
        }
    }
});