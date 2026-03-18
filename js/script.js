const form = document.getElementById("orderForm");
const statusBox = document.getElementById("formStatus");

if (form && statusBox) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    console.log("Order request:", payload);

    statusBox.className = "form-status success";
    statusBox.textContent =
      "Your request was saved in demo mode. The next step is connecting real submission handling through a Cloudflare Worker or another backend.";

    form.reset();
  });
}
