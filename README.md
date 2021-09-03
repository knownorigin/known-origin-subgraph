# KnownOrigin.io Subgraph

### Graph UI

Must belong to the `knownorigin` github:

https://thegraph.com/explorer/subgraph/knownorigin/known-origin

### Subgraphs

| Purpose | URL |
|---|---|
| Production (mainnet) | https://thegraph.com/explorer/subgraph/knownorigin/known-origin ||
| Staging (mainnet) | https://thegraph.com/explorer/subgraph/knownorigin/known-origin-staging ||
| Development (rinkeby) | https://thegraph.com/explorer/subgraph/knownorigin/knownoriginrinkeby ||
| Alpha Studio (mainnet) | https://thegraph.com/studio/subgraph/known-origin |

### Built via

```bash
graph init --from-contract <address> knownorigin/known-origin graph-known-origin
```

### Install graph-client

`npm install -g @graphprotocol/graph-cli`

### Auth with subgraph

`graph auth https://api.thegraph.com/deploy/ <auth-token>`

### Auth

`graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>`

### Dev cycle

Install

```bash
yarn install
```

If schema changes

```bash
yarn codegen
```

Compile mappings

```bash
yarn build
```

Push that puppy!

```bash
yarn deploy
```

## What is a subgraph

[TheGraph](https://thegraph.com/) protocol is in indexing and data layer which provides a clean and developer friendly
solution to indexer your onchain and IPFS data.

KO deploys a Subgraph for both `Mainnet` and `Rinkeby`.

Subgraph Studio is the developer tool for creating, deploying and managing your SubGraphs.

- https://thegraph.com/studio/subgraph/known-origin/
- https://thegraph.com/blog/building-with-subgraph-studio

Subgraph Explorer is the public overview of the deployed SubGraphs.

- (mainnet) `https://thegraph.com/explorer/subgraph?id=0x3f8c962eb167ad2f80c72b5f933511ccdf0719d4-0`
- (rinkeby) `https://testnet.thegraph.com/subgraph?id=0x3f8c962eb167ad2f80c72b5f933511ccdf0719d4-0`

### Subgraph Studio

#### Network

###### Mainnet

https://thegraph.com/studio/subgraph/known-origin/

```
Queries (HTTP):     https://api.studio.thegraph.com/query/2668/known-origin/<version>
Subscriptions (WS): https://api.studio.thegraph.com/query/2668/known-origin/<version>
```

###### Rinkeby

https://thegraph.com/studio/subgraph/known-origin-rinkeby/

```
Queries (HTTP):     https://api.studio.thegraph.com/query/2668/known-origin-rinkeby/<version>
Subscriptions (WS): https://api.studio.thegraph.com/query/2668/known-origin-rinkeby/<version>
```

#### How to Deploy to Subgraph Studio

1. Make sure you are authentication with the account key `graph auth https://api.thegraph.com/deploy/ <auth-token>`

2. Deploy subgraph to network of choice using the commands below - this will build, compile and publish the subgraph

```
npm run deploy:mainnet-studio

OR

npm run deploy:rinkey-studio
```

3. Visit deployed version and ensure `GRT` tokens are correctly `signaling` the subgraph

4. `Publish` the deployed subgraph via the studio - selecting the version you just deployed

5. Query the subgraph
    - (mainnet) https://gateway.thegraph.com/api/[api-key]/subgraphs/id/0x3f8c962eb167ad2f80c72b5f933511ccdf0719d4-0
    - (testnet) https://gateway.testnet.thegraph.com/api/[api-key]/subgraphs/id/0x3f8c962eb167ad2f80c72b5f933511ccdf0719d4-0

### KO Application which current use these Subgraph's

* Discovery - `mainnet` / `rinkeby`
* Minter - `mainnet` / `rinkeby`
* Serverless API - `mainnet` / `rinkeby`
* Admin/backoffice - `mainnet` / `rinkeby`
* Trending engine - `mainnet`
* Dashboard - `mainnet`
