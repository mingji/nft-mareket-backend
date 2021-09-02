import { config as dotenvConfig } from 'dotenv';
import { MongoClient } from 'mongodb';
import { DaoIds } from '../types/constants';
import * as faker from 'faker';
import { randomCard, randomCollection } from '../../test/lib';

dotenvConfig();

(async () => {
    const client = await MongoClient.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    const db = client.db(process.env.MONGODB_NAME);

    const usersCollection = db.collection(DaoIds.users);
    const users = await usersCollection.find().toArray();
    const usersCount = users.length;

    if (!usersCount) {
        throw new Error('there is no user in system');
    }

    const categories = await db.collection(DaoIds.categories).find({}).toArray();
    const categoriesLength = categories.length;
    if (!categoriesLength) {
        throw new Error('there is no any category');
    }

    for (let i = 0; i < categoriesLength; i++) {
        const category = categories[i];
    
        let tokenCollectionsData = [];

        const tokenCollection = db.collection(DaoIds.tokenCollections);
        for (let i = 0; i < 10; i++) {
            const user = users[Math.floor(Math.random() * usersCount)];
            tokenCollectionsData.push(randomCollection(user, category));
        }
        await tokenCollection.insertMany(tokenCollectionsData);
    
        tokenCollectionsData = await tokenCollection.find({categoryIds: {$in: [category._id]}}).toArray();
    
        const cardsData = [];
        tokenCollectionsData.forEach((tokenCollection: any) => {
            const user = users.find(user => user._id.toString() === tokenCollection.userId.toString());
            const countCardsInCollection = faker.random.number({ min: 1, max: 50 });
            for (let i = 0; i < countCardsInCollection; i++) {
                cardsData.push(randomCard(user, tokenCollection, category, true, users));
            }
        });
        await db.collection(DaoIds.cards).insertMany(cardsData);
    }
    await client.close();
})()
    .then(() => console.log('Done'))
    .catch((reason) => {
        console.log(`Error: ${reason.message}`, reason);
        process.exit();
    });
