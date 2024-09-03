document.addEventListener('DOMContentLoaded', function() {
    fetchUsers(); 
    loadUserCount(); 
});



function fetchUsers() {
    fetch('http://localhost:3000/users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const usersTable = document.getElementById('usersTable');
                if (usersTable) {
                    const tbody = usersTable.querySelector('tbody');
                    if (tbody) {
                        tbody.innerHTML = '';
                        data.users.forEach(user => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td><input type="checkbox" class="userSelector" data-id="${user.id}"></td>
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td>${user.gender}</td>
                                <td>${user.user_type}</td>
                            `;
                            tbody.appendChild(row);
                        });
                        addCheckboxListeners();
                        updateDeleteButtonState();
                        updateUserCount(data.users.length);
                    } else {
                        console.error('tbody not found in usersTable');
                    }
                } else {
                    console.error('usersTable not found');
                }
            } else {
                console.error('Failed to fetch users');
            }
        })
        .catch(error => console.error('Error fetching users:', error));
}

function updateUserCount(count) {
    const userCountElement = document.getElementById('userCount');
    if (userCountElement) {
        userCountElement.textContent = count;
    }
}

function loadUserCount() {
    fetch('http://localhost:3000/users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const userCount = data.users.length;
                updateUserCount(userCount);
            } else {
                updateUserCount('Error');
            }
        })
        .catch(error => {
            console.error('Error fetching user count:', error);
            updateUserCount('Error');
        });
}


document.addEventListener('DOMContentLoaded', function() {
    const postEventForm = document.getElementById('postEventForm');
    if (postEventForm) {
        postEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(postEventForm);
            
            fetch('http://localhost:3000/post-event', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
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
        });
    }



    
    function loadEvents() {
        fetch('http://localhost:3000/events')
            .then(response => response.json())
            .then(events => {
                const eventsTable = document.querySelector('.manage-events table tbody');
                if (eventsTable) {
                    eventsTable.innerHTML = '';
                    events.forEach(event => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${event.title}</td>
                            <td>${event.description.substring(0, 50)}...</td>
                            <td>${new Date(event.event_date).toLocaleString()}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deleteEvent(${event.id})">Delete</button>
                            </td>
                        `;
                        eventsTable.appendChild(row);
                    });
                } else {
                    console.error('Events table not found');
                }
            })
            .catch(error => console.error('Error fetching events:', error));
    }

    loadEvents(); // Initial load of events
});

function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        fetch(`http://localhost:3000/remove-event/${eventId}`, { method: 'DELETE' })
            .then(response => response.json())
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