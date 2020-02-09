/**
 * MLTSHP API Test - PHP
 *
 * Performs a full auth circle with MLTSHP and then executes
 * https://mltshp.com/api/sharedfile/GA4 (returning info on that file)
 *
 * Start by setting up an app to get an API key & secret at
 * https://mltshp.com/developers
 */

// Your app's API key & secret
const API_KEY = "YOUR_API_KEY";
const API_SECRET = "YOUR_API_SECRET";

// Redirect URL MLTSHP will send auth code to.
// Same one you provided when you set up your app.
const REDIRECT_URL = "https://example.com/api-test";

// Other API URLs
const AUTHENTICATION_URL = `https://mltshp.com/api/authorize?response_type=code&client_id=${API_KEY}`;
const ACCESS_TOKEN_URL = "https://mltshp.com/api/token";

// Salt for your nonce
const NONCE_SALT = "Something unique or random.";

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
 *  * The query array (There is no query array for this request,
 *    but there will be an example on the developer site soon.
 *    There is a specific method for encoding this bit.)
 *
 * @param {object} token
 * @param {string} path
 * @param {string} method
 */
const generateSignature = (token, path, method = "GET") => {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce(35);

  // NOTE: using port 80 is a bug!
  // Port should be 443 but it's not recognizing it
  // You should use https for all API queries
  const port = 80;

  // Normalize the message. The order here is important!
  const normalizedString = `${token.access_token}
${timestamp}
${nonce}
${method}
mltshp.com
${port}
${path}
`;
  console.log("NORMALIZED STRING", normalizedString);

  const digest = ""; // hmac(token.secret, sha1) or hmac(secret, nomalizedString, sha1).digest()
  const signature = ""; // hexToBase64(hmac-->hash(normalizedString)) or base64(digest)
  const authString = `MAC token=${token.access_token}, timestamp=${timestamp}, nonce=${nonce}, signature=${signature}`;
  console.log("SIGNATURE", authString);

  return authString;
};

/**
 * Get Image
 *
 * @param {object} token
 * @param {string} path
 */
const getImage = (token, path) => {
  const authString = generateSignature(token, path);
  const endpoint = `https://mltshp.com${path}`;

  return fetch(endpoint, {
    method: "GET",
    headers: {
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
  let image = await getImage(token, "/api/sharedfile/GA4");
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
