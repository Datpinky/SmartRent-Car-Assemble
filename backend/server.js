const dotenv = require("dotenv");

dotenv.config(); // load .env
const app = require('./src/app');
const connectDB = require('./src/config/db');
var cors = require('cors')
const PORT = process.env.PORT || 3000;


const corsOptions = {
    origin: 'http://localhost:5000', //URL của frontend, sửa nếu cần
};

app.use(cors(corsOptions));


connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
