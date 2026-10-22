const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/booking');

const app = express();
app.use(cors());
app.use(express.json());

//Routes
app.use('/api/auth',authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);


//Connect to mongoose
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('connected to mongo db');
})
.catch((error) =>{
    console.error('error connecting to mongoDB',error);
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});