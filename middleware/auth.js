/**
 * Authentication and Authorization Middleware
 * Provides role-based access control for routes
 */

/**
 * Ensure user is authenticated
 * Redirects to login if not authenticated
 */
function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        // Store original URL for redirect after login
        req.session.returnTo = req.originalUrl;
        return res.redirect('/authenticate/login');
    }
    next();
}

/**
 * Ensure user is an admin or teacher
 * Returns 403 if user doesn't have required role
 */
function requireAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/admin/login');
    }

    if (req.user.usertype !== 'admin' && req.user.usertype !== 'teacher') {
        return res.status(403).render('error', {
            message: 'Unauthorized: Admin or Teacher access required',
            error: { status: 403 }
        });
    }

    next();
}

/**
 * Ensure user is a student
 * Returns 403 if user is not a student
 */
function requireStudent(req, res, next) {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/authenticate/login');
    }

    if (req.user.usertype !== 'student') {
        return res.status(403).render('error', {
            message: 'Unauthorized: Student access required',
            error: { status: 403 }
        });
    }

    next();
}

/**
 * Ensure user is a super admin
 * Returns 403 if user doesn't have admin_access
 */
function requireSuperAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/admin/login');
    }

    if (req.user.usertype !== 'admin' || !req.user.admin_access) {
        return res.status(403).render('error', {
            message: 'Unauthorized: Super Admin access required',
            error: { status: 403 }
        });
    }

    next();
}

/**
 * API version - returns JSON instead of rendering
 */
function requireAuthAPI(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
}

function requireAdminAPI(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.usertype !== 'admin' && req.user.usertype !== 'teacher') {
        return res.status(403).json({
            success: false,
            message: 'Admin or Teacher access required'
        });
    }

    next();
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireStudent,
    requireSuperAdmin,
    requireAuthAPI,
    requireAdminAPI
};
