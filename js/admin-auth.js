document.addEventListener('DOMContentLoaded', function() {
    // Check if the user is logged in
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '../admin-login.html';
        return;
    }

    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('adminToken');
            window.location.href = '../admin-login.html';
        });
    }

    // You can add more authentication-related functions here
});
