// Function to fetch and display recent updates
function fetchRecentUpdates() {
    fetch('http://localhost:3000/recent-updates')  
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Server error:', data.error);
                displayError('Error fetching updates. Please try again later.');
            } else {
                displayRecentUpdates('question-recent-updates', data.questionUpdates || []);
                displayRecentUpdates('events-recent-updates', data.eventUpdates || []);
                displayRecentUpdates('user-recent-updates', data.userUpdates || []);
            }
        })
        .catch(error => {
            console.error('Error fetching recent updates:', error);
            displayError('Error fetching updates. Please try again later.');
        });
}

// Function to display updates in the appropriate section
function displayRecentUpdates(sectionId, updates) {
    const section = document.getElementById(sectionId);
    if (!section) {
        console.error(`Section with id ${sectionId} not found`);
        return;
    }
    
    if (!Array.isArray(updates) || updates.length === 0) {
        section.innerHTML = '<p>No recent updates available.</p>';
    } else {
        const list = document.createElement('ul');
        updates.forEach(update => {
            const li = document.createElement('li');
            li.textContent = `${update.action} ${update.item_type}: ${update.item_name} (${new Date(update.timestamp).toLocaleString()})`;
            list.appendChild(li);
        });
        section.innerHTML = '';
        section.appendChild(list);
    }
}

// Function to display error messages
function displayError(message) {
    const errorSections = ['question-recent-updates', 'events-recent-updates', 'user-recent-updates'];
    errorSections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.innerHTML = `<p class="text-danger">${message}</p>`;
        }
    });
}

// Fetch updates when the page loads
document.addEventListener('DOMContentLoaded', fetchRecentUpdates);
fetchRecentUpdates()