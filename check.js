const mongoose = require("mongoose");
async function check() {
  await mongoose.connect("mongodb://127.0.0.1:27017/flash", { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  const coupon = await db.collection("coupons").find({}).sort({ createdAt: -1 }).limit(1).toArray();
  console.log("Latest Coupon:", JSON.stringify(coupon, null, 2));
  mongoose.disconnect();
}
check();
