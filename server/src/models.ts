import { model, Schema } from "mongoose"

// The shape of a wake-up document in MongoDB. Mongoose is our "object mapping"
// (for MongoDB it's called an ODM): we work with normal objects, and it checks
// them against this schema and stores them as documents.
const wakeUpSchema = new Schema(
  {
    deviceId: { type: String, required: true, index: true }, // which phone sent it
    finishedAt: { type: Date, required: true }, // when the task was finished
    localDate: { type: String, required: true }, // that day on the phone's calendar, like 2026-11-24
    alarmTime: { type: String, default: null }, // the time the alarm was set for, like 07:00
    task: { type: String, enum: ["math", "memory", "shake", "scan"], default: null },
    seconds: { type: Number, required: true, min: 0 }, // how long the task took
    sleep: { type: Number, min: 1, max: 10, default: null }, // the 1 to 10 sleep grade
  },
  { timestamps: true }, // adds createdAt and updatedAt automatically
)

// The same phone can't have two wake-ups with the same finish time.
wakeUpSchema.index({ deviceId: 1, finishedAt: 1 }, { unique: true })

// Stored in the "wakeups" collection.
export const WakeUp = model("WakeUp", wakeUpSchema)
