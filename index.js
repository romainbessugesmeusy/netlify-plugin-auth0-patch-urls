/* eslint-disable no-console */
const path = require('path');
const { ManagementClient } = require('auth0');
require('dotenv').config({
    path: path.resolve(process.cwd(), `.env.${process.env.CONTEXT}`),
});

module.exports = {
    onPreBuild: ({ utils }) => {
        console.info(`🔑 Auth0 Plugin startup 🔑`);
        const tab = '   ';
        const requiredEnvVariables = [
            'AUTH0_DOMAIN',
            'AUTH0_MANAGEMENT_CLIENT_ID',
            'AUTH0_MANAGEMENT_CLIENT_SECRET',
            'GATSBY_AUTH0_CLIENTID',
            'AUTH0_CALLBACK_PATHNAMES',
            'AUTH0_LOGOUT_PATHNAMES',
            'DEPLOY_URL',
        ];
        const missingEnvVariables = requiredEnvVariables.filter(
            envVar => typeof process.env[envVar] === 'undefined',
        );

        if (missingEnvVariables.length > 0) {
            utils.build.failPlugin(
                `${tab} ☠️ Missing environment variables: ${missingEnvVariables.join(
                    ', ',
                )}`,
            );
        }

        return new Promise(resolve => {
            const url = process.env.DEPLOY_URL;
            console.log(`${tab} 🧭 Deploy Preview URL should be:`, url);

            const management = new ManagementClient({
                domain: process.env.AUTH0_DOMAIN,
                clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
                clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
                scope: 'read:clients update:clients',
            });

            management.clients
                .get({ client_id: process.env.GATSBY_AUTH0_CLIENTID })
                .then(client => {
                    console.info(`${tab} 🗝 Retrieved Auth0 client:`, client.name);
                    if (client.allowed_clients.indexOf(url) === -1) {
                        console.info(`${tab} URL has not yet been added to Auth0 Client`);
                        const payload = {
                            allowed_clients: client.allowed_clients.concat([url]),
                            web_origins: client.web_origins.concat([url]),
                            allowed_origins: client.allowed_origins.concat([url]),
                            callbacks: client.callbacks.concat(
                                process.env.AUTH0_CALLBACK_PATHNAMES.split(',').map(
                                    pathname => `${url}/${pathname}`,
                                ),
                            ),
                            allowed_logout_urls: client.callbacks.concat(
                                process.env.AUTH0_LOGOUT_PATHNAMES.split(',').map(
                                    pathname => `${url}/${pathname}`,
                                ),
                            ),
                        };
                        management.clients.update(
                            { client_id: process.env.GATSBY_AUTH0_CLIENTID },
                            payload,
                            (updateError, updatedClient) => {
                                if (updateError) {
                                    utils.build.failPlugin(
                                        `${tab} ☠️ Something wrong happened while trying to patch Auth0 Client`,
                                    );
                                } else {
                                    console.log(`${tab} 🍾 Successfully patched Auth0 Client.`);
                                    console.log(
                                        `${tab} Allowed URLS:`,
                                        updatedClient.allowed_clients,
                                    );
                                }
                                resolve();
                            },
                        );
                    } else {
                        console.info(
                            `${tab} 👍 URL has already been added to Auth0 Client`,
                        );
                        resolve();
                    }
                });
        });
    },
};
