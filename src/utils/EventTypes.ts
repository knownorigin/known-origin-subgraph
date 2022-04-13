// Shared event types for primary and secondary (V2 + V3)
export const PURCHASE = "Purchase";
export const TRANSFER = "Transfer";
export const BIRTH = "Birth";
export const TOKEN_DELISTED = "TokenDeListed";
export const TOKEN_LISTED = "TokenListed";
export const BID_WITHDRAWN = "BidWithdrawn";
export const BID_REJECTED = "BidRejected";
export const BID_INCREASED = "BidIncreased";
export const BID_ACCEPTED = "BidAccepted";
export const BID_PLACED = "BidPlaced";
export const EDITION_GIFTED = "EditionGifted";
export const EDITION_CREATED = "EditionCreated";

// Artwork management actions
export const PRICE_CHANGED = "PriceChanged";
export const SALES_TYPE_CHANGED = "SalesTypeChanged"

// V3 + events
export const STEPPED_AUCTION_LISTED = "SteppedListed";
export const RESERVE_AUCTION_LISTED = "ReserveListed";
export const RESERVE_BID_PLACED = "ReserveBidPlaced";
export const RESERVE_BID_WITHDRAWN = "ReserveBidWithdrawn";
export const RESERVE_COUNTDOWN_STARTED = "ReserveCountdownStarted";
export const RESERVE_EXTENDED = "ReserveExtended";
export const RESERVE_PRICE_CHANGED = "ReservePriceChanged";

// V3 Extras
export const COMPOSABLE_ADDED = "ComposableAdded";
export const COMPOSABLE_CLAIMED = "ComposableClaimed";
