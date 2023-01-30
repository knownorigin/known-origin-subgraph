# KnownOrigin.io Subgraph

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
| Development (rinkeby) | ~~https://thegraph.com/explorer/subgraph/knownorigin/knownoriginrinkeby~~ Deprecated ||
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