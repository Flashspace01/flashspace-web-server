const axios = require("axios");
async function test() {
  try {
    const res = await axios.post("http://localhost:5000/api/contactForm/createContactForm", {
      fullName: "test user without company",
      email: "test@example.com",
      phoneNumber: "1234567890"
    });
    console.log("Success:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("Error Status:", err.response.status);
      console.error("Error Data:", err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}
test();
