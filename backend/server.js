// // backend/server.js - Updated Server Setup

// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const path = require('path');
// const authRoutes = require('./routes/authRoutes');
// const photoRoutes = require('./routes/photoRoutes');

// dotenv.config();
// const app = express();
// app.use(express.json());
// app.use(cors({ origin: 'http://localhost:3000' }));

// // Serve static files from the uploads folder
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// // Routes
// app.use('/auth', authRoutes);
// app.use('/photos', photoRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


// working up untill photo 


// backend/server.js

// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const authRoutes = require('./routes/authRoutes');
// const photoRoutes = require('./routes/photoRoutes');
// const audioRoutes = require('./routes/audioRoutes');

// dotenv.config();
// const app = express();
// app.use(express.json());
// app.use(cors({ origin: 'http://localhost:3000' }));

// // Routes
// app.use('/auth', authRoutes);
// app.use('/photos', photoRoutes);
// app.use('/audios', audioRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
 


// backend/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const photoRoutes = require('./routes/photoRoutes');
const audioRoutes = require('./routes/audioRoutes');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));

// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/photos', photoRoutes);
app.use('/audios', audioRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
