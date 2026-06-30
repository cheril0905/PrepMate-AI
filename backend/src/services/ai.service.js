const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `You are an expert technical interviewer and career coach. Analyze the candidate's resume, self-description, and the target job description below. Generate a comprehensive interview preparation report.

You MUST provide ALL of the following in your response:
1. "title" - The job title extracted from the job description.
2. "matchScore" - A number between 0 and 100 rating how well the candidate matches the job.
3. "technicalQuestions" - An array of at least 5 technical interview questions with intention and sample answer for each.
4. "behavioralQuestions" - An array of at least 3 behavioral interview questions with intention and sample answer for each.
5. "skillGaps" - An array of skills the candidate is missing for this job, with severity (low/medium/high).
6. "preparationPlan" - A day-by-day preparation plan (at least 7 days) with focus area and tasks for each day.

Candidate Resume:
${resume}

Candidate Self Description:
${selfDescription}

Target Job Description:
${jobDescription}
`

    let response;
    let retries = 3;
    while (retries > 0) {
        try {
            response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: zodToJsonSchema(interviewReportSchema),
                }
            })
            break;
        } catch (error) {
            retries--;
            if (retries === 0 || error.status !== 503) throw error;
            console.log(`API 503 error, retrying... (${retries} attempts left)`);
            await new Promise(res => setTimeout(res, 2000));
        }
    }

    const parsed = JSON.parse(response.text)

    // Helper: clean and normalize question arrays
    const cleanQuestions = (arr) => {
        if (!Array.isArray(arr)) return []
        return arr
            .map(item => {
                if (typeof item === 'string') {
                    try { item = JSON.parse(item) } catch (e) { return null }
                }
                if (!item || typeof item !== 'object') return null
                return {
                    question: item.question || item.q || "Missing question",
                    intention: item.intention || "Assess candidate's ability",
                    answer: item.answer || item.sampleAnswer || "Answer thoughtfully based on experience."
                }
            })
            .filter(Boolean)
    }

    // Helper: clean skill gaps and normalize severity enums
    const cleanSkillGaps = (arr) => {
        if (!Array.isArray(arr)) return []
        return arr
            .map(item => {
                if (typeof item === 'string') {
                    try { item = JSON.parse(item) } catch (e) { return null }
                }
                if (!item || typeof item !== 'object') return null
                let severity = (item.severity || "medium").toLowerCase()
                if (!["low", "medium", "high"].includes(severity)) severity = "medium"
                return {
                    skill: item.skill || item.name || "Unknown skill",
                    severity
                }
            })
            .filter(Boolean)
    }

    // Clean up all arrays
    parsed.technicalQuestions = cleanQuestions(parsed.technicalQuestions)
    parsed.behavioralQuestions = cleanQuestions(parsed.behavioralQuestions)
    parsed.skillGaps = cleanSkillGaps(parsed.skillGaps)
    
    if (Array.isArray(parsed.preparationPlan)) {
        parsed.preparationPlan = parsed.preparationPlan
            .map((item, index) => {
                let obj = item;
                if (typeof item === 'string') {
                    try { obj = JSON.parse(item) } 
                    catch (e) { return { day: index + 1, focus: item, tasks: [item] } }
                }
                if (!obj || typeof obj !== 'object') return null

                // Normalize 'day' (AI might return "Day 1" instead of 1)
                let dayNum = parseInt(String(obj.day).replace(/\D/g, '')) || index + 1

                return {
                    day: dayNum,
                    focus: obj.focus || obj.focusArea || "General Preparation",
                    tasks: Array.isArray(obj.tasks) && obj.tasks.length > 0 ? obj.tasks : ["Review key concepts"]
                }
            })
            .filter(Boolean)
    } else {
        parsed.preparationPlan = []
    }

    // Validate the AI response against the Zod schema
    const result = interviewReportSchema.safeParse(parsed)
    if (!result.success) {
        console.error("Zod validation errors:", JSON.stringify(result.error.issues, null, 2))
        return {
            title: parsed.title || "Untitled Position",
            matchScore: parsed.matchScore || 0,
            technicalQuestions: parsed.technicalQuestions,
            behavioralQuestions: parsed.behavioralQuestions,
            skillGaps: parsed.skillGaps,
            preparationPlan: parsed.preparationPlan,
        }
    }
    return result.data
}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    let response;
    let retries = 3;
    while (retries > 0) {
        try {
            response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: zodToJsonSchema(resumePdfSchema),
                }
            })
            break;
        } catch (error) {
            retries--;
            if (retries === 0 || error.status !== 503) throw error;
            console.log(`API 503 error, retrying... (${retries} attempts left)`);
            await new Promise(res => setTimeout(res, 2000));
        }
    }


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }