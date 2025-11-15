import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import dbconnect from './db/index.js';
import app from './app.js';


dbconnect()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log('✅ Server is running on port:', process.env.PORT || 3000);
    });
  })
  .catch((error: Error) => {
    console.error('❌ Error connecting to DB:', error.message);
  });
