const mongoose = require("mongoose");

async function connectToDB(params) {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Database connected");
    } catch (error) {
        console.log(error);
    }
}

module.exports = connectToDB;