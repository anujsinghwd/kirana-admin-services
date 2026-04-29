/**
 * Migration Script: backfill-product-names.ts
 *
 * Finds all Product documents that are missing `categoryName` or
 * `subcategoryName` (or whose values are empty strings), looks up the
 * referenced Category / SubCategory and writes the bilingual name back.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register src/scripts/backfill-product-names.ts
 *   — or —
 *   npm run migrate:product-names
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// ─── Models (use direct paths so tsconfig-paths resolves aliases) ───────────
import Product from "../models/Product";
import Category from "../models/Category";
import SubCategory from "../models/SubCategory";

const MONGO_URI =
  process.env.MONGO_URI ?? "mongodb://localhost:27017/kirana";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB:", MONGO_URI);

  // Fetch all products — use lean() for speed, but we need the Mongoose doc
  // for save(), so we'll findById in the update loop.
  const staleDocs = await Product.find({
    $or: [
      { "categoryName.en": { $exists: false } },
      { "categoryName.en": "" },
      { "categoryName.hi": { $exists: false } },
      { "categoryName.hi": "" },
      { "subcategoryName.en": { $exists: false } },
      { "subcategoryName.en": "" },
      { "subcategoryName.hi": { $exists: false } },
      { "subcategoryName.hi": "" },
    ],
  })
    .select("_id name category subcategory categoryName subcategoryName")
    .lean();

  console.log(`🔍  Found ${staleDocs.length} product(s) to backfill.\n`);

  if (staleDocs.length === 0) {
    console.log("Nothing to do. Exiting.");
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const doc of staleDocs) {
    try {
      const [categoryDoc, subcategoryDoc] = await Promise.all([
        Category.findById(doc.category).select("name").lean(),
        SubCategory.findById(doc.subcategory).select("name").lean(),
      ]);

      if (!categoryDoc) {
        console.warn(
          `  ⚠️  Product "${(doc.name as any)?.en ?? doc._id}" — Category ${doc.category} not found. Skipping.`
        );
        failed++;
        continue;
      }
      if (!subcategoryDoc) {
        console.warn(
          `  ⚠️  Product "${(doc.name as any)?.en ?? doc._id}" — SubCategory ${doc.subcategory} not found. Skipping.`
        );
        failed++;
        continue;
      }

      // Use updateOne with $set to bypass required-field validation on
      // unrelated paths (safe because we ARE setting the required fields).
      await Product.updateOne(
        { _id: doc._id },
        {
          $set: {
            categoryName: categoryDoc.name,
            subcategoryName: subcategoryDoc.name,
          },
        }
      );

      console.log(
        `  ✓  Updated "${(doc.name as any)?.en ?? doc._id}" ` +
        `→ category="${categoryDoc.name.en}" / subcategory="${subcategoryDoc.name.en}"`
      );
      updated++;
    } catch (err) {
      console.error(`  ✗  Failed for product ${doc._id}:`, (err as Error).message);
      failed++;
    }
  }

  console.log(`\n🏁  Done — ${updated} updated, ${failed} skipped/failed.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
