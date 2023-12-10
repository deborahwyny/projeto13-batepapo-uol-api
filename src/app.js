
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './router.js';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

app.use('/', router);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server is running on the port ${port}`));
