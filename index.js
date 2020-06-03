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
      "AUTH0_CLIENT_ID",
      "AUTH0_MANAGEMENT_CLIENT_ID",
      "AUTH0_MANAGEMENT_CLIENT_SECRET",
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
      const deployUrl = process.env.DEPLOY_URL;
      console.log(`${tab} 🧭 Deploy Preview URL will be:`, deployUrl);
      const deployPrimeUrl = process.env.DEPLOY_PRIME_URL;
      if (deployPrimeUrl) {
        console.log(
          `${tab} 🧭 Deploy Preview Prime URL will be:`,
          deployPrimeUrl
        );
      }

      const management = new ManagementClient({
        domain: process.env.AUTH0_DOMAIN,
        clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
        clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
        scope: "read:clients update:clients",
      });

      management.clients.get(process.env.AUTH0_CLIENT_ID).then((client) => {
        console.log(`${tab} 🗝 Retrieved Auth0 client: ${client.name}`);

        // Handles empty value https://github.com/romainbessugesmeusy/netlify-plugin-auth0-patch-urls/issues/9
        const clientWebOrigins = client.web_origins || [];

        // If a PRIME URL is given by Netlify, we want to add it.
        // Will be made optional in future release
        const urlOrigins = deployPrimeUrl
          ? [deployUrl, deployPrimeUrl]
          : [deployUrl];

        // Urls that need to be added are the ones that are not already in the Client WebOrigins array.
        const urlsToAdd = urlOrigins.filter(
          (url) => !clientWebOrigins.includes(url)
        );

        if (urlsToAdd.length > 0) {
          console.log(
            `${tab} Adding URLs to the Auth0 Application Web Origins:`
          );
          urlsToAdd.forEach(url => console.log(`${tab} • ${url}`));
          management.clients.update(
            { client_id: process.env.AUTH0_CLIENT_ID },
            { web_origins: clientWebOrigins.concat(urlsToAdd) },
            (updateError) => {
              if (updateError) {
                utils.build.failPlugin(
                  `${tab} ☠️ Something wrong happened while trying to patch Auth0 Application`
                );
              } else {
                console.log(
                  `${tab} 🍾 Successfully patched Auth0 Application.`
                );
              }
              resolve();
            }
          );
        } else {
          console.log(
            `${tab} 👍 URL has already been added to Auth0 Application`
          );
          resolve();
        }
      });
    });
  },
};
