/* eslint-disable no-console */
const path = require("path");
const { ManagementClient } = require("auth0");
require("dotenv").config({
  path: path.resolve(process.cwd(), `.env.${process.env.CONTEXT}`),
});

module.exports = {
  onPreBuild: ({ utils }) => {
    console.log(`🔑 Auth0 Plugin startup`);
    const tab = "   ";
    const requiredEnvVariables = [
      "AUTH0_DOMAIN",
      "AUTH0_MANAGEMENT_CLIENT_ID",
      "AUTH0_MANAGEMENT_CLIENT_SECRET",
      "AUTH0_CLIENT_ID",
      "AUTH0_CALLBACK_PATHNAMES",
      "AUTH0_LOGOUT_PATHNAMES",
      "DEPLOY_URL",
    ];
    const missingEnvVariables = requiredEnvVariables.filter(
      (envVar) => typeof process.env[envVar] === "undefined"
    );

    if (missingEnvVariables.length > 0) {
      utils.build.failPlugin(
        `${tab} ☠️ Missing environment variables: ${missingEnvVariables.join(
          ", "
        )}`
      );
    }

    return new Promise((resolve) => {
      const url = process.env.DEPLOY_URL;
      console.log(`${tab} 🧭 Deploy Preview URL should be:`, url);
      const deployPrimeUrl = process.env.DEPLOY_PRIME_URL;
      if (deployPrimeUrl) {
        console.log(
          `${tab} 🧭 Deploy Preview Prime URL should be:`,
          deployPrimeUrl
        );
      }

      const management = new ManagementClient({
        domain: process.env.AUTH0_DOMAIN,
        clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
        clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
        scope: "read:clients update:clients",
      });

      management.clients
        .get({ client_id: process.env.AUTH0_CLIENT_ID })
        .then((client) => {
          console.log(`${tab} 🗝 Retrieved Auth0 client:`, client.name);
          if (client.allowed_clients.indexOf(url) === -1) {
            console.log(`${tab} URL has not yet been added to Auth0 Client`);
            const getComposeUrls = (envKey, urlToUse) =>
              urlToUse
                ? process.env[envKey]
                    .split(",")
                    .map((pathname) => `${urlToUse}/${pathname}`)
                : [];
            const urlOrigins = deployPrimeUrl ? [url, deployPrimeUrl] : [url];
            const getArrayWithUniqueValues = (arr) => [...new Set(arr)];
            const payload = {
              allowed_clients: getArrayWithUniqueValues(
                client.allowed_clients.concat(urlOrigins)
              ),
              web_origins: getArrayWithUniqueValues(
                client.web_origins.concat(urlOrigins)
              ),
              allowed_origins: getArrayWithUniqueValues(
                client.allowed_origins.concat(urlOrigins)
              ),
              callbacks: getArrayWithUniqueValues(
                client.callbacks.concat([
                  ...getComposeUrls("AUTH0_CALLBACK_PATHNAMES", url),
                  ...getComposeUrls("AUTH0_CALLBACK_PATHNAMES", deployPrimeUrl),
                ])
              ),
              allowed_logout_urls: getArrayWithUniqueValues(
                client.allowed_logout_urls.concat([
                  ...getComposeUrls("AUTH0_LOGOUT_PATHNAMES", url),
                  ...getComposeUrls("AUTH0_LOGOUT_PATHNAMES", deployPrimeUrl),
                ])
              ),
            };
            management.clients.update(
              { client_id: process.env.AUTH0_CLIENT_ID },
              payload,
              (updateError, updatedClient) => {
                if (updateError) {
                  utils.build.failPlugin(
                    `${tab} ☠️ Something wrong happened while trying to patch Auth0 Client`
                  );
                } else {
                  console.log(`${tab} 🍾 Successfully patched Auth0 Client.`);
                  console.log(
                    `${tab} Allowed URLS:`,
                    updatedClient.allowed_clients
                  );
                }
                resolve();
              }
            );
          } else {
            console.log(`${tab} 👍 URL has already been added to Auth0 Client`);
            resolve();
          }
        });
    });
  },
};
