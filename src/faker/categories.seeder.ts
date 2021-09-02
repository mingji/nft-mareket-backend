import { config as dotenvConfig } from 'dotenv';
import { MongoClient } from 'mongodb';
import { DaoIds } from '../types/constants';
import * as data from '../database/seeds/data/categories.json';

dotenvConfig();

(async () => {
    const client = await MongoClient.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    const db = client.db(process.env.MONGODB_NAME);

    const categories = data.slice().map(category => {
        const { location, bucket } = category.icon;
        category.icon.location = location.replace(':stage', 'dev');
        category.icon.bucket = bucket.replace(':stage', 'dev');
        return category;
    });

    const categoriesCollection = db.collection(DaoIds.categories);
    await categoriesCollection.insertMany(
        categories.map((item, index) => ({
            icon: item.icon,
            title: item.title,
            description: {
                en: `Description: ${item.title}`
            },
            parentId: null,
            order: index + 1,
            isTopCategory: true,
            createdAt: new Date()
        }))
    );
    await client.close();
})()
    .then(() => console.log('Done'))
    .catch((reason) => {
        console.log(`Error: ${reason.message}`);
        process.exit();
    });
