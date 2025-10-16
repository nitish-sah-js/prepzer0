# Scripts Documentation

This folder contains utility scripts for managing the PrepZer0 application.

## Department Seed Script

### Overview
The `seedDepartments.js` script populates the Department collection with 8 initial departments.

### Included Departments

| Code | Name | Full Name |
|------|------|-----------|
| CS | Computer Science | Department of Computer Science & Engineering |
| IS | Information Science | Department of Information Science & Engineering |
| EC | Electronics & Communication | Department of Electronics & Communication Engineering |
| ET | Electronics & Telecommunication | Department of Electronics & Telecommunication Engineering |
| AI | Artificial Intelligence | Department of Artificial Intelligence & Machine Learning |
| CV | Civil Engineering | Department of Civil Engineering |
| EE | Electrical Engineering | Department of Electrical & Electronics Engineering |
| AD | Automation & Robotics | Department of Automation & Robotics |

### How to Run

#### Method 1: Using npm script (Recommended)
```bash
npm run seed:departments
```

#### Method 2: Direct execution
```bash
node scripts/seedDepartments.js
```

### Prerequisites
- MongoDB must be running
- `.env` file must be configured with `MONGODB_URI`
- Department model must exist at `../models/Department.js`

### Features
-  Checks for existing departments before seeding
-  Prevents duplicate entries
-  Creates all departments with active status
-  Provides detailed console output
-  Displays summary of created departments

### Safety Features
- **Duplicate Prevention**: The script checks if departments already exist and skips seeding if any are found
- **Error Handling**: Proper error messages and exit codes
- **Validation**: Uses the Department model's built-in validation

### Customization

To modify the departments that are seeded, edit the `departments` array in `seedDepartments.js`:

```javascript
const departments = [
    {
        code: 'cs',              // Unique department code (lowercase)
        name: 'Computer Science', // Display name
        fullName: 'Department of Computer Science & Engineering', // Full official name
        description: 'Description of the department', // Optional description
        active: true             // Active status (true/false)
    },
    // Add more departments here...
];
```

### Expected Output

```
=€ Starting Department Seed Script

 MongoDB Connected Successfully

=Ê Found 0 existing departments

<1 Seeding departments...

 Created: CS - Computer Science
 Created: IS - Information Science
 Created: EC - Electronics & Communication
 Created: ET - Electronics & Telecommunication
 Created: AI - Artificial Intelligence
 Created: CV - Civil Engineering
 Created: EE - Electrical Engineering
 Created: AD - Automation & Robotics

<‰ Successfully seeded 8 departments!

=Ë All Departments in Database:
================================
AD   | Automation & Robotics        |  Active
AI   | Artificial Intelligence      |  Active
CS   | Computer Science             |  Active
CV   | Civil Engineering            |  Active
EC   | Electronics & Communication  |  Active
EE   | Electrical Engineering       |  Active
ET   | Electronics & Telecommunication |  Active
IS   | Information Science          |  Active
================================

( Seed script completed successfully!
```

### Re-seeding

If you need to re-seed the departments:

1. Delete existing departments manually through:
   - MongoDB Compass
   - MongoDB shell: `db.departments.deleteMany({})`
   - Admin interface at `/admin/departments`

2. Run the seed script again

### Troubleshooting

**Error: MongoDB Connection Failed**
- Ensure MongoDB is running
- Check your `.env` file has correct `MONGODB_URI`
- Verify network connectivity

**Error: Department validation failed**
- Check that all required fields are provided
- Ensure department codes are unique
- Verify all fields meet validation requirements

**Warning: Departments already exist**
- This is expected if you've already run the seed script
- Delete existing departments if you want to re-seed

## Adding More Scripts

To add new seed or utility scripts:

1. Create a new `.js` file in this folder
2. Add a corresponding npm script in `package.json`
3. Document it in this README
4. Follow the same pattern as `seedDepartments.js`
