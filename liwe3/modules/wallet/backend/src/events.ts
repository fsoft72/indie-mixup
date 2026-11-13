// A new wallet has been created
export const WALLET_EVENT_CREATE = 'wallet.create';

// A wallet has been updated
export const WALLET_EVENT_UPDATE = 'wallet.update';

// A wallet has been deleted
export const WALLET_EVENT_DELETE = 'wallet.delete';

// Funds have been credited to a wallet
export const WALLET_EVENT_CREDIT = 'wallet.credit';

// Funds have been debited from a wallet
export const WALLET_EVENT_DEBIT = 'wallet.debit';

// A transfer between wallets has been completed
export const WALLET_EVENT_TRANSFER = 'wallet.transfer';

// Wallet balance has fallen below a threshold (optional event for integrations)
export const WALLET_EVENT_BALANCE_LOW = 'wallet.balance_low';
