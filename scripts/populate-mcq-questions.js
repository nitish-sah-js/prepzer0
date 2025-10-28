require("dotenv").config()
const mongoose = require("mongoose")
// Use MCQschema.js which has the standalone MCQQuestion model (allmcqquestions collection)
const MCQQuestion = require("../models/MCQschema")

// 40 MCQ Questions covering various topics
const mcqQuestions = [
  // Data Structures (8 questions)
  {
    classification: "Data Structures",
    question:
      "What is the time complexity of accessing an element in an array by index?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
    correctAnswer: "O(1)",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Data Structures",
    question: "Which data structure uses LIFO (Last In First Out) principle?",
    options: ["Queue", "Stack", "Array", "Linked List"],
    correctAnswer: "Stack",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Data Structures",
    question:
      "What is the worst-case time complexity of searching in a Binary Search Tree?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: "O(n)",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Data Structures",
    question:
      "Which data structure is best suited for implementing a priority queue?",
    options: ["Array", "Linked List", "Heap", "Stack"],
    correctAnswer: "Heap",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Data Structures",
    question: "In a circular linked list, what does the last node point to?",
    options: ["NULL", "First node", "Previous node", "Itself"],
    correctAnswer: "First node",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Data Structures",
    question: "What is the space complexity of a hash table?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
    correctAnswer: "O(n)",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Data Structures",
    question: "Which traversal technique is used in Depth First Search?",
    options: ["Level order", "Inorder", "Stack-based", "Queue-based"],
    correctAnswer: "Stack-based",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Data Structures",
    question:
      "What is the maximum number of children a node can have in a binary tree?",
    options: ["0", "1", "2", "Unlimited"],
    correctAnswer: "2",
    level: "easy",
    marks: 1,
  },

  // Algorithms (8 questions)
  {
    classification: "Algorithms",
    question: "What is the best-case time complexity of Quick Sort?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correctAnswer: "O(n log n)",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Algorithms",
    question:
      "Which algorithm is used to find the shortest path in a weighted graph?",
    options: ["BFS", "DFS", "Dijkstra", "Kruskal"],
    correctAnswer: "Dijkstra",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Algorithms",
    question: "What is the time complexity of Binary Search?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
    correctAnswer: "O(log n)",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Algorithms",
    question: "Which sorting algorithm is stable?",
    options: ["Quick Sort", "Heap Sort", "Merge Sort", "Selection Sort"],
    correctAnswer: "Merge Sort",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Algorithms",
    question: "What type of algorithm is the Knapsack problem?",
    options: [
      "Greedy",
      "Dynamic Programming",
      "Divide and Conquer",
      "Backtracking",
    ],
    correctAnswer: "Dynamic Programming",
    level: "hard",
    marks: 3,
  },
  {
    classification: "Algorithms",
    question: "Which algorithm technique is used in Merge Sort?",
    options: [
      "Greedy",
      "Dynamic Programming",
      "Divide and Conquer",
      "Backtracking",
    ],
    correctAnswer: "Divide and Conquer",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Algorithms",
    question: "What is the worst-case time complexity of Bubble Sort?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correctAnswer: "O(n²)",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Algorithms",
    question: "Which algorithm is used to find the Minimum Spanning Tree?",
    options: ["Dijkstra", "Prim", "Floyd-Warshall", "Bellman-Ford"],
    correctAnswer: "Prim",
    level: "medium",
    marks: 2,
  },

  // DBMS (6 questions)
  {
    classification: "DBMS",
    question: "What does ACID stand for in database transactions?",
    options: [
      "Atomicity, Consistency, Isolation, Durability",
      "Access, Control, Integrity, Data",
      "Application, Communication, Integration, Database",
      "None of the above",
    ],
    correctAnswer: "Atomicity, Consistency, Isolation, Durability",
    level: "easy",
    marks: 1,
  },
  {
    classification: "DBMS",
    question: "Which normal form eliminates transitive dependency?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correctAnswer: "3NF",
    level: "medium",
    marks: 2,
  },
  {
    classification: "DBMS",
    question: "What type of key uniquely identifies a record in a table?",
    options: ["Foreign Key", "Primary Key", "Candidate Key", "Alternate Key"],
    correctAnswer: "Primary Key",
    level: "easy",
    marks: 1,
  },
  {
    classification: "DBMS",
    question: "Which SQL command is used to retrieve data from a database?",
    options: ["GET", "SELECT", "FETCH", "RETRIEVE"],
    correctAnswer: "SELECT",
    level: "easy",
    marks: 1,
  },
  {
    classification: "DBMS",
    question: "What is a deadlock in database systems?",
    options: [
      "Data corruption",
      "Two or more transactions waiting for each other",
      "Database shutdown",
      "Connection timeout",
    ],
    correctAnswer: "Two or more transactions waiting for each other",
    level: "medium",
    marks: 2,
  },
  {
    classification: "DBMS",
    question: "Which join returns all records from both tables?",
    options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
    correctAnswer: "FULL OUTER JOIN",
    level: "medium",
    marks: 2,
  },

  // Object-Oriented Programming (6 questions)
  {
    classification: "Object-Oriented Programming",
    question: "Which OOP principle allows hiding implementation details?",
    options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
    correctAnswer: "Encapsulation",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Object-Oriented Programming",
    question: "What is method overloading?",
    options: [
      "Same method name with different parameters",
      "Redefining parent method in child",
      "Multiple inheritance",
      "Static method",
    ],
    correctAnswer: "Same method name with different parameters",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Object-Oriented Programming",
    question: "Which keyword is used to inherit a class in Java?",
    options: ["inherits", "extends", "implements", "derive"],
    correctAnswer: "extends",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Object-Oriented Programming",
    question: "What is polymorphism?",
    options: [
      "Multiple forms of a method",
      "Multiple classes",
      "Multiple objects",
      "Multiple inheritance",
    ],
    correctAnswer: "Multiple forms of a method",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Object-Oriented Programming",
    question:
      "Which access modifier makes a member accessible only within the class?",
    options: ["public", "private", "protected", "default"],
    correctAnswer: "private",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Object-Oriented Programming",
    question: "What is an abstract class?",
    options: [
      "A class that cannot be instantiated",
      "A class with no methods",
      "A final class",
      "A static class",
    ],
    correctAnswer: "A class that cannot be instantiated",
    level: "medium",
    marks: 2,
  },

  // Operating Systems (6 questions)
  {
    classification: "Operating Systems",
    question: "What is the main function of an operating system?",
    options: [
      "Compile programs",
      "Manage resources",
      "Create applications",
      "Design hardware",
    ],
    correctAnswer: "Manage resources",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Operating Systems",
    question: "Which scheduling algorithm gives priority to the shortest job?",
    options: ["FCFS", "SJF", "Round Robin", "Priority"],
    correctAnswer: "SJF",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Operating Systems",
    question: "What is a deadlock?",
    options: [
      "Process termination",
      "Circular wait condition",
      "Memory leak",
      "CPU idle time",
    ],
    correctAnswer: "Circular wait condition",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Operating Systems",
    question:
      "Which memory management technique divides memory into fixed-size partitions?",
    options: ["Paging", "Segmentation", "Virtual Memory", "Swapping"],
    correctAnswer: "Paging",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Operating Systems",
    question: "What is thrashing?",
    options: [
      "High CPU usage",
      "Excessive paging activity",
      "Disk failure",
      "Network congestion",
    ],
    correctAnswer: "Excessive paging activity",
    level: "hard",
    marks: 3,
  },
  {
    classification: "Operating Systems",
    question: "Which command is used to display running processes in Linux?",
    options: ["ls", "ps", "top", "Both ps and top"],
    correctAnswer: "Both ps and top",
    level: "easy",
    marks: 1,
  },

  // Networking (6 questions)
  {
    classification: "Networking",
    question: "What does TCP stand for?",
    options: [
      "Transmission Control Protocol",
      "Transfer Control Protocol",
      "Transport Communication Protocol",
      "Transmission Communication Protocol",
    ],
    correctAnswer: "Transmission Control Protocol",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Networking",
    question: "Which layer of OSI model handles routing?",
    options: ["Physical", "Data Link", "Network", "Transport"],
    correctAnswer: "Network",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Networking",
    question: "What is the default port number for HTTP?",
    options: ["21", "22", "80", "443"],
    correctAnswer: "80",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Networking",
    question: "Which protocol is connectionless?",
    options: ["TCP", "UDP", "HTTP", "FTP"],
    correctAnswer: "UDP",
    level: "medium",
    marks: 2,
  },
  {
    classification: "Networking",
    question: "What does DNS stand for?",
    options: [
      "Domain Name System",
      "Dynamic Network Service",
      "Data Network System",
      "Digital Name Service",
    ],
    correctAnswer: "Domain Name System",
    level: "easy",
    marks: 1,
  },
  {
    classification: "Networking",
    question: "Which device operates at the Data Link layer?",
    options: ["Router", "Switch", "Hub", "Repeater"],
    correctAnswer: "Switch",
    level: "medium",
    marks: 2,
  },
]

async function populateMCQQuestions() {
  try {
    // Connect to MongoDB
    const dburl =
      "mongodb+srv://mailtogautamsah_db_user:EQFfxBtlQLJ86jSt@cluster0.4cwbc5w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    await mongoose.connect(dburl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("✅ Connected to database\n")

    let created = 0
    let skipped = 0
    let errors = 0

    console.log("🚀 Starting MCQ Population...\n")

    for (const mcq of mcqQuestions) {
      try {
        // Check if question already exists
        const existing = await MCQQuestion.findOne({ question: mcq.question })

        if (existing) {
          process.stdout.write(".")
          skipped++
          continue
        }

        // Create the question
        await MCQQuestion.create({
          ...mcq,
          createdBy: "System",
        })

        process.stdout.write("✓")
        created++
      } catch (error) {
        process.stdout.write("✗")
        errors++
        console.error(`\n   Error: ${error.message}`)
      }
    }

    // Summary
    console.log(`\n\n${"=".repeat(60)}`)
    console.log("📊 SUMMARY")
    console.log(`${"=".repeat(60)}`)
    console.log(`✅ Questions Created: ${created}`)
    console.log(`⏭️  Questions Skipped (already exist): ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
    console.log(`📈 Total Processed: ${created + skipped + errors}`)
    console.log(`\n💾 Expected Total Questions: ${mcqQuestions.length}`)

    // Classification breakdown
    console.log("\n📚 Questions by Category:")
    const breakdown = {}
    mcqQuestions.forEach((q) => {
      breakdown[q.classification] = (breakdown[q.classification] || 0) + 1
    })
    Object.entries(breakdown).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} questions`)
    })

    // Level breakdown
    console.log("\n📊 Questions by Difficulty:")
    const levelBreakdown = {}
    mcqQuestions.forEach((q) => {
      levelBreakdown[q.level] = (levelBreakdown[q.level] || 0) + 1
    })
    Object.entries(levelBreakdown).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} questions`)
    })

    // Close connection
    await mongoose.connection.close()
    console.log("\n✅ Database connection closed")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Fatal Error:", error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run the script
console.log("🎯 MCQ Questions Population Script")
console.log("===================================\n")
populateMCQQuestions()
