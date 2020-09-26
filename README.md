# graph-known-origin


### Graph UI

Must belong to the `knownorigin` github:

https://thegraph.com/explorer/subgraph/knownorigin/known-origin

### Built via

```bash
graph init --from-contract 0xFBeef911Dc5821886e1dda71586d90eD28174B7d knownorigin/known-origin graph-known-origin
```

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

