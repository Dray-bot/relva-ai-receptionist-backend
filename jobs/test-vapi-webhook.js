require("dotenv").config();

const WEBHOOK_URL =
  "https://relva-ai-receptionist-backend.onrender.com/webhooks/vapi";

const WEBHOOK_SECRET =
  process.env.VAPI_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error(
    "VAPI_WEBHOOK_SECRET is missing from .env"
  );
}

const fakeCallId =
  `test-followup-${Date.now()}`;

const assistantId =
  "900a4c59-971b-4c39-be1f-92db42fc15a8";

const payload = {
  message: {
    type: "end-of-call-report",

    call: {
      id: fakeCallId,

      assistantId,

      customer: {
        name: "Follow Up Test Lead",
        number: "+2348012345678",
        email: "ibiyemiayomide180@gmail.com"
      },

      metadata: {
        qualified: true,
        interest: "Buying",
        appointmentBooked: false
      },

      artifact: {
        messages: []
      }
    }
  }
};

async function run() {
  try {
    console.log(
      "Sending follow-up test webhook..."
    );

    console.log(
      "Test call ID:",
      fakeCallId
    );

    const response =
      await fetch(
        WEBHOOK_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${WEBHOOK_SECRET}`
          },

          body:
            JSON.stringify(payload)
        }
      );

    const text =
      await response.text();

    console.log(
      "HTTP status:",
      response.status
    );

    console.log(
      "Response:",
      text
    );
  } catch (error) {
    console.error(
      "Follow-up webhook test failed:",
      error
    );

    process.exit(1);
  }
}

run();