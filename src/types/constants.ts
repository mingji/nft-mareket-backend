export enum DaoIds {
    users = 'users',
    userSessions = 'users.sessions',
    userSignatureRequests = 'users.signature.requests',
    tokenCollections = 'tokens.collections',
    launchpad = 'launchpad',
    cards = 'cards',
    cardSales = 'cards.sales',
    categories = 'categories',
    cryptocurrencies = 'cryptocurrencies',
    storeFronts = 'store.fronts',
    nonce = 'nonce',
    tokenMetadata = 'metadata.token',
    contractMetadata = 'metadata.contract',
    jobs = 'jobs',
    cardViewers = 'cards.viewers',
    follows = 'follows',
    externalClients = 'external.clients',
    externalCollectibles = 'external.collectibles',
}

export enum DaoModelNames {
    user = 'User',
    userSession = 'UserSession',
    userSignatureRequest = 'UserSignatureRequest',
    tokenCollection = 'TokenCollection',
    launchpad = 'Launchpad',
    card = 'Card',
    cardSale = 'CardSale',
    category = 'Category',
    cryptocurrency = 'Cryptocurrency',
    storeFront = 'StoreFront',
    nonce = 'Nonce',
    tokenMetadata = 'MetadataToken',
    contractMetadata = 'MetadataContract',
    job = 'Job',
    cardViewer = 'cardViewer',
    follow = 'Follow',
    externalClient = 'externalClient',
    externalCollectible = 'externalCollectible',
}

export enum SortOrder {
    asc = 'asc',
    desc = 'desc'
}

export enum Currency {
    usd = 'USD',
}

export enum Cryptocurrency {
    eth = 'ETH',
    wEth = 'WETH',
}

export enum Nonce {
    default = 'default'
}

export enum Reaction {
    likes = 'likes',
    dislikes = 'dislikes'
}
