document.addEventListener('DOMContentLoaded', function() {
    loadEvents();

    // Get the modal
    var modal = document.getElementById("eventModal");

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Add event listeners for navigation buttons
    document.getElementById('prevButton').addEventListener('click', scrollEvents.bind(null, -1));
    document.getElementById('nextButton').addEventListener('click', scrollEvents.bind(null, 1));
});

let currentIndex = 0;

function loadEvents() {
    fetch('http://localhost:3000/events')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data)) {
            throw new Error('Server did not return an array of events');
        }
        const eventsContainer = document.getElementById('eventsContainer');
        if (eventsContainer) {
            eventsContainer.innerHTML = '';
            data.forEach(event => {
                const eventElement = createEventElement(event);
                eventsContainer.appendChild(eventElement);
            });
            updateNavButtons();
        } else {
            console.error('Events container not found');
        }
    })
    .catch(error => {
        console.error('Error fetching events:', error);
        alert('Error fetching events: ' + error.message);
    });
}


function createEventElement(event) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-card flex-shrink-0 mx-2';
    eventDiv.style.width = '300px'; // Set a fixed width for each event card
    
    let eventHTML = `
        <div class="card h-100">
            <img src="${event.event_image || '#'}" class="card-img-top" alt="Event Image" height="200px" width="auto">
            <div class="card-body">
                <h5 class="card-title text-dark">${event.title}</h5>
                <p class="card-text">Date: ${new Date(event.event_date).toLocaleDateString()}</p>
                <p class="card-text">Location: ${event.location || 'Not specified'}</p>
                <a href="#" class="btn btn-primary event-link">View Details</a>
            </div>
        </div>
    `;

    eventDiv.innerHTML = eventHTML;
    eventDiv.querySelector('.event-link').onclick = (e) => {
        e.preventDefault();
        showEventDetails(event);
    };
    return eventDiv;
}
function scrollEvents(direction) {
    const container = document.getElementById('eventsContainer');
    const eventCards = container.children;
    const cardWidth = eventCards[0].offsetWidth + 16; // Width + margin

    currentIndex += direction;
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex > eventCards.length - 1) currentIndex = eventCards.length - 1;

    container.scrollTo({
        left: currentIndex * cardWidth,
        behavior: 'smooth'
    });

    updateNavButtons();
}

function updateNavButtons() {
    const container = document.getElementById('eventsContainer');
    const eventCards = container.children;
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    prevButton.style.display = currentIndex === 0 ? 'none' : 'block';
    nextButton.style.display = currentIndex >= eventCards.length - 1 ? 'none' : 'block';
}

function showEventDetails(event) {
    const modal = document.getElementById("eventModal");
    const modalContent = document.querySelector(".modal-content");

    let modalHTML = `
        <span class="close">&times;</span>
        <h2>${event.title}</h2>
        <p class="modal-date">Date: ${new Date(event.event_date).toLocaleString()}</p>
        <p class="modal-location">Location: ${event.location || 'Not specified'}</p>
        <img src="${event.event_image || '#'}" alt="${event.title}" class="modal-image">
        <div class="modal-description">
            ${event.description}
        </div>
    `;

    modalContent.innerHTML = modalHTML;

    modal.style.display = "block";

    // Reattach the close event to the new close button
    document.querySelector('.close').onclick = function() {
        modal.style.display = "none";
    }

    // Close the modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

// Add this to close the modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById("eventModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
