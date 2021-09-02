import { config as dotenvConfig } from 'dotenv';
import { execSync } from 'child_process';
import * as path from 'path';

dotenvConfig();

execSync(`node ${path.resolve(__dirname, 'cleanup.js')}`);
execSync(`node ${path.resolve(__dirname, 'users.seeder.js')}`);
execSync(`node ${path.resolve(__dirname, 'categories.seeder.js')}`);
execSync(`node ${path.resolve(__dirname, 'collections-cards.seeder.js')}`);
execSync(`node ${path.resolve(__dirname, 'cards-sales.seeder.js')}`);

console.log('Done.');