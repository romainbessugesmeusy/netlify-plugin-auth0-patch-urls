# netlify-plugin-auth0-patch-urls

A Netlify Build plugin that makes Auth0 works with deploy previews

## Motivation 

Auth0 doesn't allow wildcard subdomains so things get rapidly complicated when using their SPA library while deploying
previews on Netlify. This build plugin automates the Auth0 Application configuration update by leveraging the Auth0 
management API. *It basically adds the preview URLs of current Netlify build to the list of authorized URLs.* 

## Prerequisites

1. In order to get it to work properly, it is required to create a Management API token in 
the APIs section of your Auth0 account, and grant it the `read:clients` and `update:clients` permission.

2. Then you need to create a dedicated Application ("machine to machine") and choose the previously created API in the APIs
tab.

3. Lastly, you have to declare the environment variables that will contain all the client ID and secrets required by this
build plugin:

Env Variable | Description
------------ | --------------
`AUTH0_DOMAIN` | This is you Aut0 application domain 
`AUTH0_CLIENT_ID` | Client ID for the SPA Application
`AUTH0_MANAGEMENT_CLIENT_ID` |  Client ID of the Management Application
`AUTH0_MANAGEMENT_CLIENT_SECRET` | Client Secret of the Management Application
`DEPLOY_URL` | Specified by Netlify build
`DEPLOY_PRIME_URL` | Specified by Netlify build

These variables have to be defined in your Netlify deployments settings

**Important changes from 1.2.0**

This plugin has been cluttering Auth0 apps by setting absolute URLs for logout, callbacks and CORS. 
Since 1.2.0, this has been removed in favor of the use of wildcard subdomains, which can be set in
the Auth0 UI. See https://auth0.com/docs/applications/reference/wildcard-subdomains  

## Installation 

Install locally (it seems to help with Netlify build time).

```
$ yarn add netlify-plugin-auth0-patch-urls
```

Add the plugin to the `netlify.toml`

```toml
[[plugins]]
  package = "netlify-plugin-auth0-patch-urls"
```

