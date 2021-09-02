import { config as dotenvConfig } from 'dotenv';
import { MongoClient } from 'mongodb';
import { DaoIds } from '../types/constants';
import { prepareUsers, randomUser } from '../../test/lib';

dotenvConfig();

(async () => {
    const client = await MongoClient.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    const db = client.db(process.env.MONGODB_NAME);

    const usersCollection = db.collection(DaoIds.users);
    const user = await usersCollection.findOne({});

    if (!user) {
        await usersCollection.insertOne(randomUser());
    }

    await prepareUsers(db);

    await client.close();
})()
    .then(() => console.log('Done'))
    .catch((reason) => {
        console.log(`Error: ${reason.message}`);
        process.exit();
    });
