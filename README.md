# KnownOrigin.io Indexed Subgraph V2 (Graph Network)

See: https://thegraph.com/docs/en/deploying/subgraph-studio/#publish-your-subgraphs

### URIs

| Chain               | Studio Link (requires auth)                               | Public URL|
|-----------------------|-----------------------------------------------------------|----|
| Mainnet  | https://thegraph.com/studio/subgraph/known-origin/        | https://gateway.thegraph.com/api/[api-key]/subgraphs/id/CGZ1hQkiQXTyGLrAFH1yk3H8xPjBy6avbTB8rCLw9sJL ||
| Goerli    | https://thegraph.com/studio/subgraph/known-origin-goerli/ | https://gateway.testnet.thegraph.com/api/[api-key]/subgraphs/id/CGZ1hQkiQXTyGLrAFH1yk3H8xPjBy6avbTB8rCLw9sJL ||

### Installing the Graph CLI

```bash
npm install -g @graphprotocol/graph-cli
```

### Authing with the CLI

To deploy any changes to a subgraph you must be authed with the specific deploy_key for that subgraph, ask a code owner for these keys before attempting to deploy.

```bash
graph auth --studio DEPLOY_KEY
```

### Dev cycle

**Requires Node 16 !**
```bash
nvm use
```

Install

```bash
npm install
```

Prepare subgraph.yaml for selected chain

```bash
npm run prep:mainnet || npm run prep:goerli
```

Codegen

```bash
npm run codegen
```

Build Subgraph

```bash
npm run build
```

Deploy the Subgraph

```bash
npm run deploy:mainnet || npm run deploy:goerli
```

Goerli Faucet for test GRT tokens

* https://discord.com/channels/438038660412342282/1001942596958048440


# KnownOrigin.io Hosted Subgraph (Deprecated)

### Graph UI

Must belong to the `knownorigin` github:

### URIs

##### Main

https://thegraph.com/hosted-service/subgraph/knownorigin/known-origin

##### Goerli

https://thegraph.com/hosted-service/subgraph/knownorigin/known-origin-goerli

##### Rinkeby (Deprecated)

~~https://thegraph.com/hosted-service/subgraph/knownorigin/knownoriginrinkeby~~ **Deprecated**

### Subgraphs

| Purpose               | URL                                                                                 |
|-----------------------|-------------------------------------------------------------------------------------|
| Production (mainnet)  | https://thegraph.com/explorer/subgraph/knownorigin/known-origin                     ||
| Staging (mainnet)     | https://thegraph.com/explorer/subgraph/knownorigin/known-origin-staging             ||
| Development (goerli)  | https://thegraph.com/hosted-service/subgraph/knownorigin/known-origin-goerli        ||
| Alpha Studio (mainnet) | https://thegraph.com/studio/subgraph/known-origin                                   ||

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

**Requires Node 16 !**

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

### Unit testing

See: https://thegraph.com/docs/en/developing/unit-testing-framework/

#### Postgres' installation required

```
brew install postgresql
```

#### Running tests

```
yarn test
```
