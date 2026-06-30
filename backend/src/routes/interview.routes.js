const express = require("express")
const { generateInterviewReport, generateResumePdf } = require('../services/ai.service')
const authMiddleware=require("../middlewares/auth.middleware")
const interviewRouter = express.Router()
const interviewController=require("../controllers/interview.controller")
const upload=require("../middlewares/file.middleware")
/**
 * @route POST/api/interview
 * @description
 */
interviewRouter.post("/",authMiddleware.authUser,upload.single("resume"),interviewController.generateInterViewReportController)

/**
 * @route get /api/interview/report/:interviewid
 * @description get interview report by interview id
 */
interviewRouter.get("/report/:interviewId",authMiddleware.authUser,interviewController.getInterviewReportByIdController)

/**
 * @route GET /api/interview/all
 * @description get all interview reports of logged in user
 */
interviewRouter.get("/all",authMiddleware.authUser,interviewController.getAllInterviewReportsController)


/**
 * @route POST /api/interview/resume/pdf
 * @description generate resume pdf based on user self description, resume content and job description.
 */
interviewRouter.post("/resume/pdf/:interviewReportId",authMiddleware.authUser,interviewController.generateResumePdfController)


module.exports = interviewRouter