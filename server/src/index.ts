
import app from './app.js';
import dotenv from 'dotenv';
dotenv.config();
const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log('Server listening on http://localhost:' + PORT);
});
