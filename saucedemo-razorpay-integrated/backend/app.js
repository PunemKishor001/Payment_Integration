require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({ origin: true }));
app.use(express.json());

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("WARNING: Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env");
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder"
});

app.get("/", (_req, res) => res.send("Razorpay Payment Server is running"));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/razorpay-key", (_req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) return res.status(503).json({ success: false, message: "Razorpay test key is not configured" });
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

app.post("/createOrder", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const currency = req.body.currency || "INR";
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be a positive integer in paise" });
    }
    if (!["INR"].includes(currency)) return res.status(400).json({ success: false, message: "Unsupported currency" });
    const order = await razorpay.orders.create({
      amount, currency, receipt: String(req.body.receipt || `sauce_${Date.now()}`).slice(0, 40),
      notes: req.body.notes || {}
    });
    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Create Order Error:", error.message);
    return res.status(502).json({ success: false, message: "Unable to create Razorpay order" });
  }
});

app.post("/verifyOrder", (req, res) => {
  const { order_id, payment_id, razorpay_signature } = req.body || {};
  if (!order_id || !payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing payment verification data" });
  }
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ success: false, message: "Payment verification is not configured" });
  }
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`).digest();
  let supplied;
  try { supplied = Buffer.from(razorpay_signature, "hex"); } catch (_) {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }
  return res.status(200).json({ success: true, message: "Payment signature verified" });
});

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
