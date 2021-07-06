import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as util from "util";
import * as path from "path";
import * as os from "os";
import * as textToSpeech from "@google-cloud/text-to-speech";
import AudioEncoding = textToSpeech.protos.
        google.cloud.texttospeech.v1.AudioEncoding;

admin.initializeApp();

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

export const newUserSignUp = functions.auth.user().onCreate((user) => {
  return admin.firestore().collection("users").doc(user.uid).set({
    email: user.email,
    upvotedOn: [],
  });
});

// auth trigger (user deleted)
export const userDeleted = functions.auth.user().onDelete((user) => {
  const doc = admin.firestore().collection("users").doc(user.uid);
  return doc.delete();
});

// http callable function (adding a request)
export const addRequest = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
        "only authenticated users can add requests");
  }
  if (data.text.length > 30) {
    throw new functions.https.HttpsError("invalid-argument",
        "request must be no more than 30 characters long");
  }
  functions.logger.info("Hello from request function2", {structuredData: true});
  return admin.firestore().collection("requests").add({
    text: data.text,
    upvotes: 0,
  });
});

class User {
  constructor(readonly upvotedOn: string[], readonly email: string) { }

  toString(): string {
    return this.email;
  }
}

const userConverter = {
  toFirestore(post: User): FirebaseFirestore.DocumentData {
    return {upvotedOn: post.upvotedOn, email: post.email};
  },
  fromFirestore(
      snapshot: FirebaseFirestore.QueryDocumentSnapshot
  ): User {
    const data = snapshot.data();
    return new User(data.upvotedOn, data.author);
  },
};

// upvote callable function
export const upvote = functions.https.onCall(async (data, context) => {
  const params: { id: string } = data;
  // check auth state
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "only authenticated users can vote up requests",
    );
  }
  // get refs for user doc & request doc
  const request = admin.firestore().collection("requests").doc(params.id);
  const ref = admin.firestore().collection("users")
      .withConverter(userConverter).doc(context.auth.uid);
  const userSnap = await ref.get();
  const user = userSnap.data();
  if (user == undefined) {
    throw new functions.https.HttpsError(
        "not-found",
        "user not found",
    );
  }
  // check thew user hasn"t already upvoted
  if (user.upvotedOn.includes(params.id)) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "You can only vote something up once",
    );
  }

  // update the array in user document
  user.upvotedOn.push(params.id);
  await ref.update(user);
  // update the votes on the request
  return request.update({
    upvotes: admin.firestore.FieldValue.increment(1),
  });
});

export const synthesizeText = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "only authenticated users can vote up requests",
    );
  }
  const text = data.text;
  const hash = data.hash;
  const name = data.name;

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
      audioConfig: {audioEncoding: AudioEncoding.MP3},
    };
    const [response] = await client.synthesizeSpeech(request);
    if (response == undefined) {
      throw new functions.https.HttpsError("internal",
          "remote server error");
    }
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(tempLocalFile, String(response.audioContent), "binary");
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
