const Classification = require('../models/Classification');
const MCQQuestion = require('../models/MCQschema');
const User = require('../models/usermodel');

/**
 * Display the classification management page
 * GET /admin/classifications
 */
exports.getClassifications = async (req, res) => {
    try {
        // Verify user is admin or teacher
        if (!req.isAuthenticated()) {
            return res.redirect('/admin/login');
        }

        const user = await User.findById(req.user._id);
        if (user.usertype !== 'admin' && user.usertype !== 'teacher') {
            return res.status(403).render('error', {
                message: 'Unauthorized access'
            });
        }

        // Get all classifications with usage count
        const classifications = await Classification.find().sort({ name: 1 });

        // Get usage count for each classification
        for (let classification of classifications) {
            const count = await MCQQuestion.countDocuments({
                classification: classification.name
            });
            classification.usageCount = count;
        }

        res.render('classifications', {
            user: user,
            classifications: classifications,
            successMsg: req.flash('success'),
            errorMsg: req.flash('error')
        });
    } catch (error) {
        console.error('Error fetching classifications:', error);
        res.status(500).render('error', {
            message: 'Failed to load classifications'
        });
    }
};

/**
 * Add a new classification
 * POST /admin/classifications/add
 */
exports.addClassification = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        const user = await User.findById(req.user._id);
        if (user.usertype !== 'admin' && user.usertype !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Classification name is required'
            });
        }

        const trimmedName = name.trim();

        // Check if classification already exists
        const existing = await Classification.findOne({
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'This classification already exists'
            });
        }

        // Create new classification
        const newClassification = new Classification({
            name: trimmedName,
            description: description || '',
            createdBy: req.user._id,
            active: true
        });

        await newClassification.save();

        res.json({
            success: true,
            message: 'Classification added successfully',
            classification: newClassification
        });

    } catch (error) {
        console.error('Error adding classification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add classification'
        });
    }
};

/**
 * Update a classification
 * PUT /admin/classifications/:id
 */
exports.updateClassification = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        const user = await User.findById(req.user._id);
        if (user.usertype !== 'admin' && user.usertype !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { id } = req.params;
        const { name, description, active } = req.body;

        const classification = await Classification.findById(id);
        if (!classification) {
            return res.status(404).json({
                success: false,
                message: 'Classification not found'
            });
        }

        // If name is being changed, check for duplicates
        if (name && name !== classification.name) {
            const existing = await Classification.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                _id: { $ne: id }
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'A classification with this name already exists'
                });
            }

            // Update all questions with the old classification name
            await MCQQuestion.updateMany(
                { classification: classification.name },
                { classification: name.trim() }
            );

            classification.name = name.trim();
        }

        if (description !== undefined) {
            classification.description = description;
        }

        if (active !== undefined) {
            classification.active = active;
        }

        await classification.save();

        res.json({
            success: true,
            message: 'Classification updated successfully',
            classification: classification
        });

    } catch (error) {
        console.error('Error updating classification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update classification'
        });
    }
};

/**
 * Delete a classification
 * DELETE /admin/classifications/:id
 */
exports.deleteClassification = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        const user = await User.findById(req.user._id);
        if (user.usertype !== 'admin' && user.usertype !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { id } = req.params;

        const classification = await Classification.findById(id);
        if (!classification) {
            return res.status(404).json({
                success: false,
                message: 'Classification not found'
            });
        }

        // Check if classification is being used
        const usageCount = await MCQQuestion.countDocuments({
            classification: classification.name
        });

        if (usageCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete classification. It is being used by ${usageCount} question(s).`
            });
        }

        await Classification.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Classification deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting classification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete classification'
        });
    }
};

/**
 * Get all active classifications (for API/dropdown use)
 * GET /admin/api/classifications
 */
exports.getActiveClassifications = async (req, res) => {
    try {
        const classifications = await Classification.find({ active: true })
            .select('name description')
            .sort({ name: 1 });

        res.json({
            success: true,
            classifications: classifications
        });

    } catch (error) {
        console.error('Error fetching active classifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch classifications'
        });
    }
};