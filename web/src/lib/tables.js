// Per-table configuration so the collection and wishlist share one set of
// components. The two Postgres tables (`albums`, `wishlist`) are identical in
// shape; only labels, routes, and available actions differ.

export const TABLES = {
  albums: {
    name: 'albums',
    listPath: '/',
    addPath: '/add',
    addLabel: '+ Add Record',
    addHeading: 'Add a Record',
    saveLabel: 'Save Record',
    editHeading: 'Edit Record',
    updateLabel: 'Save Changes',
    editPath: (id) => `/records/${id}/edit`,
    countNoun: 'record',
    emptyText: 'No records found.',
    emptyCta: 'Add your first record',
    hasDetailPage: true,
  },
  wishlist: {
    name: 'wishlist',
    listPath: '/wishlist',
    addPath: '/wishlist/add',
    addLabel: '+ Add to Wishlist',
    addHeading: 'Add to Wishlist',
    saveLabel: 'Add to Wishlist',
    editHeading: 'Edit Wishlist Item',
    updateLabel: 'Save Changes',
    editPath: (id) => `/wishlist/${id}/edit`,
    countNoun: 'item',
    emptyText: 'Your wishlist is empty.',
    emptyCta: 'Add your first wishlist item',
    hasDetailPage: false,
  },
}
