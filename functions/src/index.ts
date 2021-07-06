import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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
