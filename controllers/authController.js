const axios = require('axios');
const qs = require('qs');
const { decodeToken } = require('../jwtToken/jwtHelper');
const logger = require('../logger/logger');

// Load environment variables
require('dotenv').config();

// Use the API key from environment variables
const apiKey = process.env.API_KEY;
const secretKey = process.env.SECRET_KEY;
const baseURL = process.env.BASE_URL;
const APIUsername = process.env.API_USER_NAME;
const APIpassword = process.env.API_USER_PASSWORD;
const APILoginURL = process.env.API_LOGIN_URL;
const generateOTP_URL = process.env.API_GENERATE_OTP_URL;
const otpUthURL = process.env.API_OTP_AUTH_URL;

exports.authenticate = async (req, res) => {
    const { phoneNumber, password } = req.body;
    //console.log("Phone number, password:", phoneNumber, password);

    try {
        // Prepare credentials and request for token
        logger.info("enter in authenticate");
        const credentials = `${apiKey}:${secretKey}`;
        const authAPI = Buffer.from(credentials).toString('base64');
        const tokenBody = qs.stringify({
            'grant_type': 'password',
            'username': APIUsername,
            'password': APIpassword
        });
        console.log("tokenBody",tokenBody,"baseURL",baseURL)
        const tokenResponse = await axios.post(`${baseURL}/oauth2/token`, tokenBody, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authAPI}`,
            }
        });
        logger.info("authenticate tokenResponse success");
        // Check if token response is valid
        if (tokenResponse && tokenResponse.data.access_token) {
            const token = tokenResponse.data.access_token;

            var tokendata = JSON.stringify({
                "mobileNumber": phoneNumber,
                "password": password
            });
            var config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: APILoginURL,
                headers: {
                    'accept': '*/*',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                data: tokendata
            };
            logger.info("config",config)
            const loginResponse = await axios(config);
            
            // Send the login response
            const loginToken = loginResponse.data.data.token;
            const sidID = loginResponse.data.data.sid;
            //console.log("tokenResponse.data",loginResponse.data.data);

            if (loginToken) {
                logger.info("authenticate loginResponse success and loginToken is ",loginToken);
                try {
                    const userDetails = decodeToken(loginToken);
                    const userId = userDetails.payload.sub.trim();
                    // console.log("access token", userId,"loginToken",loginToken);


                    var data = JSON.stringify({
                        "userId": userId,
                        "sendEmail": true,
                        "isWhitelisted": true
                    });

                    var config = {
                        method: 'post',
                        maxBodyLength: Infinity,
                        url: generateOTP_URL,
                        headers: {
                            'accept': '*/*',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        data: data
                    };
                    await axios(config);
                    res.json({
                        success: true,
                        token: token,
                        accessToken: loginToken,
                        sid: sidID
                    });
                } catch (error) {
                    if (error.response && error.response.data) {
                        //console.error("Error:", error.response.data);   
                    logger.error('Error occurred', { error});
                    } else {
                      logger.error('Unexpected Error:', error.response ? error.response.data : error.message);
                    }
                }

            } else {
                logger.error({ error: 'Invalid token' });
                res.status(400).json({ error: 'Invalid token' });
            }
        } else {
            logger.error({ error: 'Invalid token response'});
            res.status(400).json({ error: 'Invalid token response' });
        }
    } catch (error) {
        // Log the error for debugging
        logger.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.submitOTP = async (req, res) => {
    const { otp, token, sid, accessToken } = req.body;
    logger.info("enter in submitOTP");
    try {
        const userDetails1 = decodeToken(accessToken);
        // console.log('userDetails',userDetails);
         
        const userId = userDetails1.payload.sub.trim();
        logger.info('sid',sid,"userId",userId);
        var data = JSON.stringify({
            "userId": userId,
            "otp": otp
        });

        var config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: otpUthURL,
            headers: {
                'accept': '*/*',
                'sid': sid,
                'Auth': accessToken,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            data: data
        };

        const authResponce = await axios(config);
        logger.info("authResponce success");
       
        res.json({
            success: true,
            data: authResponce.data.data
        });
    } catch (error) {
        logger.error("Error in submitOTP:");
        res.status(500).json({ success: false, error: error.message });
    }

}