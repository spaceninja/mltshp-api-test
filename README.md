# MLTSHP API Test

> A simple demo app that uses JavaScript to test the MLTSHP API.

This app performs a full authorization circle with MLTSHP and then loads an image.

1. The user is sent to MLTSHP.com to authorize access for the app.
1. When the user agrees, they're returned to the app with a `?code=XXX` URL parameter.
1. The app uses that authorization code to request an access token from the API.
1. Using the token, the app constructs a signed API request for an image.
1. If everything works, the image is displayed on-screen.

## Local Development

1. Start by setting up an app to get an API key & secret at https://mltshp.com/developers
1. Set your app's redirect URL to `http://localhost:1234`.
1. Add your API key, secret, and redirect URL to `.env`.
1. Run `yarn dev` to start a development server at `http://localhost:1234`.

## Production

To run this app in a production environment, use the `yarn build` command to
build the `dist` folder, which can then be served in any hosting environment.

You'll need to set environment variables for your API key, secret, and redirect URL.

## Proxy Server

Note that [due to CORS restrictions][1], a JS app can't talk directly to the
MLTSHP API. As a work-around, this app uses the [CORS Anywhere][2] demo server.
This is good enough for a quick demo like this, but is a terrible idea for a
real app, since you're sending your API keys to it. If you want to build a real
app, you'll need to set up your own proxy.

[1]: https://stackoverflow.com/a/43268098
[2]: https://github.com/Rob--W/cors-anywhere/
