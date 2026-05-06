require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Vehicle = require("../models/vehicle.model");
const Booking = require("../models/booking.model");

const isDryRun = process.argv.includes("--dry-run");
const logDir = path.resolve(__dirname, "../../migration-logs");
const logFile = path.join(logDir, `owner-merge-${Date.now()}.json`);

const result = {
  dryRun: isDryRun,
  startedAt: new Date().toISOString(),
  steps: [],
  errors: [],
};

const pushStep = (name, payload) => {
  result.steps.push({ name, ...payload });
};

const pushError = (scope, id, error) => {
  result.errors.push({
    scope,
    id: String(id || ""),
    message: error?.message || String(error),
  });
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[migration] Mongo connected. dryRun=${isDryRun}`);

  try {
    // 1) owner -> showroom
    const ownerCount = await User.countDocuments({ role: "owner" });
    if (!isDryRun && ownerCount > 0) {
      const ownerUpdate = await User.updateMany(
        { role: "owner" },
        { $set: { role: "showroom" } }
      );
      pushStep("users.owner_to_showroom", {
        matched: ownerUpdate.matchedCount,
        modified: ownerUpdate.modifiedCount,
      });
    } else {
      pushStep("users.owner_to_showroom", { matched: ownerCount, modified: 0 });
    }

    // 2) backfill vehicle showroom_id + ownership_type
    const vehicles = await Vehicle.find({});
    let vehicleUpdated = 0;

    for (const vehicle of vehicles) {
      try {
        const patch = {};
        if (!vehicle.showroom_id && vehicle.added_by) {
          patch.showroom_id = vehicle.added_by;
        }
        if (!vehicle.ownership_type) {
          patch.ownership_type = vehicle.source || "showroom_owned";
        }
        if (!vehicle.consignment_status) {
          patch.consignment_status =
            patch.ownership_type === "consigned" || vehicle.source === "consigned"
              ? "active"
              : "pending";
        }

        if (Object.keys(patch).length > 0) {
          vehicleUpdated += 1;
          if (!isDryRun) {
            await Vehicle.updateOne({ _id: vehicle._id }, { $set: patch });
          }
        }
      } catch (error) {
        pushError("vehicle_backfill", vehicle._id, error);
      }
    }

    pushStep("vehicles.backfill_showroom_and_ownership", {
      scanned: vehicles.length,
      updated: vehicleUpdated,
    });

    // 3) backfill booking showroom_id from vehicle
    const bookings = await Booking.find({});
    let bookingUpdated = 0;

    for (const booking of bookings) {
      try {
        const vehicle = await Vehicle.findById(booking.vehicle_id).select("showroom_id added_by");
        if (!vehicle) {
          pushError("booking_backfill_vehicle_missing", booking._id, new Error("Vehicle not found"));
          continue;
        }
        const derivedShowroomId = vehicle.showroom_id || vehicle.added_by;
        if (!derivedShowroomId) {
          pushError(
            "booking_backfill_showroom_missing",
            booking._id,
            new Error("Vehicle has no showroom_id/added_by")
          );
          continue;
        }

        if (String(booking.showroom_id || "") !== String(derivedShowroomId)) {
          bookingUpdated += 1;
          if (!isDryRun) {
            await Booking.updateOne(
              { _id: booking._id },
              { $set: { showroom_id: derivedShowroomId } }
            );
          }
        }
      } catch (error) {
        pushError("booking_backfill", booking._id, error);
      }
    }

    pushStep("bookings.backfill_showroom_id", {
      scanned: bookings.length,
      updated: bookingUpdated,
    });
  } finally {
    result.finishedAt = new Date().toISOString();
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify(result, null, 2), "utf-8");
    console.log(`[migration] log saved: ${logFile}`);
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  pushError("fatal", "migration", error);
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(result, null, 2), "utf-8");
  console.error("[migration] failed:", error);
  process.exit(1);
});
