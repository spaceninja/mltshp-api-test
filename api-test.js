import "core-js/stable";
import "regenerator-runtime/runtime";
import hmacSHA1 from "crypto-js/hmac-sha1";
import base64 from "crypto-js/enc-base64";

/**
 * MLTSHP API Test - PHP
 *
 * Performs a full auth circle with MLTSHP and then executes
 * https://mltshp.com/api/sharedfile/GA4 (returning info on that file)
 *
 * Start by setting up an app to get an API key & secret at
 * https://mltshp.com/developers
 *
 * TODO: convert to simple Node app
 *  x load secrets from environment vars
 *  x provide a simple server
 *  x update default redirect URL and instructions to use it
 *  - break app into three routes - index (logged out), login, image
 *  - ditch proxy functions if node app can connect to API
 *  - update dev docs with how to construct signature
 *  - update dev docs to link to repo
 */

// Your app's API key, secret, and redirect URL
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;
console.log("ENV VARS", API_KEY, API_SECRET, REDIRECT_URL);

// Other API URLs
const AUTHENTICATION_URL = `https://mltshp.com/api/authorize?response_type=code&client_id=${API_KEY}`;
const ACCESS_TOKEN_URL = "https://mltshp.com/api/token";
// const ACCESS_TOKEN_URL =
//   "https://mltshp-api-test.netlify.com/.netlify/functions/mltshp-oauth-api-proxy";
const RESOURCE_URL = "https://mltshp.com";

// Get the authorization code from the URL parameter
const urlParams = new URLSearchParams(window.location.search);
const authCode = urlParams.get("code");

// Prepare the document for content
const appElement = document.getElementById("app");

/**
 * Convert Decimal to Hex
 * i.e. 0-255 -> '00'-'ff'
 *
 * @param {number} dec
 * @returns {string}
 * @see https://stackoverflow.com/a/27747377
 */
function dec2hex(dec) {
  return ("0" + dec.toString(16)).substr(-2);
}

/**
 * Generate a Nonce
 * Returns a random string of the specified length
 *
 * @param {number} length
 * @returns {string}
 * @see https://stackoverflow.com/a/27747377
 */
function generateNonce(length = 40) {
  var array = new Uint8Array(length / 2);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join("");
}

/**
 * Generate API Request Signature
 * We must create a signed message for the server using the following:
 *  * The access token you just received.
 *  * A UTC timestamp
 *  * A nonce: a random string between 10 and 35 characters long.
 *    Note: Don't use the UTC timestamp as a nonce!
 *  * Your request method (GET/POST)
 *  * The host (mltshp.com)
 *  * The port (443 for ssl)
 *  * The API endpoint path (/api/sharedfile/GA4)
 *  * The query array
 *    There is no query array for this request,
 *    but there will be an example on the developer site soon.
 *    There is a specific method for encoding this bit.
 *
 * @param {object} token
 * @param {string} token.access_token
 * @param {string} token.secret
 * @param {string} path
 * @param {string} method=GET
 * @returns {string}
 */
const generateSignature = (token, path, method = "GET") => {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce(35);

  // NOTE: using port 80 is a bug!
  // Port should be 443 but it's not recognizing it
  // You should use https for all API queries
  const port = 80;

  // Normalize the message. The order and linebreaks are important!
  const normalizedString = `${token.access_token}
${timestamp}
${nonce}
${method}
mltshp.com
${port}
${path}
`;
  console.log("NORMALIZED STRING", normalizedString);

  const hash = hmacSHA1(normalizedString, token.secret);
  const signature = base64.stringify(hash);
  const authString = `MAC token=${token.access_token}, timestamp=${timestamp}, nonce=${nonce}, signature=${signature}`;
  console.log("SIGNATURE", authString);

  return authString;
};

/**
 * Get API Resource
 *
 * @param {object} token
 * @param {string} token.access_token
 * @param {string} token.secret
 * @param {string} path
 * @returns {object}
 */
const getResource = (token, path) => {
  const authString = generateSignature(token, path);
  const endpoint = `${RESOURCE_URL}${path}`;

  return fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: authString
    }
  })
    .then(response => response.json())
    .catch(error => ({
      statusCode: 422,
      body: `Oops! Something went wrong. ${error}`
    }));
};

/**
 * Get API Token
 *
 * @param {string} code
 * @returns {object}
 */
const getToken = code => {
  return fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=authorization_code&client_id=${API_KEY}&client_secret=${API_SECRET}&code=${code}&redirect_uri=${REDIRECT_URL}`
  })
    .then(response => response.json())
    .catch(error => ({
      statusCode: 422,
      body: `Oops! Something went wrong. ${error}`
    }));
};

/**
 * Init Function
 */
const init = async () => {
  // Get an access token
  let token = await getToken(authCode);
  console.log("TOKEN:", token);

  // And send it!
  let image = await getResource(token, "/api/sharedfile/GA4");
  console.log("IMAGE", image);

  // Output the array to page
  appElement.innerHTML = `<pre>${JSON.stringify(image, undefined, 2)}</pre>`;
};

// See if we received an authorization code as a URL parameter
if (authCode) {
  // Auth code exists. Now we need to get access token.
  init();
} else {
  // Auth code does not exist. Put info in the html to send them on their way.
  appElement.innerHTML = `
    You need to authenticate this application with MLTSHP first.
    <a href="${AUTHENTICATION_URL}">Go authenticate</a>.
    (Be sure to click "I AGREE.")
  `;
}
