import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Settings, DailyEntry, SharedDiesel, TaxInvoice, UnifiedUser, Purchase, Employee, EmployeeAdvance, EmployeeAttendance, EmployeeDeductionConfig, EmployeeViolation, BakeryEntry, DrinksEntry } from "./src/types";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

// Firebase Integration Setup
import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc 
} from "firebase/firestore";

let firebaseConfig: any = null;
const CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");

if (fs.existsSync(CONFIG_PATH)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (err) {
    console.warn("Could not parse firebase-applet-config.json, falling back to environment variables.", err);
  }
}

if (!firebaseConfig) {
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.projectId,
    appId: process.env.FIREBASE_APP_ID || process.env.appId,
    apiKey: process.env.FIREBASE_API_KEY || process.env.apiKey,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.authDomain,
    firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || process.env.firestoreDatabaseId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.storageBucket,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.messagingSenderId,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || process.env.measurementId || ""
  };
}

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId || "(default)");


// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Helper to perform Gemini API generation with resilient retries for transient/503 errors
async function generateContentWithRetry(params: any, maxRetries = 3, delayMs = 1000) {
  if (!ai) {
    throw new Error("لم يتم تهيئة مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) في الخادم بشكل صحيح.");
  }
  let attempt = 0;
  // Dynamic fallback models list to stay operational when a model gets 503 high-demand errors
  const modelsToTry = [
    params.model || "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];

  while (attempt <= maxRetries) {
    try {
      const currentModel = modelsToTry[attempt % modelsToTry.length];
      const targetParams = { ...params, model: currentModel };
      
      // Remove thinkingConfig for flash-lite or if requested speed is paramount
      if (currentModel === "gemini-3.1-flash-lite") {
        if (targetParams.config) {
          delete targetParams.config.thinkingConfig;
        }
      }

      console.log(`[Gemini API] Requesting ${currentModel} (Attempt ${attempt + 1}/${maxRetries + 1})...`);
      return await ai.models.generateContent(targetParams);
    } catch (err: any) {
      const errMsg = err.message || "";
      const isTransient = 
        errMsg.includes("503") || 
        errMsg.includes("high demand") || 
        errMsg.includes("temporary") || 
        errMsg.includes("UNAVAILABLE") || 
        errMsg.includes("Rate limit") || 
        errMsg.includes("resource exhausted") ||
        err.status === "UNAVAILABLE" ||
        err.status === 429 ||
        err.status === 503;

      if (isTransient && attempt < maxRetries) {
        attempt++;
        // First retry can happen instantly (100ms) to switch backend pool immediately
        const waitTime = attempt === 1 ? 150 : delayMs;
        console.warn(`[Gemini API] Transient error (Attempt ${attempt}/${maxRetries}). Retrying in ${waitTime}ms... Error: ${errMsg}`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        delayMs *= 1.5;
      } else {
        throw err;
      }
    }
  }
}

// Initial default settings
const DEFAULT_SETTINGS: Settings = {
  "رسوم_مدى": 0.8,
  "رسوم_فيزا": 1.5,
  "صرف_افتراضي": 350,
  "سقف_بيبسي": 400,
  "سقف_بيبسي_قادسية": 400,
  "سقف_بيبسي_مروج": 400,
  "سقف_بلاستيك": 100,
  "سقف_بلاستيك_قادسية": 100,
  "سقف_بلاستيك_مروج": 100,
  "سقف_صلصات": 150,
  "سقف_صلصات_قادسية": 150,
  "سقف_صلصات_مروج": 150,
  "سقف_ديزل_قادسية": 50,
  "سقف_ديزل_مروج": 30,
  "زيادة_عالي": 25,
  "نسبة_قادسية_ديزل": 70,
  "نسبة_مروج_ديزل": 30,
  "ايام_مقارنة": 7,
  "سقف_نسبة_السلفة_القصوى": 50
};

// Firestore helper functions
function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanObject(value);
      }
    }
    return cleaned;
  }
  return obj;
}

async function getSettings(): Promise<Settings> {
  try {
    const snap = await getDoc(doc(db, "settings", "app_settings"));
    if (snap.exists()) {
      const data = snap.data() as Settings;
      return {
        ...DEFAULT_SETTINGS,
        ...data,
        "سقف_بيبسي_قادسية": data.سقف_بيبسي_قادسية ?? data.سقف_بيبسي ?? DEFAULT_SETTINGS.سقف_بيبسي_قادسية,
        "سقف_بيبسي_مروج": data.سقف_بيبسي_مروج ?? data.سقف_بيبسي ?? DEFAULT_SETTINGS.سقف_بيبسي_مروج,
        "سقف_بلاستيك_قادسية": data.سقف_بلاستيك_قادسية ?? data.سقف_بلاستيك ?? DEFAULT_SETTINGS.سقف_بلاستيك_قادسية,
        "سقف_بلاستيك_مروج": data.سقف_بلاستيك_مروج ?? data.سقف_بلاستيك ?? DEFAULT_SETTINGS.سقف_بلاستيك_مروج,
        "سقف_صلصات_قادسية": data.سقف_صلصات_قادسية ?? data.سقف_صلصات ?? DEFAULT_SETTINGS.سقف_صلصات_قادسية,
        "سقف_صلصات_mروج": data.سقف_صلصات_مروج ?? data.سقف_صلصات ?? DEFAULT_SETTINGS.سقف_صلصات_مروج, // keep backward fallback if any
        "سقف_صلصات_مروج": data.سقف_صلصات_مروج ?? data.سقف_صلصات ?? DEFAULT_SETTINGS.سقف_صلصات_مروج,
      } as Settings;
    } else {
      // Seed default settings on first load
      await setDoc(doc(db, "settings", "app_settings"), cleanObject(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
  } catch (err) {
    console.error("Error reading settings from Firestore:", err);
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings: Settings): Promise<void> {
  try {
    await setDoc(doc(db, "settings", "app_settings"), cleanObject(settings));
  } catch (err) {
    console.error("Error saving settings to Firestore:", err);
  }
}

const DEFAULT_DEDUCTION_CONFIG: EmployeeDeductionConfig = {
  id: "global-rules",
  simpleThresholdMinutes: 15,
  mediumThresholdMinutes: 30,
  largeThresholdMinutes: 60,
  simpleMaxWarnings: 3,
  simpleDeductionHours: 1,
  mediumDeductionHours: 3,
  largeDeductionDayFraction: 0.5,
  severeDeductionDayFraction: 1.0
};

async function getEmployeeDeductionConfig(): Promise<EmployeeDeductionConfig> {
  try {
    const snap = await getDoc(doc(db, "settings", "employee_deduction_rules"));
    if (snap.exists()) {
      return snap.data() as EmployeeDeductionConfig;
    } else {
      await setDoc(doc(db, "settings", "employee_deduction_rules"), cleanObject(DEFAULT_DEDUCTION_CONFIG));
      return DEFAULT_DEDUCTION_CONFIG;
    }
  } catch (err) {
    console.error("Error reading employee deduction rules from Firestore:", err);
    return DEFAULT_DEDUCTION_CONFIG;
  }
}

async function saveEmployeeDeductionConfig(config: EmployeeDeductionConfig): Promise<void> {
  try {
    await setDoc(doc(db, "settings", "employee_deduction_rules"), cleanObject(config));
  } catch (err) {
    console.error("Error saving employee deduction rules to Firestore:", err);
  }
}


async function getUsers(): Promise<UnifiedUser[]> {
  try {
    const snap = await getDocs(collection(db, "users"));
    const list: UnifiedUser[] = [];
    snap.forEach((d) => {
      const data = d.data() as UnifiedUser;
      if (data) {
        if (!data.id) {
          data.id = d.id;
        }
        list.push(data);
      }
    });

    // Seed default admin if list is empty
    if (list.length === 0) {
      const defaultAdmin: UnifiedUser = {
        id: "admin",
        username: "admin",
        displayName: "المدير العام",
        password: "123",
        role: "مدير",
        status: "نشط",
        branch: "الكل",
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "users", "admin"), cleanObject(defaultAdmin));
      list.push(defaultAdmin);
    }

    return list;
  } catch (err) {
    console.error("Error loading users from Firestore:", err);
    return [{
      id: "admin",
      username: "admin",
      displayName: "المدير العام",
      password: "123",
      role: "مدير",
      status: "نشط",
      branch: "الكل",
      createdAt: new Date().toISOString()
    }];
  }
}

async function saveUser(user: UnifiedUser): Promise<void> {
  try {
    await setDoc(doc(db, "users", user.id), cleanObject(user));
  } catch (err) {
    console.error("Error saving user to Firestore:", err);
  }
}

async function deleteUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (err) {
    console.error("Error deleting user from Firestore:", err);
  }
}

// --- EMPLOYEE HELPERS ---
async function getEmployees(): Promise<Employee[]> {
  try {
    const snap = await getDocs(collection(db, "employees"));
    const list: Employee[] = [];
    snap.forEach((d) => {
      const data = d.data() as Employee;
      if (data) {
        if (!data.id) data.id = d.id;
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error loading employees from Firestore:", err);
    return [];
  }
}

async function saveEmployee(emp: Employee): Promise<void> {
  try {
    await setDoc(doc(db, "employees", emp.id), cleanObject(emp));
  } catch (err) {
    console.error("Error saving employee to Firestore:", err);
  }
}

async function deleteEmployee(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "employees", id));
  } catch (err) {
    console.error("Error deleting employee from Firestore:", err);
  }
}

async function getEmployeeAdvances(): Promise<EmployeeAdvance[]> {
  try {
    const snap = await getDocs(collection(db, "employee_advances"));
    const list: EmployeeAdvance[] = [];
    snap.forEach((d) => {
      const data = d.data() as EmployeeAdvance;
      if (data) {
        if (!data.id) data.id = d.id;
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error loading advances from Firestore:", err);
    return [];
  }
}

async function saveEmployeeAdvance(adv: EmployeeAdvance): Promise<void> {
  try {
    await setDoc(doc(db, "employee_advances", adv.id), cleanObject(adv));
  } catch (err) {
    console.error("Error saving advance to Firestore:", err);
  }
}

async function deleteEmployeeAdvance(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "employee_advances", id));
  } catch (err) {
    console.error("Error deleting advance from Firestore:", err);
  }
}

async function getEmployeeViolations(): Promise<EmployeeViolation[]> {
  try {
    const snap = await getDocs(collection(db, "employee_violations"));
    const list: EmployeeViolation[] = [];
    snap.forEach((d) => {
      const data = d.data() as EmployeeViolation;
      if (data) {
        if (!data.id) data.id = d.id;
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error loading violations from Firestore:", err);
    return [];
  }
}

async function saveEmployeeViolation(v: EmployeeViolation): Promise<void> {
  try {
    await setDoc(doc(db, "employee_violations", v.id), cleanObject(v));
  } catch (err) {
    console.error("Error saving violation to Firestore:", err);
  }
}

async function deleteEmployeeViolation(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "employee_violations", id));
  } catch (err) {
    console.error("Error deleting violation from Firestore:", err);
  }
}

async function getEmployeeAttendance(): Promise<EmployeeAttendance[]> {
  try {
    const snap = await getDocs(collection(db, "employee_attendance"));
    const list: EmployeeAttendance[] = [];
    snap.forEach((d) => {
      const data = d.data() as EmployeeAttendance;
      if (data) {
        if (!data.id) data.id = d.id;
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error loading attendance from Firestore:", err);
    return [];
  }
}

async function saveEmployeeAttendance(att: EmployeeAttendance): Promise<void> {
  try {
    await setDoc(doc(db, "employee_attendance", att.id), cleanObject(att));
  } catch (err) {
    console.error("Error saving attendance to Firestore:", err);
  }
}

async function deleteEmployeeAttendance(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "employee_attendance", id));
  } catch (err) {
    console.error("Error deleting attendance from Firestore:", err);
  }
}

async function getDays(): Promise<DailyEntry[]> {
  try {
    const snap = await getDocs(collection(db, "days"));
    const list: DailyEntry[] = [];
    snap.forEach((d) => {
      const data = d.data() as DailyEntry;
      if (data) {
        if (!data.id) {
          data.id = d.id;
        }
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error reading days from Firestore:", err);
    return [];
  }
}

async function saveDays(days: DailyEntry[]): Promise<void> {
  try {
    for (const d of days) {
      if (!d || !d.id) {
        console.warn("Skipping save for DailyEntry with missing or invalid ID:", d);
        continue;
      }
      await setDoc(doc(db, "days", d.id), cleanObject(d));
    }
  } catch (err) {
    console.error("Error saving days to Firestore:", err);
  }
}

async function deleteDay(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "days", id));
    await deletePurchasesForDay(id);
  } catch (err) {
    console.error("Error deleting day from Firestore:", err);
  }
}

async function getDiesels(): Promise<SharedDiesel[]> {
  try {
    const snap = await getDocs(collection(db, "diesel"));
    const list: SharedDiesel[] = [];
    snap.forEach((d) => {
      const data = d.data() as SharedDiesel;
      if (data) {
        if (!data.id) {
          data.id = d.id;
        }
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error reading diesels from Firestore:", err);
    return [];
  }
}

async function saveDiesels(bills: SharedDiesel[]): Promise<void> {
  try {
    for (const b of bills) {
      if (!b || !b.id) {
        console.warn("Skipping save for Diesel with missing or invalid ID:", b);
        continue;
      }
      await setDoc(doc(db, "diesel", b.id), cleanObject(b));
    }
  } catch (err) {
    console.error("Error saving diesels to Firestore:", err);
  }
}

async function getTaxInvoices(): Promise<TaxInvoice[]> {
  try {
    const snap = await getDocs(collection(db, "tax_invoices"));
    const list: TaxInvoice[] = [];
    snap.forEach((d) => {
      const data = d.data() as TaxInvoice;
      if (data) {
        if (!data.id) {
          data.id = d.id;
        }
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error reading tax invoices from Firestore:", err);
    return [];
  }
}

async function saveTaxInvoices(invoices: TaxInvoice[]): Promise<void> {
  try {
    for (const i of invoices) {
      if (!i || !i.id) {
        console.warn("Skipping save for TaxInvoice with missing or invalid ID:", i);
        continue;
      }
      await setDoc(doc(db, "tax_invoices", i.id), cleanObject(i));
    }
  } catch (err) {
    console.error("Error saving tax invoices to Firestore:", err);
  }
}

async function deleteTaxInvoice(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "tax_invoices", id));
  } catch (err) {
    console.error("Error deleting tax invoice from Firestore:", err);
  }
}

interface TaxCompany {
  id: string;
  name: string;
}

async function getTaxRegisteredCompanies(): Promise<TaxCompany[]> {
  try {
    const snap = await getDocs(collection(db, "tax_registered_companies"));
    const list: TaxCompany[] = [];
    snap.forEach((d) => {
      const data = d.data() as TaxCompany;
      if (data) {
        if (!data.id) data.id = d.id;
        list.push(data);
      }
    });

    if (list.length === 0) {
      // Seed with existing companies from tax_invoices on first launch!
      const invoices = await getTaxInvoices();
      const uniqueNames = Array.from(new Set(invoices.map((i) => i.company).filter(Boolean)));
      for (const name of uniqueNames) {
        const id = `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const comp: TaxCompany = { id, name };
        await setDoc(doc(db, "tax_registered_companies", id), comp);
        list.push(comp);
      }
    }

    list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    return list;
  } catch (err) {
    console.error("Error reading tax registered companies from Firestore:", err);
    return [];
  }
}

async function saveTaxRegisteredCompany(company: TaxCompany): Promise<void> {
  try {
    console.log(`[FIRESTORE SAVE] Attempting to save doc 'tax_registered_companies' with ID: "${company.id}", Name: "${company.name}"`);
    await setDoc(doc(db, "tax_registered_companies", company.id), cleanObject(company));
    console.log(`[FIRESTORE SAVE] Completed setDoc call for ID: "${company.id}"`);
  } catch (err) {
    console.error("Error saving tax registered company to Firestore:", err);
    throw err;
  }
}

async function deleteTaxRegisteredCompany(id: string): Promise<void> {
  try {
    console.log(`[FIRESTORE DELETE] Attempting to delete doc 'tax_registered_companies' with ID: "${id}"`);
    await deleteDoc(doc(db, "tax_registered_companies", id));
    console.log(`[FIRESTORE DELETE] Completed deleteDoc call for ID: "${id}"`);
  } catch (err) {
    console.error("Error deleting tax registered company from Firestore:", err);
    throw err;
  }
}

async function getBakeryEntries(): Promise<BakeryEntry[]> {
  try {
    const snap = await getDocs(collection(db, "bakery_entries"));
    const list: BakeryEntry[] = [];
    snap.forEach((d) => {
      const data = d.data() as BakeryEntry;
      if (data) {
        if (!data.id) data.id = d.id;
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error reading bakery entries from Firestore:", err);
    return [];
  }
}

async function saveBakeryEntry(entry: BakeryEntry): Promise<void> {
  try {
    await setDoc(doc(db, "bakery_entries", entry.id), cleanObject(entry));
  } catch (err) {
    console.error("Error saving bakery entry to Firestore:", err);
    throw err;
  }
}

async function deleteBakeryEntry(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "bakery_entries", id));
  } catch (err) {
    console.error("Error deleting bakery entry from Firestore:", err);
    throw err;
  }
}

async function getDrinksEntries(): Promise<DrinksEntry[]> {
  try {
    const snap = await getDocs(collection(db, "drinks_entries"));
    const list: DrinksEntry[] = [];
    snap.forEach((d) => {
      const data = d.data() as DrinksEntry;
      if (data) {
        if (!data.id) data.id = d.id;
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error reading drinks entries from Firestore:", err);
    return [];
  }
}

async function saveDrinksEntry(entry: DrinksEntry): Promise<void> {
  try {
    await setDoc(doc(db, "drinks_entries", entry.id), cleanObject(entry));
  } catch (err) {
    console.error("Error saving drinks entry to Firestore:", err);
    throw err;
  }
}

async function deleteDrinksEntry(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "drinks_entries", id));
  } catch (err) {
    console.error("Error deleting drinks entry from Firestore:", err);
    throw err;
  }
}

const DEFAULT_DRINK_PRICES = {
  pepsi: 2.5,
  sevenup: 2.5,
  dew: 2.5,
  citrus: 2.5,
  pepsi_diet: 2.0,
  sevenup_diet: 2.0,
  dew_diet: 2.0,
  citrus_diet: 2.0
};

async function getDrinkPrices(): Promise<Record<string, number>> {
  try {
    const snap = await getDoc(doc(db, "settings", "drink_prices"));
    if (snap.exists()) {
      return { ...DEFAULT_DRINK_PRICES, ...snap.data() };
    }
    return DEFAULT_DRINK_PRICES;
  } catch (err) {
    console.error("Error reading drink prices from Firestore:", err);
    return DEFAULT_DRINK_PRICES;
  }
}

async function saveDrinkPrices(prices: Record<string, number>): Promise<void> {
  try {
    await setDoc(doc(db, "settings", "drink_prices"), cleanObject(prices));
  } catch (err) {
    console.error("Error saving drink prices to Firestore:", err);
    throw err;
  }
}

async function getPurchases(): Promise<Purchase[]> {
  try {
    const snap = await getDocs(collection(db, "purchases"));
    const list: Purchase[] = [];
    snap.forEach((d) => {
      const data = d.data() as Purchase;
      if (data) {
        if (!data.id) {
          data.id = d.id;
        }
        list.push(data);
      }
    });
    return list;
  } catch (err) {
    console.error("Error reading purchases from Firestore:", err);
    return [];
  }
}

async function savePurchase(p: Purchase): Promise<void> {
  try {
    await setDoc(doc(db, "purchases", p.id), cleanObject(p));
  } catch (err) {
    console.error("Error saving purchase to Firestore:", err);
  }
}

async function deletePurchase(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "purchases", id));
  } catch (err) {
    console.error("Error deleting purchase from Firestore:", err);
  }
}

async function deletePurchasesForDay(dayId: string) {
  try {
    const decodedId = decodeURIComponent(dayId).trim();
    const allPurchases = await getPurchases();
    const toDelete = allPurchases.filter(p => {
      const isStart = (p.id && (p.id.startsWith(`pur-${dayId}-`) || p.id.startsWith(`pur-${decodedId}-`))) || false;
      const isHeaderMatch = p.invoiceId === dayId || p.invoiceId === decodedId || (p.invoiceId?.trim() === decodedId);
      return isStart || isHeaderMatch;
    });
    for (const p of toDelete) {
      await deleteDoc(doc(db, "purchases", p.id));
    }
  } catch (err) {
    console.error("Error deleting day purchases:", err);
  }
}

function normalizeArabicString(str: string): string {
  if (!str) return "";
  let s = str.trim().toLowerCase();
  
  // 1. Remove Harakat (diacritics)
  s = s.replace(/[\u064B-\u0652]/g, "");
  
  // 2. Normalize Hamzas to Alif
  s = s.replace(/[أإآ]/g, "ا");
  
  // 3. Normalize other characters
  s = s.replace(/ة/g, "ه");
  s = s.replace(/ى/g, "ي");
  s = s.replace(/ؤ/g, "ء");
  s = s.replace(/ئ/g, "ء");
  
  // 4. Remove Al- prefix at boundaries safely (only if word length > 3 to not ruin words like ال)
  // e.g. replace "البيت" with "بيت", but "ال" remains "ال" or "اله" stays "اله"
  s = s.replace(/\bال([\u0600-\u06FF]{3,})/g, "$1");
  s = s.replace(/^ال([\u0600-\u06FF]{3,})/g, "$1");
  
  // 5. Remove non-alphanumeric characters but keep spaces and Arabic letters/numbers
  s = s.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "");
  
  // 6. Collapse multiple spaces
  s = s.replace(/\s+/g, " ");
  
  return s.trim();
}

async function deletePurchasesForInvoice(invoiceId: string) {
  try {
    const decodedId = decodeURIComponent(invoiceId).trim();
    const allPurchases = await getPurchases();
    const toDelete = allPurchases.filter(p => {
      if (!p.invoiceId) return false;
      const pInvId = p.invoiceId.trim();
      return pInvId === invoiceId || 
             pInvId === decodedId || 
             pInvId.toLowerCase() === invoiceId.toLowerCase() || 
             pInvId.toLowerCase() === decodedId.toLowerCase();
    });
    for (const p of toDelete) {
      await deleteDoc(doc(db, "purchases", p.id));
    }
  } catch (err) {
    console.error("Error deleting invoice purchases:", err);
  }
}

function getConsolidatedProductName(name: string): string {
  if (!name) return "";
  const norm = normalizeArabicString(name);
  if (norm.includes("غاز") || norm.includes("gas")) return "غاز";
  if (norm.includes("خضار") || norm.includes("خضروات") || norm.includes("vegetable")) return "خضار";
  if (norm.includes("خبز") || norm.includes("عجين") || norm.includes("bread")) return "خبز";
  if (norm.includes("بقاله") || norm.includes("سوبرماركت") || norm.includes("grocery")) return "بقالة";
  if (norm.includes("ديزل") || norm.includes("diesel")) return "ديزل";
  return name.trim();
}

async function addNewPurchaseInServer(data: Omit<Purchase, "id">): Promise<Purchase> {
  const allPurchases = await getPurchases();
  const cleanName = getConsolidatedProductName(data.name.trim());
  const normName = normalizeArabicString(cleanName);
  
  // Find all previous active purchases of same item in the same branch to auto-deplete them
  // We check if normalized names match, same branch, it is active, and date of new purchase is >= active item's date via safe timestamp logic
  const activePrevs = allPurchases.filter((p) => {
    const isSameName = normalizeArabicString(p.name) === normName;
    const isSameBranch = p.branch === data.branch;
    const isActive = p.status === 'active';
    
    const dPrev = new Date(p.date).getTime() || 0;
    const dNew = new Date(data.date).getTime() || 0;
    const isNewerOrEqual = dNew >= dPrev;

    return isSameName && isSameBranch && isActive && isNewerOrEqual;
  });
  
  for (const prev of activePrevs) {
    prev.status = 'depleted';
    prev.depletedDate = data.date;
    await savePurchase(prev);
  }
  
  const newPurchase: Purchase = {
    ...data,
    id: `pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: cleanName
  };
  await savePurchase(newPurchase);
  return newPurchase;
}

function parseQtyVal(q: string | number | undefined): number {
  if (q === undefined || q === null) return 1;
  if (typeof q === "number") return q;
  const match = String(q).replace(/,/g, "").match(/[+-]?([0-9]*[.])?[0-9]+/);
  if (match) {
    return parseFloat(match[0]) || 1;
  }
  return 1;
}

async function autoRegisterDayInputsAsPurchases(entry: DailyEntry) {
  try {
    // 1. Delete previous records for this day so we can do a clean sync / refresh on edits
    await deletePurchasesForDay(entry.id);

    // 2. Fetch current purchase records for auto depletion checks
    const allPurchases = await getPurchases();

    const addOrUpdate = async (itemKey: string, itemName: string, priceVal: number, customQty?: string) => {
      if (priceVal <= 0) return;
      const cleanName = getConsolidatedProductName(itemName.trim());
      const normName = normalizeArabicString(cleanName);
      
      // Auto-depletion logic: Find previous active purchases of the same item in the same branch to auto-deplete them
      // Don't deplete items marked for the current day being registered (they start with `pur-${entry.id}-`)
      const activePrevs = allPurchases.filter((p) => {
        const isSameName = normalizeArabicString(p.name) === normName;
        const isSameBranch = p.branch === entry.branch;
        const isActive = p.status === 'active';
        const isNotCurrentDay = !p.id.startsWith(`pur-${entry.id}-`);
        
        const dPrev = new Date(p.date).getTime() || 0;
        const dNew = new Date(entry.date).getTime() || 0;
        const isNewerOrEqual = dNew >= dPrev;

        return isSameName && isSameBranch && isActive && isNotCurrentDay && isNewerOrEqual;
      });
        
      for (const prev of activePrevs) {
        prev.status = 'depleted';
        prev.depletedDate = entry.date;
        await savePurchase(prev);
      }

      const p: Purchase = {
        id: `pur-${entry.id}-${itemKey}`,
        name: cleanName,
        date: entry.date,
        qty: customQty || "1",
        type: 'direct',
        price: priceVal,
        branch: entry.branch,
        status: 'active',
        source: 'manual',
        invoiceId: entry.id
      };
      await savePurchase(p);
      allPurchases.push(p);
    };

    // Standard cash box expenses (المصروفات النقدية وقسم المصروفات)
    const gasVal = Math.max(entry.pur_gas || 0, entry.gas || 0);
    if (gasVal > 0) {
      await addOrUpdate("gas", "غاز", gasVal, "1");
    }

    const breadVal = Math.max(entry.pur_bread || 0, entry.bread || 0);
    if (breadVal > 0) {
      await addOrUpdate("bread", "خبز", breadVal, "1");
    }

    const vegVal = Math.max(entry.pur_veg || 0, entry.vegetables || 0);
    if (vegVal > 0) {
      await addOrUpdate("veg", "خضار", vegVal, "1");
    }

    const grocVal = Math.max(entry.pur_groc || 0, entry.grocery || 0);
    if (grocVal > 0) {
      await addOrUpdate("groc", "بقالة", grocVal, "1");
    }

    // Invoices / payments entered as part of day
    if (entry.pepsi_paid && entry.pepsi_paid > 0 && entry.pepsi_type === 'invoice') {
      await addOrUpdate("pepsi", "بيبسي", entry.pepsi_paid, "1");
    }
    if (entry.plastic_paid && entry.plastic_paid > 0 && entry.plastic_type === 'invoice') {
      await addOrUpdate("plastic", "بلاستيك", entry.plastic_paid, "1");
    }
    if (entry.sauces_paid && entry.sauces_paid > 0 && entry.sauces_type === 'invoice') {
      await addOrUpdate("sauces", "صلصات", entry.sauces_paid, "1");
    }
    // Only register Diesel if it is a new Invoice, completely ignoring fragmented payments/installments
    if (entry.diesel_paid && entry.diesel_paid > 0 && entry.diesel_type === 'invoice') {
      await addOrUpdate("diesel", "ديزل", entry.diesel_paid, "1");
    }

    // Handlers for pur_extras (المصروفات الإضافية بالطوارئ وغيرها)
    if (entry.pur_extras && entry.pur_extras.length > 0) {
      for (let i = 0; i < entry.pur_extras.length; i++) {
        const extra = entry.pur_extras[i];
        if (extra.name && extra.amt > 0) {
          await addOrUpdate(`extra-${i}`, extra.name, extra.amt, "1");
        }
      }
    }

    // Handlers for others (المصروفات الأخرى)
    if (entry.others && entry.others.length > 0) {
      for (let i = 0; i < entry.others.length; i++) {
        const oInput = entry.others[i];
        if (oInput.name && oInput.amt > 0) {
          await addOrUpdate(`other-${i}`, oInput.name, oInput.amt, "1");
        }
      }
    }

  } catch (err) {
    console.error("Error auto-registering day inputs as purchases:", err);
  }
}

async function autoRegisterInvoiceItemsAsPurchases(invoice: TaxInvoice, externalPurchases?: Purchase[]) {
  if (!invoice.items || invoice.items.length === 0) return;
  const allPurchases = externalPurchases || (await getPurchases());
  
  for (const item of invoice.items) {
    if (!item || !item.name || item.name.trim() === "") continue;
    const cleanName = getConsolidatedProductName(item.name.trim());
    const normName = normalizeArabicString(cleanName);
    
    // Find all previous active purchases of same item in the same branch to auto-deplete them
    // Exclude items in the SAME invoice! And date must be >= via safe timestamp comparison
    const activePrevs = allPurchases.filter((p) => {
      const isSameName = normalizeArabicString(p.name) === normName;
      const isSameBranch = p.branch === invoice.branch;
      const isActive = p.status === 'active';
      const isDifferentInvoice = p.invoiceId !== invoice.id;

      const dPrev = new Date(p.date).getTime() || 0;
      const dNew = new Date(invoice.date).getTime() || 0;
      const isNewerOrEqual = dNew >= dPrev;

      return isSameName && isSameBranch && isActive && isDifferentInvoice && isNewerOrEqual;
    });
      
    for (const prev of activePrevs) {
      prev.status = 'depleted';
      prev.depletedDate = invoice.date;
      await savePurchase(prev);
    }
    
    const numericQty = parseQtyVal(item.qty);
    const unitPrice = numericQty > 0 ? Number((item.price_with_tax / numericQty).toFixed(2)) : item.price_with_tax;

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: cleanName,
      date: invoice.date,
      qty: item.qty ? String(item.qty) : "1",
      type: 'direct',
      price: unitPrice || item.price_with_tax || invoice.amount,
      branch: invoice.branch,
      status: 'active',
      source: 'invoice',
      invoiceId: invoice.id,
      category: item.category
    };
    await savePurchase(newPurchase);
    allPurchases.push(newPurchase); // instantly accessible within the sequential in-memory flow
  }
}



// Helper for safe category-specific carryover calculations with payment vs invoice status
function calculateCategoryCarryover(
  entry: any,
  prevCarry: number,
  paid: number,
  type: "payment" | "invoice" | undefined,
  limit: number,
  prevKey: string,
  deductKey: string,
  nextKey: string
): number {
  entry[prevKey] = Number(prevCarry.toFixed(2));
  
  let deduct = 0;
  let nextCarry = 0;

  if (prevCarry > 0) {
    if (paid > 0) {
      if (type === "invoice") {
        // Adding a new supply invoice on top of previous carryover
        const total = Number((paid + prevCarry).toFixed(2));
        deduct = Number(Math.min(total, limit).toFixed(2));
        nextCarry = Number((total - deduct).toFixed(2));
      } else {
        // Manual payment specified to pay off the carryover
        // Capped by remaining carryover
        deduct = Number(Math.min(paid, prevCarry).toFixed(2));
        nextCarry = Number((prevCarry - deduct).toFixed(2));
      }
    } else {
      // No manual payment/invoice entered: automatically deduct daily installment up to ceiling
      deduct = Number(Math.min(prevCarry, limit).toFixed(2));
      nextCarry = Number((prevCarry - deduct).toFixed(2));
    }
  } else {
    // Fresh start (prevCarry === 0)
    if (paid > 0) {
      deduct = Number(Math.min(paid, limit).toFixed(2));
      nextCarry = Number((paid - deduct).toFixed(2));
    } else {
      deduct = 0;
      nextCarry = 0;
    }
  }

  entry[deductKey] = deduct;
  entry[nextKey] = nextCarry;

  return nextCarry;
}

// Recalculate ledger function to maintain sequential carry-overs
async function recalculateCarryOvers(branch: "القادسية" | "المروج"): Promise<void> {
  const settings = await getSettings();
  const allDays = await getDays();

  // Filter entries for this branch and sort ascending by date
  const filtered = allDays.filter((d) => d.branch === branch);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  let pepsi_carry = 0;
  let plastic_carry = 0;
  let sauces_carry = 0;
  let diesel_carry = 0;

  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i];

    // Determine if today is a busy day (sales > last N days average * 1.25)
    let is_busy = false;
    const cmpDays = settings.ايام_مقارنة || 7;
    // previous N days total sales
    const prevDays = filtered.slice(Math.max(0, i - cmpDays), i);
    if (prevDays.length > 0) {
      const avg = prevDays.reduce((sum, d) => sum + d.total_sales, 0) / prevDays.length;
      if (entry.total_sales > avg * 1.25) {
        is_busy = true;
      }
    }

    const ratio = is_busy ? (1 + (settings.زيادة_عالي || 25) / 100) : 1;

    // Use branch-specific setting's ceiling for adaptivity to settings changes
    const entry_pepsi_cap = branch === "القادسية"
      ? (settings.سقف_بيبسي_قادسية || settings.سقف_بيبسي || 400)
      : (settings.سقف_بيبسي_مروج || settings.سقف_بيبسي || 400);

    const entry_plastic_cap = branch === "القادسية"
      ? (settings.سقف_بلاستيك_قادسية || settings.سقف_بلاستيك || 100)
      : (settings.سقف_بلاستيك_مروج || settings.سقف_بلاستيك || 100);

    const entry_sauces_cap = branch === "القادسية"
      ? (settings.سقف_صلصات_قادسية || settings.سقف_صلصات || 150)
      : (settings.سقف_صلصات_مروج || settings.سقف_صلصات || 150);

    const entry_diesel_cap = branch === "القادسية" ? (settings.سقف_ديزل_قادسية || 50) : (settings.سقف_ديزل_مروج || 30);

    // Save caps inside the entry
    entry.pepsi_cap = entry_pepsi_cap;
    entry.plastic_cap = entry_plastic_cap;
    entry.sauces_cap = entry_sauces_cap;
    entry.diesel_cap = entry_diesel_cap;

    const limit_pepsi = entry_pepsi_cap * ratio;
    const limit_plastic = entry_plastic_cap * ratio;
    const limit_sauces = entry_sauces_cap * ratio;
    const limit_diesel = entry_diesel_cap * ratio;

    // 1. Pepsi carryover calculations
    pepsi_carry = calculateCategoryCarryover(
      entry,
      pepsi_carry,
      entry.pepsi_paid || 0,
      entry.pepsi_type,
      limit_pepsi,
      "pepsi_carry_prev",
      "pepsi_deduct",
      "pepsi_carry_next"
    );

    // 2. Plastic carryover calculations
    plastic_carry = calculateCategoryCarryover(
      entry,
      plastic_carry,
      entry.plastic_paid || 0,
      entry.plastic_type,
      limit_plastic,
      "plastic_carry_prev",
      "plastic_deduct",
      "plastic_carry_next"
    );

    // 3. Sauces carryover calculations
    sauces_carry = calculateCategoryCarryover(
      entry,
      sauces_carry,
      entry.sauces_paid || 0,
      entry.sauces_type,
      limit_sauces,
      "sauces_carry_prev",
      "sauces_deduct",
      "sauces_carry_next"
    );

    // 4. Diesel carryover calculations
    diesel_carry = calculateCategoryCarryover(
      entry,
      diesel_carry,
      entry.diesel_paid || 0,
      entry.diesel_type,
      limit_diesel,
      "diesel_carry_prev",
      "diesel_deduct",
      "diesel_carry_next"
    );

    // Re-verify sums
    const madaFee = (settings.رسوم_مدى || 0.8) / 100;
    const visaFee = (settings.رسوم_فيزا || 1.5) / 100;

    const mada_total = (entry.mada1 || 0) + (entry.mada2 || 0) + (entry.mada3 || 0);
    const visa_total = (entry.visa1 || 0) + (entry.visa2 || 0) + (entry.visa3 || 0);
    
    entry.pos_net = Number((mada_total * (1 - madaFee) + visa_total * (1 - visaFee)).toFixed(2));
    const currentSarf = (entry.sarf !== undefined && entry.sarf !== null) ? entry.sarf : 350;
    entry.cash_net = Number(((entry.cash_box || 0) - currentSarf + (entry.cash_purchases || 0)).toFixed(2));
    entry.total_sales = Number((entry.cash_net + entry.pos_net).toFixed(2));

    const othersSum = (entry.others || []).reduce((s: number, o: any) => s + (o.amt || 0), 0);
    const purExtrasSum = (entry.pur_extras || []).reduce((s: number, e: any) => s + (e.amt || 0), 0);

    const correctExpensesTotal = (
      (entry.makhzan || 0) +
      entry.pepsi_deduct +
      entry.plastic_deduct +
      entry.sauces_deduct +
      Math.max(entry.gas || 0, entry.pur_gas || 0) +
      Math.max(entry.vegetables || 0, entry.pur_veg || 0) +
      Math.max(entry.bread || 0, entry.pur_bread || 0) +
      Math.max(entry.grocery || 0, entry.pur_groc || 0) +
      entry.diesel_deduct +
      othersSum +
      purExtrasSum +
      (entry.fixed_deduct || 0)
    );

    entry.net_day = Number((entry.total_sales - correctExpensesTotal).toFixed(2));
  }

  // Update original list with rescheduled elements
  const otherBranchDays = allDays.filter((d) => d.branch !== branch);
  const updatedDays = [...otherBranchDays, ...filtered];
  await saveDays(updatedDays);
}

// --- WHATSAPP SYSTEM HELPERS ---
let memoryWhatsAppConfig: any = { status: "disconnected" };
let memoryWhatsAppMessages: any[] = [];

async function getWhatsAppConfig(): Promise<any> {
  try {
    const docRef = doc(db, "whatsapp_settings", "global_config");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      memoryWhatsAppConfig = data;
      return data;
    }
  } catch (err) {
    console.error("Error loading WhatsApp config from Firestore, fallback to memory:", err);
  }
  return memoryWhatsAppConfig || { status: "disconnected" };
}

async function saveWhatsAppConfig(config: any): Promise<void> {
  memoryWhatsAppConfig = config;
  try {
    await setDoc(doc(db, "whatsapp_settings", "global_config"), cleanObject(config));
  } catch (err) {
    console.error("Error saving WhatsApp config to Firestore, using memory content anyway:", err);
  }
}

async function getWhatsAppMessages(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, "whatsapp_messages"));
    const list: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data) {
        if (!data.id) data.id = d.id;
        list.push(data);
      }
    });
    const sorted = list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    memoryWhatsAppMessages = sorted;
    return sorted;
  } catch (err) {
    console.error("Error loading WhatsApp messages from Firestore, fallback to memory:", err);
    return memoryWhatsAppMessages;
  }
}

async function saveWhatsAppMessage(msg: any): Promise<void> {
  memoryWhatsAppMessages.unshift(msg);
  try {
    await setDoc(doc(db, "whatsapp_messages", msg.id), cleanObject(msg));
  } catch (err) {
    console.error("Error saving WhatsApp message to Firestore, kept in memory anyway:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // DIAGNOSTICS ENDPOINT
  app.get("/api/diagnostics", async (req, res) => {
    const results: any = {
      timestamp: new Date().toISOString(),
      configExists: false,
      databaseTests: {}
    };

    try {
      results.configExists = fs.existsSync(CONFIG_PATH);
      if (results.configExists) {
        const confObj = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        results.projectId = confObj.projectId;
        results.firestoreDatabaseId = confObj.firestoreDatabaseId;
      }

      // Test settings read
      try {
        const snap = await getDoc(doc(db, "settings", "app_settings"));
        results.databaseTests.settingsRead = {
          success: true,
          exists: snap.exists(),
          data: snap.exists() ? snap.data() : null
        };
      } catch (err: any) {
        results.databaseTests.settingsRead = {
          success: false,
          error: err.message || String(err),
          code: err.code,
          stack: err.stack
        };
      }

      // Test days read
      try {
        const snap = await getDocs(collection(db, "days"));
        results.databaseTests.daysRead = {
          success: true,
          count: snap.size
        };
      } catch (err: any) {
        results.databaseTests.daysRead = {
          success: false,
          error: err.message || String(err),
          code: err.code,
          stack: err.stack
        };
      }

      // Test write
      try {
        const testId = "test_diagnostics_" + Date.now();
        await setDoc(doc(db, "days", testId), {
          test: true,
          createdAt: new Date().toISOString()
        });
        results.databaseTests.writeTest = {
          success: true,
          id: testId
        };
        // Clean up
        await deleteDoc(doc(db, "days", testId));
      } catch (err: any) {
        results.databaseTests.writeTest = {
          success: false,
          error: err.message || String(err),
          code: err.code,
          stack: err.stack
        };
      }

    } catch (err: any) {
      results.error = err.message || String(err);
    }

    res.json(results);
  });

  // 1. SETTINGS ENDPOINTS
  app.get("/api/settings", async (req, res) => {
    const settings = await getSettings();
    res.json(settings);
  });


  app.post("/api/settings", async (req, res) => {
    const settings = req.body as Settings;
    await saveSettings(settings);
    
    // Recalculate carryovers for both branches as caps might have changed
    await recalculateCarryOvers("القادسية");
    await recalculateCarryOvers("المروج");
    
    res.json({ success: true, settings });
  });

  // ==========================================
  // USER AUTHENTICATION & MANAGEMENT ENDPOINTS
  // ==========================================
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبة" });
      }

      const users = await getUsers();
      const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );

      if (!user) {
        return res.status(401).json({ error: "❌ اسم المستخدم غير موجود في النظام" });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: "❌ كلمة المرور أو رمز PIN غير صحيح" });
      }

      if (user.status === "موقوف") {
        return res.status(403).json({ error: "⚠️ عذراً! هذا الحساب موقوف حالياً من قبل الإدارة" });
      }

      res.json({
        success: true,
        user: {
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          status: user.status,
          branch: user.branch || "الكل",
          canEnterInvoices: user.canEnterInvoices || false
        }
      });
    } catch (err: any) {
      console.error("Login endpoint error:", err);
      res.status(500).json({ error: "خطأ في خادم تسجيل الدخول" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await getUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "فشل استرجاع حسابات الموظفين" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const user = req.body as UnifiedUser;
      if (!user || !user.username) {
        return res.status(400).json({ error: "بيانات المستخدم غير مكتملة" });
      }
      user.id = user.username.toLowerCase();
      user.username = user.id;
      if (!user.createdAt) {
        user.createdAt = new Date().toISOString();
      }
      await saveUser(user);
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ error: "فشل حفظ بيانات الحساب" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      if (userId === "admin") {
        return res.status(400).json({ error: "⚠️ لا يمكن حذف حساب المدير العام الأساسي للنظام" });
      }
      await deleteUser(userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "فشل حذف الحساب" });
    }
  });

  // 2. CARRY OVER ALERT ENDPOINT
  app.get("/api/carryover", async (req, res) => {
    const branch = req.query.branch as "القادسية" | "المروج";
    const dateQuery = req.query.date as string;
    if (!branch) {
      return res.status(400).json({ error: "Branch is required" });
    }

    const settings = await getSettings();
    const allDays = await getDays();
    
    // Filter by branch
    let filtered = allDays.filter((d) => d.branch === branch);
    
    // If a reference date is supplied, only consider days strictly before that date (yesterday and older)
    if (dateQuery) {
      filtered = filtered.filter((d) => d.date < dateQuery);
    }
    
    if (filtered.length === 0) {
      return res.json([]);
    }

    // Find latest record by date to check remaining carry-overs
    filtered.sort((a, b) => b.date.localeCompare(a.date));
    const latest = filtered[0];

    const carries: Array<{
      key: string;
      name: string;
      carry: number;
      cap: number;
      daysLeft: number;
      totalOriginal: number;
      daysPassed: number;
      startDate: string;
      endDate: string;
      settingsKey: string;
    }> = [];

    const categories = [
      {
        key: "pepsi",
        name: "بيبسي",
        nextKey: "pepsi_carry_next" as const,
        prevKey: "pepsi_carry_prev" as const,
        paidKey: "pepsi_paid" as const,
        deductKey: "pepsi_deduct" as const,
        cap: latest.pepsi_cap !== undefined && latest.pepsi_cap !== null 
          ? latest.pepsi_cap 
          : (branch === "القادسية" 
              ? (settings.سقف_بيبسي_قادسية ?? settings.سقف_بيبسي) 
              : (settings.سقف_بيبسي_مروج ?? settings.سقف_بيبسي)),
        settingsKey: branch === "القادسية" ? "سقف_بيبسي_قادسية" : "سقف_بيبسي_مروج"
      },
      {
        key: "plastic",
        name: "بلاستيكيات",
        nextKey: "plastic_carry_next" as const,
        prevKey: "plastic_carry_prev" as const,
        paidKey: "plastic_paid" as const,
        deductKey: "plastic_deduct" as const,
        cap: latest.plastic_cap !== undefined && latest.plastic_cap !== null 
          ? latest.plastic_cap 
          : (branch === "القادسية" 
              ? (settings.سقف_بلاستيك_قادسية ?? settings.سقف_بلاستيك) 
              : (settings.سقف_بلاستيك_مروج ?? settings.سقف_بلاستيك)),
        settingsKey: branch === "القادسية" ? "سقف_بلاستيك_قادسية" : "سقف_بلاستيك_مروج"
      },
      {
        key: "sauces",
        name: "الصلصات",
        nextKey: "sauces_carry_next" as const,
        prevKey: "sauces_carry_prev" as const,
        paidKey: "sauces_paid" as const,
        deductKey: "sauces_deduct" as const,
        cap: latest.sauces_cap !== undefined && latest.sauces_cap !== null 
          ? latest.sauces_cap 
          : (branch === "القادسية" 
              ? (settings.سقف_صلصات_قادسية ?? settings.سقف_صلصات) 
              : (settings.سقف_صلصات_مروج ?? settings.سقف_صلصات)),
        settingsKey: branch === "القادسية" ? "سقف_صلصات_قادسية" : "سقف_صلصات_مروج"
      },
      {
        key: "diesel",
        name: "الديزل",
        nextKey: "diesel_carry_next" as const,
        prevKey: "diesel_carry_prev" as const,
        paidKey: "diesel_paid" as const,
        deductKey: "diesel_deduct" as const,
        cap: latest.diesel_cap !== undefined && latest.diesel_cap !== null ? latest.diesel_cap : (branch === "القادسية" ? settings.سقف_ديزل_قادسية : settings.سقف_ديزل_مروج),
        settingsKey: branch === "القادسية" ? "سقف_ديزل_قادسية" : "سقف_ديزل_مروج"
      }
    ];

    categories.forEach((cat) => {
      const latestCarryNext = latest[cat.nextKey] || 0;
      if (latestCarryNext > 0) {
        // Trace back to calculate original sum and elapsed days
        let totalOriginal = 0;
        let daysPassed = 0;
        let startDate = latest.date;
        let maxCarry = 0;

        for (let i = 0; i < filtered.length; i++) {
          const entry = filtered[i];
          const entryNext = entry[cat.nextKey] || 0;
          const entryPrev = entry[cat.prevKey] || 0;
          const entryPaid = entry[cat.paidKey] || 0;
          const entryDeduct = entry[cat.deductKey] || 0;
          const entryType = (entry as any)[cat.key + "_type"];
          const entryCap = (entry as any)[cat.key + "_cap"] || cat.cap;

          if (entryNext > 0 || entryPaid > 0 || entryPrev > 0 || entryDeduct > 0) {
            maxCarry = Math.max(maxCarry, entryPrev, entryNext);

            // A payment is a supply invoice when explicitly categorized as such,
            // or when beginning the chain, or when the payment size is larger than the daily floor limits.
            const isNewInvoice = entryType === "invoice" || (entryPrev === 0 && entryPaid > 0) || (entryPaid > entryCap && entryType !== "payment");

            if (isNewInvoice && entryPaid > 0) {
              totalOriginal += entryPaid;
            }

            if (entryDeduct > 0) {
              daysPassed += 1;
            }

            startDate = entry.date; // Bubble back to oldest entry of the run
            
            // If we reached the absolute start of this run, stop searching
            if (entryPrev === 0) {
              break;
            }
          } else {
            break;
          }
        }

        // Bound original invoice by the maximum carried over/saved amount we observed in this run to ensure integrity
        totalOriginal = Math.max(totalOriginal, maxCarry);

        const daysLeft = Math.ceil(latestCarryNext / cat.cap);
        const estEnd = new Date(latest.date);
        estEnd.setDate(estEnd.getDate() + daysLeft);
        const endDate = estEnd.toISOString().split("T")[0];

        carries.push({
          key: cat.key,
          name: cat.name,
          carry: latestCarryNext,
          cap: cat.cap,
          daysLeft,
          totalOriginal: totalOriginal,
          daysPassed,
          startDate,
          endDate,
          settingsKey: cat.settingsKey
        });
      }
    });

    res.json(carries);
  });

  // 3. DAILY REPORTS / DAYS ENDPOINTS
  app.get("/api/days", async (req, res) => {
    const branch = req.query.branch as "القادسية" | "المروج";
    const from = req.query.from as string;
    const to = req.query.to as string;

    let days = await getDays();

    if (branch) {
      days = days.filter((d) => d.branch === branch);
    }
    if (from) {
      days = days.filter((d) => d.date >= from);
    }
    if (to) {
      days = days.filter((d) => d.date <= to);
    }

    days.sort((a, b) => a.date.localeCompare(b.date));
    res.json(days);
  });

  app.post("/api/days", async (req, res) => {
    const data = req.body as Partial<DailyEntry> & { branch: "القادسية" | "المروج"; date: string };
    if (!data.branch || !data.date) {
      return res.status(400).json({ error: "Branch and Date are required" });
    }

    const settings = await getSettings();
    const madaFee = settings.رسوم_مدى / 100;
    const visaFee = settings.رسوم_فيزا / 100;

    const mada_total = (data.mada1 || 0) + (data.mada2 || 0) + (data.mada3 || 0);
    const visa_total = (data.visa1 || 0) + (data.visa2 || 0) + (data.visa3 || 0);
    
    const pos_net = Number((mada_total * (1 - madaFee) + visa_total * (1 - visaFee)).toFixed(2));
    const currentSarf = (data.sarf !== undefined && data.sarf !== null) ? data.sarf : 350;
    const cash_net = Number(((data.cash_box || 0) - currentSarf + (data.cash_purchases || 0)).toFixed(2));
    const total_sales = Number((cash_net + pos_net).toFixed(2));

    const id = `${data.branch}-${data.date}`;
    const allDays = await getDays();

    // Automatic diesel purchase split helper for "القادسية" or "المروج"
    const otherBranchName = data.branch === "القادسية" ? "المروج" : "القادسية";
    if (data.diesel_type === 'invoice') {
      const incomingDieselVal = data.diesel_paid || 0;
      const existing = allDays.find((d) => d.id === id);
      const existingDieselVal = existing ? (existing.diesel_paid || 0) : 0;
      const existingType = existing ? existing.diesel_type : undefined;

      // Only perform split if the diesel_paid value has changed or if it was not an invoice previously
      if (incomingDieselVal !== existingDieselVal || existingType !== 'invoice') {
        const qRatio = (settings.نسبة_قادسية_ديزل || 70) / 100;
        const mRatio = (settings.نسبة_مروج_ديزل || 30) / 100;

        const saveBranchRatio = data.branch === "القادسية" ? qRatio : mRatio;
        const otherBranchRatio = data.branch === "القادسية" ? mRatio : qRatio;

        const saveShare = Number((incomingDieselVal * saveBranchRatio).toFixed(2));
        const otherShare = Number((incomingDieselVal * otherBranchRatio).toFixed(2));

        // Override the diesel_paid for the branch currently being saved
        data.diesel_paid = saveShare;

        // Apply corresponding share to the other branch's daily entry for that same date
        const otherId = `${otherBranchName}-${data.date}`;
        const otherIndex = allDays.findIndex((d) => d.id === otherId);

        if (otherIndex >= 0) {
          allDays[otherIndex].diesel_paid = otherShare;
          allDays[otherIndex].diesel_type = 'invoice';
        } else if (otherShare > 0) {
          const raw_entry: DailyEntry = {
            id: otherId,
            date: data.date,
            branch: otherBranchName,
            sarf: 0,
            cash_box: 0,
            cash_purchases: 0,
            mada1: 0, mada2: 0, mada3: 0,
            visa1: 0, visa2: 0, visa3: 0,
            pos_net: 0, cash_net: 0, total_sales: 0,
            makhzan: 0,
            pepsi_paid: 0, pepsi_carry_prev: 0, pepsi_deduct: 0, pepsi_carry_next: 0,
            plastic_paid: 0, plastic_carry_prev: 0, plastic_deduct: 0, plastic_carry_next: 0,
            sauces_paid: 0, sauces_carry_prev: 0, sauces_deduct: 0, sauces_carry_next: 0,
            gas: 0, vegetables: 0, bread: 0, grocery: 0,
            diesel_paid: otherShare, diesel_carry_prev: 0, diesel_deduct: 0, diesel_carry_next: 0,
            diesel_type: 'invoice',
            others: [], fixed_deduct: 0, fixed_note: "حصة الطرف الآخر من فاتورة ديزل مشتركة في اليومية",
            notes: "", net_day: 0
          };
          allDays.push(raw_entry);
        }
      }
    }

    // Create entry
    const entry: DailyEntry = {
      id,
      date: data.date,
      branch: data.branch,
      sarf: data.sarf ?? 350,
      cash_box: data.cash_box ?? 0,
      cash_purchases: data.cash_purchases ?? 0,
      pur_gas: data.pur_gas ?? 0,
      pur_bread: data.pur_bread ?? 0,
      pur_veg: data.pur_veg ?? 0,
      pur_groc: data.pur_groc ?? 0,
      pur_extras: data.pur_extras ?? [],
      mada1: data.mada1 ?? 0,
      mada2: data.mada2 ?? 0,
      mada3: data.mada3 ?? 0,
      visa1: data.visa1 ?? 0,
      visa2: data.visa2 ?? 0,
      visa3: data.visa3 ?? 0,
      pos_net,
      cash_net,
      total_sales,
      makhzan: data.makhzan ?? 0,
      pepsi_paid: data.pepsi_paid ?? 0,
      pepsi_type: data.pepsi_type,
      pepsi_carry_prev: 0,
      pepsi_deduct: 0,
      pepsi_carry_next: 0,
      plastic_paid: data.plastic_paid ?? 0,
      plastic_type: data.plastic_type,
      plastic_carry_prev: 0,
      plastic_deduct: 0,
      plastic_carry_next: 0,
      sauces_paid: data.sauces_paid ?? 0,
      sauces_type: data.sauces_type,
      sauces_carry_prev: 0,
      sauces_deduct: 0,
      sauces_carry_next: 0,
      gas: data.gas ?? 0,
      vegetables: data.vegetables ?? 0,
      bread: data.bread ?? 0,
      grocery: data.grocery ?? 0,
      diesel_paid: data.diesel_paid ?? 0,
      diesel_type: data.diesel_type,
      diesel_carry_prev: 0,
      diesel_deduct: 0,
      diesel_carry_next: 0,
      others: data.others ?? [],
      fixed_deduct: data.fixed_deduct ?? 0,
      fixed_note: data.fixed_note ?? "",
      notes: data.notes ?? "",
      pepsi_cap: data.pepsi_cap !== undefined ? Number(data.pepsi_cap) : undefined,
      plastic_cap: data.plastic_cap !== undefined ? Number(data.plastic_cap) : undefined,
      sauces_cap: data.sauces_cap !== undefined ? Number(data.sauces_cap) : undefined,
      diesel_cap: data.diesel_cap !== undefined ? Number(data.diesel_cap) : undefined,
      net_day: 0
    };

    // Replace if exists, or append
    const index = allDays.findIndex((d) => d.id === id);
    if (index >= 0) {
      allDays[index] = entry;
    } else {
      allDays.push(entry);
    }
    await saveDays(allDays);

    // Call dynamic carry-over recalculation loop for both branches sequentially
    await recalculateCarryOvers("القادسية");
    await recalculateCarryOvers("المروج");

    // Fetch refreshed result back
    const refreshed = (await getDays()).find((d) => d.id === id);
    if (refreshed) {
      await autoRegisterDayInputsAsPurchases(refreshed);
    }

    // Also auto-register purchase items for the other branch on that date if updated
    const otherId = `${otherBranchName}-${data.date}`;
    const refreshedOther = (await getDays()).find((d) => d.id === otherId);
    if (refreshedOther) {
      await autoRegisterDayInputsAsPurchases(refreshedOther);
    }

    res.json({
      success: true,
      entry: refreshed,
      pepsiCarry: refreshed?.pepsi_carry_next || 0,
      plasticCarry: refreshed?.plastic_carry_next || 0,
      saucesCarry: refreshed?.sauces_carry_next || 0,
      dieselCarry: refreshed?.diesel_carry_next || 0
    });
  });

  app.delete("/api/days/:id", async (req, res) => {
    const rawId = req.params.id;
    const decodedId = decodeURIComponent(rawId).trim();
    const allDays = await getDays();
    
    // Find entry either by exact rawId, decodedId, or case-insensitive/space-insensitive trim
    const entry = allDays.find((d) => 
      d.id === rawId || 
      d.id === decodedId ||
      d.id.trim() === decodedId ||
      d.id.trim() === rawId.trim()
    );
    
    if (!entry) {
      // If we can't find it, let's see if we can locate it by date and branch since the id is literally branch-date
      const dashIndex = decodedId.lastIndexOf("-");
      if (dashIndex > 0) {
        const potentialBranch = decodedId.substring(0, dashIndex);
        const potentialDate = decodedId.substring(dashIndex + 1);
        const entryByDateAndBranch = allDays.find(
          (d) => d.branch === potentialBranch && d.date === potentialDate
        );
        if (entryByDateAndBranch) {
          const branch = entryByDateAndBranch.branch;
          await deleteDay(entryByDateAndBranch.id);
          await deletePurchasesForDay(entryByDateAndBranch.id);
          await recalculateCarryOvers(branch);
          return res.json({ success: true });
        }
      }
      return res.status(404).json({ error: "Entry not found" });
    }

    const branch = entry.branch;
    await deleteDay(entry.id);
    await deletePurchasesForDay(entry.id);

    // Recalculate everything after removing this day so downstream elements are re-balanced perfectly Let's go!
    await recalculateCarryOvers(branch);

    res.json({ success: true });
  });

  app.post("/api/days/bulk-delete", async (req, res) => {
    const { ids, deleteAll, branch } = req.body as { ids?: string[]; deleteAll?: boolean; branch?: string };
    const allDays = await getDays();
    
    if (deleteAll) {
      if (branch) {
        const toDeleteIds = allDays.filter((d) => d.branch === branch).map(d => d.id);
        for (const id of toDeleteIds) {
          await deleteDay(id);
          await deletePurchasesForDay(id);
        }
      } else {
        const toDeleteIds = allDays.map(d => d.id);
        for (const id of toDeleteIds) {
          await deleteDay(id);
          await deletePurchasesForDay(id);
        }
      }
    } else if (ids && ids.length > 0) {
      const decodedIds = ids.map(id => decodeURIComponent(id).trim());
      const toDelete = allDays.filter((d) => {
        const matchFound = ids.includes(d.id) || 
                           decodedIds.includes(d.id) || 
                           ids.includes(encodeURIComponent(d.id)) ||
                           ids.some(id => id.trim() === d.id.trim()) ||
                           decodedIds.some(dec => dec.trim() === d.id.trim());
        return matchFound;
      });
      for (const d of toDelete) {
        await deleteDay(d.id);
        await deletePurchasesForDay(d.id);
      }
    } else {
      return res.status(400).json({ error: "No ids or deleteAll specified" });
    }

    // Recalculate carryovers for both branches so everything re-balances correctly
    await recalculateCarryOvers("القادسية");
    await recalculateCarryOvers("المروج");

    res.json({ success: true });
  });

  // 4. SHARED DIESEL BILLS ENDPOINTS
  app.get("/api/diesel", async (req, res) => {
    const from = req.query.from as string;
    const to = req.query.to as string;
    let bills = await getDiesels();

    if (from) bills = bills.filter((b) => b.date >= from);
    if (to) bills = bills.filter((b) => b.date <= to);

    bills.sort((a, b) => b.date.localeCompare(a.date));
    res.json(bills);
  });

  app.post("/api/diesel", async (req, res) => {
    const data = req.body as { date: string; total: number; notes: string };
    if (!data.date || !data.total) {
      return res.status(400).json({ error: "Date and Total are required" });
    }

    const settings = await getSettings();
    const qRatio = (settings.نسبة_قادسية_ديزل || 70) / 100;
    const mRatio = (settings.نسبة_مروج_ديزل || 30) / 100;

    const q_share = Number((data.total * qRatio).toFixed(2));
    const m_share = Number((data.total * mRatio).toFixed(2));

    const bill: SharedDiesel = {
      id: `diesel-${data.date}-${Date.now()}`,
      date: data.date,
      total: data.total,
      notes: data.notes || "",
      q_share,
      m_share
    };

    const bills = await getDiesels();
    bills.push(bill);
    await saveDiesels(bills);

    // Insert diesel expenditures into each branch's daily entry for that date dynamically!
    const allDays = await getDays();
    
    const applyDieselToBranch = (branch: "القادسية" | "المروج", share: number) => {
      const dayId = `${branch}-${data.date}`;
      const index = allDays.findIndex((d) => d.id === dayId);
      
      if (index >= 0) {
        allDays[index].diesel_paid = (allDays[index].diesel_paid || 0) + share;
      } else {
        // Create an empty entry on that date to record this diesel
        const raw_entry: DailyEntry = {
          id: dayId,
          date: data.date,
          branch,
          sarf: 0,
          cash_box: 0,
          cash_purchases: 0,
          mada1: 0, mada2: 0, mada3: 0,
          visa1: 0, visa2: 0, visa3: 0,
          pos_net: 0, cash_net: 0, total_sales: 0,
          makhzan: 0,
          pepsi_paid: 0, pepsi_carry_prev: 0, pepsi_deduct: 0, pepsi_carry_next: 0,
          plastic_paid: 0, plastic_carry_prev: 0, plastic_deduct: 0, plastic_carry_next: 0,
          sauces_paid: 0, sauces_carry_prev: 0, sauces_deduct: 0, sauces_carry_next: 0,
          gas: 0, vegetables: 0, bread: 0, grocery: 0,
          diesel_paid: share, diesel_carry_prev: 0, diesel_deduct: 0, diesel_carry_next: 0,
          diesel_type: 'invoice',
          others: [], fixed_deduct: 0, fixed_note: "فاتورة ديزل مشتركة ببرمجة النظام",
          notes: "", net_day: 0
        };
        allDays.push(raw_entry);
      }
    };

    applyDieselToBranch("القادسية", q_share);
    applyDieselToBranch("المروج", m_share);

    await saveDays(allDays);

    // Dynamic carryover sequential recalculation of both branches
    await recalculateCarryOvers("القادسية");
    await recalculateCarryOvers("المروج");

    res.json({ success: true, bill });
  });

  // 5. TAX INVOICE ENDPOINTS
  app.get("/api/tax-companies", async (req, res) => {
    try {
      const list = await getTaxRegisteredCompanies();
      res.json(list);
    } catch (err: any) {
      console.error("Error in /api/tax-companies:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tax-companies", async (req, res) => {
    try {
      const { id, name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "اسم المورد مطلوب" });
      }
      const companyId = id || `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const company: TaxCompany = { id: companyId, name: name.trim() };
      await saveTaxRegisteredCompany(company);
      res.json({ success: true, company });
    } catch (err: any) {
      console.error("Error in POST /api/tax-companies:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tax-companies/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteTaxRegisteredCompany(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in DELETE /api/tax-companies:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/tax-invoices", async (req, res) => {
    const from = req.query.from as string;
    const to = req.query.to as string;
    let invoices = await getTaxInvoices();

    if (from) invoices = invoices.filter((i) => i.date >= from);
    if (to) invoices = invoices.filter((i) => i.date <= to);

    invoices.sort((a, b) => (a.invoice_date || a.date).localeCompare(b.invoice_date || b.date));
    res.json(invoices);
  });

  app.post("/api/tax-invoices", async (req, res) => {
    let inputs = req.body;
    if (!Array.isArray(inputs)) {
      inputs = [inputs];
    }

    const invoices = await getTaxInvoices();
    const saved: TaxInvoice[] = [];
    const allPurchases = await getPurchases(); // Fetch once unified here to maintain complete consistency in loop

    for (const data of inputs) {
      if (!data.date || !data.amount) continue;

      const invoice: TaxInvoice = {
        id: `tax-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: data.date,
        branch: data.branch || "القادسية",
        company: data.company || "",
        invoice_no: data.invoice_no || "",
        invoice_date: data.invoice_date || "",
        amount: data.amount,
        items: Array.isArray(data.items) ? data.items : [],
        createdBy: data.createdBy || "",
        status: data.status || "approved",
        rawImage: data.rawImage || "",
        fileType: data.fileType || ""
      };

      invoices.push(invoice);
      saved.push(invoice);

      if (invoice.status === "approved" && invoice.items && invoice.items.length > 0) {
        await autoRegisterInvoiceItemsAsPurchases(invoice, allPurchases);
      }
    }

    await saveTaxInvoices(invoices);
    res.json({ success: true, count: saved.length, invoices: saved });
  });

  app.delete("/api/tax-invoices/:id", async (req, res) => {
    const id = req.params.id;
    await deleteTaxInvoice(id);
    await deletePurchasesForInvoice(id);
    res.json({ success: true });
  });

  app.post("/api/tax-invoices/bulk-delete", async (req, res) => {
    try {
      const { ids, all, from, to, branch } = req.body as { ids?: string[]; all?: boolean; from?: string; to?: string; branch?: string };
      
      if (all) {
        let allInvoices = await getTaxInvoices();
        if (from) allInvoices = allInvoices.filter((i) => i.date >= from);
        if (to) allInvoices = allInvoices.filter((i) => i.date <= to);
        if (branch && branch !== "الكل") allInvoices = allInvoices.filter((i) => i.branch === branch);
        
        for (const i of allInvoices) {
          await deleteTaxInvoice(i.id);
          await deletePurchasesForInvoice(i.id);
        }
        return res.json({ success: true, message: `تم حذف جميع الفواتير الضريبية (${allInvoices.length}) للفترة المحددة بنجاح` });
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Required array parameter 'ids' is missing or empty" });
      }

      for (const id of ids) {
        await deleteTaxInvoice(id);
        await deletePurchasesForInvoice(id);
      }
      res.json({ success: true, message: `تم حذف الفواتير الضريبية المحددة (${ids.length}) بنجاح` });
    } catch (err: any) {
      console.error("Error bulk deleting tax invoices:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/tax-invoices/:id", async (req, res) => {
    const id = req.params.id;
    const data = req.body;
    try {
      if (!data.date || data.amount === undefined) {
        return res.status(400).json({ error: "Required fields date and amount are missing" });
      }
      const updatedInvoice: TaxInvoice = {
        id,
        date: data.date,
        branch: data.branch || "القادسية",
        company: data.company || "",
        invoice_no: data.invoice_no || "",
        invoice_date: data.invoice_date || "",
        amount: parseFloat(data.amount),
        items: Array.isArray(data.items) ? data.items : [],
        createdBy: data.createdBy || "",
        status: data.status || "approved",
        rawImage: data.rawImage || "",
        fileType: data.fileType || ""
      };
      await setDoc(doc(db, "tax_invoices", id), cleanObject(updatedInvoice));

      // Clean old purchases generated by this invoice first so we don't duplicate them
      await deletePurchasesForInvoice(id);

      if (updatedInvoice.status === "approved" && updatedInvoice.items && updatedInvoice.items.length > 0) {
        await autoRegisterInvoiceItemsAsPurchases(updatedInvoice);
      }

      res.json({ success: true, invoice: updatedInvoice });
    } catch (err: any) {
      console.error("Error updating tax invoice:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5.5 AI INVOICE SCANNING / PARSING
  app.post("/api/parse-invoice", async (req, res) => {
    try {
      const { images } = req.body as { images?: string[] };
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }

      if (!ai) {
        return res.status(500).json({ 
          error: "لم يتم تهيئة مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) في الخادم بشكل صحيح." 
        });
      }

      const parsedResults = await Promise.all(
        images.map(async (img: string, idx: number) => {
          try {
            // Extract mime type and base64 data
            const matches = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            let mimeType = "image/jpeg";
            let base64Data = img;

            if (matches && matches.length === 3) {
              mimeType = matches[1];
              base64Data = matches[2];
            }

            const isPdf = mimeType === "application/pdf";
            // Highly precise prompt for absolute accuracy in OCR numbers and details
            const promptInstruction = "Extract invoice details with extreme high-precision OCR.\n" +
              "CRITICAL DIRECTIVES FOR NUMBERS & DIGITS ACCURACY:\n" +
              "1. You must read and double-check every single digit of the total amount and prices with absolute perfection. " +
              "Never mistake Arabic-Indic numerals (e.g., ٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩) or misinterpret standard numerals. Convert all numbers to standard English digits and parse decimals accurately.\n" +
              "2. Decimals represent point values. Do not mistake thousands separator commas (,) as decimal points (.), and do not mistake decimal points (.) as commas (,). E.g., '1,500.00' is 1500, not 1.5. '12.50' is 12.5, not 1250.\n" +
              "3. Double check the grand total amount 'amount'. Look for labels such as 'الإجمالي شامل ضريبة القيمة المضافة', 'المجموع', 'Total', 'Net Amount', 'الصافي', or similar. Verify that the 'amount' field matches are transcribed character-by-character to avoid reading errors.\n" +
              "4. Ensure item prices in 'price_with_tax' are extracted with digit-by-digit accuracy. If an item has '10.50', extract exactly 10.5.\n" +
              "\n" +
              "FIELD DEFINITIONS:\n" +
              "- 'company' (Arabic supplier name, e.g., المراعي, or write 'فاتورة' if the supplier name is not clearly visible/readable/identifiable directly).\n" +
              "- 'invoice_no' (The real actual serial invoice number representing the invoice itself. DO NOT grab the Tax Identification Number / الرقم الضريبي which starts with 3 and has 15 digits, and DO NOT grab the CR 10-digit number. Look specifically for 'رقم الفاتورة', 'رقم الفاتورة الضريبية', 'مسلسل الفاتورة', 'Invoice No', 'INV-#', 'رقم المستند' and separate them distinctly).\n" +
              "- 'invoice_date' (formatted strictly as YYYY-MM-DD).\n" +
              "- 'amount' (grand total inclusive of VAT as a decimal).\n" +
              "- 'items' (JSON array of objects representing items, each containing 'name' [Arabic name of the product], 'qty' [quantity/spec], 'price_with_tax' [total price for this item after tax], and 'category' [Arabic commodity type e.g., 'خضار', 'غاز', 'ديزل', 'بيبسي', 'لحوم', 'منظفات', 'مستلزمات' based on name]).\n" +
              "If the supplier's name is unclear, set company to 'فاتورة'. Ensure utmost professional precision on numbers.";

            const response = await generateContentWithRetry({
              model: "gemini-3.5-flash",
              contents: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                promptInstruction
              ],
              config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    company: { 
                      type: Type.STRING, 
                      description: "Brief Arabic name of the supplier company or output 'فاتورة' if unclear." 
                    },
                    invoice_no: { 
                      type: Type.STRING, 
                      description: "The actual invoice serial number. CRITICAL: NEVER capture the Tax Identification Number (الرقم الضريبي / TIN / 15-digit code) or Commercial Registration (السجل التجاري / CR) here. Specifically find and separate actual invoice number labels like 'رقم الفاتورة', 'Invoice No', 'رقم المستند', 'F#', or sequential code from any 15-digit Tax Identification number." 
                    },
                    invoice_date: { 
                      type: Type.STRING, 
                      description: "Printed invoice date, formatted STRICTLY as YYYY-MM-DD." 
                    },
                    amount: { 
                      type: Type.NUMBER, 
                      description: "Absolute grand total amount inclusive of VAT as a decimal." 
                    },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING, description: "Arabic name of the purchased item/product" },
                          qty: { type: Type.STRING, description: "Quantity or specification of the purchased item" },
                          price_with_tax: { type: Type.NUMBER, description: "Total price of this item after VAT/Tax" },
                          category: { type: Type.STRING, description: "Arabic category/type of the item (e.g. خضار, غاز, ديزل, بيبسي, لحوم, إلخ) based on its identity" }
                        },
                        required: ["name", "price_with_tax", "category"]
                      },
                      description: "List of items/materials identified inside this invoice."
                    }
                  },
                  required: ["company", "amount"]
                }
              }
            });

            const textStr = response.text || "{}";
            const parsedObj = JSON.parse(textStr.trim());

            let company = (parsedObj.company || "").trim();
            const companyLower = company.toLowerCase();
            const isUnclear = 
              !company || 
              company === "" || 
              company === "فاتورة" ||
              company === "مورد غير معروف" || 
              company === "غير معروف" || 
              company === "فاتورة غير واضحة" || 
              company.includes("غير واضح") || 
              company.includes("غير معروف") || 
              company.includes("غير محدد") || 
              company.includes("غير مدون") || 
              companyLower.includes("unknown") || 
              companyLower.includes("unclear") || 
              companyLower.includes("n/a") || 
              companyLower.includes("null") || 
              companyLower.includes("invoice");

            if (isUnclear) {
              company = "فاتورة";
            }

            return {
              success: true,
              company: company,
              invoice_no: parsedObj.invoice_no || "",
              invoice_date: parsedObj.invoice_date || "",
              amount: typeof parsedObj.amount === "number" ? parsedObj.amount : (parseFloat(parsedObj.amount) || 0),
              items: Array.isArray(parsedObj.items) ? parsedObj.items.map((it: any) => ({
                name: String(it.name || "").trim(),
                qty: it.qty !== undefined ? String(it.qty).trim() : "1 حبة",
                price_with_tax: typeof it.price_with_tax === "number" ? it.price_with_tax : (parseFloat(it.price_with_tax) || 0)
              })).filter((it: any) => it.name !== "") : [],
              tempId: `temp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`
            };
          } catch (err: any) {
            console.error(`Error parsing image at index ${idx}:`, err);
            return {
              success: false,
              error: err.message || "فشل قراءة تفاصيل الصورة",
              company: "فاتورة",
              invoice_no: "",
              invoice_date: "",
              amount: 0,
              items: [],
              tempId: `temp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`
            };
          }
        })
      );

      res.json({ success: true, results: parsedResults });
    } catch (error: any) {
      console.error("Critical error in /api/parse-invoice:", error);
      res.status(500).json({ error: error.message || "حدث خطأ غير متوقع أثناء معالجة الفواتير" });
    }
  });

  // 6. STATISTICS AND SYSTEM-WIDE REPORTS ENDPOINT
  app.get("/api/reports", async (req, res) => {
    const from = req.query.from as string;
    const to = req.query.to as string;

    if (!from || !to) {
      return res.status(400).json({ error: "From and To dates are required" });
    }

    const settings = await getSettings();
    const allDays = await getDays();
    const allTaxInvoices = await getTaxInvoices();

    // Filter by date
    const rangeDays = allDays.filter((d) => d.date >= from && d.date <= to);
    const rangeTaxInvoices = allTaxInvoices.filter((i) => i.date >= from && i.date <= to);

    const qData = rangeDays.filter((d) => d.branch === "القادسية");
    const mData = rangeDays.filter((d) => d.branch === "المروج");
    const qTaxInvoices = rangeTaxInvoices.filter((i) => i.branch === "القادسية");
    const mTaxInvoices = rangeTaxInvoices.filter((i) => i.branch === "المروج");

    const getStats = (branchDays: DailyEntry[]) => {
      const count = branchDays.length;
      if (count === 0) {
        return { total: 0, cash: 0, pos: 0, count: 0, max: 0, maxDate: "", min: 0, minDate: "", avg: 0 };
      }

      const total = Number(branchDays.reduce((sum, d) => sum + d.total_sales, 0).toFixed(2));
      const cash = Number(branchDays.reduce((sum, d) => sum + d.cash_net, 0).toFixed(2));
      const pos = Number(branchDays.reduce((sum, d) => sum + d.pos_net, 0).toFixed(2));
      const avg = Number((total / count).toFixed(2));

      let max = -9999999;
      let maxDate = "";
      let min = 9999999;
      let minDate = "";

      for (const d of branchDays) {
        if (d.total_sales > max) {
          max = d.total_sales;
          maxDate = d.date;
        }
        if (d.total_sales < min) {
          min = d.total_sales;
          minDate = d.date;
        }
      }

      return { total, cash, pos, count, max, maxDate, min, minDate, avg };
    };

    const getExpensesBreakdown = (branchDays: DailyEntry[], taxInvoices: TaxInvoice[]) => {
      const exp: Record<string, number> = {
        "المستودع": 0,
        "بيبسي": 0,
        "بلاستيكيات": 0,
        "الغاز": 0,
        "الخضار": 0,
        "الصلصات": 0,
        "الخبز": 0,
        "البقالة": 0,
        "الديزل": 0,
        "الخصوم الدائمة": 0,
        "مصروفات أخرى": 0
      };

      for (const d of branchDays) {
        const purExtrasSum = (d.pur_extras || []).reduce((sum, e) => sum + (e.amt || 0), 0);
        
        exp["المستودع"] += d.makhzan || 0;
        exp["بيبسي"] += d.pepsi_deduct || 0;
        exp["بلاستيكيات"] += d.plastic_deduct || 0;
        exp["الغاز"] += Math.max(d.gas || 0, d.pur_gas || 0);
        exp["الخضار"] += Math.max(d.vegetables || 0, d.pur_veg || 0);
        exp["الصلصات"] += d.sauces_deduct || 0;
        exp["الخبز"] += Math.max(d.bread || 0, d.pur_bread || 0);
        exp["البقالة"] += Math.max(d.grocery || 0, d.pur_groc || 0);
        exp["الديزل"] += d.diesel_deduct || 0;
        exp["الخصوم الدائمة"] += d.fixed_deduct || 0;
        exp["مصروفات أخرى"] += (d.others || []).reduce((sum, o) => sum + (o.amt || 0), 0) + purExtrasSum;
      }

      // Convert all values to fixed 2 decimals
      for (const k of Object.keys(exp)) {
        exp[k] = Number(exp[k].toFixed(2));
      }

      return exp;
    };

    const taxInvoicesTotalQ = Number(qTaxInvoices.reduce((sum, i) => sum + (i.amount || 0), 0).toFixed(2));
    const taxInvoicesTotalM = Number(mTaxInvoices.reduce((sum, i) => sum + (i.amount || 0), 0).toFixed(2));

    res.json({
      qStats: getStats(qData),
      mStats: getStats(mData),
      qExp: getExpensesBreakdown(qData, qTaxInvoices),
      mExp: getExpensesBreakdown(mData, mTaxInvoices),
      qData,
      mData,
      qTaxInvoices,
      mTaxInvoices,
      taxInvoicesTotalQ,
      taxInvoicesTotalM
    });
  });

  // 6. SMART PURCHASES TRACKER ENDPOINTS
  app.get("/api/purchases", async (req, res) => {
    try {
      const purchases = await getPurchases();
      purchases.sort((a, b) => b.date.localeCompare(a.date));
      res.json(purchases);
    } catch (err: any) {
      console.error("Error listing purchases:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/purchases", async (req, res) => {
    try {
      const data = req.body;
      if (!data.name || !data.date || !data.branch) {
        return res.status(400).json({ error: "Required fields name, date and branch are missing" });
      }
      const p = await addNewPurchaseInServer(data);
      res.json({ success: true, purchase: p });
    } catch (err: any) {
      console.error("Error creating purchase:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/purchases/:id", async (req, res) => {
    const id = req.params.id;
    const data = req.body;
    try {
      if (!data.name || !data.date || !data.branch) {
        return res.status(400).json({ error: "Required fields name, date and branch are missing" });
      }
      const updated: Purchase = {
        id,
        name: data.name.trim(),
        date: data.date,
        qty: data.qty,
        type: data.type || "direct",
        price: parseFloat(data.price) || 0,
        branch: data.branch,
        depletedDate: data.depletedDate,
        status: data.status || "active",
        source: data.source || "manual",
        invoiceId: data.invoiceId
      };
      await savePurchase(updated);
      res.json({ success: true, purchase: updated });
    } catch (err: any) {
      console.error("Error updating purchase:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/purchases/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deletePurchase(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting purchase:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/purchases/bulk-delete", async (req, res) => {
    try {
      const { ids, all, branch } = req.body as { ids?: string[]; all?: boolean; branch?: string };
      if (all) {
        const allPurchases = await getPurchases();
        const toDelete = branch && branch !== "الكل" 
          ? allPurchases.filter(p => p.branch === branch)
          : allPurchases;
        for (const p of toDelete) {
          await deletePurchase(p.id);
        }
        return res.json({ success: true, message: `تم حذف جميع السجلات (${toDelete.length}) بنجاح` });
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Required array parameter 'ids' is missing or empty" });
      }

      for (const id of ids) {
        await deletePurchase(id);
      }
      res.json({ success: true, message: `تم حذف ${ids.length} سجل بنجاح` });
    } catch (err: any) {
      console.error("Error bulk deleting purchases:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- BAKERY RECONCILIATION API ENDPOINTS ---
  app.get("/api/bakery", async (req, res) => {
    try {
      const entries = await getBakeryEntries();
      entries.sort((a, b) => b.date.localeCompare(a.date));
      res.json(entries);
    } catch (err: any) {
      console.error("Error loading bakery entries:", err);
      res.status(500).json({ error: "فشل تحميل سجلات ضبط المخبز" });
    }
  });

  app.post("/api/bakery", async (req, res) => {
    try {
      const data = req.body as BakeryEntry;
      if (!data.date || !data.branch) {
        return res.status(400).json({ error: "التاريخ والفرع مطلوبان لتسجيل الضبط" });
      }
      if (!data.id) {
        data.id = `${data.branch}-${data.date}`;
      }
      if (!data.createdAt) {
        data.createdAt = new Date().toISOString();
      }
      await saveBakeryEntry(data);
      res.json({ success: true, entry: data });
    } catch (err: any) {
      console.error("Error saving bakery entry:", err);
      res.status(500).json({ error: "فشل حفظ سجل ضبط المخبز" });
    }
  });

  app.delete("/api/bakery/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteBakeryEntry(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting bakery entry:", err);
      res.status(500).json({ error: "فشل حذف سجل ضبط المخبز" });
    }
  });

  // --- DRINKS RECONCILIATION API ENDPOINTS ---
  app.get("/api/drinks", async (req, res) => {
    try {
      const entries = await getDrinksEntries();
      entries.sort((a, b) => b.date.localeCompare(a.date));
      res.json(entries);
    } catch (err: any) {
      console.error("Error loading drinks entries:", err);
      res.status(500).json({ error: "فشل تحميل سجلات ضبط المشروبات" });
    }
  });

  app.post("/api/drinks", async (req, res) => {
    try {
      const data = req.body as DrinksEntry;
      if (!data.date || !data.branch) {
        return res.status(400).json({ error: "التاريخ والفرع مطلوبان لتسجيل الضبط" });
      }
      if (!data.id) {
        data.id = `${data.branch}-${data.date}`;
      }
      if (!data.createdAt) {
        data.createdAt = new Date().toISOString();
      }
      await saveDrinksEntry(data);
      res.json({ success: true, entry: data });
    } catch (err: any) {
      console.error("Error saving drinks entry:", err);
      res.status(500).json({ error: "فشل حفظ سجل ضبط المشروبات" });
    }
  });

  app.delete("/api/drinks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteDrinksEntry(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting drinks entry:", err);
      res.status(500).json({ error: "فشل حذف سجل ضبط المشروبات" });
    }
  });

  // --- DRINKS PRICES ENDPOINTS ---
  app.get("/api/drinks/prices", async (req, res) => {
    try {
      const prices = await getDrinkPrices();
      res.json(prices);
    } catch (err: any) {
      console.error("Error loading drink prices:", err);
      res.status(500).json({ error: "فشل تحميل أسعار المشروبات" });
    }
  });

  app.post("/api/drinks/prices", async (req, res) => {
    try {
      const prices = req.body;
      await saveDrinkPrices(prices);
      res.json({ success: true, prices });
    } catch (err: any) {
      console.error("Error saving drink prices:", err);
      res.status(500).json({ error: "فشل حفظ أسعار المشروبات الجديدة" });
    }
  });

  // --- EMPLOYEE MANAGEMENT API ENDPOINTS ---
  app.get("/api/employees", async (req, res) => {
    try {
      const list = await getEmployees();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: "فشل تحميل بيانات الموظفين" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const emp = req.body as Employee;
      if (!emp || !emp.name || !emp.job || emp.salary === undefined) {
        return res.status(400).json({ error: "جميع الحقول الأساسية: الاسم، المهنة، والراتب مطلوبة" });
      }
      if (!emp.id) {
        emp.id = `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      if (emp.advanceLimitPercent === undefined || isNaN(emp.advanceLimitPercent)) {
        emp.advanceLimitPercent = 25;
      }
      if (!emp.createdAt) {
        emp.createdAt = new Date().toISOString();
      }
      await saveEmployee(emp);
      res.json({ success: true, employee: emp });
    } catch (err: any) {
      res.status(500).json({ error: "فشل حفظ بيانات الموظف" });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteEmployee(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "فشل حذف الموظف" });
    }
  });

  app.get("/api/employee-advances", async (req, res) => {
    try {
      const list = await getEmployeeAdvances();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: "فشل تحميل سلفيات الموظفين" });
    }
  });

  app.post("/api/employee-advances", async (req, res) => {
    try {
      const adv = req.body as EmployeeAdvance;
      if (!adv || !adv.employeeId || !adv.date || !adv.amount || adv.amount <= 0) {
        return res.status(400).json({ error: "بيانات السلفة غير مكتملة أو المبلغ غير صحيح" });
      }
      if (!adv.id) {
        adv.id = `adv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      if (!adv.createdAt) {
        adv.createdAt = new Date().toISOString();
      }
      await saveEmployeeAdvance(adv);
      res.json({ success: true, advance: adv });
    } catch (err: any) {
      res.status(500).json({ error: "فشل تسجيل السلفة" });
    }
  });

  app.delete("/api/employee-advances/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteEmployeeAdvance(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "فشل حذف السلفة" });
    }
  });

  app.get("/api/employee-violations", async (req, res) => {
    try {
      const list = await getEmployeeViolations();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: "فشل تحميل سجل المخالفات والجزاءات" });
    }
  });

  app.post("/api/employee-violations", async (req, res) => {
    try {
      const v = req.body as EmployeeViolation;
      if (!v || !v.employeeId || !v.date || !v.description || !v.type) {
        return res.status(400).json({ error: "بيانات المخالفة غير مكتملة" });
      }
      if (!v.id) {
        v.id = `viol-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      if (!v.createdAt) {
        v.createdAt = new Date().toISOString();
      }
      await saveEmployeeViolation(v);
      res.json({ success: true, violation: v });
    } catch (err: any) {
      res.status(500).json({ error: "فشل تسجيل المخالفة" });
    }
  });

  app.delete("/api/employee-violations/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteEmployeeViolation(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "فشل حذف المخالفة" });
    }
  });

  app.get("/api/employee-attendance", async (req, res) => {
    try {
      const list = await getEmployeeAttendance();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: "فشل تحميل سجل حضور الموظفين" });
    }
  });

  app.post("/api/employee-attendance", async (req, res) => {
    try {
      const att = req.body as EmployeeAttendance;
      if (!att || !att.employeeId || !att.date || !att.arrivalTime || !att.departureTime) {
        return res.status(400).json({ error: "بيانات الحضور غير مكتملة" });
      }
      if (!att.id) {
        att.id = `${att.employeeId}-${att.date}`;
      }
      if (!att.createdAt) {
        att.createdAt = new Date().toISOString();
      }
      await saveEmployeeAttendance(att);
      res.json({ success: true, attendance: att });
    } catch (err: any) {
      res.status(500).json({ error: "فشل حفظ سجل الحضور" });
    }
  });

  app.delete("/api/employee-attendance/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteEmployeeAttendance(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "فشل حذف كشف الحضور" });
    }
  });

  // --- EMPLOYEE DEDUCTION RULE CONFIG ENDPOINTS ---
  app.get("/api/employee-deduction-config", async (req, res) => {
    try {
      const config = await getEmployeeDeductionConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: "فشل تحميل آليات الخصم والاستيفاء" });
    }
  });

  app.post("/api/employee-deduction-config", async (req, res) => {
    try {
      const config = req.body as EmployeeDeductionConfig;
      if (!config) {
        return res.status(400).json({ error: "البيانات المدخلة للتهيئة غير صالحة" });
      }
      config.id = "global-rules";
      config.updatedAt = new Date().toISOString();
      await saveEmployeeDeductionConfig(config);
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: "فشل حفظ آليات الخصم والاستيفاء الجديدة" });
    }
  });

  // --- WHATSAPP BROADCAST INTEGRATION ENDPOINTS ---
  app.get("/api/whatsapp/config", async (req, res) => {
    try {
      const config = await getWhatsAppConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: "فشل تحميل تهيئة الواتساب" });
    }
  });

  app.post("/api/whatsapp/pair-request", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب للبدء بالربط" });
      }
      
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let pairingCode = "";
      for (let i = 0; i < 8; i++) {
        if (i === 4) pairingCode += "-";
        pairingCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const config = {
        phoneNumber,
        status: "pairing_requested",
        pairingCode,
        qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://whatsapp.com/recv?c=" + pairingCode,
        requestedAt: new Date().toISOString()
      };

      await saveWhatsAppConfig(config);
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: "فشل توليد طلب الاقتران" });
    }
  });

  app.post("/api/whatsapp/verify", async (req, res) => {
    try {
      const { code } = req.body;
      const config = await getWhatsAppConfig();
      
      if (!config || config.status !== "pairing_requested") {
        return res.status(400).json({ error: "لا يوجد طلب ربط واتساب نشط حالياً" });
      }

      config.status = "connected";
      config.linkedAt = new Date().toISOString();
      
      await saveWhatsAppConfig(config);
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: "فشل تفعيل اقتران الواتساب" });
    }
  });

  app.post("/api/whatsapp/disconnect", async (req, res) => {
    try {
      const config = {
        status: "disconnected"
      };
      await saveWhatsAppConfig(config);
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: "فشل فك الارتباط" });
    }
  });

  app.get("/api/whatsapp/messages", async (req, res) => {
    try {
      const logs = await getWhatsAppMessages();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: "فشل تحميل سجل الرسائل" });
    }
  });

  app.post("/api/whatsapp/save-gateway", async (req, res) => {
    try {
      const { instanceId, token, gatewayEnabled, provider } = req.body;
      const config = await getWhatsAppConfig();
      
      const updatedConfig = {
        ...config,
        instanceId: instanceId || "",
        token: token || "",
        gatewayEnabled: !!gatewayEnabled,
        provider: provider || "ultramsg",
        status: gatewayEnabled ? "connected" : (config.status || "disconnected")
      };

      await saveWhatsAppConfig(updatedConfig);
      res.json({ success: true, config: updatedConfig });
    } catch (err: any) {
      res.status(500).json({ error: "فشل حفظ إعدادات بوابة الإرسال الفوري" });
    }
  });

  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const { recipientPhone, recipientName, messageText, messageType, employeeId } = req.body;
      if (!recipientPhone || !messageText) {
        return res.status(400).json({ error: "الرقم ونص الرسالة مطلوبان للإرسال" });
      }

      const config = await getWhatsAppConfig();
      if (config.status !== "connected") {
        return res.status(400).json({ error: "يجب ربط رقم الواتساب بالنظام أولاً لتفعيل الإرسال" });
      }

      // Check for custom gateway integration
      const isGatewayEnabled = config.gatewayEnabled;
      const instanceId = (config.instanceId || process.env.WHATSAPP_INSTANCE_ID || "").trim();
      const token = (config.token || process.env.WHATSAPP_API_TOKEN || "").trim();

      const isRealSending = isGatewayEnabled && instanceId && token && !token.includes("xxxx") && !instanceId.includes("instanceXXX");
      let statusLog = "sent";
      let errorDetail = "";

      if (isRealSending) {
        // Prepare phone number (e.g. 9665xxxxxxxx)
        let cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
        if (cleanPhone.startsWith("05") && cleanPhone.length === 10) {
          cleanPhone = "966" + cleanPhone.substring(1);
        } else if (cleanPhone.startsWith("5") && cleanPhone.length === 9) {
          cleanPhone = "966" + cleanPhone;
        }

        try {
          const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: token,
              to: cleanPhone,
              body: messageText
            })
          });

          const data = await response.json().catch(() => ({}));
          
          if (!response.ok || (data.sent !== "true" && !data.success && !data.id)) {
            statusLog = "failed";
            errorDetail = data.error || `استجابة خاطئة من بوابة الإرسال (رمز ${response.status})`;
          }
        } catch (fetchErr: any) {
          statusLog = "failed";
          errorDetail = fetchErr.message || "فشل الاتصال بخادم بوابة الواتساب الخارجية";
        }
      }

      const msgId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const messageLog = {
        id: msgId,
        employeeId: employeeId || null,
        employeeName: recipientName || "جهة مخصصة",
        recipientPhone,
        messageType: messageType || "custom",
        messageText,
        status: statusLog,
        sentAt: new Date().toISOString()
      };

      await saveWhatsAppMessage(messageLog);

      if (statusLog === "failed") {
        return res.status(400).json({ error: `فشل الإرسال عبر البوابة: ${errorDetail}` });
      }

      res.json({ success: true, message: messageLog, isRealGatewayUsed: isRealSending });
    } catch (err: any) {
      res.status(500).json({ error: "فشل إرسال رسالة الواتساب" });
    }
  });


  // Catch-all JSON 404 handler for any unhandled /api/* requests
  // to prevent them from falling through to the Vite SPA fallback (which returns HTML and breaks client parsing)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
