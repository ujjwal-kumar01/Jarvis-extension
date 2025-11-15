import mongoose from 'mongoose';
import DB_NAME from '../constants.js';

export default async function dbconnect(): Promise<void> {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Database connected successfully:", connectionInstance.connection.host);
    }
    catch(err) {
        console.log(err);
        process.exit(1);
    }
}

