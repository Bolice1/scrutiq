"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function resetDB() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri)
            throw new Error("MONGODB_URI missing.");
        await mongoose_1.default.connect(uri);
        console.log("Connected to MongoDB for system wipe...");
        const db = mongoose_1.default.connection.db;
        if (!db)
            throw new Error("Database connection not established.");
        const collections = await db.collections();
        for (const collection of collections) {
            await collection.deleteMany({});
            console.log(`- Wiped collection: ${collection.collectionName}`);
        }
        console.log("System Registry Wiped Successfully.");
        process.exit(0);
    }
    catch (error) {
        console.error("Wipe Failure:", error);
        process.exit(1);
    }
}
resetDB();
//# sourceMappingURL=resetDB.js.map