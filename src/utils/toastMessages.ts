import type { Locale } from '@/i18n/routing';

type ToastLocale = Locale | string;

const ENGLISH_TOAST_MESSAGES = {
  loginSuccess: 'Logged in successfully.',
  logoutSuccess: 'Logged out successfully.',
  registerSuccess: 'Sign-up complete. Please log in.',
  cartQuantityUpdateError: 'Failed to update quantity.',
  cartItemDeleteError: 'Failed to remove the cart item. Please try again.',
  cartLoadError: 'Failed to load cart product information. Please try again.',
  guestCartMergeError: 'Some cart items could not be merged into your account. Sign in again to retry.',
  guestCartPendingMergeError: 'Sign in again before changing an item whose merge result is pending.',
  deleted: 'Deleted.',
  oauthMissingCode: 'Authentication code is missing.',
  oauthStateFailed: 'Security verification failed. Please try again.',
  oauthLoginSuccess: 'Logged in with {provider}.',
  oauthLoginError: 'Failed to log in with {provider}.',
  orderStatusChanged: 'Order status changed to {status}.',
  statusChangeError: 'Failed to change status.',
  imageUploadSuccess: 'Image uploaded.',
  imageUploadError: 'Failed to upload image.',
  trackingNumberRequired: 'Please enter a tracking number.',
  trackingRegistered: 'Tracking number registered.',
  trackingRegisterError: 'Failed to register tracking number.',
  productNameRequired: 'Please enter the product name.',
  slugRequired: 'Please enter the slug.',
  validPriceRequired: 'Please enter a valid price.',
  productCreated: 'Product created.',
  productUpdated: 'Product updated.',
  saveError: 'Failed to save.',
  productMetaLoadError: 'Failed to load product management data.',
  roleChanged: 'Role changed to {role}.',
  roleChangeError: 'Failed to change role.',
  couponDiscountError: 'Failed to calculate coupon discount.',
  wishlistRemoved: 'Removed from wishlist.',
  wishlistAdded: 'Added to wishlist.',
  wishlistError: 'Failed to update wishlist.',
  paymentMethodPrompt: 'Please review your payment method and click Pay.',
  paymentComplete: 'Payment completed.',
  cardPaymentPrompt: 'Please enter card information and click Pay.',
  bankTransferOrderReceived: 'Order received. Please complete the bank transfer.',
  paymentError: 'An error occurred during payment.',
  checkoutConsentRequired: 'Please review the required consent items.',
  checkoutPolicyChanged: 'The policies changed. Review the latest consent items and try again.',
  checkoutValidationError: 'Please review your shipping information.',
  reviewImageLimit: 'You can upload up to 5 images.',
  reviewImageUploadSuccess: 'Image upload complete.',
  ratingRequired: 'Please select a rating.',
  reviewCreated: 'Review submitted.',
  reviewCreateError: 'Failed to submit review.',
  pageLoadError: 'Failed to load page.',
  pageCreated: 'Page created.',
  createError: 'Failed to create.',
  pageDeleted: 'Page deleted.',
  deleteError: 'Failed to delete.',
  pagePublished: 'Page published.',
  pageUnpublished: 'Page unpublished.',
  saved: 'Saved.',
  blockImageUploaded: 'Image uploaded.',
  paymentInvalidInfo: 'Payment information is invalid.',
  paymentContextMissing: 'Payment context was not found.',
  paymentAmountMismatch: 'Payment amount does not match.',
  paymentConfirmError: 'An error occurred while confirming payment.',
  journalUpdated: 'Journal updated.',
  journalCreated: 'Journal created.',
  publishOff: 'Changed to private.',
  publishOn: 'Changed to public.',
  answerRequired: 'Please enter an answer.',
  answerCreated: 'Answer submitted.',
  answerCreateError: 'Failed to submit answer.',
  menuCreated: 'Menu created.',
  addError: 'Failed to add.',
  menuUpdated: 'Menu updated.',
  editError: 'Failed to edit.',
  menuDeleted: 'Menu deleted.',
  sortError: 'Failed to change order.',
  bottomNavVisibilityChanged: 'Bottom navigation is now {visibility}.',
  visible: 'visible',
  hidden: 'hidden',
  settingsSaveError: 'Failed to save settings.',
  faqQuestionAnswerRequired: 'Please enter both question and answer.',
  faqUpdated: 'FAQ updated.',
  faqCreated: 'FAQ created.',
  faqSaveError: 'Failed to save FAQ.',
  faqDeleted: 'FAQ deleted.',
  faqDeleteError: 'Failed to delete FAQ.',
  categoryUpdated: 'Category updated.',
  categoryCreated: 'Category created.',
  sameLevelReorderOnly: 'You can only reorder items at the same level.',
  announcementMessageKoRequired: 'Please enter the Korean message.',
  announcementCreated: 'Announcement bar created.',
  announcementUpdated: 'Announcement bar updated.',
  announcementSaveError: 'Failed to save announcement bar.',
  announcementDeleted: 'Announcement bar deleted.',
  announcementDeleteError: 'Failed to delete announcement bar.',
  announcementStatusChanged: 'Announcement bar has been {status}.',
  active: 'activated',
  inactive: 'deactivated',
  themeSaved: 'Theme settings saved.',
  themeReset: 'Reset to defaults.',
  resetError: 'Failed to reset.',
  orderLoadError: 'Failed to load order information.',
} as const;

const TOAST_MESSAGES = { ko: ENGLISH_TOAST_MESSAGES, en: ENGLISH_TOAST_MESSAGES } as const;

type ToastMessageKey = keyof typeof TOAST_MESSAGES.ko;

export function getToastLocale(): ToastLocale {
  if (typeof window === 'undefined') return 'ko';
  const pathname = window.location?.pathname ?? '/ko';
  const [, locale] = pathname.split('/');
  return locale === 'en' ? 'en' : 'ko';
}

export function toastMessage(
  key: ToastMessageKey,
  values?: Record<string, string | number>,
  locale: ToastLocale = getToastLocale(),
): string {
  const messages = locale === 'en' ? TOAST_MESSAGES.en : TOAST_MESSAGES.ko;
  let message: string = messages[key];

  if (!values) return message;

  Object.entries(values).forEach(([name, value]) => {
    message = message.replaceAll(`{${name}}`, String(value));
  });

  return message;
}
