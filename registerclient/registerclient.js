// Purpose:  To manually setup the new client account
// Create appOwnerInfo and store in MongoDB
// During first launch, App will call and extract the app owner info and 
// Store into async storage

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const AppOwner = require('./AppOwner');  // MongoDB Model to write AppOwner
const crypto = require('crypto');

const SECRET_KEY = process.env.CRYPTO_SECRET || 'default_secret_key';
const IV = Buffer.alloc(16, 0); // 16 null bytes

  /**
   * 🔐 AES Encrypt (reversible)
   */
  function encrypt(text) {
    if (!text || typeof text !== 'string') return '';

    const key = crypto.createHash('sha256').update(SECRET_KEY).digest(); // 32-byte key
    const cipher = crypto.createCipheriv('aes-256-cbc', key, IV);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  
  /**
  * 🧮 SHA256 Hash
  */
  function generateHash(text) {
    if (!text || typeof text !== 'string') return '';
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  function generateAppKey(order_id, order_date, app_name) {
    //const { ORDER_ID, ORDER_DATE, APP_NAME } = process.env;
  
    if (!order_id || !order_date || !app_name) {
      throw new Error('Missing required params for app key generation');
    }
  
    const raw = `${order_id}|${order_date}|${app_name}`;
    const hash = generateHash(raw);
    
    console.log('AppKey: Raw String Value:', raw);
    console.log('Appkey: Hash Value:', hash);
  
    return hash;
  }

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getNextClientId() {
  try {
    const last = await AppOwner.findOne().sort({ client_id: -1 });
    return last ? last.client_id + 1 : 1001;
  } catch (err) {
    console.error('❌ Error fetching client_id:', err.message);
    return 1001;
  }
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const invoice_no = await askQuestion('📥 Invoice No: ');
    const invoice_date = await askQuestion('📅 Invoice Date (Unix Epoch): ');
    const client_name = await askQuestion('👤 Client Name: ');
    const client_app_name = await askQuestion('👤 Client App Name: ');
    const email = await askQuestion('📧 Client Email: ');
    const mobile = await askQuestion('📱 Client Mobile: ');

    const encryptedEmail = encrypt(email);
    const encryptedMobile = encrypt(mobile);
    const client_id = await getNextClientId();
    const app_key = generateAppKey(invoice_no, invoice_date, client_app_name);

    const exists = await AppOwner.findOne({
      $or: [
        { client_regd_mobile_no: encryptedMobile },
        { client_regd_email: encryptedEmail }
      ]
    });

    if (exists) {
      const matchedFields = [];
      if (exists.client_regd_mobile_no === encryptedMobile) {
        matchedFields.push('client_regd_mobile_no');
      }
      if (exists.client_regd_email === encryptedEmail) {
        matchedFields.push('client_regd_email');
      }

      console.log(`Alert! AppOwner already exists with: ${matchedFields.join(', ')}`);
      process.exit(1);
    }


    const owner = new AppOwner({
      app_key,
      invoice_no,
      invoice_date,
      client_id,
      client_name,
      client_name,
      client_regd_email: encryptedEmail,
      client_regd_mobile_no: encryptedMobile
    });

    await owner.save();

    console.log(`✅ Saved AppOwnerInfo with app_key: ${app_key}`);
    console.log('📧 Input Email:', email);
    console.log('🔐 Encrypted Email:', encryptedEmail);
    console.log('📱 Input Mobile:', mobile);
    console.log('🔐 Encrypted Mobile:', encryptedMobile);

  } catch (err) {
    console.error('❌ Error saving AppOwnerInfo:', err.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
})();
