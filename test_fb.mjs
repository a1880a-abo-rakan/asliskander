import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
console.log("Config project:", config.projectId, "databaseId:", config.firestoreDatabaseId);

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    console.log("Fetching users collection...");
    const snap = await getDocs(collection(db, "users"));
    console.log("SUCCESS! Found users count:", snap.size);
    snap.forEach(d => {
      console.log(" - User doc id:", d.id, "data:", JSON.stringify(d.data()));
    });

    console.log("\nFetching days collection (limiting check)...");
    const daysSnap = await getDocs(collection(db, "days"));
    console.log("SUCCESS! Found days count in Firestore:", daysSnap.size);
    const dayDates = [];
    daysSnap.forEach(d => dayDates.push(d.data().date));
    const uniqueDates = Array.from(new Set(dayDates)).sort();
    console.log("Dates in Firestore (last 10):", uniqueDates.slice(-10));
    const dates18to20 = uniqueDates.filter(d => d >= '2026-09-18' && d <= '2026-09-21');
    console.log("Dates 18-21 in Firestore:", dates18to20);
    process.exit(0);
  } catch (err) {
    console.error("Firestore test error:", err.code, err.message);
    process.exit(1);
  }
}

run();
