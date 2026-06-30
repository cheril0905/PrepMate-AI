const express = require("express");
const cookieParser=require("cookie-parser")
const cors = require('cors')

const app = express()

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.use(express.urlencoded({ extended: true }))

const authRouter = require("./routes/auth.routes")

const interviewRouter=require("./routes/interview.routes")

/**
 * @description using all routes here
 * @route /api/auth
 * 
 */
app.use("/api/auth", authRouter)
app.use("/api/interview",interviewRouter)





module.exports = app;