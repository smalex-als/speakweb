const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.newUserSignUp = functions.auth.user().onCreate((user) => {
  return admin.firestore().collection("users").doc(user.uid).set({
    email: user.email,
    upvotedOn: [],
  });
});

// auth trigger (user deleted)
exports.userDeleted = functions.auth.user().onDelete((user) => {
  const doc = admin.firestore().collection("users").doc(user.uid);
  return doc.delete();
});

// http callable function (adding a request)
exports.addRequest = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
        "only authenticated users can add requests");
  }
  if (data.text.length > 30) {
    throw new functions.https.HttpsError("invalid-argument",
        "request must be no more than 30 characters long");
  }
  return admin.firestore().collection("requests").add({
    text: data.text,
    upvotes: 0,
  });
});

exports.synthesizeText = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "only authenticated users can vote up requests",
    );
  }
  const text = data.text;
  const hash = data.hash;
  const name = data.name;
  const textToSpeech = require("@google-cloud/text-to-speech");
  const fs = require("fs");
  const util = require("util");
  const path = require("path");
  const os = require("os");

  const basename = hash + ".mp3";
  const fullname = "audio/" + basename;
  const tempLocalFile = path.join(os.tmpdir(), basename);

  const bucket = admin.storage().bucket(functions.config().storageBucket);
  const [exists] = await bucket.file(fullname).exists();
  if (!exists) {
    console.log("not exists");
    const client = new textToSpeech.TextToSpeechClient();
    const request = {
      input: {text: text},
      voice: {languageCode: "en-US", name: name},
      audioConfig: {audioEncoding: "MP3"},
    };
    const [response] = await client.synthesizeSpeech(request);
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(tempLocalFile, response.audioContent, "binary");
    console.log("Audio content written to file");
    const uploadResponse = await bucket.upload(tempLocalFile, {
      destination: fullname,
      public: true,
    });
    functions.logger.log("mp3 file uploaded to Storage at", uploadResponse);
    fs.unlinkSync(tempLocalFile);

    // const url = uploadResponse[1].mediaLink;
    // functions.logger.log("mp3 file uploaded to Storage at", url);
  } else {
    console.log("exists " + fullname);
  }
  return bucket.file(fullname).publicUrl();
});

// // upvote callable function
exports.upvote = functions.https.onCall(async (data, context) => {
  // check auth state
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "only authenticated users can vote up requests",
    );
  }
  // get refs for user doc & request doc
  const user = admin.firestore().collection("users").doc(context.auth.uid);
  const request = admin.firestore().collection("requests").doc(data.id);

  const doc = await user.get();
  // check thew user hasn"t already upvoted
  if (doc.data().upvotedOn.includes(data.id)) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "You can only vote something up once",
    );
  }

  // update the array in user document
  await user.update({
    upvotedOn: [...doc.data().upvotedOn, data.id],
  });
  // update the votes on the request
  return request.update({
    upvotes: admin.firestore.FieldValue.increment(1),
  });
});

// firestore trigger for tracking activity
exports.logActivities = functions.firestore.document("/{collection}/{id}")
    .onCreate((snap, context) => {
      console.log(snap.data());

      const activities = admin.firestore().collection("activities");
      const collection = context.params.collection;

      if (collection === "requests") {
        return activities.add({text: "a new tutorial request was added"});
      }
      if (collection === "users") {
        return activities.add({text: "a new user signed up"});
      }

      return null;
    });
