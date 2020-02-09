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

// The resource we're going to get info on via the sharedfile API endpoint
const RESOURCE_URL = "https://mltshp.com/api/sharedfile/GA4";

// Get the authorization code from the URL parameter
const urlParams = new URLSearchParams(window.location.search);
const authCode = urlParams.get("code");

// Prepare the document for content
const appElement = document.getElementById("app");
let content = "";

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
 * Generate a Random String of Specified Length
 *
 * @param {number} len
 * @see https://stackoverflow.com/a/27747377
 */
function generateId(len = 40) {
  var arr = new Uint8Array(len / 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join("");
}

/**
 * Generate API Request Signature
 * We must create a signed message for the server using the following:
 *  * The access token you just received.
 *  * A UTC timestamp
 *  * A nonce: a random string between 10 and 35 characters long.
 *    Don't use the UTC timestamp as a nonce!
 *  * Your request method (GET/POST)
 *  * The host (mltshp.com)
 *  * The port (443 for ssl)
 *  * The path (/api/sharedfile/GA4)
 *    Replace with the specific method and resource you want to use.
 *  * The query array (There is no query array for this request,
 *    but there will be an example on the developer site soon.
 *    There is a specific method for encoding this bit.)
 *
 * @param {string} token
 */
const generateSignature = token => {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateId(35);

  // NOTE: using port 80 is a bug!
  // Port should be 443 but it's not recognizing it, so leave as 80 for now
  // You should use https for all API queries
  const normalizedString = `${token}
${timestamp}
${nonce}
GET
mltshp.com
80
/api/sharedfile/GA4
`;
  console.log("NORMALIZED STRING", normalizedString);

  const digest = ""; // hmac(secret, sha1) or hmac(secret, nomalizedString, sha1).digest()
  const signature = ""; // hexToBase64(hmac-->hash(normalizedString)) or base64(digest)
  const authString = `MAC token=${token}, timestamp=${timestamp}, nonce=${nonce}, signature=${signature}`;

  return authString;
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
 * Get Image
 *
 * @param {string} authString
 */
const getImage = authString => {
  return fetch(RESOURCE_URL, {
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
 * Init Function
 */
const init = async () => {
  // Get an access token
  let token = await getToken(authCode);
  console.log("TOKEN:", token);

  // Now sign the request
  const signature = generateSignature(token.access_token);
  console.log("SIGNATURE", signature);

  // And send it!
  let image = await getImage(signature);
  console.log("IMAGE", image);
};

// See if we received an authorization code as a URL parameter
if (authCode) {
  // Auth code exists. Now we need to get access token.
  init();
} else {
  // Auth code does not exist. Put info in the html to send them on their way.
  content = `
    You need to authenticate this application with MLTSHP first.
    <a href="${AUTHENTICATION_URL}">Go authenticate</a>.
    (Be sure to click "I AGREE.")
  `;
}

appElement.innerHTML = content;
