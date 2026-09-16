const express = require("express");

const {
  getAssistantOwner
} = require("../services/assistant-mapping.js");

const {
  getCall
} = require("../services/vapi.js");

const {
  extractLead
} = require("../services/lead-extraction.js");

const {
  saveLead
} = require("../services/leads.js");

const {
  buildNewLeadEmail
} = require("../services/notifications.js");

const {
  sendEmail
} = require("../services/email.js");

const router =
  express.Router();

router.post(
  "/vapi",
  async (req, res) => {
    try {
      const authHeader =
        req.headers.authorization;

      const expectedSecret =
        process.env
          .VAPI_WEBHOOK_SECRET;

      if (!expectedSecret) {
        console.error(
          "VAPI_WEBHOOK_SECRET is not configured"
        );

        return res.status(500).json({
          success: false,
          error:
            "Webhook secret is not configured"
        });
      }

      if (
        authHeader !==
        `Bearer ${expectedSecret}`
      ) {
        console.warn(
          "Unauthorized Vapi webhook request"
        );

        return res.status(401).json({
          success: false,
          error: "Unauthorized"
        });
      }

      const message =
        req.body?.message;

      if (!message) {
        return res.status(400).json({
          success: false,
          error:
            "Missing Vapi message"
        });
      }

      const eventType =
        message.type;

      const callId =
        message?.call?.id;

      const assistantId =
        message?.call?.assistantId;

      console.log(
        "Vapi webhook received:",
        {
          type: eventType,
          callId,
          assistantId
        }
      );

      /*
       * Only process completed calls.
       */
      if (
        eventType !==
        "end-of-call-report"
      ) {
        return res.status(200).json({
          success: true,
          processed: false,
          reason: "Event ignored"
        });
      }

      if (!callId || !assistantId) {
        console.error(
          "Missing callId or assistantId"
        );

        return res.status(400).json({
          success: false,
          error:
            "Missing callId or assistantId"
        });
      }

      /*
       * Find the Relva client
       * that owns this assistant.
       */
      const owner =
        await getAssistantOwner(
          assistantId
        );

      if (!owner) {
        console.error(
          "No assistant owner found:",
          assistantId
        );

        return res.status(404).json({
          success: false,
          error:
            "Assistant owner not found"
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

      /*
       * Always fetch the complete
       * call directly from Vapi.
       */
      let fullCall;

      try {
        fullCall =
          await getCall(callId);

        console.log(
          "Full Vapi call fetched:",
          {
            callId,

            hasCustomer:
              Boolean(
                fullCall?.customer
              ),

            hasArtifact:
              Boolean(
                fullCall?.artifact
              ),

            messageCount:
              Array.isArray(
                fullCall
                  ?.artifact
                  ?.messages
              )
                ? fullCall
                    .artifact
                    .messages
                    .length
                : 0
          }
        );
      } catch (error) {
        console.error(
          "Failed to fetch full Vapi call:",
          error
        );

        /*
         * Fall back to the
         * webhook payload.
         */
        fullCall =
          message.call;
      }

      /*
       * Merge webhook data with
       * the complete Vapi call.
       */
      fullCall = {
        ...(message.call || {}),
        ...(fullCall || {}),

        customer: {
          ...(message.call
            ?.customer || {}),

          ...(fullCall
            ?.customer || {})
        },

        artifact: {
          ...(message.call
            ?.artifact || {}),

          ...(fullCall
            ?.artifact || {})
        }
      };

      /*
       * Extract lead information.
       */
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

          leadEmail:
            lead.leadEmail,

          interest:
            lead.interest,

          appointmentBooked:
            lead.appointmentBooked,

          appointmentDate:
            lead.appointmentDate,

          appointmentEndDate:
            lead.appointmentEndDate,

          appointmentTimezone:
            lead.appointmentTimezone
        }
      );

      /*
       * Phone number is required
       * to save the lead.
       */
      if (!lead.leadPhone) {
        console.warn(
          "No lead phone number found. " +
          "Lead will not be saved."
        );

        return res.status(200).json({
          success: true,
          processed: true,
          leadSaved: false,
          notificationSent: false,
          reason:
            "No lead phone number found"
        });
      }

      /*
       * Save the lead.
       */
      const result =
        await saveLead({
          assistantId,
          callId,
          lead
        });

      console.log(
        "Lead saved:",
        result
      );

      let notificationSent =
        false;

      /*
       * IMPORTANT:
       *
       * Do NOT require
       * lead.qualified === true.
       *
       * If this is a new usable
       * lead and the owner has
       * an email, send the
       * notification.
       */
      if (
        result.isNew &&
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
            subject:
              email.subject,
            text:
              email.text,
            html:
              email.html
          });

          notificationSent =
            true;

          console.log(
            "Lead notification sent:",
            owner.email
          );
        } catch (error) {
          console.error(
            "Failed to send lead notification:",
            error
          );
        }
      } else {
        console.log(
          "Lead notification skipped:",
          {
            isNew:
              result.isNew,

            ownerEmail:
              Boolean(
                owner.email
              )
          }
        );
      }

      return res.status(200).json({
        success: true,
        processed: true,
        leadSaved: true,
        notificationSent,

        leadId:
          result.lead?.id ||
          result.id ||
          null
      });
    } catch (error) {
      console.error(
        "Vapi webhook processing error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Webhook processing failed"
      });
    }
  }
);

module.exports = router;