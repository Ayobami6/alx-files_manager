import express from 'express';
import router from './routes/index';

const PORT = Number(process.env.PORT) || 5000;

const app = express();

app.use(express.json());
app.use('/', router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
