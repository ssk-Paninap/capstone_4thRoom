document.addEventListener('DOMContentLoaded', function() {
    const postEventForm = document.getElementById('postEventForm');
    if (postEventForm) {
        postEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(postEventForm);
            
            // Convert image to base64
            const imageFile = formData.get('eventImage');
            if (imageFile.size > 0) {
                const reader = new FileReader();
                reader.readAsDataURL(imageFile);
                reader.onload = function() {
                    const base64Image = reader.result;
                    postEvent(formData, base64Image);
                };
                reader.onerror = function(error) {
                    console.error('Error reading file:', error);
                    alert('Error reading file: ' + error);
                };
            } else {
                postEvent(formData, null);
            }
        });
    }

    loadEvents(); // Initial load of events
});

function postEvent(formData, base64Image) {
    const eventData = {
        title: formData.get('title'),
        description: formData.get('description'),
        eventDate: formData.get('eventDate'),
        location: formData.get('location'),
        eventImage: base64Image
    };

    fetch('http://localhost:3000/post-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            alert(result.message);
            postEventForm.reset();
            loadEvents(); // Refresh the events list
        } else {
            throw new Error(result.message);
        }
    })
    .catch(error => {
        console.error('Error posting event:', error);
        alert('Error posting event: ' + error.message);
    });
}

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
        const eventsTableBody = document.querySelector('#eventsTable tbody');
        if (eventsTableBody) {
            eventsTableBody.innerHTML = '';
            data.forEach(event => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${event.title}</td>
                    <td>${event.description.substring(0, 50)}...</td>
                    <td>${new Date(event.event_date).toLocaleString()}</td>
                    <td>${event.location}</td>
                    <td>
                        <img src="${event.event_image}" alt="Event Image" style="width: 50px; height: 50px;">
                    </td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteEvent(${event.id})">Delete</button>
                    </td>
                `;
                eventsTableBody.appendChild(row);
            });
        } else {
            console.error('Events table body not found');
        }
    })
    .catch(error => {
        console.error('Error fetching events:', error);
        alert('Error fetching events: ' + error.message);
    });
}


function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        fetch(`http://localhost:3000/remove-event/${eventId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                alert(result.message);
                loadEvents(); // Refresh the events list
            } else {
                throw new Error(result.message);
            }
        })
        .catch(error => {
            console.error('Error deleting event:', error);
            alert('Error deleting event: ' + error.message);
        });
    }
}