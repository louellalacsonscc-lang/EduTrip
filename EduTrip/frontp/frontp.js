// DATA FOR THE THREE SLIDES -----------------
const slides = [
    {
        title: "NEW ANNOUNCEMENT",
        img: "https://via.placeholder.com/350x200",
        desc: "Latest important announcement for students.",
        isAnnouncement: true
    },
    {
        title: "NEW SEMINAR",
        img: "https://via.placeholder.com/350x200/008000/ffffff",
        desc: "Join our upcoming educational seminar!"
    },
    {
        title: "NEW TOUR",
        img: "https://via.placeholder.com/350x200/204ECF/ffffff",
        desc: "Explore our newest tour destination."
    }
];

let index = 0;

// ELEMENTS ---------------------------------
const title = document.getElementById("carouselTitle");
const centerCard = document.getElementById("centerCard");
const leftCard = document.getElementById("leftCard");
const rightCard = document.getElementById("rightCard");

// UPDATE UI ---------------------------------
function updateCarousel() {
    let prev = (index - 1 + slides.length) % slides.length;
    let next = (index + 1) % slides.length;

    title.textContent = slides[index].title;

    // CENTER CARD
    document.getElementById("centerTitle").textContent = slides[index].title;
    document.getElementById("centerDescription").textContent = slides[index].desc;
    const centerImg = document.getElementById("centerImg");
    if (slides[index].isAnnouncement) {
        centerImg.classList.add("hidden");
    } else {
        centerImg.classList.remove("hidden");
        centerImg.src = slides[index].img;
    }

    // LEFT CARD
    document.getElementById("leftTitle").textContent = slides[prev].title;
    document.getElementById("leftDesc").textContent = slides[prev].desc;
    const leftImg = document.getElementById("leftImg");
    if (slides[prev].isAnnouncement) {
        leftImg.classList.add("hidden");
    } else {
        leftImg.classList.remove("hidden");
        leftImg.src = slides[prev].img;
    }

    // RIGHT CARD
    document.getElementById("rightTitle").textContent = slides[next].title;
    document.getElementById("rightDesc").textContent = slides[next].desc;
    const rightImg = document.getElementById("rightImg");
    if (slides[next].isAnnouncement) {
        rightImg.classList.add("hidden");
    } else {
        rightImg.classList.remove("hidden");
        rightImg.src = slides[next].img;
    }
}

// SLIDE CONTROLS -----------------------------
function nextSlide() {
    index = (index + 1) % slides.length;
    updateCarousel();
}

function prevSlide() {
    index = (index - 1 + slides.length) % slides.length;
    updateCarousel();
}

// INITIAL LOAD ------------------------------
updateCarousel();
