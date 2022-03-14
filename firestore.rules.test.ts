import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
  RulesTestContext,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  query,
  getDocs,
  where,
  DocumentReference,
  DocumentData,
  CollectionReference,
  Query,
  deleteDoc,
} from "firebase/firestore";

let testEnv: RulesTestEnvironment;
let context: RulesTestContext;
let db: ReturnType<RulesTestContext["firestore"]>;
const USER_ID = "myUserId";
const WORKSPACE_ID = "myWorkspaceId";

/**
 * Helper function which expect an object with keys
 * equal to document paths and values equal to documents
 * which should be preloaded in firestore before
 * running a test.
 */
async function loadTestData(data: {
  [docPath: string]: { [docProp: string]: unknown };
}) {
  await testEnv.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();

    await Promise.all(
      Object.entries(data).map(async ([path, docData]) => {
        await setDoc(doc(db, path), docData);
      })
    );
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-project-1234",
    firestore: {
      host: "localhost",
      port: 8080,
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe("authenticated", () => {
  beforeEach(async () => {
    context = testEnv.authenticatedContext(USER_ID);
    db = context.firestore();
  });

  describe("posts", () => {
    let workspaceDocData: Record<string, string>;
    let workspaceDocRef: DocumentReference<DocumentData>;

    let channelDocData: Record<string, string>;
    let channelDocRef: DocumentReference<DocumentData>;

    describe("getDoc", () => {
      beforeEach(async () => {
        workspaceDocData = {
          name: "Levels Health Inc.",
        };

        workspaceDocRef = doc(db, `workspaces/${WORKSPACE_ID}`);

        channelDocData = {
          workspaceId: WORKSPACE_ID,
        };

        channelDocRef = doc(db, `channels/123`);

        await loadTestData({
          [workspaceDocRef.path]: workspaceDocData,
          [channelDocRef.path]: channelDocData,
        });
      });

      test("user has access to channel", async () => {
        const postRef = doc(db, `posts/123`);
        const postData = {
          channels: [channelDocRef.id],
        };

        await loadTestData({
          [`users/${USER_ID}`]: {
            firstName: "John",
            lastName: "Test",
            channels: [channelDocRef.id],
          },
          [postRef.path]: postData,
        });

        const snap = await assertSucceeds(getDoc(postRef));

        expect(snap.data()).toEqual(postData);
      });
    });
  });
});
