require("dotenv").config();

const {
  sendEmail
} = require("../services/email");

async function run() {
  try {
    console.log("Sending test email...");

    const result = await sendEmail({
      to: "ibiyemiayomide180@gmail.com",
      subject: "AI Receptionist Backend Test",
      text: "Email system is working successfully.",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>AI Receptionist Backend</h2>
          <p>Email system is working successfully.</p>
        </div>
      `
    });

    console.log("Test email sent successfully.");
    console.log(result);

    process.exit(0);
  } catch (error) {
    console.error(
      "Test email failed:",
      error
    );

    process.exit(1);
  }
}

run();