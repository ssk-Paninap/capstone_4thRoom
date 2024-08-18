document.addEventListener('DOMContentLoaded', function() {
    fetch('/events')
        .then(response => response.json())
        .then(events => {
            const eventsListEl = document.getElementById('eventsList');
            events.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = 'col-md-6 mb-4';
                eventEl.innerHTML = `
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${event.title}</h5>
                            <p class="card-text">${event.description.substring(0, 100)}...</p>
                            <img src="${event.image_url}" class="card-img-top mb-2" alt="${event.title}" style="height: 200px; object-fit: cover;">
                            <button class="btn btn-primary" type="button" data-bs-toggle="collapse" data-bs-target="#event${event.id}" aria-expanded="false">
                                Read More
                            </button>
                            <div class="collapse mt-2" id="event${event.id}">
                                <div class="card card-body">
                                    ${event.description}
                                    <p class="mt-2"><strong>Date:</strong> ${new Date(event.event_date).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                eventsListEl.appendChild(eventEl);
            });
        })
        .catch(error => console.error('Error fetching events:', error));
});