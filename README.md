# TWILIE

## Running the Sample

Install the dependencies.

```bash
npm install
```

Rename `.env.sample` to `.env` and replace the values for `AUTH0_CLIENT_ID`, `AUTH0_DOMAIN`, and `AUTH0_CLIENT_SECRET` with your Auth0 credentials. If you don't yet have an Auth0 account, [sign up](https://auth0.com/signup) for free.

```bash
# copy configuration and replace with your own
cp .env.example .env
```

If you're using a hosting provider that uses a proxy in front of Node.js, comment in the `trust proxy` configuration in [app.js](https://github.com/auth0-samples/auth0-nodejs-webapp-sample/blob/812bb41fa655a1178f6a33ba54b0aee2397b1917/01-Login/app.js#L63-L70). This is a [`express-session` configuration setting](https://www.npmjs.com/package/express-session#cookiesecure) that allows for trusting this first proxy.

Run the app.

```bash
npm start
```

The app will be served at `localhost:3000`.

