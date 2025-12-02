// DATA FOR THE THREE SLIDES -----------------
const slides = [
    {
        title: "NEW ANNOUNCEMENT",
        img: "https://via.placeholder.com/350x200",
        desc: "Latest important announcement for students."
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
const centerDescription = document.getElementById("centerDescription");

// UPDATE UI ---------------------------------
function updateCarousel() {
    let prev = (index - 1 + slides.length) % slides.length;
    let next = (index + 1) % slides.length;

    title.textContent = slides[index].title;

    centerCard.querySelector("img").src = slides[index].img;
    centerDescription.textContent = slides[index].desc;

    leftCard.querySelector("img").src = slides[prev].img;
    rightCard.querySelector("img").src = slides[next].img;
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
