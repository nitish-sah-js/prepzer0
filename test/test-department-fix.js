/**
 * Test script to verify that department codes are parsed correctly
 * including longer department codes like CSEDS
 */

// Test USN parsing with the updated regex
function testUSNParsing() {
    // Updated regex to handle variable-length department codes (2-10 characters)
    const regex = /^(\d{0,2})([a-z]{2})(\d{2})([a-z]{2,10})(\d{3})$/;

    const testCases = [
        { usn: "1by22cs001", expectedDept: "cs", description: "Standard CS department" },
        { usn: "1by22cseds001", expectedDept: "cseds", description: "CSEDS department (5 chars)" },
        { usn: "1by22isands001", expectedDept: "isands", description: "ISANDS department (6 chars)" },
        { usn: "1by22ec001", expectedDept: "ec", description: "Standard EC department" },
        { usn: "1by22ai001", expectedDept: "ai", description: "Standard AI department" },
        { usn: "1td19cs045", expectedDept: "cs", description: "Different college code TD" },
        { usn: "by22cs001", expectedDept: "cs", description: "No leading digit" },
        { usn: "1by22csedsmlds001", expectedDept: "csedsmlds", description: "9 character department" },
        { usn: "1by22csedsmlds1001", expectedDept: null, description: "Invalid - 4 digit roll number" },
        { usn: "1by22c001", expectedDept: null, description: "Invalid - 1 char department" },
    ];

    console.log("=" + "=".repeat(70));
    console.log("TESTING USN PARSING WITH UPDATED REGEX");
    console.log("=" + "=".repeat(70));

    let passed = 0;
    let failed = 0;

    testCases.forEach(test => {
        const match = test.usn.match(regex);

        if (test.expectedDept === null) {
            // Should not match
            if (match) {
                console.log(`❌ FAILED: ${test.description}`);
                console.log(`   USN: ${test.usn}`);
                console.log(`   Expected: No match (invalid USN)`);
                console.log(`   Got: Matched with department "${match[4]}"`);
                failed++;
            } else {
                console.log(`✅ PASSED: ${test.description}`);
                console.log(`   USN: ${test.usn} - Correctly rejected as invalid`);
                passed++;
            }
        } else {
            // Should match
            if (!match) {
                console.log(`❌ FAILED: ${test.description}`);
                console.log(`   USN: ${test.usn}`);
                console.log(`   Expected department: ${test.expectedDept}`);
                console.log(`   Got: No match (rejected as invalid)`);
                failed++;
            } else {
                const department = match[4];
                if (department === test.expectedDept) {
                    console.log(`✅ PASSED: ${test.description}`);
                    console.log(`   USN: ${test.usn} → Department: ${department}`);
                    passed++;
                } else {
                    console.log(`❌ FAILED: ${test.description}`);
                    console.log(`   USN: ${test.usn}`);
                    console.log(`   Expected department: ${test.expectedDept}`);
                    console.log(`   Got department: ${department}`);
                    failed++;
                }
            }
        }
        console.log();
    });

    console.log("=" + "=".repeat(70));
    console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
    console.log("=" + "=".repeat(70));

    // Show full parsing example
    console.log("\nFULL PARSING EXAMPLE:");
    console.log("-" + "-".repeat(70));

    const exampleUSN = "1by22cseds001";
    const exampleMatch = exampleUSN.match(regex);

    if (exampleMatch) {
        console.log(`USN: ${exampleUSN}`);
        console.log(`Parsed components:`);
        console.log(`  - Leading digits: "${exampleMatch[1]}" (position 1)`);
        console.log(`  - College code: "${exampleMatch[2]}" (position 2)`);
        console.log(`  - Year: "${exampleMatch[3]}" → 20${exampleMatch[3]} (position 3)`);
        console.log(`  - Department: "${exampleMatch[4]}" (position 4) ← NOW SUPPORTS 2-10 CHARS`);
        console.log(`  - Roll number: "${exampleMatch[5]}" (position 5)`);
        console.log(`\nComplete parsing:`);
        console.log(`  College: ${exampleMatch[1]}${exampleMatch[2]}`);
        console.log(`  Year: 20${exampleMatch[3]}`);
        console.log(`  Department: ${exampleMatch[4]} ✅ FULL DEPARTMENT CODE PRESERVED`);
        console.log(`  Roll: ${exampleMatch[5]}`);
    }
}

// Run the test
testUSNParsing();