require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');

const { ORDER_ID, ORDER_DATE, APP_NAME, SECRET_SALT } = process.env;
const rawKey = `${ORDER_ID}:${ORDER_DATE}:${APP_NAME}:${SECRET_SALT}`;
const appKey = crypto.createHash('sha256').update(rawKey).digest('hex');

fs.writeFileSync('./android/app/src/main/assets/app_key.txt', appKey);
console.log('✅ app_key generated and stored in native assets.');