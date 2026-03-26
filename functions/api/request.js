export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();

    const requestType = (formData.get("requestType") || "").toString();
    const customerName = (formData.get("customerName") || "").toString();
    const email = (formData.get("email") || "").toString().trim();
    const contact = (formData.get("contact") || "").toString();

    const requiredParts = (formData.get("requiredParts") || "").toString();
    const transmissionModel = (formData.get("transmissionModel") || "").toString();

    const oemNumber = (formData.get("oemNumber") || "").toString();

    const carBrand = (formData.get("carBrand") || "").toString();
    const carModel = (formData.get("carModel") || "").toString();
    const year = (formData.get("year") || "").toString();
    const engineSize = (formData.get("engineSize") || "").toString();

    const photo = formData.get("photo");

    const lines = [
      `Request type: ${requestType || "-"}`,
      "",
      "Customer information",
      `Name: ${customerName || "-"}`,
      `Email: ${email || "-"}`,
      `Phone / Messenger: ${contact || "-"}`,
      "",
      "Request details",
      `Required parts: ${requiredParts || "-"}`,
      `Transmission model: ${transmissionModel || "-"}`,
      `OEM number: ${oemNumber || "-"}`,
      "",
      "Vehicle information",
      `Car brand: ${carBrand || "-"}`,
      `Car model: ${carModel || "-"}`,
      `Year: ${year || "-"}`,
      `Engine size: ${engineSize || "-"}`,
    ];

    const textBody = lines.join("\n");

    const htmlBody = `
      <h2>New part request</h2>
      <p><strong>Request type:</strong> ${escapeHtml(requestType || "-")}</p>

      <h3>Customer information</h3>
      <p><strong>Name:</strong> ${escapeHtml(customerName || "-")}</p>
      <p><strong>Email or Messenger:</strong> ${escapeHtml(contact || "-")}</p>

      <h3>Request details</h3>
      <p><strong>Required parts:</strong> ${escapeHtml(requiredParts || "-")}</p>
      <p><strong>Transmission model:</strong> ${escapeHtml(transmissionModel || "-")}</p>
      <p><strong>OEM number:</strong> ${escapeHtml(oemNumber || "-")}</p>

      <h3>Vehicle information</h3>
      <p><strong>Car brand:</strong> ${escapeHtml(carBrand || "-")}</p>
      <p><strong>Car model:</strong> ${escapeHtml(carModel || "-")}</p>
      <p><strong>Year:</strong> ${escapeHtml(year || "-")}</p>
      <p><strong>Engine size:</strong> ${escapeHtml(engineSize || "-")}</p>
    `;

    const attachments = [];

    if (photo && typeof photo !== "string" && photo.size > 0) {
      if (photo.size > 5 * 1024 * 1024) {
        return json(
          { ok: false, message: "The uploaded file is too large. Please use a file smaller than 5 MB." },
          400
        );
      }

      const bytes = await photo.arrayBuffer();
      attachments.push({
        filename: photo.name || "part-photo",
        content: arrayBufferToBase64(bytes),
      });
    }

      if (!customerName || !email) {
          return json(
              { ok: false, message: "Name and email are required." },
              400
          );
      }

      if (!isValidEmail(email)) {
          return json(
              { ok: false, message: "Please enter a valid email address." },
              400
          );
      }



    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Tiptronic Group <noreply@mail.tiptronicgroup.com>",
        to: ["aleg.tiptronicgroup@gmail.com"],
        reply_to: email,
        subject: `New request: ${requestType || "Part request"}`,
        text: textBody,
        html: htmlBody,
        attachments,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return json(
        {
          ok: false,
          message: resendData?.message || "Failed to send the request.",
          details: resendData,
        },
        500
      );
    }

    const customerText = [
  `Hello ${customerName},`,
  "",
  "Thank you for contacting Tiptronic Group.",
  "We have received your request and will get back to you shortly.",
  "",
  `Request type: ${requestType || "-"}`,
  "",
  "Best regards,",
  "Tiptronic Group"
].join("\n");

const customerHtml = `
  <p>Hello ${escapeHtml(customerName)},</p>
  <p>Thank you for contacting <strong>Tiptronic Group</strong>.</p>
  <p>We have received your request and will get back to you shortly.</p>
  <p><strong>Request type:</strong> ${escapeHtml(requestType || "-")}</p>
  <p>Best regards,<br>Tiptronic Group</p>
`;

const customerResponse = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${context.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "Tiptronic Group <noreply@mail.tiptronicgroup.com>",
    to: [email],
    subject: "We received your request | Tiptronic Group",
    text: customerText,
    html: customerHtml,
  }),
});

const customerData = await customerResponse.json();

if (!customerResponse.ok) {
  return json(
    {
      ok: false,
      message: customerData?.message || "Request received, but confirmation email failed.",
      details: customerData,
    },
    500
  );
}

    return json({
      ok: true,
      message: "Your request has been sent successfully.",
      id: resendData?.id || null,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        message: "Unexpected server error.",
        error: String(error),
      },
      500
    );
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}
