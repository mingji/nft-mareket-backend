import { config as dotenvConfig } from 'dotenv';
import { MongoClient } from 'mongodb';
import { prepareCardSales } from '../../test/lib';

dotenvConfig();

(async () => {
    const client = await MongoClient.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    await prepareCardSales(client.db(process.env.MONGODB_NAME));

    await client.close();
})()
    .then(() => console.log('Done'))
    .catch((reason) => {
        console.log(`Error: ${reason.message}`);
        process.exit();
    });
