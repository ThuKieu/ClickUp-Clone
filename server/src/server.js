// Configure environment variables.
require("dotenv").config({ path: "./src/config.env" });

// Create new Express App.
const express = require('express');
const app = express();

const authRouter = require("./routes/auth");
const errorHandler = require("./middleware/error");
const notFound = require("./middleware/notFound");
const connectDB = require("./config/db");


app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(require('cors')());

app.use(express.json())

// Routes
app.use("/api/v1/auth", authRouter);

// Not Found Page
app.use(notFound);

// Error Handler Middleware
app.use(errorHandler);

// Server
const startServer = async () => {
  try {
    // Try connecting to database before starting server.
    await connectDB();
    console.log("Connected to Database ...")

    // Start to server.
    app.listen(process.env.PORT || 80, () => {
      console.log(`Listen on port ${process.env.PORT} ...`);
    })
  } catch (error) {
    console.log("Error: ", error.message);
  }
}

startServer();