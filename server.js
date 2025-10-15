const dotenv = require("dotenv")

const app = require("./app")
dotenv.config()
const server = require("http").createServer(app)
const port = process.env.PORT || 3001
const { scheduleAllExamReminders } = require("./utils/examreminder")

server.listen(port, function () {
  console.log(`Server started on port http://localhost:${port}`)
})
scheduleAllExamReminders()
  .then(() => console.log("All exam reminders scheduled successfully"))
  .catch((err) => console.error("Failed to schedule exam reminders:", err))
