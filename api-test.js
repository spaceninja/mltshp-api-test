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
 */

// Your app's API key, secret, and redirect URL
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;
console.table({
  "API key": API_KEY,
  "API secret": API_SECRET,
  "Redirect URL": REDIRECT_URL
});

// Other API URLs
// Note, you'll need a proxy to access the API from the front-end
// @see https://stackoverflow.com/a/43268098
const PROXY_URL = "https://cors-anywhere.herokuapp.com/";
const RESOURCE_URL = "https://mltshp.com";
const ACCESS_TOKEN_URL = `${RESOURCE_URL}/api/token`;
const AUTHENTICATION_URL = `${RESOURCE_URL}/api/authorize?response_type=code&client_id=${API_KEY}`;

// Check the URL parameters for an user authorization code from MTLSHP
const urlParams = new URLSearchParams(window.location.search);
const authCode = urlParams.get("code");

// Prepare the document for content
const appElement = document.getElementById("app");
const loggedOutMessage = `
  You need to authenticate this application with MLTSHP first.
  <a href="${AUTHENTICATION_URL}">Go authenticate</a>.
  (Be sure to click "I AGREE.")`;

/**
 * Convert Decimal to Hex
 * i.e. 0-255 -> '00'-'ff'
 *
 * @param {number} dec
 * @returns {string}
 * @see https://stackoverflow.com/a/27747377
 */
const dec2hex = dec => {
  return ("0" + dec.toString(16)).substr(-2);
};

/**
 * Generate a Nonce
 * Returns a random string of the specified length
 *
 * @param {number} length
 * @returns {string}
 * @see https://stackoverflow.com/a/27747377
 */
const generateNonce = (length = 40) => {
  var array = new Uint8Array(length / 2);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join("");
};

/**
 * Handle Fetch Request Errors
 *
 * @param {object} response
 * @returns {object}
 * @see https://www.tjvantoll.com/2015/09/13/fetch-and-errors/
 */
const handleErrors = response => {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response;
};

/**
 * Generate API Authorization String
 * We must create a signed message for the API using the following:
 *  * The access token you just received.
 *  * A UTC timestamp (in seconds)
 *  * A nonce (random string between 10 and 35 characters long)
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
const generateAuthString = (token, path, method = "GET") => {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce(35);

  // NOTE: using port 80 is a bug!
  // Port should be 443 but it's not recognizing it
  // You should use https for all API queries
  const port = 80;

  // Normalize the message.
  // NOTE: we're not including a query string because this demo doesn't need one.
  // NOTE: The order, indentation, and linebreaks are important!
  const normalizedString = `${token.access_token}
${timestamp}
${nonce}
${method}
mltshp.com
${port}
${path}
`;

  // Create a signature by taking the normalizedString and use the secret to
  // construct a has using SHA1 encoding, then Base64 the result.
  const hash = hmacSHA1(normalizedString, token.secret);
  const signature = base64.stringify(hash);

  const authString =
    `MAC token=${token.access_token}, ` +
    `timestamp=${timestamp}, ` +
    `nonce=${nonce}, ` +
    `signature=${signature}`;

  console.group("GENERATE SIGNATURE");
  console.log(normalizedString);
  console.log(authString);
  console.groupEnd();

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
  const authString = generateAuthString(token, path);
  const endpoint = `${RESOURCE_URL}${path}`;
  return fetch(`${PROXY_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: authString
    }
  })
    .then(handleErrors)
    .then(response => response.json())
    .catch(error => ({ error: error }));
};

/**
 * Get API Token
 *
 * @param {string} code
 * @returns {object}
 */
const getToken = code => {
  return fetch(`${PROXY_URL}${ACCESS_TOKEN_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body:
      `grant_type=authorization_code` +
      `&client_id=${API_KEY}` +
      `&client_secret=${API_SECRET}` +
      `&code=${code}` +
      `&redirect_uri=${REDIRECT_URL}`
  })
    .then(handleErrors)
    .then(response => response.json())
    .catch(error => ({ error: error }));
};

/**
 * Init Function
 * Uses authorization code URL parameter to request a token,
 * then uses the token to request an image.
 */
const init = async () => {
  // See if we received an authorization code as a URL parameter
  if (!authCode) {
    // Auth code does not exist. Put info in the html to send them on their way.
    appElement.innerHTML = loggedOutMessage;
  }

  // Auth code exists. Now we need to get access token.
  let token = await getToken(authCode);
  console.table(token);

  // Display the logged out message if the token returns an error
  if (token.error) {
    appElement.innerHTML = loggedOutMessage;
    return;
  }

  // Use the access token to request the image
  let image = await getResource(token, "/api/sharedfile/GA4");
  console.table(image);

  // Display an error if something goes wrong
  if (image.error) {
    appElement.innerHTML = image.error.message;
    return;
  }

  // Output the image to page
  appElement.innerHTML = `
    <a href="${image.permalink_page}">
      <img src="${image.original_image_url}" alt="${image.title}" />
    </a>
    <pre>${JSON.stringify(image, undefined, 2)}</pre>`;
};

init();
