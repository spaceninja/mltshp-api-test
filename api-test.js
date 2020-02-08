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
const REDIRECT_URL = "http://localhost/mltshp-php-sample.php";

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

const getToken = () => {
  const data = {
    grant_type: "authorization_code",
    code: authCode,
    redirect_uri: REDIRECT_URL,
    client_id: API_KEY,
    client_secret: API_SECRET
  };

  return fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    body: data
  }).then(response => response.json());
};

const init = async () => {
  let token = await getToken();
  console.log("TOKEN:", token);
};

// See if we received an authorization code as a URL parameter
if (authCode) {
  // Auth code exists. Now we need to get access token.
  // Assemble and send our JSON formatted request
  init();
} else {
  // Auth code does not exist. Put info in the html to send them on their way.
  content = `
    You need to authenticate this application with MLTSHP first.
    <a href="${AUTHENTICATION_URL}">Go authenticate</a>.
    (Be sure to click "I AGREE.")
  `;
}

console.log(appElement, content);
appElement.innerHTML = content;
