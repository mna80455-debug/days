const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const webpush = require("web-push");

admin.initializeApp();

// Load VAPID keys from environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:mna80455@gmail.com",
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn("VAPID Keys not loaded in Cloud Functions. Push notifications will not send.");
}

const sendPushToAll = async (payload) => {
  const db = admin.firestore();
  
  // Query all pushSubscription documents across all users using Collection Group
  const subsSnap = await db.collectionGroup("pushSubscription").get();
  console.log(`Found ${subsSnap.size} subscriptions to notify.`);
  
  const promises = [];
  subsSnap.forEach((doc) => {
    const sub = doc.data();
    if (sub && sub.endpoint) {
      promises.push(
        webpush.sendNotification(sub, JSON.stringify(payload))
          .catch((err) => {
            console.error(`Error sending push to subscription ${doc.id} (user: ${doc.ref.parent.parent.id}):`, err);
            // Auto clean-up expired/unsubscribed browser push tokens
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.log(`Deleting invalid push subscription: ${doc.ref.path}`);
              return doc.ref.delete();
            }
          })
      );
    }
  });
  
  await Promise.all(promises);
};

// 1. Morning notification scheduled for 7:00 AM Cairo Time daily
exports.sendMorningNotification = onSchedule({
  schedule: "0 7 * * *",
  timeZone: "Africa/Cairo",
  memory: "256MiB"
}, async (event) => {
  const arabicOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const todayStr = new Date().toLocaleDateString('ar-EG', arabicOptions);
  
  const payload = {
    title: "أيام ☀️",
    body: `صباح الخير — النهارده ${todayStr}، هتعملي إيه؟`,
    url: "/morning"
  };
  
  await sendPushToAll(payload);
  console.log("Morning notifications successfully sent.");
});

// 2. Evening notification scheduled for 9:00 PM Cairo Time daily
exports.sendEveningNotification = onSchedule({
  schedule: "0 21 * * *",
  timeZone: "Africa/Cairo",
  memory: "256MiB"
}, async (event) => {
  const payload = {
    title: "أيام 🌙",
    body: "🌙 وقت المراجعة — إيه أجمل حاجة حصلت النهارده؟",
    url: "/evening"
  };
  
  await sendPushToAll(payload);
  console.log("Evening notifications successfully sent.");
});

// 3. HTTP trigger to test push notifications instantly
exports.triggerTestNotification = onRequest({ cors: true }, async (req, res) => {
  const type = req.query.type || "morning";
  let payload = {};
  
  if (type === "morning") {
    const arabicOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const todayStr = new Date().toLocaleDateString('ar-EG', arabicOptions);
    payload = {
      title: "أيام ☀️ (تجربة)",
      body: `صباح الخير — النهارده ${todayStr}، هتعملي إيه؟`,
      url: "/morning"
    };
  } else {
    payload = {
      title: "أيام 🌙 (تجربة)",
      body: "🌙 وقت المراجعة — إيه أجمل حاجة حصلت النهارده؟",
      url: "/evening"
    };
  }
  
  try {
    await sendPushToAll(payload);
    res.status(200).send({ 
      success: true, 
      message: `Test push notification of type [${type}] triggered successfully.` 
    });
  } catch (err) {
    console.error("HTTP notification trigger error:", err);
    res.status(500).send({ success: false, error: err.message });
  }
});
