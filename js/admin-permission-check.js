document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const permissionMap = {
        'dashboard': 'dashboard_view',
        'bursar': 'bursar_access',
        'library': 'library_access',
        'osa': 'osa_access',
        'guidance': 'guidance_access',
        'registrar': 'registrar_access',
        'course-department': 'course_department_access',
        'manage-admin': 'manage_admin_access',
        'avp': 'avp_access'
    };

    const requiredPermission = permissionMap[currentPage];

    if (!requiredPermission) {
        console.error('Unknown page:', currentPage);
        return;
    }

    fetch(`http://localhost:3000/admin/check-permission/${requiredPermission}`, {
        headers: {
            'Authorization': localStorage.getItem('adminToken')
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('HTTP status ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (!data.hasPermission) {
            return fetch('http://localhost:3000/admin/check-role', {
                headers: {
                    'Authorization': localStorage.getItem('adminToken')
                }
            }).then(response => response.json());
        } else {
            return { isPrimaryAdmin: false, hasPermission: true };
        }
    })
    .then(data => {
        if (data.isPrimaryAdmin || data.hasPermission) {
            // User has permission or is primary admin, show the page
            document.body.style.display = 'block';
        } else {
            // User doesn't have permission, show centered alert
            const alertOverlay = document.createElement('div');
            alertOverlay.style.position = 'fixed';
            alertOverlay.style.top = '0';
            alertOverlay.style.right = '0';
            alertOverlay.style.bottom = '0';
            alertOverlay.style.left = '200px'; // Adjust this value based on your sidebar width
            alertOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            alertOverlay.style.color = 'white';
            alertOverlay.style.display = 'flex';
            alertOverlay.style.alignItems = 'center';
            alertOverlay.style.justifyContent = 'center';
            alertOverlay.style.zIndex = '1000';
            alertOverlay.style.fontSize = '24px';
            alertOverlay.style.textAlign = 'center';

            alertOverlay.innerHTML = '<div>Access Denied<br>You do not have permission to view this page.</div>';
            
            document.body.appendChild(alertOverlay);
            
            // Show the page content behind the overlay
            document.body.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (error.message.includes('401')) {
            alert('Your session has expired. Please log in again.');
            window.location.href = '../admin-login.html';
        } else {
            const alertOverlay = document.createElement('div');
            alertOverlay.style.position = 'fixed';
            alertOverlay.style.top = '0';
            alertOverlay.style.right = '0';
            alertOverlay.style.bottom = '0';
            alertOverlay.style.left = '250px'; // Adjust this value based on your sidebar width
            alertOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            alertOverlay.style.color = 'white';
            alertOverlay.style.display = 'flex';
            alertOverlay.style.alignItems = 'center';
            alertOverlay.style.justifyContent = 'center';
            alertOverlay.style.zIndex = '1000';
            alertOverlay.style.fontSize = '24px';
            alertOverlay.style.textAlign = 'center';

            alertOverlay.innerHTML = '<div>An error occurred while checking permissions.</div>';
            
            document.body.appendChild(alertOverlay);
            
            // Show the page content behind the overlay
            document.body.style.display = 'block';
        }
    });
});