/**
 * Utility functions for calculating student semester dynamically
 * Based on USN year and current date
 */

/**
 * Calculates the current semester for a student based on their USN year
 * @param {number} usnYear - Two-digit year from USN (e.g., 22 from 1BY22CS001)
 * @param {Date} currentDate - Current date (defaults to now)
 * @returns {number} Current semester (1-8)
 */
function calculateCurrentSemester(usnYear, currentDate = new Date()) {
    // Convert 2-digit year to full year (e.g., 22 -> 2022)
    const admissionYear = 2000 + parseInt(usnYear);

    // Get current year and month
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12

    // Determine current academic year and semester term
    // Academic year typically runs from July/August
    // Odd semesters (1,3,5,7): August - December
    // Even semesters (2,4,6,8): January - June

    let academicYear;
    let isEvenSemester;

    if (currentMonth >= 1 && currentMonth <= 6) {
        // January to June - Even semester
        academicYear = currentYear;
        isEvenSemester = true;
    } else {
        // July to December - Odd semester
        academicYear = currentYear;
        isEvenSemester = false;
    }

    // Calculate years since admission
    const yearsSinceAdmission = academicYear - admissionYear;

    // Calculate base semester (2 semesters per year)
    let semester = (yearsSinceAdmission * 2);

    // Add current term offset
    if (isEvenSemester) {
        semester += 2; // Even semester (2, 4, 6, 8)
    } else {
        semester += 1; // Odd semester (1, 3, 5, 7)
    }

    // Clamp to valid range (1-8)
    if (semester < 1) semester = 1;
    if (semester > 8) semester = 8;

    return semester;
}

/**
 * Calculates semester at the time of signup
 * New students joining in odd semester start at Sem 1, even semester start at Sem 2
 * @param {number} usnYear - Two-digit year from USN
 * @param {Date} signupDate - Date of signup (defaults to now)
 * @returns {number} Initial semester (1 or 2)
 */
function calculateInitialSemester(usnYear, signupDate = new Date()) {
    const currentYear = signupDate.getFullYear();
    const currentMonth = signupDate.getMonth() + 1;
    const usnFullYear = 2000 + parseInt(usnYear);

    // If USN year matches current year, they're a new student
    if (usnFullYear === currentYear) {
        // New students in odd semester (July-Dec) start at Sem 1
        // New students in even semester (Jan-Jun) start at Sem 2
        return (currentMonth >= 1 && currentMonth <= 6) ? 2 : 1;
    }

    // Otherwise, calculate their current semester
    return calculateCurrentSemester(usnYear, signupDate);
}

/**
 * Gets the current academic term info
 * @param {Date} currentDate - Current date (defaults to now)
 * @returns {Object} { academicYear, semester: 'odd'|'even', semesterNumber: 1|2 }
 */
function getCurrentAcademicTerm(currentDate = new Date()) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (currentMonth >= 1 && currentMonth <= 6) {
        return {
            academicYear: `${currentYear - 1}-${currentYear}`,
            semester: 'even',
            semesterNumber: 2
        };
    } else {
        return {
            academicYear: `${currentYear}-${currentYear + 1}`,
            semester: 'odd',
            semesterNumber: 1
        };
    }
}

module.exports = {
    calculateCurrentSemester,
    calculateInitialSemester,
    getCurrentAcademicTerm
};
