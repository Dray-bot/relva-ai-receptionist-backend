require("dotenv").config();

const {
  processFollowUps
} = require("./followups");

async function run() {
  console.log(
    "Email follow-up worker started:",
    new Date().toISOString()
  );

  try {
    await processFollowUps();

    console.log(
      "Email follow-up worker finished:",
      new Date().toISOString()
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "Email follow-up worker failed:",
      error
    );

    process.exit(1);
  }
}

run();