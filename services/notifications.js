function buildNewLeadEmail({
  clientName,
  lead
}) {
  const subject =
    `🚨 New Lead — ${clientName}`;

  const appointmentText =
    lead.appointmentBooked
      ? formatAppointment(
          lead
        )
      : "Not booked";

  const text = [
    "NEW LEAD",
    "",
    `Client: ${clientName}`,
    "",
    `Name: ${
      lead.leadName ||
      "Not provided"
    }`,
    `Phone: ${
      lead.leadPhone ||
      "Not provided"
    }`,
    `Email: ${
      lead.leadEmail ||
      "Not provided"
    }`,
    `Interest: ${
      lead.interest ||
      "Not specified"
    }`,
    "",
    `Appointment: ${appointmentText}`,
    "",
    "— Relva"
  ].join("\n");

  const html = `
    <div style="
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #222;
      max-width: 600px;
    ">
      <h2>🚨 New Lead</h2>

      <p>
        <strong>Client:</strong>
        ${escapeHtml(clientName)}
      </p>

      <hr>

      <p>
        <strong>Name:</strong>
        ${escapeHtml(
          lead.leadName ||
          "Not provided"
        )}
      </p>

      <p>
        <strong>Phone:</strong>
        ${escapeHtml(
          lead.leadPhone ||
          "Not provided"
        )}
      </p>

      <p>
        <strong>Email:</strong>
        ${escapeHtml(
          lead.leadEmail ||
          "Not provided"
        )}
      </p>

      <p>
        <strong>Interest:</strong>
        ${escapeHtml(
          lead.interest ||
          "Not specified"
        )}
      </p>

      <hr>

      <p>
        <strong>Appointment:</strong>
        ${escapeHtml(
          appointmentText
        )}
      </p>

      <p style="margin-top: 24px;">
        — Relva
      </p>
    </div>
  `;

  return {
    subject,
    text,
    html
  };
}

function formatAppointment(lead) {
  if (!lead.appointmentDate) {
    return "Booked — date/time not available";
  }

  const date =
    new Date(
      lead.appointmentDate
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return lead.appointmentDate;
  }

  const options = {
    dateStyle: "full",
    timeStyle: "short"
  };

  if (
    lead.appointmentTimeZone
  ) {
    options.timeZone =
      lead.appointmentTimeZone;
  }

  try {
    return new Intl.DateTimeFormat(
      "en-US",
      options
    ).format(date);
  } catch {
    return date.toLocaleString(
      "en-US",
      {
        dateStyle: "full",
        timeStyle: "short"
      }
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

module.exports = {
  buildNewLeadEmail
};