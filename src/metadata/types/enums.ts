export enum DisplayType {
    number = 'number',
    boost_percentage = 'boost_percentage',
    boost_number = 'boost_number',
    date = 'date',
}

export enum MetadataType {
    token = 'token',
}

export const MetadataFiles = {
    [MetadataType.token]: ['image', 'animation'],
}
