import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyAU4cpGgg5Y1_vutKSBJXuDtxuMrSCvrf4",
  appId: "1:612856433910:web:f34eef1fe8b34f5eee30d7",
  messagingSenderId: "612856433910",
  projectId: "ccosag-d41e5",
  authDomain: "ccosag-d41e5.firebaseapp.com",
  storageBucket: "ccosag-d41e5.appspot.com",
  measurementId: "G-CBE744MSZ1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("Reading JSON data files...");
  const questionsData = JSON.parse(fs.readFileSync("./src/data/questions.json", "utf8"));
  const ceesData = JSON.parse(fs.readFileSync("./src/data/cees.json", "utf8"));

  console.log(`Seeding CEEs (${ceesData.length})...`);
  for (let i = 0; i < ceesData.length; i += 20) {
    const batch = writeBatch(db);
    const chunk = ceesData.slice(i, i + 20);
    chunk.forEach(cee => {
      const ref = doc(db, "cees", cee.id);
      batch.set(ref, cee, { merge: true });
    });
    await batch.commit();
  }

  console.log(`Seeding Questions (${questionsData.length})...`);
  for (let i = 0; i < questionsData.length; i += 20) {
    const batch = writeBatch(db);
    const chunk = questionsData.slice(i, i + 20);
    chunk.forEach(q => {
      const qCopy = { ...q };
      if (Array.isArray(qCopy.tableData)) {
        qCopy.tableData = JSON.stringify(qCopy.tableData);
      }
      const ref = doc(db, "questions", q.id);
      batch.set(ref, qCopy, { merge: true });
    });
    await batch.commit();
  }

  console.log("Database successfully seeded!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
