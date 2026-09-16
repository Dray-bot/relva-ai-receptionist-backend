const express = require("express");

const supabase = require("../services/supabase");
const { getAssistantOwner } = require("../services/assistant-mapping");
const { getCall } = require("../services/vapi");
const { extractLead } = require("../services/lead-extraction");
const { saveLead } = require("../services/leads");
const { buildNewLeadEmail } = require("../services/notifications");
const { sendEmail } = require("../services/email");

const router = express.Router();

function verifyVapiRequest(req) {
  const webhookSecret =
    process.env.VAPI_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "VAPI_WEBHOOK_SECRET is missing from .env"
    );
  }

  const authorization =
    req.headers.authorization;

  if (!authorization) {
    return false;
  }

  return authorization ===
    `Bearer ${webhookSecret}`;
}

router.post("/", async (req, res) => {
  try {
    const validRequest =
      verifyVapiRequest(req);

    if (!validRequest) {
      console.warn(
        "Unauthorized Vapi webhook request"
      );

      return res.status(401).json({
        success: false,
        error: "Unauthorized"
      });
    }

    const body = req.body;

    console.log(
      "Vapi webhook received:",
      {
        type: body?.message?.type || body?.type,
        callId:
          body?.message?.call?.id ||
          body?.message?.callId ||
          body?.callId,
        assistantId:
          body?.message?.call?.assistantId ||
          body?.message?.assistantId ||
          body?.assistantId
      }
    );

    const message =
      body?.message || body;

    const eventType =
      message?.type;

    if (
      eventType !==
      "end-of-call-report"
    ) {
      return res.status(200).json({
        success: true,
        ignored: true
      });
    }

    const call =
      message?.call || {};

    const callId =
      call?.id ||
      message?.callId ||
      body?.callId;

    const assistantId =
      call?.assistantId ||
      message?.assistantId ||
      body?.assistantId;

    if (!callId) {
      return res.status(400).json({
        success: false,
        error: "Missing call ID"
      });
    }

    if (!assistantId) {
      return res.status(400).json({
        success: false,
        error: "Missing assistant ID"
      });
    }

    const owner =
      await getAssistantOwner(
        assistantId
      );

    if (!owner) {
      console.error(
        `No owner found for assistant ${assistantId}`
      );

      return res.status(404).json({
        success: false,
        error: "Assistant owner not found"
      });
    }

    console.log(
      "Assistant owner found:",
      {
        clientName:
          owner.client_name,
        email:
          owner.email
      }
    );

    let fullCall =
      message?.call;

    if (!fullCall?.customer) {
      try {
        fullCall =
          await getCall(callId);
      } catch (error) {
        console.warn(
          "Could not fetch call from Vapi. Using webhook call data.",
          error.message
        );
      }
    }

    const lead =
      extractLead(fullCall);

    console.log(
      "Lead extracted:",
      {
        qualified:
          lead.qualified,
        leadName:
          lead.leadName,
        leadPhone:
          lead.leadPhone,
        interest:
          lead.interest,
        appointmentBooked:
          lead.appointmentBooked
      }
    );

    if (!lead.leadPhone) {
      console.log(
        "No lead phone number found. Lead will not be saved."
      );

      return res.status(200).json({
        success: true,
        processed: true,
        leadSaved: false,
        notificationSent: false
      });
    }

    const result =
      await saveLead({
        assistantId,
        callId,
        lead
      });

    console.log(
      result.isNew
        ? `New lead saved: ${result.lead.id}`
        : `Lead already exists: ${result.lead.id}`
    );

    let notificationSent =
      false;

    if (
      result.isNew &&
      lead.qualified === true &&
      owner.email
    ) {
      try {
        const email =
          buildNewLeadEmail({
            clientName:
              owner.client_name,
            lead
          });

        await sendEmail({
          to: owner.email,
          subject: email.subject,
          text: email.text,
          html: email.html
        });

        notificationSent =
          true;

        await supabase
          .from("leads")
          .update({
            realtor_notified_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            result.lead.id
          );

        console.log(
          `Lead notification email sent to ${owner.email}`
        );
      } catch (error) {
        console.error(
          "Lead notification email failed:",
          error.message
        );
      }
    } else if (
      result.isNew &&
      lead.qualified === true &&
      !owner.email
    ) {
      console.warn(
        `No email configured for assistant ${assistantId}`
      );
    }

    return res.status(200).json({
      success: true,
      processed: true,
      leadSaved: true,
      notificationSent
    });
  } catch (error) {
    console.error(
      "Vapi webhook error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Internal server error"
    });
  }
});

module.exports = router;