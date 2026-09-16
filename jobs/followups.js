require("dotenv").config();

const supabase = require("../services/supabase");
const { sendEmail } = require("../services/email");

const FOLLOW_UPS = [
  {
    step: 1,
    delayHours: 24,
    status: "follow_up_1_sent",
    subject: "Following up on your real estate inquiry",
    message:
      "Hi {{name}},\n\nI wanted to follow up on your recent real estate inquiry with Formidable Corporate Partners.\n\nAre you still looking for assistance? We'd be happy to help.\n\nBest regards,\nFormidable Corporate Partners"
  },
  {
    step: 2,
    delayHours: 48,
    status: "follow_up_2_sent",
    subject: "Still looking for real estate assistance?",
    message:
      "Hi {{name}},\n\nI wanted to follow up once more regarding your real estate inquiry.\n\nIf you're still looking for a property or real estate assistance, we'd be happy to help.\n\nBest regards,\nFormidable Corporate Partners"
  },
  {
    step: 3,
    delayHours: 96,
    status: "follow_up_3_sent",
    subject: "Final follow-up regarding your inquiry",
    message:
      "Hi {{name}},\n\nThis is a final follow-up regarding your recent real estate inquiry with Formidable Corporate Partners.\n\nFeel free to reach out whenever you're ready. We'd be happy to assist.\n\nBest regards,\nFormidable Corporate Partners"
  }
];

function personalizeMessage(message, name) {
  return message.replace(
    "{{name}}",
    name || "there"
  );
}

function addHours(date, hours) {
  return new Date(
    date.getTime() +
      hours * 60 * 60 * 1000
  );
}

async function processFollowUps() {
  const now = new Date();

  const {
    data: leads,
    error
  } = await supabase
    .from("leads")
    .select("*")
    .not("lead_email", "is", null)
    .not("next_follow_up_at", "is", null)
    .lte(
      "next_follow_up_at",
      now.toISOString()
    )
    .in("status", [
      "new",
      "follow_up_1_sent",
      "follow_up_2_sent"
    ])
    .order(
      "next_follow_up_at",
      {
        ascending: true
      }
    );

  if (error) {
    throw new Error(
      `Failed to fetch follow-ups: ${error.message}`
    );
  }

  if (
    !leads ||
    leads.length === 0
  ) {
    console.log(
      "No email follow-ups are due."
    );

    return;
  }

  console.log(
    `${leads.length} email follow-up(s) due.`
  );

  for (const lead of leads) {
    const nextStep =
      lead.follow_up_step + 1;

    const followUp =
      FOLLOW_UPS.find(
        item =>
          item.step === nextStep
      );

    if (!followUp) {
      await supabase
        .from("leads")
        .update({
          status: "closed",
          next_follow_up_at: null
        })
        .eq(
          "id",
          lead.id
        );

      continue;
    }

    const text =
      personalizeMessage(
        followUp.message,
        lead.lead_name
      );

    try {
      await sendEmail({
        to: lead.lead_email,
        subject: followUp.subject,
        text
      });

      /*
       * Schedule the next follow-up from the
       * previously scheduled time, not from
       * the current worker execution time.
       */
      const previousScheduledTime =
        new Date(
          lead.next_follow_up_at
        );

      const nextFollowUp =
        FOLLOW_UPS.find(
          item =>
            item.step ===
            nextStep + 1
        );

      let nextFollowUpAt = null;

      if (nextFollowUp) {
        nextFollowUpAt =
          addHours(
            previousScheduledTime,
            nextFollowUp.delayHours
          ).toISOString();
      }

      await supabase
        .from("leads")
        .update({
          status:
            followUp.status,
          follow_up_step:
            nextStep,
          next_follow_up_at:
            nextFollowUpAt
        })
        .eq(
          "id",
          lead.id
        );

      console.log(
        `Email follow-up ${nextStep} sent to ${lead.lead_email}`
      );
    } catch (error) {
      console.error(
        `Email follow-up failed for lead ${lead.id}:`,
        error.message
      );
    }
  }
}

module.exports = {
  processFollowUps
};