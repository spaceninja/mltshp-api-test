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
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
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
    return {
      statusCode: 401,
      body: "API Keys Missing"
    };
  }

  // Construct the body of the request
  const body = `grant_type=authorization_code&client_id=${params.client_id}&client_secret=${params.client_secret}&code=${params.code}&redirect_uri=${params.redirect_uri}`;
  console.log("BODY", body);

  // Request an access token from the OAuth API
  return fetch(mltshpOAuthApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body
  })
    .then(response => response.json())
    .then(json => {
      console.log("RESPONSE", json);
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(json)
      };
    })
    .catch(error => {
      console.log("ERROR", error);
      return {
        statusCode: 422,
        body: `Oops! Something went wrong. ${error}`
      };
    });
};
