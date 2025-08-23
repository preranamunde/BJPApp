import CryptoJS from 'crypto-js';
import { ORDER_ID, ORDER_DATE, APP_NAME } from '@env';

export const generateAppKey = () => {
  const raw = `${ORDER_ID}|${ORDER_DATE}|${APP_NAME}`;
  
  // use SHA256 from crypto-js object
  const appKey = CryptoJS.SHA256(raw).toString();
  
  console.log('Generated app_key:', appKey);
  return appKey;
};
