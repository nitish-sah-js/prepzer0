/**
 * Automatic Session Validation Checker
 * Periodically checks if the current session is still valid
 * Logs out the user if they've been logged in from another device
 */

(function() {
    // Check interval: every 30 seconds
    const CHECK_INTERVAL = 30000;

    // Flag to prevent multiple redirects
    let isRedirecting = false;

    async function checkSession() {
        if (isRedirecting) return;

        try {
            const response = await fetch('/api/check-session', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!data.valid) {
                console.log('Session is no longer valid. Reason:', data.reason);

                if (data.reason === 'session_mismatch') {
                    // Session mismatch - user logged in from another device
                    isRedirecting = true;
                    alert('You have been logged out because you logged in from another device.');
                    window.location.href = '/authenticate/login';
                } else if (data.reason === 'not_authenticated' || data.reason === 'user_not_found') {
                    // Not authenticated - redirect silently
                    isRedirecting = true;
                    window.location.href = '/authenticate/login';
                }
            } else {
                console.log('Session is valid');
            }
        } catch (error) {
            console.error('Error checking session:', error);
            // Don't redirect on network errors - might be temporary
        }
    }

    // Start periodic checking when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Initial check after 5 seconds
            setTimeout(checkSession, 5000);
            // Then check every 30 seconds
            setInterval(checkSession, CHECK_INTERVAL);
        });
    } else {
        // DOM already loaded
        setTimeout(checkSession, 5000);
        setInterval(checkSession, CHECK_INTERVAL);
    }

    console.log('Session checker initialized - checking every', CHECK_INTERVAL / 1000, 'seconds');
})();
