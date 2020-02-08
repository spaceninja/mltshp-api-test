/**
 * Get MLTSHP API Token Proxy
 * Requests an access token from the MLTSHP OAuth API.
 *
 * @see https://mltshp.com/developers
 */
import fetch from "node-fetch";
import querystring from "querystring";
const mltshpOAuthApiUrl = "https://mltshp.com/api/token";

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Params are in the event body encoded as a query string
  const params = querystring.parse(event.body);
  console.log("PARAMS", params);

  // Reject if we don't have the expected parameters
  if (
    !(
      params &&
      params.code &&
      params.client_id &&
      params.client_secret &&
      params.redirect_uri
    )
  ) {
    return { statusCode: 401, body: "API Keys Missing" };
  }

  // Construct the body of the request
  const body = {
    grant_type: "authorization_code",
    code: params.code,
    client_id: params.client_id,
    client_secret: params.client_secret,
    redirect_uri: params.redirect_uri
  };
  const jsonBody = JSON.stringify(body);
  console.log("BODY", body, jsonBody);

  // Request an access token from the oAuth API
  return fetch(mltshpOAuthApiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: jsonBody
  })
    .then(response => {
      console.log("RESPONSE", response.json());
      return response.json();
    })
    .then(json => ({
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(json)
    }))
    .catch(error => ({
      statusCode: 422,
      body: `Oops! Something went wrong. ${error}`
    }));
};
