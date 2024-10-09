import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./db/database.js";
dotenv.config({ path: ".env" });
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down the server due to an uncaught exception");
});

const server = app.listen(process.env.PORT || 8000, () => {
  console.log(`Server is running on PORT ${process.env.PORT}`);
});
//Connect database
connectDB();
process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server due to ${err.message}`);
  console.log("Shutting down the server due to an unhandled promise rejection");

  server.close(() => {
    process.exit(1);
  });
});
