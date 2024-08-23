// jwtHelper.js
const jwt = require('jsonwebtoken');

// Function to generate a JWT token
function generateToken(payload, secretKey, expiresIn) {
    return jwt.sign(payload, secretKey, { expiresIn });
}

// Function to verify a JWT token
function verifyToken(token, secretKey) {
    return jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return { valid: false, error: err };
        } else {
            return { valid: true, decoded };
        }
    });
}

function decodeToken(token) {
    return jwt.decode(token, { complete: true });
}

module.exports = {
    generateToken,
    verifyToken,
    decodeToken,
};
