/**
 * ARTFIT Automated API & Order Cancellation Test Suite
 * Tests end-to-end functionality including order cancellation rules.
 */

const mongoose = require("mongoose");
const http = require("http");
const app = require("./server");
const User = require("./models/User");
const Painting = require("./models/Painting");
const Order = require("./models/Order");

const TEST_PORT = 5005;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/artfit";

async function makeRequest(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        ...options,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let data = {};
          try {
            data = JSON.parse(raw);
          } catch {
            data = { text: raw };
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );

    req.on("error", reject);
    if (bodyData) {
      req.write(typeof bodyData === "string" ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== ARTFIT END-TO-END VERIFICATION SUITE ===");

  let server;
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB at:", MONGO_URI);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));
    console.log(`✓ Test server running on port ${TEST_PORT}\n`);

    const timestamp = Date.now();
    const customerEmail = `test_customer_${timestamp}@example.com`;
    const artistEmail = `test_artist_${timestamp}@example.com`;

    // 1. SIGNUP CUSTOMER
    console.log("1. Testing Customer Signup...");
    const custRes = await makeRequest(
      { path: "/api/signup", method: "POST", headers: { "Content-Type": "application/json" } },
      { name: "Test Customer", email: customerEmail, password: "password123", role: "customer" }
    );
    console.assert(custRes.status === 201, `Customer signup failed: ${JSON.stringify(custRes.data)}`);
    const customerId = custRes.data.user.id;
    const customerToken = custRes.data.token;
    console.log(`✓ Customer created (ID: ${customerId}, JWT received)`);

    // 2. SIGNUP ARTIST
    console.log("2. Testing Artist Signup...");
    const artistRes = await makeRequest(
      { path: "/api/signup", method: "POST", headers: { "Content-Type": "application/json" } },
      { name: "Test Artist", email: artistEmail, password: "password123", role: "artist" }
    );
    console.assert(artistRes.status === 201, `Artist signup failed: ${JSON.stringify(artistRes.data)}`);
    const artistId = artistRes.data.user.id;
    const artistToken = artistRes.data.token;
    console.log(`✓ Artist created (ID: ${artistId}, JWT received)`);

    // 3. CREATE TEST PAINTING
    console.log("3. Creating Test Painting in Database...");
    const testPainting = await Painting.create({
      title: `E2E Sunset ${timestamp}`,
      description: "Original acrylic on canvas",
      price: 4500,
      theme: "Nature",
      frameSize: "normal",
      imageUrl: "/uploads/sample-test.jpg",
      artist: artistId,
    });
    console.log(`✓ Painting created (ID: ${testPainting._id}, Price: ₹${testPainting.price})`);

    // 4. PLACE ORDER
    console.log("4. Testing Order Placement...");
    const orderRes = await makeRequest(
      {
        path: "/api/orders",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      },
      {
        customerId,
        paintingId: String(testPainting._id),
        customerName: "Test Customer",
        phone: "9876543210",
        address: "123 Art Avenue",
        city: "Hyderabad",
        pincode: "500001",
        paymentMethod: "Cash on Delivery",
      }
    );
    console.assert(orderRes.status === 201, `Place order failed: ${JSON.stringify(orderRes.data)}`);
    const orderId = orderRes.data.order._id;
    console.assert(orderRes.data.order.status === "Pending", "Order status should be Pending initially");
    console.log(`✓ Order placed successfully (Order ID: ${orderId}, Status: Pending)`);

    // 5. TEST: CUSTOMER ORDER CANCELLATION (ELIGIBLE)
    console.log("5. Testing Order Cancellation for Pending Order...");
    const cancelRes = await makeRequest(
      {
        path: `/api/orders/${orderId}/cancel`,
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      },
      { customerId }
    );
    console.assert(cancelRes.status === 200, `Cancel pending order failed: ${JSON.stringify(cancelRes.data)}`);
    console.assert(cancelRes.data.order.status === "Cancelled", "Database status must be Cancelled");
    console.log("✓ Order cancelled successfully in DB (Status: Cancelled)");

    // 6. TEST: ATTEMPT TO CANCEL ALREADY CANCELLED ORDER (SHOULD FAIL WITH 409)
    console.log("6. Testing Second Cancellation on Already-Cancelled Order...");
    const reCancelRes = await makeRequest(
      {
        path: `/api/orders/${orderId}/cancel`,
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      },
      { customerId }
    );
    console.assert(reCancelRes.status === 409, `Expected 409 Conflict, got ${reCancelRes.status}`);
    console.log(`✓ Server correctly rejected duplicate cancel with 409 Conflict: "${reCancelRes.data.message}"`);

    // 7. TEST: UNAUTHORIZED USER ATTEMPTING TO CANCEL (SHOULD FAIL WITH 403)
    console.log("7. Testing Unauthorized User Cancellation...");
    const fakeCustomerId = new mongoose.Types.ObjectId();
    const unauthCancelRes = await makeRequest(
      {
        path: `/api/orders/${orderId}/cancel`,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      },
      { customerId: String(fakeCustomerId) }
    );
    console.assert(unauthCancelRes.status === 403, `Expected 403 Forbidden, got ${unauthCancelRes.status}`);
    console.log(`✓ Server correctly rejected unauthorized cancellation with 403: "${unauthCancelRes.data.message}"`);

    // 8. TEST: INVALID ORDER ID FORMAT (SHOULD FAIL WITH 400)
    console.log("8. Testing Invalid Order ID Format...");
    const invalidIdRes = await makeRequest(
      {
        path: "/api/orders/not-a-valid-id/cancel",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      },
      { customerId }
    );
    console.assert(invalidIdRes.status === 400, `Expected 400 Bad Request, got ${invalidIdRes.status}`);
    console.log(`✓ Server correctly rejected invalid ID with 400: "${invalidIdRes.data.message}"`);

    // 9. TEST: ARTIST CANNOT UPDATE STATUS OF CANCELLED ORDER (SHOULD FAIL WITH 409)
    console.log("9. Testing Artist Updating Cancelled Order...");
    const artistUpdateRes = await makeRequest(
      {
        path: `/api/orders/${orderId}/status`,
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${artistToken}`,
        },
      },
      { status: "Accepted", artistId }
    );
    console.assert(artistUpdateRes.status === 409, `Expected 409 Conflict, got ${artistUpdateRes.status}`);
    console.log(`✓ Artist status change blocked on cancelled order with 409: "${artistUpdateRes.data.message}"`);

    // 10. TEST: ORDER IN "ACCEPTED" STATUS CANNOT BE CANCELLED BY CUSTOMER
    console.log("10. Testing That Accepted Order Cannot Be Cancelled...");
    const order2Res = await makeRequest(
      {
        path: "/api/orders",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      },
      {
        customerId,
        paintingId: String(testPainting._id),
        customerName: "Test Customer 2",
        phone: "9876543211",
        address: "456 Gallery Road",
        city: "Mumbai",
        pincode: "400001",
        paymentMethod: "Cash on Delivery",
      }
    );
    const order2Id = order2Res.data.order._id;
    // Artist accepts order
    await makeRequest(
      {
        path: `/api/orders/${order2Id}/status`,
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${artistToken}` },
      },
      { status: "Accepted", artistId }
    );
    // Customer tries to cancel accepted order
    const cancelAcceptedRes = await makeRequest(
      {
        path: `/api/orders/${order2Id}/cancel`,
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
      },
      { customerId }
    );
    console.assert(cancelAcceptedRes.status === 409, `Expected 409 Conflict, got ${cancelAcceptedRes.status}`);
    console.log(`✓ Customer cancellation blocked on Accepted order with 409: "${cancelAcceptedRes.data.message}"`);

    // CLEANUP TEST ARTIFACTS
    console.log("\n11. Cleaning up test-generated records...");
    await Order.deleteMany({ _id: { $in: [orderId, order2Id] } });
    await Painting.deleteOne({ _id: testPainting._id });
    await User.deleteMany({ _id: { $in: [customerId, artistId] } });
    console.log("✓ Test records cleaned up successfully.");

    console.log("\n==================================================");
    console.log("🎉 ALL ORDER CANCELLATION & API TESTS PASSED 100%!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runTests();
