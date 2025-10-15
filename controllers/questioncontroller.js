const Exam = require("../models/Exam");
const MCQ = require("./../models/MCQQuestion");
const AllMCQ = require("../models/MCQschema");

exports.getQuestion = async (req, res,) => {
    try {
        const exam = await Exam.findById(req.params.examId)
            .populate("mcqQuestions");

        res.render("view_questions", {
            exam,
            mcqQuestions: exam.mcqQuestions || []
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading questions.");
    }
};

exports.getaddmcqQuestion = async (req, res) => {
    res.render("add_mcq", { examId: req.params.examId });
}

exports.postaddmcqQuestion = async (req, res) => {
    try {
        const { question, options, correctAnswer, marks, classification, level } = req.body;
        
        // Validate required fields
        if (!question || !options || !correctAnswer || !classification || !level) {
            return res.status(400).send("All fields are required.");
        }

        // Create and save the main MCQ
        const newMCQ = new MCQ({
            examId: req.params.examId,
            classification,
            level,
            question,
            options: options.split(",").map(opt => opt.trim()), // Trim whitespace
            correctAnswer: correctAnswer.trim(),
            marks: parseInt(marks) || 1
        });
        
        await newMCQ.save();
        console.log("MCQ saved successfully:", newMCQ._id);

        // Update the exam with the new MCQ
        await Exam.findByIdAndUpdate(req.params.examId, { 
            $push: { mcqQuestions: newMCQ._id } 
        });
        console.log("Exam updated successfully");

        // Handle AllMCQ saving with better error handling
        try {
            // Normalize the question text to handle minor differences
            const normalizeText = (text) => {
                if (!text || typeof text !== 'string') return '';
                return text
                    .toLowerCase()
                    .replace(/\s+/g, ' ')
                    .replace(/['",.?!;:()\[\]{}]/g, '')
                    .trim();
            };

            const normalizedQuestion = normalizeText(question);

            // Simple duplicate check using regex (more MongoDB-friendly)
            const existingQuestion = await AllMCQ.findOne({
                question: { 
                    $regex: new RegExp(`^${normalizedQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') 
                }
            }).limit(1);

            // Alternative approach: Load all questions and check in JavaScript
            // This is more reliable but less efficient for large datasets
            if (!existingQuestion) {
                // Get all questions to check for duplicates in JavaScript
                const allQuestions = await AllMCQ.find({}, { question: 1 }).lean();
                
                const isDuplicate = allQuestions.some(existingQ => {
                    const existingNormalized = normalizeText(existingQ.question);
                    return existingNormalized === normalizedQuestion;
                });

                if (!isDuplicate) {
                    const allMCQEntry = new AllMCQ({
                        classification,
                        level,
                        question,
                        options: options.split(",").map(opt => opt.trim()),
                        correctAnswer: correctAnswer.trim(),
                        marks: parseInt(marks) || 1
                    });
                    
                    await allMCQEntry.save();
                    console.log("Question saved to AllMCQ collection with ID:", allMCQEntry._id);
                    
                    // Update the MCQ record with the AllMCQ ID
                    await MCQ.findByIdAndUpdate(newMCQ._id, {
                        questionId: allMCQEntry._id
                    });
                    console.log("MCQ updated with questionId:", allMCQEntry._id);
                } else {
                    console.log("Question already exists in AllMCQ collection, skipping...");
                    
                    // If duplicate exists, update MCQ with existing AllMCQ ID
                    const existingAllMCQ = allQuestions.find(existingQ => {
                        const existingNormalized = normalizeText(existingQ.question);
                        return existingNormalized === normalizedQuestion;
                    });
                    
                    if (existingAllMCQ) {
                        await MCQ.findByIdAndUpdate(newMCQ._id, {
                            questionId: existingAllMCQ._id
                        });
                        console.log("MCQ updated with existing questionId:", existingAllMCQ._id);
                    }
                }
            } else {
                console.log("Question already exists in AllMCQ collection, skipping...");
                
                // Update MCQ with existing AllMCQ ID
                await MCQ.findByIdAndUpdate(newMCQ._id, {
                    questionId: existingQuestion._id
                });
                console.log("MCQ updated with existing questionId:", existingQuestion._id);
            }
        } catch (allMCQError) {
            // Log the AllMCQ error but don't fail the main operation
            console.error("Error saving to AllMCQ collection:", allMCQError.message);
            // Continue with redirect since main MCQ was saved successfully
        }

        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        console.error("Error in postaddmcqQuestion:", error);
        
        // More specific error messages
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).send(`Validation Error: ${errors.join(', ')}`);
        }
        
        if (error.name === 'CastError') {
            return res.status(400).send("Invalid data format provided.");
        }
        
        res.status(500).send(`Error adding MCQ: ${error.message}`);
    }
}

exports.getEditmcqQuestion = async (req, res) => {
   try {
        const mcq = await MCQ.findById(req.params.mcqId);
        if (!mcq) return res.status(404).send("MCQ not found");
        res.render("edit_mcq", { mcq, examId: req.params.examId });
    } catch (error) {
        res.status(500).send("Error fetching MCQ question");
    }
}

exports.postEditmcqQuestion = async (req, res) => {
    try {
        await MCQ.findByIdAndUpdate(req.params.mcqId, req.body);
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        res.status(500).send("Error updating MCQ question");
    }
}

exports.deleteMCQ = async (req, res) => {
    const { examId, mcqId } = req.params;
    try {
        await MCQ.findByIdAndDelete(req.params.mcqId);

         // Remove the MCQ ID from the exam's mcqQuestions array
        await Exam.findByIdAndUpdate(
            examId,
            { $pull: { mcqQuestions: mcqId } },
            { new: true }
        );
        
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        res.status(500).send("Error deleting MCQ question");
    }
}