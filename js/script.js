const tabs = document.querySelectorAll(".request-tab");
const panels = document.querySelectorAll(".request-panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    tabs.forEach((item) => item.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(`tab-${target}`).classList.add("active");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const article = params.get("article");

  if (!article) return;

  tabs.forEach((item) => item.classList.remove("active"));
  panels.forEach((panel) => panel.classList.remove("active"));

  const nameTab = document.querySelector('.request-tab[data-tab="name"]');
  const namePanel = document.getElementById("tab-name");

  if (nameTab) {
    nameTab.classList.add("active");
  }

  if (namePanel) {
    namePanel.classList.add("active");
  }

  const form = document.getElementById("partNameForm");
  const requiredPartsInput = form?.querySelector('input[name="requiredParts"]');

  if (requiredPartsInput) {
    requiredPartsInput.value = article;
    requiredPartsInput.dispatchEvent(new Event("input", { bubbles: true }));
    requiredPartsInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
});

function connectRequestForm(formId, statusId) {
  const form = document.getElementById(formId);
  const statusBox = document.getElementById(statusId);

  if (!form || !statusBox) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    statusBox.className = "form-status";
    statusBox.textContent = "";

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      const formData = new FormData(form);

      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Failed to send the request.");
      }

      statusBox.className = "form-status success";
      statusBox.textContent = data.message || "Your request has been sent successfully.";
      form.reset();
    } catch (error) {
      statusBox.className = "form-status error";
      statusBox.textContent = error.message || "Something went wrong. Please try again.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

connectRequestForm("partNameForm", "status-name");
connectRequestForm("oemForm", "status-oem");
connectRequestForm("photoForm", "status-photo");
