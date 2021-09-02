import { config as dotenvConfig } from 'dotenv';
import { MongoClient } from 'mongodb';
import { clearDb } from '../../test/lib';

dotenvConfig();

(async () => {
    const client = await MongoClient.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    const db = client.db(process.env.MONGODB_NAME);

    await clearDb(db);

    await client.close();
})()
    .then(() => console.log('Done'))
    .catch((reason) => {
        console.log(`Error: ${reason.message}`);
        process.exit();
    });
