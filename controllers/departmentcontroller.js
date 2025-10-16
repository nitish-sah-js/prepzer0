const Department = require('../models/Department');
const User = require('../models/usermodel');

/**
 * Get all departments page
 * GET /admin/departments
 */
exports.getDepartments = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/admin/login');
        }

        const user = await User.findById(req.user._id);

        if (user.usertype !== 'admin') {
            return res.status(403).send('Only admins can manage departments');
        }

        const departments = await Department.find().sort({ code: 1 });

        res.render('departments', {
            pic: user.imageurl,
            logged_in: "true",
            departments: departments,
            user: user
        });
    } catch (error) {
        console.error('Error loading departments:', error);
        res.status(500).send('Server error');
    }
};

/**
 * Create new department
 * POST /admin/departments/create
 */
exports.createDepartment = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await User.findById(req.user._id);

        if (user.usertype !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { code, name, fullName, description } = req.body;

        // Check if department code already exists
        const existingDept = await Department.findOne({ code: code.toLowerCase() });
        if (existingDept) {
            return res.status(400).json({
                success: false,
                message: 'Department code already exists'
            });
        }

        const department = new Department({
            code: code.toLowerCase(),
            name,
            fullName,
            description,
            createdBy: user._id
        });

        await department.save();

        res.json({
            success: true,
            message: 'Department created successfully',
            department: department
        });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

/**
 * Update department
 * PUT /admin/departments/:id
 */
exports.updateDepartment = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await User.findById(req.user._id);

        if (user.usertype !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;
        const { code, name, fullName, description, active } = req.body;

        const department = await Department.findById(id);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        // Check if new code conflicts with existing department
        if (code && code.toLowerCase() !== department.code) {
            const existingDept = await Department.findOne({
                code: code.toLowerCase(),
                _id: { $ne: id }
            });
            if (existingDept) {
                return res.status(400).json({
                    success: false,
                    message: 'Department code already exists'
                });
            }
        }

        // Update fields
        if (code) department.code = code.toLowerCase();
        if (name) department.name = name;
        if (fullName !== undefined) department.fullName = fullName;
        if (description !== undefined) department.description = description;
        if (active !== undefined) department.active = active;

        await department.save();

        res.json({
            success: true,
            message: 'Department updated successfully',
            department: department
        });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

/**
 * Delete department
 * DELETE /admin/departments/:id
 */
exports.deleteDepartment = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await User.findById(req.user._id);

        if (user.usertype !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;

        const department = await Department.findById(id);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        // Check if department is used in any exams or users
        const Exam = require('../models/Exam');
        const examCount = await Exam.countDocuments({ departments: department.code });

        if (examCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete department. It is used in ${examCount} exam(s)`
            });
        }

        await Department.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Department deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

/**
 * Toggle department active status
 * PATCH /admin/departments/:id/toggle
 */
exports.toggleDepartmentStatus = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const user = await User.findById(req.user._id);

        if (user.usertype !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;

        const department = await Department.findById(id);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        department.active = !department.active;
        await department.save();

        res.json({
            success: true,
            message: `Department ${department.active ? 'activated' : 'deactivated'} successfully`,
            department: department
        });
    } catch (error) {
        console.error('Error toggling department status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

/**
 * Get active departments (for dropdowns/selections)
 * GET /api/departments/active
 */
exports.getActiveDepartments = async (req, res) => {
    try {
        const departments = await Department.find({ active: true })
            .select('code name fullName')
            .sort({ code: 1 });

        res.json({
            success: true,
            departments: departments
        });
    } catch (error) {
        console.error('Error fetching active departments:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
