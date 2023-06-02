const express = require('express');
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const mysql2 = require('mysql2/promise'); //promise package
const app = express();

app.use(express.json());
require('dotenv').config();

// Create a connection pool for database
const pool = mysql.createPool({
    host: process.env.MYSQL_ADDON_HOST,
    port: process.env.MYSQL_ADDON_PORT,
    user: process.env.MYSQL_ADDON_USER,
    password: process.env.MYSQL_ADDON_PASSWORD,
    database: process.env.MYSQL_ADDON_DB
});

// Create a connection pool with promise
const pool2 = mysql2.createPool({
    host: process.env.MYSQL_ADDON_HOST,
    port: process.env.MYSQL_ADDON_PORT,
    user: process.env.MYSQL_ADDON_USER,
    password: process.env.MYSQL_ADDON_PASSWORD,
    database: process.env.MYSQL_ADDON_DB
});

//jwt 
const JWT_SECRET_KEY = process.env.JWT_KEY;
const options = { expiresIn: '6h' };

//Verify token endpoint
app.get('/api/auth', authenticateToken, (req, res) => {
    res.send('Access granted');
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).send('Token is missing!');
    }

    jwt.verify(token, JWT_SECRET_KEY, (error, user) => {
        if (error) {
            return res.status(403).send('Invalid token!');
        }
        return res.status(200).send('Token is valid!');
        // or you can send additional data along with the success response
        // return res.status(200).json({ message: 'Token is valid!', user });
    });
}

//check login info
app.get('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required.');
    }

    try {
        // Check if user exists in the database
        const [results] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);

        const user = results[0];
        if (!user || password !== user.password) {
            return res.status(401).send('Authentication failed. Wrong email or password.');
        }

        // Create token and send it to the user
        const token = jwt.sign({ email: user.email }, JWT_SECRET_KEY, options);
        res.json({ token });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
});
// Endpoint to send newUser Data to the DataBase
app.post('/newUser', (req, res) => {
    const userID = req.body.userID;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const type = req.body.type;
    const password = req.body.password;
    const avatar = req.body.avatar;
    pool.query('INSERT INTO users VALUES(?,?,?,?,?,?,?)',[userID,first_name,last_name,email,type,password,avatar] , (error, results) => {
        if(error){
            console.error('Error: ', error);
            res.status(500).json({Error: 'An error just ocurred!!!'})
        } else {
            res.send("Posted")
        }
    });
})


//Endpoint to send email to SendGrid API from contact form
app.post('/emailService', (req, res) => {
    const { email, fullName, phoneNumber, message } = req.body;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
        to: process.env.ADMIN_EMAIL,
        from: process.env.API_EMAIL,
        subject: 'Study Buddy Contact Request',
        text: `Name: ${fullName}\nEmail: ${email}\nPhone Number: ${phoneNumber}\n\n${message}`
    };

    sgMail
        .send(msg)
        .then(() => {
            console.log('Email Sent!');
            res.json({ message: 'Email was sent successfully!' });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ error: 'Error sending email' });
        });
});

app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}`);
});


