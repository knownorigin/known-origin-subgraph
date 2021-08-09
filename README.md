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

### Auth with subgraph

`graph auth https://api.thegraph.com/deploy/ <auth-token>`

### Auth

```graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>```

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

